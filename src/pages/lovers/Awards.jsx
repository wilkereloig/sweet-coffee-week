import React from 'react'
import { I } from '../../components/icons'
import { LoversButton, LoversStickers, useLoversReveal } from '../../components/lovers'

// Cards "em breve" — linguagem segura (sem afirmar mecânica não confirmada).
const SOON_CARDS = [
  {
    accent: 'var(--lovers-pink)',
    t: 'Avaliação dos combos',
    b: 'Quando a votação estiver disponível, o público poderá acompanhar as instruções por aqui.',
  },
  {
    accent: 'var(--lovers-yellow)',
    t: 'Experiências especiais',
    b: 'Ações e ativações da edição serão divulgadas nos canais oficiais do Sweet.',
  },
  {
    accent: 'var(--lovers-cyan)',
    t: 'Favoritos da edição',
    b: 'A premiação vai celebrar momentos, escolhas e experiências vividas pelos Sweet Lovers.',
  },
]

export function AwardsPage({ navigate }) {
  useLoversReveal()

  return (
    <div className="page-enter kv-lovers awards-page lovers-gradient-bg" style={{ overflow: 'hidden' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .3 }} />
      <LoversStickers page="premiacao" />

      {/* 1 ── HERO (sistema Lovers) */}
      <section className="lovers-public-hero">
        <div className="lovers-decor" aria-hidden="true">
          <span className="lovers-orb lovers-orb--pink" style={{ width: 220, height: 220, top: -70, left: '4%' }} />
          <span className="lovers-orb lovers-orb--yellow" style={{ width: 130, height: 130, top: 30, right: '8%' }} />
          <span className="lovers-orb lovers-orb--cyan" style={{ width: 150, height: 150, bottom: -50, left: '38%' }} />
        </div>
        <div className="wrap lovers-safe-wrap lovers-public-hero__inner">
          <span className="lovers-public-hero__eyebrow">Premiação Lovers</span>
          <h1 className="lovers-public-hero__title">Sua experiência também faz parte da edição.</h1>
          <p className="lovers-public-hero__lead">
            Em breve, você vai poder acompanhar as ações da edição, participar das experiências
            especiais e celebrar os favoritos do Sweet &amp; Coffee Week Lovers.
          </p>
        </div>
      </section>

      {/* 2 ── EM BREVE (3 cards) */}
      <section className="lovers-public-section">
        <div className="wrap lovers-safe-wrap">
          <div className="lovers-public-section__header lovers-reveal">
            <span className="lovers-eyebrow" style={{ justifyContent: 'center' }}>Em breve</span>
            <h2 className="lovers-public-section__title">A premiação está sendo preparada.</h2>
          </div>
          <div className="lovers-public-card-grid">
            {SOON_CARDS.map((c, i) => (
              <article
                key={c.t}
                className={`lovers-public-card lovers-reveal lv-anim-${i + 1}`}
                style={{ '--card-accent': c.accent }}
              >
                <span className="lovers-public-card__badge"><I.heart width={12} height={12} /> Em breve</span>
                <h3 className="lovers-public-card__title">{c.t}</h3>
                <p className="lovers-public-card__text">{c.b}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3 ── FECHAMENTO */}
      <section className="section awards-section" style={{ paddingTop: 0 }}>
        <div className="wrap lovers-safe-wrap">
          <div className="awards-final-cta lovers-reveal">
            <h2 className="awards-final-cta__title">Enquanto isso, <span>monte sua rota.</span></h2>
            <div className="awards-final-cta__ctas">
              <LoversButton variant="primary" href="#/lovers/participantes" onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }}>
                Ver participantes <I.arrow />
              </LoversButton>
              <LoversButton variant="secondary" href="#/lovers/mapa" onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}>
                <I.map width={18} height={18} /> Abrir mapa da doçura
              </LoversButton>
            </div>
            <a className="awards-final-cta__ig"
               href="https://instagram.com/sweetcoffeeweek"
               target="_blank" rel="noopener noreferrer">
              <I.ig width={14} height={14} /> @sweetcoffeeweek
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
