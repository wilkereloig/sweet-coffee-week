import React from 'react'
import { I } from '../../components/icons'
import { PARTICIPANTS } from '../../data/participants'
import { LoversButton, LoversNavCard, LoversStickers, useLoversReveal } from '../../components/lovers'

/* Página /lovers — landing "Sobre a edição" (Lovers Interactive Editorial System).
   Scroll reveal via hook compartilhado useLoversReveal (observa '.lovers-reveal, .reveal'). */

/* ── Sections ── */

function LoversCountdown() {
  const [now, setNow] = React.useState(() => new Date())

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const start = new Date('2026-06-04T00:00:00-03:00')
  const end = new Date('2026-06-14T23:59:59-03:00')
  const diff = start.getTime() - now.getTime()

  let isCounting = false
  let prefix = ''
  let message = ''
  let days = 0, hours = 0, minutes = 0, seconds = 0

  if (now > end) {
    message = 'Edição encerrada'
  } else if (diff <= 0) {
    message = 'A edição Lovers começou!'
  } else {
    isCounting = true
    const totalSeconds = Math.max(0, Math.floor(diff / 1000))
    days = Math.floor(totalSeconds / 86400)
    hours = Math.floor((totalSeconds % 86400) / 3600)
    minutes = Math.floor((totalSeconds % 3600) / 60)
    seconds = totalSeconds % 60
    prefix = days > 0 ? 'Faltam' : 'Começa em'
  }

  return (
    <div className="lovers-countdown" aria-label="Contagem regressiva para a edição Lovers">
      {isCounting ? (
        <>
          <span className="lovers-countdown__eyebrow">{prefix}</span>
          <div className="lovers-countdown__grid">
            {days > 0 && (
              <span className="lovers-countdown__unit">
                <strong>{days}</strong>
                <small>{days === 1 ? 'dia' : 'dias'}</small>
              </span>
            )}
            <span className="lovers-countdown__unit">
              <strong>{String(hours).padStart(2, '0')}</strong>
              <small>horas</small>
            </span>
            <span className="lovers-countdown__unit">
              <strong>{String(minutes).padStart(2, '0')}</strong>
              <small>min</small>
            </span>
            <span className="lovers-countdown__unit lovers-countdown__unit--seconds" key={seconds}>
              <strong>{String(seconds).padStart(2, '0')}</strong>
              <small>seg</small>
            </span>
          </div>
        </>
      ) : (
        <strong className="lovers-countdown__message">{message}</strong>
      )}
      <span className="lovers-countdown__date">
        {now > end ? 'Obrigado por viver essa história com a gente.' : '4 a 14 de junho · Natal/RN'}
      </span>
    </div>
  )
}

function Hero({ navigate }) {
  return (
    <section id="top" className="lovers-hero lovers-hero--simple lovers-hero--message">
      <div className="lovers-decor" aria-hidden="true">
        <span className="lovers-orb lovers-orb--pink" />
        <span className="lovers-orb lovers-orb--cyan" />
        <span className="lovers-orb lovers-orb--yellow" />
        <span className="lovers-orb lovers-orb--purple" />
      </div>

      <div className="wrap lovers-safe-wrap lovers-hero__inner">
        <div className="lovers-hero__copy lovers-centered-stack reveal reveal-up">
          <span className="lovers-hero__eyebrow">Sweet &amp; Coffee Week Lovers · Especial 10 anos</span>

          <h1 className="lovers-hero__main-title">
            Uma edição feita para quem viveu, compartilhou e ajudou a transformar o{' '}
            <span>Sweet</span> em uma história de <span>10 anos</span>.
          </h1>

          <p className="lovers-hero__lead lovers-text-wrap">
            Uma celebração da comunidade que faz o festival acontecer, com combos especiais
            criados por lojas que fazem parte dessa história.
          </p>

          <LoversCountdown />

          <div className="lovers-hero__ctas lovers-cta-row-center">
            <LoversButton
              variant="primary"
              href="#/lovers/participantes"
              onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }}
            >
              Ver participantes <I.arrow />
            </LoversButton>
            <LoversButton
              variant="secondary"
              href="#/lovers/mapa"
              onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}
            >
              <I.map width={18} height={18} /> Abrir mapa da doçura
            </LoversButton>
          </div>
        </div>
      </div>
    </section>
  )
}

