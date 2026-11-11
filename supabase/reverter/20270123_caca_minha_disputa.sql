-- Desfaz 20270123_caca_minha_disputa.sql. Só leitura: apagar a função não mexe em nenhum dado. O cartão do hub some sozinho
-- (a leitura falha e o cartão não é desenhado).
drop function if exists public.caca_minha_disputa(text);
