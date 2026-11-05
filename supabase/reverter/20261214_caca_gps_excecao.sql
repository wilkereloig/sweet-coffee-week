-- Reverte 20261214_caca_gps_excecao. Apaga os pedidos de exceção (os carimbos já criados por aprovação ficam: anule-os pelo painel se preciso).
drop trigger if exists sync_caca_carimbo_excecao on public.caca_carimbo_excecao;
drop function if exists public.caca_excecao_pedir(text, text, text, numeric, numeric, numeric, text);
drop function if exists public.caca_excecao_minhas(text);
drop function if exists public.caca_excecao_listar(text, text, text);
drop function if exists public.caca_excecao_decidir(text, uuid, text, text);
drop function if exists public.caca_gps_resumo(text, text);
drop function if exists public.caca_excecao_unidade(uuid, numeric, numeric);
drop table if exists public.caca_carimbo_excecao;
