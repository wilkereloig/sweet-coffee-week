-- =============================================================================
-- Sweet Awards — votação popular (Sweet & Coffee Week Lovers)
-- Cole este arquivo inteiro no Supabase: Dashboard → SQL Editor → New query → Run.
-- Pode rodar mais de uma vez (idempotente).
-- =============================================================================

create extension if not exists pgcrypto;

-- ── Config (linha única) ─────────────────────────────────────────────────────
-- results_published: quando TRUE, o site mostra o ranking. Mantenha FALSE durante a votação.
create table if not exists public.awards_config (
  id boolean primary key default true,
  results_published boolean not null default false,
  constraint awards_config_singleton check (id)
);
insert into public.awards_config (id, results_published)
values (true, false)
on conflict (id) do nothing;

-- ── Votos (1 por usuário × participante) ─────────────────────────────────────
create table if not exists public.votos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  nome text not null,
  telefone text not null,
  instagram text not null,
  genero text,
  participante_slug text not null,
  nota_combo        smallint not null,
  nota_encantamento smallint not null,
  nota_apresentacao smallint not null,
  nota_atendimento  smallint not null,
  nota_criatividade smallint not null,
  nota_salgado      smallint not null,
  nota_doce         smallint not null,
  nota_bebida       smallint not null,
  obs text,
  -- notas válidas: 5..10
  constraint nota_combo_range        check (nota_combo        between 5 and 10),
  constraint nota_encantamento_range check (nota_encantamento between 5 and 10),
  constraint nota_apresentacao_range check (nota_apresentacao between 5 and 10),
  constraint nota_atendimento_range  check (nota_atendimento  between 5 and 10),
  constraint nota_criatividade_range check (nota_criatividade between 5 and 10),
  constraint nota_salgado_range      check (nota_salgado      between 5 and 10),
  constraint nota_doce_range         check (nota_doce         between 5 and 10),
  constraint nota_bebida_range       check (nota_bebida       between 5 and 10)
);

-- "último voto vale": 1 linha por (email, participante); reenvio atualiza.
create unique index if not exists votos_email_participante_uniq
  on public.votos (lower(email), participante_slug);

