/*
 * Cenas da camada de edição — função pura (testada em tests/rotas-edicao.test.mjs).
 *
 * Recebe o caminho cru (sem '#', sem query) e devolve qual página da edição
 * mostrar. `/` só chega aqui quando a edição é a entrada principal.
 * /cartoon/combos/:slug abre a MESMA página do participante, focada no combo
 * (§2.3 do plano: uma ficha só).
 */
import { EDICAO } from './config.js'

export const CENAS = ['entrada', 'participantes', 'participante', 'combos', 'mapa', 'minha-rota', 'avaliar', 'premiacao', 'inexistente']

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** { cena, slug?, foco? } para um caminho da edição. */
export function resolverCena (path = '', base = EDICAO.caminho) {
  const limpo = String(path).split(/[?#]/)[0].replace(/\/+$/, '')
  const resto = limpo === '' || limpo === '/' ? '' : limpo.startsWith(base) ? limpo.slice(base.length) : null
  if (resto === null) return { cena: 'inexistente' }
  const partes = resto.split('/').filter(Boolean)
  if (partes.length === 0) return { cena: 'entrada' }
  const [primeira, slug, ...sobra] = partes
  if (sobra.length) return { cena: 'inexistente' }
  if (primeira === 'participantes' || primeira === 'combos') {
    if (!slug) return { cena: primeira }
    if (!SLUG.test(slug)) return { cena: 'inexistente' }
    return primeira === 'combos'
      ? { cena: 'participante', slug, foco: 'combo' }
      : { cena: 'participante', slug }
  }
  if (!slug && ['mapa', 'minha-rota', 'avaliar', 'premiacao'].includes(primeira)) return { cena: primeira }
  return { cena: 'inexistente' }
}
