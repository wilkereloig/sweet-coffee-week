-- =============================================================================
-- Pré-cadastro de participação — Sweet & Coffee Week (página Participar)
-- Porta de entrada de estabelecimentos: interesse → análise → aprovação →
-- (futura) área privada do participante. Esta migration cria SÓ a persistência
-- do interesse; painel e área privada NÃO fazem parte deste escopo.
--
-- Segurança (mesmo padrão de submit_pesquisa/submit_vote em schema.sql):
--   • RLS habilitado SEM policy  → nenhum acesso anônimo direto à tabela.
--   • Escrita só via RPC `submit_participation_interest` (security definer),
--     concedida a anon: valida no servidor e FIXA status='novo'. A interface
--     pública nunca envia status, reviewed_at nem internal_notes.
--   • Leitura só via RPC `get_participation_interests(p_secret)`, protegida pela
--     mesma senha do painel (public.admin_ok). Sem leitura pública de PII.
--
-- Aplicar no Supabase: Dashboard → SQL Editor → New query → Run. Idempotente.
-- Depende de public.admin_ok(text) (já criado em schema.sql — infra do painel).
-- =============================================================================

create extension if not exists pgcrypto;

-- ── Interesses de participação ───────────────────────────────────────────────
create table if not exists public.participation_interests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- status é gerenciado pela organização (servidor). Começa em 'novo'.
  status text not null default 'novo',
  -- dados enviados pelo formulário público
  marca text not null,
  tipo text,
  bairro text,
  cidade text,
  responsavel text not null,
  email text not null,
  whatsapp text not null,
  instagram text,
  apresentacao text,
  -- uso futuro da organização (nunca preenchidos pela interface pública)
  reviewed_at timestamptz,
  internal_notes text,
  constraint participation_interests_status_check check (status in (
    'novo', 'em_analise', 'contatado', 'aprovado', 'nao_selecionado', 'aguardando_cadastro'
  ))
);
-- Para bancos já existentes (idempotente):
alter table public.participation_interests
  add column if not exists reviewed_at    timestamptz,
  add column if not exists internal_notes text;

create index if not exists participation_interests_created_idx
  on public.participation_interests (created_at desc);
create index if not exists participation_interests_status_idx
  on public.participation_interests (status);

-- ── RLS: nada de acesso direto. Tudo passa pelas funções abaixo. ─────────────
alter table public.participation_interests enable row level security;
-- (sem policies = nenhum acesso anônimo direto de select/insert/update/delete)

-- ── RPC: registrar interesse (anon) — valida + insere com status 'novo' ──────
-- A assinatura NÃO aceita status/reviewed_at/internal_notes: o cliente não tem
-- como escrevê-los. Espelha a validação do front (participationInterest.js) como
-- defense-in-depth.
create or replace function public.submit_participation_interest(
  p_marca text,
  p_tipo text,
  p_bairro text,
  p_cidade text,
  p_responsavel text,
  p_email text,
  p_whatsapp text,
  p_instagram text default null,
  p_apresentacao text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_phone text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
begin
  -- obrigatórios
  if coalesce(trim(p_marca), '')       = '' then raise exception 'marca_obrigatoria'; end if;
  if coalesce(trim(p_bairro), '')      = '' then raise exception 'bairro_obrigatorio'; end if;
  if coalesce(trim(p_cidade), '')      = '' then raise exception 'cidade_obrigatoria'; end if;
  if coalesce(trim(p_responsavel), '') = '' then raise exception 'responsavel_obrigatorio'; end if;
  if v_email = '' then raise exception 'email_obrigatorio'; end if;

  -- e-mail minimamente válido
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'email_invalido'; end if;

  -- bloqueia domínios falsos/descartáveis e typos comuns (mesma lista da votação)
  if split_part(v_email, '@', 2) = any (array[
    'gmail.con','gmail.co','gmial.com','gmai.com','gnail.com','gmail.cm','gmail.comm',
    'hotmail.con','hotmail.co','hotmial.com','outlook.con','outlook.co',
    'yahoo.con','yaho.com','yahoo.co','icloud.con',
    'mailinator.com','tempmail.com','temp-mail.org','10minutemail.com','guerrillamail.com',
    'yopmail.com','trashmail.com','sharklasers.com','getnada.com','maildrop.cc',
    'throwawaymail.com','mailnesia.com','dispostable.com','fakeinbox.com']) then
    raise exception 'email_dominio_invalido';
  end if;

  -- WhatsApp com DDD + número (>= 10 dígitos)
  if length(v_phone) < 10 then raise exception 'whatsapp_invalido'; end if;

  insert into public.participation_interests (
    status, marca, tipo, bairro, cidade, responsavel, email, whatsapp, instagram, apresentacao
  ) values (
    'novo',                                   -- servidor fixa o status inicial
    trim(p_marca),
    nullif(trim(coalesce(p_tipo, '')), ''),
    nullif(trim(coalesce(p_bairro, '')), ''),
    nullif(trim(coalesce(p_cidade, '')), ''),
    trim(p_responsavel),
    v_email,
    trim(p_whatsapp),
    nullif(trim(coalesce(p_instagram, '')), ''),
    nullif(trim(coalesce(p_apresentacao, '')), '')
  );
end;
$$;

grant execute on function public.submit_participation_interest(
  text, text, text, text, text, text, text, text, text
) to anon, authenticated;

-- ── RPC: relatório dos interesses (admin, mesma senha do painel) ─────────────
-- Só responde com a senha certa (public.admin_ok). Sem senha correta → vazio,
-- sem expor nenhum dado pessoal.
create or replace function public.get_participation_interests(p_secret text)
returns setof public.participation_interests
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_ok(p_secret) then return; end if;
  return query select * from public.participation_interests order by created_at desc;
end;
$$;
grant execute on function public.get_participation_interests(text) to anon, authenticated;
