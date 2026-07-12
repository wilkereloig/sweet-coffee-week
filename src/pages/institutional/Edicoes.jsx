/*
 * PÁGINA INSTITUCIONAL — "Edições" (painel-cena photo-first, "Cinema da Década").
 * Cada edição é uma CENA: foto do acervo em full-bleed + scrim no tom da edição,
 * com camada editorial por cima (numeral, tema, lead, pódio real da edição) e
 * filmstrip do acervo na base. O scroll vertical continua avançando o trilho
 * horizontal (motor de passos discretos preservado). No mobile / reduced-motion,
 * os painéis empilham na vertical: foto vira cabeçalho de capítulo 4:5 com o
 * título sobreposto e o corpo respira em fundo creme.
 * Spec: docs/superpowers/specs/2026-07-07-edicoes-cinema-da-decada-design.md
 *
 * Dados (regra: NÃO inventar):
 * - Texto editorial por edição: src/data/editions.js.
 * - Metadados oficiais (tema, período, participantes, status da premiação):
 *   src/data/sweetCoffeeHistory.js.
 * - Pódio-resumo (1º lugares, empates) + frames de cena: src/data/editionHighlights.js
 *   (2026.1 vem de loversAwardsResults.js, nunca da base histórica).
 * - Galeria completa: src/data/editionGallery.js; marca: editionAssets.js;
 *   logos de vencedores: resolveParticipant (fallback de iniciais).
 *
 * Classe-prefixo `edx-` de propósito: escapa da regra global de hero 1080px.
 */
import React from 'react'
import { I } from '../../components/icons'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'
import { useSteppedPresentation } from '../../hooks/useSteppedPresentation'
import { EDITIONS } from '../../data/editions'
import { SWEET_COFFEE_HISTORY } from '../../data/sweetCoffeeHistory'
import { EDITION_GALLERY } from '../../data/editionGallery'
import { COMBO_PHOTOS } from '../../data/comboPhotos'
import { getEditionHighlights, sceneShotsFor } from '../../data/editionHighlights'
import { getEditionInsights } from '../../data/editionInsights'
import { getDecadeCredits } from '../../data/decadeCredits'
import { resolveParticipant } from '../../data/participantAssets'
import { editionMark } from '../../data/editionAssets'
import { focalPosition } from '../../data/focalPoints'
import { PhotoRotator } from '../../components/PhotoRotator'
import { setActiveEditionBrand } from '../../state/activeEditionBrand'

const histById = Object.fromEntries(SWEET_COFFEE_HISTORY.edicoes.map((e) => [e.id, e]))

// Acento por edição — só cores da paleta oficial.
const TONES = ['coral', 'pink', 'cyan', 'yellow']

// 16 cenas: editorial (editions.js) + oficial (sweetCoffeeHistory) + destaques.
const PANELS = EDITIONS.map((ed, i) => {
  const h = histById[ed.ano] || {}
  const editionWebp = EDITION_GALLERY[ed.ano] || []
  // Galeria (filmstrip): na edição Lovers, 1 combo principal por participante
  // (COMBO_PHOTOS = /images/combos/<slug>/main.jpg; cobre 19 dos 21 participantes
  // oficiais — faltam fotos de Casa de Taipa Tapiocaria e Olí Gastrô no acervo).
  // Históricas usam o acervo webp (não há foto de combo por participante delas).
  const gallery = ed.ano === '2026.1' ? COMBO_PHOTOS : editionWebp
  return {
    code: ed.ano,
    slug: ed.slug,
    number: i + 1,
    theme: h.tema || ed.nome,
    periodo: h.periodo || ed.periodo,
    participantsCount: h.participantesCount != null ? h.participantesCount : ed.participantes,
    participants: Array.isArray(h.participantes) ? h.participantes : [],
    special: ed.ano === '2026.1',
    paragraphs: (ed.desc || '').split('\n\n').map((s) => s.trim()).filter(Boolean),
    gallery,
    scene: sceneShotsFor(ed.ano, editionWebp),
    highlights: getEditionHighlights(ed.ano),
    tone: TONES[i % TONES.length],
  }
})
const TOTAL = PANELS.length
// Trilho = 16 cenas + 1 estado final (créditos da década). A sequência editorial
// continua 1→16; os créditos são o fecho da sessão, não uma 17ª edição.
const TOTAL_STEPS = TOTAL + 1
const pad2 = (n) => String(n).padStart(2, '0')

// Rótulo curto da trilha — mostrado só quando ambíguo (ver EditionPodium).
const TRILHA_LABEL = { juri_tecnico: 'Júri Técnico', sweet_lovers: 'Sweet Lovers' }

// Pódio-resumo da edição — só dados reais (1º lugares; empates lado a lado).
function EditionPodium({ e, go }) {
  const hl = e.highlights
  if (!hl) return null
  // 2019.1 é o marco: primeira premiação encontrada no acervo.
  const title = e.code === '2019.1' ? 'A primeira premiação do festival' : 'Pódio da edição'
  // Várias edições (2020.2, 2021.1, 2021.2, Lovers) têm a MESMA categoria
  // premiada em duas trilhas (Júri Técnico / Sweet Lovers), cada uma com seu
  // 1º lugar. Sem o sufixo de trilha, duas linhas "1º · Melhor Combo" com
  // vencedores diferentes leem como dado contraditório — então o sufixo entra
  // só quando a categoria de fato se repete no painel (ambiguidade real), não
  // por edição ser ou não a especial.
  const catCounts = hl.firsts.reduce((acc, f) => { acc[f.categoria] = (acc[f.categoria] || 0) + 1; return acc }, {})
  return (
    <div className="edx-podio">
      <p className="edx-podio__t">{title}</p>
      <ul className="edx-podio__list">
        {hl.firsts.map((f) => {
          const winners = f.nomes.map((n) => resolveParticipant(n))
          const showTrilha = catCounts[f.categoria] > 1 && f.trilha && TRILHA_LABEL[f.trilha]
          return (
            <li className="edx-podio__row" key={`${f.categoria}-${f.trilha || ''}`}>
              <span className="edx-podio__medal" aria-hidden="true">1º</span>
              <span className="edx-podio__logos">
                {winners.map((w) => (
                  <span className={`edx-podio__logo${w.logo ? ' edx-podio__logo--img' : ''}`} key={w.name} title={w.name}>
                    {w.logo
                      ? <img src={w.logo} alt="" loading="lazy" decoding="async"
                          onError={(ev) => { ev.currentTarget.style.display = 'none'; ev.currentTarget.nextSibling.style.display = 'grid'; ev.currentTarget.parentElement.classList.remove('edx-podio__logo--img') }} />
                      : null}
                    <span className="edx-podio__ini" style={w.logo ? { display: 'none' } : undefined}>{w.fallback}</span>
                  </span>
                ))}
              </span>
              <span className="edx-podio__what">
                <span className="edx-podio__cat">
                  {f.categoria}{showTrilha ? ` · ${TRILHA_LABEL[f.trilha]}` : ''}
                </span>
                <span className="edx-podio__win">{f.nomes.join(' + ')}</span>
              </span>
            </li>
          )
        })}
      </ul>
      <a href="#/sweet-awards" className="edx-podio__link" onClick={go('/sweet-awards')}>
        {e.special ? 'Ver todos os vencedores' : 'Pódio completo no Sweet Awards'}
      </a>
    </div>
  )
}

// Bloco flutuante com os nomes reais dos participantes da edição (fonte:
// sweetCoffeeHistory). Colapsado por padrão: clicar abre a lista com animação
// (grid-template-rows 0fr→1fr). Desktop: card ancorado ao canto da grade;
// mobile: entra no fluxo do corpo. Some quando a edição não lista nomes.
function EditionParticipants({ e }) {
  const list = e.participants
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const asideRef = React.useRef(null)
  // limpa a busca ao fechar (reabre limpa). Hook antes de qualquer return (regras).
  React.useEffect(() => { if (!open) setQ('') }, [open])
  // ao abrir, rola o painel pra dentro do rail: como o toggle costuma ficar no
  // fim da coluna, a lista aberta nasce abaixo do fade/corte. Espera a animação
  // grid (motion-med) e traz o fim do painel pra vista. `block: 'end'` alinha a
  // base à base do rail — mostra a lista, não só o cabeçalho.
  React.useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      asideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 260)
    return () => clearTimeout(t)
  }, [open])
  const panelId = `edx-parts-${e.code}`
  const searchId = `edx-parts-q-${e.code}`

  // Sem nomes reais da edição na base: estado honesto, não esconde a ausência.
  if (!list.length) {
    return (
      <aside className="edx-parts edx-parts--empty">
        <p className="edx-parts__pending">Lista de participantes pendente</p>
      </aside>
    )
  }

  // Busca só quando a lista é grande o suficiente pra justificar (evita input
  // ocioso em edições curtas). Filtro case-insensitive por nome.
  const big = list.length >= 10
  const nq = q.trim().toLowerCase()
  const filtered = nq ? list.filter((n) => n.toLowerCase().includes(nq)) : list

  return (
    <aside
      ref={asideRef}
      className={`edx-parts${open ? ' is-open' : ''}`}
      onKeyDown={(ev) => { if (ev.key === 'Escape' && open) { setOpen(false) } }}
    >
      <button
        type="button"
        className="edx-parts__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="edx-parts__t">Ver participantes · {list.length}</span>
        <span className="edx-parts__chev" aria-hidden="true"><I.chevronRight width={16} height={16} /></span>
      </button>
      {/* aria-hidden + inert (não só grid-rows:0fr) pra garantir que a lista
          fechada some de verdade da árvore de acessibilidade, não só visualmente */}
      <div
        className="edx-parts__reveal"
        id={panelId}
        role="region"
        aria-label={`Participantes da edição ${e.theme}`}
        aria-hidden={!open}
        inert={open ? undefined : ''}
      >
        {/* wrapper único: o colapso grid 0fr->1fr só clipa UM filho. Sem ele, em
            edições grandes (busca + lista = 2 filhos) a lista cai numa linha
            implícita auto e vaza aberta atrás da foto. */}
        <div className="edx-parts__inner">
        {big && (
          <div className="edx-parts__search">
            <label htmlFor={searchId} className="edx-sr">Buscar participante</label>
            <input
              id={searchId}
              type="search"
              className="edx-parts__input"
              value={q}
              onChange={(ev) => setQ(ev.target.value)}
              placeholder="Buscar participante"
              autoComplete="off"
            />
          </div>
        )}
        <ul className={`edx-parts__list motion-stagger${open ? ' is-in' : ''}`}>
          {filtered.map((n) => {
            const p = resolveParticipant(n)
            return (
              <li key={n}>
                <span className={`edx-parts__logo${p.logo ? ' edx-parts__logo--img' : ''}`} aria-hidden="true">
                  {p.logo
                    ? <img src={p.logo} alt="" loading="lazy" decoding="async"
                        onError={(ev) => { ev.currentTarget.style.display = 'none'; ev.currentTarget.nextSibling.style.display = 'grid'; ev.currentTarget.parentElement.classList.remove('edx-parts__logo--img') }} />
                    : null}
                  <span className="edx-parts__ini" style={p.logo ? { display: 'none' } : undefined}>{p.fallback}</span>
                </span>
                <span className="edx-parts__name">{n}</span>
              </li>
            )
          })}
          {!filtered.length && <li className="edx-parts__none">Nenhum participante encontrado.</li>}
        </ul>
        </div>
      </div>
    </aside>
  )
}