function OQueEComoFunciona() {
  const steps = [
    { n: '01', h: 'Cada loja escolheu uma memória', p: 'Os participantes revisitam temas que já fizeram parte da história do Sweet & Coffee Week.', accent: 'var(--lovers-pink)' },
    { n: '02', h: 'A proposta é recriar',           p: 'Não é repetir combos antigos. É criar uma nova versão, com novos sabores e um novo olhar.',  accent: 'var(--lovers-yellow)' },
    { n: '03', h: 'Você monta sua rota',            p: 'Escolha os participantes, visite as lojas e descubra a cidade através dos sabores.',          accent: 'var(--lovers-cyan)' },
    { n: '04', h: 'R$ 38,90',                       p: 'Combo padrão: 1 doce + 1 salgado + 1 bebida.',                                                accent: 'var(--lovers-purple)' },
  ]
  return (
    <section id="sobre" className="section section-sobre">
      <div className="wrap lovers-safe-wrap lovers-concept">
        <div className="lovers-concept__grid">
          <div className="lovers-concept__head reveal reveal-up">
            <span className="lovers-eyebrow">O que é a edição Lovers?</span>
            <h2 className="lovers-section__title">
              Lovers é sobre quem<br />
              faz o <span style={{ color: 'var(--lovers-burgundy)' }}>Sweet acontecer.</span>
            </h2>
          </div>

          <div className="lovers-concept__copy reveal reveal-up reveal-delay-1">
            <p className="lovers-concept__text">
              Não é sobre amor romântico. É sobre os <strong>Sweet Lovers</strong>: quem acompanha
              o festival, visita as lojas, fotografa, marca os amigos, vota e transforma cada edição
              em uma experiência coletiva. Nos 10 anos, o público é o grande homenageado.
            </p>
            <div className="lovers-concept__highlight">
              Sweet Lovers são fãs, clientes, amigos, famílias e grupos que vivem o festival como
              roteiro, memória e descoberta.
            </div>
          </div>
        </div>

        <div className="lovers-concept__how reveal reveal-up">
          <span className="lovers-eyebrow lovers-concept__how-label">Como funciona</span>
          <div className="lovers-step-grid">
            {steps.map((s, i) => (
              <article
                className={`lovers-step-card reveal reveal-scale reveal-delay-${i + 1}`}
                key={s.n}
                style={{ '--lv-accent': s.accent }}
              >
                <span className="lovers-step-card__num" aria-hidden="true">{s.n}</span>
                <h3 className="lovers-step-card__title">{s.h}</h3>
                <p className="lovers-step-card__text">{s.p}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Faixa de números (slim, inline) ── */
function StatsStrip() {
  const stats = [
    { num: '10',       label: 'anos de Sweet' },
    { num: String(PARTICIPANTS.length || 21), label: 'participantes' },
    { num: '4–14 jun', label: 'de festival' },
    { num: 'R$ 38,90', label: 'combo padrão' },
  ]
  return (
    <section className="section lovers-stats-section">
      <div className="wrap lovers-safe-wrap">
        <div className="lovers-stats-strip reveal reveal-up">
          {stats.map((s, i) => (
            <div className="lovers-stats-strip__item" key={s.label}>
              <strong className="lovers-stats-strip__num">{s.num}</strong>
              <span className="lovers-stats-strip__label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Cards de navegação para as áreas internas ── */
function NavCards({ navigate }) {
  const cards = [
    { kicker: 'Participantes', title: 'Conheça as lojas da edição.', desc: 'Veja quem faz parte da Sweet & Coffee Week Lovers e escolha por onde começar.', cta: 'Ver participantes', to: '/lovers/participantes', variant: 'pink' },
    { kicker: 'Mapa da Doçura', title: 'Monte sua rota pela cidade.', desc: 'Encontre os pontos participantes no mapa e planeje suas paradas.', cta: 'Abrir mapa', to: '/lovers/mapa', variant: 'cyan' },
    { kicker: 'Premiação', title: 'Acompanhe as ações da edição.', desc: 'Fique por dentro das experiências especiais e das novidades da premiação.', cta: 'Ver premiação', to: '/lovers/premiacao', variant: 'purple' },
  ]
  return (
    <section className="section lovers-section" style={{ background: 'rgba(255,232,210,.86)' }}>
      <div className="wrap lovers-safe-wrap">
        <div className="lovers-section-header is-center reveal reveal-up">
          <span className="lovers-eyebrow">Explore a edição</span>
          <h2 className="lovers-section__title">
            Escolha seu próximo <span style={{ color: 'var(--lovers-burgundy)' }}>passo.</span>
          </h2>
        </div>
        <div className="lovers-nav-grid">
          {cards.map((c, i) => (
            <LoversNavCard
              key={c.to}
              variant={c.variant}
              kicker={c.kicker}
              title={c.title}
              text={c.desc}
              cta={c.cta}
              href={`#${c.to}`}
              onClick={(e) => { e.preventDefault(); navigate(c.to) }}
              className={`reveal reveal-scale reveal-delay-${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCTA({ navigate }) {
  return (
    <section id="cta" className="section section-cta lovers-final-cta">
      <div className="wrap lovers-safe-wrap">
        <div className="lovers-final-cta__inner reveal reveal-up">
          <span className="lovers-eyebrow">Sweet &amp; Coffee Week Lovers</span>

          <h2 className="lovers-final-cta__title">
            Feito de amor,<br />
            recriando <span>sabores.</span>
          </h2>

          <p className="lovers-final-cta__text">
            Essa edição é um convite para revisitar a história do Sweet, descobrir novas
            criações e viver Natal em modo doce.
          </p>

          <div className="lovers-final-cta__actions">
            <LoversButton
              variant="primary"
              href="#/lovers/participantes"
              onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }}
            >
              Começar pelos participantes <I.arrow />
            </LoversButton>
          </div>

          <a className="lovers-final-cta__ig"
             href="https://instagram.com/sweetcoffeeweek"
             target="_blank" rel="noopener noreferrer">
            <I.ig width={14} height={14} /> @sweetcoffeeweek
          </a>
        </div>

        <div className="section-cta__footnote reveal reveal-up reveal-delay-3">
          <span>© 2026 SWEET &amp; COFFEE WEEK · 16ª EDIÇÃO LOVERS</span>
          <span>REALIZAÇÃO · F2 EXPERIENCE</span>
        </div>
      </div>
    </section>
  )
}

/* ── Page ── */
export function LoversPage({ navigate }) {
  useLoversReveal()
  return (
    <div className="page-enter kv-lovers lovers-home lovers-gradient-bg" style={{ overflow: 'hidden' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .25 }} />
      <LoversStickers page="sobre" />
      <Hero navigate={navigate} />
      <OQueEComoFunciona />
      <NavCards navigate={navigate} />
      <FinalCTA navigate={navigate} />
    </div>
  )
}
