/*
 * Afastar pins que se cobrem — função PURA (sem DOM), usada pelos três mapas: o real (Google e MapLibre) e o ilustrado.
 * Entra a posição de cada pin em PIXELS DE TELA (a ponta do pin, o ponto verdadeiro) e o tamanho da caixa dele; sai o
 * deslocamento (dx, dy) de cada pin que colide. O deslocamento é só VISUAL: o pin continua preso ao ponto verdadeiro por um
 * fio, que quem desenha liga de (dx, dy) até (0, 0).
 *
 * REGRAS
 *  · Colide = as caixas se tocam (com `folga` de respiro). Grupos se formam por contágio: A cobre B, B cobre C → um grupo.
 *  · Grupo de 2 a `limite` pins: cada pin vai para um lugar de um anel em volta do grupo, e nenhum corpo cobre o ponto verdadeiro
 *    de outro (o fio precisa terminar num ponto visível). O pin vai para o lugar mais perto do seu ponto, sem cruzar fios.
 *  · Depois do afastamento um pin pode passar a cobrir outro de fora: os grupos se juntam e o desenho é refeito.
 *  · Grupo maior que `limite` (zoom longe): ninguém é afastado; sai em `grupos` para virar um selo "+N", que ao tocar aproxima. O selo é uma
 *    caixa de 48 px no centro do grupo: pin ou outro selo que ele cobriria entra no grupo (nada fica debaixo de um selo).
 *    Com `limite: Infinity` (zoom perto) nunca agrupa: todo mundo é afastado.
 *  · Estável: a ordem vem do `id`, nunca da ordem da lista; mesmos pontos e mesmo zoom → mesmo desenho. Quem chama recalcula
 *    só quando o zoom assenta, não a cada arrasto (o arrasto não muda a posição relativa dos pins).
 * itens: [{ id, x, y, w, h, ax? }] — (x, y) = ponta do pin; a caixa fica ACIMA da ponta, `ax` (0 a 1, padrão .5) é onde a ponta cai na largura.
 * Retorna { desloc: Map(id → {dx, dy}), grupos: [{ ids, x, y }] }. Pin que não colide não entra em `desloc`.
 */

export const LIMITE_GRUPO = 6
const FOLGA = 2 // px: separação mínima para o par NÃO contar como colisão
const ESPACO = 8 // px: respiro entre os pins no anel
const VOLTAS_MAX = 12
const SELO = 48 // px: o selo de grupo (disco de 44 px + o contorno)

