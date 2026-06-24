import React from 'react'
import { I } from '../../components/icons'

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
          <span className="swc-hero__blob" aria-hidden="true"></span>
        </div>
      </section>

      {/* O QUE É — circuito de sabor: colagem de fotos reais + tags sticker */}
      <section className="section hm-about">
        <div className="wrap">
          <div className="hm-about__head">
            <h2>Um circuito de sabor,<br />cidade e comunidade.</h2>
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
              <span className="hm-tag hm-tag--coral">combos exclusivos<i className="hm-tag__ic"><I.heart width={16} height={16} /></i></span>
              <span className="hm-tag hm-tag--cyan">tema da edição<i className="hm-tag__ic"><I.heart width={16} height={16} /></i></span>
              <span className="hm-tag hm-tag--yellow">11 dias de festival<i className="hm-tag__ic"><I.heart width={16} height={16} /></i></span>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="section hm-steps-section" style={{ background: 'var(--bg-soft)' }}>
        <div className="wrap">
          <div className="hm-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>Como funciona</span>
              <h2>Do tema ao roteiro:<br />tudo começa com uma ideia.</h2>
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
      <section className="section hm-why">
        <div className="wrap">
          <div className="hm-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>O Sweet &amp; Coffee Week em números</span>
              <h2>Uma década movimentando<br />marcas, pessoas e memórias.</h2>
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
      <section className="section hm-why" style={{ background: 'var(--bg-soft)' }}>
        <div className="wrap">
          <div className="hm-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>Mais que um festival</span>
              <h2>O Sweet &amp; Coffee Week virou<br />uma tradição afetiva de Natal.</h2>
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

      {/* REALIZAÇÃO */}
      <section className="section hm-cta-section">
        <div className="wrap hm-cta">
          <div>
            <span className="eyebrow"><span className="dot"></span>Realização</span>
            <h2>Uma realização<br />da F2 Experience.</h2>
            <p>
              O Sweet &amp; Coffee Week é realizado pela F2 Experience, empresa especializada em criar
              experiências, campanhas, ativações e projetos que conectam marcas, pessoas e cidade. No
              festival, a F2 Experience assina a estratégia, a criação, a comunicação e o desenvolvimento
              como plataforma de marca, conteúdo, experiência e economia criativa.
            </p>
          </div>
          <div className="hm-cta__actions">
            <a
              href="https://www.f2experience.com.br"
              className="btn btn-primary btn-lg"
              target="_blank"
              rel="noopener noreferrer"
            >
              Conhecer a F2 Experience <I.arrow />
            </a>
          </div>
        </div>
      </section>

      <style>{`
        .hm { overflow: hidden; }

        /* HERO — split chocolate + foto, blob coral, CTAs (left-aligned;
           prefixo .hm vence a centralização global de .page-enter) */
        .hm .swc-hero { position: relative; min-height: calc(100vh - 1px); background: var(--swc-chocolate); overflow: hidden; isolation: isolate; }
        .hm .swc-hero, .hm .swc-hero * { text-align: left; }
        .hm .swc-hero__copy {
          position: relative; z-index: 2; width: 52%; min-height: calc(100vh - 1px); box-sizing: border-box;
          padding: clamp(40px, 6vw, 96px) clamp(28px, 3.5vw, 60px) clamp(40px, 6vw, 84px);
          display: flex; flex-direction: column; justify-content: center; background: var(--swc-chocolate);
          clip-path: polygon(0 0, 100% 0, 100% 5%, 93.5% 13%, 100% 23%, 94% 34%, 100% 45%, 93.5% 56%, 100% 67%, 94% 78%, 100% 89%, 100% 100%, 0 100%);
          animation: swcHeroIn .7s cubic-bezier(.2,.7,.2,1) both;
        }
        .hm .swc-hero__eyebrow {
          display: inline-block; width: fit-content; max-width: 100%;
          font-family: var(--font-display); font-style: italic; font-weight: 700;
          font-size: clamp(14px, 1.3vw, 19px); color: var(--swc-cream);
          padding-bottom: 12px; border-bottom: 3px solid var(--swc-yellow);
          margin: 0 0 clamp(22px, 3vw, 38px);
        }
        .hm .swc-hero__title {
          font-family: var(--font-display); font-weight: 700; color: var(--swc-cream);
          font-size: clamp(46px, 6.4vw, 104px); line-height: .92; letter-spacing: -.02em;
          margin: 0 0 clamp(22px, 3vw, 36px);
        }
        .hm .swc-hero__hl { color: var(--swc-coral); }
        .hm .swc-hero__line { display: block; animation: swcLineIn .65s cubic-bezier(.2,.7,.2,1) both; }
        .hm .swc-hero__line:nth-child(1) { animation-delay: .10s; }
        .hm .swc-hero__line:nth-child(2) { animation-delay: .22s; }
        .hm .swc-hero__line:nth-child(3) { animation-delay: .34s; }
        @keyframes swcLineIn { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }
        .hm .swc-hero__text { max-width: 42ch; }
        .hm .swc-hero__text p { color: rgba(254,240,221,.86); font-family: var(--font-sans); font-size: clamp(15px, 1.15vw, 18px); line-height: 1.6; margin: 0 0 16px; }
        .hm .swc-hero__photo { position: absolute; top: 0; right: 0; bottom: 0; width: 56%; z-index: 1; background: linear-gradient(135deg, #3D2417 0%, #6B3F22 55%, #2D1A0E 100%); overflow: hidden; }
        .hm .swc-hero__photo::after { content: ""; position: absolute; inset: 0; background-image: radial-gradient(circle at center, rgba(255,255,255,.10) 2.5px, transparent 3.5px); background-size: 40px 40px; opacity: .45; z-index: 1; }
        .hm .swc-hero__photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 2; }
        .hm .swc-hero__blob { position: absolute; top: -7%; right: -4%; width: clamp(150px, 18vw, 300px); height: clamp(150px, 18vw, 300px); background: url('/images/shapes/shape-flower-coral.svg') center/contain no-repeat; z-index: 3; animation: swcFloat 7s ease-in-out infinite; filter: drop-shadow(0 10px 24px rgba(0,0,0,.18)); }
        .hm .swc-hero__actions { position: absolute; right: clamp(22px, 3vw, 52px); bottom: clamp(92px, 13vh, 150px); z-index: 4; display: flex; flex-direction: column; align-items: flex-end; gap: 14px; }
        /* onda orgânica cream: hero (chocolate/foto) derrete na seção creme */
        .hm .swc-hero::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: clamp(54px, 7vw, 120px); background: url('/images/shapes/wave-cream-bottom.svg') bottom center / 100% 100% no-repeat; z-index: 5; pointer-events: none; }
        .hm .swc-hero__actions .btn { margin: 0 !important; box-shadow: 0 12px 30px rgba(0,0,0,.28); font-weight: 700; }
        @keyframes swcHeroIn { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
        @keyframes swcFloat { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(4deg); } }

        @media (max-width: 900px) {
          .hm .swc-hero { display: block; min-height: 0; }
          .hm .swc-hero__copy { width: 100%; min-height: 0; clip-path: none; padding: clamp(32px,7vw,56px) clamp(22px,6vw,40px) clamp(28px,6vw,44px); }
          .hm .swc-hero__actions { position: static; flex-direction: column; align-items: stretch; right: auto; bottom: auto; padding: 0 clamp(22px,6vw,40px) clamp(28px,7vw,40px); }
          .hm .swc-hero__actions .btn { width: 100%; justify-content: center; }
          .hm .swc-hero__photo { position: relative; width: 100%; height: 42vh; min-height: 280px; }
          .hm .swc-hero__blob { width: 120px; height: 120px; }
        }

        .hm-about { padding-top: clamp(38px, 5vw, 72px); }
        .hm-about__head { display: grid; grid-template-columns: 1.05fr 1fr; gap: clamp(28px, 5vw, 80px); align-items: end; margin-bottom: clamp(30px, 4vw, 54px); }
        .hm-about__head h2 { font-family: var(--font-display); font-weight: 700; font-size: clamp(38px, 5.6vw, 88px); line-height: .95; letter-spacing: -.03em; color: var(--swc-chocolate); margin: 0; }
        .hm-about__text p { color: var(--ink-soft); font-size: clamp(15px, 1.15vw, 18px); line-height: 1.65; margin: 0 0 14px; }
        .hm-about__text strong { color: var(--swc-chocolate); }
        .hm-about__collage { position: relative; display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 14px; border-radius: 26px; overflow: hidden; }
        .hm-collage__cell { margin: 0; min-height: clamp(240px, 30vw, 380px); overflow: hidden; background: var(--swc-coffee); }
        .hm-collage__cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hm-about__tags { position: absolute; left: clamp(16px, 2vw, 28px); bottom: clamp(16px, 2vw, 26px); display: flex; flex-wrap: wrap; gap: 12px; z-index: 2; }
        .hm-tag { display: inline-flex; align-items: center; gap: 12px; padding: 11px 11px 11px 20px; border-radius: 16px; font-family: var(--font-display); font-weight: 700; font-size: clamp(15px, 1.4vw, 20px); line-height: 1.05; color: #fff; box-shadow: 0 12px 28px rgba(56,22,16,.26); }
        .hm-tag--coral { background: var(--swc-coral); }
        .hm-tag--cyan { background: var(--swc-cyan); }
        .hm-tag--yellow { background: var(--swc-yellow); color: var(--swc-chocolate); }
        .hm-tag__ic { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 11px; flex: none; }
        .hm-tag--coral .hm-tag__ic { background: var(--swc-yellow); color: var(--swc-chocolate); }
        .hm-tag--cyan .hm-tag__ic { background: var(--swc-coral); color: #fff; }
        .hm-tag--yellow .hm-tag__ic { background: var(--swc-chocolate); color: var(--swc-cream); }
        @media (max-width: 760px) {
          .hm-about__head { grid-template-columns: 1fr; }
          .hm-about__collage { grid-template-columns: 1fr 1fr; }
          .hm-tag { font-size: 14px; padding: 9px 9px 9px 16px; gap: 9px; }
          .hm-tag__ic { width: 28px; height: 28px; border-radius: 9px; }
        }
        @media (max-width: 480px) { .hm-about__collage { grid-template-columns: 1fr; } }

        .hm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .hm-stat { border: 1px solid var(--line); border-radius: 22px; padding: 26px 24px; background: var(--bg-card); }
        .hm-stat strong { display: block; font-family: var(--font-serif); font-size: clamp(34px, 3.4vw, 52px); line-height: 1; color: var(--accent); }
        .hm-stat span { display: block; margin-top: 8px; color: var(--ink-soft); font-size: 13.5px; line-height: 1.35; }

        .hm-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 28px; margin-bottom: 40px; }
        .hm-head h2 { font-family: var(--font-serif); font-size: clamp(40px, 6vw, 84px); line-height: .96; letter-spacing: -.04em; margin: 14px 0 0; color: var(--ink); }
        .hm-head > p { max-width: 460px; color: var(--ink-soft); line-height: 1.6; margin: 0; }

        .hm-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .hm-step { background: var(--bg-card); border: 1px solid var(--line); border-radius: 24px; padding: 26px 24px; }
        .hm-step__n { font-family: var(--font-serif); font-size: 44px; line-height: 1; color: var(--accent); }
        .hm-step h3 { font-size: 20px; margin: 20px 0 0; color: var(--ink); }
        .hm-step p { color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: 10px 0 0; }

        .hm-pillars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .hm-pillar { border-top: 2px solid var(--accent); padding: 18px 0 0; }
        .hm-pillar h3 { font-family: var(--font-serif); font-size: 24px; margin: 0; color: var(--ink); }
        .hm-pillar p { color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: 10px 0 0; }

        .hm-cta { background: linear-gradient(135deg, var(--bg-card), var(--bg-soft)); border: 1px solid var(--line); border-radius: 32px; padding: clamp(34px, 5vw, 70px); display: flex; justify-content: space-between; align-items: center; gap: 28px; }
        .hm-cta h2 { font-family: var(--font-serif); font-size: clamp(38px, 5vw, 78px); line-height: .96; letter-spacing: -.04em; margin: 12px 0 0; color: var(--ink); }
        .hm-cta p { color: var(--ink-soft); max-width: 56ch; line-height: 1.65; margin-top: 14px; }
        .hm-cta__actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: flex-end; }

        @media (max-width: 1180px) { .hm-steps, .hm-pillars, .hm-stats { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 900px) {
          .hm-hero__grid, .hm-feature__grid { grid-template-columns: 1fr; }
          .hm-head, .hm-cta { flex-direction: column; align-items: flex-start; }
          .hm-feature__photo > figure { min-height: 340px; }
        }
        @media (max-width: 560px) {
          .hm-stats, .hm-steps, .hm-pillars { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
