import React from 'react'
import { I, LoversWordmark } from '../../components/icons'
import { PARTICIPANTS } from '../../data/participants'
import { LoversButton, LoversNavCard, LoversStatCard, LoversStickers, useLoversReveal } from '../../components/lovers'

/* Página /lovers — landing "Sobre a edição" (Lovers Interactive Editorial System).
   Scroll reveal via hook compartilhado useLoversReveal (observa '.lovers-reveal, .reveal'). */

/* ── Sections ── */

function Hero({ navigate }) {
  return (
    <section id="top" className="lovers-hero">
      <div className="lovers-decor" aria-hidden="true">
        <span className="lovers-orb lovers-orb--pink" />
        <span className="lovers-orb lovers-orb--cyan" />
        <span className="lovers-orb lovers-orb--yellow" />
        <span className="lovers-orb lovers-orb--purple" />
      </div>
      <span className="lovers-sticker lovers-sticker--pink lovers-hero__sticker" aria-hidden="true">10 anos ♥</span>
      <span className="lovers-sticker lovers-sticker--cyan lovers-hero__sticker2" aria-hidden="true">Rota da Doçura</span>

      <div className="wrap lovers-hero__inner">
        <div className="lovers-hero__grid">
          {/* Marca */}
          <h1 className="lovers-hero__brand reveal reveal-hero-lockup" aria-label="Sweet & Coffee Week Lovers">
            <span className="lovers-hero__lockup" aria-hidden="true">Sweet &amp;<br />Coffee Week</span>
            <span className="lovers-hero__wordmark" aria-hidden="true"><LoversWordmark width="100%" /></span>
          </h1>

          {/* Conteúdo */}
          <div className="lovers-hero__content reveal reveal-right reveal-delay-1">
            <span className="lovers-hero__eyebrow">10 anos de Sweet &amp; Coffee Week</span>
            <h2 className="lovers-hero__tagline">
              Existe um antes e<br />depois do <span>Sweet.</span>
            </h2>
            <p className="lovers-hero__lead">
              O Sweet nunca foi só sobre sair para comer um combo. Foi sobre transformar confeitarias em
              experiências, doces em assunto da cidade e encontros em memória.
            </p>
            <p className="lovers-hero__note">
              Agora, 10 anos depois, os temas mais amados do festival voltam em novas versões — uma edição
              feita para quem viveu, compartilhou, fotografou, votou, fez rota e ajudou a transformar o
              Sweet &amp; Coffee Week numa história de sucesso.
            </p>
            <div className="lovers-hero__date">
              <strong>4 A 14 DE JUNHO</strong>
              <span>Natal · RN</span>
            </div>
            <div className="lovers-hero__ctas">
              <LoversButton
                variant="primary"
                href="#/lovers/participantes"
                onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }}
              >
                Conhecer participantes <I.arrow />
              </LoversButton>
              <LoversButton
                variant="secondary"
                href="#/lovers/mapa"
                onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}
              >
                <I.route /> Montar minha rota
              </LoversButton>
            </div>
            <p className="lovers-hero__micro">Escolha seus destinos, chame os amigos e viva Natal em modo Sweet.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Sobre() {
  const phrases = [
    { t: 'Quem esperou o mapa.',             accent: 'var(--lovers-pink)' },
    { t: 'Quem marcou os amigos.',           accent: 'var(--lovers-cyan)' },
    { t: 'Quem fotografou antes de provar.', accent: 'var(--lovers-yellow)' },
    { t: 'Quem fez rota.',                   accent: 'var(--lovers-purple)' },
    { t: 'Quem votou.',                      accent: 'var(--lovers-coral)' },
    { t: 'Quem voltou.',                     accent: 'var(--lovers-burgundy)' },
  ]
  return (
    <section id="sobre" className="section section-sobre">
      <div className="wrap">
        <div className="lovers-section-header reveal reveal-up">
          <span className="lovers-eyebrow">A edição</span>
          <h2 className="lovers-section__title">
            Feito de amor,<br />
            recriando <span style={{ color: 'var(--lovers-burgundy)' }}>sabores.</span>
          </h2>
          <p className="lovers-section__lead">
            Essa edição é sobre os nossos principais ingredientes: os <strong>Sweet Lovers</strong>.
          </p>
        </div>

        <div className="lovers-phrase-grid">
          {phrases.map((p, i) => (
            <p
              className={`lovers-phrase reveal reveal-scale reveal-delay-${(i % 5) + 1}`}
              key={i}
              style={{ '--lv-accent': p.accent }}
            >
              {p.t}
            </p>
          ))}
        </div>

        <p className="sobre__impact reveal reveal-up reveal-delay-2" style={{ marginTop: 'clamp(36px, 5vw, 64px)' }}>
          Essa edição é para quem<br />
          fez parte da <span style={{ color: 'var(--lovers-pink)' }}>história.</span>
        </p>
      </div>
    </section>
  )
}

