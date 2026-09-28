-- =============================================================================
-- Fase 16 — lembretes automáticos (docs/EVOLUCAO-PAINEL-2026-09.md)
--
-- pg_cron chama as duas funções de 20260929_fase7a14_rpcs_operacao.sql:
--   lembrar_vendas  — de hora em hora; só age durante o festival, a partir do
--                     horário configurado na edição (edicoes.lembrete_vendas_hora).
--                     Sem horário configurado, não manda nada.
--   lembrar_prazos  — uma vez por dia, 9h de Natal (12h UTC): tema e combo
--                     com prazo em 2 dias ou hoje, só para quem ainda não fez.
-- O aviso vira notificação (sino) e, pelo gatilho disparar_push, push.
-- Desligar: select cron.unschedule('scw-lembrar-vendas'); idem 'scw-lembrar-prazos'.
-- =============================================================================
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid) from cron.job where jobname in ('scw-lembrar-vendas', 'scw-lembrar-prazos');
select cron.schedule('scw-lembrar-vendas', '0 * * * *', 'select public.lembrar_vendas()');
select cron.schedule('scw-lembrar-prazos', '0 12 * * *', 'select public.lembrar_prazos()');
