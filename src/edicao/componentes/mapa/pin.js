import { IMAGENS_ESTADO } from '../../caca/mapa/imagens.js'

/*
 * O pin da casa no mapa real (Google Maps e MapLibre): O MESMO desenho do mapa ilustrado (Mundo.jsx) — disco com a logo,
 * ponta embaixo, número do impresso no canto e selo de estado no aro. Usa as mesmas classes `ct-mundo__*` por dentro
 * (11-mundo.css), então uma mudança no pin vale nos dois mapas. A logo é a desenhada: P&B enquanto a casa não tem
 * carimbo, colorida depois (quem escolhe é `logoDoPin`, em cartoon/paginas/mapa/LogoDoPin.jsx, e o index entrega
 * pronto aos dois mapas). O <span class="ct-pin"> também carrega o anel tracejado (ponto aproximado) e o selo de
 * quero ir / já fui, pelas classes do botão (05-mapa-rota.css).
 *
 * `pin`: { logo (src ou null), inicial, numero, estado ('nao-visitada' | 'pendente' | 'conquistada' | null) }.
 */
export function pinDaCasa (pin) {
  const caixa = document.createElement('span')
  caixa.className = 'ct-pin'
  const ponta = document.createElement('span')
  ponta.className = 'ct-mundo__ponta'
  const disco = document.createElement('span')
  disco.className = 'ct-mundo__disco'
  const num = document.createElement('span')
  num.className = 'ct-mundo__num'
  caixa.append(ponta, disco, num)
  atualizarPin(caixa, pin)
  return caixa
}

/** Põe no pin o que mudou (carimbo novo, outro estado) sem refazer o marcador — os dois mapas chamam a cada render. */
export function atualizarPin (caixa, pin) {
  const disco = caixa.querySelector('.ct-mundo__disco')
  const num = caixa.querySelector('.ct-mundo__num')
  if (pin.estado) caixa.dataset.estado = pin.estado
  else delete caixa.dataset.estado
  const atual = disco.firstElementChild
  if (pin.logo) {
    if (atual?.tagName === 'IMG') { if (atual.getAttribute('src') !== pin.logo) atual.src = pin.logo }
    else {
      const img = document.createElement('img')
      Object.assign(img, { src: pin.logo, alt: '', decoding: 'async', draggable: false })
      disco.replaceChildren(img)
    }
  } else if (atual?.textContent !== pin.inicial || atual?.tagName === 'IMG') {
    const letra = document.createElement('span')
    letra.className = 'ct-mundo__inicial'
    letra.textContent = pin.inicial
    disco.replaceChildren(letra)
  }
  num.textContent = pin.numero ?? ''
  num.hidden = pin.numero === '' || pin.numero == null
  const selo = caixa.querySelector('.ct-mundo__estado')
  const arte = pin.estado ? IMAGENS_ESTADO[pin.estado] : null
  if (!arte) { selo?.remove(); return }
  if (selo) { const i = selo.firstElementChild; if (i.getAttribute('src') !== arte.src) i.src = arte.src; return }
  const novo = document.createElement('span')
  novo.className = 'ct-mundo__estado'
  const img = document.createElement('img')
  Object.assign(img, { src: arte.src, width: arte.largura, height: arte.altura, alt: '', draggable: false })
  novo.append(img)
  caixa.append(novo)
}

/*
 * O marcador do Sicredi (patrocinador, Caça aos Carimbos): placa branca de cantos retos com a marca oficial e a tarja
 * "Patrocinador", de outra forma que o pin das casas (cabeça arredondada com a logo colorida). Não é casa e não conta
 * carimbo. `pin`: { src, rotulo } — a marca (arquivo oficial) e o texto da tarja entram de fora, nada fica escrito aqui.
 */
