-- Camada de edição Cartoon 2026.2 — fase 6: AVALIAÇÃO E PREMIAÇÃO (14/10/2026).
-- Plano: docs/cartoon-2026-2/06-mapa-rota-avaliacao.md §6.3–6.4; decisões D-05/D-06.
--
--  * avaliacoes — separada por edição (a `votos` da Lovers não tem edição e fica
--    intocada). Uma por e-mail por participação; reenvio substitui (último vale)
--    e conta a substituição.
--  * edicao_criterios — os critérios da edição em tabela: definição tardia não
--    exige migration. Semeados PROVISÓRIOS = os 7 da Lovers, notas de 5 a 10 (D-05).
--  * submit_avaliacao — só a Edge Function enviar-formulario chama (chave de
--    serviço, depois de armadilha, tempo mínimo e Turnstile). NÃO tem grant para
--    anon: chamar /rpc direto não grava nada.
--  * Período validado AQUI: interruptor ligado E agora dentro da janela.
--  * Elegível = participação com versão publicada vigente com combo + unidade
--    que participa. Nada de dado pessoal além de nome e e-mail.
--  * resultados_publicos() — anon lê os pódios da edição SÓ com o interruptor 6.

create table if not exists public.edicao_criterios (
  edicao_codigo text not null references public.edicoes(codigo) on update cascade,
  chave text not null check (chave ~ '^[a-z_]{2,30}$'),
  rotulo text not null check (char_length(rotulo) <= 60),
  ordem smallint not null default 1,
  minimo smallint not null default 5,
  maximo smallint not null default 10,
  check (maximo > minimo),
  primary key (edicao_codigo, chave)
);
alter table public.edicao_criterios enable row level security;
revoke all on public.edicao_criterios from anon, authenticated;
insert into public.edicao_criterios (edicao_codigo, chave, rotulo, ordem) values
  ('2026.2', 'doce', 'Doce', 1), ('2026.2', 'salgado', 'Salgado', 2), ('2026.2', 'bebida', 'Bebida', 3),
  ('2026.2', 'apresentacao', 'Apresentação', 4), ('2026.2', 'criatividade', 'Criatividade', 5),
  ('2026.2', 'atendimento', 'Atendimento', 6), ('2026.2', 'encantamento', 'Encantamento em Loja', 7)
on conflict do nothing;

create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  edicao_codigo text not null references public.edicoes(codigo) on update cascade,
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  participacao_unidade_id uuid references public.participacao_unidades(id) on delete set null,
  nome text not null check (char_length(nome) between 2 and 120),
  email_norm text not null check (email_norm ~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'),
  notas jsonb not null,
  comentario text check (comentario is null or char_length(comentario) <= 600),
  aceita_novidades boolean not null default false,
  substituicoes int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (edicao_codigo, participacao_id, email_norm)
);
alter table public.avaliacoes enable row level security;
revoke all on public.avaliacoes from anon, authenticated;

create or replace function public.submit_avaliacao(p_edicao text, p_slug text, p_unidade text, p_nome text, p_email text,
                                                   p_notas jsonb, p_comentario text, p_aceita_novidades boolean)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_c public.edicao_publicacao%rowtype; v_pa uuid; v_pu uuid; v_email text := lower(btrim(p_email)); k text; v int;
  v_existia boolean;
begin
  select * into v_c from public.edicao_publicacao where edicao_codigo = p_edicao;
  if v_c.edicao_codigo is null or not v_c.avaliacao_aberta then raise exception 'avaliacao_fechada'; end if;
  if now() < v_c.avaliacao_abre_em then raise exception 'avaliacao_nao_aberta'; end if;
  if now() > v_c.avaliacao_fecha_em then raise exception 'avaliacao_encerrada'; end if;

  select pa.id into v_pa from public.participacoes pa
   where pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado'
     and (pa.slug_publico = p_slug or exists (select 1 from public.participacao_slug_aliases a
                                               where a.edicao_codigo = p_edicao and a.slug = p_slug and a.participacao_id = pa.id))
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente and pb.nivel = 'marca_e_combo');
  if v_pa is null then raise exception 'participante_inelegivel'; end if;
  if nullif(btrim(p_unidade), '') is not null then
    select id into v_pu from public.participacao_unidades where participacao_id = v_pa and id_publico = btrim(p_unidade) and participa;
    if v_pu is null then raise exception 'unidade_inelegivel'; end if;
  end if;

  if v_email !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then raise exception 'email_invalido'; end if;
  if char_length(btrim(coalesce(p_nome, ''))) < 2 then raise exception 'nome_invalido'; end if;
  if jsonb_typeof(p_notas) <> 'object' then raise exception 'notas_invalidas'; end if;
  -- Todas as chaves e só as chaves da edição, cada nota inteira dentro da escala.
  if (select count(*) from jsonb_object_keys(p_notas)) <> (select count(*) from public.edicao_criterios where edicao_codigo = p_edicao) then
    raise exception 'notas_incompletas';
  end if;
  for k in select jsonb_object_keys(p_notas) loop
    if jsonb_typeof(p_notas -> k) <> 'number' then raise exception 'nota_invalida'; end if;
    v := (p_notas ->> k)::int;
    if (p_notas ->> k)::numeric <> v or not exists (select 1 from public.edicao_criterios c
         where c.edicao_codigo = p_edicao and c.chave = k and v between c.minimo and c.maximo) then
      raise exception 'nota_invalida';
    end if;
  end loop;

  select exists (select 1 from public.avaliacoes where edicao_codigo = p_edicao and participacao_id = v_pa and email_norm = v_email) into v_existia;
  insert into public.avaliacoes (edicao_codigo, participacao_id, participacao_unidade_id, nome, email_norm, notas, comentario, aceita_novidades)
  values (p_edicao, v_pa, v_pu, left(btrim(p_nome), 120), v_email, p_notas, nullif(left(btrim(coalesce(p_comentario, '')), 600), ''),
          coalesce(p_aceita_novidades, false))
  on conflict (edicao_codigo, participacao_id, email_norm) do update set
    participacao_unidade_id = excluded.participacao_unidade_id, nome = excluded.nome, notas = excluded.notas,
    comentario = excluded.comentario, aceita_novidades = excluded.aceita_novidades,
    substituicoes = public.avaliacoes.substituicoes + 1, atualizado_em = now();
  return jsonb_build_object('ok', true, 'substituiu', v_existia);
