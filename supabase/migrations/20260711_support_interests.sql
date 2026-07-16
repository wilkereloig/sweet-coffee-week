-- =============================================================================
-- Interesse em APOIAR — Sweet & Coffee Week (página Apoiar)
-- Porta de entrada de marcas/patrocinadores: interesse → análise → contato →
-- negociação. Esta migration cria SÓ a persistência do interesse; painel e
-- fluxo comercial NÃO fazem parte deste escopo.
--
-- Espelha o padrão de submit_participation_interest (20260710) e de
-- submit_pesquisa/submit_vote em schema.sql:
--   • RLS habilitado SEM policy  → nenhum acesso anônimo direto à tabela.
--   • Escrita só via RPC `submit_support_interest` (security definer), concedida
--     a anon: valida no servidor e FIXA status='novo'. A interface pública nunca
--     envia status, reviewed_at nem internal_notes.
--   • Leitura só via RPC `get_support_interests(p_secret)`, protegida pela mesma
--     senha do painel (public.admin_ok). Sem leitura pública de PII.
--
-- Diferença p/ participação: aqui email e whatsapp são OPCIONAIS, mas exige-se
-- PELO MENOS UM contato (o form de Apoiar pede nome + empresa + email OU whatsapp).
--
-- Aplicar no Supabase: Dashboard → SQL Editor → New query → Run. Idempotente.
-- Depende de public.admin_ok(text) (já criado em schema.sql — infra do painel).
-- =============================================================================

create extension if not exists pgcrypto;

-- ── Interesses de apoio/patrocínio ───────────────────────────────────────────
create table if not exists public.support_interests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- status é gerenciado pela organização (servidor). Começa em 'novo'.
  status text not null default 'novo',
  -- dados enviados pelo formulário público
  nome text not null,
  empresa text not null,
  email text,
  whatsapp text,
  segmento text,
  interesse text,
  mensagem text,
  -- uso futuro da organização (nunca preenchidos pela interface pública)
  reviewed_at timestamptz,
  internal_notes text,
  constraint support_interests_status_check check (status in (
    'novo', 'em_analise', 'contatado', 'em_negociacao', 'fechado', 'arquivado'
  ))
);
-- Para bancos já existentes (idempotente):
alter table public.support_interests
  add column if not exists reviewed_at    timestamptz,
  add column if not exists internal_notes text;

create index if not exists support_interests_created_idx
  on public.support_interests (created_at desc);
create index if not exists support_interests_status_idx
  on public.support_interests (status);

-- ── RLS: nada de acesso direto. Tudo passa pelas funções abaixo. ─────────────
alter table public.support_interests enable row level security;
-- (sem policies = nenhum acesso anônimo direto de select/insert/update/delete)

-- ── RPC: registrar interesse (anon) — valida + insere com status 'novo' ──────
-- A assinatura NÃO aceita status/reviewed_at/internal_notes: o cliente não tem
-- como escrevê-los. Espelha a validação do front (supportInterest.js) como
-- defense-in-depth.
create or replace function public.submit_support_interest(
  p_nome text,
  p_empresa text,
  p_email text default null,
  p_whatsapp text default null,
  p_segmento text default null,
  p_interesse text default null,
  p_mensagem text default null
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
  if coalesce(trim(p_nome), '')    = '' then raise exception 'nome_obrigatorio'; end if;
  if coalesce(trim(p_empresa), '') = '' then raise exception 'empresa_obrigatoria'; end if;

  -- pelo menos um contato (email OU whatsapp)
  if v_email = '' and length(v_phone) < 10 then raise exception 'contato_obrigatorio'; end if;

  -- e-mail: valida só se preenchido
  if v_email <> '' then
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
  end if;

  -- whatsapp: valida só se preenchido (DDD + número, >= 10 dígitos)
  if v_phone <> '' and length(v_phone) < 10 then raise exception 'whatsapp_invalido'; end if;

  insert into public.support_interests (
    status, nome, empresa, email, whatsapp, segmento, interesse, mensagem
  ) values (
    'novo',                                   -- servidor fixa o status inicial
    trim(p_nome),
    trim(p_empresa),
    nullif(v_email, ''),
    nullif(trim(coalesce(p_whatsapp, '')), ''),
    nullif(trim(coalesce(p_segmento, '')), ''),
    nullif(trim(coalesce(p_interesse, '')), ''),
    nullif(trim(coalesce(p_mensagem, '')), '')
  );
end;
$$;

grant execute on function public.submit_support_interest(
  text, text, text, text, text, text, text
) to anon, authenticated;

-- ── RPC: relatório dos interesses (admin, mesma senha do painel) ─────────────
-- Só responde com a senha certa (public.admin_ok). Sem senha correta → vazio,
-- sem expor nenhum dado pessoal.
create or replace function public.get_support_interests(p_secret text)
returns setof public.support_interests
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_ok(p_secret) then return; end if;
  return query select * from public.support_interests order by created_at desc;
end;
$$;
grant execute on function public.get_support_interests(text) to anon, authenticated;
