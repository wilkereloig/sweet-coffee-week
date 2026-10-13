/* Medalha por colocação (§6.4) — codifica o resultado, não decora. Numeral
   SEMPRE chocolate. 3º é laranja, não marrom: marrom sobre chocolate dá ~1,5:1
   e falha como emblema e como texto solto no Hall, que tem fundo chocolate. */
const MEDALHA = { 1: 'var(--scw-amarelo)', 2: 'var(--scw-cyan)', 3: 'var(--scw-laranja)' }

export const medalha = (pos) => MEDALHA[pos] || 'var(--scw-laranja)'
