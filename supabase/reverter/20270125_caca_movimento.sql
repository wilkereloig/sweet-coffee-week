-- Reverte 20270125_caca_movimento.sql (só uma função de leitura).
drop function if exists public.caca_movimento_estado(text, timestamptz);
