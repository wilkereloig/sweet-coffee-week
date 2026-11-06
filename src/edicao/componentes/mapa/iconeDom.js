/*
 * Ícone do catálogo (icones/interface → gerado/) como elemento DOM, para os pins montados à mão (pin.js, mapa real). É a MESMA conta do
 * IconeSvg (registro.jsx): desenho, grade e traço saem do catálogo, nada é desenhado aqui. Só interface (16 · 20 · 24).
 */
import INTERFACE from '../../../components/scw-icons/gerado/interface'
import { FAMILIAS } from '../../../components/scw-icons/gerado/especificacao'
import { tracoPara, canonico } from '../../../components/scw-icons/registro.jsx'

const SVG = 'http://www.w3.org/2000/svg'

export function iconeDom (nome, tamanho = 16) {
  const desenho = INTERFACE[canonico(nome)]
  if (!desenho) return null
  const f = FAMILIAS.interface
  const tr = tracoPara('interface', tamanho)
  const svg = document.createElementNS(SVG, 'svg')
  const atributos = { class: 'scw-icone', width: tamanho, height: tamanho, viewBox: `0 0 ${f.grade} ${f.grade}`, fill: 'none', stroke: 'currentColor', 'stroke-width': tr, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', focusable: 'false', 'aria-hidden': 'true', 'data-icone': canonico(nome), 'data-familia': 'interface' }
  for (const [k, v] of Object.entries(atributos)) svg.setAttribute(k, String(v))
  for (const [tag, attrs, classe] of desenho.e) {
    const el = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v))
    if (classe === 'solido') { el.setAttribute('fill', 'currentColor'); el.setAttribute('stroke', 'none') }
    if (classe === 'detalhe') el.setAttribute('stroke-width', String(+(tr * f.detalhe).toFixed(3)))
    svg.append(el)
  }
  return svg
}
