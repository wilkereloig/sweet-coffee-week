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