end $$;
revoke all on function public.submit_avaliacao(text, text, text, text, text, jsonb, text, boolean) from public, anon, authenticated;
grant execute on function public.submit_avaliacao(text, text, text, text, text, jsonb, text, boolean) to service_role;

-- Critérios da edição para o formulário (anon), só com a avaliação aberta.
create or replace function public.criterios_avaliacao(p_edicao text)
 returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select case when coalesce((select avaliacao_aberta and now() between avaliacao_abre_em and avaliacao_fecha_em
                               from public.edicao_publicacao where edicao_codigo = p_edicao), false)
    then (select coalesce(jsonb_agg(jsonb_build_object('chave', chave, 'rotulo', rotulo, 'minimo', minimo, 'maximo', maximo) order by ordem), '[]'::jsonb)
            from public.edicao_criterios where edicao_codigo = p_edicao)
    else '[]'::jsonb end
$$;

-- Resultado da edição (anon) — só com o interruptor 6.
create or replace function public.resultados_publicos(p_edicao text)
 returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select case when coalesce((select resultados_publicos from public.edicao_publicacao where edicao_codigo = p_edicao), false)
    then (select coalesce(jsonb_agg(jsonb_build_object('categoria', pr.categoria, 'trilha', pr.trilha, 'colocacao', pr.colocacao,
                    'nome', coalesce(pt.nome_marca, pr.nome_registrado), 'slug', pa.slug_publico)
                  order by pr.trilha, pr.categoria, pr.colocacao), '[]'::jsonb)
            from public.premiacoes pr
            left join public.participacoes pa on pa.id = pr.participacao_id
            left join public.participantes pt on pt.id = pa.participante_id
           where pr.edicao_codigo = p_edicao)
    else null end
$$;

-- Organização: resumo por casa (relatorio.ler). E-mail nunca sai daqui.
create or replace function public.get_avaliacoes_resumo(p_secret text, p_edicao text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.pode(p_secret, 'relatorio.ler') then raise exception 'nao_autorizado'; end if;
  return (select coalesce(jsonb_agg(x order by x ->> 'nome'), '[]'::jsonb) from (
    select jsonb_build_object('participacao_id', pa.id, 'nome', pt.nome_marca, 'avaliacoes', count(av.id),
             'substituicoes', coalesce(sum(av.substituicoes), 0),
             'medias', (select jsonb_object_agg(c.chave, (select round(avg((a2.notas ->> c.chave)::numeric), 2)
                                                           from public.avaliacoes a2 where a2.participacao_id = pa.id))
                          from public.edicao_criterios c where c.edicao_codigo = p_edicao)) x
      from public.participacoes pa join public.participantes pt on pt.id = pa.participante_id
      left join public.avaliacoes av on av.participacao_id = pa.id and av.edicao_codigo = p_edicao
     where pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado'
     group by pa.id, pt.nome_marca) s);
end $$;

revoke all on function public.criterios_avaliacao(text), public.resultados_publicos(text), public.get_avaliacoes_resumo(text, text)
  from public, anon, authenticated;
grant execute on function public.criterios_avaliacao(text), public.resultados_publicos(text) to anon, authenticated;
grant execute on function public.get_avaliacoes_resumo(text, text) to anon, authenticated;

-- reverter: drop function public.submit_avaliacao(...), public.criterios_avaliacao(text), public.resultados_publicos(text),
--   public.get_avaliacoes_resumo(text, text); drop table public.avaliacoes, public.edicao_criterios;
