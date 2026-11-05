-- Reverte 20261209_caca_sync_tempo_real: remove só os quatro gatilhos de sinal (nenhum dado é tocado).
drop trigger if exists sync_caca_premio on public.caca_premio;
drop trigger if exists sync_caca_apuracao_dia on public.caca_apuracao_dia;
drop trigger if exists sync_caca_config on public.caca_config;
drop trigger if exists sync_caca_evento on public.caca_evento;