/** Projeção Web Mercator para pixels de mundo no zoom dado. `tile`: 256 no Google, 512 no MapLibre. Só as diferenças importam. */
export function projetar (lat, lng, zoom, tile = 256) {
  const s = tile * 2 ** zoom
  const sen = Math.sin((Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180)
  return { x: ((lng + 180) / 360) * s, y: (0.5 - Math.log((1 + sen) / (1 - sen)) / (4 * Math.PI)) * s }
}

/** O inverso de `projetar`: pixels de mundo no zoom dado → { lat, lng }. */
export function desprojetar (x, y, zoom, tile = 256) {
  const s = tile * 2 ** zoom
  return { lat: (Math.atan(Math.sinh(Math.PI - (2 * Math.PI * y) / s)) * 180) / Math.PI, lng: (x / s) * 360 - 180 }
}

const caixa = (i, dx = 0, dy = 0) => {
  const esq = i.x + dx - (i.ax ?? 0.5) * i.w
  const base = i.y + dy
  return { e: esq, d: esq + i.w, t: base - i.h, b: base }
}
const batem = (a, b, folga = FOLGA) => a.e < b.d + folga && b.e < a.d + folga && a.t < b.b + folga && b.t < a.b + folga
const contem = (c, px, py, margem = 3) => px > c.e - margem && px < c.d + margem && py > c.t - margem && py < c.b + margem
const porId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** Desenho de um grupo (2..limite): onde fica a PONTA de cada pin. Devolve Map(id → {dx, dy}). */
function anel (membros) {
  const k = membros.length
  const cx = membros.reduce((s, m) => s + m.x, 0) / k
  const cy = membros.reduce((s, m) => s + m.y, 0) / k
  const w = Math.max(...membros.map((m) => m.w))
  const h = Math.max(...membros.map((m) => m.h))
  // O anel é em volta do centro do corpo de um pin parado no centro do grupo; a ponta de cada pin fica meia altura abaixo do centro.
  const ccy = cy - h / 2
  const angulo = (m) => Math.atan2(m.y - cy, m.x - cx)
  const ordem = [...membros].sort((a, b) => angulo(a) - angulo(b) || porId(a, b))
  const passo = (Math.PI * 2) / k
  const inicios = k === 2 ? [Math.PI] : [-Math.PI / 2, -Math.PI / 2 + passo / 4, -Math.PI / 2 + passo / 2, -Math.PI / 2 + (passo * 3) / 4]
  const gabarito = { w: w + ESPACO, h: h + ESPACO }
  // O menor raio em que nenhum par de corpos se toca (a caixa de cada lugar tem o tamanho do maior pin do grupo).
  const lugaresDe = (inicio, raio) => Array.from({ length: k }, (_, j) => {
    const a = inicio + passo * j
    return { cx: cx + raio * Math.cos(a), cy: ccy + raio * Math.sin(a) }
  })
  const livres = (lugares) => lugares.every((p, i) => lugares.every((q, j) => j <= i || Math.abs(p.cx - q.cx) >= gabarito.w || Math.abs(p.cy - q.cy) >= gabarito.h))
  let escolha = null
  for (let raio = Math.max(24, (w + ESPACO) / 2); (raio < 600 || !escolha) && !escolha?.limpo; raio += 2) { // sem teto enquanto não houver NENHUM arranjo: grupo grande de pins largos precisa de raio maior, e sair sem escolha quebrava o mapa
    for (const inicio of inicios) {
      const lugares = lugaresDe(inicio, raio)
      if (!livres(lugares)) continue
      for (let r = 0; r < k; r++) { // gira a distribuição: fica a de fios mais curtos (ambas seguem a ordem angular, então não cruzam)
        let soma = 0; let cobre = 0
        const pontas = ordem.map((m, j) => {
          const l = lugares[(j + r) % k]
          const px = l.cx + ((m.ax ?? 0.5) - 0.5) * m.w
          const py = l.cy + m.h / 2
          soma += Math.hypot(px - m.x, py - m.y)
          return { m, px, py, corpo: caixa({ ...m, x: px, y: py }) }
        })
        for (const p of pontas) for (const o of pontas) if (p !== o && contem(p.corpo, o.m.x, o.m.y)) cobre++
        const melhor = !escolha || cobre < escolha.cobre || (cobre === escolha.cobre && soma < escolha.soma - 1e-6)
        if (melhor) escolha = { cobre, soma, pontas, limpo: cobre === 0 }
      }
    }
  }
  return new Map(escolha.pontas.map(({ m, px, py }) => [m.id, { dx: px - m.x, dy: py - m.y }]))
}

export function afastarPins (itens, { folga = FOLGA, limite = LIMITE_GRUPO } = {}) {
  const lista = itens.filter((i) => Number.isFinite(i.x) && Number.isFinite(i.y)).sort(porId)
  const n = lista.length
  const pai = lista.map((_, i) => i)
  const raiz = (i) => { while (pai[i] !== i) { pai[i] = pai[pai[i]]; i = pai[i] } return i }
  const unir = (a, b) => { const ra = raiz(a); const rb = raiz(b); if (ra !== rb) pai[Math.max(ra, rb)] = Math.min(ra, rb) }
  const originais = lista.map((i) => caixa(i))
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (batem(originais[a], originais[b], folga)) unir(a, b)

  let desloc = new Map()
  let grande = []
  for (let volta = 0; volta < VOLTAS_MAX; volta++) {
    const grupos = new Map()
    lista.forEach((_, i) => { const r = raiz(i); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(i) })
    desloc = new Map(); grande = []
    const selos = [] // a caixa de cada selo de grupo: ele também não pode cobrir pin nenhum nem outro selo
    const corpoDe = new Map() // índice → caixa onde o pin está desenhado agora
    for (const idx of grupos.values()) {
      if (idx.length === 1) { corpoDe.set(idx[0], originais[idx[0]]); continue }
      const membros = idx.map((i) => lista[i])
      if (idx.length > limite) {
        const g = { ids: membros.map((m) => m.id), x: membros.reduce((s, m) => s + m.x, 0) / idx.length, y: membros.reduce((s, m) => s + m.y, 0) / idx.length }
        grande.push(g)
        selos.push({ idx, caixa: { e: g.x - SELO / 2, d: g.x + SELO / 2, t: g.y - SELO / 2, b: g.y + SELO / 2 } })
        for (const i of idx) corpoDe.set(i, originais[i])
        continue
      }
      const d = anel(membros)
      for (const i of idx) { const o = d.get(lista[i].id); desloc.set(lista[i].id, o); corpoDe.set(i, caixa(lista[i], o.dx, o.dy)) }
    }
    // Um pin afastado pode ter caído em cima de outro grupo: junta os dois e refaz.
    let juntou = false
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        if (raiz(a) !== raiz(b) && batem(corpoDe.get(a), corpoDe.get(b), folga)) { unir(a, b); juntou = true }
      }
    }
    for (const sl of selos) {
      for (let i = 0; i < n; i++) if (!sl.idx.includes(i) && batem(sl.caixa, corpoDe.get(i), 0)) { unir(i, sl.idx[0]); juntou = true }
      for (const o of selos) if (o !== sl && o.idx[0] < sl.idx[0] && batem(sl.caixa, o.caixa, 0)) { unir(o.idx[0], sl.idx[0]); juntou = true }
    }
    if (!juntou) break
  }
  return { desloc, grupos: grande }
}

