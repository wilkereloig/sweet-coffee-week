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
import { PageHero, HeroHL } from '../../components/layout'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'
import { useSteppedPresentation } from '../../hooks/useSteppedPresentation'
import { EDITIONS } from '../../data/editions'
import { AWARD_STATUS, SWEET_COFFEE_HISTORY } from '../../data/sweetCoffeeHistory'
import { editionMark } from '../../data/editionAssets'
import { EDITION_GALLERY } from '../../data/editionGallery'
import { getEditionHighlights, sceneShotsFor } from '../../data/editionHighlights'
import { resolveParticipant } from '../../data/participantAssets'
import { PhotoRotator } from '../../components/PhotoRotator'

const histById = Object.fromEntries(SWEET_COFFEE_HISTORY.edicoes.map((e) => [e.id, e]))

// Acento por edição — só cores da paleta oficial.
const TONES = ['coral', 'pink', 'cyan', 'yellow']

// 16 cenas: editorial (editions.js) + oficial (sweetCoffeeHistory) + destaques.
const PANELS = EDITIONS.map((ed, i) => {
  const h = histById[ed.ano] || {}
  const gallery = EDITION_GALLERY[ed.ano] || []
  return {
    code: ed.ano,
    slug: ed.slug,
    number: i + 1,
    theme: h.tema || ed.nome,
    periodo: h.periodo || ed.periodo,
    participantsCount: h.participantesCount != null ? h.participantesCount : ed.participantes,
    status: (h.premiacao && h.premiacao.status) || null,
    special: ed.ano === '2026.1',
    mark: editionMark(ed.ano),
    lead: (ed.desc || '').split('\n\n')[0] || '',
    gallery,
    scene: sceneShotsFor(ed.ano, gallery),
    highlights: getEditionHighlights(ed.ano),
    tone: TONES[i % TONES.length],
  }
})
const TOTAL = PANELS.length
const pad2 = (n) => String(n).padStart(2, '0')

// Rótulo curto da trilha (só Lovers tem trilhas distintas no pódio-resumo).
const TRILHA_LABEL = { juri_tecnico: 'Júri Técnico', sweet_lovers: 'Sweet Lovers' }

// Slot da marca da edição — espaço SEMPRE reservado; fallback honesto.
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

// Pódio-resumo da edição — só dados reais (1º lugares; empates lado a lado).
function EditionPodium({ e, go }) {
  const hl = e.highlights
  if (!hl) return null
  // 2019.1 é o marco: primeira premiação encontrada no acervo.
  const title = e.code === '2019.1' ? 'A primeira premiação do festival' : 'Pódio da edição'
  return (
    <div className="edx-podio">
      <p className="edx-podio__t">{title}</p>
      <ul className="edx-podio__list">
        {hl.firsts.map((f) => {
          const winners = f.nomes.map((n) => resolveParticipant(n))
          return (
            <li className="edx-podio__row" key={`${f.categoria}-${f.trilha || ''}`}>
              <span className="edx-podio__medal" aria-hidden="true">1º</span>
              <span className="edx-podio__logos">
                {winners.map((w) => (
                  <span className="edx-podio__logo" key={w.name} title={w.name}>
                    {w.logo
                      ? <img src={w.logo} alt="" loading="lazy" decoding="async"
                          onError={(ev) => { ev.currentTarget.style.display = 'none'; ev.currentTarget.nextSibling.style.display = 'grid' }} />
                      : null}
                    <span className="edx-podio__ini" style={w.logo ? { display: 'none' } : undefined}>{w.fallback}</span>
                  </span>
                ))}
              </span>
              <span className="edx-podio__what">
                <span className="edx-podio__cat">
                  {f.categoria}{e.special && f.trilha && TRILHA_LABEL[f.trilha] ? ` · ${TRILHA_LABEL[f.trilha]}` : ''}
                </span>
                <span className="edx-podio__win">{f.nomes.join(' + ')}</span>
              </span>
            </li>
          )
        })}
      </ul>
      {e.special ? (
        <a href="/sweet-awards" className="edx-cta" onClick={go('/sweet-awards')}>Ver os vencedores no Sweet Awards</a>
      ) : (
        <a href="/sweet-awards" className="edx-podio__link" onClick={go('/sweet-awards')}>Pódio completo no Sweet Awards</a>
      )}
    </div>
  )
}

