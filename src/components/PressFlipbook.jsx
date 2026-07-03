import React from 'react'
import { I } from './icons'

/*
 * PressFlipbook — spread editorial "capa de jornal" com virada de página 3D.
 *
 * - Cada página = 1 manchete (lead) + 0-2 notas (briefs). Navegação por
 *   seta/ponto/teclado (← →). Autoplay opcional, mas para de vez no primeiro
 *   clique manual (usuário assume o controle) — não retoma sozinho.
 * - Virada real em 3D (rotateY): a página-alvo já fica parada por baixo
 *   (camada "base", sem animação); a página anterior sobe por cima (camada
 *   "over") e gira/some, revelando a base. Evita ter que 3D-posicionar as 6
 *   páginas ao mesmo tempo.
 * - prefers-reduced-motion: sem rotação — crossfade simples e mais rápido.
 * - Pausa quando a aba está oculta (document.hidden), como o PhotoRotator.
 *
 * Doc: src/design/SITE_DIRECTION.md (§ Sweet na Mídia).
 */
const AUTOPLAY_MIN = 4000
const FLIP_MS = 600
const FLIP_MS_REDUCED = 220

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function PressFlipbook({ pages, interval = 7500, autoPlay = true }) {
  const list = Array.isArray(pages) ? pages.filter((p) => p && p.lead) : []
  const count = list.length

  const [page, setPage] = React.useState(0)
  const [outgoing, setOutgoing] = React.useState(null) // { index, dir, turning }
  const [paused, setPaused] = React.useState(!autoPlay)
  const liveRef = React.useRef(null)
  const timeoutRef = React.useRef(null)
  const rafRef = React.useRef(null)

  const clearTimers = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  const goTo = React.useCallback((rawNext, dir) => {
    if (count <= 1) return
    const nextIndex = ((rawNext % count) + count) % count
    if (nextIndex === page) return
    clearTimers()
    const reduced = prefersReducedMotion()
    setOutgoing({ index: page, dir, turning: false })
    rafRef.current = requestAnimationFrame(() => {
      setOutgoing((o) => (o ? { ...o, turning: true } : o))
    })
    timeoutRef.current = setTimeout(() => setOutgoing(null), reduced ? FLIP_MS_REDUCED : FLIP_MS)
    setPage(nextIndex)
  }, [count, page, clearTimers])

  const next = React.useCallback(() => goTo(page + 1, 'next'), [goTo, page])
  const prev = React.useCallback(() => goTo(page - 1, 'prev'), [goTo, page])
  const stop = () => setPaused(true)

  React.useEffect(() => () => clearTimers(), [clearTimers])

  React.useEffect(() => {
    if (paused || count <= 1 || prefersReducedMotion()) return
    const delay = Math.max(AUTOPLAY_MIN, interval)
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      goTo(page + 1, 'next')
    }, delay)
    return () => clearInterval(id)
  }, [paused, count, interval, page, goTo])

  React.useEffect(() => {
    if (liveRef.current) liveRef.current.textContent = `Página ${page + 1} de ${count}`
  }, [page, count])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { stop(); next() }
    else if (e.key === 'ArrowLeft') { stop(); prev() }
  }

  if (!count) return null

  const renderPage = (p) => (
    <>
      <span className="press-flipbook__kicker">
        {p.lead.outlet}{p.lead.date ? ` · ${p.lead.date}` : ''}
      </span>
      <h4 className="press-flipbook__headline">{p.lead.title}</h4>
      {p.lead.description && <p className="press-flipbook__body">{p.lead.description}</p>}
      <a
        className="press-flipbook__link"
        href={p.lead.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${p.lead.cta || 'Ler matéria'} na ${p.lead.outlet} sobre o Sweet & Coffee Week`}
      >
        {p.lead.cta || 'Ler matéria'} <I.arrow />
      </a>
      {p.briefs && p.briefs.length > 0 && (
        <div className="press-flipbook__briefs">
          {p.briefs.map((b) => (
            <a
              key={b.href}
              className="press-flipbook__brief"
              href={b.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${b.cta || 'Ler matéria'} na ${b.outlet} sobre o Sweet & Coffee Week`}
            >
              <span className="press-flipbook__brief-outlet">
                {b.outlet}{b.date ? ` · ${b.date}` : ''}
              </span>
              <span className="press-flipbook__brief-title">{b.title}</span>
            </a>
          ))}
        </div>
      )}
    </>
  )

  return (
    <div
      className="press-flipbook"
      role="group"
      aria-roledescription="carrossel"
      aria-label="Matérias sobre o Sweet & Coffee Week na imprensa"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="press-flipbook__stage">
        <article className="press-flipbook__page press-flipbook__page--base">
          {renderPage(list[page])}
        </article>
        {outgoing && (
          <article
            className={
              'press-flipbook__page press-flipbook__page--over ' +
              `press-flipbook__page--out-${outgoing.dir}` +
              (outgoing.turning ? ' is-turning' : '')
            }
          >
            {renderPage(list[outgoing.index])}
          </article>
        )}
      </div>

      <div className="press-flipbook__nav">
        <button type="button" className="press-flipbook__navbtn" onClick={() => { stop(); prev() }} aria-label="Página anterior"><I.chevronLeft /></button>
        <div className="press-flipbook__dots">
          {list.map((p, i) => (
            <button
              key={p.lead.href}
              type="button"
              className={'press-flipbook__dot' + (i === page ? ' is-active' : '')}
              aria-label={`Ir para página ${i + 1}`}
              aria-current={i === page ? 'true' : undefined}
              onClick={() => { stop(); goTo(i, i > page ? 'next' : 'prev') }}
            />
          ))}
        </div>
        <button type="button" className="press-flipbook__navbtn" onClick={() => { stop(); next() }} aria-label="Próxima página"><I.chevronRight /></button>
        <span className="press-flipbook__count" aria-hidden="true">Página {page + 1} de {count}</span>
      </div>
      <span className="press-flipbook__sr" role="status" aria-live="polite" ref={liveRef} />
    </div>
  )
}
