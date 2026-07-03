/*
 * PÁGINA INSTITUCIONAL — "Edições" (apresentação horizontal — Etapa 1).
 * A página deixa de ser grid/lista e vira uma APRESENTAÇÃO: o scroll vertical, com
 * a seção em sticky, avança um trilho horizontal de 16 painéis (1ª → 16ª edição).
 * No mobile / reduced-motion, os painéis empilham na vertical com navegação por chips.
 *
 * Etapa 1 = estrutura, navegação e ESPAÇOS de conteúdo (slots de logo/foto com
 * fallback honesto). Sem refino visual final.
 *
 * Dados (regra: NÃO inventar):
 * - Texto editorial por edição: src/data/editions.js (desc/etapa/visual).
 * - Metadados oficiais (tema, período, nº participantes, status do Sweet Awards) e
 *   as 16 edições (inclui Lovers 2026.1): src/data/sweetCoffeeHistory.js.
 * - Marca da edição: editionAssets (selo dos 10 anos p/ Lovers; senão fallback).
 * - Fotos: só combos REAIS do acervo recente (2024/2025/Lovers); demais usam slot
 *   de fallback "pendente". Nada de foto-ano inventada nem hotlink externo.
 *
 * Classe-prefixo `edx-` (não `ed-`) de propósito: escapa da regra global de hero
 * 1080px em styles.css — aqui a hero usa altura proporcional (clamp), como pede o brief.
 */
import React from 'react'
import { I } from '../../components/icons'
import { PageHero, HeroHL } from '../../components/layout'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'
import { EDITIONS } from '../../data/editions'
import { AWARD_STATUS, SWEET_COFFEE_HISTORY } from '../../data/sweetCoffeeHistory'
import { editionMark, TEN_YEARS_SEAL } from '../../data/editionAssets'
import { EDITION_GALLERY } from '../../data/editionGallery'
import { PhotoRotator } from '../../components/PhotoRotator'

// Galeria rotativa por edição — acervo normalizado (/images/edicoes/<code>/NN.webp,
// varios participantes). Manifesto: src/data/editionGallery.js.

// Base oficial (16 edições, inclui Lovers) indexada por id/código.
const histById = Object.fromEntries(SWEET_COFFEE_HISTORY.edicoes.map((e) => [e.id, e]))

// Acento por edição — só cores da paleta oficial.
const TONES = ['coral', 'pink', 'cyan', 'yellow']

// {src, alt}[] p/ o PhotoRotator; vazio => slot cai no fallback "pendente".
function editionGalleryFor(code, theme) {
  return (EDITION_GALLERY[code] || []).map((src) => ({ src, alt: `Combo do acervo — edição ${theme}` }))
}

// 16 painéis: editorial (editions.js) + oficial (sweetCoffeeHistory).
const PANELS = EDITIONS.map((ed, i) => {
  const h = histById[ed.ano] || {}
  const special = ed.ano === '2026.1'
  return {
    code: ed.ano,
    slug: ed.slug,
    number: i + 1,
    theme: h.tema || ed.nome,
    etapa: ed.etapa,
    periodo: h.periodo || ed.periodo,
    participantsCount: h.participantesCount != null ? h.participantesCount : ed.participantes,
    status: (h.premiacao && h.premiacao.status) || null,
    special,
    mark: editionMark(ed.ano),
    lead: (ed.desc || '').split('\n\n')[0] || '',
    gallery: editionGalleryFor(ed.ano, h.tema || ed.nome),
    tone: TONES[i % TONES.length],
  }
})
const TOTAL = PANELS.length
const pad2 = (n) => String(n).padStart(2, '0')

function StatusBadge({ status, special }) {
  if (special && !status) return <span className="edx-badge edx-badge--special">Especial · 10 anos</span>
  if (!status) return null
  const s = AWARD_STATUS[status] || AWARD_STATUS['a-conferir']
  return <span className={`edx-badge edx-badge--${s.tone}`}>{s.label}</span>
}