// Curiosidades verificadas da edição (0–3) como cards editoriais flutuantes:
// no rail (desktop) ou no fluxo do corpo (mobile). Só monta quando há dado real
// (getEditionInsights) — nunca inventa, nunca força o mesmo nº de cards por
// edição. Entra em stagger quando a cena fica ativa.
function EditionInsights({ e, isActive }) {
  const items = getEditionInsights(e.code)
  if (!items.length) return null
  return (
    <div className={`edx-insights motion-stagger${isActive ? ' is-in' : ''}`}>
      {items.map((it) => (
        <article className="edx-insight" key={it.title}>
          <p className="edx-insight__t">{it.title}</p>
          <p className="edx-insight__x">{it.text}</p>
          {it.value ? <span className="edx-insight__v">{it.value}</span> : null}
        </article>
      ))}
    </div>
  )
}

// Filmstrip do acervo da edição — thumbs estáticas com scroll-snap; clique
// troca a foto-cena. Só monta no slide em foco (e vizinhos): 16 × ~12 imgs de
// uma vez congelaria o 1º paint.
function Filmstrip({ e, current, onPick }) {
  if (!e.gallery.length) return null
  return (
    <div className="edx-strip" role="group" aria-label={`Acervo da edição ${e.theme}`}>
      {e.gallery.map((src, i) => (
        <button
          type="button"
          key={src}
          className={`edx-strip__th${src === current ? ' is-on' : ''}`}
          onClick={() => onPick(src)}
          aria-label={`Ver foto ${i + 1} de ${e.gallery.length} em destaque`}
          aria-pressed={src === current}
        >
          <img src={src} alt="" loading="lazy" decoding="async" style={{ objectPosition: focalPosition(src) }} />
        </button>
      ))}
    </div>
  )
}

// Carrossel de fotos da hero (mobile): as fotos do acervo da edição viram um
// trilho horizontal com scroll-snap nativo (swipe do sistema, app-like), no
// lugar da fileira de miniaturas. Bolinhas indicam a posição. Substitui o
// PhotoRotator automático no mobile — aqui quem avança é o dedo.
function HeroCarousel({ images, alt, eager = false, autoplay = false }) {
  const [idx, setIdx] = React.useState(0)
  const ref = React.useRef(null)
  const onScroll = () => {
    const el = ref.current
    if (!el) return
    setIdx(Math.round(el.scrollLeft / el.clientWidth))
  }

  // Transição automática — só na cena ativa (autoplay), avança 1 foto a cada
  // 5s com scroll suave (loopando). Pausa em aba oculta e respeita reduced-motion.
  React.useEffect(() => {
    if (!autoplay || images.length <= 1) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      const el = ref.current
      if (!el || (typeof document !== 'undefined' && document.hidden)) return
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % images.length
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    }, 5000)
    return () => clearInterval(id)
  }, [autoplay, images.length])
  return (
    <div className="edx-hero-carousel">
      <div className="edx-hero-carousel__track" ref={ref} onScroll={onScroll}
           role="group" aria-roledescription="carrossel" aria-label={`Fotos: ${alt}`}>
        {images.map((src, i) => (
          <div className={`edx-hero-carousel__slide${i === idx ? ' is-active' : ''}`} key={src}>
            <img src={src} alt={i === 0 ? alt : ''} aria-hidden={i === 0 ? undefined : 'true'}
                 loading={eager && i === 0 ? 'eager' : 'lazy'} decoding="async"
                 style={{ objectPosition: focalPosition(src), transformOrigin: focalPosition(src) }} />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="edx-hero-carousel__dots" aria-hidden="true">
          {images.map((src, i) => <span key={src} className={i === idx ? 'is-on' : ''} />)}
        </div>
      )}
    </div>
  )
}

