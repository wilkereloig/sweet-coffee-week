-- Reversão de 20261111_imp_search_path_fixo.sql: os auxiliares voltam a herdar o search_path de quem chama.
alter function public.imp_cel(jsonb, integer) reset search_path;
alter function public.imp_col(jsonb, text) reset search_path;
alter function public.imp_compacto(text) reset search_path;
alter function public.imp_hora(text) reset search_path;
