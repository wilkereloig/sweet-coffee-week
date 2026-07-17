import React from 'react'
import { I } from '../../components/icons'
import { PhotoRotator } from '../../components/PhotoRotator'
import { heroGalleryImages, aboutGalleryImages } from '../../data/homeGalleries'
import { festivalFacts } from '../../data/festivalFacts'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'

const PATHS = [
  {
    id: 'marcas',
    title: 'Leve sua marca para o festival.',
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

// [number, title, text, photo, alt] — fotos = acervo real (verificado); curadoria do frame é do usuário.
const STAGES = [
  ['01', 'Um tema abre a conversa', 'Cada edição nasce de um universo que inspira sabores, vitrines e histórias.', '/images/edicoes/2016/01.webp', 'Primeira edição do festival — o tema que abre a conversa'],
  ['02', 'As marcas criam o percurso', 'Os participantes transformam a ideia em combos exclusivos por tempo limitado.', '/images/combos/adocee-doceria/main.jpg', 'Combo de participante — as marcas criam o percurso'],
  ['03', 'A cidade entra na rota', 'O público sai atrás dos combos e descobre novos endereços, encontros e bairros.', '/images/edicoes/2025/03.webp', 'Público nas ruas — a cidade entra na rota'],
  ['04', 'A memória continua', 'Sweet Lovers, marcas e Sweet Awards deixam cada edição viva depois da última visita.', '/images/edicoes/2026.1/01.webp', 'Edição Lovers, 10 anos — a memória continua'],
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

// Prova humana compacta: depoimento REAL da Jolie (fonte: Participar.jsx,
// LEAD_TESTIMONIAL). Não inventar, não editar o sentido. Logo real do acervo.
const VOICE = {
  intro: 'Quem já entrou na rota sente a virada.',
  quote: 'Para a Jolie, foi um divisor de águas. Foi quando a nossa coxinha realmente passou a ser conhecida em Natal, e isso mudou até a nossa história de faturamento.',
  person: 'Carol Barreto',
  brand: 'Jolie',
  logo: '/logos/participants/jolie-cafe-patisserie.png',
  // Retrato da Carol/Jolie NÃO existe no acervo (sem retrato autorizado — regra do
  // projeto). Enquanto não houver, o bloco redondo usa o logo real como marca.
  // Chegando o retrato: apontar `portrait` pro arquivo → o círculo vira foto.
  portrait: null,
}

// Fotos da Jolie em várias edições (acervo real, /images/combos/jolie-cafe-patisserie/) —
// rotaciona no lugar do combo estático da prova social.
const VOICE_PHOTOS = [
  { src: '/images/combos/jolie-cafe-patisserie/main.jpg', alt: 'Coxinha autoral da Jolie' },
  ...Array.from({ length: 11 }, (_, i) => ({
    src: `/images/combos/jolie-cafe-patisserie/photo-${String(i + 2).padStart(2, '0')}.jpg`,
    alt: 'Jolie em uma edição do Sweet & Coffee Week',
  })),
]

// Card de foto das rotas: só a edição Lovers (2026.1), 11 frames reais.
const LOVERS_PHOTOS = Array.from({ length: 11 }, (_, i) => ({
  src: `/images/edicoes/2026.1/${String(i + 1).padStart(2, '0')}.webp`,
  alt: 'Combo da edição Sweet & Coffee Week Lovers',
}))

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// CountUp — número que sobe de 0 ao valor final uma única vez (motion-system).
// Dispara pela flag `run` (um único IntersectionObserver na seção, não um por
// número — CLAUDE.md §12). rAF com easeOutCubic; limpa no unmount. Reduced
// motion / sem suporte: mostra o valor final direto, sem animar (§9).
function CountUp({ run, to, prefix = '', suffix = '', duration = 1500 }) {
  const reduce = prefersReduced()
  const [val, setVal] = React.useState(reduce ? to : 0)
  React.useEffect(() => {
    if (reduce) { setVal(to); return }
    if (!run) return
    let raf = 0
    let startTs = 0
    const ease = (t) => 1 - Math.pow(1 - t, 3)
    const tick = (ts) => {
      if (!startTs) startTs = ts
      const p = Math.min(1, (ts - startTs) / duration)
      setVal(Math.round(ease(p) * to))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { if (raf) cancelAnimationFrame(raf) }
  }, [run, to, duration, reduce])
  return <span>{prefix}{val}{suffix}</span>
}

export function HomePage({ navigate }) {
  const [showAllPress, setShowAllPress] = React.useState(false)
  const [activeStage, setActiveStage] = React.useState(0)

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

  // Números da seção "prova": um único observer dispara os 4 CountUp de uma vez
  // (não um observer por número — CLAUDE.md §12). Uma vez só; reduced motion pula
  // direto pro valor final via CountUp.
  const [factsIn, setFactsIn] = React.useState(false)
  React.useEffect(() => {
    const el = rootRef.current && rootRef.current.querySelector('.hmv2-proof__facts')
    if (!el) return
    if (prefersReduced() || typeof IntersectionObserver === 'undefined') { setFactsIn(true); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setFactsIn(true); io.disconnect() } })
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

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
      (e) => { const [x, y] = rel(e, card); card.style.setProperty('--ry', (x * 3.5).toFixed(2) + 'deg'); card.style.setProperty('--rx', (-y * 3.5).toFixed(2) + 'deg'); card.style.setProperty('--tx', (x * 12).toFixed(1) + 'px'); card.style.setProperty('--ty', (y * 9).toFixed(1) + 'px') },
      () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); card.style.setProperty('--tx', '0px'); card.style.setProperty('--ty', '0px') })))

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
        // Selo da cidade: gira e expande de leve conforme rola a página (§ movimento).
        if (prop === '--csy') {
          el.style.setProperty('--crot', (progress * 7).toFixed(2) + 'deg')
          el.style.setProperty('--cscale', (1 + (0.5 - Math.min(0.5, Math.abs(progress))) * 0.08).toFixed(3))
        }
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
            <h1><span className="hmv2-hero__t">O festival que faz Natal </span><em>sair para provar.</em></h1>
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
          <p>O festival é uma <em className="hmv2-hl">experiência</em> com vários pontos de entrada.</p>
          <span>Escolha como quer fazer parte.</span>
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
          <a className="hmv2-text-link" href="#/edicoes" onClick={go('/edicoes')}>Conhecer as edições <I.arrow /></a>
        </div>
      </section>

      <section id="ciclo" className="hmv2-cycle">
        <div className="hmv2-cycle__media motion-reveal-up">
          {STAGES.map(([number, title, text, photo, alt], i) => (
            <figure
              key={number}
              className={'hmv2-cycle__photo' + (i === activeStage ? ' is-active' : '')}
              aria-hidden={i === activeStage ? undefined : 'true'}
            >
              <img
                src={photo}
                alt={alt}
                loading="lazy"
                decoding="async"
                draggable="false"
                onError={(e) => { const f = e.currentTarget.closest('.hmv2-cycle__photo'); if (f) f.classList.add('is-missing') }}
              />
              <figcaption className="hmv2-cycle__photoFallback">{title}<span>Foto do acervo</span></figcaption>
            </figure>
          ))}
        </div>
        <div className="hmv2-cycle__body">
          <div className="hmv2-cycle__head motion-reveal-up">
            <h2>De uma ideia para a <em className="hmv2-hl">cidade</em>.</h2>
            <p>O festival não começa no cardápio. Ele começa em uma direção criativa e só termina quando a cidade guarda a memória daquela edição.</p>
          </div>
          <ol className="hmv2-cycle__list motion-stagger" style={{ '--active': activeStage }}>
            {STAGES.map(([number, title, text], i) => (
              <li key={number} className={i === activeStage ? 'is-active' : ''}>
                <div
                  className="hmv2-cycle__beat"
                  tabIndex={0}
                  aria-current={i === activeStage ? 'true' : undefined}
                  onMouseEnter={() => setActiveStage(i)}
                  onFocus={() => setActiveStage(i)}
                  onClick={() => setActiveStage(i)}
                >
                  <span className="hmv2-cycle__num">{number}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="hmv2-proof">
        <div className="hmv2-proof__title motion-reveal-up">
          <h2>Uma <em className="hmv2-hl">década</em> que continua em circulação.</h2>
          <p>Os números são o rastro de uma experiência construída por marcas, público e cidade.</p>
          <a className="hmv2-text-link" href="#/sweet-awards" onClick={go('/sweet-awards')}>Conhecer o Sweet Awards <I.arrow /></a>
        </div>
        <dl className="hmv2-proof__facts motion-stagger">
          <div><dt><CountUp run={factsIn} to={festivalFacts.editions.value} /></dt><dd>edições realizadas</dd></div>
          <div><dt><CountUp run={factsIn} to={festivalFacts.brands.value} prefix="+" /></dt><dd>marcas participantes</dd></div>
          <div><dt><CountUp run={factsIn} to={festivalFacts.combosSold.value} prefix="+" suffix=" mil" /></dt><dd>combos vendidos</dd></div>
          <div><dt><CountUp run={factsIn} to={festivalFacts.igViews.value} prefix="+" suffix=" mi" /></dt><dd>visualizações no Instagram</dd></div>
        </dl>
      </section>

      <section className="hmv2-voice">
        <figure className="hmv2-voice__inner motion-reveal-up">
          <div className="hmv2-voice__text">
          <p className="hmv2-voice__intro">{VOICE.intro}</p>
          <blockquote className="hmv2-voice__quote">{VOICE.quote}</blockquote>
          <figcaption className="hmv2-voice__foot">
            <span className="hmv2-voice__id"><b>{VOICE.person}</b><span>{VOICE.brand}</span></span>
            <a className="hmv2-text-link hmv2-voice__link" href="#/participar?scrollTo=depoimentos" onClick={go('/participar?scrollTo=depoimentos')}>Ver mais depoimentos <I.arrow /></a>
          </figcaption>
          </div>
          <div className="hmv2-voice__media">
            <PhotoRotator images={VOICE_PHOTOS} interval={5200} className="hmv2-voice__combo" />
            <span className={`hmv2-voice__portrait${VOICE.portrait ? '' : ' hmv2-voice__portrait--logo'}`}>
              <img src={VOICE.portrait || VOICE.logo} alt={VOICE.portrait ? `${VOICE.person}, da ${VOICE.brand}` : VOICE.brand} loading="lazy" decoding="async" />
            </span>
          </div>
        </figure>
      </section>

      <section className="hmv2-press">
        <div className="hmv2-press__head motion-reveal-up">
          <h2>Uma história que ganhou as <em className="hmv2-hl">ruas</em> e a imprensa.</h2>
          <a className="hmv2-text-link" href="#/edicoes" onClick={go('/edicoes')}>Ver as edições do festival <I.arrow /></a>
          <figure className="hmv2-press__shots motion-reveal-up">
            <span className="hmv2-press__shot hmv2-press__shot--lead">
              <img src="/images/imprensa/02.jpg" alt="Organização do Sweet & Coffee Week na cobertura de imprensa do festival" loading="lazy" decoding="async" />
            </span>
            <span className="hmv2-press__shot">
              <img src="/images/imprensa/03.jpg" alt="Registro de imprensa do Sweet & Coffee Week" loading="lazy" decoding="async" />
            </span>
            <span className="hmv2-press__shot">
              <img src="/images/imprensa/01.png" alt="Registro de imprensa do Sweet & Coffee Week" loading="lazy" decoding="async" />
            </span>
            <figcaption>Bastidores da cobertura de imprensa ao longo das edições.</figcaption>
          </figure>
        </div>
        <div className="hmv2-press__body">
          <a className="hmv2-press__feature motion-reveal-up" href={PRESS[0].href} target="_blank" rel="noopener noreferrer">
            {PRESS[0].year && <span className="hmv2-press__featureYear" aria-hidden="true">{PRESS[0].year}</span>}
            <span className="hmv2-press__featureOutlet">{PRESS[0].outlet}{PRESS[0].year && ` · ${PRESS[0].year}`}</span>
            <strong>{PRESS[0].title}</strong>
            <span className="hmv2-press__featureLink">Ler matéria <I.arrow /></span>
          </a>
          <div id="press-feed" className="hmv2-press__feed motion-stagger">
            {PRESS.slice(1, showAllPress ? undefined : 5).map((item) => (
              <a className="hmv2-press__row" href={item.href} key={item.href} target="_blank" rel="noopener noreferrer">
                <span className="hmv2-press__rowOutlet">{item.outlet}</span>
                <span className="hmv2-press__rowTitle">{item.title}</span>
                <span className="hmv2-press__rowYear">{item.year}</span>
                <I.arrow />
              </a>
            ))}
          </div>
          <button
            type="button"
            className="hmv2-press__toggle"
            aria-controls="press-feed"
            aria-expanded={showAllPress}
            onClick={() => setShowAllPress((current) => !current)}
          >
            {showAllPress ? 'Mostrar menos matérias' : 'Mostrar mais matérias'} <I.arrow />
          </button>
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
        /* Hero: cursor (--hx/--hy) no transform + crossfade (opacity) + escala de
           respiração via prop scale (idle roda só na .is-active, ver Motion Layer). */
        .hmv2-hero__photos .photo-rotator__img { object-fit: cover; object-position: center; scale: 1.06; transform: translate3d(calc(var(--hx, 0) * 14px), calc(var(--hy, 0) * 14px), 0); transition: opacity 900ms var(--ease-out-soft), transform .5s var(--ease-out-soft); }
        /* Degradê espresso→âmbar: lado do texto escuro (contraste do H1 cream/pink),
           virando amarelo da paleta (--yellow) no lado da foto. */
        .hmv2-hero__shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(43,24,16,.95) 0%, rgba(43,24,16,.8) 32%, rgba(43,24,16,.22) 68%, rgba(43,24,16,.32) 100%); }
        .hmv2-hero__wrap { position: relative; z-index: 2; width: 100%; padding: max(calc(var(--hero-content-start) + clamp(28px, 3vw, 46px)), clamp(252px, 18vw, 300px)) var(--hm-gutter) clamp(74px, 8vw, 118px); display: grid; grid-template-columns: minmax(0, 1fr) minmax(230px, .38fr); gap: clamp(36px, 9vw, 150px); align-items: end; }
        .hmv2-hero__copy { max-width: 760px; }
        .hmv2-hero h1 { max-width: 11ch; margin: 0; color: var(--cream); font: 800 clamp(68px, 7.8vw, 132px)/.86 var(--font-display); letter-spacing: -.045em; text-wrap: balance; }
        .hmv2-hero h1 em { color: var(--pink); font-style: italic; }
        .hmv2-hero__lead { max-width: 42ch; margin: clamp(24px, 3vw, 38px) 0 0; color: rgba(255,241,230,.9); font: 500 clamp(18px, 1.55vw, 24px)/1.42 var(--font-sans); text-wrap: pretty; }
        .hmv2-hero__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: clamp(28px, 4vw, 42px); }
        .hmv2-btn { min-height: 50px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 24px; border-radius: 999px; font: 800 14px/1 var(--font-sans); transform: translate(var(--mx, 0px), calc(var(--my, 0px) + var(--btn-lift, 0px))); transition: transform .18s ease, scale .12s var(--ease-out-soft), background .2s ease, color .2s ease; }
        .hmv2-btn svg, .hmv2-text-link svg, .hmv2-route a svg { width: 17px; height: 17px; transition: transform .22s var(--ease-spring-soft); }
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
        .hmv2-route { min-height: 215px; display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; padding: clamp(26px, 3vw, 42px); border: 1px solid rgba(43,24,16,.15); border-radius: var(--card-radius); overflow: hidden; transform: perspective(760px) translateY(var(--lift, 0px)) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); transition: transform .26s var(--ease-out-soft), box-shadow .26s var(--ease-out-soft), scale .14s var(--ease-out-soft); }
        .hmv2-route:active { scale: .992; }
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
        /* Rótulo/título/texto seguem o cursor (parallax leve, escrito por --tx/--ty). */
        .hmv2-route > div, .hmv2-route__label { transform: translate3d(var(--tx, 0px), var(--ty, 0px), 0); transition: transform .3s var(--ease-out-soft); }
        .hmv2-route > div { transition-duration: .34s; }
        .hmv2-city { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(300px, .9fr); align-items: center; gap: clamp(48px, 9vw, 150px); padding: clamp(90px, 12vw, 170px) var(--hm-gutter); background: var(--choco-deep); }
        /* Selo gira + expande de leve com o scroll (--crot/--cscale, escritos no JS). */
        .hmv2-city__visual { position: relative; min-height: clamp(400px, 48vw, 660px); transform: rotate(var(--crot, 0deg)) scale(var(--cscale, 1)); transform-origin: center; }
        .hmv2-city__photos, .hmv2-city__photos .photo-rotator__img { width: 100%; height: 100%; }
        .hmv2-city__photos { position: absolute; inset: 0; -webkit-mask: url(/images/shapes/shape-badge-choco.svg) center / contain no-repeat; mask: url(/images/shapes/shape-badge-choco.svg) center / contain no-repeat; }
        .hmv2-city__photos .photo-rotator__img { object-fit: cover; transform: translate3d(0, var(--csy, 0px), 0) scale(1.12); will-change: transform; }
        /* Coração = respiração visual, não alerta: pulso calmo e lento (§3). */
        .hmv2-city__heart { position: absolute; left: 0; bottom: 0; width: 37%; filter: drop-shadow(0 8px 18px rgba(43,24,16,.4)); transform-origin: center; animation: hmv2HeartBreathe 4.6s ease-in-out infinite; }
        .hmv2-city__heart img { display: block; width: 100%; height: auto; }
        .hmv2-city__heart:hover { animation-duration: 1.4s; }
        @keyframes hmv2HeartBreathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.045); } }
        .hmv2-city__copy h2, .hmv2-cycle h2, .hmv2-proof h2, .hmv2-press h2, .hmv2-close h2 { margin: 0; font: 800 clamp(38px, 4.3vw, 72px)/.9 var(--font-display); letter-spacing: -.045em; text-wrap: balance; }
        .hmv2-city__copy h2 { max-width: 10ch; color: var(--cream); }
        .hmv2-city__copy p { max-width: 38ch; margin: 26px 0 0; color: rgba(255,241,230,.82); font: 500 clamp(16px, 1.3vw, 20px)/1.5 var(--font-sans); text-wrap: pretty; }
        .hmv2-city__copy strong { color: var(--yellow); }
        .hmv2-text-link { display: inline-flex; align-items: center; gap: 9px; margin-top: 32px; color: var(--pink); font: 800 15px/1.2 var(--font-sans); }
        .hmv2-cycle { display: grid; grid-template-columns: minmax(0, .82fr) minmax(0, 1fr); gap: clamp(40px, 6vw, 96px); align-items: center; padding: clamp(88px, 11vw, 156px) var(--hm-gutter); background: var(--cream-deep); }
        .hmv2-cycle__media { position: relative; aspect-ratio: 4 / 5; overflow: hidden; border-radius: var(--card-radius); background: var(--cream); box-shadow: inset 0 0 0 1px rgba(43,24,16,.14); }
        .hmv2-cycle__photo { position: absolute; inset: 0; margin: 0; opacity: 0; transform: scale(1.045); transition: opacity .5s var(--ease-out-soft), transform .8s var(--ease-out-soft); }
        .hmv2-cycle__photo.is-active { opacity: 1; transform: scale(1); }
        .hmv2-cycle__photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hmv2-cycle__photoFallback { position: absolute; inset: 0; display: none; flex-direction: column; justify-content: flex-end; gap: 6px; padding: clamp(20px, 3vw, 34px); background: var(--cream); color: var(--ink); font: 800 clamp(20px, 2vw, 28px)/1 var(--font-display); text-align: left; }
        .hmv2-cycle__photoFallback span { font: 700 12px/1 var(--font-sans); letter-spacing: .14em; text-transform: uppercase; color: var(--ink-soft); }
        .hmv2-cycle__photo.is-missing img { display: none; }
        .hmv2-cycle__photo.is-missing .hmv2-cycle__photoFallback { display: flex; }
        .hmv2-cycle__head { padding-bottom: clamp(24px, 3vw, 40px); border-bottom: 1px solid rgba(43,24,16,.2); }
        .hmv2-cycle__head h2 { max-width: 14ch; color: var(--ink); }
        .hmv2-cycle__head p { max-width: 42ch; margin: 16px 0 0; color: var(--ink-soft); font: 500 17px/1.5 var(--font-sans); }
        .hmv2-cycle__list { position: relative; margin: clamp(24px, 3vw, 38px) 0 0; padding: 0 0 0 clamp(22px, 2vw, 30px); list-style: none; }
        .hmv2-cycle__list::before { content: ''; position: absolute; left: 0; top: 6px; bottom: 6px; width: 2px; background: rgba(43,24,16,.16); }
        .hmv2-cycle__list::after { content: ''; position: absolute; left: 0; top: 6px; width: 2px; height: calc(100% - 12px); background: var(--accent); transform-origin: top center; transform: scaleY(calc((var(--active, 0) + 1) / 4)); transition: transform .5s var(--ease-out-soft); }
        .hmv2-cycle__beat { display: block; width: 100%; padding: clamp(13px, 1.5vw, 19px) 0; text-align: left; background: none; border: 0; cursor: pointer; color: inherit; font: inherit; transition: opacity .35s var(--ease-out-soft); }
        .hmv2-cycle__beat:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
        .hmv2-cycle__list li:not(.is-active) .hmv2-cycle__beat { opacity: .55; }
        .hmv2-cycle__num { display: block; color: rgba(43,24,16,.16); font: 800 clamp(30px, 3vw, 46px)/1 var(--font-display); letter-spacing: -.03em; font-variant-numeric: tabular-nums; transition: color .35s var(--ease-out-soft); }
        .hmv2-cycle__list li.is-active .hmv2-cycle__num { color: var(--accent); }
        .hmv2-cycle__list h3 { margin: 4px 0 0; color: var(--ink); font: 800 clamp(22px, 2vw, 30px)/1.02 var(--font-display); letter-spacing: -.03em; }
        .hmv2-cycle__list p { margin: 9px 0 0; max-width: 44ch; color: var(--ink-soft); font: 500 15px/1.45 var(--font-sans); }
        .hmv2-proof { display: grid; grid-template-columns: minmax(250px, .8fr) minmax(0, 1.2fr); gap: clamp(40px, 8vw, 132px); padding: clamp(90px, 12vw, 170px) var(--hm-gutter); background: var(--yellow); }
        .hmv2-proof h2 { max-width: 11ch; color: var(--ink); }
        .hmv2-proof__title p { max-width: 31ch; margin: 22px 0 0; color: rgba(43,24,16,.78); font: 500 17px/1.45 var(--font-sans); }
        .hmv2-proof__facts { display: flex; flex-direction: column; margin: 0; }
        .hmv2-proof__facts div { position: relative; padding: clamp(18px, 2.4vw, 32px) 0; border-top: 1px solid rgba(43,24,16,.28); transition: transform .28s var(--ease-out-soft); }
        .hmv2-proof__facts div:last-child { border-bottom: 1px solid rgba(43,24,16,.28); }
        /* Tick de acento por linha (cresce no reveal) — único acento coral, ritmo de ledger. */
        .hmv2-proof__facts div::before { content: ''; position: absolute; top: -1px; left: 0; width: clamp(40px, 5vw, 64px); height: 3px; background: var(--coral-deep); transform: scaleX(0); transform-origin: left center; transition: transform .5s var(--ease-out-soft); }
        .hmv2-proof__facts.is-in div::before { transform: scaleX(1); }
        .hmv2-proof__facts.is-in div:nth-child(2)::before { transition-delay: .08s; }
        .hmv2-proof__facts.is-in div:nth-child(3)::before { transition-delay: .16s; }
        .hmv2-proof__facts.is-in div:nth-child(4)::before { transition-delay: .24s; }
        /* Ledger: numeral gigante por linha + rótulo abaixo; os 4 com peso igual. */
        .hmv2-proof__facts dt { color: var(--ink); font: 800 clamp(46px, 5.6vw, 88px)/.85 var(--font-display); letter-spacing: -.055em; }
        .hmv2-proof__facts dd { margin: 8px 0 0; color: rgba(43,24,16,.8); font: 700 clamp(15px, 1.35vw, 19px)/1.3 var(--font-sans); }
        /* -- Prova humana: faixa editorial cheia (não card dentro de card, §5). ---- */
        .hmv2-voice { padding: clamp(74px, 10vw, 128px) var(--hm-gutter); background: var(--choco-deep); }
        /* 2 colunas: texto à esquerda, grid de combos à direita (preenche o vão). */
        .hmv2-voice__inner { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(300px, .82fr); gap: clamp(40px, 6vw, 96px); align-items: center; margin: 0; }
        .hmv2-voice__text { max-width: 56ch; }
        .hmv2-voice__intro { margin: 0 0 clamp(18px, 2.4vw, 28px); color: var(--yellow); font: 700 13px/1.2 var(--font-sans); letter-spacing: .08em; text-transform: uppercase; }
        .hmv2-voice__quote { margin: 0; color: var(--cream); font: 800 clamp(24px, 3.1vw, 44px)/1.12 var(--font-display); letter-spacing: -.03em; text-wrap: balance; }
        .hmv2-voice__quote::before { content: '\\201C'; }
        .hmv2-voice__quote::after { content: '\\201D'; }
        .hmv2-voice__foot { display: flex; align-items: center; gap: 16px; margin-top: clamp(28px, 3.4vw, 40px); flex-wrap: wrap; }
        .hmv2-voice__id { display: flex; flex-direction: column; }
        .hmv2-voice__id b { color: var(--cream); font: 800 15px/1.2 var(--font-sans); }
        .hmv2-voice__id span { color: rgba(255,241,230,.72); font: 500 13px/1.2 var(--font-sans); }
        .hmv2-voice__link { margin-top: 0; margin-left: auto; color: var(--pink); }
        .hmv2-voice__link:hover svg { transform: translateX(4px); }
        /* Coxinha (real) + marca da Jolie num bloco REDONDO. Sem retrato autorizado
           no acervo → o círculo usa o logo (contain); com foto, vira retrato (cover). */
        .hmv2-voice__media { position: relative; align-self: center; }
        .hmv2-voice__combo { display: block; width: 100%; aspect-ratio: 4 / 5; border-radius: var(--card-radius); transition: transform .3s var(--ease-out-soft); }
        .hmv2-voice__portrait { position: absolute; left: clamp(-22px, -2vw, -14px); bottom: clamp(-22px, -2vw, -14px); display: grid; place-items: center; width: clamp(104px, 13vw, 150px); aspect-ratio: 1; border-radius: 50%; overflow: hidden; background: var(--cream); border: 5px solid var(--choco-deep); box-shadow: 0 10px 26px rgba(0,0,0,.32); }
        .hmv2-voice__portrait img { width: 100%; height: 100%; object-fit: cover; }
        .hmv2-voice__portrait--logo img { object-fit: contain; padding: 18px; }
        @media (max-width: 960px) { .hmv2-voice__inner { grid-template-columns: 1fr; gap: clamp(34px, 7vw, 52px); } .hmv2-voice__text { max-width: none; } .hmv2-voice__media { max-width: 440px; } }
        .hmv2-press { display: grid; grid-template-columns: minmax(280px, .7fr) minmax(0, 1.3fr); gap: clamp(50px, 10vw, 160px); padding: clamp(90px, 12vw, 166px) var(--hm-gutter); background: #FDF8F0; }
        .hmv2-press h2 { max-width: 11ch; color: var(--ink); }
        .hmv2-press__head { display: flex; flex-direction: column; align-items: flex-start; }
        .hmv2-press__shots { margin: clamp(30px, 4vw, 52px) 0 0; width: 100%; max-width: 520px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .hmv2-press__shot { overflow: hidden; border-radius: 14px; background: var(--swc-coffee); box-shadow: var(--shadow-md); aspect-ratio: 1 / 1; }
        .hmv2-press__shot--lead { grid-column: 1 / -1; aspect-ratio: 1 / 1; }
        .hmv2-press__shot img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hmv2-press__shots figcaption { grid-column: 1 / -1; margin-top: 4px; color: var(--ink-soft); font: 700 12.5px/1.4 var(--font-sans); letter-spacing: .01em; text-wrap: pretty; }
        .hmv2-press__body { display: flex; flex-direction: column; gap: 8px; }
        .hmv2-press__feature { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: flex-start; padding: clamp(28px, 3.4vw, 46px) 0; border-top: 1px solid rgba(43,24,16,.2); border-bottom: 1px solid rgba(43,24,16,.2); color: var(--ink); transition: transform .22s ease; }
        .hmv2-press__feature:hover { transform: translateX(14px); }
        .hmv2-press__featureYear { position: absolute; top: 50%; right: 0; z-index: 0; transform: translateY(-50%); color: var(--ink); opacity: .05; font: 800 clamp(120px, 16vw, 260px)/1 var(--font-display); letter-spacing: -.05em; pointer-events: none; }
        .hmv2-press__featureOutlet { position: relative; z-index: 1; color: var(--coral-deep); font: 800 13px/1 var(--font-sans); letter-spacing: .08em; text-transform: uppercase; }
        .hmv2-press__feature strong { position: relative; z-index: 1; max-width: 20ch; margin: 18px 0 0; color: var(--ink); font: 800 clamp(30px, 3.6vw, 54px)/1.02 var(--font-display); letter-spacing: -.03em; text-wrap: balance; }
        .hmv2-press__featureLink { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 9px; margin-top: 22px; color: var(--ink); font: 800 14px/1 var(--font-sans); }
        .hmv2-press__feature svg { color: var(--coral-deep); }
        .hmv2-press__feed { width: 100%; }
        .hmv2-press__row { display: grid; grid-template-columns: clamp(110px, 13vw, 160px) minmax(0, 1fr) 52px 16px; gap: 16px; align-items: center; min-height: 58px; border-bottom: 1px solid rgba(43,24,16,.14); color: var(--ink); transition: transform .2s ease, background .2s ease; }
        .hmv2-press__row:hover { transform: translateX(10px); background: var(--cream-deep); }
        .hmv2-press__rowOutlet { overflow: hidden; color: var(--ink-soft); font: 700 11.5px/1.2 var(--font-sans); letter-spacing: .03em; text-transform: uppercase; white-space: nowrap; text-overflow: ellipsis; }
        .hmv2-press__rowTitle { overflow: hidden; color: var(--ink); font: 700 16px/1.3 var(--font-display); letter-spacing: -.01em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .hmv2-press__rowYear { color: var(--coral-deep); font: 700 13px/1 var(--font-sans); text-align: right; }
        .hmv2-press__row svg { color: var(--coral-deep); }
        .hmv2-press__toggle { align-self: flex-start; display: inline-flex; align-items: center; gap: 9px; margin-top: 22px; padding: 0; border: 0; background: transparent; color: var(--coral-deep); font: 800 14px/1 var(--font-sans); cursor: pointer; }
        .hmv2-press__toggle svg { width: 17px; height: 17px; }
        .hmv2-close { position: relative; overflow: hidden; display: grid; grid-template-columns: minmax(240px, .62fr) minmax(0, 1.38fr); gap: clamp(44px, 8vw, 130px); padding: clamp(78px, 10vw, 142px) var(--hm-gutter); background: #111111; }
        .hmv2-close__kv { position: absolute; top: 50%; right: -6%; width: clamp(340px, 46vw, 680px); transform: translateY(-50%); opacity: .13; pointer-events: none; }
        .hmv2-close__brand, .hmv2-close__copy { position: relative; z-index: 1; }
        .hmv2-close__brand span { display: block; margin-bottom: 20px; color: rgba(255,255,255,.6); font: 700 12px/1 var(--font-sans); letter-spacing: .1em; text-transform: uppercase; }
        .hmv2-close__brand img { width: min(clamp(230px, 26vw, 340px), 100%); filter: brightness(0) invert(1); }
        .hmv2-close h2 { max-width: 13ch; color: #fff; }
        .hmv2-close p { max-width: 46ch; margin: 24px 0 0; color: rgba(255,255,255,.78); font: 500 clamp(16px, 1.3vw, 20px)/1.48 var(--font-sans); }
        .hmv2-btn--dark { margin-top: 31px; background: #E50053; color: #fff; }
        .hmv2-btn--dark:hover { background: #c40047; }
        .hmv2 a:focus-visible, .hmv2 button:focus-visible { outline: 3px solid var(--cyan); outline-offset: 4px; }
        .hmv2-hl { color: var(--coral); font-style: normal; }
        .hmv2-city .hmv2-hl { color: var(--yellow); }
        .hmv2-close .hmv2-hl { color: #E50053; }
        .hmv2-proof .hmv2-hl { color: var(--coral-deep); }

        /* ============================================================
           MOTION LAYER (jul/2026) — camada de movimento viva da Home.
           Só transform / opacity / scale / translate / filter / clip-path /
           box-shadow. Idle roda só na foto .is-active (1 loop por rotator).
           Compõe com o cursor/scroll parallax (--hx/--hy/--sy/--csy) via as
           props próprias scale/translate, sem sobrescrever o transform. Tudo
           desligado em prefers-reduced-motion (bloco no fim).
           ============================================================ */

        /* -- Idle "respiração" das fotos: scale/translate (props próprias) --- */
        @keyframes hmv2HeroBreathe  { 0%, 100% { scale: 1.06;  translate: 0 0; } 50% { scale: 1.08;  translate: -0.5% 0.4%; } }
        @keyframes hmv2RouteBreathe { 0%, 100% { scale: 1.05;  translate: 0 0; } 50% { scale: 1.08;  translate: -0.8% -0.6%; } }
        @keyframes hmv2CityBreathe  { 0%, 100% { scale: 1.12;  translate: 0 0; } 50% { scale: 1.145; translate: 0.5% -0.5%; } }
        .hmv2-hero__photos .photo-rotator__img.is-active { animation: hmv2HeroBreathe 13s linear infinite; }
        .hmv2-route__photos .photo-rotator__img { scale: 1.05; transition: opacity 900ms var(--ease-out-soft), transform 800ms var(--ease-out-soft); }
        .hmv2-route__photos .photo-rotator__img.is-active { animation: hmv2RouteBreathe 18s linear infinite; }
        .hmv2-city__photos .photo-rotator__img { transform: translate3d(0, var(--csy, 0px), 0); scale: 1.12; transition: opacity 900ms var(--ease-out-soft); }
        .hmv2-city__photos .photo-rotator__img.is-active { animation: hmv2CityBreathe 16s linear infinite; }

        /* -- Cidade: reveal por clip-path (preserva a máscara do selo) + fade -- */
        /* Reveal usa só opacity/clip-path; o transform fica livre pro giro no scroll. */
        .hmv2-city__visual.motion-reveal-up { filter: none; transition: opacity var(--motion-reveal) var(--ease-out-soft); }
        .hmv2-city__photos { -webkit-clip-path: inset(0 0 100% 0); clip-path: inset(0 0 100% 0); transition: opacity 900ms var(--ease-out-soft), -webkit-clip-path 1000ms var(--ease-out-soft), clip-path 1000ms var(--ease-out-soft); }
        .hmv2-city__visual.is-in .hmv2-city__photos { -webkit-clip-path: inset(0 0 0 0); clip-path: inset(0 0 0 0); }

        /* -- Cards de rota: seta desliza, foto amplia, feedback de pressão ---- */
        .hmv2-route a svg { transition: transform .22s var(--ease-spring-soft); }
        .hmv2-text-link:active, .hmv2-press__toggle:active { scale: .97; }
        .hmv2-btn:active { scale: .96; }
        .hmv2-text-link svg, .hmv2-press__toggle svg { transition: transform .22s var(--ease-spring-soft); }

        /* -- Imprensa: destaque entra por translateX; ano gigante por opacity -- */
        .hmv2-press__feature.motion-reveal-up { transform: translateX(-28px); filter: none; }
        .hmv2-press__feature.motion-reveal-up.is-in { transform: none; }
        .hmv2-press__feature .hmv2-press__featureYear { opacity: 0; transition: opacity .9s var(--ease-out-soft) .18s, transform .5s var(--ease-out-soft); }
        .hmv2-press__feature.is-in .hmv2-press__featureYear { opacity: .05; }
        /* Polimento de hover: setas deslizam (idioma dos text-links) + profundidade no numeral fantasma. */
        .hmv2-press__row svg, .hmv2-press__featureLink svg { transition: transform .22s var(--ease-spring-soft); }
        .hmv2-press__row:hover svg,
        .hmv2-press__feature:hover .hmv2-press__featureLink svg { transform: translateX(4px); }
        .hmv2-press__feature:hover .hmv2-press__featureYear { opacity: .09; transform: translateY(-50%) scale(1.04); }

        /* -- Hero: texto em sequência (meta -> título -> palavra -> lead -> CTA) */
        .hmv2 .hmv2-hero__copy.motion-stagger > * { transform: translateY(20px); filter: none; transition: opacity .7s var(--ease-out-soft), transform .75s var(--ease-spring-soft); }
        .hmv2 .hmv2-hero__copy.motion-stagger > h1 { opacity: 1; transform: none; filter: none; transition: none; }
        .hmv2 .hmv2-hero__copy.motion-stagger.is-in > *:nth-child(2) { transition-delay: 340ms; }
        .hmv2 .hmv2-hero__copy.motion-stagger.is-in > *:nth-child(3) { transition-delay: 430ms; }
        .hmv2-hero__copy h1 .hmv2-hero__t, .hmv2-hero__copy h1 em { display: inline-block; opacity: 0; transform: translateY(24px); transition: opacity .7s var(--ease-out-soft), transform .8s var(--ease-spring-soft); }
        .hmv2-hero__copy.is-in h1 .hmv2-hero__t { opacity: 1; transform: none; transition-delay: 130ms; }
        .hmv2-hero__copy.is-in h1 em { opacity: 1; transform: none; transition-delay: 250ms; }

        /* -- Títulos de seção: palavra colorida entra logo após o bloco (§7) --- */
        .hmv2 .hmv2-hl { display: inline-block; opacity: 0; transform: translateY(10px); transition: opacity .55s var(--ease-out-soft), transform .6s var(--ease-spring-soft); }
        .hmv2 .is-in .hmv2-hl { opacity: 1; transform: none; transition-delay: .16s; }

        /* -- Ciclo: número -> título -> texto por item; linha desenha (§8) ----- */
        .hmv2 .hmv2-cycle__list.motion-stagger > li { opacity: 0; transform: translateY(16px); transition: opacity .5s var(--ease-out-soft), transform .55s var(--ease-spring-soft); }
        .hmv2 .hmv2-cycle__list.motion-stagger.is-in > li { opacity: 1; transform: none; }
        .hmv2-cycle__list.is-in li:nth-child(1) { transition-delay: 40ms; }
        .hmv2-cycle__list.is-in li:nth-child(2) { transition-delay: 120ms; }
        .hmv2-cycle__list.is-in li:nth-child(3) { transition-delay: 200ms; }
        .hmv2-cycle__list.is-in li:nth-child(4) { transition-delay: 280ms; }

        /* -- Números: tabular-nums evita "pulo" de largura na contagem (§9) ---- */
        .hmv2-proof__facts dt { font-variant-numeric: tabular-nums; }

        /* -- Ambiente muito sutil: indicador de scroll + símbolo F2 de fundo --- */
        @keyframes hmv2ScrollFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
        .hmv2-hero__scroll { animation: hmv2ScrollFloat 2.4s var(--ease-out-soft) infinite; }
        @keyframes hmv2KvDrift { 0%, 100% { transform: translateY(-50%) scale(1); } 50% { transform: translateY(-50%) scale(1.05); } }
        .hmv2-close__kv { animation: hmv2KvDrift 20s ease-in-out infinite; }

        /* -- Hover/tilt só com ponteiro fino; press feedback vale no toque ----- */
        @media (hover: hover) and (pointer: fine) {
          .hmv2-route:hover { --lift: -6px; box-shadow: 0 22px 44px rgba(43,24,16,.15); }
          .hmv2-route:hover a svg { transform: translateX(4px); }
          .hmv2-route--foto:hover .photo-rotator__img.is-active { transform: scale(1.06); }
          .hmv2-btn:hover { --btn-lift: -2px; }
          .hmv2-btn:hover svg { transform: translateX(3px); }
          .hmv2-text-link:hover svg { transform: translateX(4px); }
          .hmv2-voice__media:hover .hmv2-voice__combo { transform: scale(1.015); }
          .hmv2-proof__facts div:hover { transform: translateY(-3px); }
          .hmv2-hero__scroll:hover { animation: none; }
        }
        @media (max-width: 1080px) { .hmv2-hero__wrap { grid-template-columns: minmax(0, 1fr) 220px; gap: 50px; } .hmv2-city, .hmv2-proof, .hmv2-press, .hmv2-close { gap: 54px; } }
        @media (max-width: 960px) { .hmv2-hero__wrap { grid-template-columns: 1fr; } .hmv2-hero__edition { justify-self: start; width: auto; max-width: 360px; } .hmv2-routes, .hmv2-city, .hmv2-proof, .hmv2-press, .hmv2-close { grid-template-columns: 1fr; } .hmv2-routes { grid-template-areas: none; } .hmv2-route--foto { min-height: clamp(300px, 62vw, 460px); } .hmv2-routes__intro p, .hmv2-city__copy h2, .hmv2-proof h2, .hmv2-press h2 { max-width: 15ch; } .hmv2-city__visual { max-width: 720px; width: 100%; } .hmv2-cycle { grid-template-columns: 1fr; gap: clamp(28px, 5vw, 44px); } .hmv2-cycle__media { max-width: 520px; } .hmv2-close__brand { display: flex; align-items: center; gap: 24px; } .hmv2-close__brand span { margin: 0; } }
        @media (max-width: 720px) { .hmv2-hero { min-height: 760px; } .hmv2-hero__shade { background: linear-gradient(90deg, rgba(43,24,16,.94) 0%, rgba(43,24,16,.7) 55%, rgba(43,24,16,.3) 100%); } .hmv2-hero__wrap { padding-inline: clamp(24px, 7vw, 42px); } .hmv2-hero__scroll { right: clamp(24px, 7vw, 42px); } .hmv2-route:not(.hmv2-route--foto) { min-height: 245px; } .hmv2-proof__facts { grid-template-columns: 1fr; } .hmv2-cycle__list { padding-left: 0; } .hmv2-cycle__list::before, .hmv2-cycle__list::after { display: none; } .hmv2-press__row { grid-template-columns: minmax(0, 1fr) 16px; grid-template-areas: 'outlet outlet' 'title arrow'; row-gap: 4px; padding-block: 14px; } .hmv2-press__rowOutlet { grid-area: outlet; } .hmv2-press__rowTitle { grid-area: title; white-space: normal; } .hmv2-press__rowYear { display: none; } .hmv2-press__row svg { grid-area: arrow; } }
        @media (max-width: 560px) { .hmv2-hero { min-height: 690px; } .hmv2-hero__wrap { padding-top: max(var(--hero-content-start), 170px); padding-bottom: 86px; } .hmv2-hero h1 { font-size: clamp(54px, 15vw, 76px); } .hmv2-hero__edition { display: none; } .hmv2-hero__actions { flex-direction: column; align-items: stretch; } .hmv2-btn { width: 100%; } .hmv2-routes, .hmv2-city, .hmv2-cycle, .hmv2-proof, .hmv2-voice, .hmv2-press, .hmv2-close { padding-inline: clamp(24px, 7vw, 40px); } .hmv2-voice__link { margin-left: 0; } .hmv2-city__visual { min-height: 420px; } .hmv2-city__heart { width: 38%; } .hmv2-close__brand { align-items: flex-start; flex-direction: column; gap: 14px; } }
        @media (max-width: 420px) { .hmv2-hero h1 { font-size: 52px; } .hmv2-routes__intro p { font-size: 37px; } .hmv2-proof__facts dt { font-size: 56px; } }
        @media (prefers-reduced-motion: reduce) {
          .hmv2 *, .hmv2 *::before, .hmv2 *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
          .hmv2-city__photos { -webkit-clip-path: none !important; clip-path: none !important; }
          .hmv2 .hmv2-hl,
          .hmv2-hero__copy h1 .hmv2-hero__t,
          .hmv2-hero__copy h1 em { opacity: 1 !important; transform: none !important; scale: none !important; }
          .hmv2-cycle__list.motion-stagger > li { opacity: 1 !important; transform: none !important; }
          .hmv2-cycle__photo, .hmv2-cycle__list::after { transition: none !important; }
          .hmv2-press__feature .hmv2-press__featureYear { opacity: .05 !important; }
        }
      `}</style>
    </main>
  )
}
