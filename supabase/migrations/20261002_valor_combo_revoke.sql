-- Segunda metade de 20261002_valor_combo_edicao.sql: o valor do combo é da
-- organização (edicoes.valor_combo), então a marca deixa de poder escrever
-- participacoes.combo_preco. Aplicada DEPOIS de o painel novo estar no ar —
-- o painel antigo ainda mandava combo_preco no salvamento.
-- A organização segue escrevendo pela org_salvar_participacao (security definer).
revoke update (combo_preco) on public.participacoes from authenticated;
