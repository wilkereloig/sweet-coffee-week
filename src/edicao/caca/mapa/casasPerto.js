/*
 * "Perto de mim": as casas mais perto da pessoa, a MESMA lista para o mapa ilustrado e o real (funções puras, tests/cartoon-perto-lista.test.mjs).
 *
 * Entrada: as linhas de `unidadesDoMapa` (já filtradas, com `dist` em km EM LINHA RETA calculada das coordenadas reais da unidade;
 * `dist` nulo = unidade sem coordenada). A posição do desenho do mapa ilustrado nunca entra aqui.
 * Regras: uma unidade por casa (a mais perto), da menor para a maior distância, no máximo `n`; sem raio de corte; unidade sem
 * coordenada não entra (nem inventa distância); menos de `n` resultados = os que houver.
 */
import { nomeDaUnidade, soDelivery } from '../../dados/modelo.js'

export const QUANTAS_PERTO = 5
export const LIMITE_LONGE_KM = 60

const temDist = (x) => typeof x?.dist === 'number' && Number.isFinite(x.dist) && !!x.u?.coordenada

/** Distância curta para o cartão: "850 m" (de 50 em 50) ou "1,2 km"; sempre aproximada, em linha reta. */
export function distanciaCurta (km) {
  if (!(km >= 0)) return ''
  if (km < 1) return `${Math.max(50, Math.round(km * 20) * 50)} m`
  return `${km.toFixed(1).replace('.', ',')} km`
}

/**
 * @returns {{ itens: Array<{rank:number, p:object, u:object, dist:number, aproximada:boolean, unidade:string}>, semCoordenada:number, longe:boolean }}
 *   `unidade` = o endereço que identifica a unidade quando a casa tem mais de uma (senão vazio); `longe` = a mais perto passa de 60 km.
 */
export function casasMaisPerto (linhas = [], n = QUANTAS_PERTO) {
  const melhor = new Map()
  for (const x of linhas) {
    if (!temDist(x)) continue
    if (soDelivery(x.u)) continue // casa só delivery não é lugar para ir: não entra em "mais perto de você"
    const atual = melhor.get(x.p.slug)
    if (!atual || x.dist < atual.dist) melhor.set(x.p.slug, x)
  }
  const itens = [...melhor.values()]
    .sort((a, b) => a.dist - b.dist || (a.p.casa?.nome || '').localeCompare(b.p.casa?.nome || '', 'pt-BR'))
    .slice(0, n)
    .map((x, i) => ({
      rank: i + 1, p: x.p, u: x.u, dist: x.dist, aproximada: !!x.u.coordenada?.conferir,
      unidade: (x.p.unidades || []).length > 1 ? (nomeDaUnidade(x.p, x.u) || x.u.endereco?.bairro || '') : '',
    }))
  const comCasa = new Set(linhas.filter(temDist).map((x) => x.p.slug))
  const semCoordenada = new Set(linhas.filter((x) => !temDist(x) && !comCasa.has(x.p.slug)).map((x) => x.p.slug)).size
  return { itens, semCoordenada, longe: itens.length > 0 && itens[0].dist > LIMITE_LONGE_KM }
}
