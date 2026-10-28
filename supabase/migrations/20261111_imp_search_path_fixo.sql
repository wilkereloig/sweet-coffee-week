-- Os quatro auxiliares da importação (imp_cel, imp_col, imp_compacto, imp_hora) tinham search_path herdado de
-- quem chama (aviso function_search_path_mutable do Supabase). Nenhum depende dele: só usam funções do
-- pg_catalog ou chamam public.normalizar_nome qualificado. search_path vazio fecha o aviso sem mudar resultado.
alter function public.imp_cel(jsonb, integer) set search_path = '';
alter function public.imp_col(jsonb, text) set search_path = '';
alter function public.imp_compacto(text) set search_path = '';
alter function public.imp_hora(text) set search_path = '';
