-- =============================================================================
-- Fase 2 da evolução do painel (docs/EVOLUCAO-PAINEL-2026-09.md) — segurança
--
-- 1. Conta de MARCA desativada perde o acesso na hora.
--    As políticas da marca decidiam só por `participantes.user_id = auth.uid()`
--    e nunca olhavam `perfis.ativo`: uma marca suspensa continuava lendo e
--    gravando com o JWT que já tinha. A organização já estava coberta
--    (`pode()` exige `pf.ativo`).
--    A correção mora num lugar só: as políticas de `participantes`. Toda
--    política das outras tabelas da marca chega à marca por um
--    `exists (select 1 from participantes p where p.user_id = auth.uid())` —
--    e subconsulta dentro de política respeita a RLS da tabela consultada.
--    Sem linha visível em `participantes`, nada mais fica visível.
--
-- 2. `notificar()` ganha um modo silencioso por transação
--    (`set_config('scw.silencioso', 'on', true)`). A importação de uma edição
--    cria sessões de foto em lote; sem isso, cada linha viraria um aviso e um
--    push para uma marca que ainda nem tem conta.
--
-- ✅ APLICADA em 29/09/2026 pelo MCP, registrada como `fase2_seguranca_conta_ativa`
--    (o corpo aplicado é o SQL abaixo deste cabeçalho, sem os comentários).
-- =============================================================================

create or replace function public.conta_ativa()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select ativo from public.perfis where user_id = auth.uid()), false)
$$;
revoke all on function public.conta_ativa() from public, anon;
grant execute on function public.conta_ativa() to authenticated;

drop policy if exists participantes_marca_le on public.participantes;
create policy participantes_marca_le on public.participantes
  for select to authenticated
  using (user_id = auth.uid() and public.conta_ativa());

drop policy if exists participantes_marca_edita on public.participantes;
create policy participantes_marca_edita on public.participantes
  for update to authenticated
  using (user_id = auth.uid() and public.conta_ativa())
  with check (user_id = auth.uid() and public.conta_ativa());

create or replace function public.notificar(p_para text, p_participante uuid, p_tipo text,
  p_titulo text, p_texto text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if current_setting('scw.silencioso', true) = 'on' then return; end if;
  insert into public.notificacoes (para, participante_id, tipo, titulo, texto, link)
  values (p_para, p_participante, p_tipo, left(p_titulo, 120), left(p_texto, 240), p_link);
end $$;
revoke all on function public.notificar(text, uuid, text, text, text, text) from public, anon, authenticated;
