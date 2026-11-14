-- Reverte 20270207 (apaga os metadados das fotos já recebidos).
drop function if exists public.caca_foto_meta(text, uuid, jsonb);
alter table public.caca_carimbo_excecao drop column if exists imagem_meta;
