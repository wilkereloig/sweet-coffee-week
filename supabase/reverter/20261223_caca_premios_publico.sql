-- Reverte 20261223_caca_premios_publico: remove a leitura pública dos prêmios (aba "Prêmios" do Mapa da Doçura).
-- Sem a função a aba mostra o estado de erro da leitura; nada é gravado nem apagado em tabela.
drop function if exists public.caca_premios_publico(text);
