-- 20261221 — caca_imutavel com search_path fixo (aviso function_search_path_mutable do get_advisors).
-- Só fixa a configuração da função-gatilho que bloqueia UPDATE/DELETE/TRUNCATE em registros imutáveis da Caça;
-- o corpo e os gatilhos que a usam (20261204) não mudam. A função só chama raise exception: não lê nenhum objeto, então
-- search_path vazio ('') é suficiente e seguro.
-- reverter: create or replace function public.caca_imutavel() returns trigger language plpgsql as $$ begin raise exception 'registro_imutavel: %', tg_table_name; end $$;
create or replace function public.caca_imutavel() returns trigger
language plpgsql
set search_path = ''
as $$
begin raise exception 'registro_imutavel: %', tg_table_name; end $$;

revoke all on function public.caca_imutavel() from public, anon, authenticated;
