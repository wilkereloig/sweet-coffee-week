-- =============================================================================
-- Painel da organização — Sweet & Coffee Week
-- Fecha as duas lacunas entre os formulários e a área interna que os lê:
--   1. A quarta origem: /quero-participar (página estática) não tinha tabela.
--   2. A escrita: as três origens antigas só tinham RPC de LEITURA
--      (get_*_interests / get_contact_requests). Faltava mudar status e anotar.
--
-- Segurança — mesmo padrão das migrations de 2026-07:
--   • RLS habilitado SEM policy → nenhum acesso anônimo direto à tabela.
--   • Escrita pública só via RPC `security definer` concedida a anon, que valida
--     no servidor e FIXA status='novo'. O cliente não tem como escrever status,
--     reviewed_at nem internal_notes.
--   • Leitura e escrita da organização atrás de `public.admin_ok(p_secret)`, a
--     mesma senha do painel. Senha errada devolve VAZIO, nunca erro — não
--     confirma nem desmente a existência de registro.
--   • `set search_path = public` em toda função definer.
--
-- Aplicar no Supabase: Dashboard → SQL Editor → New query → Run. Idempotente.
-- Depende de public.admin_ok(text) (schema.sql).
-- =============================================================================

create extension if not exists pgcrypto;

-- ── Quero participar (formulário longo, página estática) ─────────────────────
-- Colunas para o que a organização filtra e ordena; `payload jsonb` para o
-- resto — inclusive os arrays de múltipla escolha e o texto do "Outro". Assim o
-- formulário ganha pergunta nova sem migration nova.
create table if not exists public.quero_participar (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- status é gerenciado pela organização (servidor). Começa em 'novo'.
  status text not null default 'novo',
  -- dados consultáveis
  nome text not null,
  telefone text,
  email text not null,
  empresa text not null,
  tipo text,
  cidade text,
  instagram text,
  site text,
  carro_chefe text,
  -- tudo que veio do formulário, sem perda
  payload jsonb not null default '{}'::jsonb,
  -- uso da organização (nunca preenchidos pela interface pública)
  reviewed_at timestamptz,
  internal_notes text,
  constraint quero_participar_status_check check (status in (
    'novo', 'em_analise', 'contatado', 'aprovado', 'nao_selecionado', 'aguardando_cadastro'
  ))
);

create index if not exists quero_participar_created_idx
  on public.quero_participar (created_at desc);
create index if not exists quero_participar_status_idx
  on public.quero_participar (status);

alter table public.quero_participar enable row level security;
-- (sem policies = nenhum acesso anônimo direto de select/insert/update/delete)

