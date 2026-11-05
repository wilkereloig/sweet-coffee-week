/*
 * O pin da casa no mapa (lista 13, M1), igual no Google Maps e no MapLibre: placa com a logo desenhada colorida
 * da casa (na proporção dela, até 2:1) e a ponta embaixo, que toca o lugar. O <span class="ct-pin"> também carrega o anel tracejado
 * (ponto aproximado) e o selo de quero ir / já fui, pelas classes do botão (scw-cartoon: 05-mapa-rota.css).
 */
export function pinDaCasa (pin) {
  const caixa = document.createElement('span')
  caixa.className = 'ct-pin'
  const cabeca = document.createElement('span')
  cabeca.className = 'ct-pin__cabeca'
  const img = document.createElement('img')
  Object.assign(img, { src: pin.src, alt: '', height: 44, decoding: 'async' })
  cabeca.append(img)
  const ponta = document.createElement('span')
  ponta.className = 'ct-pin__ponta'
  caixa.append(cabeca, ponta)
  return caixa
}

/*
 * O círculo que reúne casas próximas demais para caber lado a lado (agrupar.js): o número de casas e nada mais. É um botão
 * de 52 px (alvo de toque); `rotulo` é o nome acessível e `aoClicar` aproxima o mapa até separar as casas.
 */
export function elementoDoGrupo (quantas, rotulo, aoClicar) {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'ct-grupo'
  const n = document.createElement('span')
  n.className = 'ct-grupo__n'
  n.textContent = String(quantas)
  el.append(n)
  el.setAttribute('aria-label', rotulo)
  el.addEventListener('click', aoClicar)
  return el
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
