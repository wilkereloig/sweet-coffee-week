/*
 * Câmera do Mundo da Doçura (docs/cartoon-2026-2/14 §14.13-b): a matemática de "o mapa preenche a janela e se explora por
 * arraste". Funções puras, sem DOM nem React — quem desenha (Mundo.jsx) só lê a câmera e aplica width + translate.
 *
 * Modelo: a janela mede `j = {w, h}` (px) e a arte `a = {w, h}` (px nativos, só a proporção importa). A câmera é
 * `c = {z, x, y}`: `z` = zoom RELATIVO À ESCALA QUE COBRE a janela (z = 1 é o mínimo: a arte toca as quatro bordas, sem
 * faixa vazia, e o que sobra no outro eixo fica fora da tela); `x`,`y` = canto superior esquerdo do palco dentro da janela.
 * Como o palco sempre cobre a janela, x ∈ [j.w − palco.w, 0] e y ∈ [j.h − palco.h, 0]: dá para chegar a todas as bordas
 * e nunca para além delas (sem folga: azul atrás da arte é defeito; pin sob um botão se resolve com zoom, não com faixa vazia).
 */
export const ZOOM_MIN = 1
export const ZOOM_MAX = 3 // 3× a escala de cobrir: a arte final tem 4096 px de largura e o palco não passa de ~4 mil px no desktop
export const ZOOM_PASSO = 1.5

const entre = (v, min, max) => Math.min(max, Math.max(min, v))

/** Escala (px da janela por px da arte) que cobre a janela com z = 1. */
export const escalaDeCobrir = (j, a) => Math.max(j.w / a.w, j.h / a.h)

/** Tamanho do palco, em px, para o zoom `c.z`. */
export function tamanhoDoPalco (c, j, a) {
  const s = escalaDeCobrir(j, a) * c.z
  return { w: a.w * s, h: a.h * s }
}

/** Zoom e posição dentro dos limites: a arte SEMPRE cobre a janela (nenhuma borda entra na área visível), e dá para chegar a todas as bordas. */
export function limitar (c, j, a) {
  const z = entre(c.z, ZOOM_MIN, ZOOM_MAX)
  const p = tamanhoDoPalco({ z }, j, a)
  return { z, x: entre(c.x, j.w - p.w, 0), y: entre(c.y, j.h - p.h, 0) }
}

/** Câmera de abertura: zoom mínimo, arte centrada. */
export function inicial (j, a) {
  const p = tamanhoDoPalco({ z: ZOOM_MIN }, j, a)
  return limitar({ z: ZOOM_MIN, x: (j.w - p.w) / 2, y: (j.h - p.h) / 2 }, j, a)
}

/** Arrasta (dx, dy em px da janela). */
export const panar = (c, dx, dy, j, a) => limitar({ ...c, x: c.x + dx, y: c.y + dy }, j, a)

/** Muda o zoom mantendo debaixo do ponto (fx, fy) — em px da janela — o mesmo pedaço da arte. */
export function zoomarEm (c, z, fx, fy, j, a) {
  const z2 = entre(z, ZOOM_MIN, ZOOM_MAX)
  const d1 = tamanhoDoPalco(c, j, a)
  const d2 = tamanhoDoPalco({ z: z2 }, j, a)
  const u = (fx - c.x) / d1.w
  const v = (fy - c.y) / d1.h
  return limitar({ z: z2, x: fx - u * d2.w, y: fy - v * d2.h }, j, a)
}

/** Ponto da arte (0 a 1) que está no centro da janela. */
export function pontoNoCentro (c, j, a) {
  const p = tamanhoDoPalco(c, j, a)
  return { u: (j.w / 2 - c.x) / p.w, v: (j.h / 2 - c.y) / p.h }
}

/** Leva o ponto (u, v) da arte (0 a 1) ao centro da janela, no zoom atual. */
export function centrarEm (c, u, v, j, a) {
  const p = tamanhoDoPalco(c, j, a)
  return limitar({ ...c, x: j.w / 2 - u * p.w, y: j.h / 2 - v * p.h }, j, a)
}

/** A janela mudou de tamanho (rotação, tela cheia, redimensionar): o ponto que estava no centro continua no centro. */
export function redimensionar (c, velha, nova, a) {
  const { u, v } = pontoNoCentro(c, velha, a)
  return centrarEm(c, u, v, nova, a)
}

/** Pinça: `p0` e `p1` = {d: distância entre os dedos, x, y: ponto médio} no começo e agora; `c0` = a câmera no começo. */
export function pinca (c0, p0, p1, j, a) {
  const z2 = entre(c0.z * (p1.d / Math.max(p0.d, 1)), ZOOM_MIN, ZOOM_MAX)
  const d1 = tamanhoDoPalco(c0, j, a)
  const d2 = tamanhoDoPalco({ z: z2 }, j, a)
  const u = (p0.x - c0.x) / d1.w
  const v = (p0.y - c0.y) / d1.h
  return limitar({ z: z2, x: p1.x - u * d2.w, y: p1.y - v * d2.h }, j, a)
}

/** Entre duas câmeras (t de 0 a 1): o zoom varia em escala (percepção linear), a posição em linha reta. */
export function entreCameras (c0, c1, t) {
  return { z: c0.z * (c1.z / c0.z) ** t, x: c0.x + (c1.x - c0.x) * t, y: c0.y + (c1.y - c0.y) * t }
}

/** O mundo "cabe" sem recortar? (só quando a janela tem a proporção da arte). */
export const folgaNoEixo = (j, a) => (j.w / a.w > j.h / a.h ? 'vertical' : 'horizontal')
