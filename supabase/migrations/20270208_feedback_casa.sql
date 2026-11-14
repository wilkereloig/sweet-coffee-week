-- Opinião da casa sobre a edição (14/11/2026, pedido do Wilker).
-- Cada casa responde uma vez por edição e pode editar. A casa lê e grava só a
-- dela, pela sessão (meu_participante); a organização lê todas com 'dado.ler'.
-- O link da tela (/painel/#opiniao) entra no relatório de avaliações em PDF.

create table if not exists public.feedback_casa (
  participacao_id uuid primary key references public.participacoes(id) on delete cascade,
  recomendacao smallint check (recomendacao between 0 and 10),
  funcionou text check (length(funcionou) <= 4000),
  melhorar text check (length(melhorar) <= 4000),
  melhorar_temas text[] not null default '{}',
  interesse text check (interesse in ('sim', 'talvez', 'nao')),
  tema_sugerido text check (length(tema_sugerido) <= 500),
  livre text check (length(livre) <= 4000),
  autor_user_id uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.feedback_casa enable row level security;
-- Sem acesso direto: leitura e escrita só pelas funções abaixo.
revoke all on public.feedback_casa from anon, authenticated;

-- Marcadores de "o que pode melhorar" (fechados: a tela mostra os mesmos).
create or replace function public.feedback_casa_temas()
returns text[] language sql immutable as $$
  select array['divulgacao','painel','mapa_carimbos','vouchers','prazos','atendimento_org']
$$;

create or replace function public.marca_minha_opiniao()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_pa uuid;
begin
  select pa.id into v_pa from public.participacoes pa
   where pa.participante_id = public.meu_participante() and pa.edicao_codigo = public.edicao_atual();
  if v_pa is null then raise exception 'sem_participacao'; end if;
  return (select to_jsonb(f) - 'autor_user_id' - 'participacao_id' from public.feedback_casa f where f.participacao_id = v_pa);
end $$;

create or replace function public.marca_salvar_opiniao(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_pa uuid; v_temas text[];
begin
  select pa.id into v_pa from public.participacoes pa
   where pa.participante_id = public.meu_participante() and pa.edicao_codigo = public.edicao_atual();
  if v_pa is null then raise exception 'sem_participacao'; end if;
  select coalesce(array_agg(t), '{}') into v_temas
    from jsonb_array_elements_text(coalesce(p->'melhorar_temas', '[]'::jsonb)) t
   where t = any(public.feedback_casa_temas());
  insert into public.feedback_casa as f (participacao_id, recomendacao, funcionou, melhorar, melhorar_temas, interesse, tema_sugerido, livre)
  values (v_pa,
          (p->>'recomendacao')::smallint,
          nullif(btrim(p->>'funcionou'), ''),
          nullif(btrim(p->>'melhorar'), ''),
          v_temas,
          nullif(p->>'interesse', ''),
          nullif(btrim(p->>'tema_sugerido'), ''),
          nullif(btrim(p->>'livre'), ''))
  on conflict (participacao_id) do update set
    recomendacao = excluded.recomendacao, funcionou = excluded.funcionou, melhorar = excluded.melhorar,
    melhorar_temas = excluded.melhorar_temas, interesse = excluded.interesse,
    tema_sugerido = excluded.tema_sugerido, livre = excluded.livre,
    autor_user_id = auth.uid(), atualizado_em = now();
end $$;

-- Organização: todas as respostas da edição atual, ou só a de uma marca.
create or replace function public.org_opinioes_casas(p_secret text, p_participante uuid default null)
returns table(participante_id uuid, nome_marca text, recomendacao smallint, funcionou text, melhorar text,
              melhorar_temas text[], interesse text, tema_sugerido text, livre text, atualizado_em timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  return query
  select p.id, p.nome_marca, f.recomendacao, f.funcionou, f.melhorar, f.melhorar_temas, f.interesse,
         f.tema_sugerido, f.livre, f.atualizado_em
    from public.feedback_casa f
    join public.participacoes pa on pa.id = f.participacao_id
    join public.participantes p on p.id = pa.participante_id
   where pa.edicao_codigo = public.edicao_atual()
     and (p_participante is null or p.id = p_participante)
   order by f.atualizado_em desc;
end $$;

revoke all on function public.marca_minha_opiniao() from public, anon;
revoke all on function public.marca_salvar_opiniao(jsonb) from public, anon;
revoke all on function public.org_opinioes_casas(text, uuid) from public, anon;
grant execute on function public.marca_minha_opiniao() to authenticated;
grant execute on function public.marca_salvar_opiniao(jsonb) to authenticated;
grant execute on function public.org_opinioes_casas(text, uuid) to authenticated, anon;
