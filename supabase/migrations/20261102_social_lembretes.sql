-- ─────────────────────────────────────────────────────────────────────────────
-- Social media › Lembretes automáticos (21/10/2026). Spec: docs/superpowers/specs/2026-10-21-social-campanhas-checklist-lembretes-design.md
--
-- `redes_lembretes(p_agora)` roda a cada 10 min pelo pg_cron (job `scw-redes-lembretes`, migration 20261103) e só age entre 07h e 22h
-- de Fortaleza. Quatro lembretes, cada um vira aviso no sino (+ push, pelo caminho que `avisar_pessoa` já usa):
--   · resumo do dia   — a partir das 08h, um aviso por pessoa com as postagens dela de hoje e as atrasadas;
--   · 1 h antes       — postagem ainda sem aprovação (rascunho / aguardando) que sai em até 1 hora: responsável + quem aprova;
--   · passou do horário — 30 min depois da hora, sem confirmação de publicação, até 24 h: responsável (+ quem aprova se não está aprovada);
--   · faltando a 2 dias — postagem de daqui a 2 dias sem arte ou sem legenda (a partir das 08h): responsável.
-- Responsável vazio → quem criou. `redes_lembretes_enviados` impede aviso repetido: a chave de cada postagem é o horário
-- PROGRAMADO, então reagendar libera um aviso novo. Ninguém de fora executa: só o pg_cron e o dono do banco.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.redes_lembretes_enviados (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('resumo', 'sem_aprovacao', 'atrasada', 'faltando')),
  post_id uuid references public.redes_posts (id) on delete cascade,
  chave text not null,
  user_id uuid not null,
  enviado_em timestamptz not null default now()
);
alter table public.redes_lembretes_enviados enable row level security;
create unique index redes_lembretes_enviados_uq on public.redes_lembretes_enviados
  (tipo, coalesce(post_id, '00000000-0000-0000-0000-000000000000'::uuid), chave, user_id);

