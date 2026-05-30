import React from 'react'
import { I } from '../../components/icons'
import { LoversButton, useLoversReveal } from '../../components/lovers'

const STEPS = [
  { n: '01', icon: 'plate', t: 'Prove',       b: 'Visite os participantes e descubra as criações da edição Lovers.', accent: 'var(--lovers-pink)' },
  { n: '02', icon: 'star',  t: 'Avalie',      b: 'Quando a votação abrir, conte quais combos conquistaram você.',     accent: 'var(--lovers-yellow)' },
  { n: '03', icon: 'heart', t: 'Torça',       b: 'Acompanhe os destaques da edição e compartilhe seus favoritos.',    accent: 'var(--lovers-cyan)' },
  { n: '04', icon: 'check', t: 'Compartilhe', b: 'Marque os amigos, poste sua rota e mostre seu momento Sweet.',      accent: 'var(--lovers-purple)' },
]

const CHECKLIST = [
  'Escolha os participantes que quer visitar.',
  'Monte sua Rota da Doçura.',
  'Fotografe seus combos favoritos.',
  'Acompanhe @sweetcoffeeweek para saber quando a avaliação abrir.',
]

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AwardsPage({ navigate }) {
  useLoversReveal()

  return (
    <div className="page-enter kv-lovers awards-page lovers-gradient-bg" style={{ overflow: 'hidden' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .3 }} />

      {/* 1 ── HERO */}
      <section className="awards-hero">
        <div className="lovers-decor" aria-hidden="true">
          <span className="lovers-orb lovers-orb--pink" style={{ width: 220, height: 220, top: -70, left: '4%' }} />
          <span className="lovers-orb lovers-orb--yellow" style={{ width: 130, height: 130, top: 30, right: '8%' }} />
          <span className="lovers-orb lovers-orb--cyan" style={{ width: 150, height: 150, bottom: -50, left: '38%' }} />
        </div>
        <span className="lovers-sticker lovers-sticker--pink awards-hero__sticker" aria-hidden="true">avalie! ♥</span>
        <div className="wrap awards-hero__inner">
          <div className="awards-hero__content">
            <span className="awards-hero__kicker">Premiação Lovers</span>
            <h1 className="awards-hero__title">Provou? Agora<br /><span>conte pra gente.</span></h1>
            <p className="awards-hero__subtitle">
              Depois de viver a rota, chega a hora de participar da escolha dos destaques da edição.
            </p>
            <p className="awards-hero__text">
              A avaliação dos combos será liberada em breve. Enquanto isso, vá salvando seus favoritos,
              montando sua rota e preparando suas apostas.
            </p>
            <span className="awards-hero__badge">Em breve</span>
            <div className="awards-hero__ctas">
              <LoversButton variant="primary" href="#/lovers/participantes" onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }}>
                Ver participantes <I.arrow />
              </LoversButton>
              <LoversButton variant="secondary" href="#/lovers/mapa" onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}>
                <I.route /> Abrir mapa da Doçura
              </LoversButton>
            </div>
          </div>
        </div>
      </section>

      {/* 2 ── COMO FUNCIONA (steps) */}
      <section className="section awards-section">
        <div className="wrap">
          <div className="awards-section__head is-center lovers-reveal">
            <span className="lovers-eyebrow">Como funciona</span>
            <h2 className="awards-section__title">Como você vai participar.</h2>
          </div>
          <div className="awards-steps">
            {STEPS.map((s, i) => {
              const Ic = I[s.icon] || I.star
              return (
                <article key={s.n} className={`awards-step-card lv-anim lv-anim-${i + 1}`} style={{ '--card-accent': s.accent }}>
                  <div className="awards-step-card__top">
                    <span className="awards-step-card__num">{s.n}</span>
                    <span className="awards-step-card__icon" aria-hidden="true"><Ic width={24} height={24} /></span>
                  </div>
                  <h3 className="awards-step-card__title">{s.t}</h3>
                  <p className="awards-step-card__text">{s.b}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* 3 ── A VOTAÇÃO AINDA NÃO COMEÇOU */}
      <section className="section awards-section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <article className="awards-info-card lovers-reveal">
            <div className="awards-info-card__body">
              <span className="lovers-eyebrow" style={{ color: 'var(--lovers-burgundy)' }}>Em breve</span>
              <h2 className="awards-info-card__title">A votação ainda<br /><span>não começou.</span></h2>
              <p className="awards-info-card__text">
                A avaliação será aberta durante o período definido pela organização. Quando estiver disponível,
                você poderá avaliar os combos que experimentou e ajudar a escolher os destaques da edição.
              </p>
              <p className="awards-info-card__micro">
                Enquanto isso, monte sua rota, visite os participantes e salve seus favoritos.
              </p>
              <div className="awards-info-card__ctas">
                <LoversButton variant="primary" href="#/lovers/participantes" onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }}>
                  Ver participantes <I.arrow />
                </LoversButton>
                <LoversButton variant="secondary" href="#/lovers/mapa" onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}>
                  <I.route /> Abrir mapa
                </LoversButton>
              </div>
            </div>
            <div className="awards-info-card__aside" aria-hidden="true">
              <span className="awards-info-card__seal"><I.starFill width={34} height={34} /></span>
              <span className="awards-info-card__seal-text">Sweet &amp; Coffee Week Awards</span>
            </div>
          </article>
        </div>
      </section>

      {/* 4 ── COMO SE PREPARAR (checklist) */}
      <section className="section awards-section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="awards-section__head lovers-reveal">
            <span className="lovers-eyebrow">Como se preparar</span>
            <h2 className="awards-section__title">Enquanto isso, vá<br />montando sua lista.</h2>
          </div>
          <ul className="awards-checklist">
            {CHECKLIST.map((item, i) => (
              <li key={i} className="awards-checklist__item lovers-reveal">
                <span className="awards-checklist__check" aria-hidden="true"><CheckIcon /></span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5 ── FECHAMENTO */}
      <section className="section awards-section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="awards-final-cta lovers-reveal">
            <span className="lovers-sticker lovers-sticker--cyan awards-final-cta__sticker" aria-hidden="true">vem pro sweet ♥</span>
            <h2 className="awards-final-cta__title">O Sweet também é feito<br />por <span>quem participa.</span></h2>
            <p className="awards-final-cta__text">
              Cada visita, foto, voto e indicação ajuda a contar a história dessa edição.
            </p>
            <LoversButton variant="primary" href="#/lovers/participantes" onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }}>
              Começar pelos participantes <I.arrow />
            </LoversButton>
          </div>
        </div>
      </section>
    </div>
  )
}
