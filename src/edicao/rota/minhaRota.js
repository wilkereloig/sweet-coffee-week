/*
 * Minha rota / painel do Sweet Lover (§6.2 do plano; docs/cartoon-2026-2/10 §10.14).
 *
 * Guarda só ids públicos de unidade, por edição, no navegador
 * (`scw:edicao:<codigo>:rota`). Nada vai ao servidor, nada pede conta.
 *  · `unidades`: "quero ir" — as paradas, na ordem do visitante. Não há cálculo de
 *    melhor caminho, e nenhum texto promete isso.
 *  · `visitadas`: "já fui". É marca da CASA (o progresso conta casas), guardada pelos
 *    ids das unidades dela — o id da unidade é estável; o slug pode mudar até a publicação.
 * Versão 1 (só `unidades`) é lida como está e vira versão 2 na próxima gravação.
 * As funções são puras (tests/cartoon-rota.test.mjs); o armazenamento fica em try/catch,
 * inclusive o acesso a `localStorage` (navegador que bloqueia lança ao ler a propriedade):
 * sem storage, o painel segue funcionando sem persistir.
 */

export const chaveRota = (codigo) => `scw:edicao:${codigo}:rota`
export const LIMITE_LINK = 9 // paradas por link de rota externa; acima disso, trechos

const ids = (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string'))] : [])

/** { unidades, visitadas } guardados para a edição; storage ausente, quebrado ou de outra forma → listas vazias. */
export function lerPainel (codigo, armazenamento) {
  try {
    const v = JSON.parse((armazenamento ?? globalThis.localStorage).getItem(chaveRota(codigo)) || 'null')
    return { unidades: ids(v?.unidades), visitadas: ids(v?.visitadas) }
  } catch { return { unidades: [], visitadas: [] } }
}
export function gravarPainel (codigo, { unidades = [], visitadas = [] }, armazenamento) {
  try {
    (armazenamento ?? globalThis.localStorage).setItem(chaveRota(codigo), JSON.stringify({ versao: 2, unidades, visitadas, atualizado: Date.now() }))
  } catch { /* sem storage */ }
}
export const lerRota = (codigo, armazenamento) => lerPainel(codigo, armazenamento).unidades
export const gravarRota = (codigo, unidades, armazenamento) => gravarPainel(codigo, { ...lerPainel(codigo, armazenamento), unidades }, armazenamento)

export const adicionar = (ids, id) => (ids.includes(id) ? ids : [...ids, id])
export const remover = (ids, id) => ids.filter((x) => x !== id)
/**
 * Sobe/desce uma parada. `visiveis`: as paradas que o visitante VÊ (as pendentes — a casa marcada "já fui" sai da
 * lista sem sair da rota); a troca é com a vizinha visível, para o botão nunca "não fazer nada".
 */
export function mover (ids, id, passo, visiveis = ids) {
  const k = visiveis.indexOf(id)
  const vizinha = k < 0 ? undefined : visiveis[k + passo]
  const i = ids.indexOf(id); const j = ids.indexOf(vizinha)
  if (i < 0 || j < 0) return ids
  const out = [...ids]; [out[i], out[j]] = [out[j], out[i]]
  return out
}

const idsDaCasa = (p) => (p?.unidades || []).map((u) => u.id)
/** "Já fui" vale para a casa: qualquer unidade dela marcada. */
export const visitada = (p, visitadas = []) => idsDaCasa(p).some((id) => visitadas.includes(id))
/** Marca ou desmarca a casa inteira (todas as unidades), para o mapa e a rota mostrarem o mesmo estado. */
export const alternarVisita = (visitadas, p) => (visitada(p, visitadas)
  ? visitadas.filter((id) => !idsDaCasa(p).includes(id))
  : [...new Set([...visitadas, ...idsDaCasa(p)])])

/** "x de N casas": N = casas com unidade (sem endereço não há o que visitar); x = as marcadas como "já fui". */
export function progresso (visitadas = [], participantes = []) {
  const casas = participantes.filter((p) => idsDaCasa(p).length)
  return { feitas: casas.filter((p) => visitada(p, visitadas)).length, total: casas.length }
}

/** Cruza os ids guardados com as unidades publicadas; o que sumiu volta como "saiu da edição". */
export function resolverParadas (ids, participantes = []) {
  const porId = new Map()
  for (const p of participantes) for (const u of p.unidades || []) porId.set(u.id, { participante: p, unidade: u })
  return ids.map((id) => (porId.has(id) ? { id, ...porId.get(id), ativa: true } : { id, ativa: false }))
}

/**
 * Links externos de rota (Google Maps), em trechos de até LIMITE_LINK paradas, na ordem do visitante.
 * Coordenada só quando conferida (a mesma regra do "Como chegar", modelo.js): a aproximada do retrato
 * mandaria o trajeto para outro ponto da rua; ali vale o endereço escrito.
 */
export function linksDeRota (paradas) {
  const pontos = paradas.filter((p) => p.ativa).map(({ unidade: u }) => {
    const c = u.coordenada
    const texto = [u.endereco?.logradouro, u.endereco?.numero, u.endereco?.bairro, u.endereco?.cidade].filter(Boolean).join(', ')
    return c && (!c.conferir || !texto) ? `${c.lat},${c.lng}` : texto
  }).filter(Boolean)
  const links = []
  for (let i = 0; i < pontos.length; i += LIMITE_LINK) {
    const trecho = pontos.slice(i, i + LIMITE_LINK)
    const destino = trecho[trecho.length - 1]
    const meio = trecho.slice(0, -1)
    const q = new URLSearchParams({ api: '1', destination: destino, travelmode: 'driving' })
    if (meio.length) q.set('waypoints', meio.join('|'))
    links.push(`https://www.google.com/maps/dir/?${q.toString()}`)
  }
  return links
}

/** Rota compartilhada pelo link (?u=id1,id2). */
export const idsDaBusca = (search = '') => [...new Set((new URLSearchParams(search).get('u') || '').split(',').filter((x) => /^u[0-9a-f]{6}$|^udemo\d+$/.test(x)))]