-- ── RPC: registrar (anon) ────────────────────────────────────────────────────
-- Espelha a validação do front como defense-in-depth. Recebe o formulário
-- inteiro em `p_payload` e promove a coluna o que é consultável: um lugar só
-- para o cliente montar, sem 14 parâmetros posicionais para errar a ordem.
create or replace function public.submit_quero_participar(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_txt   text;
  v_email text := lower(trim(coalesce(p_payload->>'email', '')));
  v_fone  text := regexp_replace(coalesce(p_payload->>'telefone', ''), '\D', '', 'g');
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'payload_invalido';
  end if;

  -- obrigatórios
  if coalesce(trim(p_payload->>'nome'), '')    = '' then raise exception 'nome_obrigatorio'; end if;
  if coalesce(trim(p_payload->>'empresa'), '') = '' then raise exception 'empresa_obrigatoria'; end if;
  if v_email = '' then raise exception 'email_obrigatorio'; end if;

  -- e-mail minimamente válido
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'email_invalido'; end if;

  -- bloqueia domínios falsos/descartáveis e typos comuns (mesma lista das outras origens)
  if split_part(v_email, '@', 2) = any (array[
    'gmail.con','gmail.co','gmial.com','gmai.com','gnail.com','gmail.cm','gmail.comm',
    'hotmail.con','hotmail.co','hotmial.com','outlook.con','outlook.co',
    'yahoo.con','yaho.com','yahoo.co','icloud.con',
    'mailinator.com','tempmail.com','temp-mail.org','10minutemail.com','guerrillamail.com',
    'yopmail.com','trashmail.com','sharklasers.com','getnada.com','maildrop.cc',
    'throwawaymail.com','mailnesia.com','dispostable.com','fakeinbox.com']) then
    raise exception 'email_dominio_invalido';
  end if;

  -- telefone com DDD + número, quando enviado
  if v_fone <> '' and length(v_fone) < 10 then raise exception 'telefone_invalido'; end if;

  -- limite de tamanho por resposta longa (evita abuso)
  for v_txt in select value from jsonb_each_text(p_payload) loop
    if length(v_txt) > 5000 then raise exception 'resposta_muito_longa'; end if;
  end loop;

  insert into public.quero_participar (
    status, nome, telefone, email, empresa, tipo, cidade, instagram, site,
    carro_chefe, payload
  ) values (
    'novo',                                    -- servidor fixa o status inicial
    trim(p_payload->>'nome'),
    nullif(trim(coalesce(p_payload->>'telefone', '')), ''),
    v_email,
    trim(p_payload->>'empresa'),
    nullif(trim(coalesce(p_payload->>'tipo', '')), ''),
    nullif(trim(coalesce(p_payload->>'cidade', '')), ''),
    nullif(trim(coalesce(p_payload->>'instagram', '')), ''),
    nullif(trim(coalesce(p_payload->>'site', '')), ''),
    nullif(trim(coalesce(p_payload->>'carroChefe', '')), ''),
    p_payload
  );
end;
$$;

grant execute on function public.submit_quero_participar(jsonb) to anon, authenticated;

-- ── RPC: relatório (admin) ───────────────────────────────────────────────────
create or replace function public.get_quero_participar(p_secret text)
returns setof public.quero_participar
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_ok(p_secret) then return; end if;
  return query select * from public.quero_participar order by created_at desc;
end;
$$;
grant execute on function public.get_quero_participar(text) to anon, authenticated;

-- ── RPC: contagem por origem e status (admin) ────────────────────────────────
-- Alimenta a visão geral do painel sem baixar as quatro tabelas inteiras.
create or replace function public.get_organizacao_resumo(p_secret text)
returns table (origem text, status text, total bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_ok(p_secret) then return; end if;
  return query
    select 'contato'::text,          c.status, count(*) from public.contact_requests c        group by c.status
    union all
    select 'participar'::text,       p.status, count(*) from public.participation_interests p group by p.status
    union all
    select 'apoiar'::text,           s.status, count(*) from public.support_interests s       group by s.status
    union all
    select 'quero_participar'::text, q.status, count(*) from public.quero_participar q        group by q.status;
end;
$$;
grant execute on function public.get_organizacao_resumo(text) to anon, authenticated;

-- ── RPC: atualizar status e nota interna (admin) ─────────────────────────────
-- Uma função para as quatro origens, em vez de expor UPDATE em quatro tabelas.
-- `p_origem` entra numa lista fechada e vira nome de tabela por CASE — nunca por
-- concatenação de texto do cliente, que seria injeção de SQL.
-- Status inválido é barrado pelo CHECK da própria tabela: cada origem tem o seu
-- vocabulário, e duplicar a lista aqui criaria uma segunda fonte de verdade.
create or replace function public.organizacao_atualizar_registro(
  p_secret text,
  p_origem text,
  p_id uuid,
  p_status text default null,
  p_nota text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tabela text;
  v_n int;
begin
  if not public.admin_ok(p_secret) then return false; end if;

  v_tabela := case p_origem
    when 'contato'          then 'contact_requests'
    when 'participar'       then 'participation_interests'
    when 'apoiar'           then 'support_interests'
    when 'quero_participar' then 'quero_participar'
  end;
  if v_tabela is null then raise exception 'origem_invalida'; end if;

  -- coalesce: campo não enviado fica como está, em vez de virar null.
  execute format(
    'update public.%I
        set status         = coalesce($1, status),
            internal_notes = coalesce($2, internal_notes),
            reviewed_at    = now()
      where id = $3', v_tabela)
  using nullif(trim(coalesce(p_status, '')), ''), p_nota, p_id;

  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

grant execute on function public.organizacao_atualizar_registro(
  text, text, uuid, text, text
) to anon, authenticated;

-- ⛔ Nenhuma política e nenhuma RPC de DELETE, de propósito: registro se
-- arquiva pelo status, não se apaga.
