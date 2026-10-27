-- Reversão de 20261113_logos_mini.sql: some a miniatura (o painel volta a usar a logo original ou as iniciais).
drop function if exists public.logo_definir_mini(text, uuid, text);
drop function if exists public.get_logos_mini(text);
alter table public.logos_marca drop constraint if exists logos_marca_mini_check;
alter table public.logos_marca drop column if exists mini;
