/*
 * PÁGINA-MÃE DO INSTITUCIONAL — "O Festival".
 * Referência principal do sistema institucional do Sweet & Coffee Week:
 * define o padrão visual, editorial e estrutural das demais páginas
 * (Edições, Curiosidades, Participar, Apoiar, Contato).
 * Antes de propor/replicar mudanças em outras páginas, ler:
 *   src/design/SITE_DIRECTION.md
 */
import React from 'react'
import { I } from '../../components/icons'
import { useVisualOverride } from '../../design/useVisualOverride'
import { VisualRefinementProvider } from '../../design/VisualRefinementProvider'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'
import { PhotoRotator } from '../../components/PhotoRotator'
import { heroGalleryImages, aboutGalleryImages } from '../../data/homeGalleries'

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
  { n: '01', t: 'Tema da edição', k: 'Cria direção', d: 'Tudo começa com um universo criativo. O tema inspira sabores, nomes, vitrines, embalagens, experiências e conteúdos.' },
  { n: '02', t: 'Combos exclusivos', k: 'Movimenta marcas', d: 'Os participantes transformam o tema em um combo especial com doce, salgado e bebida — criado por tempo limitado para a edição.' },
  { n: '03', t: 'Rota pela cidade', k: 'Ativa Natal', d: 'O público descobre endereços, visita lojas, compartilha experiências e faz a cidade circular em torno do festival.' },
  { n: '04', t: 'Sweet Awards', k: 'Forma comunidade', d: 'Depois de provar, os Sweet Lovers avaliam os destaques da edição e ajudam a reconhecer os melhores combos, sabores e experiências.' },
]

