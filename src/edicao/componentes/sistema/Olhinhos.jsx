/**
 * Olhinhos — o personagem da edição (docs/cartoon-2026-2/10 §10.5; MANUAL-CARTOON §1.3). SVG desenhado
 * aqui como um personagem de verdade: os dois olhos ficam sobre uma "cabeça" invisível (uma esfera), então
 * o mesmo desenho gira de frente a perfil, inclina para cima e para baixo, pisca, espia de trás de uma borda
 * e troca de expressão. A folha do personagem (/cartoon/sistema) mostra todas as poses.
 *
 * Proporções tiradas da prévia aprovada (05_SITE/06_OLHINHOS_ESPIANDO): olho com largura de 0,75 da altura,
 * os dois encostados, o esquerdo na frente; pupila com 62% da altura do olho e espaço creme em volta;
 * contorno de pincel quase uniforme; sombra lisa em meia-lua embaixo, sem hachura. Sem boca, gota,
 * pálpebra com vinco, adesivo branco ou estrelinha. Decorativo: aria-hidden, nada clicável dentro.
 *
 * expressao: 'neutro' · 'encantado' (novidade, combo) · 'curioso' (dica, mapa, rota) · 'expectativa'
 * ("abre em") · 'surpreso' · 'feliz'.
 * olhar: { x, y } de -1 a 1, para onde as pupilas apontam; ou 'cursor'.
 * pose: ajuste fino por cima da expressão (virar, inclinar, abertura, pupila, sob, tracos, pulo, espiar…).
 * lado: 'esquerda' (como desenhado) ou 'direita' (espelhado). guias: linhas de construção (folha).
 *
 * A pose vira transform inline (o CSS interpola a troca); a piscada e o olhar seguindo o cursor ficam em
 * camadas próprias, ligadas por classe e por variável. Os dois só existem com prefers-reduced-motion:
 * no-preference, lido ao vivo.
 */
import React, { useEffect, useId, useRef } from 'react'

const LARGURA = 280
const ALTURA = 220
const CENTRO = { x: 140, y: 118 }
const RAIO = 90 // a esfera da cabeça: o giro leva os olhos sobre ela
const GIRO_MAX = 70 // graus no perfil; 90 esconderia o olho de trás por inteiro
const ALCANCE = { x: 14, y: 16 } // unidades do viewBox: a pupila nunca encosta no contorno
const BORDA_Y = 150 // altura da borda de onde ele espia
// 'e' tem ângulo negativo (fica à esquerda); no empate de profundidade ele é desenhado por último, na frente.
const OLHOS = [
  { id: 'e', ang: -28, dy: -4, rx: 50, ry: 66, giro: -4 },
  { id: 'd', ang: 28, dy: 5, rx: 46, ry: 64, giro: 4 },
]

// sob: [dx, dy, giro] de cada sobrancelha; globo: [escala x, escala y]; tracos: onde saem os traços de ação.
const BASE = {
  virar: 0, inclinar: 0, abertura: 1, ancora: 'centro', pupila: 1, pulo: 0, espiar: null, tracos: null,
  globo: { e: [1, 1], d: [1, 1] }, sob: { e: [0, 0, 0], d: [0, 0, 0] },
}
const EXPRESSOES = {
  neutro: {},
  encantado: { pupila: 1.1, sob: { e: [0, -7, -5], d: [0, -7, 5] } },
  curioso: { pupila: 0.95, globo: { e: [1, 1], d: [1, 0.88] }, sob: { e: [-2, -12, -9], d: [0, 6, -7] }, tracos: 'lado' },
  expectativa: { pupila: 0.88, globo: { e: [1.05, 1.05], d: [1.05, 1.05] }, sob: { e: [-2, -14, -6], d: [2, -14, 6] }, tracos: 'cima' },
  surpreso: { pupila: 0.7, globo: { e: [1.09, 1.09], d: [1.09, 1.09] }, sob: { e: [-3, -20, -10], d: [3, -20, 10] }, tracos: 'lados' },
  feliz: { abertura: 0.55, ancora: 'cima', sob: { e: [0, -8, -8], d: [0, -8, 8] } },
}
// Sem `olhar`, cada expressão aponta para onde ela faz sentido.
const OLHAR_PADRAO = {
  neutro: { x: 0, y: 0 }, encantado: { x: 0, y: -0.25 }, curioso: { x: 0.8, y: 0.1 },
  expectativa: { x: 0.15, y: -0.7 }, surpreso: { x: 0, y: 0 }, feliz: { x: 0, y: -0.1 },
}
const TRACOS = {
  lado: 'M262 46l-16 12M268 70l-17 5',
  lados: 'M18 46l16 12M12 70l17 5M262 46l-16 12M268 70l-17 5',
  cima: 'M126 12l5 13M140 8v15M154 12l-5 13',
}