// Corpo editorial da cena: lead curto sempre visível; o restante da história
// entra numa expansão acessível ("Ler a história completa") — evita despejar 4
// parágrafos longos sobre a foto. Esc fecha; aria-expanded/controls no botão.
function EditionStory({ e, isActive }) {
  const [open, setOpen] = React.useState(false)
  const paras = e.paragraphs
  if (!paras.length) return null
  const lead = paras[0]
  const rest = paras.slice(1)
  const panelId = `edx-story-${e.code}`
  return (
    <div
      className={`edx-story${open ? ' is-open' : ''}`}
      onKeyDown={(ev) => { if (ev.key === 'Escape' && open) setOpen(false) }}
    >
      <div className={`edx-scene__text motion-stagger${isActive ? ' is-in' : ''}`}>
        <p className="edx-scene__lead">{lead}</p>
      </div>
      {rest.length > 0 && (
        <>
          <button
            type="button"
            className="edx-story__toggle"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? 'Fechar a história' : 'Ler a história completa'}
            <I.chevronRight width={15} height={15} aria-hidden="true" />
          </button>
          <div
            className="edx-story__reveal"
            id={panelId}
            role="region"
            aria-label={`História completa da edição ${e.theme}`}
            aria-hidden={!open}
            inert={open ? undefined : ''}
          >
            <div className="edx-story__full">
              {rest.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Cena de uma edição. `live`: crossfade + filmstrip só no slide em foco e
// vizinhos. `near`: a foto full-bleed só monta perto do foco (16 imagens de
// viewport inteiro decodificadas de uma vez travam o compositor). `isActive`:
// só a cena realmente em tela (desktop) fica alcançável por teclado/leitor de
// tela — as vizinhas `near`/`live` continuam fora da viewport, clipadas pelo
// `.edx-viewport{overflow:hidden}`, então ficam inert (mobile não usa isso: lá
// não há clipping, todo painel é navegável no fluxo normal). `offset`:
// parallax da camada de foto (desktop).
function EditionScene({ e, live, near = true, isActive = true, offset = 0, go, stacked = false, autoplay = false }) {
  // Foto escolhida na filmstrip vence o crossfade automático.
  const [picked, setPicked] = React.useState(null)
  // Frame que o PhotoRotator está exibindo agora (crossfade automático) — sem
  // isso, o destaque da filmstrip ficava preso no 1º frame mesmo depois do
  // crossfade trocar de foto.
  const [rotatorSrc, setRotatorSrc] = React.useState(null)
  const usingRotator = !picked && live && e.scene.length >= 2
  const heroShot = picked || e.scene[0] || e.gallery[0] || null
  const current = picked || (usingRotator && rotatorSrc) || heroShot
  // Cenas longe do foco viram casca vazia: rasterizar 16 cenas full-viewport num
  // trilho de 1600vw trava o compositor. O conteúdo monta ao chegar a 2 passos.
  if (!near) {
    return (
      <article
        className="edx-scene edx-scene--far"
        id={`edx-panel-${e.number - 1}`}
        style={{ '--tone': `var(--${e.tone}, var(--page-accent))` }}
        aria-roledescription="slide"
        aria-label={`Edição ${e.number} de ${TOTAL}: ${e.theme} (${e.code})`}
      />
    )
  }
  const sceneImgs = e.scene.map((src) => ({ src, alt: `Combo do acervo, edição ${e.theme}` }))
  // Mobile: fotos do acervo (gallery) viram carrossel na própria hero.
  const heroImages = e.gallery.length ? e.gallery : e.scene
  return (
    <article
      className={`edx-scene${e.special ? ' edx-scene--special' : ''}${isActive ? ' is-active' : ''}`}
      id={`edx-panel-${e.number - 1}`}
      style={{ '--tone': `var(--${e.tone}, var(--page-accent))`, '--par': `${offset}vw` }}
      aria-roledescription="slide"
      aria-label={`Edição ${e.number} de ${TOTAL}: ${e.theme} (${e.code})`}
      aria-hidden={isActive ? undefined : true}
      inert={isActive ? undefined : ''}
    >
      {/* camada 1 — foto-cena + scrim. Mobile: carrossel de fotos swipeável na
          própria hero (app-like). Desktop: crossfade automático (PhotoRotator). */}
      <div className="edx-scene__media">
        {stacked && heroImages.length ? (
          <HeroCarousel images={heroImages} alt={`Acervo da edição ${e.theme}`} eager={e.number === 1} autoplay={autoplay} />
        ) : heroShot ? (
          !usingRotator
            ? <img src={heroShot} alt={`Combo do acervo, edição ${e.theme}`} loading={e.number === 1 ? 'eager' : 'lazy'} decoding="async"
                style={{ objectPosition: focalPosition(heroShot), transformOrigin: focalPosition(heroShot) }} />
            : <PhotoRotator images={sceneImgs} interval={7200} eager={e.number === 1} onActiveChange={setRotatorSrc} useFocalPoint />
        ) : (
          <span className="edx-scene__nofoto"><I.cal width={22} height={22} /><span>Acervo desta edição pendente</span></span>
        )}
        <span className="edx-scene__scrim" aria-hidden="true" />
      </div>

      {/* cabeçalho do capítulo: no desktop entra na coluna; no mobile fica sobre a foto.
          motion-stagger/is-in (motion-system.css) — entra em sequência quando a cena
          fica ativa; some quando o painel deixa de estar em foco (reforça o corte
          editorial de "cena"). No mobile isActive é sempre true (default do prop),
          então is-in já nasce aplicado — sem observador de scroll ali (§ combinado). */}
      <header className={`edx-scene__head motion-stagger${isActive ? ' is-in' : ''}`}>
        <span className="edx-scene__code">{e.number}ª edição · {e.code}</span>
        <h2 className="edx-scene__title">{e.theme}</h2>
        <p className="edx-scene__meta">
          {e.periodo || null}
          {e.periodo && e.participantsCount != null ? ' · ' : ''}
          {e.participantsCount != null ? `${e.participantsCount} participantes` : ''}
        </p>
      </header>

      {/* camada 2 — corpo editorial: lead curto + história completa em expansão.
          O fecho da apresentação (CTA Sweet Awards) vive nos CRÉDITOS DA DÉCADA,
          o estado final do trilho — CTA único, sem duplicar na cena Lovers. */}
      <div className="edx-scene__body">
        <EditionStory e={e} isActive={isActive} />
      </div>

      {/* camada 3 — rail flutuante (canto direito no desktop): pódio (ou nota de
          status) + curiosidades verificadas + participantes */}
      <div className="edx-rail">
        <EditionPodium e={e} go={go} />
        <EditionInsights e={e} isActive={isActive} />
        <EditionParticipants e={e} />
      </div>

      {/* Gated por `near` (não `live`): no mobile `near` é sempre true (todas as
          16 cenas já montam cheias), então o filmstrip nunca monta/desmonta durante
          o scroll — antes, gated por `live`, o filmstrip aparecia/sumia conforme
          `active` mudava (IntersectionObserver), empurrando o layout e quebrando o
          scrollIntoView de saltos longos (sheet/timeline pulando pra edição distante
          parava no meio do caminho). No desktop `near` já limita a mesma janela de
          painéis plenamente montados — só amplia de "1 vizinho" pra "2 vizinhos". */}
      {/* Filmstrip só no desktop: no mobile as fotos vivem no carrossel da hero. */}
      {!stacked && <Filmstrip e={{ ...e, gallery: near ? e.gallery : [] }} current={current} onPick={setPicked} />}
    </article>
  )
}

// CRÉDITOS DA DÉCADA — estado final do trilho ("A Década em Cartaz", Ato III).
// Rolagem de créditos de cinema com dados 100% reais (getDecadeCredits):
// 1º lugares por edição (empates preservados) + elenco Lovers + Realização.
// Desktop: rolagem automática em loop (2 cópias + translateY -50%, padrão
// marquee — transform-only), pausa em hover, roda só quando a cena está ativa.
// Mobile (stacked) / reduced-motion: lista estática, o painel rola no dedo.
function DecadeCredits({ isActive = false, near = true, go, stacked = false }) {
  const credits = React.useMemo(() => getDecadeCredits(), [])
  if (!near) {
    return <article className="edx-scene edx-credits edx-scene--far" id={`edx-panel-${TOTAL}`} aria-roledescription="slide" aria-label="Créditos da década" />
  }
  const blocks = (
    <>
      {credits.editions.map((ed) => (
        <section className="edx-credits__block" key={ed.code}>
          <h3 className="edx-credits__edition">{ed.tema} · {ed.code}</h3>
          <ul className="edx-credits__list">
            {ed.firsts.map((f) => (
              <li key={`${f.categoria}-${f.trilha || ''}`}>
                <span className="edx-credits__cat">{f.categoria}{f.trilha && TRILHA_LABEL[f.trilha] ? ` · ${TRILHA_LABEL[f.trilha]}` : ''}</span>
                <span className="edx-credits__who">{f.nomes.join(' + ')}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="edx-credits__block">
        <h3 className="edx-credits__edition">Elenco da Sweet &amp; Coffee Week Lovers</h3>
        <ul className="edx-credits__list edx-credits__list--cast">
          {credits.cast.map((n) => <li key={n}><span className="edx-credits__who">{n}</span></li>)}
        </ul>
      </section>
      <section className="edx-credits__block">
        <h3 className="edx-credits__edition">Realização</h3>
        <ul className="edx-credits__list">
          <li><span className="edx-credits__who">F2 Experience</span></li>
        </ul>
      </section>
    </>
  )
  return (
    <article
      className={`edx-scene edx-credits${isActive ? ' is-active' : ''}`}
      id={`edx-panel-${TOTAL}`}
      aria-roledescription="slide"
      aria-label="Créditos da década"
      aria-hidden={stacked || isActive ? undefined : true}
      inert={stacked || isActive ? undefined : ''}
    >
      <div className="edx-credits__inner">
        <header className={`edx-credits__head motion-stagger${isActive ? ' is-in' : ''}`}>
          <span className="edx-scene__code">Fim da sessão</span>
          <h2 className="edx-credits__title">Uma década em créditos.</h2>
          <p className="edx-credits__lead">Cada edição reconheceu marcas reais da cidade. Os primeiros lugares da história, na ordem em que aconteceram.</p>
        </header>
        <div className="edx-credits__stage" aria-label="Vencedores da década, por edição">
          <div className="edx-credits__roll">
            <div>{blocks}</div>
            {!stacked && <div aria-hidden="true">{blocks}</div>}
          </div>
        </div>
        <a href="#/sweet-awards" className="edx-credits__cta" onClick={go('/sweet-awards')}>Ver o Sweet Awards</a>
      </div>
    </article>
  )
}

// Timeline de anos — controle de apresentação (substitui os chips numerados).
function YearRail({ active, onPick }) {
  const listRef = React.useRef(null)
  // A lista de 16 anos estoura a largura em telas médias (980-1300px) sem
  // pista nenhuma de que rola — e o item ativo pode ficar fora da área visível
  // ao navegar pelas setas. Mantém o pill ativo sempre à vista.
  React.useEffect(() => {
    const activeEl = listRef.current && listRef.current.querySelector('.edx-anos__item.is-active')
    if (!activeEl) return
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }, [active])
  return (
    <nav className="edx-anos" aria-label="Navegar pelas edições">
      <ul className="edx-anos__list" ref={listRef}>
        {PANELS.map((e, i) => (
          <li key={e.code}>
            <button
              type="button"
              className={`edx-anos__item${i === active ? ' is-active' : ''}`}
              aria-current={i === active ? 'true' : undefined}
              aria-label={`Edição ${e.code}: ${e.theme}`}
              onClick={() => onPick(i)}
            >
              <span className="edx-anos__yr">{e.special ? 'Lovers' : e.code}</span>
              {i === active && <span className="edx-anos__th" aria-hidden="true">{e.theme}</span>}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function EdicoesPage({ navigate }) {
  const pageRef = React.useRef(null)
  const outerRef = React.useRef(null)
  const stackListRef = React.useRef(null)
  useRevealOnScroll(pageRef)
  const [active, setActive] = React.useState(0)
  const [horizontal, setHorizontal] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  // Modo horizontal só no desktop e sem reduced-motion.
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mqWide = window.matchMedia('(min-width: 960px)')
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const evaluate = () => setHorizontal(mqWide.matches && !mqMotion.matches)
    evaluate()
    mqWide.addEventListener('change', evaluate)
    mqMotion.addEventListener('change', evaluate)
    return () => { mqWide.removeEventListener('change', evaluate); mqMotion.removeEventListener('change', evaluate) }
  }, [])

  useSteppedPresentation({ enabled: horizontal, stageRef: outerRef, total: TOTAL_STEPS, active, setActive })

  // Cortina de tom ("A Década em Cartaz"): a cada troca de cena, uma cortina no
  // tom da cena DESTINO varre a viewport (transform-only, pointer-events none —
  // nunca bloqueia teclado/gesto). key nova por troca → a animação reinicia; a
  // varredura anterior é simplesmente substituída (interruptível). Não dispara
  // no primeiro render nem no modo mobile. Reduced-motion: display none (CSS).
  const [wipe, setWipe] = React.useState(null)
  const wipeSeq = React.useRef(0)
  const wipePrev = React.useRef(active)
  React.useEffect(() => {
    if (wipePrev.current === active) return
    wipePrev.current = active
    if (!horizontal) return
    const target = PANELS[active]
    wipeSeq.current += 1
    setWipe({ k: wipeSeq.current, tone: target ? target.tone : 'yellow' })
  }, [active, horizontal])

  // Cena em foco publica a logo da edição pro header (troca a marca padrão
  // enquanto a página estiver aberta); limpa ao trocar de cena/desmontar.
  React.useEffect(() => {
    const p = PANELS[active]
    const mark = p ? editionMark(p.code) : null
    setActiveEditionBrand(mark && mark.logo ? { logo: mark.logo, alt: `Sweet & Coffee Week — ${mark.title}` } : null)
    return () => setActiveEditionBrand(null)
  }, [active])

  // Modo mobile: carrossel horizontal (scroll-snap nativo) — observa qual
  // painel está em foco dentro do próprio contêiner de scroll (root), não do
  // viewport vertical, pra acender a taskbar/logo correta.
  React.useEffect(() => {
    if (horizontal || typeof window === 'undefined') return
    const root = stackListRef.current
    const nodes = Array.from({ length: TOTAL_STEPS }, (_, i) => document.getElementById(`edx-panel-${i}`)).filter(Boolean)
    if (!root || !nodes.length) return
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) setActive(Number(en.target.id.replace('edx-panel-', '')))
      })
    }, { root, threshold: 0.6 })
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [horizontal])

  const pick = React.useCallback((i) => {
    if (horizontal) {
      setActive(i)
      // pulo instantâneo: smooth aqui percorre a página inteira, é interrompível
      // (re-render/gesto) e deixa o stage desalinhado no meio do caminho.
      const stage = outerRef.current
      if (stage) stage.scrollIntoView({ behavior: 'auto', block: 'start' })
      return
    }
    if (typeof window === 'undefined') return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const el = document.getElementById(`edx-panel-${i}`)
    if (!el) return
    // Carrossel horizontal mobile: scrollIntoView com inline resolve o scroll do
    // próprio contêiner (root do IntersectionObserver acima), sem tocar no scroll
    // vertical da página. Salto longo (sheet escolhendo edição distante):
    // instantâneo — smooth por várias telas de distância é interrompível. Passo
    // curto (seta prev/next): smooth, dá o "vira a página".
    const far = Math.abs(i - active) > 1
    el.scrollIntoView({ behavior: (reduce || far) ? 'auto' : 'smooth', inline: 'start', block: 'nearest' })
  }, [horizontal, active])

  const go = (path) => (e) => { e.preventDefault(); navigate(path); if (typeof window !== 'undefined') window.scrollTo(0, 0) }

  // Taskbar mobile (prev/next + quick-jump): fecha o sheet se o modo virar
  // horizontal no meio do caminho (giro de tela/resize pra desktop).
  React.useEffect(() => { if (horizontal) setSheetOpen(false) }, [horizontal])

  // Sheet do taskbar: Esc fecha e trava o scroll do fundo (mesmo padrão do menu principal).
  React.useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setSheetOpen(false) }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [sheetOpen])

  return (
    <div className={`page-enter edx-page${!horizontal ? ' edx-page--tabbar' : ''}`}>
      {horizontal ? (
        /* DESKTOP — apresentação horizontal scroll-driven */
        <section
          ref={outerRef}
          className="edx-stage"
          style={{ height: '130vh' }}
          role="region"
          aria-roledescription="carousel"
          aria-label="Apresentação das edições"
        >
          <div className="edx-sticky">
            <div className="edx-viewport">
              <div className="edx-track" style={{ width: `${TOTAL_STEPS * 100}vw`, transform: `translateX(${-active * 100}vw)` }}>
                {PANELS.map((e, i) => (
                  <EditionScene e={e} key={e.code} live={Math.abs(i - active) <= 1} near={Math.abs(i - active) <= 2} isActive={i === active} offset={(i - active) * 12} go={go} />
                ))}
                <DecadeCredits isActive={active === TOTAL} near={active >= TOTAL - 1} go={go} />
              </div>
            </div>

            {wipe && <span key={wipe.k} className="edx-wipe" style={{ '--tone': `var(--${wipe.tone}, var(--page-accent))` }} aria-hidden="true" />}

            {active > 0 && (
              <button type="button" className="edx-arrow edx-arrow--prev" onClick={() => setActive((a) => Math.max(a - 1, 0))} aria-label="Edição anterior">
                <I.chevronLeft width={22} height={22} />
              </button>
            )}
            {active < TOTAL_STEPS - 1 && (
              <button type="button" className="edx-arrow edx-arrow--next" onClick={() => setActive((a) => Math.min(a + 1, TOTAL_STEPS - 1))} aria-label={active === TOTAL - 1 ? 'Créditos da década' : 'Próxima edição'}>
                <I.chevronRight width={22} height={22} />
              </button>
            )}

            {/* leitura de progresso p/ leitores de tela; visualmente o título da
                cena + medidor + timeline já contam a posição (sem chip flutuante
                brigando com o menu). */}
            <p className="edx-sr" aria-live="polite">{active < TOTAL ? `${pad2(active + 1)} de ${pad2(TOTAL)}: ${PANELS[active].theme}` : 'Créditos da década'}</p>

            {/* MEDIDOR DA DÉCADA — 16 segmentos, um por edição, cada um no tom da
                sua edição; acendem conforme a década avança (posição + espectro
                da década em um relance). Navegação acessível continua no YearRail. */}
            <div className="edx-meter" aria-hidden="true">
              {PANELS.map((p, i) => (
                <span
                  key={p.code}
                  className={`edx-meter__seg${i <= Math.min(active, TOTAL - 1) ? ' is-lit' : ''}`}
                  style={{ '--tone': `var(--${p.tone}, var(--page-accent))` }}
                />
              ))}
            </div>
            <YearRail active={active} onPick={pick} />
          </div>
        </section>
      ) : (
        /* MOBILE / reduced-motion — carrossel horizontal (scroll-snap nativo);
           avança com swipe ou pelas setas/sheet da taskbar do rodapé. */
        <section className="edx-stack" aria-label="Edições">
          <div className="edx-stack__list" ref={stackListRef} role="region" aria-roledescription="carousel" aria-label="Apresentação das edições">
            {PANELS.map((e, i) => <EditionScene e={e} key={e.code} live={Math.abs(i - active) <= 1} go={go} stacked autoplay={i === active} />)}
            <DecadeCredits stacked go={go} isActive={active === TOTAL} />
          </div>
        </section>
      )}

      {/* TASKBAR MOBILE — navegação primária no alcance do polegar (rodapé),
          em vez de só a timeline no topo. Prev/next avança um painel; o botão
          central abre o sheet de salto direto pra qualquer uma das 16. */}
      {!horizontal && (() => {
        // Créditos (índice TOTAL) não têm painel em PANELS — fallback do rótulo/tom.
        const cur = PANELS[active] || { tone: 'yellow', code: '10 anos', theme: 'Créditos da década', special: false }
        return (
        <nav className="edx-tabbar" aria-label="Navegação entre edições"
             style={{ '--tone': `var(--${cur.tone}, var(--page-accent))` }}>
          <div className="edx-tabbar__progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${(active + 1) / TOTAL_STEPS})` }} />
          </div>
          <button
            type="button"
            className="edx-tabbar__btn"
            onClick={() => pick(Math.max(active - 1, 0))}
            disabled={active === 0}
            aria-label="Edição anterior"
          >
            <I.chevronLeft width={20} height={20} />
          </button>
          <button
            type="button"
            className="edx-tabbar__current"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
          >
            <span className="edx-tabbar__meta">
              {active < TOTAL ? `${cur.special ? 'Lovers' : cur.code} · ${pad2(active + 1)}/${pad2(TOTAL)}` : 'Fim da sessão'}
            </span>
            <span className="edx-tabbar__theme">
              <span className="edx-tabbar__theme-txt">{cur.theme}</span>
              <I.chevronRight width={15} height={15} />
            </span>
          </button>
          <button
            type="button"
            className="edx-tabbar__btn"
            onClick={() => pick(Math.min(active + 1, TOTAL_STEPS - 1))}
            disabled={active === TOTAL_STEPS - 1}
            aria-label={active === TOTAL - 1 ? 'Créditos da década' : 'Próxima edição'}
          >
            <I.chevronRight width={20} height={20} />
          </button>
        </nav>
        )
      })()}

      {!horizontal && sheetOpen && (
        <div className="edx-sheet-overlay" onClick={() => setSheetOpen(false)}>
          <div className="edx-sheet" role="dialog" aria-modal="true" aria-label="Escolher edição" onClick={(e) => e.stopPropagation()}>
            <div className="edx-sheet__handle" aria-hidden="true" />
            <p className="edx-sheet__t">Ir para edição</p>
            <div className="edx-sheet__grid">
              {PANELS.map((e, i) => (
                <button
                  type="button"
                  key={e.code}
                  className={`edx-sheet__item${i === active ? ' is-active' : ''}`}
                  aria-current={i === active ? 'true' : undefined}
                  onClick={() => {
                    // solta o scroll-lock JÁ (síncrono) — a limpeza do efeito só roda
                    // depois do commit, e o scrollIntoView do pick() ficaria bloqueado
                    // pelo overflow:hidden ainda ativo no instante deste clique.
                    document.body.style.overflow = ''
                    setSheetOpen(false)
                    pick(i)
                  }}
                >
                  {e.special ? 'Lovers' : e.code}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .edx-page {
          /* margem do conteúdo = margem do MENU (--hm-gutter, full-width), igual à
             Home (.hm .wrap). Alinha título/rail/filmstrip/timeline à logo e ao menu. */
          --page-max: none;
          --page-gutter: var(--hm-gutter, clamp(20px, 4vw, 56px));
          --header-safe-offset: clamp(120px, 14vh, 168px);
          --hero-top-clearance: clamp(32px, 4vw, 56px);
          --hero-content-start: calc(var(--header-safe-offset) + var(--hero-top-clearance));
          overflow-x: clip;
        }

        /* STAGE — desktop sticky horizontal */
        .edx-stage { position: relative; background: var(--ink); }
        .edx-sticky { position: sticky; top: 0; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
        .edx-viewport { flex: 1; overflow: hidden; }
        .edx-track { display: flex; height: 100%; will-change: transform; transition: transform var(--motion-slow) var(--ease-spring-soft); }

        /* CENA */
        .edx-scene { position: relative; min-width: 100vw; height: 100%; overflow: hidden; background: var(--ink); }
        .edx-scene--far { background: color-mix(in srgb, var(--tone) 16%, var(--ink)); }
        .edx-scene__media { position: absolute; inset: 0; background: color-mix(in srgb, var(--tone) 16%, var(--ink)); }
        .edx-scene__media > img, .edx-scene__media > div { position: absolute; inset: 0; width: 100%; height: 100%; }
        .edx-scene__media img { width: 100%; height: 100%; object-fit: cover; display: block;
          transform: translateX(var(--par, 0)); transition: transform var(--motion-slow) var(--ease-spring-soft); }
        /* Ken Burns — zoom lento contínuo só na foto da cena EM FOCO (offset/--par
           é sempre 0 pra ela, então não conflita com o transform de paralaxe das
           vizinhas). Escopado a .edx-sticky (só a árvore desktop tem essa altura
           de especificidade — a pilha mobile usa .edx-stack, nunca casa aqui). */
        @media (prefers-reduced-motion: no-preference) {
          @keyframes edxKenBurns { from { transform: translateX(var(--par, 0)) scale(1); } to { transform: translateX(var(--par, 0)) scale(1.06); } }
          .edx-sticky .edx-scene.is-active .edx-scene__media > img,
          .edx-sticky .edx-scene.is-active .edx-scene__media .photo-rotator__img.is-active {
            animation: edxKenBurns 16s var(--ease-out-soft) forwards;
          }
        }
        .edx-scene__nofoto { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 10px; align-items: center; justify-content: center; color: var(--cream); opacity: .75; font-family: var(--font-sans); font-size: 14px; font-weight: 700; background: color-mix(in srgb, var(--tone) 18%, var(--ink)); }
        /* Scrim mais leve: a FOTO é o destaque — só o necessário pra leitura da
           coluna à esquerda (texto tem text-shadow) e da base (filmstrip). */
        .edx-scene__scrim { position: absolute; inset: 0; background:
          linear-gradient(180deg, rgba(43,24,16,.34) 0%, rgba(43,24,16,0) 16%),
          linear-gradient(90deg, color-mix(in srgb, var(--ink) 62%, var(--tone)) 0%, color-mix(in srgb, var(--ink) 38%, transparent) 40%, rgba(43,24,16,0) 62%),
          linear-gradient(0deg, rgba(43,24,16,.55) 0%, rgba(43,24,16,0) 20%); }
        /* conteúdo (desktop): head + body empilham na coluna esquerda */
        .edx-scene__head, .edx-scene__body { position: relative; z-index: 2; max-width: var(--page-max); margin: 0 auto; padding-inline: var(--page-gutter); width: 100%; }
        /* zona de segurança header↔conteúdo (§4.1): o menu global flutua sobre o stage */
        .edx-scene__head { padding-top: calc(var(--header-safe-offset) + 12px); }
        .edx-scene__head, .edx-scene__body { box-sizing: border-box; }
        .edx-scene__code { font-family: var(--font-heading); font-weight: 800; font-size: 15px; letter-spacing: .02em; text-transform: uppercase; color: var(--tone); filter: brightness(1.4); }
        .edx-scene__title { font-family: var(--font-display); font-weight: 900; letter-spacing: -.03em; font-size: clamp(40px, 4.8vw, 78px); line-height: .98; color: var(--cream); margin: 8px 0 0; max-width: 12ch; text-wrap: balance; }
        .edx-scene__meta { margin: 12px 0 0; font-family: var(--font-sans); font-size: 16px; font-weight: 800; letter-spacing: .01em; color: var(--cream); text-shadow: 0 1px 4px rgba(0,0,0,.4); }
        .edx-scene__body { padding-top: clamp(14px, 2vh, 24px); padding-bottom: 130px; max-width: none; }
        .edx-scene__body > * { max-width: min(46%, 560px); }
        .edx-scene__text { margin-top: 12px; display: grid; gap: 8px; }
        .edx-scene__lead { margin: 0; font-size: clamp(13px, .88vw, 14.5px); line-height: 1.5; color: color-mix(in srgb, var(--cream) 93%, transparent); text-shadow: 0 1px 3px rgba(0,0,0,.35); }

        /* RAIL flutuante (canto direito da grade): pódio + participantes empilhados.
           Ancorado ao topo da zona segura; largura fixa; cada card é translúcido. */
        /* FAIXA DOS CARDS FLUTUANTES — coluna reservada à direita: começa na zona
           segura do header e termina ANTES da filmstrip (bottom fixo). Conteúdo
           que passar rola dentro da própria faixa (scrollbar oculta + fade na
           base), sem nunca cobrir foto-legenda, filmstrip ou controles. */
        .edx-rail {
          position: absolute; z-index: 3; top: var(--hero-content-start); right: var(--page-gutter);
          bottom: 132px; width: clamp(220px, 21vw, 300px);
          display: flex; flex-direction: column; gap: 12px;
          /* distribui os cards na altura toda do rail: quando cabem, espaço
             uniforme entre eles (não amontoados no topo com vão embaixo);
             quando passam, o auto rola normalmente e space-between é ignorado. */
          justify-content: space-between;
          overflow-y: auto; scrollbar-width: none; overscroll-behavior: contain;
          mask-image: linear-gradient(180deg, #000 calc(100% - 20px), transparent);
          -webkit-mask-image: linear-gradient(180deg, #000 calc(100% - 20px), transparent);
        }
        .edx-rail::-webkit-scrollbar { display: none; }
        .edx-rail > * { flex: 0 0 auto; }

        /* PÓDIO — card no rail. Tingimento forte (88% ink) e AUTOSSUFICIENTE: o
           scrim horizontal já cai perto de zero na faixa direita onde o rail
           fica (calibrado pro texto editorial à esquerda), então o contraste do
           texto pequeno do card não pode depender do brilho da foto por trás. */
        .edx-podio { background: color-mix(in srgb, var(--ink) 88%, transparent); border: 1px solid color-mix(in srgb, var(--cream) 24%, transparent); border-radius: 14px; padding: 13px 15px; box-shadow: 0 12px 32px rgba(0,0,0,.28); }
        .edx-podio__t { font-family: var(--font-heading); font-weight: 800; font-size: 13.5px; color: var(--cream); margin: 0 0 10px; }
        .edx-podio__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
        .edx-podio__row { display: flex; align-items: center; gap: 12px; }
        .edx-podio__medal { flex: 0 0 auto; width: 32px; height: 32px; border-radius: 999px; background: var(--yellow); color: var(--ink); display: grid; place-items: center; font-family: var(--font-display); font-weight: 900; font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,.3); }
        .edx-podio__logos { display: flex; gap: 6px; }
        .edx-podio__logo { position: relative; width: 38px; height: 38px; border-radius: 10px; background: var(--choco, #3A2114); border: 1px solid color-mix(in srgb, var(--cream) 24%, transparent); display: grid; place-items: center; overflow: hidden; }
        .edx-podio__logo--img { background: #fff; }
        .edx-podio__logo img { width: 100%; height: 100%; object-fit: cover; }
        .edx-podio__ini { display: grid; place-items: center; width: 100%; height: 100%; font-family: var(--font-heading); font-weight: 800; font-size: 12px; color: var(--cream); }
        .edx-podio__what { min-width: 0; }
        .edx-podio__cat { display: block; font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; letter-spacing: .02em; color: color-mix(in srgb, var(--cream) 66%, transparent); }
        .edx-podio__win { font-family: var(--font-heading); font-weight: 800; font-size: 16px; color: var(--cream); }
        .edx-podio__link { display: inline-block; margin-top: 12px; font-family: var(--font-sans); font-size: 13px; font-weight: 700; color: var(--cream); text-decoration: underline; text-underline-offset: 3px; opacity: .88; }
        .edx-podio__link:hover { opacity: 1; }
        .edx-podio__link:focus-visible, .edx-strip__th:focus-visible { outline: 2px solid var(--cream); outline-offset: 2px; }

        /* PARTICIPANTES — card clicável (filho do rail). Colapsado só mostra o
           gatilho; abre com reveal (grid-rows 0fr→1fr); a lista rola. */
        .edx-parts { width: 100%; background: color-mix(in srgb, var(--ink) 88%, transparent); border: 1px solid color-mix(in srgb, var(--cream) 24%, transparent); border-radius: 14px; box-shadow: 0 12px 32px rgba(0,0,0,.28); }
        .edx-parts__toggle { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; min-height: 44px; padding: 13px 14px; background: none; border: 0; border-radius: 14px; cursor: pointer; text-align: left; transition: background var(--motion-fast) var(--ease-out-soft); }
        .edx-parts__toggle:hover { background: color-mix(in srgb, var(--cream) 8%, transparent); }
        .edx-parts__toggle:focus-visible { outline: 2px solid var(--cream); outline-offset: 2px; }
        .edx-parts__t { font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: color-mix(in srgb, var(--cream) 80%, transparent); }
        .edx-parts__toggle:hover .edx-parts__t { color: var(--cream); }
        .edx-parts__chev { display: inline-flex; flex: 0 0 auto; color: color-mix(in srgb, var(--cream) 72%, transparent); transform: rotate(90deg); transition: transform var(--motion-med) var(--ease-spring-soft); }
        .edx-parts.is-open .edx-parts__chev { transform: rotate(-90deg); }
        .edx-parts__reveal { display: grid; grid-template-rows: 0fr; transition: grid-template-rows var(--motion-med) cubic-bezier(.16,1,.3,1); }
        .edx-parts.is-open .edx-parts__reveal { grid-template-rows: 1fr; }
        /* filho único do colapso: clipa busca + lista juntas (2 filhos vazariam
           numa linha implícita auto quando fechada). */
        .edx-parts__inner { min-height: 0; overflow: hidden; }
        .edx-parts__list { min-height: 0; margin: 0; padding: 0 8px 0 14px; list-style: none; overflow: hidden; display: grid; gap: 5px; }
        /* lista curta e rolável: com o pódio acima no rail, a soma tem que ficar
           acima da filmstrip mesmo na Lovers (pódio de 3 linhas). Fade nas bordas
           avisa que rola; scrollbar fina no tom da paleta em vez do cinza do SO. */
        .edx-parts.is-open .edx-parts__list {
          overflow-y: auto; max-height: min(20vh, 176px); padding-bottom: 12px;
          scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--cream) 45%, transparent) transparent;
          mask-image: linear-gradient(180deg, transparent, #000 10px, #000 calc(100% - 14px), transparent);
          -webkit-mask-image: linear-gradient(180deg, transparent, #000 10px, #000 calc(100% - 14px), transparent);
        }
        .edx-parts.is-open .edx-parts__list::-webkit-scrollbar { width: 5px; }
        .edx-parts.is-open .edx-parts__list::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--cream) 45%, transparent); border-radius: 999px; }
        .edx-parts__list li { font-family: var(--font-heading); font-weight: 700; font-size: 13.5px; line-height: 1.2; color: var(--cream); }

        /* FILMSTRIP — folha de contato de cinema: full-bleed (borda a borda),
           fotos coladas (sem gap/borda/raio), encostada na base da cena — logo
           acima do medidor da década. Ativa = brilho cheio + filete no tom por
           box-shadow inset (não muda tamanho; aria-pressed cobre o não-visual). */
        .edx-strip { position: absolute; left: 0; right: 0; bottom: 0; z-index: 3; display: flex; gap: 0; max-width: none; margin: 0; padding: 0; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
        .edx-strip::-webkit-scrollbar { display: none; }
        .edx-strip__th { position: relative; flex: 0 0 auto; width: clamp(88px, 8vw, 132px); aspect-ratio: 4/3; border-radius: 0; overflow: hidden; padding: 0; border: none; background: var(--ink); cursor: pointer; opacity: .5; scroll-snap-align: start; transition: opacity .18s; }
        .edx-strip__th:hover { opacity: .85; }
        .edx-strip__th.is-on { opacity: 1; }
        .edx-strip__th.is-on::after { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 0 3px var(--tone); pointer-events: none; }
        .edx-strip__th img { width: 100%; height: 100%; object-fit: cover; display: block; }

        /* CONTROLES */
        /* sem backdrop-filter aqui: blur sobre o trilho animado força readback de
           GPU a cada frame e congela o compositor. Fundo semi-opaco resolve. */
        .edx-arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 4; display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 999px; border: none; background: color-mix(in srgb, var(--ink) 58%, transparent); color: var(--cream); cursor: pointer; transition: background var(--motion-fast) var(--ease-out-soft), transform var(--motion-fast) var(--ease-out-soft); }
        .edx-arrow:hover { background: color-mix(in srgb, var(--ink) 80%, transparent); transform: translateY(-50%) scale(1.06); }
        .edx-arrow:focus-visible { outline: 2px solid var(--cream); outline-offset: 3px; }
        .edx-arrow--prev { left: clamp(12px, 2vw, 32px); }
        .edx-arrow--next { right: clamp(12px, 2vw, 32px); }

        .edx-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

        /* CORTINA DE TOM — corte de cena: varre a viewport no tom da cena destino.
           1 overlay único, transform-only, pointer-events none (nunca bloqueia
           gesto/teclado); key nova por troca reinicia a animação (interruptível). */
        .edx-wipe {
          position: absolute; inset: 0; z-index: 5; pointer-events: none;
          background: linear-gradient(90deg, transparent 0%, var(--tone) 16%, var(--tone) 84%, transparent 100%);
          transform: translateX(-101%);
          animation: edxWipe 520ms cubic-bezier(.7, 0, .2, 1) forwards;
        }
        @keyframes edxWipe { to { transform: translateX(101%); } }

        /* MEDIDOR DA DÉCADA — 16 segmentos no tom de cada edição; acendem
           conforme a apresentação avança (posição + espectro da década). */
        .edx-meter { display: flex; gap: 3px; height: 4px; padding-inline: var(--page-gutter); background: color-mix(in srgb, var(--ink) 94%, var(--cream)); }
        .edx-meter__seg { flex: 1; border-radius: 2px; background: color-mix(in srgb, var(--tone) 26%, var(--ink)); transition: background .32s var(--ease-out-soft), opacity .32s var(--ease-out-soft); opacity: .6; }
        .edx-meter__seg.is-lit { background: var(--tone); opacity: 1; }

        /* TIMELINE DE ANOS */
        .edx-anos { padding: var(--sp-2) var(--page-gutter) var(--sp-3); background: color-mix(in srgb, var(--ink) 94%, var(--cream)); }
        /* fade nas bordas: sinaliza que a lista rola quando os 16 anos não cabem */
        .edx-anos__list { list-style: none; margin: 0 auto; padding: 0; max-width: var(--page-max); display: flex; gap: 4px; overflow-x: auto; scrollbar-width: thin;
          mask-image: linear-gradient(90deg, transparent, #000 24px, #000 calc(100% - 24px), transparent);
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 24px, #000 calc(100% - 24px), transparent); }
        .edx-anos__item { flex: 0 0 auto; font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; letter-spacing: .02em; color: color-mix(in srgb, var(--cream) 62%, transparent); background: transparent; border: 1px solid color-mix(in srgb, var(--cream) 18%, transparent); border-radius: 999px; padding: 5px 11px; cursor: pointer; white-space: nowrap; transition: color .16s, border-color .16s, background .16s; }
        .edx-anos__item:hover { color: var(--cream); border-color: color-mix(in srgb, var(--cream) 45%, transparent); }
        .edx-anos__item.is-active { background: var(--page-accent, var(--cyan)); border-color: var(--page-accent, var(--cyan)); color: var(--ink); }
        .edx-anos__item:focus-visible { outline: 2px solid var(--cream); outline-offset: 2px; }

        /* ============ OVERHAUL VISUAL — o TEMA é o herói da cena ============ */
        /* O conceito criativo do ano (o tema) é a alma da edição — então ele é o
           MAIOR elemento tipográfico da cena, não o número. Escala grande e
           expressiva; leitura reforçada pelo scrim. Desktop only (a pilha mobile
           usa o cabeçalho 4:5 próprio). */
        /* COLUNA EDITORIAL COMPACTA — a foto é a protagonista; o texto ocupa uma
           coluna definida e enxuta à esquerda (≤ ~480px), sem se espalhar. */
        .edx-sticky .edx-scene__title {
          position: relative; font-size: min(clamp(38px, 4.4vw, 68px), 9vh); line-height: .92;
          letter-spacing: -.04em; max-width: 12ch; margin-top: 6px;
        }
        .edx-sticky .edx-scene__head > *, .edx-sticky .edx-scene__body > * { max-width: min(38vw, 480px); }
        .edx-sticky .edx-scene__meta { margin-top: 8px; font-size: 14px; }
        .edx-sticky .edx-scene__body { padding-top: 8px; }
        .edx-sticky .edx-scene__text { margin-top: 6px; }
        /* Sem linhas decorativas no slate (traço do rótulo e sublinhado do título
           removidos a pedido, jul/2026) — o tom da edição vive no rótulo, no
           medidor e no filete da filmstrip. */

        /* Timeline vira "scrubber" da apresentação: o item ativo revela o tema da
           cena (leitura de década, não só régua de anos). */
        .edx-anos__item { display: inline-flex; align-items: center; gap: 8px; }
        /* só monta no item ativo (JSX) → a largura cresce por conteúdo, não por
           animação de layout; a entrada é só opacity (regra: sem animar width). */
        .edx-anos__th {
          white-space: nowrap; font-weight: 800; letter-spacing: .01em;
          opacity: 0; animation: edxThIn var(--motion-base) var(--ease-out-soft) forwards;
        }
        @keyframes edxThIn { to { opacity: 1; } }
        .edx-anos__th::before { content: '·'; margin-right: 8px; opacity: .6; }

        @media (prefers-reduced-motion: reduce) {
          .edx-anos__th { animation: none; opacity: 1; }
        }

        /* HISTÓRIA COMPLETA — lead curto na cena + expansão acessível (grid-rows) */
        .edx-story__toggle { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; padding: 8px 0; background: none; border: 0; cursor: pointer; font-family: var(--font-sans); font-weight: 800; font-size: 13px; color: var(--cream); }
        .edx-story__toggle svg { transition: transform var(--motion-fast) var(--ease-out-soft); }
        .edx-story.is-open .edx-story__toggle svg { transform: rotate(90deg); }
        .edx-story__toggle:focus-visible { outline: 2px solid var(--cream); outline-offset: 3px; border-radius: 4px; }
        .edx-story__reveal { display: grid; grid-template-rows: 0fr; transition: grid-template-rows var(--motion-base) cubic-bezier(.16,1,.3,1); }
        .edx-story.is-open .edx-story__reveal { grid-template-rows: 1fr; }
        .edx-story__full { min-height: 0; overflow: hidden; }
        .edx-story.is-open .edx-story__full { overflow-y: auto; max-height: min(32vh, 280px); padding-right: 8px; scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--cream) 45%, transparent) transparent; }
        .edx-story__full p { margin: 0 0 10px; font-size: clamp(13px, .88vw, 14.5px); line-height: 1.5; color: color-mix(in srgb, var(--cream) 92%, transparent); text-shadow: 0 1px 3px rgba(0,0,0,.35); }

        /* CURIOSIDADES — cards editoriais flutuantes no rail (0–3, só dados reais).
           Sem side-tab colorido (evita "cara de template"): o tipo é codificado
           pelo título no tom da edição, não por borda lateral. */
        .edx-insights { display: flex; flex-direction: column; gap: 10px; }
        .edx-insight { background: color-mix(in srgb, var(--ink) 88%, transparent); border: 1px solid color-mix(in srgb, var(--cream) 24%, transparent); border-radius: 12px; padding: 11px 13px; box-shadow: 0 10px 26px rgba(0,0,0,.24); }
        .edx-insight__t { margin: 0; font-family: var(--font-heading); font-weight: 800; font-size: 13px; letter-spacing: .01em; color: var(--tone); filter: brightness(1.4); }
        .edx-insight__x { margin: 5px 0 0; font-family: var(--font-sans); font-size: 12.5px; line-height: 1.42; color: color-mix(in srgb, var(--cream) 88%, transparent); }
        .edx-insight__v { display: inline-block; margin-top: 8px; font-family: var(--font-heading); font-weight: 800; font-size: 14px; color: var(--cream); }

        /* PARTICIPANTES — busca (listas grandes), logo real + iniciais, pendente honesto */
        .edx-parts__search { padding: 8px 14px 4px; }
        .edx-parts__input { width: 100%; min-height: 36px; padding: 7px 10px; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--cream) 24%, transparent); background: color-mix(in srgb, var(--ink) 55%, transparent); color: var(--cream); font-family: var(--font-sans); font-size: 13px; box-sizing: border-box; }
        .edx-parts__input::placeholder { color: color-mix(in srgb, var(--cream) 55%, transparent); }
        .edx-parts__input:focus-visible { outline: 2px solid var(--cream); outline-offset: 1px; }
        .edx-parts__list li { display: flex; align-items: center; gap: 9px; }
        .edx-parts__logo { position: relative; flex: 0 0 auto; width: 26px; height: 26px; border-radius: 7px; overflow: hidden; background: var(--choco, #3A2114); border: 1px solid color-mix(in srgb, var(--cream) 20%, transparent); display: grid; place-items: center; }
        .edx-parts__logo--img { background: #fff; }
        .edx-parts__logo img { width: 100%; height: 100%; object-fit: cover; }
        .edx-parts__ini { display: grid; place-items: center; width: 100%; height: 100%; font-family: var(--font-heading); font-weight: 800; font-size: 10px; color: var(--cream); }
        .edx-parts__name { min-width: 0; }
        .edx-parts__none { color: color-mix(in srgb, var(--cream) 70%, transparent); font-style: italic; }
        .edx-parts--empty { padding: 13px 15px; }
        .edx-parts__pending { margin: 0; font-family: var(--font-sans); font-size: 12px; font-weight: 700; color: color-mix(in srgb, var(--cream) 66%, transparent); }

        /* CRÉDITOS DA DÉCADA — estado final do trilho (Ato III). Rolagem de
           créditos de cinema: 2 cópias + translateY(-50%) em loop (marquee,
           transform-only), pausa em hover, roda SÓ quando a cena está ativa. */
        .edx-credits { background: var(--ink); }
        .edx-credits__inner { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; align-items: flex-start; box-sizing: border-box; padding: calc(var(--header-safe-offset) + 12px) var(--page-gutter) 96px; }
        .edx-credits__title { margin: 8px 0 0; font-family: var(--font-display); font-weight: 900; letter-spacing: -.045em; font-size: min(clamp(44px, 5.4vw, 92px), 12vh); line-height: .9; color: var(--cream); max-width: 14ch; text-wrap: balance; }
        .edx-credits__lead { margin: 14px 0 0; max-width: 52ch; font-family: var(--font-sans); font-size: 14.5px; line-height: 1.5; color: color-mix(in srgb, var(--cream) 82%, transparent); }
        .edx-credits .edx-scene__code { color: var(--yellow); filter: none; }
        .edx-credits__stage { flex: 1; min-height: 0; width: min(100%, 640px); margin-top: clamp(18px, 3vh, 34px); overflow: hidden;
          mask-image: linear-gradient(180deg, transparent, #000 12%, #000 82%, transparent);
          -webkit-mask-image: linear-gradient(180deg, transparent, #000 12%, #000 82%, transparent); }
        .edx-credits__roll { display: flex; flex-direction: column; }
        .edx-sticky .edx-credits.is-active .edx-credits__roll { animation: edxRoll 52s linear infinite; }
        .edx-credits__stage:hover .edx-credits__roll { animation-play-state: paused; }
        @keyframes edxRoll { to { transform: translateY(-50%); } }
        .edx-credits__block { margin: 0 0 26px; }
        .edx-credits__edition { margin: 0 0 10px; font-family: var(--font-heading); font-weight: 800; font-size: 15px; letter-spacing: .02em; color: var(--yellow); }
        .edx-credits__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
        .edx-credits__list li { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; align-items: baseline; }
        .edx-credits__cat { font-family: var(--font-sans); font-size: 12.5px; font-weight: 700; color: color-mix(in srgb, var(--cream) 62%, transparent); text-align: right; }
        .edx-credits__who { font-family: var(--font-heading); font-weight: 800; font-size: 15.5px; color: var(--cream); }
        .edx-credits__list--cast { grid-template-columns: 1fr 1fr; display: grid; }
        .edx-credits__list--cast li { grid-template-columns: 1fr; }
        .edx-credits__cta { display: inline-block; margin-top: 18px; padding: 13px 24px; border-radius: 999px; background: var(--page-accent, var(--cyan)); color: var(--ink); font-family: var(--font-sans); font-weight: 800; font-size: 14px; text-decoration: none; transition: transform var(--motion-fast) var(--ease-out-soft), background var(--motion-fast) var(--ease-out-soft); }
        .edx-credits__cta:hover { transform: translateY(-2px); background: var(--cyan-deep); color: var(--cream); }
        .edx-credits__cta:focus-visible { outline: 2px solid var(--cream); outline-offset: 3px; }

        /* Mobile (fundo creme): tinta escura no texto de história/curiosidades/final */
        .edx-stack .edx-story__toggle { color: var(--ink); }
        .edx-stack .edx-story__full p { color: var(--ink-soft); text-shadow: none; }
        .edx-stack .edx-insight { background: var(--cream-card); border: 1px solid color-mix(in srgb, var(--tone) 40%, var(--paper-line)); box-shadow: 0 6px 20px rgba(43,24,16,.08); }
        .edx-stack .edx-insight__t { filter: none; color: color-mix(in srgb, var(--tone) 68%, var(--ink)); }
        .edx-stack .edx-insight__x { color: var(--ink-soft); }
        .edx-stack .edx-insight__v { color: var(--ink); }
        .edx-stack .edx-parts__input { background: #fff; color: var(--ink); border-color: var(--paper-line); }
        .edx-stack .edx-parts__input::placeholder { color: var(--ink-soft); }
        .edx-stack .edx-parts__none, .edx-stack .edx-parts__pending { color: var(--ink-soft); }
        /* Créditos no mobile: painel snap escuro (fecho de cinema), lista estática
           no fluxo (o painel rola no dedo — sem marquee, sem máscara). */
        .edx-stack .edx-credits { background: var(--ink); }
        .edx-stack .edx-credits__inner { height: auto; min-height: 100%; padding: 28px var(--page-gutter) calc(28px + 76px); }
        .edx-stack .edx-credits__stage { overflow: visible; mask-image: none; -webkit-mask-image: none; width: 100%; flex: none; }
        .edx-stack .edx-credits__list li { grid-template-columns: 1fr; gap: 2px; }
        .edx-stack .edx-credits__cat { text-align: left; }
        .edx-stack .edx-credits__list--cast { grid-template-columns: 1fr; }

        @media (prefers-reduced-motion: reduce) {
          .edx-story__reveal, .edx-story__toggle svg { transition: none; }
        }

        /* ===================== MOBILE / reduced-motion (carrossel) ===================== */
        .edx-stack { background: var(--cream); }
        /* Contêiner do carrossel: uma tela por edição, scroll-snap horizontal
           nativo (swipe do sistema, sem gesto customizado). Cada cena rola o
           próprio conteúdo na vertical (overflow-y), independente da posição
           horizontal — sem isso, o flex row equalizaria a altura de todas as
           16 cenas pela mais alta. */
        .edx-stack__list {
          display: flex; overflow-x: auto; overflow-y: hidden;
          scroll-snap-type: x mandatory; scrollbar-width: none;
          /* fica ACIMA da tab bar global (não some sob ela) */
          height: calc(100dvh - var(--tabbar-h) - env(safe-area-inset-bottom, 0px));
        }
        .edx-stack__list::-webkit-scrollbar { display: none; }
        .edx-stack .edx-scene {
          flex: 0 0 100%; min-width: 100%; width: 100%; height: 100%;
          overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch;
          scroll-snap-align: start; scroll-snap-stop: always;
          background: var(--cream);
        }
        .edx-stack .edx-scene__media { position: relative; inset: auto; aspect-ratio: 4 / 5; max-height: 80vh; }
        .edx-stack .edx-scene__media img { transform: none; }
        /* scrim não intercepta o toque — senão o swipe do carrossel morre nele */
        .edx-scene__scrim { pointer-events: none; }

        /* CARROSSEL DE FOTOS NA HERO (mobile) — trilho horizontal scroll-snap
           nativo. overscroll-x contain: o swipe das fotos NÃO vaza pro carrossel
           de edições (troca de edição fica na taskbar/setas), sem flip acidental
           no meio da galeria. */
        .edx-hero-carousel { position: absolute; inset: 0; }
        .edx-hero-carousel__track {
          display: flex; width: 100%; height: 100%;
          overflow-x: auto; overflow-y: hidden;
          scroll-snap-type: x mandatory; overscroll-behavior-x: contain;
          scrollbar-width: none; -webkit-overflow-scrolling: touch;
        }
        .edx-hero-carousel__track::-webkit-scrollbar { display: none; }
        .edx-hero-carousel__slide { flex: 0 0 100%; width: 100%; height: 100%; scroll-snap-align: center; scroll-snap-stop: always; overflow: hidden; }
        .edx-hero-carousel__slide img { width: 100%; height: 100%; object-fit: cover; display: block; will-change: transform; }
        /* Ken Burns na foto ativa — zoom lento contínuo, ancorado no ponto focal.
           Reinicia a cada swipe (a classe .is-active migra pro novo slide). */
        @media (prefers-reduced-motion: no-preference) {
          .edx-hero-carousel__slide.is-active img { animation: edxHeroKb 8s var(--ease-out-soft, ease-out) forwards; }
          @keyframes edxHeroKb { from { transform: scale(1); } to { transform: scale(1.1); } }
        }
        /* bolinhas no rodapé da foto (cabeçalho agora fica ABAIXO da imagem) */
        .edx-hero-carousel__dots {
          position: absolute; left: 0; right: 0; bottom: 14px; z-index: 4;
          display: flex; gap: 6px; justify-content: center; pointer-events: none;
        }
        .edx-hero-carousel__dots span {
          width: 6px; height: 6px; border-radius: 999px;
          background: color-mix(in srgb, var(--cream) 55%, transparent);
          box-shadow: 0 1px 3px rgba(0,0,0,.4); transition: width .2s ease, background .2s ease;
        }
        .edx-hero-carousel__dots span.is-on { width: 20px; background: var(--cream); }
        .edx-stack .edx-scene__nofoto { color: var(--cream); }
        .edx-stack .edx-scene__scrim { background: linear-gradient(0deg, color-mix(in srgb, var(--ink) 80%, var(--tone)) 0%, rgba(43,24,16,.16) 42%, rgba(43,24,16,0) 64%); }
        /* cabeçalho ABAIXO da foto (não mais sobreposto) — banda no acento CHEIO
           da edição (tom saturado da paleta, §3: heros usam --page-accent cheio
           com tinta escura), alternando edição a edição. Texto em --ink pra
           contraste. A taskbar usa o MESMO tom cheio (identidade contínua). */
        .edx-stack .edx-scene__head {
          margin-top: 0; padding: 20px var(--page-gutter) 22px;
          background: var(--tone);
        }
        .edx-stack .edx-scene__code { color: var(--ink); filter: none; opacity: .72; }
        .edx-stack .edx-scene__title { font-size: clamp(30px, 9vw, 42px); max-width: none; color: var(--ink); }
        .edx-stack .edx-scene__meta { color: var(--ink); font-size: 14px; font-weight: 800; margin-top: 6px; opacity: .82; }
        /* corpo volta pro papel creme; rodapé reserva a taskbar fixa, já que cada
           cena agora rola o próprio conteúdo até o fim (carrossel, não mais a
           página inteira). */
        /* respiro pra pill de edição (que flutua acima da tab bar global); o
           list já exclui a altura da tab bar+safe, então não somo env aqui. */
        .edx-stack .edx-scene__body { padding-top: 18px; padding-bottom: calc(28px + 76px); }
        .edx-stack .edx-scene__body > * { max-width: none; }
        .edx-stack .edx-scene__lead { color: var(--ink-soft); text-shadow: none; }
        .edx-stack .edx-rail { position: static; width: auto; margin: 16px var(--page-gutter) 0; gap: 14px; overflow-y: visible; mask-image: none; -webkit-mask-image: none; }
        .edx-stack .edx-podio { background: var(--cream-card); border: 1px solid color-mix(in srgb, var(--tone) 40%, var(--paper-line)); box-shadow: 0 6px 20px rgba(43,24,16,.08); }
        .edx-stack .edx-podio__t, .edx-stack .edx-podio__win { color: var(--ink); }
        .edx-stack .edx-podio__cat { color: var(--ink-soft); }
        .edx-stack .edx-podio__logo { border: 1px solid var(--paper-line); }
        .edx-stack .edx-podio__link { color: var(--ink); }
        .edx-stack .edx-parts { background: var(--cream-card); border: 1px solid color-mix(in srgb, var(--tone) 40%, var(--paper-line)); box-shadow: 0 6px 20px rgba(43,24,16,.08); }
        .edx-stack .edx-parts__t { color: var(--ink-soft); }
        .edx-stack .edx-parts__toggle:hover { background: color-mix(in srgb, var(--ink) 5%, transparent); }
        .edx-stack .edx-parts__toggle:hover .edx-parts__t { color: var(--ink); }
        .edx-stack .edx-parts__toggle:focus-visible { outline-color: var(--ink); }
        .edx-stack .edx-parts__chev { color: var(--ink-soft); }
        .edx-stack .edx-parts.is-open .edx-parts__list { max-height: 280px; grid-template-columns: 1fr 1fr; gap: 6px 14px; }
        .edx-stack .edx-parts__list li { color: var(--ink); }
        /* Galeria vira carrossel de fotos grandes (não mais fileira de
           miniaturas): 1 card por vez, snap ao centro, espiada dos vizinhos. */
        .edx-stack .edx-strip { position: static; padding-block: 14px 22px; padding-inline: var(--page-gutter); gap: 12px; scroll-snap-type: x mandatory; }
        .edx-stack .edx-strip__th { width: min(76vw, 360px); aspect-ratio: 4 / 3; border-radius: 14px; opacity: 1; border: 3px solid transparent; scroll-snap-align: center; background: var(--cream-card); }
        .edx-stack .edx-strip__th.is-on { border-color: var(--tone); }
        .edx-stack .edx-strip__th.is-on::after { display: none; }

        /* PILL DE EDIÇÃO — flutuante no alcance do polegar, EMPILHADA logo acima
           da tab bar global do site (nav de edição em cima, nav de site embaixo).
           Destacada das bordas, cantos redondos, sombra. O epílogo ganha respiro
           extra (.edx-page--tabbar) pra pill não cobrir o CTA; a tab bar global já
           é reservada pelo .page-enter.has-mobile-tabbar (main). */
        .edx-page--tabbar { padding-bottom: 88px; }
        .edx-tabbar {
          position: fixed; z-index: 91;
          left: max(12px, env(safe-area-inset-left)); right: max(12px, env(safe-area-inset-right));
          bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px) + 12px);
          display: grid; grid-template-columns: 52px 1fr 52px; align-items: center; gap: 4px;
          display: grid; grid-template-columns: 52px 1fr 52px; align-items: center; gap: 4px;
          padding: 6px; border-radius: 20px; overflow: hidden;
          /* MESMO tom cheio da banda do cabeçalho — identidade contínua:
             header e taskbar sempre no mesmo acento, alternando por edição. */
          background: var(--tone);
          border: 1px solid color-mix(in srgb, var(--ink) 16%, transparent);
          box-shadow: 0 10px 34px rgba(43,24,16,.32), 0 2px 8px rgba(43,24,16,.2);
          transition: background .3s var(--ease-out-soft, ease);
        }
        .edx-tabbar__progress { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: color-mix(in srgb, var(--ink) 14%, transparent); }
        .edx-tabbar__progress span { display: block; height: 100%; width: 100%; background: var(--ink); transform-origin: left; transition: transform .3s var(--ease-out-soft, ease); }
        /* botões prev/next circulares, ESCUROS (espresso) sobre a banda de cor —
           dark-on-bright, punch e contraste tátil de app. */
        .edx-tabbar__btn {
          display: flex; align-items: center; justify-content: center;
          width: 52px; height: 52px; border-radius: 999px; border: 0; cursor: pointer;
          background: var(--ink); color: var(--cream);
          transition: transform .12s var(--ease-out-soft, ease), background .15s ease, opacity .15s ease;
        }
        .edx-tabbar__btn:hover { background: color-mix(in srgb, var(--ink) 82%, var(--tone)); }
        .edx-tabbar__btn:active { transform: scale(.88); }
        .edx-tabbar__btn:disabled { opacity: .3; cursor: default; }
        .edx-tabbar__btn:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
        .edx-tabbar__current {
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
          min-width: 0; min-height: 52px; padding: 4px 8px; border: 0; border-radius: 14px;
          background: none; cursor: pointer; transition: background .15s ease, transform .12s ease;
        }
        .edx-tabbar__current:active { transform: scale(.97); background: color-mix(in srgb, var(--ink) 6%, transparent); }
        .edx-tabbar__current:focus-visible { outline: 2px solid var(--ink); outline-offset: -2px; }
        .edx-tabbar__meta { font-family: var(--font-sans); font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--ink); opacity: .66; }
        .edx-tabbar__theme { display: flex; align-items: center; gap: 4px; max-width: 100%; color: var(--ink); }
        .edx-tabbar__theme-txt { font-family: var(--font-heading); font-weight: 800; font-size: 15px; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .edx-tabbar__theme svg { flex: 0 0 auto; transform: rotate(90deg); opacity: .55; }

        /* SHEET — salto direto pra qualquer uma das 16 edições */
        .edx-sheet-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(43,24,16,.45); animation: edxSheetFade .18s ease; }
        @keyframes edxSheetFade { from { opacity: 0; } }
        .edx-sheet {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 101;
          background: var(--cream); border-radius: 20px 20px 0 0;
          padding: 10px 20px calc(24px + env(safe-area-inset-bottom, 0px));
          max-height: 70vh; overflow-y: auto;
          box-shadow: 0 -12px 40px rgba(0,0,0,.3);
        }
        @media (prefers-reduced-motion: no-preference) {
          .edx-sheet { animation: edxSheetUp .22s var(--ease-out-soft, ease); }
          @keyframes edxSheetUp { from { transform: translateY(100%); } }
        }
        .edx-sheet__handle { width: 36px; height: 4px; border-radius: 999px; background: var(--paper-line); margin: 0 auto 14px; }
        .edx-sheet__t { margin: 0 0 12px; font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-mute, var(--ink-soft)); }
        .edx-sheet__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .edx-sheet__item { min-height: 44px; border-radius: 12px; border: 1px solid var(--paper-line); background: var(--cream-card); color: var(--ink); font-family: var(--font-sans); font-weight: 700; font-size: 13px; cursor: pointer; transition: transform .1s ease, background .15s ease, color .15s ease, border-color .15s ease; }
        .edx-sheet__item:active { transform: scale(.94); }
        .edx-sheet__item.is-active { background: var(--page-accent, var(--cyan)); border-color: var(--page-accent, var(--cyan)); color: var(--ink); }
        .edx-sheet__item:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

        /* Lovers tem pódio maior (3 linhas): reserva extra pro strip (absoluto,
           sobreposto à foto) não colidir — só existe no desktop. No mobile o
           strip é static/in-flow (.edx-stack .edx-strip), então esse respiro
           extra vira só espaço vazio no fim do painel — escopado a .edx-sticky. */
        .edx-sticky .edx-scene--special .edx-scene__body { padding-bottom: 150px; }
        .edx-scene--special .edx-podio__list { gap: 6px; }

        /* laptops baixos / janelas achatadas: comprime a cena p/ nada colidir */
        @media (min-width: 960px) and (max-height: 768px) {
          .edx-scene__head { padding-top: calc(var(--header-safe-offset) - 12px); }
          .edx-scene__title { font-size: clamp(30px, 4.6vh, 44px); }
          .edx-scene__lead { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; margin-top: 8px; }
          .edx-podio { margin-top: 12px; padding-top: 10px; }
          .edx-podio__list { gap: 6px; }
          .edx-scene__body { padding-bottom: 108px; }
          .edx-scene--special .edx-scene__body { padding-bottom: 118px; }
          .edx-scene--special .edx-podio__list { gap: 3px; }
          .edx-scene--special .edx-podio__logo, .edx-scene--special .edx-podio__medal { width: 26px; height: 26px; }
          .edx-strip { bottom: 0; }
          .edx-strip__th { width: 74px; }
        }
        @media (max-width: 420px) {
          .edx-stack .edx-parts.is-open .edx-parts__list { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .edx-meter__seg, .edx-anos__item, .edx-scene__media img, .edx-parts__reveal, .edx-parts__chev { transition: none; }
          .edx-scene__media img { transform: none; }
          .edx-wipe { display: none; }
          .edx-credits__roll { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
