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

-- 2ª chave de identidade: telefone (só dígitos) também é único por participante.
-- Impede a mesma pessoa votar 2x no mesmo participante trocando só o e-mail.
create unique index if not exists votos_telefone_participante_uniq
  on public.votos (participante_slug, regexp_replace(telefone, '\D', '', 'g'))
  where regexp_replace(telefone, '\D', '', 'g') <> '';

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
  v_phone text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  v_part  text := trim(p_participante);
  v_id    uuid;
begin
  -- obrigatórios
  if v_email = '' or v_email is null then raise exception 'email_obrigatorio'; end if;
  if coalesce(trim(p_nome),'')      = '' then raise exception 'nome_obrigatorio'; end if;
  if v_phone = '' then raise exception 'telefone_obrigatorio'; end if;
  if coalesce(trim(p_instagram),'') = '' then raise exception 'instagram_obrigatorio'; end if;
  if v_part = '' then raise exception 'participante_obrigatorio'; end if;

  -- e-mail minimamente válido
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'email_invalido'; end if;

  -- 1 voto por pessoa × participante. Identidade = e-mail OU telefone (só dígitos).
  -- Se já existe voto desta pessoa NESTE participante, "último vale" (atualiza).
  -- Votar em participantes diferentes com os mesmos dados é permitido.
  select id into v_id
    from public.votos
   where participante_slug = v_part
     and (lower(email) = v_email
          or regexp_replace(telefone, '\D', '', 'g') = v_phone)
   order by updated_at desc
   limit 1;

  if v_id is not null then
    update public.votos set
      email = v_email, nome = trim(p_nome), telefone = trim(p_telefone),
      instagram = trim(p_instagram), genero = p_genero,
      nota_combo = p_nota_combo, nota_encantamento = p_nota_encantamento,
      nota_apresentacao = p_nota_apresentacao, nota_atendimento = p_nota_atendimento,
      nota_criatividade = p_nota_criatividade, nota_salgado = p_nota_salgado,
      nota_doce = p_nota_doce, nota_bebida = p_nota_bebida, obs = p_obs, updated_at = now()
    where id = v_id;
  else
    insert into public.votos (
      email, nome, telefone, instagram, genero, participante_slug,
      nota_combo, nota_encantamento, nota_apresentacao, nota_atendimento,
      nota_criatividade, nota_salgado, nota_doce, nota_bebida, obs, updated_at
    ) values (
      v_email, trim(p_nome), trim(p_telefone), trim(p_instagram), p_genero, v_part,
      p_nota_combo, p_nota_encantamento, p_nota_apresentacao, p_nota_atendimento,
      p_nota_criatividade, p_nota_salgado, p_nota_doce, p_nota_bebida, p_obs, now()
    );
  end if;

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
#variable_conflict use_column
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

-- =============================================================================
-- Painel admin (auditoria + suspeitos + prévia de ranking) — protegido por SENHA
-- =============================================================================

-- Guarda o HASH da senha do painel (nunca em texto puro). Linha única.
create table if not exists public.admin_config (
  id boolean primary key default true,
  secret_hash text,
  constraint admin_config_singleton check (id)
);
insert into public.admin_config (id) values (true) on conflict (id) do nothing;
alter table public.admin_config enable row level security; -- sem policies = sem acesso anônimo direto

