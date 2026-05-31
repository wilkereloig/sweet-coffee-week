import React from 'react'
import { I, LoversWordmark } from '../../components/icons'
import { PARTICIPANTS } from '../../data/participants'
import { LoversButton, LoversNavCard, LoversStatCard, LoversStickers, useLoversReveal } from '../../components/lovers'

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
            De 4 a 14 de junho, Natal entra na rota mais doce do ano com combos especiais
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

function Sobre() {
  const chips = [
    { t: 'Quem esperou o mapa',             accent: 'var(--lovers-pink)' },
    { t: 'Quem marcou os amigos',           accent: 'var(--lovers-cyan)' },
    { t: 'Quem fotografou antes de provar', accent: 'var(--lovers-yellow)' },
    { t: 'Quem fez rota',                   accent: 'var(--lovers-purple)' },
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
              Esta edição não é sobre amor romântico. É sobre os <strong>Sweet Lovers</strong>:
              pessoas que acompanham o festival, visitam as lojas, fotografam combos, marcam os
              amigos, votam, compartilham e transformam cada edição em uma experiência coletiva.
            </p>
            <p className="lovers-concept__text">
              Na edição especial de 10 anos, o público é o grande homenageado.
            </p>

            <div className="lovers-concept__highlight">
              Sweet Lovers são fãs, clientes, amigos, famílias, grupos e pessoas que vivem o
              festival como roteiro, memória e descoberta.
            </div>

            <div className="lovers-concept__chips">
              {chips.map((c, i) => (
                <span className="lovers-concept-chip" key={i} style={{ '--lv-accent': c.accent }}>
                  {c.t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ComoFunciona() {
  const steps = [
    { n: '01', h: 'Cada loja escolheu uma memória', p: 'Os participantes revisitam temas que já fizeram parte da história do Sweet & Coffee Week.', accent: 'var(--lovers-pink)' },
    { n: '02', h: 'A proposta é recriar',           p: 'Não é repetir combos antigos. É criar uma nova versão, com novos sabores e um novo olhar.',  accent: 'var(--lovers-yellow)' },
    { n: '03', h: 'Você monta sua rota',            p: 'Escolha os participantes, visite as lojas e descubra a cidade através dos sabores.',          accent: 'var(--lovers-cyan)' },
    { n: '04', h: 'Combo padrão',                   p: '1 doce + 1 salgado + 1 bebida por R$ 38,90.',                                                 accent: 'var(--lovers-purple)' },
  ]
  return (
    <section id="como" className="section section-como">
      <div className="wrap lovers-safe-wrap">
        <div className="lovers-section-header reveal reveal-left" style={{ marginBottom: 'clamp(28px, 3vw, 44px)' }}>
          <span className="lovers-eyebrow" style={{ color: 'var(--lovers-yellow)' }}>Como funciona</span>
          <h2 className="lovers-section__title" style={{ color: 'var(--lovers-cream)' }}>
            A memória volta.<br />
            O sabor é <span style={{ color: 'var(--lovers-yellow)' }}>novo.</span>
          </h2>
          <p className="lovers-section__lead" style={{ color: 'rgba(255,232,210,.9)' }}>
            Na edição Lovers, cada participante revisita uma lembrança da história do Sweet &amp; Coffee
            Week e transforma essa inspiração em uma nova experiência.
          </p>
        </div>

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
    </section>
  )
}

/* ── Cards de dados (números grandes, coloridos) ── */
function StatCards() {
  const stats = [
    { num: '10',   label: 'anos de Sweet',  text: 'Uma década de histórias, sabores, fotos e encontros pela cidade.',          variant: 'pink' },
    { num: String(PARTICIPANTS.length || 21), label: 'participantes', text: 'Lojas criando novas experiências para a edição Lovers.',          variant: 'cyan' },
    { num: '4–14', label: 'de junho',       text: 'Onze dias para visitar, provar e montar sua própria rota.',                variant: 'coral' },
    { num: 'R$ 38,90', label: 'combo padrão', text: '1 doce + 1 salgado + 1 bebida em cada experiência participante.',         variant: 'purple' },
  ]
  return (
    <section className="section lovers-section">
      <div className="wrap lovers-safe-wrap">
        <div className="lovers-section-header is-center reveal reveal-up">
          <span className="lovers-eyebrow">A edição em números</span>
          <h2 className="lovers-section__title">
            Tudo pronto para <span style={{ color: 'var(--lovers-pink)' }}>viver a rota.</span>
          </h2>
        </div>
        <div className="lovers-stat-grid">
          {stats.map((s, i) => (
            <LoversStatCard
              key={s.label}
              number={s.num}
              label={s.label}
              text={s.text}
              variant={s.variant}
              className={`reveal reveal-scale reveal-delay-${(i % 5) + 1}`}
            />
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

function RotaDaDocura({ navigate }) {
  return (
    <section className="section lovers-route-section">
      <div className="wrap lovers-safe-wrap">
        <div className="lovers-route-card reveal reveal-up">
          <div className="lovers-route-card__content">
            <span className="lovers-eyebrow">Rota da Doçura</span>
            <h2 className="lovers-section__title">Monte sua rota pela cidade.</h2>
            <p>
              A edição Lovers espalha sabores por diferentes pontos de Natal e região. Use o mapa
              para encontrar os participantes, escolher suas paradas e viver o Sweet no seu próprio ritmo.
            </p>
            <div className="lovers-route-card__ctas">
              <LoversButton
                variant="primary"
                href="#/lovers/mapa"
                onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}
              >
                <I.map width={18} height={18} /> Abrir mapa da doçura
              </LoversButton>
            </div>
            <p className="lovers-route-card__micro">
              O mapa mostra os pontos participantes e ajuda você a planejar sua experiência.
            </p>
          </div>

          <div className="lovers-route-card__aside">
            <span className="lovers-route-card__icon" aria-hidden="true"><I.map width={26} height={26} /></span>
            <h3>Dica Sweet Lover</h3>
            <p>Salve seus favoritos, combine com os amigos e descubra novas lojas pelo caminho.</p>
          </div>
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
            <LoversButton
              variant="secondary"
              href="#/lovers/mapa"
              onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}
            >
              <I.map width={18} height={18} /> Abrir mapa da doçura
            </LoversButton>
          </div>

          <p className="lovers-final-cta__micro">De 4 a 14 de junho · Natal/RN</p>

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
      <Sobre />
      <ComoFunciona />
      <StatCards />
      <NavCards navigate={navigate} />
      <RotaDaDocura navigate={navigate} />
      <FinalCTA navigate={navigate} />
    </div>
  )
}