export function pinSicredi (pin) {
  const caixa = document.createElement('span')
  caixa.className = 'ct-sicredi-pin'
  const placa = document.createElement('span')
  placa.className = 'ct-sicredi-pin__placa'
  const img = document.createElement('img')
  Object.assign(img, { src: pin.src, alt: '', height: 22, decoding: 'async' })
  const tarja = document.createElement('span')
  tarja.className = 'ct-sicredi-pin__tarja'
  tarja.textContent = pin.rotulo
  placa.append(img, tarja)
  const ponta = document.createElement('span')
  ponta.className = 'ct-sicredi-pin__ponta'
  caixa.append(placa, ponta)
  return caixa
}

/*
 * AFASTAMENTO (afastar.js): o pin que colide é só DESLOCADO NA TELA, por --dx/--dy (a propriedade `translate` do
 * 11-mundo.css/05-mapa-rota.css); a coordenada do marcador não muda. O fio liga a ponta do pin ao ponto verdadeiro, que ganha
 * uma bolinha: é um marcador à parte, preso à coordenada real, sem escala nem hover, então não sai do lugar ao ampliar ou arrastar.
 * Os dois mapas reais usam estas quatro peças.
 */
const SVG = 'http://www.w3.org/2000/svg'
const tracos = (nome, atributos) => { const e = document.createElementNS(SVG, nome); for (const [k, v] of Object.entries(atributos)) e.setAttribute(k, v); return e }

/** O fio + a bolinha do ponto verdadeiro: caixa de 0×0 sobre o ponto, o desenho vaza para fora (overflow visível). */
export function fioDoPin () {
  const caixa = document.createElement('span')
  caixa.className = 'ct-fio'
  caixa.setAttribute('aria-hidden', 'true')
  caixa.hidden = true
  const svg = tracos('svg', { width: 1, height: 1, viewBox: '0 0 1 1', overflow: 'visible' })
  svg.append(
    tracos('line', { class: 'ct-fio__base', x1: 0, y1: 0, x2: 0, y2: 0 }),
    tracos('line', { class: 'ct-fio__linha', x1: 0, y1: 0, x2: 0, y2: 0 }),
    tracos('circle', { class: 'ct-fio__ponto', cx: 0, cy: 0, r: 4.5 }),
  )
  caixa.append(svg)
  return caixa
}

/** Aponta o fio para o pin deslocado (d = {dx, dy} da ponta); sem deslocamento, o fio some. */
export function ajustarFio (fio, d) {
  const move = !!d && (Math.abs(d.dx) > 0.5 || Math.abs(d.dy) > 0.5)
  fio.hidden = !move
  if (!move) return
  for (const l of fio.querySelectorAll('line')) { l.setAttribute('x2', d.dx.toFixed(1)); l.setAttribute('y2', d.dy.toFixed(1)) }
}

/** Põe o deslocamento no marcador e esconde quem virou parte de um selo de grupo. */
export function aplicarAfastamento (plano, pontos, { elemento, fio }) {
  const agrupados = new Set(plano.grupos.flatMap((g) => g.ids))
  for (const p of pontos) {
    const el = elemento(p.id)
    const d = plano.desloc.get(p.id)
    if (el) {
      el.style.setProperty('--dx', `${(d?.dx ?? 0).toFixed(1)}px`)
      el.style.setProperty('--dy', `${(d?.dy ?? 0).toFixed(1)}px`)
      el.classList.toggle('is-agrupado', agrupados.has(p.id))
    }
    const f = fio(p.id)
    if (f) ajustarFio(f, agrupados.has(p.id) ? null : d)
  }
}

/** O selo de contagem de um grupo grande (zoom longe): botão de 44 px; quem chama liga o clique (aproximar). */
export function seloDoGrupo (n, nome) {
  const botao = document.createElement('button')
  botao.type = 'button'
  botao.className = 'ct-selo-grupo'
  botao.setAttribute('aria-label', nome)
  const num = document.createElement('span')
  num.className = 'ct-selo-grupo__num'
  num.textContent = String(n)
  num.setAttribute('aria-hidden', 'true')
  botao.append(num)
  return botao
}
