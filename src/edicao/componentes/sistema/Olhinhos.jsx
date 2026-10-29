/**
 * Olhinhos — o personagem da edição (docs/cartoon-2026-2/10 §10.5; MANUAL-CARTOON §1.3, padrão da
 * cliente desde 29/10). SVG desenhado aqui: dois ovais creme altos e encostados, o esquerdo na frente;
 * contorno preto de pincel, mais grosso embaixo e por fora; pupila grande com dois brilhos (um oval,
 * um ponto); sobrancelhas soltas que afinam nas pontas; sombra e hachura leves na base.
 * Sem boca, gota, pálpebra, adesivo branco ou estrelinha. Decorativo: aria-hidden, nada clicável dentro.
 *
 * expressao: 'encantado' (novidade, combo) · 'curioso' (dica, mapa, rota) · 'expectativa' ("abre em").
 * olhar: { x, y } de -1 a 1, para onde as pupilas apontam (o título, a placa, a logo); ou 'cursor'.
 * lado: 'esquerda' (como desenhado) ou 'direita' (espelhado, para olhar para dentro da tela).
 *
 * O desenho e a troca de expressão moram no CSS (scw-cartoon.css, "Olhinhos"). Aqui só o que
 * precisa de relógio: a piscada (3–6 s, às vezes dupla) e o olhar seguindo o cursor. Os dois só
 * existem com prefers-reduced-motion: no-preference, lido ao vivo.
 */
import React, { useEffect, useId, useRef } from 'react'

const EXPRESSOES = ['encantado', 'curioso', 'expectativa']
// Sem `olhar`, cada expressão aponta para onde ela faz sentido: o curioso espia de lado, a expectativa olha para cima.
const OLHAR_PADRAO = { encantado: { x: 0, y: -0.2 }, curioso: { x: 0.75, y: 0.15 }, expectativa: { x: 0.2, y: -0.7 } }
const ALCANCE = { x: 16, y: 18 } // unidades do viewBox: a pupila nunca encosta no contorno
// 'd' vem antes: o olho esquerdo é desenhado por cima, na frente, como nas referências da cliente.
const OLHOS = [
  { id: 'd', cx: 170, cy: 118, rx: 50, ry: 63, giro: 6, fora: 1 },
  { id: 'e', cx: 92, cy: 124, rx: 52, ry: 66, giro: -5, fora: -1 },
]
const LARGURA = 260
const ALTURA = 210

