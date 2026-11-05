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