function limitar (v) { return Math.max(-1, Math.min(1, v)) }
// Elipse como caminho (para juntar duas num anel com evenodd).
function elipse (cx, cy, rx, ry) {
  return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`
}
const tf = (x, y, giro, sx, sy) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${giro.toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`

// Pose resolvida → posição, escala e profundidade de cada olho e sobrancelha.
function montar (p) {
  const psi = p.virar * GIRO_MAX
  return OLHOS.map((o) => {
    const a = (o.ang + psi) * Math.PI / 180
    const prof = Math.cos(a)
    const frente = Math.max(prof, 0.2) // o olho de trás nunca some de todo (trapaça clássica de desenho)
    let x = CENTRO.x + RAIO * Math.sin(a)
    if (prof < 0.35) x += Math.sign(Math.sin(a)) * (0.35 - prof) * 40 // ...e espia por fora do da frente
    const y = CENTRO.y + o.dy + p.inclinar * 10
    const sy = 1 - 0.15 * Math.abs(p.inclinar)
    const [gx, gy] = p.globo[o.id]
    const ab = typeof p.abertura === 'number' ? p.abertura : p.abertura[o.id]
    const ancora = p.ancora === 'cima' ? -1 : p.ancora === 'baixo' ? 1 : 0
    const [bx, by, bg] = p.sob[o.id]
    const espelho = o.id === 'd' ? -1 : 1
    return {
      o,
      prof: prof + (o.id === 'e' ? 0.001 : 0),
      olho: tf(x, y, o.giro, frente * gx, sy * gy),
      abre: `translate(0px, ${(ancora * o.ry * (1 - ab)).toFixed(1)}px) scale(1, ${ab.toFixed(3)})`,
      fechado: ab <= 0.15, // fechado de vez vira um traço curvo; achatado até o fim sobraria um fio creme
      pupila: tf(Math.sin(psi * Math.PI / 180) * o.rx * 0.45, p.inclinar * o.ry * 0.35, 0, p.pupila, p.pupila),
      sob: tf(x + Math.sin(psi * Math.PI / 180) * 8 + bx, y - o.ry * sy * gy - 18 + p.inclinar * 6 + by, bg, espelho * frente, 1),
    }
  }).sort((m, n) => m.prof - n.prof) // o de trás primeiro; o da frente por cima
}

export function Olhinhos ({ expressao = 'encantado', olhar, pose, lado = 'esquerda', tamanho = 200, guias = false, piscar = true, className = '' }) {
  const exp = EXPRESSOES[expressao] ? expressao : 'encantado'
  const p = { ...BASE, ...EXPRESSOES[exp], ...pose }
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
  const ox = olhar && olhar !== 'cursor' ? olhar.x : OLHAR_PADRAO[exp].x
  const oy = olhar && olhar !== 'cursor' ? olhar.y : OLHAR_PADRAO[exp].y
  useEffect(() => {
    apontar(raiz.current, limitar(ox) * espelho, limitar(oy))
  }, [ox, oy, espelho])

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
    if (!piscar) return undefined
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
  }, [piscar])

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

  const partes = montar(p)
  const espia = p.espiar != null
  const classes = ['ct-olhinhos', lado === 'direita' && 'ct-olhinhos--direita', espia && 'ct-olhinhos--espia', className].filter(Boolean).join(' ')
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
      <g className="ct-olhinhos__corpo" style={{ transform: `translate(0px, ${(p.pulo + (espia ? p.espiar * 170 : 0)).toFixed(1)}px)` }}>
        <g className="ct-olhinhos__quique">
          {p.tracos && <path className="ct-olhinhos__traco" d={TRACOS[p.tracos]} />}
          {partes.map(({ o, olho, abre, fechado, pupila }) => (
            <g key={o.id} className={`ct-olho ct-olho--${o.id}`} style={{ transform: olho }}>
              {fechado && <path className="ct-olho__fechado" d={`M${-o.rx * 0.85} 0Q0 ${o.ry * 0.24} ${o.rx * 0.85} 0`} />}
              <g className="ct-olho__pisca" display={fechado ? 'none' : undefined}>
                <g className="ct-olho__abre" style={{ transform: abre }}>
                  {/* Base um tom abaixo do creme; o creme por cima, subido e puxado à direita, deixa a meia-lua de sombra embaixo. */}
                  <ellipse className="ct-olho__sombra" rx={o.rx} ry={o.ry} />
                  <g clipPath={`url(#${uid}-${o.id})`}>
                    <ellipse className="ct-olho__fundo" cx="3" cy="-8" rx={o.rx - 2} ry={o.ry - 5} />
                    <g className="ct-olho__olhar">
                      <g className="ct-olho__pupila" style={{ transform: pupila }}>
                        <ellipse className="ct-olho__iris" rx={o.ry * 0.62 * 0.65} ry={o.ry * 0.62} />
                        <ellipse className="ct-olho__brilho" cx={-o.ry * 0.13} cy={-o.ry * 0.26} rx={o.ry * 0.12} ry={o.ry * 0.165} transform={`rotate(-25 ${-o.ry * 0.13} ${-o.ry * 0.26})`} />
                        <circle className="ct-olho__brilho" cx={-o.ry * 0.24} cy={-o.ry * 0.03} r={o.ry * 0.075} />
                      </g>
                    </g>
                  </g>
                  {/* Contorno de pincel: anel entre o olho e uma elipse um pouco maior e descida (mais cheio embaixo). */}
                  <path className="ct-olho__contorno" fillRule="evenodd" d={`${elipse(0.6, 1.2, o.rx + 5, o.ry + 5.5)}${elipse(0, 0, o.rx, o.ry)}`} />
                </g>
              </g>
            </g>
          ))}
          {partes.map(({ o, sob }) => (
            <path key={o.id} className="ct-olho__sobrancelha" style={{ transform: sob }} d="M-38 9C-27-16 20-20 38 4C20 1-22 3-38 9Z" />
          ))}
        </g>
      </g>
      {espia && <path className="ct-olhinhos__borda" d={`M-10 ${BORDA_Y}C40 ${BORDA_Y - 9} 90 ${BORDA_Y + 7} 140 ${BORDA_Y}S240 ${BORDA_Y - 8} 290 ${BORDA_Y + 2}V${ALTURA + 10}H-10Z`} />}
      {guias && (
        <g className="ct-olhinhos__guia">
          <circle cx={CENTRO.x} cy={CENTRO.y} r={RAIO} />
          <path d={`M${CENTRO.x} 0V${ALTURA}M0 ${CENTRO.y}H${LARGURA}`} />
          {partes.map(({ o, olho }) => (
            <g key={o.id} style={{ transform: olho }}>
              <path d={`M0 ${-o.ry - 8}V${o.ry + 8}M${-o.rx - 8} 0H${o.rx + 8}`} />
              <rect x={-o.ry * 0.62 * 0.65} y={-o.ry * 0.62} width={o.ry * 0.62 * 1.3} height={o.ry * 1.24} />
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}

function apontar (el, x, y) {
  el.style.setProperty('--ox', `${(x * ALCANCE.x).toFixed(1)}px`)
  el.style.setProperty('--oy', `${(y * ALCANCE.y).toFixed(1)}px`)
}
