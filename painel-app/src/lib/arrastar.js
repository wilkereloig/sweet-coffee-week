/*
 * Arrastar material da Biblioteca para uma pasta (21/10/2026, pedido do Wilker) — lógica pura.
 * Soltar numa pasta é a MESMA operação de "Mover para…" (social_biblioteca_mover): nada muda no
 * Storage, nas postagens nem na origem do arquivo. O banco decide de novo (permissão, pasta
 * arquivada, teto); aqui a tela só evita oferecer o que seria recusado ou não mudaria nada.
 */

export const RAIZ = 'raiz' // alvo "Biblioteca / Sem pasta": move para fora de qualquer pasta
export const LIMITE_ARRASTO = 500 // o mesmo teto de social_biblioteca_mover

/** O que vai junto: se o arquivo pego está na seleção, a seleção inteira; senão, só ele. */
export function itensDoArrasto(x, marcados, selecionando, chave) {
  if (selecionando && marcados && marcados.has(chave(x))) return [...marcados.values()]
  return [x]
}

/** Destino que muda algo: pelo menos um item ainda não está lá (`raiz` ou nulo = sem pasta). */
export function destinoValido(itens, destino) {
  if (!itens || !itens.length || itens.length > LIMITE_ARRASTO) return false
  if (destino == null || destino === '') return false
  const alvo = destino === RAIZ ? null : destino
  return itens.some((x) => (x.pasta_id || null) !== alvo)
}

export const rotuloArrasto = (itens) => (itens.length === 1 ? itens[0].nome : itens.length + ' arquivos')

/** -1 sobe, 1 desce, 0 não rola: o ponteiro está a menos de `margem` px da borda do quadro de rolagem. */
export function direcaoRolagem(y, topo, base, margem = 64) {
  if (y < topo + margem) return -1
  if (y > base - margem) return 1
  return 0
}

/** Quanto mexer antes de virar arrasto: o mouse precisa de folga (um clique treme); a alça é só para arrastar. */
export const limiar = (alca) => (alca ? 3 : 6)
export const passou = (x0, y0, x, y, lim) => Math.hypot(x - x0, y - y0) >= lim
