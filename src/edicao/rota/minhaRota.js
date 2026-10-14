/*
 * Minha rota — paradas escolhidas pelo visitante (§6.2 do plano).
 *
 * Guarda só ids públicos de unidade, por edição, no navegador
 * (`scw:edicao:<codigo>:rota`). Nada vai ao servidor. A ordem é a do visitante:
 * não há cálculo de melhor caminho, e nenhum texto promete isso.
 * As funções de lista são puras (tests/cartoon-rota.test.mjs); o armazenamento
 * fica em try/catch — navegador sem storage segue funcionando sem persistir.
 */

export const chaveRota = (codigo) => `scw:edicao:${codigo}:rota`
export const LIMITE_LINK = 9 // paradas por link de rota externa; acima disso, trechos

export function lerRota (codigo, armazenamento = globalThis.localStorage) {
  try {
    const v = JSON.parse(armazenamento.getItem(chaveRota(codigo)) || 'null')
    return Array.isArray(v?.unidades) ? [...new Set(v.unidades.filter((x) => typeof x === 'string'))] : []
  } catch { return [] }
}
export function gravarRota (codigo, ids, armazenamento = globalThis.localStorage) {
  try { armazenamento.setItem(chaveRota(codigo), JSON.stringify({ versao: 1, unidades: ids, atualizado: Date.now() })) } catch { /* sem storage */ }
}

export const adicionar = (ids, id) => (ids.includes(id) ? ids : [...ids, id])
export const remover = (ids, id) => ids.filter((x) => x !== id)
export function mover (ids, id, passo) {
  const i = ids.indexOf(id); const j = i + passo
  if (i < 0 || j < 0 || j >= ids.length) return ids
  const out = [...ids]; [out[i], out[j]] = [out[j], out[i]]
  return out
}

/** Cruza os ids guardados com as unidades publicadas; o que sumiu volta como "saiu da edição". */
export function resolverParadas (ids, participantes = []) {
  const porId = new Map()
  for (const p of participantes) for (const u of p.unidades || []) porId.set(u.id, { participante: p, unidade: u })
  return ids.map((id) => (porId.has(id) ? { id, ...porId.get(id), ativa: true } : { id, ativa: false }))
}

/** Links externos de rota (Google Maps), em trechos de até LIMITE_LINK paradas, na ordem do visitante. */
export function linksDeRota (paradas) {
  const pontos = paradas.filter((p) => p.ativa).map(({ unidade: u }) => (u.coordenada
    ? `${u.coordenada.lat},${u.coordenada.lng}`
    : [u.endereco?.logradouro, u.endereco?.numero, u.endereco?.bairro, u.endereco?.cidade].filter(Boolean).join(', ')))
    .filter(Boolean)
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
