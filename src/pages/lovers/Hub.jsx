import React from 'react'
import { I } from '../../components/icons'
import { PARTICIPANTS } from '../../data/participants'
import { LoversButton, LoversNavCard, LoversStickers, useLoversReveal, ShareCardModal } from '../../components/lovers'
import { COMBO_PHOTOS } from '../../data/comboPhotos'

// Fotos principais dos combos para a faixa deslizante do hero.
const HERO_STRIP_IMAGES = PARTICIPANTS.map(p => COMBO_PHOTOS[p.slug]?.mainImage).filter(Boolean)

/* CTA da carteirinha Sweet Lover — abre o card 9:16 pra compartilhar.
   Nome reaproveitado do voto (localStorage), se houver. */
function CarteirinhaCTA() {
  const [open, setOpen] = React.useState(false)
  let nome = ''
  try { nome = (JSON.parse(window.localStorage.getItem('sweet-awards-voter')) || {}).nome || '' } catch { /* ignore */ }
  return (
    <>
      <LoversButton variant="secondary" onClick={() => setOpen(true)}>
        <I.heart width={16} height={16} /> Minha carteirinha Sweet Lover
      </LoversButton>
      <ShareCardModal open={open} onClose={() => setOpen(false)} variant="carteirinha" data={{ nome }} />
    </>
  )
}

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
          <span className="lovers-hero__eyebrow">Especial 10 anos</span>

          <h1 className="lovers-hero__main-title">
            Bem-vindo à edição <span>Lovers</span>.
          </h1>

          <p className="lovers-hero__lead lovers-text-wrap">
            Uma celebração da comunidade que faz o festival acontecer, com combos especiais
            criados por lojas que fazem parte dessa história.
          </p>
        </div>
      </div>

      {HERO_STRIP_IMAGES.length > 0 && (
        <div className="lovers-hero__strip" aria-hidden="true">
          <div className="lovers-hero__strip-track">
            {[...HERO_STRIP_IMAGES, ...HERO_STRIP_IMAGES].map((src, i) => (
              <span className="lovers-hero__strip-tile" key={i}>
                <img src={src} alt="" loading="lazy" decoding="async" width={220} height={150} />
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function OQueEComoFunciona() {
  const steps = [
    { n: '01', icon: 'heart', h: 'Cada loja escolheu uma memória', p: 'Os participantes revisitam temas que já fizeram parte da história do Sweet & Coffee Week.', accent: 'var(--lovers-pink)',   ink: 'var(--lovers-cream)' },
    { n: '02', icon: 'star',  h: 'A proposta é recriar',           p: 'Não é repetir combos antigos. É criar uma nova versão, com novos sabores e um novo olhar.',  accent: 'var(--lovers-yellow)', ink: 'var(--lovers-burgundy)' },
    { n: '04', icon: 'plate', h: 'R$ 38,90',                       p: 'Combo padrão: 1 doce + 1 salgado + 1 bebida — ou Sweet Box.',                                                accent: 'var(--lovers-purple)', ink: 'var(--lovers-cream)', price: true },
  ]
  return (
    <section id="sobre" className="section section-sobre">
      <div className="wrap lovers-safe-wrap lovers-concept">
        <div className="lovers-concept__grid">
          <div className="lovers-concept__head reveal reveal-up">
            <span className="lovers-eyebrow">O que é a edição Lovers?</span>
            <h2 className="lovers-section__title">
              Lovers é sobre quem<br />
              faz o <span style={{ color: 'var(--lovers-pink)' }}>Sweet acontecer.</span>
            </h2>
          </div>
        </div>

        <div className="lovers-concept__how reveal reveal-up">
          <span className="lovers-eyebrow lovers-concept__how-label">Como funciona</span>
          <div className="lovers-step-grid">
            {steps.map((s, i) => (
              <article
                className={`lovers-step-card${s.price ? ' lovers-step-card--price' : ''} reveal reveal-scale reveal-delay-${i + 1}`}
                key={s.n}
                style={{ '--lv-accent': s.accent, '--lv-ink': s.ink }}
              >
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
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <LoversButton
            variant="primary"
            href="https://instagram.com/sweetcoffeeweek"
            target="_blank"
            rel="noopener noreferrer"
          >
            <I.ig width={18} height={18} /> Siga no Instagram
          </LoversButton>
        </div>

        <div className="section-cta__footnote reveal reveal-up reveal-delay-3">
          <span>© 2026 SWEET &amp; COFFEE WEEK · 16ª EDIÇÃO LOVERS</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>REALIZAÇÃO · <a href="https://f2experience.com.br" target="_blank" rel="noopener noreferrer" aria-label="F2 Experience" style={{ display: 'inline-flex' }}><img src="/images/logo-f2experience.svg" alt="F2 Experience" style={{ height: 16, width: 'auto' }} /></a></span>
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
