// Overlay interativo do Visual Refinement Mode.
// Montado só em dev quando o modo está ativo (ver VisualRefinementProvider).
// Outlines dos editáveis, seleção sem navegar, drag por pointer (só x/y),
// guias + snap (tol 6px, Alt desativa) e movimento por teclado.

import React from 'react'
import {
  subscribe, effectiveOverride, setOverride, resetElement,
  selectElement, clearSelection, getSelected, nudge,
  getEditBreakpoint,
} from './useVisualOverride'
import { findVisualElement, canDrag } from './visualEditableRegistry'
import {
  getEditableNodes, features, shiftFeatures, computeSnap,
  getContainerFeatures, isTypingTarget, SNAP_TOL,
} from './visualRefinementUtils'

export function VisualRefinementOverlay() {
  const [, force] = React.useReducer((n) => n + 1, 0)
  const [guides, setGuides] = React.useState([])
  const drag = React.useRef(null)

  React.useEffect(() => {
    const tick = () => force()
    const unsub = subscribe(tick)
    window.addEventListener('scroll', tick, true)
    window.addEventListener('resize', tick)
    return () => {
      unsub()
      window.removeEventListener('scroll', tick, true)
      window.removeEventListener('resize', tick)
    }
  }, [])

  // Pointer: seleção + drag (capture, antecede links).
  React.useEffect(() => {
    const onDown = (e) => {
      const node = e.target.closest('[data-editable-id]')
      if (!node) return
      const id = node.getAttribute('data-editable-id')
      e.preventDefault()
      e.stopPropagation()
      selectElement(id)

      const reg = findVisualElement(id)
      if (!canDrag(reg)) return // só elementos com x/y arrastam

      const bp = getEditBreakpoint()
      const cur = effectiveOverride(id, bp)
      drag.current = {
        id, bp,
        startAdjX: cur.x || 0,
        startAdjY: cur.y || 0,
        startRect: features(node.getBoundingClientRect()),
        others: getEditableNodes().filter((n) => n.id !== id).map((n) => features(n.el.getBoundingClientRect())),
        container: getContainerFeatures(),
        startX: e.clientX,
        startY: e.clientY,
      }
      document.body.style.userSelect = 'none'
    }

    const onMove = (e) => {
      const d = drag.current
      if (!d) return
      e.preventDefault()
      let candX = d.startAdjX + (e.clientX - d.startX)
      let candY = d.startAdjY + (e.clientY - d.startY)
      const pred = shiftFeatures(d.startRect, candX - d.startAdjX, candY - d.startAdjY)
      if (e.altKey) {
        setGuides([])
      } else {
        const vp = { w: window.innerWidth, h: window.innerHeight }
        const { dx, dy, guides: gs } = computeSnap(pred, d.others, d.container, vp, SNAP_TOL)
        candX += dx; candY += dy
        setGuides(gs)
      }
      setOverride(d.id, d.bp, { x: Math.round(candX), y: Math.round(candY) })
    }

    const onUp = () => {
      if (!drag.current) return
      drag.current = null
      setGuides([])
      document.body.style.userSelect = ''
    }

    const onClick = (e) => {
      if (e.target.closest('[data-editable-id]')) { e.preventDefault(); e.stopPropagation() }
    }

    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointermove', onMove, { capture: true, passive: false })
    document.addEventListener('pointerup', onUp, true)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerup', onUp, true)
      document.removeEventListener('click', onClick, true)
      document.body.style.userSelect = ''
    }
  }, [])

  // Teclado: setas movem (só x/y), R reseta, Esc desseleciona.
  React.useEffect(() => {
    const onKey = (e) => {
      if (isTypingTarget(e.target)) return
      const id = getSelected()
      if (e.key === 'Escape') { clearSelection(); return }
      if (!id) return
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); resetElement(id); return }
      if (!canDrag(findVisualElement(id))) return
      const step = e.shiftKey ? 10 : e.altKey ? 0.5 : 1
      let dx = 0, dy = 0
      if (e.key === 'ArrowLeft') dx = -step
      else if (e.key === 'ArrowRight') dx = step
      else if (e.key === 'ArrowUp') dy = -step
      else if (e.key === 'ArrowDown') dy = step
      else return
      e.preventDefault()
      nudge(id, getEditBreakpoint(), dx, dy)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const selectedId = getSelected()
  const nodes = getEditableNodes()

  return (
    <div style={S.layer} aria-hidden="true">
      {nodes.map(({ id, el }) => {
        const r = el.getBoundingClientRect()
        const sel = id === selectedId
        const draggable = canDrag(findVisualElement(id))
        return (
          <div key={id} style={{ ...S.outline, left: r.left, top: r.top, width: r.width, height: r.height, ...(sel ? S.outlineSel : null) }}>
            <span style={{ ...S.tag, ...(sel ? S.tagSel : null) }}>
              {id}{draggable ? ' ⠿' : ''}
            </span>
          </div>
        )
      })}
      {guides.map((g, i) =>
        g.axis === 'x'
          ? <div key={`x${i}`} style={{ ...S.guideV, left: g.pos }} />
          : <div key={`y${i}`} style={{ ...S.guideH, top: g.pos }} />,
      )}
    </div>
  )
}

const S = {
  layer: { position: 'fixed', inset: 0, zIndex: 99990, pointerEvents: 'none' },
  outline: { position: 'fixed', border: '1px dashed rgba(231,178,122,.7)', borderRadius: 4, boxSizing: 'border-box' },
  outlineSel: { border: '2px solid #2bc4e8', boxShadow: '0 0 0 3px rgba(43,196,232,.2)' },
  tag: { position: 'absolute', top: -16, left: 0, font: '10px/1 system-ui', color: '#e7b27a', background: 'rgba(28,20,16,.9)', padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap' },
  tagSel: { color: '#06222b', background: '#2bc4e8' },
  guideV: { position: 'fixed', top: 0, bottom: 0, width: 1, background: '#ff3da6', boxShadow: '0 0 4px rgba(255,61,166,.8)' },
  guideH: { position: 'fixed', left: 0, right: 0, height: 1, background: '#ff3da6', boxShadow: '0 0 4px rgba(255,61,166,.8)' },
}
