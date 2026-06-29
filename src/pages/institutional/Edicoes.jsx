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
import { EDITIONS } from '../../data/editions'
import { AWARD_STATUS } from '../../data/sweetHistory'
import { SWEET_COFFEE_HISTORY } from '../../data/sweetCoffeeHistory'
import { resolveParticipant } from '../../data/participantAssets'
import { editionMark, TEN_YEARS_SEAL } from '../../data/editionAssets'

const comboMain = (slug) => `/images/combos/${slug}/main.jpg`

// Slugs com pasta de combo real no acervo (/public/images/combos/<slug>/main.jpg).
const COMBO_SLUGS = new Set([
  'adocee-doceria', 'bolomania', 'caffe-basilicos', 'canutos', 'caroli-douces',
  'casa-1190', 'delicato-bolos', 'douce-di-maria', 'jolie-cafe-patisserie',
  'just-food-coffee', 'mangai', 'mr-cupcake-confeitaria', 'o-maestro-cafe',
  'padoca-do-bosque', 'paneer-patisserie', 'parma-doces', 'rollab-confeitaria',
  'sweet-duo-confeitaria', 'wow-cookies',
])
// Edições cujas fotos de combo do acervo plausivelmente pertencem (recentes).
const RECENT_PHOTO_EDITIONS = new Set(['2024', '2025', '2026.1'])

// Base oficial (16 edições, inclui Lovers) indexada por id/código.
const histById = Object.fromEntries(SWEET_COFFEE_HISTORY.edicoes.map((e) => [e.id, e]))

// Acento por edição — só cores da paleta oficial.
const TONES = ['coral', 'pink', 'cyan', 'yellow']

function comboThumbsFor(code, names) {
  if (!RECENT_PHOTO_EDITIONS.has(code)) return []
  const resolved = (names || []).map((n) => resolveParticipant(n))
  const seen = new Set()
  const out = []
  for (const p of resolved) {
    if (!p.slug || !COMBO_SLUGS.has(p.slug) || seen.has(p.slug)) continue
    seen.add(p.slug)
    out.push({ slug: p.slug, name: p.name, src: comboMain(p.slug) })
    if (out.length >= 4) break
  }
  return out
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
    thumbs: comboThumbsFor(ed.ano, h.participantes),
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

// Slot da marca da edição — espaço SEMPRE reservado. Lovers usa o selo dos 10 anos;
// demais mostram fallback claro (não finge ser logo real).
function EditionLogoSlot({ e }) {
  if (e.special) {
    return (
      <div className="edx-logo edx-logo--seal">
        <img src={TEN_YEARS_SEAL} alt={`Selo de 10 anos — edição ${e.theme}`} loading="lazy" decoding="async"
          onError={(ev) => { const w = ev.currentTarget.closest('.edx-logo'); if (w) w.classList.add('is-fallback') }} />
        <span className="edx-logo__fb"><span className="edx-logo__fb-tag">Logo da edição pendente</span><span className="edx-logo__fb-name">{e.theme}</span></span>
      </div>
    )
  }
  return (
    <div className="edx-logo is-fallback" role="img" aria-label={`Logo da edição ${e.theme} pendente`}>
      <span className="edx-logo__fb">
        <span className="edx-logo__fb-code">{e.code}</span>
        <span className="edx-logo__fb-tag">Logo da edição pendente</span>
        <span className="edx-logo__fb-name">{e.theme}</span>
      </span>
    </div>
  )
}

// Slot de fotos — foto principal + mini galeria. Fotos reais (combos do acervo
// recente) quando existem; senão fallback "pendente". Nunca inventa imagem.
function EditionPhotoSlot({ e }) {
  const hasPhotos = e.thumbs.length > 0
  const lead = hasPhotos ? e.thumbs[0] : null
  const mini = hasPhotos ? e.thumbs.slice(1, 4) : []
  return (
    <div className="edx-photo">
      <figure className={`edx-photo__main${hasPhotos ? '' : ' is-fallback'}`}>
        {lead
          ? <img src={lead.src} alt={`Combo do acervo recente — edição ${e.theme}`} loading="lazy" decoding="async"
              onError={(ev) => { const w = ev.currentTarget.closest('.edx-photo__main'); if (w) w.classList.add('is-fallback') }} />
          : <span className="edx-slot-fb"><I.cal width={20} height={20} /><span>Foto da edição pendente</span></span>}
      </figure>
      <div className="edx-photo__mini">
        {[0, 1, 2].map((idx) => {
          const t = mini[idx]
          return (
            <figure className={`edx-photo__thumb${t ? '' : ' is-fallback'}`} key={idx}>
              {t
                ? <img src={t.src} alt={`Combo ${t.name} — acervo recente`} loading="lazy" decoding="async"
                    onError={(ev) => { const w = ev.currentTarget.closest('.edx-photo__thumb'); if (w) w.classList.add('is-fallback') }} />
                : <span className="edx-slot-fb edx-slot-fb--sm"><span>Galeria pendente</span></span>}
            </figure>
          )
        })}
      </div>
      {hasPhotos && <figcaption className="edx-photo__cap">Combos do acervo recente</figcaption>}
    </div>
  )
}

function EditionSlide({ e }) {
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
          <EditionPhotoSlot e={e} />
        </div>
      </div>
    </article>
  )
}