// Badge de status só quando NÃO há pódio (ausência honesta, sem placeholder).
function StatusNote({ e }) {
  if (e.highlights) return null
  if (!e.status) return null
  const s = AWARD_STATUS[e.status] || AWARD_STATUS['a-conferir']
  return <span className={`edx-badge edx-badge--${s.tone}`}>{s.label}</span>
}

// Filmstrip do acervo da edição — thumbs estáticas com scroll-snap; clique
// troca a foto-cena. Só monta no slide em foco (e vizinhos): 16 × ~12 imgs de
// uma vez congelaria o 1º paint.
function Filmstrip({ e, current, onPick }) {
  if (!e.gallery.length) return null
  return (
    <div className="edx-strip" role="group" aria-label={`Acervo da edição ${e.theme}`}>
      {e.gallery.map((src) => (
        <button
          type="button"
          key={src}
          className={`edx-strip__th${src === current ? ' is-on' : ''}`}
          onClick={() => onPick(src)}
          aria-label="Ver esta foto em destaque"
          aria-pressed={src === current}
        >
          <img src={src} alt="" loading="lazy" decoding="async" />
        </button>
      ))}
    </div>
  )
}

// Cena de uma edição. `live`: crossfade + filmstrip só no slide em foco e
// vizinhos. `near`: a foto full-bleed só monta perto do foco (16 imagens de
// viewport inteiro decodificadas de uma vez travam o compositor). `offset`:
// parallax da camada de foto (desktop).
function EditionScene({ e, live, near = true, offset = 0, go }) {
  // Foto escolhida na filmstrip vence o crossfade automático.
  const [picked, setPicked] = React.useState(null)
  const heroShot = picked || e.scene[0] || e.gallery[0] || null
  const sceneImgs = e.scene.map((src) => ({ src, alt: `Combo do acervo, edição ${e.theme}` }))
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
  return (
    <article
      className={`edx-scene${e.special ? ' edx-scene--special' : ''}`}
      id={`edx-panel-${e.number - 1}`}
      style={{ '--tone': `var(--${e.tone}, var(--page-accent))`, '--par': `${offset}vw` }}
      aria-roledescription="slide"
      aria-label={`Edição ${e.number} de ${TOTAL}: ${e.theme} (${e.code})`}
    >
      {/* camada 1 — foto-cena + scrim */}
      <div className="edx-scene__media" aria-hidden={heroShot ? undefined : 'true'}>
        {!near ? null : heroShot ? (
          picked || !live || e.scene.length < 2
            ? <img src={heroShot} alt={`Combo do acervo, edição ${e.theme}`} loading={e.number === 1 ? 'eager' : 'lazy'} decoding="async" />
            : <PhotoRotator images={sceneImgs} interval={7200} eager={e.number === 1} />
        ) : (
          <span className="edx-scene__nofoto"><I.cal width={22} height={22} /><span>Acervo desta edição pendente</span></span>
        )}
        <span className="edx-scene__scrim" aria-hidden="true" />
        {/* camada 2 — numeral gigante (dado: posição na série) */}
        <span className="edx-scene__num" aria-hidden="true">{pad2(e.number)}</span>
      </div>

      {/* cabeçalho do capítulo: no desktop entra na coluna; no mobile fica sobre a foto */}
      <header className="edx-scene__head">
        <span className="edx-scene__code">{e.code}</span>
        <h2 className="edx-scene__title">{e.theme}</h2>
        <p className="edx-scene__meta">
          {e.periodo || null}
          {e.periodo && e.participantsCount != null ? ' · ' : ''}
          {e.participantsCount != null ? `${e.participantsCount} participantes` : ''}
        </p>
      </header>

      {/* camada 3 — corpo editorial */}
      <div className="edx-scene__body">
        <EditionLogoSlot e={e} />
        <p className="edx-scene__lead">{e.lead}</p>
        <StatusNote e={e} />
        <EditionPodium e={e} go={go} />
      </div>

      <Filmstrip e={{ ...e, gallery: live ? e.gallery : [] }} current={heroShot} onPick={setPicked} />
    </article>
  )
}

