/*
 * CÁLCULOS DO ACERVO — Sweet & Coffee Week.
 * Deriva rankings REAIS (presenças, vitórias, pódios, líderes por categoria) a
 * partir de src/data/sweetHistory.js. Nada hardcoded solto; nada inventado.
 *
 * Duas normalizações distintas:
 *  - resolveParticipant() (participantAssets): nome → LOGO/asset (só marcas com logo).
 *  - canonName() aqui: nome → IDENTIDADE canônica p/ ranking, tratando variações de
 *    grafia ao longo dos anos (ex.: "Bocaditos Doceria & Café" == "Bocaditos").
 *
 * Regras (espelham sweetHistory.js):
 *  - Vitória = 1º lugar. Pódio = 1º/2º/3º. Empate = colocação repetida conta ambos.
 *  - Trilhas (Júri Técnico / Sweet Lovers) somam juntas nos totais; cada entrada de
 *    vencedor conta uma vez.
 *  - Lovers 2026.1 NÃO está estruturada aqui → fica fora dos cálculos (capítulo
 *    editorial só, sem supor resultado).
 */
import { sweetEditions } from './sweetHistory'
import { resolveParticipant } from './participantAssets'

// Normalização base (igual à do resolver de assets): minúsculas, sem acento,
// "&"→" e ", pontuação/espaços colapsados.
const norm = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

// ---- Aliases manuais de IDENTIDADE p/ ranking (canônico → variações no acervo).
// Cobre as marcas que recorrem / premiam; long tail cai no próprio nome (norm).
const RANK_ALIASES = {
  'Mr. Cupcake': ['Mr Cupcake', 'Mr. Cupcake'],
  "Canuto's": ['Canutos', "Canuto's", "Canuto’s"],
  "Duart's": ['Duarts', "Duart's", "Duart’s", "Duart's Confeitaria"],
  'O Maestro Café': ['O Maestro', 'O Maestro Café', 'O Maestro Café & Art'],
  'Just Food&Coffee': ['Just', 'Just Coffee', 'Just Food&Coffee'],
  'Cecília Mindêlo': ['Cecilia Mindelo', 'Cecília Mindelo', 'Cecília Mindêlo', 'Cecilia Mindêlo', 'Cecilia Brownie', 'Cecilia Mindêlo Brownies', 'Cecília Mindêlo Brownies'],
  "Bell's": ["Bell's", "Bell's Cafeteria", "Bell's Café"],
  'Suisse Brownie': ['Suisse', 'Suisse Brownie', 'Swiss Brownie'],
  'Chocolateria Sandra Maia': ['Sandra Maia', 'Chocolateria Sandra Maia', 'Chocolateria Sandra Maia'],
  'Atelier Mine Confeitaria': ['Atelier Mine', 'Atelier Mine Confeitaria', 'Mine', 'Mine Confeitaria'],
  'Casa dos Salgados Gourmet': ['Casa dos Salgados', 'Casa dos Salgados Gourmet'],
  'Marlon Vinicius': ['Marlon', 'Marlon Gastronomia', 'Marlon Vinicius', 'Marlon Doceria'],
  'Bocaditos': ['Bocaditos', 'Bocaditos Doceria & Café', 'Bocaditos Confeitaria Artesanal'],
  'Caroli Douces': ['Caroli', 'Caroli Douces'],
  'Rafaela Fontes': ['Rafaela Fontes', 'Chocolateria Rafaela Fontes', 'Rafaela Fontes Chocolateria'],
  'Bella Douces': ['Bella Petit', 'Bella Peti', 'Bella Pettit', 'Bella Douces'],
  'Very Sugar': ['Very Sugar', 'Verysugar'],
  'Cássia Ribeiro': ['Cássia Ribeiro', 'Cassia Ribeiro'],
  'Jolie': ['Jolie', 'Jolie Pâtisserie', 'Jolie Parissiere', 'Jolie Parisiere', 'Jolie Pâtisserie'],
  'Bolomania': ['Bolomania', 'Bolo Mania'],
  "Jana's Cakes": ["Jana's Cakes", "Jana's Cake", "Confeitaria Jana's Cakes"],
  'Realize Gourmet': ['Realize', 'Realize Gourmet'],
  'Chapelatto': ['Chapelatto', 'Chapelatto Coffee Shop'],
  'Barões do Café': ['Barões', 'Barões do Café'],
  'Frans Café': ['Frans Café', 'Franz Café', 'Frans Cidade Jardim', 'Frans Cidade Verde', 'Frans Cidade'],
  'Das Melo': ['Das Melo'],
  'Momento Gourmet': ['Momento Gourmet'],
  'Recanto da Prosa': ['Recanto da Prosa'],
  'Daniel Bezerra': ['Daniel Bezerra'],
  'Douce di Maria': ['Douce di Maria'],
  'Delicato': ['Delicato'],
  'Sweet Duo': ['Sweet Duo'],
  'Adocee': ['Adocee'],
  'Mangai': ['Mangai'],
  'Paneer': ['Paneer'],
  'Parma Doces': ['Parma', 'Parma Doces'],
  'Boca D’Água': ["Boca D'Água", "Boca D'Água Delicatessen", "Boca D'Água"],
}

