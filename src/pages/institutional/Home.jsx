import React from 'react'
import { I } from '../../components/icons'
import { PhotoRotator } from '../../components/PhotoRotator'
import { heroGalleryImages, aboutGalleryImages } from '../../data/homeGalleries'
import { festivalFacts } from '../../data/festivalFacts'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'

const PATHS = [
  {
    id: 'marcas',
    title: 'Leve sua marca para a rota.',
    text: 'Crie um combo autoral, encontre novos públicos e faça parte da próxima edição.',
    action: 'Quero participar',
    route: '/participar',
    audience: 'Para marcas',
  },
  {
    id: 'lovers',
    title: 'Descubra a cidade provando.',
    text: 'Cada edição convida o público a visitar, experimentar, compartilhar e voltar.',
    action: 'Conhecer as edições',
    route: '/edicoes',
    audience: 'Para quem explora',
  },
  {
    id: 'parceiros',
    title: 'Apoie uma cidade em movimento.',
    text: 'Associe sua marca a uma experiência que conecta gastronomia, cultura e economia criativa.',
    action: 'Quero apoiar',
    route: '/apoiar',
    audience: 'Para parceiros',
  },
]

const STAGES = [
  ['01', 'Um tema abre a conversa', 'Cada edição nasce de um universo que inspira sabores, vitrines e histórias.'],
  ['02', 'As marcas criam o percurso', 'Os participantes transformam a ideia em combos exclusivos por tempo limitado.'],
  ['03', 'Natal sai para provar', 'A rota leva o público a novos endereços, encontros e descobertas.'],
  ['04', 'A memória continua', 'Sweet Lovers, marcas e Sweet Awards deixam cada edição viva depois da última visita.'],
]

// Ano cruzado com src/data/sweetCoffeeHistory.js (campo "ordem" = nº da edição
// citado na matéria) quando a matéria não traz o ano explícito. Sem ano
// confirmado por edição, tema ou texto da matéria: campo omitido (sem chute).
const PRESS = [
  { outlet: 'Diário do RN', year: '2026', title: '10 anos de festival e economia criativa', href: 'https://diariodorn.com.br/sweet-coffee-week-chega-aos-10-anos-e-reforca-forca-da-economia-criativa-em-natal/' },
  { outlet: '96 FM', year: '2026', title: 'Sweet Coffee Week celebra 10 anos', href: 'https://96fm.com.br/post/sweet-coffee-week-celebra-10-anos' },
  { outlet: 'Tribuna do Norte', year: '2026', title: 'Edição de 10 anos, de 04 a 14 de junho', href: 'https://blog.tribunadonorte.com.br/territoriolivre/de-04-a-14-de-junho-ocorre-o-sweet-coffee-week-2026-edicao-10-anos/' },
  { outlet: 'Blog do BG', year: '2025', title: 'A maior celebração da doçura do Brasil chega à 15ª edição', href: 'https://www.blogdobg.com.br/sweet-coffee-week-2025-a-maior-celebracao-da-docura-do-brasil-chega-a-15a-edicao/' },
  { outlet: 'O Potengi', year: '2025', title: 'Sweet Coffee Celebration reúne mais de 25 estabelecimentos', href: 'https://opotengi.com.br/sweet-coffee-celebration-chega-aos-15o-ano-reunindo-mais-de-25-estabelecimentos/' },
  { outlet: 'TV Ponta Negra', year: '2025', title: 'Entrevista com Eline Eulália sobre a edição de 2025', href: 'https://www.youtube.com/watch?v=1lPd434s3rk' },
  { outlet: 'Conversa Gastronômica', year: '2024', title: '14ª Sweet Coffee Week acontece em Natal e Parnamirim', href: 'https://conversagastronomica.com/14a-sweet-coffee-week-acontece-entre-os-dias-14-e-24-de-novembro-em-natal-e-parnamirim/' },
  { outlet: 'UFRN', year: '2022', title: 'O festival como experiência gastronômica', href: 'https://repositorioslatinoamericanos.uchile.cl/handle/2250/8603735' },
  { outlet: 'Agência Sebrae', year: '2021', title: 'Ingredientes potiguares em destaque', href: 'https://rn.agenciasebrae.com.br/arquivo/produtos-terroir-serao-destaques-na-sweet-coffee-week-2021/' },
  { outlet: 'Conversa Gastronômica', year: '2020', title: 'Heróis e vilões trazem combos a R$20,90', href: 'https://conversagastronomica.com/herois-e-viloes-trazem-combos-a-r2090-de-12-a-22-de-novembro-em-natal/' },
  { outlet: 'Hilneth Correia', year: '2019', title: '7ª Sweet & Coffee Week traz o sabor dos contos de fadas', href: 'https://hilnethcorreia.com.br/2019/09/07/7a-sweet-coffee-week-traz-o-sabor-dos-contos-de-fadas/' },
  { outlet: 'Conversa Gastronômica', year: '2018', title: '5ª Sweet Coffee resgata sabores da infância', href: 'https://conversagastronomica.com/5a-sweet-coffee-resgata-sabores-da-infancia/' },
  { outlet: 'Conversa Gastronômica', year: '2018', title: 'Sweet e Coffee celebra o amor em combos a R$18,90', href: 'https://conversagastronomica.com/sweet-e-coffee-celebra-o-amor-em-combos-a-r1890/' },
  { outlet: 'Agora RN', title: 'O evento mais doce da capital potiguar', href: 'https://agorarn.com.br/ultimas/sweet-coffee-week-evento-mais-doce-natal/' },
  { outlet: 'NOVO Notícias', title: 'Atenção, Sweet Lovers: a semana mais doce do ano vai começar!', href: 'https://novonoticias.com.br/atencao-sweet-lovers-a-semana-mais-doce-do-ano-vai-comecar/' },
  { outlet: 'NOVO Notícias', title: 'Uma volta ao mundo em 11 dias', href: 'https://novonoticias.com.br/sweet-coffee-week-proporciona-uma-volta-ao-mundo-em-11-dias/' },
  { outlet: '98 FM Natal', title: 'Sweet Coffee Week movimenta a economia criativa em Natal', href: 'https://98fmnatal.com.br/ultimas/sweet-coffee-week-comeca-hoje-e-movimenta-a-economia-criativa-em-natal/339772/' },
]

