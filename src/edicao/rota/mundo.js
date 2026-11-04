/*
 * Mundo da Doçura — contas puras do mapa desenhado (docs/cartoon-2026-2/14 §14.13; tests/cartoon-mundo.test.mjs).
 * `unidades`: o mapa id → { x, y, numero, slug } de src/data/mundoEdicao.js (x/y de 0 a 1 sobre a arte; número da
 * casa = ordem do caminho do mapa, Norte → … → Ponta Negra). A rota desenhada é ESQUEMÁTICA: liga as paradas na
 * ordem do visitante, não segue rua. Quem leva até lá é o Google Maps (minhaRota.js, linksDeRota).
 */

const pelaOrdem = (unidades) => (a, b) => unidades[a].numero - unidades[b].numero || unidades[a].y - unidades[b].y

/** Linhas (unidade + casa) que têm lugar na arte, com x/y/número, na ordem do caminho — a ordem do teclado. */
export function casasNoMundo (unidades, linhas) {
  const ordem = pelaOrdem(unidades)
  return linhas.filter((l) => unidades[l.u.id]).sort((a, b) => ordem(a.u.id, b.u.id)).map((l) => ({ ...l, ...unidades[l.u.id] }))
}

/** "Ordenar pelo caminho do mapa": quem tem lugar na arte vai pela numeração; quem não tem fica no fim, como estava. */
export function ordemDoCaminho (ids, unidades) {
  return [...ids.filter((id) => unidades[id]).sort(pelaOrdem(unidades)), ...ids.filter((id) => !unidades[id])]
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