const STATS = [
  { to: 16,  prefix: '',  suffix: '',    l: 'edições' },
  { to: 34,  prefix: '+', suffix: 'mil', l: 'combos vendidos' },
  { to: 712, prefix: '+R$ ', suffix: ' mil', l: 'movimentados diretamente' },
  { to: 10,  prefix: '+', suffix: 'mi',  l: 'visualizações no Instagram' },
]

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

  // Motion System — revela seções/cards ao entrarem na viewport (IntersectionObserver).
  const rootRef = React.useRef(null)
  useRevealOnScroll(rootRef)

  // Visual Refinement Mode — overrides lidos de visualOverrides.json (no-op se vazio).
  const ovHeroTitle = useVisualOverride('home.hero.title')
  const ovHeroText = useVisualOverride('home.hero.text')
  const ovHeroPhoto = useVisualOverride('home.hero.photo')
  const ovAboutTitle = useVisualOverride('home.about.title')
  const ovAboutText = useVisualOverride('home.about.text')
  const ovAboutCollage = useVisualOverride('home.about.collage')
  const ovAboutHeart = useVisualOverride('home.about.heart')
  const ovProcess = useVisualOverride('home.process.section')
  const ovStats = useVisualOverride('home.stats.section')
  const ovRealizacao = useVisualOverride('home.realizacao.section')

  return (
    <div className="page-enter hm" ref={rootRef}>
      {/* HERO — nova direção visual (referência campanha) */}
      <section className="swc-hero">
        <div className="swc-hero__splat" aria-hidden="true">
          <span className="swc-hero__splat__shape" />
        </div>

        <div className="swc-hero__photo" {...ovHeroPhoto}>
          <PhotoRotator images={heroGalleryImages} interval={5200} eager className="swc-hero__rotator" />
        </div>

        <div className="swc-hero__copy">
          <h1 className="swc-hero__title" {...ovHeroTitle}>
            <span className="swc-hero__line">O festival mais</span>
            <span className="swc-hero__line"><span className="swc-hero__hl">doce</span> de Natal.</span>
          </h1>
          <div className="swc-hero__text" {...ovHeroText}>
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
      </section>

      {/* NÚMEROS */}
      <section className="section hm-why hm-numbers" {...ovStats}>
        <div className="wrap">
          <div className="hm-numbers__head motion-reveal-up">
            <h2>Números que contam uma <span className="keep-together"><span className="hl-w">história</span>.</span></h2>
          </div>
          <div className="hm-stats motion-stagger">
            {STATS.map((s) => (
              <div className="hm-stat" key={s.l}>
                <strong><CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} /></strong>
                <span>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O QUE É — circuito de sabor: colagem de fotos reais + tags sticker */}
      <section className="section hm-about">
        <div className="wrap hm-about__grid">
          <div className="hm-about__head motion-reveal-up">
            <h2 {...ovAboutTitle}>Um circuito de <span className="keep-together"><span className="hl-w" style={{ '--hl': 'var(--yellow)' }}>sabor</span>,</span> <span className="hl-w" style={{ '--hl': 'var(--cyan)' }}>cidade</span> e <span className="keep-together"><span className="hl-w" style={{ '--hl': 'var(--pink)' }}>comunidade</span>.</span></h2>
            <div className="hm-about__text" {...ovAboutText}>
              <p>
                O Sweet &amp; Coffee Week nasceu em Natal para aproximar o público das marcas locais por
                meio de uma experiência simples, criativa e altamente compartilhável.
              </p>
              <p>
                O formato clássico reúne <strong>1 doce + 1 salgado + 1 bebida</strong> em um combo criado
                especialmente para o tema da edição. Mais do que cardápio, o festival movimenta a cidade,
                ativa vitrines, gera conteúdo e transforma cada visita em memória.
              </p>
            </div>
          </div>

          <div className="hm-about__media" {...ovAboutCollage}>
            <div className="hm-about__photo motion-image-reveal">
              <PhotoRotator images={aboutGalleryImages} interval={6800} className="hm-about__rotator" />
            </div>
            <span className="hm-about__heart" aria-hidden="true" {...ovAboutHeart}>
              <img src="/images/shapes/shape-heart-yellow.svg" alt="" />
            </span>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="section hm-steps-section" {...ovProcess}>
        <div className="wrap">
          <div className="hm-head motion-reveal-up">
            <h2>Do tema à <span className="keep-together"><span className="hl-w" style={{ '--hl': 'var(--cyan)' }}>memória</span>:</span> como o festival movimenta a cidade.</h2>
            <p>Cada edição nasce de uma ideia criativa, ganha forma nos combos dos participantes e se espalha por Natal como uma rota de sabores, encontros e descobertas.</p>
          </div>
          <div className="hm-steps motion-stagger">
            {STEPS.map((s) => (
              <article className="hm-step" key={s.n}>
                <span className="hm-step__n">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
                <span className="hm-step__k">{s.k}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CAMINHOS INSTITUCIONAIS — ponte para Participar / Apoiar */}
      <section className="section hm-paths">
        <div className="wrap">
          <div className="hm-head motion-reveal-up">
            <h2>Faça parte das <span className="keep-together"><span className="hl-w" style={{ '--hl': 'var(--coral)' }}>próximas edições</span>.</span></h2>
            <p>O Sweet &amp; Coffee Week é construído junto com marcas, estabelecimentos e parceiros que acreditam na força das experiências locais.</p>
          </div>
          <div className="hm-paths__grid motion-stagger">
            <article className="hm-path">
              <span className="hm-path__eyebrow">Para estabelecimentos</span>
              <h3>Quer colocar sua marca na rota?</h3>
              <p>Se você tem uma cafeteria, doceria, confeitaria, restaurante ou marca autoral e quer participar das próximas edições, esse é o caminho para apresentar seu interesse e entender como o festival funciona.</p>
              <a className="hm-path__cta motion-press" href="#/participar" onClick={go('/participar')}>
                Quero participar <I.arrow />
              </a>
            </article>
            <article className="hm-path">
              <span className="hm-path__eyebrow">Para marcas e parceiros</span>
              <h3>Quer apoiar o festival?</h3>
              <p>Empresas, instituições e marcas parceiras podem se conectar ao Sweet &amp; Coffee Week por meio de patrocínio, ativações, conteúdo, brindes, experiências e presença nos pontos participantes.</p>
              <a className="hm-path__cta motion-press" href="#/apoiar" onClick={go('/apoiar')}>
                Quero apoiar <I.arrow />
              </a>
            </article>
          </div>
        </div>
      </section>

      {/* REALIZAÇÃO — assinatura na identidade da F2 Experience */}
      <section className="section hm-f2" {...ovRealizacao}>
        <div className="wrap hm-f2__inner motion-reveal">
          <div className="hm-f2__brandrow">
            <span className="hm-f2__eyebrow">Realização</span>
            <a
              className="hm-f2__brand"
              href="https://www.f2experience.com.br"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="F2 Experience"
            >
              <img src="/images/logo-f2experience.svg" alt="F2 Experience" />
            </a>
          </div>
          <div className="hm-f2__grid">
            <h2 className="hm-f2__title">
              Há mais de 20 anos transformando <em>estratégia</em> em criatividade.
            </h2>
            <div className="hm-f2__col">
              <p className="hm-f2__text">
                O Sweet &amp; Coffee Week é uma realização da F2 Experience — live marketing que
                conecta marcas, pessoas e cidade. A F2 assina estratégia, criação, comunicação e
                desenvolvimento do festival.
              </p>
              <a
                className="hm-f2__cta motion-press"
                href="https://www.f2experience.com.br"
                target="_blank"
                rel="noopener noreferrer"
              >
                Conhecer a F2 Experience <I.arrow />
              </a>
            </div>
          </div>
          <span className="hm-f2__spectrum" aria-hidden="true" />
        </div>
      </section>

      <style>{`
        .hm { overflow-x: clip; }

        /* Antipontuação órfã: agrupa palavra-destaque + sua pontuação numa
           unidade que não quebra. Usar SÓ em grupos curtos (palavra+sinal),
           nunca em frase inteira — senão causa overflow. O espaço fica fora
           do wrapper, então a quebra natural entre grupos é preservada. */
        .hm .keep-together { white-space: nowrap; }

        /* HERO — split chocolate + foto, blob coral, CTAs (left-aligned;
           prefixo .hm vence a centralização global de .page-enter) */
        .hm .swc-hero { position: relative; min-height: calc(100dvh - 1px); background: #381610; overflow: visible; isolation: isolate; z-index: 2; }
        /* degradê top-down na seção toda: escurece o topo (menu legível em toda a largura) e revela a foto embaixo */
        /* overlay marrom sobre a foto full-bleed: legibilidade do menu (topo) e do texto */
        .hm .swc-hero::after { content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(to bottom, rgba(43,24,16,.82) 0%, rgba(43,24,16,.5) 28%, rgba(43,24,16,.5) 68%, rgba(43,24,16,.74) 100%); }
        .hm .hm-about { position: relative; z-index: 3; }
        /* respingo de chocolate ancorado no topo-esquerdo, vazando o canto (atrás da logo) */
        .hm .swc-hero__splat { position: absolute; top: clamp(-300px, -22vw, -180px); left: clamp(-210px, -15vw, -120px); width: clamp(440px, 48vw, 720px); z-index: 2; pointer-events: none; color: #6a2c15; }
        /* Respingo recolorido via máscara (cor controlável por token) + rotação
           bem devagar. Coral destaca do marrom/creme dos logos sem brigar. */
        .hm .swc-hero__splat__shape {
          display: block; width: 100%; aspect-ratio: 1212.59 / 1201.31;
          background: var(--yellow, #F4B43C);
          -webkit-mask: url(/images/shapes/shape-seal-choco.svg) center / contain no-repeat;
          mask: url(/images/shapes/shape-seal-choco.svg) center / contain no-repeat;
          filter: drop-shadow(0 18px 44px rgba(43,24,16,.45));
          transform-origin: 50% 50%;
          animation: splatSpin 100s linear infinite;
        }
        @keyframes splatSpin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .hm .swc-hero__splat__shape { animation: none; } }
        .hm .swc-hero, .hm .swc-hero * { text-align: center; }
        .hm .swc-hero__copy {
          position: relative; z-index: 4; width: 100%; max-width: 920px; margin: 0 auto; min-height: calc(100dvh - 1px); box-sizing: border-box;
          padding: clamp(96px, 12vw, 160px) clamp(24px, 6vw, 64px) clamp(48px, 7vw, 96px);
          display: flex; flex-direction: column; justify-content: center; align-items: center;
          background: transparent;
          animation: swcHeroIn .7s cubic-bezier(.2,.7,.2,1) both;
        }
        .hm .swc-hero__eyebrow {
          display: inline-block; width: fit-content; max-width: 100%; white-space: nowrap;
          font-family: var(--font-display); font-style: italic; font-weight: 700;
          font-size: clamp(14px, 1.3vw, 18px); color: var(--swc-cream);
          padding-bottom: 0; border-bottom: 0;
          margin: 0 0 clamp(22px, 3vw, 38px);
        }
        .hm .swc-hero__eyebrow::after {
          content: ""; display: block; width: clamp(120px, 13vw, 188px);
          height: 5px; border-radius: 3px; background: var(--swc-yellow); margin-top: 12px;
        }
        .hm .swc-hero__title {
          font-family: var(--font-display); font-weight: 700; color: var(--swc-cream);
          font-size: clamp(44px, 6vw, 96px); line-height: .98; letter-spacing: -.02em;
          margin: 0 0 clamp(24px, 3vw, 40px); text-wrap: balance;
        }
        .hm .swc-hero__hl { position: relative; color: var(--pink); }
        .hm .swc-hero__hl::after { content: ''; position: absolute; left: 0; right: 0; bottom: .02em; height: .11em; border-radius: 4px; background: var(--swc-yellow); }
        /* Destaque único de palavra nos títulos: itálico, cor sólida + sublinhado
           que desenha uma vez e fica. Cor por seção via --hl inline. */
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
        .hm .swc-hero__text { max-width: 60ch; margin: 0 auto; }
        .hm .swc-hero__text p { color: rgba(254,240,221,.9); font-family: var(--font-sans); font-size: clamp(16px, 1.3vw, 20px); line-height: 1.45; margin: 0 0 16px; }
        /* foto de fundo full-bleed cobrindo o hero inteiro */
        .hm .swc-hero__photo { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
        .hm .swc-hero__photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        /* Galeria do hero a 50% — suaviza o fundo sob o título (about fica 100%) */
        .hm .swc-hero__rotator { opacity: .5; }
        .hm .swc-hero__actions { position: absolute; right: var(--hm-gutter); bottom: clamp(92px, 13vh, 150px); z-index: 4; display: flex; flex-direction: column; align-items: flex-end; gap: 14px; }
        .hm .swc-hero__actions .btn { margin: 0 !important; box-shadow: 0 12px 30px rgba(0,0,0,.28); font-weight: 700; }
        @keyframes swcHeroIn { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
        @keyframes swcFloat { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(4deg); } }

        @media (max-width: 900px) {
          .hm .swc-hero__copy { max-width: none; padding: clamp(120px,30vw,150px) clamp(22px,7vw,32px) clamp(48px,12vw,72px); }
        }

        .hm .hm-about { background: #381610; }
        .hm-about__grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(32px, 5vw, 72px); align-items: center; }
        .hm-about__head { display: block; max-width: none; margin: 0; text-align: left; }
        .hm-about__head h2 { font-family: var(--font-heading); font-weight: 800; font-size: var(--fs-display-md); line-height: .96; letter-spacing: -.04em; color: var(--cream); margin: 0 0 var(--sp-5); text-wrap: balance; }
        .hm-about__text { max-width: 52ch; margin: 0; }
        .hm-about__text p { color: rgba(255,241,230,.85); font-size: var(--fs-lead); line-height: 1.4; margin: 0 0 var(--sp-4); text-wrap: pretty; }
        .hm-about__text strong { color: var(--cream); }
        .hm-about__media { position: relative; }
        .hm-about__photo { width: 100%; aspect-ratio: 1 / 1; -webkit-mask: var(--mask-badge) center / contain no-repeat; mask: var(--mask-badge) center / contain no-repeat; }
        .hm-about__photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        /* Coração ancorado no canto inferior-esquerdo da mídia, 37% da largura dela
           (responsivo: % relativo a .hm-about__media). Ajuste fino aprovado no Visual Refinement. */
        .hm-about__heart { position: absolute; left: 0; bottom: 0; width: 37%; color: var(--yellow); filter: drop-shadow(0 8px 18px rgba(43,24,16,.4)); }
        .hm-about__heart img { display: block; width: 100%; height: auto; }
        @media (max-width: 860px) { .hm-about__grid { grid-template-columns: 1fr; gap: var(--sp-7); } .hm-about__media { max-width: 420px; margin: 0 auto; } }
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

        .hm-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 820px; margin: 0 auto var(--sp-8); }
        .hm-head h2 { font-family: var(--font-heading); font-weight: 800; font-size: var(--fs-display-md); line-height: .96; letter-spacing: -.04em; margin: 0; color: var(--ink); text-wrap: balance; }
        .hm-head > p { max-width: 60ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0 auto; text-wrap: pretty; }
        /* banda marrom (steps): texto creme */
        .hm .hm-steps-section { background: #5e3018; }
        .hm-steps-section .hm-head h2 { color: var(--cream); }
        .hm-steps-section .hm-head > p { color: rgba(255,241,230,.82); }

        /* StepCard — card sticker, numeral display 900, acento por passo */
        .hm-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--sp-4); }
        .hm-step { container-type: inline-size; display: flex; flex-direction: column; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6); box-shadow: var(--shadow-md); transition: transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out); }
        .hm-step:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
        .hm-step__n { display: inline-block; align-self: flex-start; padding-bottom: var(--sp-2); border-bottom: 3px solid currentColor; font-family: var(--font-display); font-weight: 900; font-size: clamp(44px, 12cqi, 56px); line-height: 1; letter-spacing: -.03em; color: var(--coral); }
        .hm-step:nth-child(1) .hm-step__n { color: var(--coral); }
        .hm-step:nth-child(2) .hm-step__n { color: var(--pink); }
        .hm-step:nth-child(3) .hm-step__n { color: var(--cyan-deep); }
        .hm-step:nth-child(4) .hm-step__n { color: var(--yellow-deep); }
        .hm-step h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(18px, 5cqi, 22px); margin: var(--sp-4) 0 0; color: var(--ink); }
        .hm-step p { color: var(--ink-soft); font-size: clamp(13.5px, 3.6cqi, 15px); line-height: 1.4; margin: var(--sp-3) 0 var(--sp-5); }
        .hm-step__k { align-self: flex-start; margin-top: auto; padding: 4px 11px; border-radius: 999px; background: var(--coral); color: #fff; font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
        .hm-step:nth-child(1) .hm-step__k { background: var(--coral); color: #fff; }
        .hm-step:nth-child(2) .hm-step__k { background: var(--pink); color: #fff; }
        .hm-step:nth-child(3) .hm-step__k { background: var(--cyan-deep); color: #fff; }
        .hm-step:nth-child(4) .hm-step__k { background: var(--yellow-deep); color: #3a1d10; }

        /* StatBlock v2 — banda chocolate, valor display 900, top-rule por acento */
        .hm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px 28px; }
        .hm-stat { border: 0; border-top: 3px solid var(--coral); border-radius: 0; padding: 16px 0 0; background: transparent; }
        .hm-stat strong { display: block; font-family: var(--font-display); font-weight: 900; font-size: clamp(38px, 4.6vw, 60px); line-height: 1; letter-spacing: -.03em; color: var(--accent); white-space: nowrap; font-variant-numeric: tabular-nums; }
        .hm-stat > span { display: block; margin-top: 10px; color: var(--ink-soft); font-size: 13.5px; line-height: 1.35; }
        /* ritmo vertical = .section padrão (mesma altura das outras bandas; consistência) */
        .hm .hm-numbers { background: #5e3018; }
        .hm-numbers__head { text-align: center; margin: 0 auto var(--sp-7); }
        .hm-numbers__head h2 { color: var(--cream); font-family: var(--font-heading); font-weight: 800; font-size: var(--fs-display-md); line-height: .98; letter-spacing: -.04em; margin: 0 auto; text-wrap: balance; }
        .hm-numbers .hm-stat:nth-child(1) { border-top-color: var(--coral); }
        .hm-numbers .hm-stat:nth-child(2) { border-top-color: var(--pink); }
        .hm-numbers .hm-stat:nth-child(3) { border-top-color: var(--cyan); }
        .hm-numbers .hm-stat:nth-child(4) { border-top-color: var(--yellow); }
        .hm-numbers .hm-stat strong { color: var(--on); }
        /* Números em 2 colunas: esquerda título+texto, direita 4 cards (2x2) */
        .hm-numbers .wrap { display: block; }
        .hm-numbers .hm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); }
        @media (max-width: 760px) { .hm-numbers .hm-stats { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 420px) { .hm-numbers .hm-stats { grid-template-columns: 1fr; } }

        /* Stat card colorido — texto contraste-safe por card (--on) */
        .hm-numbers .hm-stat { border-top: 0; position: relative; container-type: inline-size; --c: var(--coral); --on: var(--on-coral); background: var(--c); border: 0; border-radius: var(--r-lg); padding: var(--sp-5) var(--sp-5) var(--sp-6); min-width: 0; min-height: clamp(148px, 12vw, 178px); overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; gap: var(--sp-3); box-shadow: 0 6px 16px rgba(43,24,16,.14); transition: transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out); }
        .hm-numbers .hm-stat:hover { transform: translateY(-4px); box-shadow: 0 18px 36px rgba(43,24,16,.26); }
        .hm-numbers .hm-stat:nth-child(1) { --c: var(--yellow); --on: var(--on-yellow); }
        .hm-numbers .hm-stat:nth-child(2) { --c: var(--pink);   --on: var(--on-pink); }
        .hm-numbers .hm-stat:nth-child(3) { --c: var(--cyan);   --on: var(--choco); }
        .hm-numbers .hm-stat:nth-child(4) { --c: var(--yellow); --on: var(--on-yellow); }
        .hm-numbers .hm-stat__k { align-self: flex-start; font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; font-style: normal; color: var(--on); opacity: .68; margin-bottom: var(--sp-4); }
        .hm-numbers .hm-stat strong { font-size: clamp(34px, 15cqi, 52px); line-height: .9; letter-spacing: -.035em; margin: 0; max-width: 100%; color: var(--on); }
        .hm-numbers .hm-stat > span { font-size: clamp(15px, 4.6cqi, 18px); line-height: 1.3; margin: 0; max-width: 95%; color: var(--on); opacity: 1; font-weight: 700; text-wrap: pretty; }

        /* Card — pilar com top-rail de acento, superfície elevada */
        .hm-pillars { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--sp-4); }
        .hm-pillar { position: relative; overflow: hidden; container-type: inline-size; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6); box-shadow: var(--shadow-md); transition: transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out); }
        .hm-pillar:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
        .hm-pillar::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--coral); }
        .hm-pillar:nth-child(1)::before { background: var(--coral); }
        .hm-pillar:nth-child(2)::before { background: var(--pink); }
        .hm-pillar:nth-child(3)::before { background: var(--cyan); }
        .hm-pillar:nth-child(4)::before { background: var(--yellow); }
        .hm-pillar h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(18px, 5cqi, 22px); margin: 0; color: var(--ink); }
        .hm-pillar p { color: var(--ink-soft); font-size: clamp(13.5px, 3.6cqi, 15px); line-height: 1.4; margin: var(--sp-3) 0 0; }

        /* CAMINHOS INSTITUCIONAIS — ponte Participar/Apoiar. Banda #381610
           (entre steps #5e3018 e F2 #000): degradê descendente até o preto.
           Cards cream sobre escuro, mesma linguagem dos step cards. */
        .hm .hm-paths { background: #381610; }
        /* banda escura: head em creme (igual steps) — senão o texto some no fundo */
        .hm-paths .hm-head h2 { color: var(--cream); }
        .hm-paths .hm-head > p { color: rgba(255, 241, 230, .82); }
        .hm-paths__grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-5); }
        .hm-path { display: flex; flex-direction: column; align-items: flex-start; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-7); box-shadow: var(--shadow-md); transition: transform var(--motion-base) var(--ease-out-soft), box-shadow var(--motion-base) var(--ease-out-soft); }
        .hm-path:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .hm-path__eyebrow { font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); margin: 0 0 var(--sp-4); }
        .hm-path h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(20px, 2.4vw, 28px); line-height: 1.05; letter-spacing: -.02em; color: var(--ink); margin: 0 0 var(--sp-3); text-wrap: balance; }
        .hm-path p { color: var(--ink-soft); font-size: clamp(14.5px, 1vw, 16px); line-height: 1.45; margin: 0 0 var(--sp-6); text-wrap: pretty; }
        .hm-path__cta { align-self: flex-start; margin-top: auto; display: inline-flex; align-items: center; gap: 9px; padding: 12px 22px; border-radius: 999px; background: var(--accent); color: #fff; font-family: var(--font-sans); font-weight: 700; font-size: 14px; letter-spacing: .02em; transition: transform var(--motion-fast) var(--ease-out-soft), filter var(--motion-fast) var(--ease-out-soft); }
        .hm-path__cta:hover { transform: translateY(-2px); filter: brightness(1.06); }
        .hm-path__cta svg { width: 16px; height: 16px; }
        /* Coluna 2 (apoiar) muda o acento para cyan-deep — diferencia os dois caminhos */
        .hm-path:nth-child(2) .hm-path__eyebrow { color: var(--cyan-deep); }
        .hm-path:nth-child(2) .hm-path__cta { background: var(--cyan-deep); }
        @media (max-width: 760px) { .hm-paths__grid { grid-template-columns: 1fr; } }

        /* REALIZAÇÃO — assinatura na identidade da F2 Experience.
           Corte duro para a "pele" da F2: fundo preto, Helvetica Extended,
           acentos magenta/violeta/verde e o espectro de marca da F2. */
        @font-face { font-family: 'Helvetica Ext'; src: url('/fonts/helvetica-ext/HelveticaExtThn.woff2') format('woff2'); font-weight: 100; font-style: normal; font-display: swap; }
        @font-face { font-family: 'Helvetica Ext'; src: url('/fonts/helvetica-ext/HelveticaExt.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
        @font-face { font-family: 'Helvetica Ext'; src: url('/fonts/helvetica-ext/HelveticaExtBd.woff2') format('woff2'); font-weight: 700; font-style: normal; font-display: swap; }
        @font-face { font-family: 'Helvetica Ext'; src: url('/fonts/helvetica-ext/HelveticaExtBlk.woff2') format('woff2'); font-weight: 900; font-style: normal; font-display: swap; }

        .hm .hm-f2 { background: #000; --f2-magenta: #E50053; --f2-violet: #512FB9; --f2-green: #05D975; padding-block: clamp(48px, 6.5vw, 84px); }
        .hm-f2__inner { max-width: 1080px; margin: 0 auto; display: flex; flex-direction: column; gap: clamp(20px, 2.6vw, 30px); text-align: left; font-family: 'Helvetica Ext', 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        .hm-f2__brandrow { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
        .hm-f2__brand { display: block; line-height: 0; }
        .hm-f2__brand img { width: clamp(140px, 17vw, 200px); height: auto; }
        .hm-f2__eyebrow { font-size: clamp(10px, .85vw, 12px); font-weight: 700; letter-spacing: .4em; text-transform: uppercase; color: #fff; opacity: .42; }
        .hm-f2__grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: clamp(28px, 4vw, 56px); align-items: end; }
        .hm-f2__title { margin: 0; font-weight: 100; font-size: clamp(26px, 3.5vw, 46px); line-height: 1.05; letter-spacing: -.015em; color: #fff; }
        .hm-f2__title em { font-style: normal; font-weight: 900; color: var(--f2-magenta); }
        .hm-f2__col { display: flex; flex-direction: column; align-items: flex-start; gap: 16px; }
        .hm-f2__text { margin: 0; max-width: 46ch; font-weight: 300; font-size: clamp(14px, 1.15vw, 16px); line-height: 1.5; color: rgba(255,255,255,.68); }
        .hm-f2__cta { display: inline-flex; align-items: center; gap: 9px; padding: 12px 22px; background: var(--f2-magenta); color: #fff; font-weight: 700; font-size: clamp(12px, 1vw, 14px); letter-spacing: .04em; text-transform: uppercase; transition: background .2s ease, transform .2s ease, color .2s ease; }
        .hm-f2__cta:hover { background: #fff; color: #000; transform: translateX(4px); }
        .hm-f2__cta svg { width: 16px; height: 16px; }
        .hm-f2__spectrum { width: 100%; max-width: 260px; height: 5px; background-image: linear-gradient(90deg, var(--f2-magenta), var(--f2-violet), var(--f2-green), var(--f2-magenta), var(--f2-violet), var(--f2-green), var(--f2-magenta)); background-size: 200% 100%; animation: f2Spectrum 4s linear infinite; }
        @keyframes f2Spectrum { from { background-position: 0% 0; } to { background-position: 100% 0; } }
        @media (max-width: 760px) { .hm-f2__grid { grid-template-columns: 1fr; gap: 20px; align-items: start; } }
        @media (prefers-reduced-motion: reduce) { .hm-f2__cta { transition: none; } .hm-f2__spectrum { animation: none; } }
        .btn-sticker { box-shadow: var(--shadow-pop); transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out); }
        .btn-sticker:hover { transform: translateY(-2px); box-shadow: 0 9px 0 rgba(43,24,16,.20); }

        /* Grids de card reflui sozinho via auto-fit; sem breakpoints rígidos. */
        @media (max-width: 900px) {
          .hm-head { flex-direction: column; align-items: flex-start; }
          .hm-realizacao { grid-template-columns: 1fr; gap: var(--sp-6); }
        }
        /* Celular: card ocupa a largura toda (evita coluna estreita demais) */
        @media (max-width: 520px) {
          .hm-steps, .hm-pillars { grid-template-columns: 1fr; }
        }

        /* Reveal de seções/cards agora é observer-driven (useRevealOnScroll +
           classes .motion-reveal*/.motion-stagger do motion-system.css).
           O bloco scroll-driven (@supports animation-timeline) foi removido para
           não animar duas vezes. */

        /* Acessibilidade: sem movimento → conteúdo estático, sublinhado já desenhado */
        @media (prefers-reduced-motion: reduce) {
          .hm .swc-hero__copy,
          .hm .swc-hero__line { animation: none; opacity: 1; transform: none; }
          .hm .hl-w::after { animation: none; transform: scaleX(1); }
        }
      `}</style>

      <VisualRefinementProvider page="home" />
    </div>
  )
}
