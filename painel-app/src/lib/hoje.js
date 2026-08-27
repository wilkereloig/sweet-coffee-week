/*
 * Lógica pura da vista Hoje (marca) — porte de public/painel/index.html:
 * blocosPendentes (~5299) e chaveDia (~5250). Sem import de DOM/rede, pra dar
 * pra testar com node --test.
 *
 * `blocosPendentes` agora é `blocosPendentesDeLinhas` de lib/cadastro.js —
 * a mesma regra dos 5 blocos que a vista Cadastro usa para editar, aqui só
 * lida (CLAUDE.md §5.2: uma fonte só para "o que falta no cadastro").
 */
import { blocosPendentesDeLinhas } from './cadastro.js'

export function naoVazio(s) {
  return !!(s && String(s).trim())
}

export const blocosPendentes = blocosPendentesDeLinhas

// yyyy-mm-dd LOCAL, não toISOString() (UTC vira o dia errado à noite, perto
// da virada).
export function chaveDia(d) {
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
