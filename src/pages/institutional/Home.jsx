import React from 'react'
import { I } from '../../components/icons'

// Ícone pin-coração dos cards da colagem (referência KV). A cor do "recorte"
// do coração acompanha o fundo do badge via --ph-cut.
function PinHeart({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22s7-6.2 7-11.5A7 7 0 1 0 5 10.5C5 15.8 12 22 12 22Z" fill="currentColor" />
      <path d="M12 14.2s-3.5-2-3.5-4.5a1.95 1.95 0 0 1 3.5-1.15A1.95 1.95 0 0 1 15.5 9.7C15.5 12.2 12 14.2 12 14.2Z" fill="var(--ph-cut, #fff)" />
    </svg>
  )
}

const STEPS = [
  { n: '01', t: 'Tema da edição', d: 'Cada edição parte de um universo criativo. Já teve Páscoa, Doces do Mundo, Sabores da Infância, Pâtisserie Francesa, Contos de Fadas, Música, Heróis & Vilões, Séries, Terras Potiguares, Movies, Trip, Books, Celebration e Lovers.' },
  { n: '02', t: 'Criação dos combos', d: 'As marcas participantes desenvolvem uma experiência exclusiva conectada ao tema: sabor, nome, apresentação, decoração, embalagem e narrativa.' },
  { n: '03', t: 'Rota pela cidade', d: 'O público acessa o site, descobre os participantes, escolhe seus favoritos e monta sua própria rota de cafeterias, docerias e restaurantes.' },
  { n: '04', t: 'Sweet Awards', d: 'Depois de provar, os Sweet Lovers avaliam os destaques da edição e ajudam a reconhecer os melhores combos, doces, salgados, bebidas, atendimentos, apresentações e experiências em loja.' },
]

const PILLARS = [
  { t: 'Movimenta marcas', d: 'Gera tráfego, venda, repertório de produto, conteúdo e relacionamento com novos públicos.' },
  { t: 'Cria memória', d: 'Cada tema vira história: infância, cinema, livros, viagens, música e celebrações.' },
  { t: 'Ativa a cidade', d: 'O público circula por bairros, conhece endereços e monta a própria rota de cafeterias e docerias.' },
  { t: 'Forma comunidade', d: 'Os Sweet Lovers acompanham, comentam, votam, fotografam e esperam a próxima edição.' },
]

const STATS = [
  { to: 16,  prefix: '',     suffix: '',     l: 'edições realizadas desde 2016' },
  { to: 34,  prefix: '+',    suffix: ' mil', l: 'combos vendidos nas últimas edições' },
  { to: 712, prefix: '+R$ ', suffix: ' mil', l: 'movimentados diretamente' },
  { to: 10,  prefix: '+',    suffix: ' mi',  l: 'visualizações no Instagram' },
]

// Greeting dinâmico do hero: saudação por horário de Natal/RN + temperatura
// real via open-meteo (sem chave, CORS ok). Fallback gracioso se a API falhar.
function useHeroGreeting() {
  const [temp, setTemp] = React.useState(null)
  const [greeting, setGreeting] = React.useState('Doce dia')
  React.useEffect(() => {
    try {
      const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Recife', hour: '2-digit', hour12: false }))
      setGreeting(h >= 5 && h < 12 ? 'Doce dia' : h >= 18 || h < 5 ? 'Doce noite' : 'Doce tarde')
    } catch { /* mantém padrão */ }
    let alive = true
    fetch('https://api.open-meteo.com/v1/forecast?latitude=-5.79&longitude=-35.21&current=temperature_2m')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && d.current && d.current.temperature_2m != null) setTemp(Math.round(d.current.temperature_2m)) })
      .catch(() => {})
    return () => { alive = false }
  }, [])
  return { greeting, temp }
}

// Count-up animado quando entra na viewport (respeita reduced-motion).
function CountUp({ to, prefix = '', suffix = '', duration = 1400 }) {
  const ref = React.useRef(null)
  const [val, setVal] = React.useState(0)
  const done = React.useRef(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVal(to); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !done.current) {
          done.current = true
          const start = performance.now()
          const tick = (now) => {
            const p = Math.min(1, (now - start) / duration)
            const eased = 1 - Math.pow(1 - p, 3)
            setVal(Math.round(to * eased))
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      })
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [to, duration])
  return <span ref={ref}>{prefix}{val.toLocaleString('pt-BR')}{suffix}</span>
}

