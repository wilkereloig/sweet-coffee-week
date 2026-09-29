-- =============================================================================
-- push_subscriptions: a marca passa a LER as próprias assinaturas.
--
-- Bug (achado em 28/09/2026, reproduzido no banco): o painel da marca apaga a
-- assinatura com `DELETE ... ?endpoint=eq.<x>`. No Postgres, DELETE que filtra
-- por coluna precisa LER a linha, e para isso aplica também as policies de
-- SELECT. Como a tabela não tinha nenhuma, o DELETE afetava 0 linhas sem erro:
--   · "Desligar avisos" e "Sair" deixavam o aparelho no banco, recebendo push;
--   · religar no mesmo aparelho (apaga e insere) batia no `unique(endpoint)`.
--
-- A regra "endpoint é credencial" continua de pé: a policy abaixo só mostra à
-- marca as linhas DELA — endpoints que o próprio navegador dela já tem. Nenhum
-- papel lê assinatura de outra conta; a Edge Function segue lendo com
-- service_role.
-- =============================================================================

drop policy if exists push_marca_le on public.push_subscriptions;
create policy push_marca_le on public.push_subscriptions
  for select to authenticated
  using (papel = 'marca' and exists (
    select 1 from public.participantes p
     where p.id = push_subscriptions.participante_id and p.user_id = auth.uid()));