// ---- Mapa real: do ponto geográfico ao deslocamento em pixels ----
// Tamanho de cada pin em px a escala cheia, com folga para o número e o selo de estado que saem do aro. É o desenho de
// 11-mundo.css (.ct-pin: --d 54px + cauda) e do Sicredi (.ct-sicredi-pin); tests/cartoon-afastar.test.mjs confere a ligação.
export const CAIXA_CASA = { w: 62, h: 74 }
export const CAIXA_SICREDI = { w: 112, h: 56 }
// Apoiadores (caca/mapa/apoio.js): placa larga (.ct-sicredi-pin--largo) e, no ponto de retirada, o selo "Retirada de vouchers" acima dela.
export const CAIXA_APOIO = { w: 176, h: 56 }
export const CAIXA_RETIRADA = { w: 184, h: 98 }
export const caixaDoPonto = (p) => (p.retirada ? CAIXA_RETIRADA : p.largo ? CAIXA_APOIO : p.sicredi ? CAIXA_SICREDI : CAIXA_CASA)
export const LIMITE_GRUPO_PERTO = 12 // de perto (zoom ≥ zoomPerto) cabem mais pins no anel antes de virar selo
export const ZOOM_SEM_SELO = 16 // daqui para cima nunca há selo: no mesmo endereço, todo pin é afastado
export const ESCALA_LONGE = 0.55 // 16-mapa-tela.css: de longe o pin encolhe a esta fração, em volta da ponta