// Slot da marca da edição — espaço SEMPRE reservado. Logo REAL do acervo (uma por
// edição); se o arquivo faltar/quebrar, cai no fallback editorial claro (nunca finge).
function EditionLogoSlot({ e }) {
  const logo = e.mark && e.mark.logo
  if (logo) {
    return (
      <div className="edx-logo edx-logo--real">
        <img src={logo} alt={`Logo da edição ${e.theme}`} loading="lazy" decoding="async"
          onError={(ev) => { const w = ev.currentTarget.closest('.edx-logo'); if (w) w.classList.add('is-fallback') }} />
        <span className="edx-logo__fb"><span className="edx-logo__fb-tag">Logo pendente</span><span className="edx-logo__fb-name">{e.theme}</span></span>
      </div>
    )
  }
  return (
    <div className="edx-logo is-fallback" role="img" aria-label={`Logo da edição ${e.theme} pendente`}>
      <span className="edx-logo__fb">
        <span className="edx-logo__fb-tag">Logo pendente</span>
        <span className="edx-logo__fb-name">{e.theme}</span>
      </span>
    </div>
  )
}

// Slot de fotos — foto principal + mini galeria. Fotos reais (combos do acervo
// recente) quando existem; senão fallback "pendente". Nunca inventa imagem.
// Foto principal + 3 mini, TODAS rotativas (crossfade via PhotoRotator) por
// subconjuntos da galeria da edição — mostra vários participantes trocando, não
// fotos fixas. Fallback "pendente" quando a edição não tem fotos no acervo.
// `live`: só o slide ativo (e vizinhos) monta a galeria rotativa completa. Slides
// distantes mostram 1 foto estática por figura — evita ~380 <img> + dezenas de
// setInterval montados de uma vez (freeze no 1º carregamento). Visual idêntico no
// slide em foco; ao chegar, o rotator já está ativo.
function EditionPhotoSlot({ e, live }) {
  const g = e.gallery
  const has = g.length > 0
  const sub = (k) => g.filter((_, i) => i % 3 === k)   // 3 trilhas intercaladas
  const track = (imgs) => (live ? imgs : imgs.slice(0, 1))  // fora de foco: 1 img, sem timer
  return (
    <div className="edx-photo">
      <figure className={`edx-photo__main${has ? '' : ' is-fallback'}`}>
        {has
          ? <PhotoRotator images={track(g)} interval={4200} />
          : <span className="edx-slot-fb"><span className="edx-slot-fb__tag">Acervo</span><I.cal width={20} height={20} /><span className="edx-slot-fb__t">Foto principal pendente</span><span className="edx-slot-fb__s">Adicionar imagem da edição</span></span>}
      </figure>
      <div className="edx-photo__mini">
        {[0, 1, 2].map((k) => {
          const s = has ? sub(k) : []
          return (
            <figure className={`edx-photo__thumb${s.length ? '' : ' is-fallback'}`} key={k}>
              {s.length
                ? <PhotoRotator images={track(s)} interval={5200 + k * 700} />
                : <span className="edx-slot-fb edx-slot-fb--sm"><span>Galeria pendente</span></span>}
            </figure>
          )
        })}
      </div>
    </div>
  )
}

function EditionSlide({ e, live = true }) {
  return (
    <article className="edx-slide" id={`edx-panel-${e.number - 1}`} style={{ '--tone': `var(--${e.tone}, var(--page-accent))` }} aria-roledescription="slide" aria-label={`Edição ${e.number} de ${TOTAL} — ${e.theme} (${e.code})`}>
      <div className="edx-slide__inner">
        <div className="edx-slide__left">
          <div className="edx-slide__index">
            <span className="edx-slide__num">{pad2(e.number)} <span>/ {pad2(TOTAL)}</span></span>
            <span className="edx-slide__code">{e.code}</span>
          </div>
          <EditionLogoSlot e={e} />
          <h2 className="edx-slide__title">{e.theme}</h2>
          {e.etapa && <span className="edx-slide__etapa">{e.etapa}</span>}
          <p className="edx-slide__lead">{e.lead}</p>
          <ul className="edx-slide__meta">
            {e.periodo && <li><I.cal width={14} height={14} /> {e.periodo}</li>}
            {e.participantsCount != null && <li className="edx-meta--dot">{e.participantsCount} participantes</li>}
          </ul>
          <div className="edx-slide__status"><StatusBadge status={e.status} special={e.special} /></div>
        </div>
        <div className="edx-slide__right">
          <EditionPhotoSlot e={e} live={live} />
        </div>
      </div>
    </article>
  )
}

