/*
 * Peças das duas páginas irmãs — Participar e Apoiar dividem o CSS
 * (scw-participar-apoiar.css, prefixo .pa-) e, por isso, estas peças. Apoiar
 * importa daqui: eram cópias linha a linha nas duas páginas (§5.3).
 */
import React from 'react'
import { HeroFotos } from '../../components/HeroFotos'
import { Rotulo } from '../../components/Rotulo'
import { useReservaDaBase } from '../../hooks/useReservaDaBase'

const movimentoReduzido = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Âncora dentro da página. O roteador usa o hash (`#/participar`), então um
 * `href="#secao"` cru trocaria de rota: aqui o clique rola até a seção e leva
 * o FOCO junto — sem isso quem navega por teclado continuava no herói.
 */
export const irPara = (id) => (e) => {
  if (e) e.preventDefault()
  const alvo = typeof document !== 'undefined' && document.getElementById(id)
  if (!alvo) return
  alvo.scrollIntoView({ behavior: movimentoReduzido() ? 'auto' : 'smooth', block: 'start' })
  if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1')
  alvo.focus({ preventScroll: true })
}

/** Destaque editorial do título: troca de `base` para `dest` (keyframe scwDestaque). */
export function Destaque({ base = 'var(--scw-choco)', dest = 'var(--scw-magenta)', children }) {
  return <em className="pa-destaque" style={{ '--base': base, '--dest': dest }}>{children}</em>
}

/** Cabeça de seção: rótulo + H2 (+ apoio à direita, quando informa algo que o H2 não diz). */
export function Cabeca({ icone, rotulo, titulo, apoio, idTitulo }) {
  return (
    <div className={`pa-cabeca${apoio ? '' : ' pa-cabeca--simples'}`}>
      <div>
        <Rotulo icone={icone}>{rotulo}</Rotulo>
        <h2 className="scw-h2" id={idTitulo}>{titulo}</h2>
      </div>
      {apoio && <p className="pa-cabeca__apoio">{apoio}</p>}
    </div>
  )
}

/**
 * Herói das duas páginas: H1 + lead + ações, nada mais (§6.8). A classe
 * `.pa-hero` é a que o scw-motion.css coreografa — não renomear.
 */
export function HeroPa({ fotos, titulo, lead, children }) {
  return (
    <section className="scw-hero-bloco scw-hero-veu pa-hero" aria-labelledby="pa-titulo" data-mo-fora>
      <HeroFotos fotos={fotos} />
      <div className="pa-hero__grade">
        <div>
          <h1 id="pa-titulo" className="scw-h1 pa-hero__titulo">{titulo}</h1>
          <p className="scw-lead pa-hero__lead">{lead}</p>
          <div className="pa-hero__acoes">{children}</div>
        </div>
      </div>
    </section>
  )
}

/** Barra de ação fixa do desktop: entra depois de o herói sair da tela.
 *  Reserva a base (useReservaDaBase): o aviso de cookies, que mora no canto
 *  inferior direito, sobe acima dela em vez de cobrir o botão da barra. */
export function BarraAcao({ texto, children }) {
  const [visivel, setVisivel] = React.useState(false)
  const ref = React.useRef(null)
  useReservaDaBase(ref)
  React.useEffect(() => {
    const onScroll = () => setVisivel(window.scrollY > window.innerHeight * 0.9)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  // Escondida (fora da tela), a barra sai também da tabulação: `inert` em string,
  // que o React 18 repassa ao DOM como atributo.
  return (
    <div ref={ref} className={`pa-barra${visivel ? ' is-visivel' : ''}`} data-mo-fora {...(visivel ? {} : { inert: '' })}>
      <span>{texto}</span>
      {children}
    </div>
  )
}