// Barra de navegação das edições (compartilhada por desktop horizontal e mobile).
function EditionNav({ active, onPick }) {
  return (
    <nav className="edx-nav" aria-label="Navegar pelas edições">
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
  const outerRef = React.useRef(null)
  const trackRef = React.useRef(null)
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
      {/* HERO editorial — altura proporcional (não 1080), topo livre do menu */}
      <section className="edx-hero">
        <div className="edx-wrap edx-hero__inner">
          <span className="edx-hero__eyebrow">Edições</span>
          <h1 className="edx-hero__title">A história do <span className="edx-hl">Sweet &amp; Coffee Week</span>, edição por edição.</h1>
          <p className="edx-hero__text">De 2016 à edição Lovers, cada temporada trouxe um novo tema, novos combos e novas memórias para Natal.</p>
          <div className="edx-hero__hint" aria-hidden="true">
            <span>Role para percorrer as 16 edições</span>
            <I.arrow />
          </div>
        </div>
      </section>

      {horizontal ? (
        /* DESKTOP — apresentação horizontal scroll-driven */
        <section
          ref={outerRef}
          className="edx-stage"
          style={{ height: `${TOTAL * 100}vh` }}
          aria-label="Apresentação das edições"
        >
          <div className="edx-sticky">
            <EditionNav active={active} onPick={pick} />
            <div className="edx-viewport">
              <div ref={trackRef} className="edx-track" style={{ width: `${TOTAL * 100}vw` }}>
                {PANELS.map((e) => <EditionSlide e={e} key={e.code} />)}
              </div>
            </div>
            <div className="edx-progress" aria-hidden="true">
              <span style={{ width: `${((active + 1) / TOTAL) * 100}%` }} />
            </div>
          </div>
        </section>
      ) : (
        /* MOBILE / reduced-motion — painéis verticais + chips */
        <section className="edx-stack" aria-label="Edições">
          <div className="edx-chips-wrap">
            <EditionNav active={active} onPick={pick} />
          </div>
          <div className="edx-stack__list">
            {PANELS.map((e) => <EditionSlide e={e} key={e.code} />)}
          </div>
        </section>
      )}

      <style>{`
        .edx-page {
          --page-max: 1180px;
          --page-gutter: clamp(20px, 4vw, 64px);
          --hero-top-space: clamp(120px, 16vh, 190px);
          overflow-x: clip;
        }
        .edx-wrap { max-width: var(--page-max); margin: 0 auto; padding-inline: var(--page-gutter); }
        .edx-hl { color: var(--page-accent, var(--cyan)); font-style: italic; }

        /* HERO — altura proporcional, topo livre (não encosta no menu) */
        .edx-hero { background: #381610; color: var(--cream); min-height: clamp(680px, 86vh, 920px); display: flex; align-items: flex-end; padding: var(--hero-top-space) 0 clamp(56px, 9vh, 110px); }
        .edx-hero__inner { width: 100%; }
        .edx-hero__eyebrow { font-family: var(--font-sans); font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--page-accent, var(--cyan)); }
        .edx-hero__title { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.03em; font-size: clamp(38px, 6vw, 84px); line-height: .98; max-width: 18ch; margin: var(--sp-4) 0 0; color: var(--cream); text-wrap: balance; }
        .edx-hero__text { max-width: 56ch; margin: var(--sp-5) 0 0; color: rgba(255,241,230,.85); font-size: var(--fs-lead); line-height: 1.45; text-wrap: pretty; }
        .edx-hero__hint { display: inline-flex; align-items: center; gap: 10px; margin-top: var(--sp-7); font-family: var(--font-sans); font-size: 13px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--page-accent, var(--cyan)); }
        .edx-hero__hint svg { width: 16px; height: 16px; transform: rotate(90deg); }

        /* STAGE — desktop sticky horizontal */
        .edx-stage { position: relative; background: var(--cream); }
        .edx-sticky { position: sticky; top: 0; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
        .edx-viewport { flex: 1; overflow: hidden; }
        .edx-track { display: flex; height: 100%; will-change: transform; }

        /* NAV — barra discreta de edições */
        .edx-nav { padding: clamp(74px, 9vh, 104px) var(--page-gutter) var(--sp-3); }
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
        .edx-slide { min-width: 100vw; height: 100%; display: flex; align-items: center; }
        .edx-slide__inner { max-width: var(--page-max); margin: 0 auto; padding: clamp(20px,3vh,40px) var(--page-gutter); width: 100%; display: grid; grid-template-columns: 1.02fr 1.1fr; gap: clamp(28px, 4vw, 72px); align-items: center; }
        .edx-slide__left { min-width: 0; }
        .edx-slide__index { display: flex; align-items: baseline; gap: 12px; }
        .edx-slide__num { font-family: var(--font-display); font-weight: 900; font-size: clamp(26px, 3vw, 40px); letter-spacing: -.02em; color: var(--tone); line-height: 1; }
        .edx-slide__num span { font-size: .5em; color: var(--ink-soft); }
        .edx-slide__code { font-family: var(--font-sans); font-size: 13px; font-weight: 700; letter-spacing: .06em; color: var(--ink-soft); background: rgba(43,24,16,.06); border-radius: 999px; padding: 4px 11px; }
        .edx-slide__title { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.03em; font-size: clamp(30px, 3.6vw, 56px); line-height: 1; color: var(--ink); margin: var(--sp-4) 0 0; text-wrap: balance; }
        .edx-slide__etapa { display: inline-block; margin-top: 8px; font-family: var(--font-sans); font-size: 12.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--tone); }
        .edx-slide__lead { margin: var(--sp-4) 0 0; max-width: 52ch; color: var(--ink-soft); font-size: clamp(14.5px, 1vw, 16px); line-height: 1.5; text-wrap: pretty; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        .edx-slide__meta { list-style: none; margin: var(--sp-5) 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 18px; }
        .edx-slide__meta li { display: inline-flex; align-items: center; gap: 7px; font-size: 13.5px; color: var(--ink); }
        .edx-slide__meta svg { color: var(--tone); }
        .edx-meta--dot::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 999px; background: var(--tone); margin-right: 8px; vertical-align: middle; }
        .edx-slide__status { margin-top: var(--sp-4); }

        /* LOGO SLOT */
        .edx-logo { position: relative; width: clamp(88px, 8vw, 120px); aspect-ratio: 1; margin-top: var(--sp-5); border-radius: 16px; display: grid; place-items: center; overflow: hidden; }
        .edx-logo--seal img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 8px 18px rgba(0,0,0,.25)); }
        .edx-logo--seal .edx-logo__fb { display: none; }
        .edx-logo--seal.is-fallback img { display: none; }
        .edx-logo--seal.is-fallback .edx-logo__fb { display: flex; }
        .edx-logo.is-fallback { border: 1.5px dashed color-mix(in srgb, var(--tone) 55%, var(--paper-line)); background: color-mix(in srgb, var(--tone) 8%, var(--cream-card)); width: auto; min-width: clamp(140px, 16vw, 200px); aspect-ratio: auto; padding: var(--sp-4); }
        .edx-logo__fb { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; text-align: left; }
        .edx-logo__fb-code { font-family: var(--font-display); font-weight: 900; font-size: 14px; color: var(--tone); }
        .edx-logo__fb-tag { font-family: var(--font-sans); font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); }
        .edx-logo__fb-name { font-family: var(--font-heading); font-weight: 800; font-size: 14px; color: var(--ink); line-height: 1.1; }

        /* PHOTO SLOT */
        .edx-photo { display: grid; gap: 10px; }
        .edx-photo__main { position: relative; margin: 0; aspect-ratio: 4 / 3; border-radius: 18px; overflow: hidden; background: var(--swc-coffee, #6A2C15); box-shadow: var(--shadow-lg); }
        .edx-photo__main img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .edx-photo__mini { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .edx-photo__thumb { position: relative; margin: 0; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: var(--swc-coffee, #6A2C15); }
        .edx-photo__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .edx-photo__cap { font-size: 12px; color: var(--ink-soft); }
        /* fallback de slots de foto */
        .edx-photo__main.is-fallback, .edx-photo__thumb.is-fallback { background: color-mix(in srgb, var(--tone) 8%, var(--cream-card)); border: 1.5px dashed color-mix(in srgb, var(--tone) 50%, var(--paper-line)); box-shadow: none; }
        .edx-photo__main.is-fallback img, .edx-photo__thumb.is-fallback img { display: none; }
        .edx-slot-fb { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--ink-soft); font-family: var(--font-sans); font-size: 13px; font-weight: 700; text-align: center; padding: 12px; }
        .edx-slot-fb svg { color: var(--tone); }
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
