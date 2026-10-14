// Ajudante dos testes: o registro de ícones v3 lido dos arquivos GERADOS
// (JS puro, sem JSX) — a mesma fonte que ScwIcon, IconeUi e o painel usam.
import INTERFACE from '../src/components/scw-icons/gerado/interface.js'
import EXPRESSIVA from '../src/components/scw-icons/gerado/expressiva.js'
import { ALIASES, FAMILIAS, NOMES } from '../src/components/scw-icons/gerado/especificacao.js'

export { INTERFACE, EXPRESSIVA, ALIASES, FAMILIAS, NOMES }
export const canonico = (n) => ALIASES[n] || n
export const existe = (n) => !!(INTERFACE[canonico(n)] || EXPRESSIVA[canonico(n)])
/** Existe desenho da família que o tamanho pede (≤24 interface, ≥32 expressiva)? */
export function temDesenho(n, tamanho) {
  const c = canonico(n)
  if (INTERFACE[c] && INTERFACE[c].m) return true
  return tamanho >= 28 ? !!EXPRESSIVA[c] : !!INTERFACE[c]
}