// Barra de navegação das edições (compartilhada por desktop horizontal e mobile).
function EditionNav({ active, onPick }) {
  return (
    <nav className="edx-nav" aria-label="Navegar pelas edições">
      <p className="edx-nav__now" aria-live="polite">{pad2(active + 1)} de {pad2(TOTAL)} — {PANELS[active].theme}</p>
      <ul className="edx-nav__list">
        {PANELS.map((e, i) => (
          <li key={e.code}>
            <button
              type="button"
              className={`edx-nav__item${i === active ? ' is-active' : ''}`}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => onPick(i)}
            >
              <span className="edx-nav__n">{pad2(i + 1)}</span>
              <span className="edx-nav__y">{e.code}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function EdicoesPage() {
  const pageRef = React.useRef(null)
  const outerRef = React.useRef(null)
  const trackRef = React.useRef(null)
  // Observer de reveal p/ o <PageHero> (usa .motion-reveal-up; aqui não há
  // PageShell, então a página provê o observer — igual às demais institucionais).
  useRevealOnScroll(pageRef)
  const [active, setActive] = React.useState(0)
  const [horizontal, setHorizontal] = React.useState(false)

  // Modo horizontal só no desktop e sem reduced-motion.
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mqWide = window.matchMedia('(min-width: 980px)')
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const evaluate = () => setHorizontal(mqWide.matches && !mqMotion.matches)
    evaluate()
    mqWide.addEventListener('change', evaluate)
    mqMotion.addEventListener('change', evaluate)
    return () => { mqWide.removeEventListener('change', evaluate); mqMotion.removeEventListener('change', evaluate) }
  }, [])

  // Scroll-driven: vertical → translateX do trilho. rAF, sem listener pesado.
  React.useEffect(() => {
    if (!horizontal) return
    const outer = outerRef.current
    const track = trackRef.current
    if (!outer || !track) return
    let raf = 0
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      const vw = window.innerWidth
      const dist = outer.offsetHeight - vh // distância de scroll vertical útil
      const passed = Math.min(Math.max(-outer.getBoundingClientRect().top, 0), dist)
      const progress = dist > 0 ? passed / dist : 0
      const maxX = (TOTAL - 1) * vw
      track.style.transform = `translate3d(${-progress * maxX}px,0,0)`
      const idx = Math.round(progress * (TOTAL - 1))
      setActive((prev) => (prev === idx ? prev : idx))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [horizontal])

  // Modo vertical: observa qual painel está visível p/ acender o chip ativo.
  React.useEffect(() => {
    if (horizontal || typeof window === 'undefined') return
    const nodes = PANELS.map((_, i) => document.getElementById(`edx-panel-${i}`)).filter(Boolean)
    if (!nodes.length) return
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const i = Number(en.target.id.replace('edx-panel-', ''))
          setActive(i)
        }
      })
    }, { threshold: 0, rootMargin: '-45% 0px -45% 0px' })
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [horizontal])

  // Clique na navegação → rola até a edição (horizontal: posição de scroll; vertical: o painel).
  const pick = React.useCallback((i) => {
    if (typeof window === 'undefined') return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (horizontal && outerRef.current) {
      const outer = outerRef.current
      const dist = outer.offsetHeight - window.innerHeight
      const top = outer.offsetTop + (i / (TOTAL - 1)) * dist
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
    } else {
      const el = document.getElementById(`edx-panel-${i}`)
      if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    }
  }, [horizontal])

  return (
    <div className="page-enter edx-page">
      {/* HERO institucional — mesma peça das demais páginas (<PageHero>): fundo no
          acento da rota (ciano) + tinta escura, altura proporcional e .wrap canônico.
          O hint de scroll fica como conteúdo extra (função: avisa da apresentação). */}
      <PageHero
        title={<>A história do <HeroHL color="var(--coral)">Sweet &amp; Coffee Week</HeroHL>, edição por edição.</>}
        subtitle="De 2016 à edição Lovers, cada temporada trouxe um novo tema, novos combos e novas memórias para Natal."
      >
        <div className="edx-hero-hint" aria-hidden="true">
          <span>Role para percorrer as 16 edições</span>
          <I.arrow />
        </div>
      </PageHero>

      {horizontal ? (
        /* DESKTOP — apresentação horizontal scroll-driven */
        <section
          ref={outerRef}
          className="edx-stage"
          style={{ height: `${TOTAL * 135}vh` }}
          aria-label="Apresentação das edições"
        >
          <div className="edx-sticky">
            <div className="edx-viewport">
              <div ref={trackRef} className="edx-track" style={{ width: `${TOTAL * 100}vw` }}>
                {PANELS.map((e, i) => <EditionSlide e={e} key={e.code} live={Math.abs(i - active) <= 1} />)}
              </div>
            </div>
            <div className="edx-progress" aria-hidden="true">
              <span style={{ width: `${((active + 1) / TOTAL) * 100}%` }} />
            </div>
            <EditionNav active={active} onPick={pick} />
          </div>
        </section>
      ) : (
        /* MOBILE / reduced-motion — painéis verticais + chips */
        <section className="edx-stack" aria-label="Edições">
          <div className="edx-chips-wrap">
            <EditionNav active={active} onPick={pick} />
          </div>
          <div className="edx-stack__list">
            {PANELS.map((e, i) => <EditionSlide e={e} key={e.code} live={Math.abs(i - active) <= 1} />)}
          </div>
        </section>
      )}

      <style>{`
        .edx-page {
          /* container alinhado à Home (.wrap → --maxw 1280 / --pad clamp(20,4vw,56)) */
          --page-max: 1280px;
          --page-gutter: clamp(20px, 4vw, 56px);
          /* zona de segurança header↔hero — mesmos tokens globais (styles.css :body),
             redefinidos aqui pois .edx-page é auto-contida (escapa da regra global de hero). */
          --header-safe-offset: clamp(120px, 14vh, 168px);
          --hero-top-clearance: clamp(32px, 4vw, 56px);
          --hero-content-start: calc(var(--header-safe-offset) + var(--hero-top-clearance));
          overflow-x: clip;
        }
        .edx-wrap { max-width: var(--page-max); margin: 0 auto; padding-inline: var(--page-gutter); }
        .edx-hl { color: var(--page-accent, var(--cyan)); font-style: italic; }

        /* HERO — agora o componente <PageHero> + src/styles/hero.css (fonte única):
           fundo no acento da rota (ciano) + tinta escura, como as demais páginas.
           Só o hint de scroll é específico desta apresentação (função, não enfeite). */
        .edx-hero-hint { display: inline-flex; align-items: center; gap: 10px; margin-top: var(--sp-6); font-family: var(--font-sans); font-size: 13px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--ink); opacity: .72; }
        .edx-hero-hint svg { width: 16px; height: 16px; transform: rotate(90deg); }

        /* STAGE — desktop sticky horizontal */
        .edx-stage { position: relative; background: var(--cream); }
        .edx-sticky { position: sticky; top: 0; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
        .edx-viewport { flex: 1; overflow: hidden; padding-top: clamp(80px, 11vh, 130px); }
        .edx-track { display: flex; height: 100%; will-change: transform; }

        /* NAV — régua de apresentação na BASE da seção sticky (livre do menu) */
        .edx-nav { padding: var(--sp-3) var(--page-gutter); background: color-mix(in srgb, var(--cream) 88%, transparent); border-top: 1px solid var(--paper-line); }
        .edx-nav__now { max-width: var(--page-max); margin: 0 auto var(--sp-2); font-family: var(--font-sans); font-size: 12px; font-weight: 700; letter-spacing: .02em; color: var(--ink-soft); }
        .edx-nav__list { list-style: none; margin: 0 auto; padding: 0; max-width: var(--page-max); display: flex; gap: 6px; overflow-x: auto; scrollbar-width: thin; }
        .edx-nav__item { display: inline-flex; flex-direction: column; align-items: center; gap: 1px; min-width: 48px; padding: 7px 9px; border: 1px solid var(--paper-line); border-radius: 10px; background: var(--cream-card); color: var(--ink-soft); cursor: pointer; transition: border-color .16s, color .16s, background .16s; }
        .edx-nav__item:hover { color: var(--ink); border-color: var(--page-accent, var(--cyan)); }
        .edx-nav__item.is-active { background: var(--page-accent, var(--cyan)); border-color: var(--page-accent, var(--cyan)); color: var(--ink); }
        .edx-nav__n { font-family: var(--font-display); font-weight: 900; font-size: 13px; line-height: 1; }
        .edx-nav__y { font-size: 10px; font-weight: 700; opacity: .8; white-space: nowrap; }
        .edx-nav__item:focus-visible { outline: 2px solid var(--cyan-deep); outline-offset: 2px; }

        /* PROGRESS */
        .edx-progress { height: 3px; background: var(--paper-line); }
        .edx-progress span { display: block; height: 100%; background: var(--page-accent, var(--cyan)); transition: width .2s ease; }

        /* SLIDE */
        .edx-slide { min-width: 100vw; height: 100%; display: flex; align-items: center; background: color-mix(in srgb, var(--tone) 5%, var(--cream)); }
        .edx-slide__inner { max-width: var(--page-max); margin: 0 auto; padding: clamp(28px,4vh,56px) var(--page-gutter); width: 100%; display: grid; grid-template-columns: minmax(340px, .92fr) minmax(500px, 1.08fr); gap: clamp(48px, 6vw, 96px); align-items: center; }
        .edx-slide__left { min-width: 0; }
        .edx-slide__index { display: flex; align-items: baseline; gap: 14px; padding-bottom: var(--sp-3); border-bottom: 1px solid var(--paper-line); margin-bottom: var(--sp-4); }
        .edx-slide__num { font-family: var(--font-display); font-weight: 900; font-size: clamp(34px, 4vw, 60px); letter-spacing: -.03em; color: var(--tone); line-height: 1; }
        .edx-slide__num span { font-size: .5em; color: var(--ink-soft); }
        .edx-slide__code { font-family: var(--font-sans); font-size: 13px; font-weight: 700; letter-spacing: .06em; color: var(--ink-soft); background: rgba(43,24,16,.06); border-radius: 999px; padding: 4px 11px; }
        .edx-slide__title { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.03em; font-size: clamp(30px, 3.6vw, 56px); line-height: 1; color: var(--ink); margin: var(--sp-4) 0 0; text-wrap: balance; }
        .edx-slide__etapa { display: inline-block; margin-top: 8px; font-family: var(--font-sans); font-size: 12.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--tone); }
        .edx-slide__lead { margin: var(--sp-4) 0 0; max-width: 48ch; color: var(--ink-soft); font-size: clamp(14.5px, 1vw, 16px); line-height: 1.5; text-wrap: pretty; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .edx-slide__meta { list-style: none; margin: var(--sp-5) 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 18px; }
        .edx-slide__meta li { display: inline-flex; align-items: center; gap: 7px; font-size: 13.5px; color: var(--ink); }
        .edx-slide__meta svg { color: var(--tone); }
        .edx-meta--dot::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 999px; background: var(--tone); margin-right: 8px; vertical-align: middle; }
        .edx-slide__status { margin-top: var(--sp-4); }

        /* LOGO SLOT */
        .edx-logo { position: relative; width: clamp(88px, 8vw, 120px); aspect-ratio: 1; margin-top: var(--sp-5); border-radius: 16px; display: grid; place-items: center; overflow: hidden; }
        /* img absoluta: a row auto do grid cresce pro tamanho intrínseco da imagem e o overflow:hidden cortava a logo */
        .edx-logo--seal img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 8px 18px rgba(0,0,0,.25)); }
        .edx-logo--seal .edx-logo__fb { display: none; }
        .edx-logo--seal.is-fallback img { display: none; }
        .edx-logo--seal.is-fallback .edx-logo__fb { display: flex; }
        /* logo real da edição (acervo) — mesma lógica do selo: contain + fallback no erro */
        .edx-logo--real { width: clamp(96px, 9vw, 128px); }
        .edx-logo--real img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 6px 14px rgba(43,24,16,.2)); }
        .edx-logo--real .edx-logo__fb { display: none; }
        .edx-logo--real.is-fallback { width: min(300px, 100%); aspect-ratio: auto; min-height: 96px; max-height: 132px; border: 1px solid color-mix(in srgb, var(--tone) 38%, var(--paper-line)); background: color-mix(in srgb, var(--tone) 7%, var(--cream-card)); padding: 14px 16px; place-items: center start; }
        .edx-logo--real.is-fallback img { display: none; }
        .edx-logo--real.is-fallback .edx-logo__fb { display: flex; }
        .edx-logo.is-fallback { width: min(300px, 100%); min-height: 96px; max-height: 132px; aspect-ratio: auto; border: 1px solid color-mix(in srgb, var(--tone) 38%, var(--paper-line)); background: color-mix(in srgb, var(--tone) 7%, var(--cream-card)); border-radius: 14px; padding: 14px 16px; place-items: center start; }
        .edx-logo__fb { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; }
        .edx-logo__fb-tag { font-family: var(--font-sans); font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-soft); }
        .edx-logo__fb-name { font-family: var(--font-heading); font-weight: 800; font-size: 15px; color: var(--ink); line-height: 1.15; }

        /* PHOTO SLOT */
        .edx-photo { display: flex; flex-direction: column; gap: 12px; width: 100%; }
        .edx-photo__main { position: relative; margin: 0; width: 100%; aspect-ratio: 4 / 3; min-height: clamp(340px, 46vh, 500px); border-radius: 18px; overflow: hidden; background: var(--swc-coffee, #6A2C15); box-shadow: var(--shadow-lg); }
        .edx-slot-fb__tag { position: absolute; top: 12px; left: 12px; font-family: var(--font-sans); font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-soft); background: rgba(43,24,16,.06); border-radius: 999px; padding: 4px 10px; }
        .edx-photo__main img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .edx-photo__mini { width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .edx-photo__thumb { margin: 0; }
        .edx-photo__thumb { position: relative; margin: 0; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: var(--swc-coffee, #6A2C15); }
        .edx-photo__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .edx-photo__cap { font-size: 12px; color: var(--ink-soft); }
        /* fallback de slots de foto */
        .edx-photo__main.is-fallback, .edx-photo__thumb.is-fallback { background: color-mix(in srgb, var(--tone) 8%, var(--cream-card)); border: 1.5px dashed color-mix(in srgb, var(--tone) 50%, var(--paper-line)); box-shadow: none; }
        .edx-photo__main.is-fallback img, .edx-photo__thumb.is-fallback img { display: none; }
        .edx-slot-fb { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--ink-soft); font-family: var(--font-sans); font-size: 13px; font-weight: 700; text-align: center; padding: 12px; }
        .edx-slot-fb svg { color: var(--tone); }
        .edx-slot-fb__t { font-size: 13px; }
        .edx-slot-fb__s { font-size: 11px; font-weight: 600; color: var(--ink-soft); opacity: .82; }
        .edx-slot-fb--sm { font-size: 10.5px; gap: 0; }

        /* BADGE */
        .edx-badge { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-sans); font-size: 12px; font-weight: 700; letter-spacing: .02em; padding: 6px 13px; border-radius: 999px; }
        .edx-badge--ok { background: rgba(127,194,74,.16); color: #3c6a1f; }
        .edx-badge--muted { background: rgba(43,24,16,.07); color: var(--ink-soft); }
        .edx-badge--warn { background: rgba(232,85,58,.14); color: var(--coral-deep); }
        .edx-badge--info { background: rgba(43,196,232,.16); color: var(--cyan-deep); }
        .edx-badge--special { background: var(--page-accent, var(--cyan)); color: var(--ink); }

        /* MOBILE / reduced-motion — vertical + chips sticky */
        .edx-stack { background: var(--cream); }
        .edx-chips-wrap { position: sticky; top: 0; z-index: 5; background: color-mix(in srgb, var(--cream) 90%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--paper-line); }
        .edx-stack .edx-nav { padding: clamp(70px, 12vh, 96px) var(--page-gutter) var(--sp-3); }
        .edx-stack .edx-slide { min-width: 0; height: auto; border-bottom: 1px solid var(--paper-line); }
        .edx-stack .edx-slide__inner { grid-template-columns: 1fr; gap: var(--sp-6); padding-block: var(--section-y, clamp(56px, 12vw, 96px)); }
        .edx-stack .edx-slide__lead { -webkit-line-clamp: 6; }

        @media (max-width: 540px) {
          .edx-photo__mini { grid-template-columns: repeat(3, 1fr); }
          .edx-slide__title { font-size: clamp(26px, 8vw, 38px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .edx-progress span, .edx-nav__item { transition: none; }
        }
      `}</style>
    </div>
  )
}
