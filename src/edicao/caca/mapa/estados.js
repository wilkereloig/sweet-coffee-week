/*
 * Caça aos Carimbos — o mapa: estados das casas, progresso pessoal e próximo passo (spec 15 §1, §2, §10).
 * Funções puras (tests/cartoon-caca-mapa.test.mjs). O estado de cada casa vem SEMPRE do servidor (`mapa_ler_v2.casas[]`:
 * `{ slug, carimbos, avaliou, estado: 'validada'|'pendente', extras }`) — nunca de "quero ir", de rota ou de "já fui".
 * Nenhum total é escrito aqui: o N de "X de N" é o `total_casas` do servidor ou a lista da edição.
 */

/** Estados que o mapa desenha. `null` (sem mapa) não desenha estado nenhum. */
export const ESTADOS = ['nao-visitada', 'pendente', 'conquistada']

/** 'conquistada' (carimbo + avaliação validados) · 'pendente' (carimbou, falta avaliar) · 'nao-visitada'. */
export function estadoDaCasa (c) {
  if (!c) return 'nao-visitada'
  if (c.estado === 'validada') return 'conquistada'
  if (c.estado === 'pendente') return 'pendente'
  // leitura antiga, sem `estado`: carimbou e avaliou = validada; carimbou e não avaliou = pendente
  const carimbos = Number(c.carimbos) || 0
  if (carimbos > 0) return c.avaliou ? 'conquistada' : 'pendente'
  return 'nao-visitada'
}

/** Revisitas válidas (carimbos extras) da casa — só existem depois de a casa ser conquistada. */
export function revisitasDaCasa (c) {
  if (!c || estadoDaCasa(c) !== 'conquistada') return 0
  const extras = Number(c.extras)
  if (Number.isFinite(extras)) return Math.max(0, Math.trunc(extras))
  return Math.max(0, Math.trunc((Number(c.carimbos) || 0) - 1))
}

/** slug → casa do mapa (`mapa_ler_v2.casas`). Sem mapa, `null`: as telas não desenham estado. */
export function casasDoMapa (mapa) {
  if (!mapa || !Array.isArray(mapa.casas)) return null
  return new Map(mapa.casas.filter((c) => c && typeof c.slug === 'string').map((c) => [c.slug, c]))
}

const inteiro = (n) => (Number.isFinite(Number(n)) ? Math.max(0, Math.trunc(Number(n))) : 0)

/**
 * "X de N casas": X = casas validadas; N = `total_casas` do servidor, ou o total da edição (`totalDaEdicao`) enquanto
 * o servidor não responde. Nunca passa de N nem fica negativo.
 */
export function progressoPessoal (mapa, totalDaEdicao = 0) {
  const total = inteiro(mapa?.total_casas) || inteiro(totalDaEdicao)
  const feitas = Math.min(inteiro(mapa?.casas_validadas), total || Infinity)
  const casas = Array.isArray(mapa?.casas) ? mapa.casas : []
  return {
    total, feitas,
    pendentes: casas.filter((c) => estadoDaCasa(c) === 'pendente').length,
    extras: inteiro(mapa?.extras),
    completo: total > 0 && feitas >= total,
  }
}

/** Slugs na ordem do caminho do mapa — de cima para baixo no desenho (norte → sul); casa sem lugar na arte vai para o fim, na ordem da lista. */
export function ordemDasCasas (participantes = [], unidadesDoMundo = {}) {
  const altura = (p) => {
    const ys = (p.unidades || []).map((u) => unidadesDoMundo[u.id]?.y).filter(Number.isFinite)
    return ys.length ? Math.min(...ys) : Infinity
  }
  return participantes.map((p, i) => ({ slug: p.slug, y: altura(p), i }))
    .sort((a, b) => (a.y === b.y ? a.i - b.i : a.y - b.y)).map((x) => x.slug)
}

/**
 * O próximo passo (spec 10: "destacar o próximo passo"). Ordem de prioridade:
 *   avaliar  — há carimbo pendente: avaliar fecha o que já foi feito;
 *   rota     — a primeira parada da rota cuja casa ainda não foi conquistada;
 *   visitar  — a primeira casa do caminho do mapa ainda não visitada;
 *   completo — todas conquistadas;  criar-mapa — sem mapa;  nenhum — nada a destacar (sem casa visitável).
 * `visitaveis`: slugs que têm unidade (sem endereço não há o que visitar). `paradas`: slugs na ordem da rota.
 */
export function proximoPasso ({ mapa, casas, ordem = [], paradas = [], visitaveis = ordem }) {
  if (!mapa || !casas) return { tipo: 'criar-mapa' }
  const pode = new Set(visitaveis)
  const estado = (slug) => estadoDaCasa(casas.get(slug))
  const pendente = ordem.find((s) => pode.has(s) && estado(s) === 'pendente')
  if (pendente) return { tipo: 'avaliar', slug: pendente }
  const naRota = paradas.find((s) => pode.has(s) && estado(s) !== 'conquistada')
  if (naRota) return { tipo: 'rota', slug: naRota }
  const falta = ordem.find((s) => pode.has(s) && estado(s) === 'nao-visitada')
  if (falta) return { tipo: 'visitar', slug: falta }
  return visitaveis.length && visitaveis.every((s) => estado(s) === 'conquistada') ? { tipo: 'completo' } : { tipo: 'nenhum' }
}

/**
 * Conquistas novas desde a última vez que a pessoa viu o mapa. `anterior`: { slug: estado } guardado no aparelho (ou
 * null na primeira visita — aí não há festa, só o ponto de partida). Devolve os slugs que viraram 'conquistada'.
 */
export function novasConquistas (anterior, casas) {
  if (!anterior || !casas) return []
  return [...casas].filter(([slug, c]) => estadoDaCasa(c) === 'conquistada' && anterior[slug] !== 'conquistada').map(([slug]) => slug)
}

/** { slug: estado } do mapa, para guardar no aparelho. */
export const fotografia = (casas) => Object.fromEntries([...(casas || [])].map(([slug, c]) => [slug, estadoDaCasa(c)]))

/**
 * A arte ilustrada só vira a vista principal com a arte APROVADA; a provisória fica no ambiente de desenvolvimento
 * (prévia) e nunca é ligada em silêncio (spec 10, `aprovada` em src/data/mundoEdicao.js).
 */
export const arteLiberada = ({ aprovada, dev }) => aprovada === true || dev === true

/** Aplica o filtro "meu progresso" (estado da casa) a linhas `{ p }`; sem filtro ou sem mapa devolve tudo. */
export function filtrarPorEstado (linhas, estado, casas) {
  if (!estado || !casas) return linhas
  return linhas.filter(({ p }) => estadoDaCasa(casas.get(p.slug)) === estado)
}

/**
 * Cobertura do mapa real: quantas unidades têm ponto conferido, aproximado ou nenhum. `coordenada.conferir` = a rua
 * confere mas o número não (ou o ponto veio do bairro) — nunca se passa por posição exata.
 */
export function coberturaDoMapa (unidades = []) {
  let conferidas = 0; let aproximadas = 0; let sem = 0
  for (const u of unidades) {
    if (!u?.coordenada) sem++
    else if (u.coordenada.conferir) aproximadas++
    else conferidas++
  }
  return { conferidas, aproximadas, sem, total: conferidas + aproximadas + sem }
}