function limitar (v) { return Math.max(-1, Math.min(1, v)) }
// Elipse como caminho (para juntar duas num anel com evenodd).
function elipse (cx, cy, rx, ry) {
  return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`
}

export function Olhinhos ({ expressao = 'encantado', olhar, lado = 'esquerda', tamanho = 200, className = '' }) {
  const exp = EXPRESSOES.includes(expressao) ? expressao : 'encantado'
  const raiz = useRef(null)
  const uid = useId().replace(/:/g, '')
  const espelho = lado === 'direita' ? -1 : 1

  // Movimento permitido? Lido ao vivo: quem liga "reduzir movimento" com a página aberta para tudo na hora.
  useEffect(() => {
    const el = raiz.current
    const mq = window.matchMedia('(prefers-reduced-motion: no-preference)')
    const marcar = () => el.setAttribute('data-movimento', mq.matches ? 'sim' : 'nao')
    marcar()
    mq.addEventListener('change', marcar)
    return () => mq.removeEventListener('change', marcar)
  }, [])

  // Olhar fixo (prop ou padrão da expressão). Com 'cursor', é só o ponto de partida.
  useEffect(() => {
    const o = olhar && olhar !== 'cursor' ? olhar : OLHAR_PADRAO[exp]
    apontar(raiz.current, limitar(o.x) * espelho, limitar(o.y))
  }, [olhar, exp, espelho])

  // Seguir o cursor (ou o dedo arrastando). O atraso vem da transição do CSS.
  useEffect(() => {
    if (olhar !== 'cursor') return undefined
    const el = raiz.current
    let quadro = 0
    let ponto = null
    const pousa = () => {
      quadro = 0
      if (el.getAttribute('data-movimento') !== 'sim' || !ponto) return
      const r = el.getBoundingClientRect()
      const x = (ponto.x - (r.left + r.width / 2)) / (window.innerWidth / 2)
      const y = (ponto.y - (r.top + r.height / 2)) / (window.innerHeight / 2)
      apontar(el, limitar(x * 1.6) * espelho, limitar(y * 1.6))
    }
    const mexe = (e) => { ponto = { x: e.clientX, y: e.clientY }; if (!quadro) quadro = requestAnimationFrame(pousa) }
    const sai = () => { ponto = null; const o = OLHAR_PADRAO[exp]; apontar(el, o.x * espelho, o.y) }
    window.addEventListener('pointermove', mexe, { passive: true })
    document.documentElement.addEventListener('pointerleave', sai)
    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('pointermove', mexe)
      document.documentElement.removeEventListener('pointerleave', sai)
    }
  }, [olhar, exp, espelho])

  // Piscada: intervalo aleatório de 3 a 6 s, às vezes dupla. Aba escondida não pisca.
  useEffect(() => {
    const el = raiz.current
    const relogios = new Set()
    const depois = (ms, f) => { const t = setTimeout(() => { relogios.delete(t); f() }, ms); relogios.add(t) }
    const pisca = () => {
      el.classList.add('ct-olhinhos--pisca')
      depois(130, () => el.classList.remove('ct-olhinhos--pisca'))
    }
    const agenda = () => depois(3000 + Math.random() * 3000, () => {
      if (el.getAttribute('data-movimento') === 'sim' && !document.hidden) {
        pisca()
        if (Math.random() < 0.3) depois(260, pisca)
      }
      agenda()
    })
    agenda()
    return () => relogios.forEach(clearTimeout)
  }, [])

  // Troca de expressão: além da interpolação do CSS, um quique no corpo (antecipação e exagero).
  const primeira = useRef(true)
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return undefined }
    const el = raiz.current
    el.classList.remove('ct-olhinhos--troca')
    void el.getBoundingClientRect() // reinicia a animação se trocar duas vezes seguidas
    el.classList.add('ct-olhinhos--troca')
    const t = setTimeout(() => el.classList.remove('ct-olhinhos--troca'), 480)
    return () => clearTimeout(t)
  }, [exp])

  const classes = ['ct-olhinhos', lado === 'direita' && 'ct-olhinhos--direita', className].filter(Boolean).join(' ')
  return (
    <svg
      ref={raiz} className={classes} data-expressao={exp} viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      width={tamanho} height={Math.round(tamanho * ALTURA / LARGURA)} aria-hidden="true" focusable="false"
    >
      <defs>
        {OLHOS.map((o) => (
          <clipPath key={o.id} id={`${uid}-${o.id}`}><ellipse rx={o.rx} ry={o.ry} /></clipPath>
        ))}
      </defs>
      <g className="ct-olhinhos__corpo">
        {/* Expectativa: traços curtos de ação nos dois cantos de cima. */}
        <path className="ct-olhinhos__traco" d="M14 44l14 12M8 70l17 2M30 22l6 16M246 40l-14 12M252 66l-17 2M230 18l-6 16" />

        {OLHOS.map((o) => (
          <g key={o.id} className={`ct-olho ct-olho--${o.id}`} transform={`translate(${o.cx} ${o.cy}) rotate(${o.giro})`}>
            <g className="ct-olho__globo">
              <g className="ct-olho__pisca">
                {/* Base um tom abaixo do creme; o creme por cima, subido, deixa a sombra só embaixo. */}
                <ellipse className="ct-olho__sombra" rx={o.rx} ry={o.ry} />
                <g clipPath={`url(#${uid}-${o.id})`}>
                  <ellipse className="ct-olho__fundo" cx={o.fora * 2} cy="-7" rx={o.rx - 3} ry={o.ry - 5} />
                  <path className="ct-olho__hachura" d={`M${-o.fora * 22} ${o.ry - 6}l${o.fora * 5}-9M${-o.fora * 10} ${o.ry - 3}l${o.fora * 5}-9M${o.fora * 2} ${o.ry - 2}l${o.fora * 5}-9M${o.fora * 14} ${o.ry - 4}l${o.fora * 5}-9`} />
                  <g className="ct-olho__olhar">
                    <g className="ct-olho__pupila">
                      <ellipse className="ct-olho__iris" rx="26" ry="31" />
                      <ellipse className="ct-olho__brilho" cx="8" cy="-12" rx="7.5" ry="10" transform="rotate(-28 8 -12)" />
                      <circle className="ct-olho__brilho" cx="-10" cy="11" r="3.6" />
                    </g>
                  </g>
                </g>
                {/* Contorno de pincel: anel entre o olho e uma elipse maior, descida e puxada para fora. */}
                <path className="ct-olho__contorno" fillRule="evenodd" d={`${elipse(o.fora * 2.5, 3.5, o.rx + 7, o.ry + 8)}${elipse(0, 0, o.rx, o.ry)}`} />
              </g>
            </g>
            <g transform={`translate(${o.fora * 4} ${-o.ry - 17})`}>
              <path className="ct-olho__sobrancelha" d="M-29 9C-19-12 13-16 30-1C14-6-13-3-29 9Z" />
            </g>
          </g>
        ))}
      </g>
    </svg>
  )
}

function apontar (el, x, y) {
  el.style.setProperty('--ox', `${(x * ALCANCE.x).toFixed(1)}px`)
  el.style.setProperty('--oy', `${(y * ALCANCE.y).toFixed(1)}px`)
}
