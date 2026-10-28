/**
 * Olhinhos — o personagem da edição (docs/cartoon-2026-2/10 §10.5). SVG desenhado aqui, do zero:
 * duas ovais creme com contorno de nanquim e filete branco de adesivo, pupila com brilhos,
 * pálpebra e sobrancelha. Sem boca, sem corpo. Decorativo: aria-hidden, nada clicável dentro.
 *
 * expressao: 'encantado' (novidade, combo) · 'esperto' (dica, mapa, rota) · 'surpreso' ("abre em").
 * olhar: { x, y } de -1 a 1, para onde as pupilas apontam; ou 'cursor' (só no herói da Entrada).
 * lado: 'esquerda' (como desenhado) ou 'direita' (espelhado, para olhar para dentro da tela).
 *
 * O desenho e a troca de expressão moram no CSS (scw-cartoon.css, "Olhinhos"). Aqui só o que
 * precisa de relógio: a piscada (3–6 s, às vezes dupla) e o olhar seguindo o cursor. Os dois só
 * existem com prefers-reduced-motion: no-preference, lido ao vivo.
 */
import React, { useEffect, useId, useRef } from 'react'

const EXPRESSOES = ['encantado', 'esperto', 'surpreso']
// Sem `olhar`, cada expressão aponta para onde o manual desenha: o esperto olha de lado, para baixo.
const OLHAR_PADRAO = { encantado: { x: -0.2, y: 0.1 }, esperto: { x: 0.6, y: 0.4 }, surpreso: { x: 0, y: -0.1 } }
const ALCANCE = { x: 15, y: 12 } // unidades do viewBox: a pupila nunca encosta no contorno
const OLHOS = [
  { id: 'e', cx: 84, cy: 112, rx: 47, ry: 60 },
  { id: 'd', cx: 158, cy: 110, rx: 48, ry: 62 },
]
const LARGURA = 244
const ALTURA = 196

function limitar (v) { return Math.max(-1, Math.min(1, v)) }

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

  // Seguir o cursor (ou o dedo arrastando): só no herói da Entrada. O atraso vem da transição do CSS.
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
          <clipPath key={o.id} id={`${uid}-${o.id}`}><ellipse cx="0" cy="0" rx={o.rx} ry={o.ry} /></clipPath>
        ))}
      </defs>
      <g className="ct-olhinhos__corpo">
        {/* Filete branco de adesivo, por baixo das duas ovais: separa o personagem de qualquer fundo. */}
        <g className="ct-olhinhos__adesivo">
          {OLHOS.map((o) => <ellipse key={o.id} cx={o.cx} cy={o.cy} rx={o.rx} ry={o.ry} />)}
        </g>

        {/* Encantado: brilhos e traços de alegria. */}
        <g className="ct-olhinhos__extra ct-olhinhos__extra--encantado">
          <path className="ct-olhinhos__estrela" transform="translate(17 64)" d="M0-15C2-5 5-2 15 0C5 2 2 5 0 15C-2 5-5 2-15 0C-5-2-2-5 0-15Z" />
          <path className="ct-olhinhos__estrela" transform="translate(228 60) scale(.8)" d="M0-15C2-5 5-2 15 0C5 2 2 5 0 15C-2 5-5 2-15 0C-5-2-2-5 0-15Z" />
          <path className="ct-olhinhos__traco" d="M8 96h16M10 112l15-5M224 98h14M222 112l14 4" />
        </g>
        {/* Surpreso: traços de susto e a gota. */}
        <g className="ct-olhinhos__extra ct-olhinhos__extra--surpreso">
          <path className="ct-olhinhos__traco" d="M6 78l18 10M3 102h20M8 126l17-8M238 74l-18 12M241 100h-20M236 126l-17-8" />
          <path className="ct-olhinhos__gota" transform="translate(40 150)" d="M0-16C6-5 10 1 10 7A10 10 0 0 1-10 7C-10 1-6-5 0-16Z" />
        </g>

        {OLHOS.map((o) => (
          <g key={o.id} className={`ct-olho ct-olho--${o.id}`} transform={`translate(${o.cx} ${o.cy})`}>
            <g className="ct-olho__globo">
              <ellipse className="ct-olho__fundo" rx={o.rx} ry={o.ry} />
              <g clipPath={`url(#${uid}-${o.id})`}>
                <path className="ct-olho__hachura" d={`M-6 ${o.ry - 10}l7-6M6 ${o.ry - 13}l7-6M18 ${o.ry - 18}l7-6M28 ${o.ry - 25}l6-6`} />
                <g className="ct-olho__olhar">
                  <g className="ct-olho__pupila">
                    <ellipse className="ct-olho__iris" rx="19" ry="23" />
                    <circle className="ct-olho__brilho" cx="-7" cy="-9" r="6.5" />
                    <circle className="ct-olho__brilho" cx="6" cy="8" r="3" />
                    <circle className="ct-olho__brilho ct-olho__brilho--3" cx="8" cy="-11" r="2.6" />
                  </g>
                </g>
                <g className="ct-olho__palpebra">
                  <path className="ct-olho__palpebra-fundo" d="M-62-220H62V-4Q0 20-62-4Z" />
                  <path className="ct-olho__palpebra-vinco" d="M-38-22Q0-10 38-22" />
                  <path className="ct-olho__palpebra-borda" d="M-62-4Q0 20 62-4" />
                </g>
              </g>
              <ellipse className="ct-olho__contorno" rx={o.rx} ry={o.ry} />
            </g>
            <g transform={`translate(0 ${-o.ry - 15})`}>
              <path className="ct-olho__sobrancelha" d="M-32 8Q-3-31 32 1Q-1-7-32 8Z" />
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
