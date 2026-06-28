/*
 * PÁGINA INSTITUCIONAL — "Contato".
 * Central simples de encaminhamento por intenção, no sistema da Home/O Festival
 * (tokens, containers, cards, Motion System, banda chocolate × creme). Curta e
 * direta: cada caminho leva ao canal certo. Não repete o texto institucional da
 * Home nem a seção de realização (F2). Header/menu/rodapé GLOBAIS (App.jsx).
 */
import React from 'react'
import { I } from '../../components/icons'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'

const INSTAGRAM_HANDLE = '@sweetcoffeeweek'
const INSTAGRAM_URL = 'https://instagram.com/sweetcoffeeweek'

// Cards por intenção — cada um aponta para um caminho real (rota interna ou o
// canal oficial). Acento do selo por card (coral/cyan/yellow/coffee/pink).
const PATHS = [
  { tag: 'Público & Sweet Lovers', icon: 'cup', t: 'Dúvidas sobre o festival', d: 'Edição atual, participantes, combos, datas, votação e experiência do público.', btn: 'Abrir Instagram', href: INSTAGRAM_URL },
  { tag: 'Marcas participantes', icon: 'plate', t: 'Sua marca quer entrar na rota?', d: 'Pré-cadastro para docerias, cafeterias, confeitarias, restaurantes e marcas gastronômicas.', btn: 'Quero participar', route: '/participar' },
  { tag: 'Patrocínio & parcerias', icon: 'star', t: 'Apoiar o festival', d: 'Cotas, ativações, mídia, produto e apoio institucional para marcas parceiras.', btn: 'Quero apoiar', route: '/apoiar' },
  { tag: 'Imprensa & conteúdo', icon: 'search', t: 'Pautas, entrevistas e materiais', d: 'Canal para veículos, jornalistas e creators que querem falar sobre o Sweet & Coffee Week.', btn: 'Falar com a organização', href: INSTAGRAM_URL },
  { tag: 'Sugestões', icon: 'heart', t: 'Ideias para o festival', d: 'Sugira um tema, indique um participante ou conte o que quer ver nas próximas edições.', btn: 'Enviar sugestão', href: INSTAGRAM_URL },
]

function ContactCard({ p, navigate }) {
  const Icon = I[p.icon] || I.cup
  const external = !!p.href
  return (
    <article className="contato-card">
      <span className="contato-card__ic" aria-hidden="true"><Icon width={20} height={20} /></span>
      <span className="contato-card__tag">{p.tag}</span>
      <h2>{p.t}</h2>
      <p>{p.d}</p>
      <a
        className="contato-card__cta motion-press"
        href={external ? p.href : `#${p.route}`}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        onClick={external ? undefined : (e) => { e.preventDefault(); navigate(p.route); if (typeof window !== 'undefined') window.scrollTo(0, 0) }}
      >
        {p.btn} <I.arrow />
      </a>
    </article>
  )
}

