/*
 * CÁLCULOS DO ACERVO — Sweet & Coffee Week.
 * Fonte oficial: src/data/sweetCoffeeHistory.js (SWEET_COFFEE_HISTORY, 16 edições
 * 2016–2026.1, com participantAliases/categoryAliases). Os pódios da 16ª edição
 * (Lovers 2026.1) vêm de src/data/loversAwardsResults.js quando a base ainda não
 * os traz estruturados. Nada inventado; empates preservados.
 *
 * Deriva rankings REAIS: presenças recorrentes, vitórias (1º), pódios (1º–3º),
 * líderes por categoria e evolução das categorias. Logos via resolveParticipant
 * (fallback textual). Mantém a mesma API consumida por Curiosidades.jsx.
 */
import { SWEET_COFFEE_HISTORY } from './sweetCoffeeHistory'
import { LOVERS_2026_AWARDS_RESULTS } from './loversAwardsResults'
import { resolveParticipant } from './participantAssets'
import { PARTICIPANTS } from './participants'

const { edicoes = [], participantAliases = {}, categoryAliases = {} } = SWEET_COFFEE_HISTORY

const norm = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

// Inverte os mapas oficiais (canônico → [variações]) em norm(variação) → canônico.
const NORM_TO_CANON = {}
for (const [canon, variants] of Object.entries(participantAliases)) {
  NORM_TO_CANON[norm(canon)] = canon
  for (const v of variants) NORM_TO_CANON[norm(v)] = canon
}
const NORM_TO_CAT = {}
for (const [canon, variants] of Object.entries(categoryAliases)) {
  NORM_TO_CAT[norm(canon)] = canon
  for (const v of variants) NORM_TO_CAT[norm(v)] = canon
}

export function normalizeParticipantName(name) {
  return NORM_TO_CANON[norm(name)] || (name || '').trim()
}
function canonCategory(c) {
  return NORM_TO_CAT[norm(c)] || (c || '').trim()
}
export function getParticipantAsset(name) {
  return resolveParticipant(name)
}

// Normaliza a premiação de uma edição → [{ category, track, winners:[{place,pos,name}] }].
// Para 2026.1 (Lovers), usa loversAwardsResults se a base não trouxer pódios.
function editionAwards(ed) {
  let cats = (ed.premiacao && ed.premiacao.categorias) || []
  if (ed.id === '2026.1' && cats.length === 0) {
    cats = LOVERS_2026_AWARDS_RESULTS.premiacao.categorias
  }
  return cats.map((c) => ({
    category: canonCategory(c.categoria),
    track: c.trilha || null,
    winners: (c.colocacoes || []).flatMap((p) =>
      (p.nomes || []).map((n) => ({ place: `${p.pos}º`, pos: p.pos, name: normalizeParticipantName(n) }))
    ),
  }))
}

// Modelo interno uniforme das 16 edições.
const EDITIONS = edicoes.map((ed) => ({
  id: ed.id,
  code: ed.id,
  ordem: ed.ordem,
  theme: ed.tema || ed.nome,
  participantsCount: ed.participantesCount,
  participants: ed.participantes || [],
  status: ed.premiacao && ed.premiacao.status,
  awards: editionAwards(ed),
}))

// ---- PRESENÇAS: marca recorrente = aparece em N edições (nome canônico). ----
export function getParticipantAppearances() {
  const map = new Map()
  for (const e of EDITIONS) {
    const seen = new Set()
    for (const raw of e.participants) {
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

function collectAwardEntries() {
  const rows = []
  for (const e of EDITIONS) {
    for (const a of e.awards) {
      for (const w of a.winners) {
        rows.push({ key: norm(w.name), name: w.name, pos: w.pos, category: a.category, code: e.code, theme: e.theme, track: a.track })
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

export function getCategoryEvolution() {
  return EDITIONS
    .filter((e) => e.awards.length > 0)
    .map((e) => {
      const cats = new Set(e.awards.map((a) => a.category))
      const tracks = new Set(e.awards.map((a) => a.track).filter(Boolean))
      return { code: e.code, theme: e.theme, categories: cats.size, tracks: [...tracks] }
    })
}

// ---- HOMENAGENS: marcas da Lovers agrupadas pela edição que escolheram reviver. ----
// Fonte: PARTICIPANTS[].edition (grafia normalizada; "Contos de Fada" == "Contos de Fadas").
const HOMAGE_LABELS = {
  'sweet trip': 'Sweet Trip',
  'sweet celebration': 'Sweet Celebration',
  'sweet music': 'Sweet Music',
  'contos de fadas': 'Contos de Fadas',
  'sweet series': 'Sweet Series',
  'filmes': 'Filmes',
  'terras potiguares': 'Terras Potiguares',
}

export function getHomageGroups() {
  const map = new Map()
  for (const p of PARTICIPANTS) {
    let key = norm(p.edition)
    if (key === 'contos de fada') key = 'contos de fadas'
    if (!map.has(key)) map.set(key, { key, brands: [] })
    map.get(key).brands.push({ name: p.name, slug: p.slug, theme: p.theme })
  }
  return [...map.values()]
    .map((g) => ({ ...g, label: HOMAGE_LABELS[g.key] || g.brands[0].name, count: g.brands.length }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

// ---- Vencedores repetidos de uma categoria (só 1º lugar; trilhas/empates preservados). ----
export function getRepeatCategoryWinners(categoryName) {
  const target = norm(canonCategory(categoryName))
  const rows = collectAwardEntries().filter((r) => r.pos === 1 && norm(r.category) === target)
  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.key)) map.set(r.key, { key: r.key, name: r.name, wins: [] })
    map.get(r.key).wins.push({ code: r.code, track: r.track })
  }
  return [...map.values()]
    .filter((w) => w.wins.length > 1)
    .sort((a, b) => b.wins.length - a.wins.length || a.name.localeCompare(b.name))
}

// ---- Marcos/primeiras vezes derivados da base (datas NUNCA hardcoded na página). ----
export function getMilestoneFacts() {
  const ordered = [...EDITIONS].sort((a, b) => a.ordem - b.ordem)
  const first = ordered[0] || null
  const last = ordered[ordered.length - 1] || null
  const firstAwards = ordered.find((e) => e.awards.length > 0) || null
  const firstTracks = ordered.find((e) => e.awards.some((a) => a.track)) || null
  const catCodes = new Map()
  for (const e of ordered) {
    for (const a of e.awards) {
      const k = norm(a.category)
      if (!catCodes.has(k)) catCodes.set(k, { category: a.category, codes: [] })
      catCodes.get(k).codes.push(e.code)
    }
  }
  const uniqueCategories = [...catCodes.values()]
    .filter((c) => c.codes.length === 1)
    .map((c) => ({ category: c.category, code: c.codes[0] }))
  const pick = (e) => (e ? { code: e.code, theme: e.theme } : null)
  return {
    firstEdition: pick(first),
    lastEdition: pick(last),
    editionsCount: ordered.length,
    // "2026.1" - "2016" ≈ 10.1 → 10 anos; parseFloat proposital (ids tipo "2020.2").
    festivalYears: first && last ? Math.round(parseFloat(last.code) - parseFloat(first.code)) : null,
    firstAwards: pick(firstAwards),
    firstTracks: pick(firstTracks),
    uniqueCategories,
  }
}