-- Avisa cada pessoa da lista UMA vez por (tipo, postagem, chave). Devolve quantos avisos saíram.
create or replace function public.redes_lembrar_pessoas(
  p_tipo text, p_post uuid, p_chave_dia text, p_dest uuid[], p_titulo text, p_texto text, p_link text, p_chave text, p_participante uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare u uuid; n integer := 0; k integer;
begin
  for u in select distinct x from unnest(coalesce(p_dest, '{}'::uuid[])) x where x is not null loop
    insert into public.redes_lembretes_enviados (tipo, post_id, chave, user_id) values (p_tipo, p_post, p_chave_dia, u) on conflict do nothing;
    get diagnostics k = row_count;
    if k = 1 then
      perform public.avisar_pessoa(u, 'redes', p_titulo, p_texto, p_link, p_chave, p_participante);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

create or replace function public.redes_lembretes(p_agora timestamptz default now())
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_local timestamp := p_agora at time zone 'America/Fortaleza';
  v_hoje date := (p_agora at time zone 'America/Fortaleza')::date;
  v_hora numeric := extract(hour from v_local) + extract(minute from v_local) / 60.0;
  n integer := 0;
  r record;
  v_texto text; v_falta text;
begin
  if v_hora < 7 or v_hora >= 22 then return 0; end if;

  -- 1) resumo do dia: uma vez por pessoa e dia, a partir das 08h
  if v_hora >= 8 then
    for r in
      select x.dest as user_id,
             count(*) filter (where x.programado_para >= p_agora) as para_hoje,
             count(*) filter (where x.programado_para < p_agora) as atrasadas
        from (select coalesce(p.responsavel_id, p.criado_por_id) as dest, p.programado_para
                from public.redes_posts p
               where p.situacao not in ('publicado', 'cancelado') and p.programado_para is not null
                 and ((p.programado_para at time zone 'America/Fortaleza')::date = v_hoje or p.programado_para < p_agora)) x
       where x.dest is not null
       group by x.dest
    loop
      v_texto := concat_ws(' · ',
        case when r.para_hoje > 0 then r.para_hoje || case when r.para_hoje = 1 then ' postagem para hoje' else ' postagens para hoje' end end,
        case when r.atrasadas > 0 then r.atrasadas || case when r.atrasadas = 1 then ' atrasada' else ' atrasadas' end end);
      n := n + public.redes_lembrar_pessoas('resumo', null, v_hoje::text, array[r.user_id], 'Social media hoje', v_texto,
        'social/planejamento', 'redes:resumo:' || v_hoje, null);
    end loop;
  end if;

  -- 2) 1 h antes e ainda sem aprovação: responsável + quem aprova
  for r in
    select p.* from public.redes_posts p
     where p.situacao in ('rascunho', 'preparacao', 'aprovacao') and p.programado_para is not null
       and p.programado_para > p_agora and p.programado_para - interval '1 hour' <= p_agora
  loop
    n := n + public.redes_lembrar_pessoas('sem_aprovacao', r.id, extract(epoch from r.programado_para)::bigint::text,
      array[coalesce(r.responsavel_id, r.criado_por_id)] || coalesce(public.redes_aprovadores(), '{}'::uuid[]),
      'Sai em até 1 hora e ainda não foi aprovada: ' || r.titulo,
      'Programada para ' || public.redes_data_texto(r.programado_para) || '. Situação: ' || case when r.situacao = 'aprovacao' then 'aguardando aprovação' else 'rascunho' end || '.',
      'social/planejamento/' || r.id, 'redes:' || r.id || ':lembrete_sem_aprovacao:' || extract(epoch from r.programado_para)::bigint, r.participante_id);
  end loop;

  -- 3) passou do horário sem confirmar a publicação (até 24 h depois)
  for r in
    select p.* from public.redes_posts p
     where p.situacao not in ('publicado', 'cancelado') and p.programado_para is not null
       and p.programado_para + interval '30 minutes' <= p_agora and p_agora < p.programado_para + interval '24 hours'
  loop
    n := n + public.redes_lembrar_pessoas('atrasada', r.id, extract(epoch from r.programado_para)::bigint::text,
      array[coalesce(r.responsavel_id, r.criado_por_id)]
        || case when r.situacao <> 'pronto' then coalesce(public.redes_aprovadores(), '{}'::uuid[]) else '{}'::uuid[] end,
      'Passou do horário e não foi confirmada: ' || r.titulo,
      'Era para sair às ' || public.redes_data_texto(r.programado_para) || '. Se já foi ao ar, confirme a publicação; se não, reprograme.',
      'social/planejamento/' || r.id, 'redes:' || r.id || ':lembrete_atrasada:' || extract(epoch from r.programado_para)::bigint, r.participante_id);
  end loop;

  -- 4) faltando arte ou legenda a 2 dias da data, a partir das 08h
  if v_hora >= 8 then
    for r in
      select p.*, public.redes_pendencias(p.id) as pend from public.redes_posts p
       where p.situacao not in ('publicado', 'cancelado') and p.programado_para is not null
         and (p.programado_para at time zone 'America/Fortaleza')::date = v_hoje + 2
    loop
      continue when not (r.pend && array['sem_arte', 'sem_legenda']);
      v_falta := case when 'sem_arte' = any (r.pend) and 'sem_legenda' = any (r.pend) then 'arte e legenda'
                      when 'sem_arte' = any (r.pend) then 'arte' else 'legenda' end;
      n := n + public.redes_lembrar_pessoas('faltando', r.id, extract(epoch from r.programado_para)::bigint::text,
        array[coalesce(r.responsavel_id, r.criado_por_id)],
        'Faltam 2 dias e a postagem está sem ' || v_falta || ': ' || r.titulo,
        'Programada para ' || public.redes_data_texto(r.programado_para) || '.',
        'social/planejamento/' || r.id, 'redes:' || r.id || ':lembrete_faltando:' || extract(epoch from r.programado_para)::bigint, r.participante_id);
    end loop;
  end if;

  return n;
end $$;

revoke execute on function public.redes_lembrar_pessoas(text, uuid, text, uuid[], text, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.redes_lembretes(timestamptz) from public, anon, authenticated;