export function ContatoPage({ navigate }) {
  const rootRef = React.useRef(null)
  useRevealOnScroll(rootRef)

  return (
    <div className="page-enter contato-page" ref={rootRef}>
      {/* 1 — HERO (banda chocolate) */}
      <section className="contato-hero">
        <div className="wrap contato-hero__inner motion-reveal-up">
          <span className="contato-eyebrow"><span className="contato-eyebrow__dot" />Contato</span>
          <h1>Vamos conversar sobre o <span className="keep-together"><span className="contato-hl" style={{ '--hl': 'var(--pink)' }}>Sweet &amp; Coffee Week</span>?</span></h1>
          <p>Escolha o caminho mais próximo do que você precisa e fale com a organização do Sweet &amp; Coffee Week.</p>
        </div>
      </section>

      {/* 2 — CARDS POR INTENÇÃO */}
      <section className="section contato-cards-section">
        <div className="wrap">
          <div className="contato-cards motion-stagger">
            {PATHS.map((p) => <ContactCard key={p.tag} p={p} navigate={navigate} />)}
          </div>
        </div>
      </section>

      {/* 3 — CANAL VIVO (Instagram) */}
      <section className="section contato-live">
        <div className="wrap contato-live__inner motion-reveal-up">
          <h2>O Instagram é o canal mais <span className="contato-hl" style={{ '--hl': 'var(--coral)' }}>vivo</span> do festival.</h2>
          <p>É por lá que o Sweet &amp; Coffee Week anuncia edições, participantes, bastidores, chamadas de votação, premiações, avisos e conteúdos enviados pelos Sweet Lovers.</p>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg motion-press">
            <I.ig width={16} height={16} /> Seguir {INSTAGRAM_HANDLE}
          </a>
        </div>
      </section>

      <style>{`
        .contato-page { overflow-x: clip; }
        .contato-page section { position: relative; }
        .contato-page .keep-together { white-space: nowrap; }
        .contato-hl { position: relative; display: inline-block; font-style: italic; color: var(--hl, var(--coral)); }
        .contato-hl::after { content: ''; position: absolute; left: 0; right: 0; bottom: .04em; height: .1em; border-radius: 4px; background: var(--hl, var(--coral)); }
        .contato-page h1, .contato-page h2 { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.04em; color: var(--ink); text-wrap: balance; margin: 0; }

        .contato-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--page-accent, var(--yellow)); margin: 0 0 var(--sp-4); }
        .contato-eyebrow__dot { width: 7px; height: 7px; border-radius: 999px; background: currentColor; }

        /* 1 — HERO chocolate */
        .contato-hero { background: #381610; padding: clamp(122px, 17vw, 178px) 0 clamp(56px, 8vw, 96px); }
        @media (min-width: 960px) { .contato-hero { padding-top: clamp(196px, 17vw, 244px); } }
        .contato-hero__inner { max-width: 840px; }
        .contato-hero h1 { color: var(--cream); font-size: clamp(40px, 5.4vw, 86px); line-height: .95; max-width: 14ch; }
        .contato-hero p { margin: var(--sp-5) 0 0; max-width: 56ch; color: rgba(255,241,230,.85); font-size: var(--fs-lead); line-height: 1.45; text-wrap: pretty; }

        /* 2 — CARDS POR INTENÇÃO */
        .contato-cards-section { background: var(--cream); }
        .contato-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
        .contato-card { display: flex; flex-direction: column; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6); box-shadow: var(--shadow-md); transition: transform var(--motion-base, .26s) var(--ease-out-soft, ease), box-shadow var(--motion-base, .26s) var(--ease-out-soft, ease); }
        .contato-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .contato-card__ic { display: inline-grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; color: #fff; box-shadow: 0 8px 20px rgba(43,24,16,.16); }
        .contato-cards .contato-card:nth-child(5n+1) .contato-card__ic { background: var(--coral); }
        .contato-cards .contato-card:nth-child(5n+2) .contato-card__ic { background: var(--cyan-deep); }
        .contato-cards .contato-card:nth-child(5n+3) .contato-card__ic { background: var(--yellow-deep); }
        .contato-cards .contato-card:nth-child(5n+4) .contato-card__ic { background: var(--swc-coffee, #6A2C15); }
        .contato-cards .contato-card:nth-child(5n+5) .contato-card__ic { background: var(--pink); }
        .contato-card__tag { margin-top: var(--sp-4); font-family: var(--font-sans); font-size: 10.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); }
        .contato-card h2 { font-size: clamp(19px, 1.6vw, 23px); line-height: 1.08; margin: var(--sp-2) 0 0; }
        .contato-card p { color: var(--ink-soft); font-size: 14px; line-height: 1.5; margin: var(--sp-3) 0 0; text-wrap: pretty; }
        .contato-card__cta { display: inline-flex; align-items: center; gap: 8px; align-self: flex-start; margin-top: auto; padding-top: var(--sp-5); font-family: var(--font-sans); font-size: 14px; font-weight: 700; color: var(--coral-deep); }
        .contato-card__cta svg { width: 15px; height: 15px; transition: transform var(--motion-fast, .16s) var(--ease-out-soft, ease); }
        .contato-card__cta:hover svg { transform: translateX(3px); }

        /* 3 — CANAL VIVO */
        .contato-live { background: var(--cream-deep, var(--bg-soft)); }
        .contato-live__inner { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 680px; margin: 0 auto; }
        .contato-live h2 { font-size: clamp(26px, 3vw, 44px); line-height: 1.02; }
        .contato-live p { color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.45; margin: 0; text-wrap: pretty; }
        .contato-live .btn { min-height: 50px; margin-top: var(--sp-3); }

        /* RESPONSIVO */
        @media (max-width: 900px) { .contato-cards { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) {
          .contato-cards { grid-template-columns: 1fr; }
          .contato-live .btn { width: 100%; justify-content: center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .contato-card, .contato-card__cta svg { transition: none; }
        }
      `}</style>
    </div>
  )
}
