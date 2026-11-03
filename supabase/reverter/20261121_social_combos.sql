-- Reversão de 20261121_social_combos.sql: a aba Social media › Combos deixa de ter leitura no banco (a tela mostra erro).
-- Não mexe em dado: só remove a função de leitura.
drop function if exists public.editorial_combos(text, text);