export function HomePage({ navigate }) {
  const go = (path) => (e) => { e.preventDefault(); navigate(path) }
  const { greeting, temp } = useHeroGreeting()

  return (
    <div className="page-enter hm">
      {/* HERO — nova direção visual (referência campanha) */}
      <section className="swc-hero">
        <div className="swc-hero__copy">
          <span className="swc-hero__eyebrow">{greeting} :){temp != null ? ` ${temp}ºC` : ''} | Natal</span>
          <h1 className="swc-hero__title">
            <span className="swc-hero__line">O festival</span>
            <span className="swc-hero__line">mais <span className="swc-hero__hl">doce</span></span>
            <span className="swc-hero__line">de Natal.</span>
          </h1>
          <div className="swc-hero__text">
            <p>
              O Sweet &amp; Coffee Week é o festival gastronômico que transforma Natal em uma rota de
              sabores, encontros e descobertas.
            </p>
            <p>
              A cada edição, cafeterias, docerias, confeitarias, restaurantes e marcas autorais criam
              combos exclusivos por tempo limitado, inspirados em um tema central.
            </p>
          </div>
        </div>

        <div className="swc-hero__actions">
          <a href="#/participar" className="btn btn-primary btn-lg" onClick={go('/participar')}>Quero participar <I.arrow /></a>
          <a href="#/edicoes" className="btn btn-accent btn-lg" onClick={go('/edicoes')}>Conhecer edições</a>
        </div>

        <div className="swc-hero__photo">
          <img
            src="/images/hero-festival.jpg"
            alt="Bolo de cenoura com cobertura de chocolate, segurado nas mãos — combo do Sweet & Coffee Week"
            decoding="async"
            fetchpriority="high"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>
      </section>

      {/* O QUE É — circuito de sabor: colagem de fotos reais + tags sticker */}
      <section className="section hm-about">
        <div className="wrap">
          <div className="hm-about__head">
            <h2>Um circuito de <span className="hl" style={{ '--hl': 'var(--coral)' }}>sabor</span>,<br />cidade e comunidade.</h2>
            <div className="hm-about__text">
              <p>
                O Sweet &amp; Coffee Week nasceu em Natal para aproximar o público das marcas locais por
                meio de uma experiência simples, criativa e altamente compartilhável.
              </p>
              <p>
                O formato clássico do festival reúne <strong>1 doce + 1 salgado + 1 bebida</strong>,
                criados especialmente para o tema da edição e oferecidos por tempo limitado. Mas o festival
                vai além do combo: ele cria uma temporada na cidade — o público acompanha o lançamento do
                tema, conhece os participantes, salva seus combos favoritos, monta roteiros, visita lojas,
                fotografa, vota no Sweet Awards e transforma cada parada em uma memória.
              </p>
            </div>
          </div>

          <div className="hm-about__collage">
            <figure className="hm-collage__cell hm-collage__cell--a">
              <img src="/images/combos/caffe-basilicos/main.jpg" alt="Combo de uma loja participante do Sweet & Coffee Week" loading="lazy" />
            </figure>
            <figure className="hm-collage__cell hm-collage__cell--b">
              <img src="/images/combos/delicato-bolos/main.jpg" alt="Doce de uma loja participante do Sweet & Coffee Week" loading="lazy" />
            </figure>
            <figure className="hm-collage__cell hm-collage__cell--c">
              <img src="/images/combos/douce-di-maria/main.jpg" alt="Combo de uma loja participante do Sweet & Coffee Week" loading="lazy" />
            </figure>
            <div className="hm-about__tags">
              <span className="hm-card hm-card--coral">
                <i className="hm-card__ic"><PinHeart size={20} /></i>
                <span className="hm-card__label">combos<br />exclusivos</span>
              </span>
              <span className="hm-card hm-card--cyan">
                <i className="hm-card__ic"><PinHeart size={20} /></i>
                <span className="hm-card__label">tema da<br />edição</span>
              </span>
              <span className="hm-card hm-card--yellow">
                <i className="hm-card__ic"><PinHeart size={20} /></i>
                <span className="hm-card__label">11 dias<br />de festival</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="section hm-steps-section" style={{ background: 'var(--cream-deep)' }}>
        <div className="wrap">
          <div className="hm-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>Como funciona</span>
              <h2>Do tema ao roteiro:<br />tudo começa com uma <span className="hl" style={{ '--hl': 'var(--cyan-deep)' }}>ideia</span>.</h2>
            </div>
            <p>O festival começa com um tema, ganha forma nos combos dos participantes e se espalha pela rota do público.</p>
          </div>
          <div className="hm-steps">
            {STEPS.map((s) => (
              <article className="hm-step" key={s.n}>
                <span className="hm-step__n">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* NÚMEROS */}
      <section className="section hm-why hm-numbers">
        <div className="wrap">
          <div className="hm-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>O Sweet &amp; Coffee Week em números</span>
              <h2>Uma década movimentando<br /><span className="hl-w">marcas</span>, <span className="hl-w" style={{ '--hl-delay': '.5s' }}>pessoas</span> e <span className="hl-w" style={{ '--hl-delay': '1s' }}>memórias</span>.</h2>
            </div>
            <p>Desde 2016, o festival cresceu junto com a cena gastronômica de Natal: gera fluxo para os participantes, visibilidade para marcas locais, conteúdo espontâneo nas redes e uma relação de pertencimento com o público.</p>
          </div>
          <div className="hm-stats">
            {STATS.map((s) => (
              <div className="hm-stat" key={s.l}>
                <strong><CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} /></strong>
                <span>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POR QUE IMPORTA */}
      <section className="section hm-why">
        <div className="wrap">
          <div className="hm-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>Mais que um festival</span>
              <h2>O Sweet &amp; Coffee Week virou<br />uma <span className="hl" style={{ '--hl': 'var(--coral)' }}>tradição afetiva</span> de Natal.</h2>
            </div>
            <p>Começou como uma rota gastronômica e se consolidou como plataforma de experiência, visibilidade e memória para a cidade — para o público, para os participantes e para parceiros de marca.</p>
          </div>
          <div className="hm-pillars">
            {PILLARS.map((p) => (
              <article className="hm-pillar" key={p.t}>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* REALIZAÇÃO — 2 colunas editorial (handoff v2) */}
      <section className="section hm-cta-section">
        <div className="wrap hm-realizacao">
          <div className="hm-realizacao__head">
            <span className="eyebrow"><span className="dot"></span>Realização</span>
            <h2>Uma realização<br />da <span className="hl" style={{ '--hl': 'var(--coral)' }}>F2 Experience</span>.</h2>
          </div>
          <div className="hm-realizacao__body">
            <p>
              O Sweet &amp; Coffee Week é realizado pela F2 Experience, empresa especializada em criar
              experiências, campanhas, ativações e projetos que conectam marcas, pessoas e cidade. No
              festival, a F2 Experience assina a estratégia, a criação, a comunicação e o desenvolvimento
              como plataforma de marca, conteúdo, experiência e economia criativa.
            </p>
            <a
              href="https://www.f2experience.com.br"
              className="btn btn-primary btn-lg btn-sticker"
              target="_blank"
              rel="noopener noreferrer"
            >
              Conhecer a F2 Experience <I.arrow />
            </a>
          </div>
        </div>
      </section>

      <style>{`
        .hm { overflow-x: clip; }

        /* HERO — split chocolate + foto, blob coral, CTAs (left-aligned;
           prefixo .hm vence a centralização global de .page-enter) */
        .hm .swc-hero { position: relative; min-height: calc(100dvh - 1px); background: var(--swc-chocolate); overflow: visible; isolation: isolate; z-index: 2; }
        .hm .hm-about { position: relative; z-index: 3; }
        .hm .swc-hero, .hm .swc-hero * { text-align: left; }
        .hm .swc-hero__copy {
          position: relative; z-index: 2; width: 52%; min-height: calc(100dvh - 1px); box-sizing: border-box;
          padding: clamp(40px, 6vw, 96px) var(--hm-gutter) clamp(40px, 6vw, 84px);
          display: flex; flex-direction: column; justify-content: center; background: transparent;
          animation: swcHeroIn .7s cubic-bezier(.2,.7,.2,1) both;
        }
        .hm .swc-hero__eyebrow {
          display: inline-block; width: fit-content; max-width: 100%;
          font-family: var(--font-display); font-style: italic; font-weight: 700;
          font-size: clamp(14px, 1.3vw, 19px); color: var(--swc-cream);
          padding-bottom: 0; border-bottom: 0;
          margin: 0 0 clamp(22px, 3vw, 38px);
        }
        .hm .swc-hero__eyebrow::after {
          content: ""; display: block; width: clamp(120px, 13vw, 188px);
          height: 5px; border-radius: 3px; background: var(--swc-yellow); margin-top: 12px;
        }
        .hm .swc-hero__title {
          font-family: var(--font-display); font-weight: 700; color: var(--swc-cream);
          font-size: clamp(46px, 6.4vw, 104px); line-height: .92; letter-spacing: -.02em;
          margin: 0 0 clamp(22px, 3vw, 36px); text-wrap: balance;
        }
        .hm .swc-hero__hl { color: var(--pink); }
        /* Destaque de palavra nos títulos: itálico + brilho em loop (background-clip text) */
        .hm .hl {
          font-style: italic; font-weight: inherit; white-space: nowrap;
          background: linear-gradient(90deg, var(--hl, var(--coral)) 0%, var(--hl, var(--coral)) 38%, color-mix(in srgb, var(--hl, var(--coral)) 38%, white) 50%, var(--hl, var(--coral)) 62%, var(--hl, var(--coral)) 100%);
          background-size: 220% 100%;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          animation: swcHlShimmer 3.4s linear infinite;
        }
        @keyframes swcHlShimmer { 0% { background-position: 130% 0; } 100% { background-position: -130% 0; } }
        /* Destaque: itálico colorido + sublinhado que desenha uma vez e fica */
        .hm .hl-w { position: relative; display: inline-block; font-style: italic; color: var(--hl, var(--pink)); }
        .hm .hl-w::after {
          content: ''; position: absolute; left: 0; right: 0; bottom: -.04em; height: .1em; border-radius: 4px;
          background: var(--hl, var(--pink)); transform: scaleX(0); transform-origin: left center;
          animation: swcUnderlineDraw .65s ease-out forwards; animation-delay: var(--hl-delay, 0s);
        }
        @keyframes swcUnderlineDraw {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        .hm .swc-hero__line { display: block; animation: swcLineIn .65s cubic-bezier(.2,.7,.2,1) both; }
        .hm .swc-hero__line:nth-child(1) { animation-delay: .10s; }
        .hm .swc-hero__line:nth-child(2) { animation-delay: .22s; }
        .hm .swc-hero__line:nth-child(3) { animation-delay: .34s; }
        @keyframes swcLineIn { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }
        .hm .swc-hero__text { max-width: 42ch; }
        .hm .swc-hero__text p { color: rgba(254,240,221,.86); font-family: var(--font-sans); font-size: clamp(15px, 1.15vw, 18px); line-height: 1.6; margin: 0 0 16px; }
        /* PhotoBadge — foto recortada na silhueta do selo da marca (handoff v2) */
        .hm .swc-hero__photo { position: absolute; top: clamp(-280px, -14vw, -150px); bottom: auto; right: clamp(-260px, -13vw, -130px); transform: none; transform-origin: center; width: clamp(640px, 76vw, 1320px); aspect-ratio: 1 / 1; z-index: 1; overflow: visible; filter: drop-shadow(0 30px 60px rgba(43,24,16,.5)); -webkit-mask: var(--mask-badge) center / contain no-repeat; mask: var(--mask-badge) center / contain no-repeat; }
        .hm .swc-hero__photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform-origin: center; }
        /* badge gira com o scroll; a foto contra-rotaciona p/ ficar em pé */
        @supports (animation-timeline: scroll()) {
          @media (prefers-reduced-motion: no-preference) {
            .hm .swc-hero__photo { animation: swcBadgeSpin linear both; animation-timeline: scroll(root); animation-range: 0 130vh; }
            .hm .swc-hero__photo img { animation: swcBadgeSpinCounter linear both; animation-timeline: scroll(root); animation-range: 0 130vh; }
          }
        }
        @keyframes swcBadgeSpin { from { transform: rotate(0deg); } to { transform: rotate(90deg); } }
        @keyframes swcBadgeSpinCounter { from { transform: scale(1.45) rotate(0deg); } to { transform: scale(1.45) rotate(-90deg); } }
        .hm .swc-hero__actions { position: absolute; right: var(--hm-gutter); bottom: clamp(92px, 13vh, 150px); z-index: 4; display: flex; flex-direction: column; align-items: flex-end; gap: 14px; }
        .hm .swc-hero__actions .btn { margin: 0 !important; box-shadow: 0 12px 30px rgba(43,24,16,.28); font-weight: 700; }
        @keyframes swcHeroIn { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
        @keyframes swcFloat { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(4deg); } }

        @media (max-width: 900px) {
          .hm .swc-hero { display: block; min-height: 0; }
          .hm .swc-hero__copy { width: 100%; min-height: 0; clip-path: none; padding: clamp(32px,7vw,56px) clamp(22px,6vw,40px) clamp(28px,6vw,44px); }
          .hm .swc-hero__actions { position: static; flex-direction: column; align-items: stretch; right: auto; bottom: auto; padding: 0 clamp(22px,6vw,40px) clamp(28px,7vw,40px); }
          .hm .swc-hero__actions .btn { width: 100%; justify-content: center; }
          .hm .swc-hero__photo { position: relative; top: auto; right: auto; transform: none; width: min(80vw, 360px); height: auto; aspect-ratio: 1 / 1; min-height: 0; margin: 4px auto 8px; }
        }

        .hm-about { padding-top: clamp(38px, 5vw, 72px); }
        .hm-about__head { display: grid; grid-template-columns: 1.05fr 1fr; gap: clamp(28px, 5vw, 80px); align-items: end; margin-bottom: clamp(30px, 4vw, 54px); }
        .hm-about__head h2 { font-family: var(--font-display); font-weight: 700; font-size: clamp(38px, 5.6vw, 88px); line-height: .95; letter-spacing: -.03em; color: var(--swc-chocolate); margin: 0; text-wrap: balance; }
        .hm-about__text p { color: var(--ink-soft); font-size: clamp(15px, 1.15vw, 18px); line-height: 1.65; margin: 0 0 14px; }
        .hm-about__text strong { color: var(--swc-chocolate); }
        .hm-about__collage { position: relative; display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 14px; border-radius: 26px; overflow: hidden; }
        .hm-collage__cell { margin: 0; min-height: clamp(240px, 30vw, 380px); overflow: hidden; background: var(--swc-coffee); }
        .hm-collage__cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
        /* cards coloridos sobrepostos na base da colagem (referência KV) */
        .hm-about__tags { position: absolute; left: clamp(16px, 2vw, 28px); right: clamp(16px, 2vw, 28px); bottom: clamp(16px, 2vw, 26px); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(12px, 1.4vw, 20px); z-index: 2; }
        .hm-card { position: relative; display: flex; align-items: flex-end; min-height: clamp(94px, 9vw, 128px); padding: clamp(15px, 1.5vw, 22px); border-radius: clamp(14px, 1.4vw, 20px); box-shadow: 0 14px 32px rgba(56, 22, 16, .30); }
        .hm-card__label { font-family: var(--font-display); font-weight: 800; font-size: clamp(16px, 1.7vw, 26px); line-height: 1.02; letter-spacing: -.01em; color: var(--swc-chocolate); }
        .hm-card__ic { position: absolute; top: clamp(11px, 1.2vw, 16px); right: clamp(11px, 1.2vw, 16px); display: inline-flex; align-items: center; justify-content: center; width: clamp(38px, 3.4vw, 48px); height: clamp(38px, 3.4vw, 48px); border-radius: clamp(11px, 1vw, 15px); flex: none; }
        .hm-card--coral { background: var(--swc-coral); }
        .hm-card--cyan { background: var(--swc-cyan); }
        .hm-card--yellow { background: var(--swc-yellow); }
        .hm-card--coral .hm-card__ic { background: var(--swc-yellow); color: var(--swc-chocolate); --ph-cut: var(--swc-yellow); }
        .hm-card--cyan .hm-card__ic { background: var(--swc-coral); color: #fff; --ph-cut: var(--swc-coral); }
        .hm-card--yellow .hm-card__ic { background: var(--swc-chocolate); color: var(--swc-coral); --ph-cut: var(--swc-chocolate); }
        @media (max-width: 760px) {
          .hm-about__head { grid-template-columns: 1fr; }
          .hm-about__collage { grid-template-columns: 1fr 1fr; }
          /* cards saem da sobreposição e descem para baixo das fotos */
          .hm-about__tags { position: static; left: auto; right: auto; bottom: auto; margin-top: 14px; }
          .hm-card { min-height: 0; }
          .hm-card__label { font-size: 16px; }
        }
        @media (max-width: 480px) {
          .hm-about__collage { grid-template-columns: 1fr; }
          .hm-about__tags { grid-template-columns: 1fr; }
        }

        .hm-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 28px; margin-bottom: 40px; }
        .hm-head h2 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(40px, 6vw, 84px); line-height: .96; letter-spacing: -.04em; margin: 14px 0 0; color: var(--ink); text-wrap: balance; }
        .hm-head > p { max-width: 460px; color: var(--ink-soft); line-height: 1.6; margin: 0; }

        /* StepCard v2 — card sticker, numeral display 900, acento por passo */
        .hm-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .hm-step { background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: 26px 24px; box-shadow: var(--shadow-md); transition: transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out); }
        .hm-step:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
        .hm-step__n { font-family: var(--font-display); font-weight: 900; font-size: clamp(46px, 5vw, 56px); line-height: 1; letter-spacing: -.03em; color: var(--coral); }
        .hm-step:nth-child(1) .hm-step__n { color: var(--coral); }
        .hm-step:nth-child(2) .hm-step__n { color: var(--pink); }
        .hm-step:nth-child(3) .hm-step__n { color: var(--cyan-deep); }
        .hm-step:nth-child(4) .hm-step__n { color: var(--yellow-deep); }
        .hm-step h3 { font-family: var(--font-heading); font-weight: 800; font-size: 20px; margin: 18px 0 0; color: var(--ink); }
        .hm-step p { color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: 10px 0 0; }

        /* StatBlock v2 — banda chocolate, valor display 900, top-rule por acento */
        .hm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px 28px; }
        .hm-stat { border: 0; border-top: 3px solid var(--coral); border-radius: 0; padding: 16px 0 0; background: transparent; }
        .hm-stat strong { display: block; font-family: var(--font-display); font-weight: 900; font-size: clamp(38px, 4.6vw, 60px); line-height: 1; letter-spacing: -.03em; color: var(--accent); white-space: nowrap; font-variant-numeric: tabular-nums; }
        .hm-stat > span { display: block; margin-top: 10px; color: var(--ink-soft); font-size: 13.5px; line-height: 1.35; }
        .hm-numbers { background: var(--choco); }
        .hm-numbers .hm-head h2 { color: var(--cream); }
        .hm-numbers .hm-head > p { color: rgba(255,241,230,.78); }
        .hm-numbers .hm-head .eyebrow { color: var(--pink); }
        .hm-numbers .hm-stat:nth-child(1) { border-top-color: var(--coral); }
        .hm-numbers .hm-stat:nth-child(2) { border-top-color: var(--pink); }
        .hm-numbers .hm-stat:nth-child(3) { border-top-color: var(--cyan); }
        .hm-numbers .hm-stat:nth-child(4) { border-top-color: var(--yellow); }
        .hm-numbers .hm-stat strong { color: var(--on); }
        /* Números em 2 colunas: esquerda título+texto, direita 4 cards (2x2) */
        .hm-numbers .wrap { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(28px, 5vw, 72px); align-items: start; }
        .hm-numbers .hm-head { display: block; margin-bottom: 0; }
        .hm-numbers .hm-head > p { margin-top: 18px; max-width: none; }
        .hm-numbers .hm-stats { grid-template-columns: 1fr; gap: 16px; }
        @media (max-width: 900px) { .hm-numbers .wrap { grid-template-columns: 1fr; } }

        /* Stat: espaçamento proporcional + label maior */
        .hm-numbers .hm-stat { border-top: 0; position: relative; --c: var(--coral); --on: var(--on-coral); background: var(--c); border: 0; border-radius: var(--r-lg); padding: 26px 24px; overflow: hidden; transition: transform var(--dur-base) var(--ease-out), filter var(--dur-base) var(--ease-out); }
        .hm-numbers .hm-stat:hover { transform: translateY(-3px); filter: brightness(1.06); }
        .hm-numbers .hm-stat:nth-child(1) { --c: var(--coral); --on: var(--on-coral); }
        .hm-numbers .hm-stat:nth-child(2) { --c: var(--pink); --on: var(--on-pink); }
        .hm-numbers .hm-stat:nth-child(3) { --c: var(--cyan); --on: var(--on-cyan); }
        .hm-numbers .hm-stat:nth-child(4) { --c: var(--yellow); --on: var(--on-yellow); }
        .hm-numbers .hm-stat strong { margin-bottom: 14px; }
        .hm-numbers .hm-stat > span { font-size: clamp(14.5px, 1.05vw, 17px); line-height: 1.5; margin-top: 12px; color: var(--on); opacity: .82; }

        .hm-numbers .hm-stat > span { color: rgba(255,241,230,.75); }

        /* Card v2 — pilar com top-rail de acento, superfície elevada */
        .hm-pillars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .hm-pillar { position: relative; overflow: hidden; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: 28px 22px 24px; box-shadow: var(--shadow-md); transition: transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out); }
        .hm-pillar:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
        .hm-pillar::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--coral); }
        .hm-pillar:nth-child(1)::before { background: var(--coral); }
        .hm-pillar:nth-child(2)::before { background: var(--pink); }
        .hm-pillar:nth-child(3)::before { background: var(--cyan); }
        .hm-pillar:nth-child(4)::before { background: var(--yellow); }
        .hm-pillar h3 { font-family: var(--font-heading); font-weight: 800; font-size: 22px; margin: 0; color: var(--ink); }
        .hm-pillar p { color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: 10px 0 0; }

        /* Realização v2 — banda cream-deep, 2 colunas editorial, Button sticker */
        .hm-cta-section { background: var(--cream-deep); }
        .hm-realizacao { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(28px, 5vw, 72px); align-items: start; }
        .hm-realizacao__head h2 { font-family: var(--font-display); font-weight: 800; font-size: clamp(38px, 5vw, 78px); line-height: .96; letter-spacing: -.04em; margin: 0; color: var(--ink); text-wrap: balance; }
        .hm-realizacao__body p { color: var(--ink-soft); font-size: clamp(15px, 1.15vw, 18px); line-height: 1.65; margin: 0 0 28px; max-width: 56ch; }
        .btn-sticker { box-shadow: var(--shadow-pop); transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out); }
        .btn-sticker:hover { transform: translateY(-2px); box-shadow: 0 9px 0 rgba(43,24,16,.20); }

        @media (max-width: 1180px) { .hm-steps, .hm-pillars, .hm-stats { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 900px) {
          .hm-hero__grid, .hm-feature__grid { grid-template-columns: 1fr; }
          .hm-head { flex-direction: column; align-items: flex-start; }
          .hm-realizacao { grid-template-columns: 1fr; gap: 18px; }
          .hm-feature__photo > figure { min-height: 340px; }
        }
        @media (max-width: 560px) {
          .hm-stats, .hm-steps, .hm-pillars { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