// Timeline de anos — controle de apresentação (substitui os chips numerados).
function YearRail({ active, onPick }) {
  return (
    <nav className="edx-anos" aria-label="Navegar pelas edições">
      <ul className="edx-anos__list">
        {PANELS.map((e, i) => (
          <li key={e.code}>
            <button
              type="button"
              className={`edx-anos__item${i === active ? ' is-active' : ''}`}
              aria-current={i === active ? 'true' : undefined}
              aria-label={`Edição ${e.code}: ${e.theme}`}
              onClick={() => onPick(i)}
            >
              {e.special ? 'Lovers' : e.code}
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

  useSteppedPresentation({ enabled: horizontal, stageRef: outerRef, total: TOTAL, active, setActive })

  // Modo vertical: observa qual painel está visível p/ acender a timeline.
  React.useEffect(() => {
    if (horizontal || typeof window === 'undefined') return
    const nodes = PANELS.map((_, i) => document.getElementById(`edx-panel-${i}`)).filter(Boolean)
    if (!nodes.length) return
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) setActive(Number(en.target.id.replace('edx-panel-', '')))
      })
    }, { threshold: 0, rootMargin: '-45% 0px -45% 0px' })
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
    if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [horizontal])

  const go = (path) => (e) => { e.preventDefault(); navigate(path); if (typeof window !== 'undefined') window.scrollTo(0, 0) }

  return (
    <div className="page-enter edx-page">
      {/* HERO institucional (fundo no acento da rota) + capa-índice: a filmstrip
          cronológica das 16 edições anuncia a apresentação e pula direto. */}
      <PageHero
        title={<>A história do <HeroHL color="var(--coral)">Sweet &amp; Coffee Week</HeroHL>, edição por edição.</>}
        subtitle="De 2016 à edição Lovers, cada temporada trouxe um novo tema, novos combos e novas memórias para Natal."
      >
        <div className="edx-capa" role="group" aria-label="Ir direto para uma edição">
          {PANELS.map((e, i) => (
            <button type="button" key={e.code} className="edx-capa__th" onClick={() => pick(i)} aria-label={`Ir para a edição ${e.code}: ${e.theme}`}>
              {e.scene[0] ? <img src={e.scene[0]} alt="" loading="lazy" decoding="async" /> : <span className="edx-capa__fb">{e.code}</span>}
              <span className="edx-capa__y" aria-hidden="true">{e.special ? 'Lovers' : e.code}</span>
            </button>
          ))}
        </div>
      </PageHero>

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
              <div className="edx-track" style={{ width: `${TOTAL * 100}vw`, transform: `translateX(${-active * 100}vw)` }}>
                {PANELS.map((e, i) => (
                  <EditionScene e={e} key={e.code} live={Math.abs(i - active) <= 1} near={Math.abs(i - active) <= 2} offset={(i - active) * 12} go={go} />
                ))}
              </div>
            </div>

            {active > 0 && (
              <button type="button" className="edx-arrow edx-arrow--prev" onClick={() => setActive((a) => Math.max(a - 1, 0))} aria-label="Edição anterior">
                <I.chevronLeft width={22} height={22} />
              </button>
            )}
            {active < TOTAL - 1 && (
              <button type="button" className="edx-arrow edx-arrow--next" onClick={() => setActive((a) => Math.min(a + 1, TOTAL - 1))} aria-label="Próxima edição">
                <I.chevronRight width={22} height={22} />
              </button>
            )}

            {/* leitura de progresso p/ leitores de tela; visualmente o numeral da
                cena + timeline + barra já contam a posição (sem chip flutuante
                brigando com o menu). */}
            <p className="edx-sr" aria-live="polite">{pad2(active + 1)} de {pad2(TOTAL)}: {PANELS[active].theme}</p>

            <div className="edx-progress" aria-hidden="true">
              <span style={{ transform: `scaleX(${(active + 1) / TOTAL})` }} />
            </div>
            <YearRail active={active} onPick={pick} />
          </div>
        </section>
      ) : (
        /* MOBILE / reduced-motion — capítulos verticais + timeline sticky */
        <section className="edx-stack" aria-label="Edições">
          <div className="edx-anos-wrap">
            <YearRail active={active} onPick={pick} />
          </div>
          <div className="edx-stack__list">
            {PANELS.map((e, i) => <EditionScene e={e} key={e.code} live={Math.abs(i - active) <= 1} go={go} />)}
          </div>
        </section>
      )}

      {/* EPÍLOGO — um convite, um intent (Curiosidades; o intent Awards vive no painel Lovers) */}
      <section className="edx-epilogo">
        <h2>O lado curioso desses 10 anos.</h2>
        <p>Recordes, marcas recorrentes e achados do acervo que não cabem numa linha do tempo.</p>
        <a href="/curiosidades" className="edx-cta" onClick={go('/curiosidades')}>Explorar as Curiosidades</a>
      </section>

      <style>{`
        .edx-page {
          --page-max: 1280px;
          --page-gutter: clamp(20px, 4vw, 56px);
          --header-safe-offset: clamp(120px, 14vh, 168px);
          --hero-top-clearance: clamp(32px, 4vw, 56px);
          --hero-content-start: calc(var(--header-safe-offset) + var(--hero-top-clearance));
          overflow-x: clip;
        }

        /* CAPA — filmstrip cronológica no hero */
        .edx-capa { display: flex; gap: 8px; margin-top: var(--sp-6); overflow-x: auto; padding-bottom: 6px; scrollbar-width: thin; }
        .edx-capa__th { position: relative; flex: 0 0 auto; width: 84px; aspect-ratio: 4/3; border: 2px solid transparent; border-radius: 10px; overflow: hidden; padding: 0; background: var(--cream-card); cursor: pointer; transition: transform var(--motion-fast) var(--ease-out-soft), border-color .16s; }
        .edx-capa__th:hover { transform: translateY(-3px); border-color: var(--ink); }
        .edx-capa__th:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
        .edx-capa__th img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .edx-capa__y { position: absolute; left: 0; right: 0; bottom: 0; padding: 8px 6px 4px; font-family: var(--font-sans); font-size: 10px; font-weight: 700; color: var(--cream); background: linear-gradient(0deg, rgba(43,24,16,.78), rgba(43,24,16,0)); text-align: left; }
        .edx-capa__fb { display: grid; place-items: center; width: 100%; height: 100%; font-family: var(--font-heading); font-weight: 800; font-size: 13px; color: var(--ink-soft); }

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
        .edx-scene__nofoto { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 10px; align-items: center; justify-content: center; color: var(--cream); opacity: .75; font-family: var(--font-sans); font-size: 14px; font-weight: 700; background: color-mix(in srgb, var(--tone) 18%, var(--ink)); }
        .edx-scene__scrim { position: absolute; inset: 0; background:
          linear-gradient(180deg, rgba(43,24,16,.5) 0%, rgba(43,24,16,0) 20%),
          linear-gradient(90deg, color-mix(in srgb, var(--ink) 82%, var(--tone)) 0%, color-mix(in srgb, var(--ink) 62%, transparent) 42%, rgba(43,24,16,.14) 68%, rgba(43,24,16,0) 100%),
          linear-gradient(0deg, rgba(43,24,16,.74) 0%, rgba(43,24,16,0) 26%); }
        .edx-scene__num { position: absolute; right: 1.5vw; top: 50%; transform: translateY(-56%); font-family: var(--font-display); font-weight: 900; font-size: 18vw; line-height: 1; letter-spacing: -.04em; color: var(--tone); opacity: .32; user-select: none; }

        /* conteúdo (desktop): head + body empilham na coluna esquerda */
        .edx-scene__head, .edx-scene__body { position: relative; z-index: 2; max-width: var(--page-max); margin: 0 auto; padding-inline: var(--page-gutter); width: 100%; }
        /* zona de segurança header↔conteúdo (§4.1): o menu global flutua sobre o stage */
        .edx-scene__head { padding-top: calc(var(--header-safe-offset) + 12px); }
        .edx-scene__head, .edx-scene__body { box-sizing: border-box; }
        .edx-scene__code { font-family: var(--font-heading); font-weight: 800; font-size: 15px; color: var(--tone); filter: brightness(1.4); }
        .edx-scene__title { font-family: var(--font-display); font-weight: 900; letter-spacing: -.03em; font-size: clamp(40px, 4.8vw, 78px); line-height: .98; color: var(--cream); margin: 8px 0 0; max-width: 12ch; text-wrap: balance; }
        .edx-scene__meta { margin: 12px 0 0; font-family: var(--font-sans); font-size: 14px; font-weight: 600; color: color-mix(in srgb, var(--cream) 85%, transparent); }
        .edx-scene__body { padding-top: clamp(14px, 2vh, 24px); padding-bottom: 150px; max-width: none; }
        .edx-scene__body > * { max-width: min(46%, 560px); }
        .edx-scene__body { margin: 0 auto; max-width: var(--page-max); }
        .edx-scene__lead { margin: 12px 0 0; font-size: clamp(14px, .95vw, 15.5px); line-height: 1.55; color: color-mix(in srgb, var(--cream) 78%, transparent); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

        /* LOGO SLOT — sobre foto escura */
        /* fundo chocolate no slot: as logos do acervo são brancas (invisíveis em claro) */
        .edx-logo { position: relative; display: inline-grid; place-items: center; width: clamp(84px, 7vw, 108px); aspect-ratio: 1; border-radius: 14px; overflow: hidden; background: color-mix(in srgb, var(--ink) 42%, transparent); border: 1px solid color-mix(in srgb, var(--cream) 22%, transparent); }
        .edx-logo--real img { position: absolute; inset: 8%; width: 84%; height: 84%; object-fit: contain; }
        .edx-logo--real .edx-logo__fb { display: none; }
        .edx-logo--real.is-fallback img { display: none; }
        .edx-logo--real.is-fallback .edx-logo__fb { display: flex; }
        .edx-logo.is-fallback, .edx-logo--real.is-fallback { width: auto; max-width: 100%; aspect-ratio: auto; background: color-mix(in srgb, var(--ink) 32%, transparent); border: 1px solid color-mix(in srgb, var(--cream) 32%, transparent); padding: 9px 14px; place-items: center start; }
        .edx-logo__fb { display: flex; flex-direction: column; gap: 2px; text-align: left; }
        .edx-logo__fb-tag { font-family: var(--font-sans); font-size: 9.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: color-mix(in srgb, var(--cream) 72%, transparent); }
        .edx-logo__fb-name { font-family: var(--font-heading); font-weight: 800; font-size: 14px; color: var(--cream); line-height: 1.15; }

        /* PÓDIO */
        .edx-podio { margin-top: clamp(16px, 2.4vh, 26px); padding-top: clamp(12px, 1.8vh, 18px); border-top: 1px solid color-mix(in srgb, var(--cream) 22%, transparent); }
        .edx-podio__t { font-family: var(--font-heading); font-weight: 800; font-size: 13.5px; color: var(--cream); margin: 0 0 10px; }
        .edx-podio__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
        .edx-podio__row { display: flex; align-items: center; gap: 12px; }
        .edx-podio__medal { flex: 0 0 auto; width: 32px; height: 32px; border-radius: 999px; background: var(--yellow); color: var(--ink); display: grid; place-items: center; font-family: var(--font-display); font-weight: 900; font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,.3); }
        .edx-podio__logos { display: flex; gap: 6px; }
        .edx-podio__logo { position: relative; width: 38px; height: 38px; border-radius: 10px; background: var(--choco, #3A2114); border: 1px solid color-mix(in srgb, var(--cream) 24%, transparent); display: grid; place-items: center; overflow: hidden; }
        .edx-podio__logo img { width: 84%; height: 84%; object-fit: contain; }
        .edx-podio__ini { display: grid; place-items: center; width: 100%; height: 100%; font-family: var(--font-heading); font-weight: 800; font-size: 12px; color: var(--cream); }
        .edx-podio__what { min-width: 0; }
        .edx-podio__cat { display: block; font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; letter-spacing: .02em; color: color-mix(in srgb, var(--cream) 66%, transparent); }
        .edx-podio__win { font-family: var(--font-heading); font-weight: 800; font-size: 16px; color: var(--cream); }
        .edx-podio__link { display: inline-block; margin-top: 12px; font-family: var(--font-sans); font-size: 13px; font-weight: 700; color: var(--cream); text-decoration: underline; text-underline-offset: 3px; opacity: .88; }
        .edx-podio__link:hover { opacity: 1; }
        .edx-podio__link:focus-visible, .edx-strip__th:focus-visible { outline: 2px solid var(--cream); outline-offset: 2px; }

        /* BADGE (só sem pódio) */
        .edx-badge { display: inline-flex; margin-top: 14px; align-items: center; font-family: var(--font-sans); font-size: 12px; font-weight: 700; padding: 6px 13px; border-radius: 999px; background: color-mix(in srgb, var(--cream) 16%, transparent); color: color-mix(in srgb, var(--cream) 85%, transparent); }

        /* CTA (Lovers + epílogo) */
        .edx-cta { display: inline-block; margin-top: 16px; padding: 13px 22px; border-radius: 999px; background: var(--page-accent, var(--cyan)); color: var(--ink); font-family: var(--font-sans); font-weight: 700; font-size: 14px; text-decoration: none; white-space: nowrap; transition: transform var(--motion-fast) var(--ease-out-soft), background var(--motion-fast) var(--ease-out-soft); }
        .edx-cta:hover { transform: translateY(-2px); background: var(--cyan-deep); color: var(--cream); }
        .edx-cta:focus-visible { outline: 2px solid var(--cream); outline-offset: 3px; }

        /* FILMSTRIP */
        .edx-strip { position: absolute; left: 0; right: 0; bottom: 56px; z-index: 3; display: flex; gap: 8px; max-width: var(--page-max); margin: 0 auto; padding-inline: var(--page-gutter); overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
        .edx-strip::-webkit-scrollbar { display: none; }
        .edx-strip__th { flex: 0 0 auto; width: 88px; aspect-ratio: 4/3; border-radius: 8px; overflow: hidden; padding: 0; border: 2px solid transparent; background: var(--ink); cursor: pointer; opacity: .68; scroll-snap-align: start; transition: opacity .18s, border-color .18s; }
        .edx-strip__th:hover { opacity: .92; }
        .edx-strip__th.is-on { opacity: 1; border-color: var(--tone); }
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

        .edx-progress { height: 3px; background: color-mix(in srgb, var(--cream) 20%, transparent); }
        .edx-progress span { display: block; height: 100%; width: 100%; background: var(--page-accent, var(--cyan)); transform-origin: left; transition: transform .2s ease; }

        /* TIMELINE DE ANOS */
        .edx-anos { padding: var(--sp-2) var(--page-gutter) var(--sp-3); background: color-mix(in srgb, var(--ink) 94%, var(--cream)); }
        .edx-anos__list { list-style: none; margin: 0 auto; padding: 0; max-width: var(--page-max); display: flex; gap: 4px; overflow-x: auto; scrollbar-width: thin; }
        .edx-anos__item { flex: 0 0 auto; font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; letter-spacing: .02em; color: color-mix(in srgb, var(--cream) 62%, transparent); background: transparent; border: 1px solid color-mix(in srgb, var(--cream) 18%, transparent); border-radius: 999px; padding: 5px 11px; cursor: pointer; white-space: nowrap; transition: color .16s, border-color .16s, background .16s; }
        .edx-anos__item:hover { color: var(--cream); border-color: color-mix(in srgb, var(--cream) 45%, transparent); }
        .edx-anos__item.is-active { background: var(--page-accent, var(--cyan)); border-color: var(--page-accent, var(--cyan)); color: var(--ink); }
        .edx-anos__item:focus-visible { outline: 2px solid var(--cream); outline-offset: 2px; }

        /* EPÍLOGO */
        .edx-epilogo { background: var(--cream); text-align: left; max-width: var(--page-max); margin: 0 auto; padding: var(--section-y, clamp(72px, 10vw, 140px)) var(--page-gutter); }
        .edx-epilogo h2 { font-family: var(--font-display); font-weight: 900; letter-spacing: -.03em; font-size: clamp(30px, 3.4vw, 52px); line-height: 1.02; color: var(--ink); margin: 0; max-width: 18ch; text-wrap: balance; }
        .edx-epilogo p { margin: 14px 0 0; max-width: 52ch; color: var(--ink-soft); font-size: 15.5px; line-height: 1.55; }
        .edx-epilogo .edx-cta { background: var(--yellow); }
        .edx-epilogo .edx-cta:hover { background: var(--yellow-deep); color: var(--ink); }

        /* ===================== MOBILE / reduced-motion (stack) ===================== */
        .edx-stack { background: var(--cream); }
        .edx-anos-wrap { position: sticky; top: 0; z-index: 5; }
        .edx-anos-wrap .edx-anos { padding-top: clamp(70px, 12vh, 96px); background: color-mix(in srgb, var(--cream) 92%, transparent); border-bottom: 1px solid var(--paper-line); }
        .edx-anos-wrap .edx-anos__item { color: var(--ink-soft); border-color: var(--paper-line); background: var(--cream-card); }
        .edx-anos-wrap .edx-anos__item.is-active { background: var(--page-accent, var(--cyan)); border-color: var(--page-accent, var(--cyan)); color: var(--ink); }

        .edx-stack .edx-scene { min-width: 0; height: auto; background: var(--cream); border-bottom: 1px solid var(--paper-line); }
        .edx-stack .edx-scene__media { position: relative; inset: auto; aspect-ratio: 4 / 5; max-height: 72vh; }
        .edx-stack .edx-scene__media img { transform: none; }
        .edx-stack .edx-scene__nofoto { color: var(--cream); }
        .edx-stack .edx-scene__scrim { background: linear-gradient(0deg, color-mix(in srgb, var(--ink) 80%, var(--tone)) 0%, rgba(43,24,16,.16) 42%, rgba(43,24,16,0) 64%); }
        .edx-stack .edx-scene__num { top: 10px; right: 12px; transform: none; font-size: 84px; opacity: .5; }
        /* cabeçalho puxado por cima da base da foto */
        .edx-stack .edx-scene__head { margin-top: -118px; padding-top: 0; padding-bottom: 14px; }
        .edx-stack .edx-scene__title { font-size: clamp(30px, 9vw, 42px); max-width: none; }
        .edx-stack .edx-scene__meta { color: color-mix(in srgb, var(--cream) 88%, transparent); font-size: 12.5px; margin-top: 6px; }
        /* corpo volta pro papel creme */
        .edx-stack .edx-scene__body { padding-top: 18px; padding-bottom: 8px; }
        .edx-stack .edx-scene__body > * { max-width: none; }
        .edx-stack .edx-scene__lead { color: var(--ink-soft); -webkit-line-clamp: 8; }
        .edx-stack .edx-logo.is-fallback, .edx-stack .edx-logo--real.is-fallback { background: color-mix(in srgb, var(--tone) 7%, var(--cream-card)); border-color: color-mix(in srgb, var(--tone) 38%, var(--paper-line)); }
        .edx-stack .edx-logo__fb-tag { color: var(--ink-soft); }
        .edx-stack .edx-logo__fb-name { color: var(--ink); }
        .edx-stack .edx-podio { border-top-color: var(--paper-line); }
        .edx-stack .edx-podio__t, .edx-stack .edx-podio__win { color: var(--ink); }
        .edx-stack .edx-podio__cat { color: var(--ink-soft); }
        .edx-stack .edx-podio__logo { border: 1px solid var(--paper-line); }
        .edx-stack .edx-podio__link { color: var(--ink); }
        .edx-stack .edx-badge { background: rgba(43,24,16,.07); color: var(--ink-soft); }
        .edx-stack .edx-strip { position: static; padding-block: 14px 22px; }
        .edx-stack .edx-strip__th { background: var(--cream-card); }

        /* Lovers tem CTA além do pódio: reserva extra pro strip não colidir */
        .edx-scene--special .edx-scene__body { padding-bottom: 176px; }
        .edx-scene--special .edx-podio__list { gap: 6px; }
        .edx-scene--special .edx-cta { margin-top: 12px; }

        /* laptops baixos / janelas achatadas: comprime a cena p/ nada colidir */
        @media (min-width: 980px) and (max-height: 768px) {
          .edx-scene__head { padding-top: calc(var(--header-safe-offset) - 12px); }
          .edx-scene__title { font-size: clamp(30px, 4.6vh, 44px); }
          .edx-scene__lead { -webkit-line-clamp: 2; margin-top: 8px; }
          .edx-logo { width: 64px; }
          .edx-logo.is-fallback, .edx-logo--real.is-fallback { padding: 6px 10px; }
          .edx-podio { margin-top: 12px; padding-top: 10px; }
          .edx-podio__list { gap: 6px; }
          .edx-scene__body { padding-bottom: 108px; }
          .edx-scene--special .edx-scene__body { padding-bottom: 118px; }
          .edx-scene--special .edx-podio__list { gap: 3px; }
          .edx-scene--special .edx-podio__logo, .edx-scene--special .edx-podio__medal { width: 26px; height: 26px; }
          .edx-strip { bottom: 34px; }
          .edx-strip__th { width: 62px; }
          .edx-scene__num { font-size: 15vw; }
        }
        @media (max-width: 540px) {
          .edx-capa__th { width: 68px; }
          .edx-stack .edx-scene__head { margin-top: -104px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .edx-progress span, .edx-anos__item, .edx-capa__th, .edx-scene__media img { transition: none; }
          .edx-scene__media img { transform: none; }
        }
      `}</style>
    </div>
  )
}
