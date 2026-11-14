-- 14/11/2026 (pedido do Wilker): e-mail avulso da organização sai pelo contato@ (Brevo), nunca pelo Gmail pessoal.
-- A organização enfileira aqui (SQL/MCP, como postgres); a edge function `org-email` só envia o que está na fila.
-- A function não recebe texto nem destinatário de fora: chamar ela sem motivo só esvazia a fila — nada a explorar.
-- Primeiro uso: aviso de carimbos anulados por localização simulada (Ana Flávia, Arthur Medeiros Câmara).
-- Reverter: supabase/reverter/20270206_email_fila.sql
create table if not exists public.email_fila (
  id uuid primary key default gen_random_uuid(),
  para text not null check (para ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  assunto text not null check (char_length(btrim(assunto)) between 3 and 200),
  html text not null,
  texto text not null,
  estado text not null default 'pendente' check (estado in ('pendente', 'enviando', 'enviado', 'falhou')),
  erro text,
  provedor_id text,
  motivo text,
  criado_por text,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz
);
alter table public.email_fila enable row level security;  -- sem policy: só service_role (a function) e postgres
revoke all on public.email_fila from anon, authenticated;
