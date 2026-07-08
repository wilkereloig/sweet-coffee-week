// Destaques por edição para a página Edições (painel-cena):
//  - pódio real (só 1º lugares, empates preservados) derivado das bases oficiais;
//  - curadoria de frames "cena" (foto protagonista do painel) do acervo
//    /images/edicoes/<code>/NN.webp.
// Regra do projeto: NADA inventado — tudo derivado de sweetCoffeeHistory.js
// (histórico) e loversAwardsResults.js (2026.1, cujos pódios ficam vazios de
// propósito na base histórica). Doc: docs/superpowers/specs/
// 2026-07-07-edicoes-cinema-da-decada-design.md (§5).
import { SWEET_COFFEE_HISTORY } from './sweetCoffeeHistory'
import { LOVERS_2026_AWARDS_RESULTS } from './loversAwardsResults'

// ---- Curadoria de cena -----------------------------------------------------
// 2 frames por edição (protagonista + alternante do crossfade), escolhidos à
// mão — mesma curadoria validada nas galerias da Home (frames "calmos" à
// esquerda p/ o texto do painel). Fallback: início da galeria da edição.
export const SCENE_SHOTS = {
  '2016':   ['05.webp', '02.webp'],
  '2017.1': ['07.webp', '09.webp'],
  '2017.2': ['12.webp', '08.webp'],
  '2018.1': ['03.webp', '01.webp'],
  '2018.2': ['02.webp', '07.webp'],
  '2019.1': ['02.webp', '11.webp'],
  '2019.2': ['07.webp', '01.webp'],
  '2020.1': ['07.webp', '04.webp'],
  '2020.2': ['08.webp', '07.webp'],
  '2021.1': ['08.webp', '07.webp'],
  '2021.2': ['12.webp', '04.webp'],
  '2022':   ['07.webp', '08.webp'],
  '2023':   ['02.webp', '01.webp'],
  '2024':   ['02.webp', '08.webp'],
  '2025':   ['11.webp', '01.webp'],
  '2026.1': ['05.webp', '04.webp'],
}

// URLs completas dos frames de cena; se a curadoria faltar, usa o início da
// galeria (gallery = lista de URLs já resolvidas, ex.: EDITION_GALLERY[code]).
export function sceneShotsFor(code, gallery = []) {
  const curated = (SCENE_SHOTS[code] || []).map((f) => `/images/edicoes/${code}/${f}`)
  const list = curated.length ? curated : gallery.slice(0, 2)
  // só devolve o que existe na galeria da edição (evita 404 por curadoria errada)
  const known = new Set(gallery)
  const safe = gallery.length ? list.filter((src) => known.has(src)) : list
  return safe.length ? safe : gallery.slice(0, 2)
}

// ---- Pódio da edição -------------------------------------------------------
// Ordem editorial dos destaques (máx. 3 categorias por painel).
const CATEGORY_PRIORITY = ['Melhor Combo', 'Melhor Doce', 'Melhor Bebida']

const histById = Object.fromEntries(SWEET_COFFEE_HISTORY.edicoes.map((e) => [e.id, e]))

function firstsFrom(categorias) {
  return categorias
    .map((c) => {
      const first = (c.colocacoes || []).find((p) => p.pos === 1)
      if (!first || !first.nomes || !first.nomes.length) return null
      return { categoria: c.categoria, trilha: c.trilha || null, nomes: first.nomes }
    })
    .filter(Boolean)
}

function pickTop(firsts, max = 3) {
  const seen = new Set()
  const ranked = [
    ...CATEGORY_PRIORITY.map((cat) => firsts.find((f) => f.categoria === cat)).filter(Boolean),
    ...firsts,
  ].filter((f) => {
    const k = `${f.categoria}|${f.trilha || ''}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  return ranked.slice(0, max)
}

/**
 * Pódio-resumo da edição: até 3 categorias, só 1º lugares (empates = vários
 * nomes). Retorna null quando a edição não teve premiação registrada
 * (2016–2018) — ausência honesta, sem placeholder.
 * @returns {null | { firsts: {categoria, trilha, nomes[]}[], totalCategorias: number, observacao: string|null }}
 */
export function getEditionHighlights(code) {
  // Lovers: fonte oficial dedicada (regra CLAUDE.md §12/§16)
  const premiacao = code === '2026.1'
    ? LOVERS_2026_AWARDS_RESULTS.premiacao
    : (histById[code] || {}).premiacao
  if (!premiacao || premiacao.status !== 'completa') return null
  const categorias = premiacao.categorias || []
  const firsts = firstsFrom(categorias)
  if (!firsts.length) return null
  return {
    firsts: pickTop(firsts),
    totalCategorias: categorias.length,
    observacao: premiacao.observacao || null,
  }
}
