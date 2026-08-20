-- =============================================================================
-- Solicitações de contato — Sweet & Coffee Week (página Contato)
-- Central de dúvidas e relacionamento: o público envia uma mensagem por assunto
-- e a organização acompanha o status. Esta migration cria SÓ a persistência das
-- mensagens; painel administrativo NÃO faz parte deste escopo.
--
-- Segurança (mesmo padrão de submit_participation_interest / submit_pesquisa):
--   • RLS habilitado SEM policy  → nenhum acesso anônimo direto à tabela.
--   • Escrita só via RPC `submit_contact_request` (security definer), concedida a
--     anon: valida no servidor e FIXA status='novo' e source='site'. A interface
--     pública nunca envia status, source, reviewed_at nem internal_notes.
--   • Leitura só via RPC `get_contact_requests(p_secret)`, protegida pela mesma
--     senha do painel (public.admin_ok). Sem leitura pública de PII.
--
-- Aplicar no Supabase: Dashboard → SQL Editor → New query → Run. Idempotente.
-- Depende de public.admin_ok(text) (já criado em schema.sql — infra do painel).
-- =============================================================================

create extension if not exists pgcrypto;

-- ── Solicitações de contato ──────────────────────────────────────────────────
create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- status é gerenciado pela organização (servidor). Começa em 'novo'.
  status text not null default 'novo',
  -- dados enviados pelo formulário público
  name text not null,
  email text not null,
  whatsapp text,
  subject text not null,
  message text not null,
  -- origem do registro; começa em 'site' (fixado pelo servidor).
  source text not null default 'site',
  -- uso futuro da organização (nunca preenchidos pela interface pública)
  reviewed_at timestamptz,
  internal_notes text,
  constraint contact_requests_status_check check (status in (
    'novo', 'em_analise', 'respondido', 'encerrado'
  ))
);
-- Para bancos já existentes (idempotente):
alter table public.contact_requests
  add column if not exists reviewed_at    timestamptz,
  add column if not exists internal_notes text,
  add column if not exists source         text not null default 'site';

create index if not exists contact_requests_created_idx
  on public.contact_requests (created_at desc);
create index if not exists contact_requests_status_idx
  on public.contact_requests (status);

-- ── RLS: nada de acesso direto. Tudo passa pelas funções abaixo. ─────────────
alter table public.contact_requests enable row level security;
-- (sem policies = nenhum acesso anônimo direto de select/insert/update/delete)

-- ── RPC: registrar solicitação (anon) — valida + insere com status 'novo' ────
-- A assinatura NÃO aceita status/source/reviewed_at/internal_notes: o cliente não
-- tem como escrevê-los. Espelha a validação do front (contactRequest.js) como
-- defense-in-depth. WhatsApp é opcional.
create or replace function public.submit_contact_request(
  p_name text,
  p_email text,
  p_subject text,
  p_message text,
  p_whatsapp text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  -- obrigatórios
  if coalesce(trim(p_name), '')    = '' then raise exception 'nome_obrigatorio'; end if;
  if v_email = ''                       then raise exception 'email_obrigatorio'; end if;
  if coalesce(trim(p_subject), '') = '' then raise exception 'assunto_obrigatorio'; end if;
  if coalesce(trim(p_message), '') = '' then raise exception 'mensagem_obrigatoria'; end if;

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

  -- assunto dentro da lista oficial (defense-in-depth; espelha o select público)
  if trim(p_subject) <> all (array[
    'Dúvida sobre a edição','Problema com informação no site','Estabelecimento interessado',
    'Parceria ou patrocínio','Imprensa e entrevistas','Sugestão ou feedback','Outro assunto']) then
    raise exception 'assunto_invalido';
  end if;

  -- limites de tamanho (evita abuso; textos longos não têm função aqui)
  if length(trim(p_message)) > 5000 then raise exception 'mensagem_muito_longa'; end if;

  insert into public.contact_requests (
    status, source, name, email, whatsapp, subject, message
  ) values (
    'novo',                                     -- servidor fixa o status inicial
    'site',                                      -- servidor fixa a origem
    trim(p_name),
    v_email,
    nullif(trim(coalesce(p_whatsapp, '')), ''),
    trim(p_subject),
    trim(p_message)
  );
end;
$$;

grant execute on function public.submit_contact_request(
  text, text, text, text, text
) to anon, authenticated;

-- ── RPC: relatório das solicitações (admin, mesma senha do painel) ───────────
-- Só responde com a senha certa (public.admin_ok). Sem senha correta → vazio,
-- sem expor nenhum dado pessoal. (Não há painel neste escopo; a organização lê
-- via este RPC ou pelo dashboard com service_role.)
create or replace function public.get_contact_requests(p_secret text)
returns setof public.contact_requests
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_ok(p_secret) then return; end if;
  return query select * from public.contact_requests order by created_at desc;
end;
$$;
grant execute on function public.get_contact_requests(text) to anon, authenticated;
