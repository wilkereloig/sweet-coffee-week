-- Reverte 20270127_caca_fila_aviso.sql: tira o aviso "Estamos com fila agora" (funções e tabela).
begin;
drop function if exists public.filas_agora_publico(text);
drop function if exists public.caca_fila_avisos(text);
drop function if exists public.caca_fila_definir(text, uuid, boolean);
drop function if exists public.marca_fila_definir(uuid, uuid, boolean);
drop function if exists public.marca_fila_estado(uuid);
drop function if exists public.caca_fila_gravar(uuid, boolean, text);
drop table if exists public.caca_fila_aviso;
commit;