const NORM_TO_CANON = {}
for (const [canon, variants] of Object.entries(RANK_ALIASES)) {
  for (const v of variants) NORM_TO_CANON[norm(v)] = canon
}

// Nome → identidade canônica (display). Cai no próprio nome se não houver alias.
export function normalizeParticipantName(name) {
  return NORM_TO_CANON[norm(name)] || (name || '').trim()
}

// Categorias: agrupa rótulos equivalentes ao longo dos anos.
const CATEGORY_ALIASES = {
  'Melhor Combo': ['Melhor Combo'],
  'Melhor Doce': ['Melhor Doce'],
  'Melhor Bebida': ['Melhor Bebida'],
  'Melhor Salgado': ['Melhor Salgado'],
  'Melhor Sabor': ['Melhor Sabor'],
  'Melhor Atendimento': ['Melhor Atendimento'],
  'Melhor Criatividade': ['Melhor Criatividade'],
  'Melhor Apresentação': ['Melhor Apresentação'],
  'Encantamento em Loja': ['Melhor Envolvimento', 'Encantamento de Loja', 'Melhor Encantamento', 'Envolvimento e Encantamento em Loja'],
  'Delivery / Takeaway': ['Melhor Takeaway/Delivery', 'Melhor Delivery'],
}
const NORM_TO_CAT = {}
for (const [canon, variants] of Object.entries(CATEGORY_ALIASES)) {
  for (const v of variants) NORM_TO_CAT[norm(v)] = canon
}
function canonCategory(c) {
  return NORM_TO_CAT[norm(c)] || c
}

// asset (logo/fallback) a partir do nome canônico
export function getParticipantAsset(name) {
  return resolveParticipant(name)
}

// ---- PRESENÇAS: marca recorrente = aparece em N edições (nome canônico). ----
export function getParticipantAppearances() {
  const map = new Map()
  for (const e of sweetEditions) {
    const seen = new Set()
    for (const raw of e.participants || []) {
      const name = normalizeParticipantName(raw)
      const key = norm(name)
      if (!key || seen.has(key)) continue
      seen.add(key)
      if (!map.has(key)) map.set(key, { key, name, count: 0, codes: [], themes: [] })
      const o = map.get(key)
      o.count++
      o.codes.push(e.code)
      o.themes.push(e.theme)
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

// ---- Premiação: achata todos os vencedores estruturados. ----
function collectAwardEntries() {
  const rows = []
  for (const e of sweetEditions) {
    for (const a of e.awards || []) {
      const category = canonCategory(a.category)
      for (const w of a.winners || []) {
        const pos = parseInt(w.place, 10)
        const name = normalizeParticipantName(w.name)
        rows.push({ key: norm(name), name, pos, category, code: e.code, theme: e.theme, track: a.track || null })
      }
    }
  }
  return rows
}

function aggregate(rows) {
  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.key)) map.set(r.key, { key: r.key, name: r.name, total: 0, cats: new Set() })
    const o = map.get(r.key)
    o.total++
    o.cats.add(r.category)
  }
  return [...map.values()]
    .map((o) => ({ key: o.key, name: o.name, total: o.total, cats: [...o.cats] }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
}

export function getAwardWins() {
  return aggregate(collectAwardEntries().filter((r) => r.pos === 1))
}

export function getAwardPodiums() {
  return aggregate(collectAwardEntries().filter((r) => r.pos >= 1 && r.pos <= 3))
}

// Top por contagem dentro de uma lista, INCLUINDO empates no topo.
function topWithTies(rows) {
  const m = new Map()
  for (const r of rows) {
    if (!m.has(r.key)) m.set(r.key, { key: r.key, name: r.name, n: 0 })
    m.get(r.key).n++
  }
  const arr = [...m.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
  if (!arr.length) return { leaders: [], n: 0 }
  const top = arr[0].n
  return { leaders: arr.filter((x) => x.n === top), n: top }
}

// ---- Líderes por categoria: marca com mais vitórias e mais pódios (com empates). ----
export function getCategoryLeaders() {
  const rows = collectAwardEntries()
  const byCat = {}
  for (const r of rows) (byCat[r.category] || (byCat[r.category] = [])).push(r)
  const out = {}
  for (const [cat, rs] of Object.entries(byCat)) {
    out[cat] = {
      wins: topWithTies(rs.filter((r) => r.pos === 1)),
      podiums: topWithTies(rs),
    }
  }
  return out
}

// ---- Marcos da evolução das categorias (nº de categorias distintas por edição
// que TEM premiação estruturada). Usado p/ mini timeline de evolução. ----
export function getCategoryEvolution() {
  return sweetEditions
    .filter((e) => e.awards && e.awards.length > 0)
    .map((e) => {
      const cats = new Set(e.awards.map((a) => canonCategory(a.category)))
      const tracks = new Set(e.awards.map((a) => a.track).filter(Boolean))
      return { code: e.code, theme: e.theme, categories: cats.size, tracks: [...tracks] }
    })
}