-- ── Feedback geral (opcional, 1 por usuário) ─────────────────────────────────
create table if not exists public.feedback_geral (
  email text primary key,
  nome text,
  gostou text,
  melhorar text,
  sugestao_tema text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Controle de e-mail de agradecimento (1 envio por e-mail) ─────────────────
-- A Edge Function `send-vote-email` insere aqui (service-role). Se o e-mail já
-- existir, NÃO reenvia — garante "1 e-mail por pessoa", mesmo votando em vários.
create table if not exists public.vote_emails (
  email text primary key,
  sent_at timestamptz not null default now()
);

-- ── RLS: nada de acesso direto. Tudo passa pelas funções abaixo. ─────────────
alter table public.votos          enable row level security;
alter table public.feedback_geral enable row level security;
alter table public.awards_config  enable row level security;
alter table public.vote_emails    enable row level security;
-- (sem policies = nenhum acesso anônimo; a Edge Function usa service-role)
-- (sem policies = nenhum acesso anônimo direto de select/insert/update/delete)

-- ── RPC: registrar voto (valida + upsert "último vale") ──────────────────────
create or replace function public.submit_vote(
  p_email text,
  p_nome text,
  p_telefone text,
  p_instagram text,
  p_genero text,
  p_participante text,
  p_nota_combo int,
  p_nota_encantamento int,
  p_nota_apresentacao int,
  p_nota_atendimento int,
  p_nota_criatividade int,
  p_nota_salgado int,
  p_nota_doce int,
  p_nota_bebida int,
  p_obs text default null,
  p_gostou text default null,
  p_melhorar text default null,
  p_sugestao_tema text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
begin
  -- obrigatórios
  if v_email = '' or v_email is null then raise exception 'email_obrigatorio'; end if;
  if coalesce(trim(p_nome),'')      = '' then raise exception 'nome_obrigatorio'; end if;
  if coalesce(trim(p_telefone),'')  = '' then raise exception 'telefone_obrigatorio'; end if;
  if coalesce(trim(p_instagram),'') = '' then raise exception 'instagram_obrigatorio'; end if;
  if coalesce(trim(p_participante),'') = '' then raise exception 'participante_obrigatorio'; end if;

  -- e-mail minimamente válido
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'email_invalido'; end if;

  -- upsert do voto (notas validadas pelos CHECKs da tabela)
  insert into public.votos as v (
    email, nome, telefone, instagram, genero, participante_slug,
    nota_combo, nota_encantamento, nota_apresentacao, nota_atendimento,
    nota_criatividade, nota_salgado, nota_doce, nota_bebida, obs, updated_at
  ) values (
    v_email, trim(p_nome), trim(p_telefone), trim(p_instagram), p_genero, trim(p_participante),
    p_nota_combo, p_nota_encantamento, p_nota_apresentacao, p_nota_atendimento,
    p_nota_criatividade, p_nota_salgado, p_nota_doce, p_nota_bebida, p_obs, now()
  )
  on conflict (lower(email), participante_slug) do update set
    nome = excluded.nome,
    telefone = excluded.telefone,
    instagram = excluded.instagram,
    genero = excluded.genero,
    nota_combo = excluded.nota_combo,
    nota_encantamento = excluded.nota_encantamento,
    nota_apresentacao = excluded.nota_apresentacao,
    nota_atendimento = excluded.nota_atendimento,
    nota_criatividade = excluded.nota_criatividade,
    nota_salgado = excluded.nota_salgado,
    nota_doce = excluded.nota_doce,
    nota_bebida = excluded.nota_bebida,
    obs = excluded.obs,
    updated_at = now();

  -- feedback geral (só grava/atualiza se veio algo)
  if coalesce(p_gostou,'') <> '' or coalesce(p_melhorar,'') <> '' or coalesce(p_sugestao_tema,'') <> '' then
    insert into public.feedback_geral as f (email, nome, gostou, melhorar, sugestao_tema, updated_at)
    values (v_email, trim(p_nome), p_gostou, p_melhorar, p_sugestao_tema, now())
    on conflict (email) do update set
      nome = excluded.nome,
      gostou = coalesce(excluded.gostou, f.gostou),
      melhorar = coalesce(excluded.melhorar, f.melhorar),
      sugestao_tema = coalesce(excluded.sugestao_tema, f.sugestao_tema),
      updated_at = now();
  end if;
end;
$$;

grant execute on function public.submit_vote(
  text,text,text,text,text,text,int,int,int,int,int,int,int,int,text,text,text,text
) to anon, authenticated;

-- ── RPC: ranking (só devolve se results_published = true) ────────────────────
-- Retorna top 3 por categoria. Desempate: média desc → nº avaliações desc →
-- média Combo → média Criatividade → média Apresentação.
create or replace function public.get_rankings()
returns table (
  categoria text,
  posicao int,
  participante_slug text,
  media numeric,
  avaliacoes int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (select results_published from public.awards_config where id) then
    return; -- vazio enquanto não liberado
  end if;

  return query
  with agg as (
    select
      participante_slug,
      count(*)::int as n,
      avg(nota_combo)        as m_combo,
      avg(nota_encantamento) as m_encantamento,
      avg(nota_apresentacao) as m_apresentacao,
      avg(nota_atendimento)  as m_atendimento,
      avg(nota_criatividade) as m_criatividade,
      avg(nota_salgado)      as m_salgado,
      avg(nota_doce)         as m_doce,
      avg(nota_bebida)       as m_bebida
    from public.votos
    group by participante_slug
  ),
  cats as (
    select * from (values
      ('melhor_combo'),('encantamento'),('apresentacao'),('atendimento'),
      ('criatividade'),('salgado'),('doce'),('bebida')
    ) as c(categoria)
  ),
  ranked as (
    select
      c.categoria,
      a.participante_slug,
      a.n as avaliacoes,
      case c.categoria
        when 'melhor_combo' then a.m_combo
        when 'encantamento' then a.m_encantamento
        when 'apresentacao' then a.m_apresentacao
        when 'atendimento'  then a.m_atendimento
        when 'criatividade' then a.m_criatividade
        when 'salgado'      then a.m_salgado
        when 'doce'         then a.m_doce
        when 'bebida'       then a.m_bebida
      end as media,
      row_number() over (
        partition by c.categoria
        order by
          case c.categoria
            when 'melhor_combo' then a.m_combo
            when 'encantamento' then a.m_encantamento
            when 'apresentacao' then a.m_apresentacao
            when 'atendimento'  then a.m_atendimento
            when 'criatividade' then a.m_criatividade
            when 'salgado'      then a.m_salgado
            when 'doce'         then a.m_doce
            when 'bebida'       then a.m_bebida
          end desc nulls last,
          a.n desc,
          a.m_combo desc,
          a.m_criatividade desc,
          a.m_apresentacao desc
      ) as posicao
    from cats c cross join agg a
  )
  select r.categoria, r.posicao::int, r.participante_slug,
         round(r.media, 2) as media, r.avaliacoes
  from ranked r
  where r.posicao <= 3
  order by r.categoria, r.posicao;
end;
$$;

grant execute on function public.get_rankings() to anon, authenticated;

-- ── (opcional) liberar/ocultar resultado ─────────────────────────────────────
-- Para LIBERAR o ranking quando a organização decidir, rode:
--   update public.awards_config set results_published = true where id;
-- Para ocultar de novo:
--   update public.awards_config set results_published = false where id;
