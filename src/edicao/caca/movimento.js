/*
 * Movimento nas casas no site (docs/cartoon-2026-2/20-movimento-nas-casas.md, parte D). Contas puras: o banco manda, por
 * unidade, só `alto` e `tranquila` (nunca números), e só com o interruptor ligado. Aqui se decide o que a tela diz.
 * O site nunca diz "lotada": ou "movimento acima do normal agora", ou "boa hora para visitar".
 */

/** Linhas de `movimento_publico` → Map(id público da unidade → { alto, tranquila }). Linha estranha fica fora. */
export function mapaDoMovimento (linhas) {
  const m = new Map()
  for (const l of Array.isArray(linhas) ? linhas : []) {
    if (l && typeof l.unidade === 'string') m.set(l.unidade, { alto: l.alto === true, tranquila: l.tranquila === true })
  }
  return m
}

/**
 * O que dizer de uma unidade agora: 'alto' · 'tranquila' · null.
 * Só fala de casa ABERTA agora (casa fechada não tem movimento para comparar). Combo esgotado e aviso de fila da própria casa
 * valem mais que a conta: com qualquer um dos dois, o selo de movimento não aparece.
 */
export function seloDoMovimento ({ mov, aberto, esgotado = false, fila = false } = {}) {
  if (!mov || !aberto || esgotado || fila) return null
  if (mov.alto) return 'alto'
  return mov.tranquila ? 'tranquila' : null
}
