/*
 * Agrupamento de pins próximos no mapa real (05/11/2026, pedido do Wilker: "melhorar todos os pins").
 * Função pura, usada pelos dois provedores (Google e MapLibre): pins que se cobririam na tela viram UM círculo com o número de
 * casas; ao tocar, o mapa aproxima até separá-los. Sem biblioteca: a conta é em pixels do mapa (Web Mercator) no zoom atual.
 *
 *   · só as casas entram; o Sicredi (patrocinador) e a casa escolhida ficam sempre soltos;
 *   · de perto (zoom ≥ ZOOM_SEM_GRUPO) nada é agrupado: duas unidades no mesmo prédio precisam aparecer;
 *   · o tamanho da caixa é o do pin na tela (maior de perto, menor de longe, como em 16-mapa-tela.css).
 */

/** A partir deste zoom os pins nunca se agrupam (rua a rua). */
export const ZOOM_SEM_GRUPO = 16

/** Caixa do pin na tela, em px: cheia de perto, reduzida (escala .72) de longe. */
export const CAIXA_PERTO = { w: 104, h: 66 }
export const CAIXA_LONGE = { w: 76, h: 48 }

/**
 * Pixel do mundo (Web Mercator) de { lat, lng } no `zoom`. `base` = lado do mundo no zoom 0: 256 no Google, 512 no MapLibre.
 */
export function paraPixel ({ lat, lng }, zoom, base = 256) {
  const escala = base * 2 ** zoom
  const s = Math.sin((Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180)
  return { x: ((lng + 180) / 360) * escala, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * escala }
}

/**
 * Grupos de 2 ou mais casas que se cobririam. `pontos`: { id, lat, lng, sicredi? }. `fixos`: ids que não entram em grupo
 * (a casa escolhida). Devolve [{ ids, membros, lat, lng }]; vazio com zoom inválido ou de perto.
 */
export function agruparPontos (pontos = [], { zoom, base = 256, zoomPerto = 13, fixos = [] } = {}) {
  if (!Number.isFinite(zoom) || zoom >= ZOOM_SEM_GRUPO) return []
  const caixa = zoom < zoomPerto ? CAIXA_LONGE : CAIXA_PERTO
  const fixo = new Set(fixos.filter(Boolean))
  const grupos = []
  for (const p of pontos) {
    if (p.sicredi || fixo.has(p.id) || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue
    const px = paraPixel(p, zoom, base)
    const g = grupos.find((x) => Math.abs(x.x - px.x) < caixa.w && Math.abs(x.y - px.y) < caixa.h)
    if (g) {
      g.membros.push(p)
      g.somaX += px.x; g.somaY += px.y; g.somaLat += p.lat; g.somaLng += p.lng
      g.x = g.somaX / g.membros.length; g.y = g.somaY / g.membros.length
    } else {
      grupos.push({ membros: [p], x: px.x, y: px.y, somaX: px.x, somaY: px.y, somaLat: p.lat, somaLng: p.lng })
    }
  }
  return grupos.filter((g) => g.membros.length > 1)
    .map((g) => ({ ids: g.membros.map((p) => p.id), membros: g.membros, lat: g.somaLat / g.membros.length, lng: g.somaLng / g.membros.length }))
}