function ComoFunciona() {
  const steps = [
    { n: '01', h: 'Uma memória do Sweet',       p: 'Cada loja escolheu um tema que já fez parte da trajetória do festival.',            accent: 'var(--lovers-pink)' },
    { n: '02', h: 'Uma nova criação',           p: 'O tema volta reinterpretado em um combo especial.',                                accent: 'var(--lovers-yellow)' },
    { n: '03', h: 'Uma rota pela cidade',       p: 'Você escolhe seus destinos e monta sua própria Rota da Doçura.',                   accent: 'var(--lovers-cyan)' },
    { n: '04', h: 'Uma experiência para viver', p: 'No Sweet, você não sai só para comer. Você sai para viver uma história.',          accent: 'var(--lovers-purple)' },
  ]
  return (
    <section id="como" className="section section-como">
      <div className="wrap">
        <div className="lovers-section-header reveal reveal-left" style={{ marginBottom: 'clamp(28px, 3vw, 44px)' }}>
          <span className="lovers-eyebrow" style={{ color: 'var(--lovers-yellow)' }}>Como funciona</span>
          <h2 className="lovers-section__title" style={{ color: 'var(--lovers-cream)' }}>
            Os temas voltaram.<br />
            Mas os sabores são <span style={{ color: 'var(--lovers-yellow)' }}>novos.</span>
          </h2>
          <p className="lovers-section__lead" style={{ color: 'rgba(255,232,210,.9)' }}>
            Para celebrar os 10 anos do Sweet &amp; Coffee Week, cada participante escolheu um tema que
            marcou a história do festival e transformou essa memória em uma nova experiência. Tem filme,
            série, viagem, música, conto de fada, celebração, sabor potiguar e universo que muita gente
            viveu junto.
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
    { num: '10',   label: 'anos',            text: 'De histórias, filas, fotos, votos, encontros e descobertas.',            variant: 'pink' },
    { num: String(PARTICIPANTS.length || 21), label: 'participantes', text: 'Lojas recriando temas que marcaram a trajetória do festival.',       variant: 'cyan' },
    { num: '33',   label: 'lojas',           text: 'Mais destinos para visitar, provar e compartilhar.',                    variant: 'yellow' },
    { num: '15',   label: 'temas históricos', text: 'Viagens, músicas, filmes, séries, contos, celebrações e sabores potiguares.', variant: 'purple' },
    { num: '4–14', label: 'de junho',        text: 'Onze dias para viver a cidade em clima de Sweet.',                      variant: 'coral' },
    { num: 'Rota', label: 'da Doçura',       text: 'Monte sua rota, salve seus destinos e descubra por onde começar.',      variant: 'burgundy' },
  ]
  return (
    <section className="section lovers-section">
      <div className="wrap">
        <div className="lovers-section-header is-center reveal reveal-up">
          <span className="lovers-eyebrow">A edição em números</span>
          <h2 className="lovers-section__title">
            Uma década em <span style={{ color: 'var(--lovers-pink)' }}>modo Sweet.</span>
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
    { kicker: 'Participantes', title: 'Escolha seu primeiro combo.', desc: 'Conheça as lojas participantes, veja o tema que cada uma escolheu revisitar e descubra as criações da edição Lovers.', cta: 'Ver participantes', to: '/lovers/participantes', variant: 'pink' },
    { kicker: 'Rota da Doçura', title: 'Sua rota começa aqui.', desc: 'Encontre as lojas no mapa, salve os destinos que quer visitar e monte sua própria Rota da Doçura.', cta: 'Abrir mapa', to: '/lovers/mapa', variant: 'cyan' },
    { kicker: 'Premiação', title: 'Provou? Agora conte pra gente.', desc: 'Acompanhe a premiação da edição e participe da avaliação dos combos quando a votação estiver liberada.', cta: 'Ver premiação', to: '/lovers/premiacao', variant: 'purple' },
  ]
  return (
    <section className="section lovers-section" style={{ background: 'var(--lovers-cream)' }}>
      <div className="wrap">
        <div className="lovers-section-header is-center reveal reveal-up">
          <span className="lovers-eyebrow">Explore a edição</span>
          <h2 className="lovers-section__title">
            Por onde você vai <span style={{ color: 'var(--lovers-burgundy)' }}>começar?</span>
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
      <div className="wrap">
        <h2 className="lh1 reveal reveal-left" style={{ marginTop: 16, fontSize: 'clamp(56px, 8vw, 120px)' }}>
          Vem viver essa<br />
          história com a <span style={{ color: 'var(--lovers-yellow)' }}>gente.</span>
        </h2>
        <p className="reveal reveal-up reveal-delay-1">
          De 4 a 14 de junho, Natal vai viver uma edição cheia de memórias, sabores e novas descobertas.
        </p>
        <p className="lovers-final-cta__sub reveal reveal-up reveal-delay-1">
          Escolha seus participantes, monte sua rota e celebre os 10 anos do Sweet &amp; Coffee Week.
        </p>
        <div className="ctas reveal reveal-up reveal-delay-2">
          <LoversButton
            variant="primary"
            href="#/lovers/participantes"
            onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }}
          >
            Ver participantes <I.arrow />
          </LoversButton>
          <LoversButton
            variant="primary"
            className="lf-btn-yellow"
            href="#/lovers/mapa"
            onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}
          >
            <I.route /> Montar minha rota
          </LoversButton>
          <LoversButton
            variant="secondary"
            href="https://instagram.com/sweetcoffeeweek"
            target="_blank"
            rel="noopener noreferrer"
          >
            <I.ig /> Seguir no Instagram
          </LoversButton>
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
      <FinalCTA navigate={navigate} />
    </div>
  )
}
