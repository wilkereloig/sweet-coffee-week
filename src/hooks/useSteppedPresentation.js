import React from 'react'

// Motor de passos discretos p/ apresentações horizontais tipo Edições — substitui
// scroll proporcional por avanço de 1 índice por gesto (wheel/teclado). Estado do
// índice ativo continua fora (controlado), o hook só cuida da mecânica:
//   - engajamento: IntersectionObserver no stageRef (a apresentação "prende" o wheel
//     só quando ocupa a maior parte do viewport);
//   - wheel: sempre intercepta (preventDefault) enquanto engajado e não estiver na
//     borda na direção do gesto — mesmo durante o cooldown, pra não vazar scroll pra
//     página no meio de uma rolada contínua de trackpad. Só a CHAMADA de setActive é
//     limitada a 1 por janela de cooldown;
//   - borda (primeiro/último painel) na direção do gesto: não intercepta, scroll
//     nativo segue pro hero/rodapé;
//   - teclado (←/→/Home/End): mesma trava de borda, sem cooldown (repetição de tecla
//     já é limitada pelo SO).
const COOLDOWN_MS = 560 // == --motion-slow (layout-tokens.css), duração da transition do track

export function useSteppedPresentation({ enabled, stageRef, total, active, setActive }) {
  const activeRef = React.useRef(active)
  activeRef.current = active
  const engagedRef = React.useRef(false)
  const lockedRef = React.useRef(false)

  const step = React.useCallback((delta) => {
    const next = activeRef.current + delta
    if (next < 0 || next > total - 1) return
    setActive(next)
  }, [total, setActive])

  // Engajamento — stage ocupando a maior parte do viewport.
  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    const node = stageRef.current
    if (!node) return
    const io = new IntersectionObserver(
      ([entry]) => { engagedRef.current = entry.isIntersecting },
      { threshold: 0.6 }
    )
    io.observe(node)
    return () => { io.disconnect(); engagedRef.current = false }
  }, [enabled, stageRef])

  // Wheel + teclado.
  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    // Deixa o wheel passar quando o ponteiro está sobre um painel rolável interno
    // (rail de participantes, "história completa", lista) que ainda pode rolar na
    // direção do gesto — só prende o passo quando esse painel chega na borda.
    const canScrollWithin = (node, delta) => {
      const stop = stageRef.current
      let el = node
      while (el && el !== stop && el !== document.body) {
        if (el.scrollHeight > el.clientHeight + 1) {
          const oy = window.getComputedStyle(el).overflowY
          if (oy === 'auto' || oy === 'scroll') {
            const atTop = el.scrollTop <= 0
            const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
            if ((delta > 0 && !atBottom) || (delta < 0 && !atTop)) return true
          }
        }
        el = el.parentElement
      }
      return false
    }

    const onWheel = (e) => {
      if (!engagedRef.current) return
      if (e.ctrlKey || e.metaKey) return // pinch-to-zoom / Ctrl+scroll: deixa o navegador dar zoom
      const delta = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0
      if (!delta) return
      if (canScrollWithin(e.target, delta)) return // painel interno ainda rola: não prende
      const atBoundary = (delta > 0 && activeRef.current >= total - 1) ||
                          (delta < 0 && activeRef.current <= 0)
      if (atBoundary) return // solta o scroll nativo (hero/rodapé)
      e.preventDefault()
      if (lockedRef.current) return
      lockedRef.current = true
      step(delta)
      setTimeout(() => { lockedRef.current = false }, COOLDOWN_MS)
    }

    const onKey = (e) => {
      if (!engagedRef.current) return
      // não sequestrar teclas de navegação quando o foco está num campo editável
      // (ex.: busca de participantes) — senão a seta move a cena em vez do cursor.
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
      else if (e.key === 'End') { e.preventDefault(); setActive(total - 1) }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [enabled, total, step, setActive])
}