/**
 * Plano de afastamento para os pontos do mapa real no zoom dado.
 * pontos: [{ id, lat, lng, sicredi? }] · zoom/tile: do provedor (Google 256, MapLibre 512) · zoomPerto: abaixo dele o mapa é "longe".
 * Grupo grande demais vira selo: mais de LIMITE_GRUPO pins de longe, mais de LIMITE_GRUPO_PERTO de perto, e nunca a partir de ZOOM_SEM_SELO
 * (quem está no mesmo endereço sempre aparece). O pin escolhido nunca some num selo.
 */
export function planejarNoMapa (pontos, { zoom, tile = 256, zoomPerto, selecionada = '' }) {
  const longe = zoom < zoomPerto
  const escala = longe ? ESCALA_LONGE : 1
  const itens = pontos.map((p) => {
    const { x, y } = projetar(p.lat, p.lng, zoom, tile)
    const c = caixaDoPonto(p)
    return { id: p.id, x, y, w: c.w * escala, h: c.h * escala, apoio: !!p.apoio }
  })
  // Apoiadores (placa larga, às vezes com o selo de retirada) ficam FORA do agrupamento: entrando nele, a placa encostava em dois
  // grupos de casas e os emendava num selo único da cidade inteira (10/11/2026: "45"), e o ponto de retirada sumia. Primeiro as
  // casas e o Sicredi, como sempre; depois cada apoiador vai para o lugar livre mais perto do próprio ponto (com fio, se sair dele).
  const casas = itens.filter((i) => !i.apoio)
  const limite = longe ? LIMITE_GRUPO : zoom < ZOOM_SEM_SELO ? LIMITE_GRUPO_PERTO : Infinity
  let plano = afastarPins(casas, { limite })
  if (selecionada && plano.grupos.some((g) => g.ids.includes(selecionada))) plano = afastarPins(casas, { limite: Infinity })
  return encaixarFixos(plano, casas, itens.filter((i) => i.apoio))
}

/**
 * Põe cada pin de `fixos` (sem grupo, sempre à vista) no lugar livre mais perto do seu ponto, sem cobrir pin desenhado, selo de
 * grupo nem outro fixo. Procura em espiral (anéis de 8 px, 16 direções); fica onde está se já não bate em nada. Estável (ordem do id).
 */
export function encaixarFixos (plano, casas, fixos) {
  if (!fixos.length) return plano
  const agrupados = new Set(plano.grupos.flatMap((g) => g.ids))
  const obstaculos = [
    ...casas.filter((i) => !agrupados.has(i.id)).map((i) => { const d = plano.desloc.get(i.id); return caixa(i, d?.dx || 0, d?.dy || 0) }),
    ...plano.grupos.map((g) => ({ e: g.x - SELO / 2, d: g.x + SELO / 2, t: g.y - SELO / 2, b: g.y + SELO / 2 })),
  ]
  const desloc = new Map(plano.desloc)
  for (const f of [...fixos].sort(porId)) {
    let escolha = null
    for (let raio = 0; raio <= 480 && !escolha; raio += 8) {
      const passos = raio === 0 ? 1 : 16
      for (let j = 0; j < passos && !escolha; j++) {
        const a = -Math.PI / 2 + (Math.PI * 2 * j) / passos // começa por CIMA: o fio desce até o ponto
        const dx = raio * Math.cos(a); const dy = raio * Math.sin(a)
        const c = caixa(f, dx, dy)
        if (!obstaculos.some((o) => batem(c, o)) && !contemAlgum(c, casas)) escolha = { dx, dy, c }
      }
    }
    if (!escolha) escolha = { dx: 0, dy: 0, c: caixa(f) } // sem lugar livre num raio de 480 px: fica no ponto
    if (escolha.dx || escolha.dy) desloc.set(f.id, { dx: escolha.dx, dy: escolha.dy })
    obstaculos.push(escolha.c)
  }
  return { desloc, grupos: plano.grupos }
}
// O corpo do fixo também não pode cobrir o PONTO verdadeiro de uma casa (o fio dela terminaria escondido).
const contemAlgum = (c, casas) => casas.some((i) => contem(c, i.x, i.y))
