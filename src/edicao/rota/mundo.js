/*
 * Mundo da Doçura — contas puras do mapa desenhado (docs/cartoon-2026-2/14 §14.13; tests/cartoon-mundo.test.mjs).
 * `unidades`: o mapa id → { x, y, numero, slug } de src/data/mundoEdicao.js (x/y de 0 a 1 sobre a arte; o número da casa é
 * a ordem ALFABÉTICA da legenda impressa, desde a arte final de 05/11 — não é mais a ordem do caminho). A "ordem do caminho"
 * é geográfica NO DESENHO: de cima para baixo (norte → sul), empate da esquerda para a direita. A rota desenhada é ESQUEMÁTICA:
 * liga as paradas na ordem do visitante, não segue rua. Quem leva até lá é o Google Maps (minhaRota.js, linksDeRota).
 */

const pelaOrdem = (unidades) => (a, b) => unidades[a].numero - unidades[b].numero || unidades[a].y - unidades[b].y
const peloCaminho = (unidades) => (a, b) => unidades[a].y - unidades[b].y || unidades[a].x - unidades[b].x || unidades[a].numero - unidades[b].numero

/**
 * Unidade que entrou no cadastro DEPOIS da arte (sem lugar em `mundo.unidades`) herda o ponto e o número da própria casa (mesmo slug),
 * como as outras unidades dela: a arte tem um lugar por casa. Sem isso ela sumia do mapa ilustrado e existia só no real
 * (10/11/2026: Paneer Capim Macio e Lagoa Nova). Casa que a arte não tem continua fora.
 */
export function completarUnidades (mundo, participantes = []) {
  const extra = {}
  for (const p of participantes) {
    const casa = mundo.casas?.[p.slug]
    if (!casa?.ponto) continue
    for (const u of p.unidades || []) if (!mundo.unidades[u.id]) extra[u.id] = { x: casa.ponto.x, y: casa.ponto.y, numero: casa.numero, slug: p.slug }
  }
  return Object.keys(extra).length ? { ...mundo, unidades: { ...mundo.unidades, ...extra } } : mundo
}

/** Linhas (unidade + casa) que têm lugar na arte, com x/y/número, na ordem da legenda (número) — a ordem do teclado. */
export function casasNoMundo (unidades, linhas) {
  const ordem = pelaOrdem(unidades)
  return linhas.filter((l) => unidades[l.u.id]).sort((a, b) => ordem(a.u.id, b.u.id)).map((l) => ({ ...l, ...unidades[l.u.id] }))
}

/** "Ordenar de norte a sul": quem tem lugar na arte vai de cima para baixo; quem não tem fica no fim, como estava. */
export function ordemDoCaminho (ids, unidades) {
  return [...ids.filter((id) => unidades[id]).sort(peloCaminho(unidades)), ...ids.filter((id) => !unidades[id])]
}

/** Pontos da rota na arte, na ordem do visitante; parada sem lugar na arte fica fora do desenho (segue na lista). */
export const pontosDaRota = (ids, unidades) => ids.filter((id) => unidades[id]).map((id) => ({ x: unidades[id].x, y: unidades[id].y }))

/**
 * Traçado SVG que passa POR todas as paradas (Catmull-Rom em cúbicas), no viewBox 0..1000 × 0..1000·h/w do quadro.
 * Menos de 2 pontos: vazio (não há caminho).
 */
export function tracado (pontos, [largura, altura]) {
  if (pontos.length < 2) return ''
  const alt = (1000 * altura) / largura
  const P = pontos.map((p) => [p.x * 1000, p.y * alt])
  const n = (v) => Math.round(v * 10) / 10
  let d = `M${n(P[0][0])} ${n(P[0][1])}`
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i - 1] || P[i]; const b = P[i]; const c = P[i + 1]; const e = P[i + 2] || c
    d += ` C${n(b[0] + (c[0] - a[0]) / 6)} ${n(b[1] + (c[1] - a[1]) / 6)} ${n(c[0] - (e[0] - b[0]) / 6)} ${n(c[1] - (e[1] - b[1]) / 6)} ${n(c[0])} ${n(c[1])}`
  }
  return d
}

/** Um pin por casa: junta as unidades do mesmo `slug`. `id` = a unidade que representa a casa (a primeira que o filtro deixa visível). */
export function agruparPorCasa (casas) {
  const grupos = new Map()
  for (const c of casas) {
    const g = grupos.get(c.slug)
    if (!g) { grupos.set(c.slug, { ...c, ids: [c.id], enderecos: 1 }); continue }
    g.ids.push(c.id); g.enderecos += 1
    if (g.apagada && !c.apagada) { g.id = c.id; g.apagada = false }
    if (c.parada && (!g.parada || c.parada < g.parada)) g.parada = c.parada
  }
  return [...grupos.values()]
}
