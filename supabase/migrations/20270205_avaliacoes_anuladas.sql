-- 14/11/2026 (pedido do Wilker): avaliação anulada fica guardada, com motivo, mas sai de toda conta.
-- Caso de origem: avaliações feitas na mesma janela dos carimbos com localização simulada (Ana Flávia,
-- 13/11 13:25–14:17, 17 avaliações; ARTHUR MEDEIROS CÂMARA, 14/11 12:15–12:27, 4) — só nota, nenhum texto.
-- ponytail: tabela à parte em vez de coluna `anulada_em` em `avaliacoes`: as ~21 funções que leem avaliacoes
-- (rankings, resumo, apuração, placar, mapa) passam a ignorar a anulada sem nenhuma mudança. Limite: a pessoa
-- poderia avaliar a mesma casa de novo (a chave única some com a linha); se acontecer, aparece no painel.
-- Reverter: supabase/reverter/20270205_avaliacoes_anuladas.sql
create table if not exists public.avaliacoes_anuladas (
  like public.avaliacoes including defaults,
  anulada_em timestamptz not null default now(),
  anulada_motivo text not null check (char_length(btrim(anulada_motivo)) between 3 and 300),
  anulada_por text,
  primary key (id)
);
alter table public.avaliacoes_anuladas enable row level security;  -- sem policy: anon/authenticated não leem nada
revoke all on public.avaliacoes_anuladas from anon, authenticated;

-- Move uma avaliação para a gaveta das anuladas (uso pela organização, via SQL/MCP).
create or replace function public.avaliacao_anular(p_id uuid, p_motivo text, p_por text default null)
 returns boolean language plpgsql security definer set search_path to 'public'
as $$
declare a public.avaliacoes%rowtype;
begin
  delete from public.avaliacoes where id = p_id returning * into a;
  if a.id is null then return false; end if;
  insert into public.avaliacoes_anuladas select a.*, now(), btrim(p_motivo), p_por;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values ('avaliacao.anulada', 'avaliacoes', p_id::text, a.participacao_id, jsonb_build_object('motivo', p_motivo, 'por', p_por));
  return true;
end $$;
revoke all on function public.avaliacao_anular(uuid, text, text) from public, anon, authenticated;
