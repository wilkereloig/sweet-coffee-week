-- Ajustes do Security Advisor após 20260930_acessos_e_correcoes.sql:
-- função de gatilho não é RPC, e função sem search_path fixo.
revoke execute on function public.correcoes_acompanhar_combo() from public, anon, authenticated;
alter function public.link_campo_marca(integer, text) set search_path = public;
revoke execute on function public.link_campo_marca(integer, text) from public, anon, authenticated;
