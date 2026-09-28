-- =============================================================================
-- Fase 17 — Security Advisor: search_path fixo nas utilidades novas
-- (function_search_path_mutable). São funções puras (normalização e leitura
-- de célula de importação); fixar o caminho impede que um objeto com o mesmo
-- nome em outro schema seja chamado no lugar do de sistema.
-- =============================================================================
alter function public.normalizar_nome(text)      set search_path = pg_catalog, public;
alter function public.normalizar_telefone(text)  set search_path = pg_catalog, public;
alter function public.normalizar_cnpj(text)      set search_path = pg_catalog, public;
alter function public.cnpj_valido(text)          set search_path = pg_catalog, public;
alter function public.mascarar(text)             set search_path = pg_catalog, public;
alter function public.imp_col(jsonb, text)       set search_path = pg_catalog, public;
alter function public.imp_cel(jsonb, int)        set search_path = pg_catalog, public;
alter function public.imp_hora(text)             set search_path = pg_catalog, public;
alter function public.imp_compacto(text)         set search_path = pg_catalog, public;
