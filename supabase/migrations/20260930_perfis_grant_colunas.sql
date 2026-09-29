-- A marca lia a própria linha de `perfis` inteira (grant de TABELA): o
-- `grant select (bloqueado_em)` de 20260930_acessos_e_correcoes.sql era inócuo
-- e o motivo interno do bloqueio (`bloqueado_motivo`) vazava para ela.
-- Grant de tabela vira grant de coluna, sem as duas colunas internas.
-- Quem lê as duas (status_acesso_marca, get_acessos_marcas, gerir_acesso_marca)
-- é security definer; nenhuma policy consulta `perfis`.
revoke select on public.perfis from authenticated, anon;
grant select (user_id, papel, nome, funcao, ativo, deve_trocar_senha,
              senha_trocada_em, bloqueado_em, created_at)
  on public.perfis to authenticated;