// Card de foto das rotas: só a edição Lovers (2026.1), 11 frames reais.
const LOVERS_PHOTOS = Array.from({ length: 11 }, (_, i) => ({
  src: `/images/edicoes/2026.1/${String(i + 1).padStart(2, '0')}.webp`,
  alt: 'Combo da edição Sweet & Coffee Week Lovers',
}))

export function HomePage({ navigate }) {
  const go = (path) => (event) => {
    event.preventDefault()
    navigate(path)
  }

  const scrollTo = (id) => (event) => {
    event.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Fase 1 do movimento: revela seções/cards ao entrar na viewport (Motion System
  // existente — só transform/opacity/filter, respeita prefers-reduced-motion).
  const rootRef = React.useRef(null)
  useRevealOnScroll(rootRef)

  // Fase 2 do movimento: camada de mouse. O pointer escreve CSS vars; o CSS compõe
  // com o hover que já existe (não sobrescreve style.transform, senão mataria o :hover).
  // Hero: foto segue o cursor (--hx/--hy). Botões: ímã leve (--mx/--my). Cards de
  // rota: tilt 3D (--rx/--ry). Só transform, rAF-throttle, sai em reduced-motion e touch.
  React.useEffect(() => {
    const root = rootRef.current
    if (!root || !window.matchMedia) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(hover: none)').matches) return

    const throttle = (fn) => {
      let id = 0
      return (e) => { if (id) return; id = requestAnimationFrame(() => { id = 0; fn(e) }) }
    }
    const wire = (el, onMove, onLeave) => {
      const move = throttle(onMove)
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerleave', onLeave)
      return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', onLeave) }
    }
    const rel = (e, el) => {
      const r = el.getBoundingClientRect()
      return [(e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5]
    }
    const cleanups = []

    const hero = root.querySelector('.hmv2-hero')
    if (hero) cleanups.push(wire(hero,
      (e) => { const [x, y] = rel(e, hero); hero.style.setProperty('--hx', x.toFixed(3)); hero.style.setProperty('--hy', y.toFixed(3)) },
      () => { hero.style.setProperty('--hx', '0'); hero.style.setProperty('--hy', '0') }))

    root.querySelectorAll('.hmv2-btn').forEach((btn) => cleanups.push(wire(btn,
      (e) => { const [x, y] = rel(e, btn); btn.style.setProperty('--mx', (x * 10).toFixed(1) + 'px'); btn.style.setProperty('--my', (y * 8).toFixed(1) + 'px') },
      () => { btn.style.setProperty('--mx', '0px'); btn.style.setProperty('--my', '0px') })))

    root.querySelectorAll('.hmv2-route').forEach((card) => cleanups.push(wire(card,
      (e) => { const [x, y] = rel(e, card); card.style.setProperty('--ry', (x * 5).toFixed(2) + 'deg'); card.style.setProperty('--rx', (-y * 5).toFixed(2) + 'deg') },
      () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg') })))

    return () => cleanups.forEach((fn) => fn())
  }, [])

  // Fase 3 do movimento: parallax ligado ao scroll nas fotos grandes (hero + badge
  // da cidade). Escreve --sy/--csy conforme a foto cruza a viewport; o CSS translada
  // as imagens (com overscale, pra não revelar borda/máscara). Sem transition no
  // scroll (mapeamento direto). rAF-throttle, passive, sai em reduced-motion.
  React.useEffect(() => {
    const root = rootRef.current
    if (!root || !window.matchMedia) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const layers = [
      ['.hmv2-hero', '--sy', -40],
      ['.hmv2-city__visual', '--csy', -30],
    ].map(([sel, prop, amp]) => ({ el: root.querySelector(sel), prop, amp })).filter((l) => l.el)
    if (!layers.length) return

    let id = 0
    const apply = () => {
      id = 0
      const vh = window.innerHeight
      for (const { el, prop, amp } of layers) {
        const r = el.getBoundingClientRect()
        const progress = (r.top + r.height / 2 - vh / 2) / vh
        el.style.setProperty(prop, (progress * amp).toFixed(1) + 'px')
      }
    }
    const onScroll = () => { if (!id) id = requestAnimationFrame(apply) }
    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (id) cancelAnimationFrame(id)
    }
  }, [])

  return (
    <main ref={rootRef} className="page-enter hmv2">
      <section className="hmv2-hero">
        <PhotoRotator images={heroGalleryImages} interval={6200} eager className="hmv2-hero__photos" />
        <div className="hmv2-hero__shade" aria-hidden="true" />
        <div className="hmv2-hero__wrap">
          <div className="hmv2-hero__copy motion-stagger">
            <p className="hmv2-hero__meta">Natal, RN <span /> {festivalFacts.editions.value} edições desde {festivalFacts.firstYear}</p>
            <h1>O festival que faz Natal <em>sair para provar.</em></h1>
            <p className="hmv2-hero__lead">Combos autorais, marcas locais e uma cidade inteira em movimento a cada edição.</p>
            <div className="hmv2-hero__actions">
              <a className="hmv2-btn hmv2-btn--light" href="#rotas" onClick={scrollTo('rotas')}>Explorar a rota <I.arrow /></a>
              <a className="hmv2-btn hmv2-btn--line" href="#/participar" onClick={go('/participar')}>Levar minha marca <I.arrow /></a>
            </div>
          </div>
          <aside className="hmv2-hero__edition motion-reveal-right" aria-label="A edição como uma experiência de cidade">
            <span>Uma edição</span>
            <strong>tema<br />marca<br />cidade</strong>
            <a href="#ciclo" onClick={scrollTo('ciclo')}>Ver como acontece <I.arrow /></a>
          </aside>
        </div>
        <a className="hmv2-hero__scroll" href="#rotas" onClick={scrollTo('rotas')} aria-label="Ir para os caminhos do festival"><I.arrowDown /></a>
      </section>

      <section id="rotas" className="hmv2-routes">
        <div className="hmv2-routes__intro motion-reveal-up">
          <p>O festival é uma <em className="hmv2-hl">rota</em> com vários pontos de entrada.</p>
          <span>Escolha por onde você entra.</span>
        </div>
        {PATHS.map((item) => {
          return (
            <article className={`hmv2-route hmv2-route--${item.id} motion-reveal-up`} key={item.id}>
              <span className="hmv2-route__label">{item.audience}</span>
              <div>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </div>
              <a href={`#${item.route}`} onClick={go(item.route)}>{item.action} <I.arrow /></a>
            </article>
          )
        })}
        <figure className="hmv2-route hmv2-route--foto motion-reveal-up">
          <PhotoRotator images={LOVERS_PHOTOS} interval={5200} className="hmv2-route__photos" />
          <figcaption className="hmv2-route__cap">
            <span>Edição mais recente</span>
            <strong>Sweet &amp; Coffee Week Lovers</strong>
          </figcaption>
        </figure>
      </section>

      <section className="hmv2-city">
        <div className="hmv2-city__visual motion-reveal-up">
          <PhotoRotator images={aboutGalleryImages} interval={7200} className="hmv2-city__photos" />
          <span className="hmv2-city__heart" aria-hidden="true"><img src="/images/shapes/shape-heart-yellow.svg" alt="" /></span>
        </div>
        <div className="hmv2-city__copy motion-stagger">
          <h2>Não é só sobre o que está no <em className="hmv2-hl">prato</em>.</h2>
          <p>O Sweet &amp; Coffee Week aproxima pessoas de lugares que elas talvez ainda não conheçam. A cada visita, uma marca ganha visibilidade, um bairro ganha movimento e Natal ganha uma nova história para contar.</p>
          <p>O formato é simples: <strong>1 doce + 1 salgado + 1 bebida.</strong> O efeito vai bem além do combo.</p>
          <a className="hmv2-text-link" href="#/curiosidades" onClick={go('/curiosidades')}>Conhecer a história do festival <I.arrow /></a>
        </div>
      </section>

      <section id="ciclo" className="hmv2-cycle">
        <div className="hmv2-cycle__head motion-reveal-up">
          <h2>De uma ideia para a <em className="hmv2-hl">cidade</em>.</h2>
          <p>O festival não começa no cardápio. Ele começa em uma direção criativa e só termina quando a cidade guarda a memória daquela edição.</p>
        </div>
        <ol className="hmv2-cycle__list motion-stagger">
          {STAGES.map(([number, title, text]) => (
            <li key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="hmv2-proof">
        <div className="hmv2-proof__title motion-reveal-up">
          <h2>Uma <em className="hmv2-hl">década</em> que continua em circulação.</h2>
          <p>Os números são o rastro de uma experiência construída por marcas, público e cidade.</p>
        </div>
        <dl className="hmv2-proof__facts motion-stagger">
          <div><dt>{festivalFacts.editions.value}</dt><dd>edições realizadas</dd></div>
          <div><dt>+{festivalFacts.brands.value}</dt><dd>marcas participantes</dd></div>
          <div><dt>+{festivalFacts.combosSold.value} mil</dt><dd>combos vendidos</dd></div>
          <div><dt>+{festivalFacts.igViews.value} mi</dt><dd>visualizações no Instagram</dd></div>
        </dl>
      </section>

      <section className="hmv2-press">
        <div className="hmv2-press__head motion-reveal-up">
          <span className="hmv2-press__rule" aria-hidden="true" />
          <h2>Uma história que ganhou as <em className="hmv2-hl">ruas</em> e a imprensa.</h2>
          <a className="hmv2-text-link" href="#/curiosidades" onClick={go('/curiosidades')}>Ver curiosidades do festival <I.arrow /></a>
          <span className="hmv2-press__rule" aria-hidden="true" />
        </div>
        <div className="hmv2-press__body">
          <a className="hmv2-press__feature motion-reveal-up" href={PRESS[0].href} target="_blank" rel="noopener noreferrer">
            {PRESS[0].year && <span className="hmv2-press__featureYear" aria-hidden="true">{PRESS[0].year}</span>}
            <span className="hmv2-press__featureOutlet">{PRESS[0].outlet}{PRESS[0].year && ` · ${PRESS[0].year}`}</span>
            <strong>{PRESS[0].title}</strong>
            <span className="hmv2-press__featureLink">Ler matéria <I.arrow /></span>
          </a>
          <div className="hmv2-press__feed motion-stagger">
            {PRESS.slice(1).map((item) => (
              <a className="hmv2-press__row" href={item.href} key={item.href} target="_blank" rel="noopener noreferrer">
                <span className="hmv2-press__rowOutlet">{item.outlet}</span>
                <span className="hmv2-press__rowTitle">{item.title}</span>
                <span className="hmv2-press__rowYear">{item.year}</span>
                <I.arrow />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="hmv2-close">
        <img className="hmv2-close__kv" src="/images/f2-symbol.svg" alt="" aria-hidden="true" />
        <div className="hmv2-close__brand motion-reveal-left">
          <span>Realização</span>
          <img src="/images/logo-f2experience.svg" alt="F2 Experience" />
        </div>
        <div className="hmv2-close__copy motion-stagger">
          <h2>Uma ideia criativa pode mudar o <em className="hmv2-hl">caminho</em> de uma cidade.</h2>
          <p>Há mais de 20 anos, a F2 Experience transforma estratégia em experiências que conectam marcas e pessoas.</p>
          <a className="hmv2-btn hmv2-btn--dark" href="https://www.f2experience.com.br" target="_blank" rel="noopener noreferrer">Conhecer a F2 Experience <I.arrow /></a>
        </div>
      </section>

      <style>{`
        .hmv2 { overflow-x: clip; background: var(--cream); color: var(--ink); }
        .hmv2, .hmv2 * { box-sizing: border-box; }
        .hmv2 a { text-decoration: none; }
        .hmv2-hero { position: relative; min-height: clamp(720px, 88vh, 930px); display: grid; align-items: stretch; overflow: hidden; background: var(--choco-deep); }
        .hmv2-hero__photos { position: absolute; left: 0; right: 0; top: -6%; width: 100%; height: 112%; transform: translate3d(0, var(--sy, 0px), 0); will-change: transform; }
        .hmv2-hero__photos .photo-rotator__img { width: 100%; height: 100%; }
        .hmv2-hero__photos .photo-rotator__img { object-fit: cover; object-position: center; transform: translate3d(calc(var(--hx, 0) * 14px), calc(var(--hy, 0) * 14px), 0) scale(1.06); transition: transform .4s cubic-bezier(.22,.61,.36,1); }
        .hmv2-hero__shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(43,24,16,.96) 0%, rgba(43,24,16,.82) 38%, rgba(43,24,16,.22) 72%, rgba(43,24,16,.36) 100%); }
        .hmv2-hero__wrap { position: relative; z-index: 2; width: 100%; padding: max(calc(var(--hero-content-start) + clamp(28px, 3vw, 46px)), clamp(252px, 18vw, 300px)) var(--hm-gutter) clamp(74px, 8vw, 118px); display: grid; grid-template-columns: minmax(0, 1fr) minmax(230px, .38fr); gap: clamp(36px, 9vw, 150px); align-items: end; }
        .hmv2-hero__copy { max-width: 760px; }
        .hmv2-hero__meta { display: inline-flex; align-items: center; gap: 10px; margin: 0 0 22px; color: rgba(255,241,230,.78); font: 700 13px/1.2 var(--font-sans); letter-spacing: .08em; text-transform: uppercase; }
        .hmv2-hero__meta span { width: 5px; height: 5px; border-radius: 50%; background: var(--yellow); }
        .hmv2-hero h1 { max-width: 11ch; margin: 0; color: var(--cream); font: 800 clamp(68px, 7.8vw, 132px)/.86 var(--font-display); letter-spacing: -.045em; text-wrap: balance; }
        .hmv2-hero h1 em { color: var(--pink); font-style: italic; }
        .hmv2-hero__lead { max-width: 42ch; margin: clamp(24px, 3vw, 38px) 0 0; color: rgba(255,241,230,.9); font: 500 clamp(18px, 1.55vw, 24px)/1.42 var(--font-sans); text-wrap: pretty; }
        .hmv2-hero__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: clamp(28px, 4vw, 42px); }
        .hmv2-btn { min-height: 50px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 20px; border-radius: 4px; font: 800 14px/1 var(--font-sans); transform: translate(var(--mx, 0px), calc(var(--my, 0px) + var(--btn-lift, 0px))); transition: transform .18s ease, background .2s ease, color .2s ease; }
        .hmv2-btn:hover { --btn-lift: -2px; }
        .hmv2-btn svg, .hmv2-text-link svg, .hmv2-route a svg { width: 17px; height: 17px; }
        .hmv2-btn--light { background: var(--yellow); color: var(--ink); }
        .hmv2-btn--light:hover { background: var(--yellow-deep); }
        .hmv2-btn--line { border: 1px solid rgba(255,241,230,.55); color: var(--cream); }
        .hmv2-btn--line:hover { border-color: var(--cream); background: rgba(255,241,230,.1); }
        .hmv2-hero__edition { justify-self: end; width: min(100%, 280px); padding: 26px 0 0 28px; border-left: 1px solid rgba(255,241,230,.38); color: var(--cream); }
        .hmv2-hero__edition span { display: block; margin-bottom: 16px; color: var(--yellow); font: 700 12px/1 var(--font-sans); letter-spacing: .1em; text-transform: uppercase; }
        .hmv2-hero__edition strong { display: block; font: 800 clamp(30px, 3vw, 50px)/.9 var(--font-display); letter-spacing: -.035em; }
        .hmv2-hero__edition a { display: inline-flex; align-items: center; gap: 8px; margin-top: 25px; color: rgba(255,241,230,.92); font: 700 14px/1.2 var(--font-sans); }
        .hmv2-hero__scroll { position: absolute; z-index: 3; right: var(--hm-gutter); bottom: 26px; display: grid; place-items: center; width: 42px; height: 42px; border: 1px solid rgba(255,241,230,.45); color: var(--cream); transition: transform .2s ease, background .2s ease; }
        .hmv2-hero__scroll:hover { transform: translateY(3px); background: rgba(255,241,230,.12); }
        .hmv2-routes { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-areas: 'intro marcas' 'foto lovers' 'foto parceiros'; gap: 12px; padding: clamp(76px, 10vw, 146px) var(--hm-gutter); background: var(--cream); }
        .hmv2-routes__intro { grid-area: intro; padding-top: 12px; }
        .hmv2-routes__intro p { max-width: 12ch; margin: 0; color: var(--ink); font: 800 clamp(34px, 3.7vw, 58px)/.93 var(--font-display); letter-spacing: -.04em; }
        .hmv2-routes__intro span { display: block; max-width: 23ch; margin-top: 20px; color: var(--ink-soft); font: 500 16px/1.45 var(--font-sans); }
        .hmv2-route { min-height: 215px; display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; padding: clamp(26px, 3vw, 42px); border: 1px solid rgba(43,24,16,.15); border-radius: 8px; overflow: hidden; transform: perspective(760px) translateY(var(--lift, 0px)) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); transition: transform .24s ease, box-shadow .24s ease; }
        .hmv2-route:hover { --lift: -4px; box-shadow: 0 18px 34px rgba(43,24,16,.12); }
        .hmv2-route--marcas { grid-area: marcas; background: var(--coral); color: var(--cream); }
        .hmv2-route--lovers { grid-area: lovers; background: var(--yellow); color: var(--ink); }
        .hmv2-route--parceiros { grid-area: parceiros; background: var(--choco); color: var(--cream); }
        .hmv2-route--foto { grid-area: foto; position: relative; margin: 0; padding: 0; border: none; }
        .hmv2-route__photos, .hmv2-route__photos .photo-rotator__img { width: 100%; height: 100%; }
        .hmv2-route__photos { position: absolute; inset: 0; }
        .hmv2-route__photos .photo-rotator__img { object-fit: cover; }
        .hmv2-route__cap { position: absolute; left: 0; right: 0; bottom: 0; z-index: 1; padding: 58px 24px 22px; background: linear-gradient(transparent, rgba(43,24,16,.86)); color: var(--cream); }
        .hmv2-route__cap span { display: block; margin-bottom: 6px; color: var(--yellow); font: 700 12px/1 var(--font-sans); letter-spacing: .1em; text-transform: uppercase; }
        .hmv2-route__cap strong { display: block; max-width: 15ch; font: 800 clamp(21px, 2vw, 30px)/.98 var(--font-display); letter-spacing: -.03em; }
        .hmv2-route__label { display: inline-flex; align-items: center; min-height: 28px; padding: 0 10px; border: 1px solid currentColor; border-radius: 999px; color: currentColor; font: 800 11px/1 var(--font-sans); letter-spacing: .08em; text-transform: uppercase; }
        .hmv2-route h2 { max-width: 13ch; margin: 32px 0 10px; color: currentColor; font: 800 clamp(25px, 2.6vw, 40px)/.94 var(--font-display); letter-spacing: -.035em; }
        .hmv2-route p { max-width: 35ch; margin: 0; color: currentColor; opacity: .88; font: 500 15px/1.45 var(--font-sans); }
        .hmv2-route a { display: inline-flex; align-items: center; gap: 8px; margin-top: 25px; color: currentColor; font: 800 14px/1 var(--font-sans); }
        .hmv2-city { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(300px, .9fr); align-items: center; gap: clamp(48px, 9vw, 150px); padding: clamp(90px, 12vw, 170px) var(--hm-gutter); background: var(--choco-deep); }
        .hmv2-city__visual { position: relative; min-height: clamp(400px, 48vw, 660px); }
        .hmv2-city__photos, .hmv2-city__photos .photo-rotator__img { width: 100%; height: 100%; }
        .hmv2-city__photos { position: absolute; inset: 0; -webkit-mask: url(/images/shapes/shape-badge-choco.svg) center / contain no-repeat; mask: url(/images/shapes/shape-badge-choco.svg) center / contain no-repeat; }
        .hmv2-city__photos .photo-rotator__img { object-fit: cover; transform: translate3d(0, var(--csy, 0px), 0) scale(1.12); will-change: transform; }
        .hmv2-city__heart { position: absolute; left: 0; bottom: 0; width: 37%; filter: drop-shadow(0 8px 18px rgba(43,24,16,.4)); transform-origin: center; animation: hmv2HeartPulse 1.5s ease-in-out infinite; }
        .hmv2-city__heart img { display: block; width: 100%; height: auto; }
        .hmv2-city__heart:hover { animation-duration: .7s; }
        @keyframes hmv2HeartPulse { 0%, 100% { transform: scale(1); } 15% { transform: scale(1.08); } 30% { transform: scale(1); } 45% { transform: scale(1.05); } 60% { transform: scale(1); } }
        .hmv2-city__copy h2, .hmv2-cycle h2, .hmv2-proof h2, .hmv2-press h2, .hmv2-close h2 { margin: 0; font: 800 clamp(38px, 4.3vw, 72px)/.9 var(--font-display); letter-spacing: -.045em; text-wrap: balance; }
        .hmv2-city__copy h2 { max-width: 10ch; color: var(--cream); }
        .hmv2-city__copy p { max-width: 38ch; margin: 26px 0 0; color: rgba(255,241,230,.82); font: 500 clamp(16px, 1.3vw, 20px)/1.5 var(--font-sans); text-wrap: pretty; }
        .hmv2-city__copy strong { color: var(--yellow); }
        .hmv2-text-link { display: inline-flex; align-items: center; gap: 9px; margin-top: 32px; color: var(--pink); font: 800 15px/1.2 var(--font-sans); }
        .hmv2-cycle { padding: clamp(88px, 11vw, 156px) var(--hm-gutter); background: var(--cream-deep); }
        .hmv2-cycle__head { display: grid; grid-template-columns: minmax(0, .9fr) minmax(260px, .55fr); gap: clamp(34px, 8vw, 120px); align-items: end; padding-bottom: clamp(44px, 6vw, 84px); border-bottom: 1px solid rgba(43,24,16,.2); }
        .hmv2-cycle__head h2 { max-width: 12ch; color: var(--ink); }
        .hmv2-cycle__head p { max-width: 36ch; margin: 0; color: var(--ink-soft); font: 500 17px/1.5 var(--font-sans); }
        .hmv2-cycle__list { display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(20px, 3vw, 48px); margin: 0; padding: clamp(38px, 5vw, 64px) 0 0; list-style: none; }
        .hmv2-cycle__list li { position: relative; padding-top: 62px; }
        .hmv2-cycle__list li:not(:last-child)::after { content: ''; position: absolute; top: 22px; left: 52px; right: -24px; height: 1px; background: rgba(43,24,16,.28); }
        .hmv2-cycle__list span { position: absolute; top: 0; left: 0; z-index: 1; width: 44px; height: 44px; display: grid; place-items: center; background: var(--choco-deep); color: var(--cream); font: 800 13px/1 var(--font-sans); }
        .hmv2-cycle__list li:nth-child(2) span { background: var(--coral); }
        .hmv2-cycle__list li:nth-child(3) span { background: var(--cyan-deep); }
        .hmv2-cycle__list li:nth-child(4) span { background: var(--pink); color: var(--ink); }
        .hmv2-cycle__list h3 { margin: 0; color: var(--ink); font: 800 clamp(22px, 2vw, 30px)/1 var(--font-display); letter-spacing: -.03em; }
        .hmv2-cycle__list p { margin: 15px 0 0; color: var(--ink-soft); font: 500 15px/1.45 var(--font-sans); }
        .hmv2-proof { display: grid; grid-template-columns: minmax(250px, .8fr) minmax(0, 1.2fr); gap: clamp(40px, 8vw, 132px); padding: clamp(90px, 12vw, 170px) var(--hm-gutter); background: var(--yellow); }
        .hmv2-proof h2 { max-width: 11ch; color: var(--ink); }
        .hmv2-proof__title p { max-width: 31ch; margin: 22px 0 0; color: rgba(43,24,16,.78); font: 500 17px/1.45 var(--font-sans); }
        .hmv2-proof__facts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 clamp(30px, 4vw, 72px); margin: 0; }
        .hmv2-proof__facts div { min-height: 150px; padding: 16px 0 26px; border-top: 1px solid rgba(43,24,16,.32); }
        .hmv2-proof__facts dt { color: var(--ink); font: 800 clamp(42px, 5vw, 78px)/.88 var(--font-display); letter-spacing: -.055em; }
        .hmv2-proof__facts dd { margin: 10px 0 0; color: rgba(43,24,16,.78); font: 700 14px/1.25 var(--font-sans); }
        .hmv2-press { display: grid; grid-template-columns: minmax(280px, .7fr) minmax(0, 1.3fr); gap: clamp(50px, 10vw, 160px); padding: clamp(90px, 12vw, 166px) var(--hm-gutter); background: #FDF8F0; }
        .hmv2-press h2 { max-width: 11ch; color: var(--ink); }
        .hmv2-press__head { display: flex; flex-direction: column; align-items: flex-start; }
        .hmv2-press__rule { display: block; width: 100%; height: 3px; margin-bottom: 22px; background: var(--ink); position: relative; }
        .hmv2-press__rule::after { content: ''; position: absolute; left: 0; right: 0; top: 6px; height: 1px; background: var(--ink); opacity: .5; }
        .hmv2-press__head .hmv2-text-link ~ .hmv2-press__rule { margin-top: 22px; margin-bottom: 0; height: 1px; }
        .hmv2-press__head .hmv2-text-link ~ .hmv2-press__rule::after { display: none; }
        .hmv2-press__body { display: flex; flex-direction: column; gap: 8px; }
        .hmv2-press__feature { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: flex-start; padding: clamp(28px, 3.4vw, 46px) 0; border-top: 1px solid rgba(43,24,16,.2); border-bottom: 1px solid rgba(43,24,16,.2); color: var(--ink); transition: padding-left .22s ease; }
        .hmv2-press__feature:hover { padding-left: 14px; }
        .hmv2-press__featureYear { position: absolute; top: 50%; right: 0; z-index: 0; transform: translateY(-50%); color: var(--ink); opacity: .05; font: 800 clamp(120px, 16vw, 260px)/1 var(--font-display); letter-spacing: -.05em; pointer-events: none; }
        .hmv2-press__featureOutlet { position: relative; z-index: 1; color: var(--coral-deep); font: 800 13px/1 var(--font-sans); letter-spacing: .08em; text-transform: uppercase; }
        .hmv2-press__feature strong { position: relative; z-index: 1; max-width: 20ch; margin: 18px 0 0; color: var(--ink); font: 800 clamp(30px, 3.6vw, 54px)/1.02 var(--font-display); letter-spacing: -.03em; text-wrap: balance; }
        .hmv2-press__featureLink { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 9px; margin-top: 22px; color: var(--ink); font: 800 14px/1 var(--font-sans); }
        .hmv2-press__feature svg { color: var(--coral-deep); }
        .hmv2-press__feed { max-height: clamp(280px, 32vw, 380px); overflow-y: auto; }
        .hmv2-press__row { display: grid; grid-template-columns: clamp(110px, 13vw, 160px) minmax(0, 1fr) 52px 16px; gap: 16px; align-items: center; min-height: 58px; border-bottom: 1px solid rgba(43,24,16,.14); color: var(--ink); transition: transform .2s ease, background .2s ease; }
        .hmv2-press__row:hover { transform: translateX(10px); background: var(--cream-deep); }
        .hmv2-press__rowOutlet { overflow: hidden; color: var(--ink-soft); font: 700 11.5px/1.2 var(--font-sans); letter-spacing: .03em; text-transform: uppercase; white-space: nowrap; text-overflow: ellipsis; }
        .hmv2-press__rowTitle { overflow: hidden; color: var(--ink); font: 700 16px/1.3 var(--font-display); letter-spacing: -.01em; white-space: nowrap; text-overflow: ellipsis; }
        .hmv2-press__rowYear { color: var(--coral-deep); font: 700 13px/1 var(--font-sans); text-align: right; }
        .hmv2-press__row svg { color: var(--coral-deep); }
        .hmv2-close { position: relative; overflow: hidden; display: grid; grid-template-columns: minmax(190px, .45fr) minmax(0, 1.55fr); gap: clamp(44px, 9vw, 160px); padding: clamp(78px, 10vw, 142px) var(--hm-gutter); background: #111111; }
        .hmv2-close__kv { position: absolute; top: 50%; right: -6%; width: clamp(340px, 46vw, 680px); transform: translateY(-50%); opacity: .13; pointer-events: none; }
        .hmv2-close__brand, .hmv2-close__copy { position: relative; z-index: 1; }
        .hmv2-close__brand span { display: block; margin-bottom: 20px; color: rgba(255,255,255,.6); font: 700 12px/1 var(--font-sans); letter-spacing: .1em; text-transform: uppercase; }
        .hmv2-close__brand img { width: min(220px, 100%); filter: brightness(0) invert(1); }
        .hmv2-close h2 { max-width: 13ch; color: #fff; }
        .hmv2-close p { max-width: 46ch; margin: 24px 0 0; color: rgba(255,255,255,.78); font: 500 clamp(16px, 1.3vw, 20px)/1.48 var(--font-sans); }
        .hmv2-btn--dark { margin-top: 31px; background: #E50053; color: #fff; }
        .hmv2-btn--dark:hover { background: #c40047; }
        .hmv2 a:focus-visible { outline: 3px solid var(--cyan); outline-offset: 4px; }
        .hmv2-hl { color: var(--coral); font-style: normal; }
        .hmv2-city .hmv2-hl { color: var(--yellow); }
        .hmv2-close .hmv2-hl { color: #E50053; }
        .hmv2-proof .hmv2-hl { color: var(--coral-deep); }
        @media (max-width: 1080px) { .hmv2-hero__wrap { grid-template-columns: minmax(0, 1fr) 220px; gap: 50px; } .hmv2-city, .hmv2-proof, .hmv2-press, .hmv2-close { gap: 54px; } .hmv2-cycle__list { gap: 24px; } }
        @media (max-width: 960px) { .hmv2-hero__wrap { grid-template-columns: 1fr; } .hmv2-hero__edition { justify-self: start; width: auto; max-width: 360px; } .hmv2-routes, .hmv2-city, .hmv2-proof, .hmv2-press, .hmv2-close { grid-template-columns: 1fr; } .hmv2-routes { grid-template-areas: none; } .hmv2-route--foto { min-height: clamp(300px, 62vw, 460px); } .hmv2-routes__intro p, .hmv2-city__copy h2, .hmv2-proof h2, .hmv2-press h2 { max-width: 15ch; } .hmv2-city__visual { max-width: 720px; width: 100%; } .hmv2-cycle__head { grid-template-columns: 1fr; gap: 24px; } .hmv2-cycle__list { grid-template-columns: repeat(2, 1fr); row-gap: 46px; } .hmv2-cycle__list li:nth-child(2)::after { display: none; } .hmv2-close__brand { display: flex; align-items: center; gap: 24px; } .hmv2-close__brand span { margin: 0; } }
        @media (max-width: 720px) { .hmv2-hero { min-height: 760px; } .hmv2-hero__shade { background: linear-gradient(90deg, rgba(43,24,16,.94), rgba(43,24,16,.48)); } .hmv2-hero__wrap { padding-inline: clamp(24px, 7vw, 42px); } .hmv2-hero__scroll { right: clamp(24px, 7vw, 42px); } .hmv2-route:not(.hmv2-route--foto) { min-height: 245px; } .hmv2-cycle__list, .hmv2-proof__facts { grid-template-columns: 1fr; } .hmv2-cycle__list li::after { display: none; } .hmv2-cycle__list li { padding-top: 56px; } .hmv2-press__row { grid-template-columns: minmax(0, 1fr) 16px; grid-template-areas: 'outlet outlet' 'title arrow'; row-gap: 4px; padding-block: 14px; } .hmv2-press__rowOutlet { grid-area: outlet; } .hmv2-press__rowTitle { grid-area: title; white-space: normal; } .hmv2-press__rowYear { display: none; } .hmv2-press__row svg { grid-area: arrow; } }
        @media (max-width: 560px) { .hmv2-hero { min-height: 690px; } .hmv2-hero__wrap { padding-top: max(var(--hero-content-start), 170px); padding-bottom: 86px; } .hmv2-hero h1 { font-size: clamp(54px, 15vw, 76px); } .hmv2-hero__edition { display: none; } .hmv2-hero__actions { flex-direction: column; align-items: stretch; } .hmv2-btn { width: 100%; } .hmv2-routes, .hmv2-city, .hmv2-cycle, .hmv2-proof, .hmv2-press, .hmv2-close { padding-inline: clamp(24px, 7vw, 40px); } .hmv2-city__visual { min-height: 420px; } .hmv2-city__heart { width: 38%; } .hmv2-close__brand { align-items: flex-start; flex-direction: column; gap: 14px; } }
        @media (max-width: 420px) { .hmv2-hero h1 { font-size: 52px; } .hmv2-hero__meta { font-size: 11px; } .hmv2-routes__intro p { font-size: 37px; } .hmv2-proof__facts dt { font-size: 56px; } }
        @media (prefers-reduced-motion: reduce) { .hmv2 *, .hmv2 *::before, .hmv2 *::after { scroll-behavior: auto !important; transition: none !important; } .hmv2-city__heart { animation: none !important; } }
      `}</style>
    </main>
  )
}
