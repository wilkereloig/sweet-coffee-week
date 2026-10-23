-- Reverte 20261109_arquivo_substituido_avisa: a substituição de arquivo volta a não avisar a marca.
drop trigger if exists arquivo_substituido_avisa on public.arquivos;
drop function if exists public.arquivo_substituido_avisa();