-- Define/atualiza a senha do painel. RODE NO SQL EDITOR (service role):
--   select public.set_admin_secret('SUA_SENHA_FORTE');
create or replace function public.set_admin_secret(p_secret text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  update public.admin_config set secret_hash = crypt(p_secret, gen_salt('bf')) where id;
end;
$$;
revoke all on function public.set_admin_secret(text) from public, anon, authenticated;

-- Confere a senha (uso interno das funções abaixo).
create or replace function public.admin_ok(p_secret text)
returns boolean language sql security definer set search_path = public, extensions stable as $$
  select coalesce((
    select secret_hash is not null and secret_hash = crypt(p_secret, secret_hash)
    from public.admin_config where id
  ), false);
$$;
revoke all on function public.admin_ok(text) from public, anon, authenticated;

-- Valida a senha do painel (login). Retorna só true/false, sem expor dados.
create or replace function public.admin_ping(p_secret text)
returns boolean language sql security definer set search_path = public as $$
  select public.admin_ok(p_secret);
$$;
grant execute on function public.admin_ping(text) to anon, authenticated;

-- Auditoria: todos os votos (PII completa). Só responde com a senha certa.
create or replace function public.get_audit_report(p_secret text)
returns setof public.votos
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_ok(p_secret) then return; end if;
  return query select * from public.votos order by participante_slug, created_at;
end;
$$;
grant execute on function public.get_audit_report(text) to anon, authenticated;

-- Feedback geral (opcional). Só com a senha certa.
create or replace function public.get_feedback_report(p_secret text)
returns setof public.feedback_geral
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_ok(p_secret) then return; end if;
  return query select * from public.feedback_geral order by created_at;
end;
$$;
grant execute on function public.get_feedback_report(text) to anon, authenticated;

-- Prévia do ranking IGNORANDO results_published (só admin vê antes de publicar).
create or replace function public.get_rankings_admin(p_secret text)
returns table (categoria text, posicao int, participante_slug text, media numeric, avaliacoes int)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.admin_ok(p_secret) then return; end if;
  return query
  with agg as (
    select participante_slug, count(*)::int as n,
      avg(nota_combo) m_combo, avg(nota_encantamento) m_encantamento,
      avg(nota_apresentacao) m_apresentacao, avg(nota_atendimento) m_atendimento,
      avg(nota_criatividade) m_criatividade, avg(nota_salgado) m_salgado,
      avg(nota_doce) m_doce, avg(nota_bebida) m_bebida
    from public.votos group by participante_slug
  ),
  cats as (select * from (values
    ('melhor_combo'),('encantamento'),('apresentacao'),('atendimento'),
    ('criatividade'),('salgado'),('doce'),('bebida')) as c(categoria)),
  ranked as (
    select c.categoria, a.participante_slug, a.n as avaliacoes,
      case c.categoria
        when 'melhor_combo' then a.m_combo when 'encantamento' then a.m_encantamento
        when 'apresentacao' then a.m_apresentacao when 'atendimento' then a.m_atendimento
        when 'criatividade' then a.m_criatividade when 'salgado' then a.m_salgado
        when 'doce' then a.m_doce when 'bebida' then a.m_bebida end as media,
      row_number() over (partition by c.categoria order by
        case c.categoria
          when 'melhor_combo' then a.m_combo when 'encantamento' then a.m_encantamento
          when 'apresentacao' then a.m_apresentacao when 'atendimento' then a.m_atendimento
          when 'criatividade' then a.m_criatividade when 'salgado' then a.m_salgado
          when 'doce' then a.m_doce when 'bebida' then a.m_bebida end desc nulls last,
        a.n desc, a.m_combo desc, a.m_criatividade desc, a.m_apresentacao desc) as posicao
    from cats c cross join agg a
  )
  select r.categoria, r.posicao::int, r.participante_slug, round(r.media, 2), r.avaliacoes
  from ranked r where r.posicao <= 3 order by r.categoria, r.posicao;
end;
$$;
grant execute on function public.get_rankings_admin(text) to anon, authenticated;

-- Detector de votos suspeitos. Só com a senha certa.
-- tipo: telefone_multi_email | instagram_multi_email | nome_multi_email | notas_max
create or replace function public.get_suspicious_votes(p_secret text)
returns table (tipo text, chave text, qtd int, detalhe text)
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_ok(p_secret) then return; end if;
  return query
  -- mesmo telefone (dígitos) em e-mails diferentes
  select 'telefone_multi_email'::text, regexp_replace(v.telefone, '\D', '', 'g'),
         count(distinct lower(v.email))::int,
         string_agg(distinct lower(v.email), ', ')
  from public.votos v
  group by regexp_replace(v.telefone, '\D', '', 'g')
  having count(distinct lower(v.email)) > 1
  union all
  -- mesmo instagram em e-mails diferentes
  select 'instagram_multi_email'::text, lower(v.instagram),
         count(distinct lower(v.email))::int,
         string_agg(distinct lower(v.email), ', ')
  from public.votos v
  group by lower(v.instagram)
  having count(distinct lower(v.email)) > 1
  union all
  -- mesmo nome em muitos e-mails (3+)
  select 'nome_multi_email'::text, lower(v.nome),
         count(distinct lower(v.email))::int,
         string_agg(distinct lower(v.email), ', ')
  from public.votos v
  group by lower(v.nome)
  having count(distinct lower(v.email)) >= 3
  union all
  -- voto com TODAS as 8 notas no máximo (10) — possível enchimento
  select 'notas_max'::text, lower(v.email),
         count(*)::int,
         string_agg(distinct v.participante_slug, ', ')
  from public.votos v
  where v.nota_combo = 10 and v.nota_encantamento = 10 and v.nota_apresentacao = 10
    and v.nota_atendimento = 10 and v.nota_criatividade = 10 and v.nota_salgado = 10
    and v.nota_doce = 10 and v.nota_bebida = 10
  group by lower(v.email)
  order by 1, 3 desc;
end;
$$;
grant execute on function public.get_suspicious_votes(text) to anon, authenticated;
