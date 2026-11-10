-- Desfaz 20270121: tira o job e a função. Carimbos já aprovados pela automação continuam (não se desfazem por aqui).
select cron.unschedule('scw-caca-auto-aprovar');
drop function if exists public.caca_excecao_auto_aprovar();
delete from public.caca_config where chave = 'auto_aprovar_visita_anterior';
