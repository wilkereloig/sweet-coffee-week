-- =============================================================================
-- REVERSÃO das migrations 20261022_sincronizacao_tempo_real e 20261022_push_entrega.
--
-- Só remove o que elas ACRESCENTARAM. Nenhuma tabela de dados do festival, nenhuma
-- função nem gatilho que já existia é tocado. O painel publicado antes da
-- sincronização continua funcionando sem nada disto (não depende de nenhum objeto
-- daqui); o painel novo sem isto cai no modo "periódico" (confere a cada 45 s) e
-- mostra "Sem sincronizar" — não quebra.
--
-- Dados que a reversão NÃO desfaz (de propósito): leituras de aviso gravadas pela
-- resolução automática (notificacao_leitura) e linhas de realtime.messages (o
-- Realtime apaga sozinho após 3 dias).
--
-- Edge Function: reimplantar a versão anterior de enviar-push (v14, no git em
-- supabase/functions/enviar-push/index.ts antes do commit desta mudança) e apagar
-- carga.ts do pacote. Sem a tabela push_envios a função nova já funciona como a antiga.
-- =============================================================================

-- 1. Canais do Realtime
drop policy if exists sync_receber on realtime.messages;

-- 2. Gatilhos de invalidação (todos têm o prefixo sync_)
do $$
declare t record;
begin
  for t in
    select c.relname as rel, g.tgname as gat
      from pg_trigger g
      join pg_class c on c.oid = g.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and not g.tgisinternal and g.tgname like 'sync\_%' escape '\'
  loop
    execute format('drop trigger if exists %I on public.%I', t.gat, t.rel);
  end loop;
end $$;

-- 3. Funções
drop function if exists public.sync_resolver_pedido();
drop function if exists public.sync_resolver_aprovacao();
drop function if exists public.sync_perfis();
drop function if exists public.sync_notificacao_leitura();
drop function if exists public.sync_notificacoes();
drop function if exists public.sync_fotos();
drop function if exists public.sync_escopo();
drop function if exists public.sync_gatilho();
drop function if exists public.sync_participante(jsonb, text);
drop function if exists public.sync_emitir(text, text, text);
drop function if exists public.sync_meus_canais();
drop function if exists public.sync_pode(text);

-- 4. Entrega do push (só se a segunda migration foi aplicada)
select cron.unschedule(jobid) from cron.job where jobname = 'scw-push-reenviar';
drop function if exists public.push_reenviar_ciclo();
drop function if exists public.push_envio_pendentes(int);
drop function if exists public.push_envio_registrar(uuid, jsonb);
drop table if exists public.push_envios;
