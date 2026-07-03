// Geometria, snap e alinhamento do Visual Refinement Mode.
// Funções puras + leitura de DOM (coordenadas de viewport via getBoundingClientRect).

export const SNAP_TOL = 6 // px

export function getEditableNodes() {
  const out = []
  document.querySelectorAll('[data-editable-id]').forEach((el) => {
    out.push({ id: el.getAttribute('data-editable-id'), el })
  })
  return out
}

export function features(rect) {
  return {
    left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
    cx: (rect.left + rect.right) / 2, cy: (rect.top + rect.bottom) / 2,
    width: rect.width, height: rect.height,
  }
}

export function shiftFeatures(f, dx, dy) {
  return {
    left: f.left + dx, right: f.right + dx, top: f.top + dy, bottom: f.bottom + dy,
    cx: f.cx + dx, cy: f.cy + dy, width: f.width, height: f.height,
  }
}

function pickAxis(pred, cands, tol) {
  let best = null
  for (const c of cands) {
    const d = c.pos - pred[c.feat]
    if (Math.abs(d) <= tol && (!best || Math.abs(d) < Math.abs(best.delta))) best = { delta: d, pos: c.pos }
  }
  return best
}

// Snap + guias para a posição prevista. Retorna { dx, dy, guides:[{axis,pos}] }.
export function computeSnap(pred, others, container, viewport, tol = SNAP_TOL) {
  const xCands = [{ feat: 'cx', pos: viewport.w / 2 }]
  const yCands = [{ feat: 'cy', pos: viewport.h / 2 }]
  if (container) {
    xCands.push({ feat: 'cx', pos: container.cx }, { feat: 'left', pos: container.left }, { feat: 'right', pos: container.right })
  }
  for (const o of others) {
    xCands.push({ feat: 'cx', pos: o.cx }, { feat: 'left', pos: o.left }, { feat: 'right', pos: o.right })
    yCands.push({ feat: 'cy', pos: o.cy }, { feat: 'top', pos: o.top }, { feat: 'bottom', pos: o.bottom })
  }
  const bx = pickAxis(pred, xCands, tol)
  const by = pickAxis(pred, yCands, tol)
  const guides = []
  if (bx) guides.push({ axis: 'x', pos: bx.pos })
  if (by) guides.push({ axis: 'y', pos: by.pos })
  return { dx: bx ? bx.delta : 0, dy: by ? by.delta : 0, guides }
}

export function getContainerFeatures() {
  const el = document.querySelector('.hm') || document.querySelector('main')
  return el ? features(el.getBoundingClientRect()) : null
}

// Delta (dx/dy) para alinhar um elemento ao container, por tipo de alinhamento.
// kind: 'left'|'hcenter'|'right'|'top'|'middle'|'bottom'.
export function alignDelta(kind, elRect, container) {
  if (!container) return { dx: 0, dy: 0 }
  switch (kind) {
    case 'left': return { dx: container.left - elRect.left, dy: 0 }
    case 'hcenter': return { dx: container.cx - elRect.cx, dy: 0 }
    case 'right': return { dx: container.right - elRect.right, dy: 0 }
    case 'top': return { dx: 0, dy: container.top - elRect.top }
    case 'middle': return { dx: 0, dy: container.cy - elRect.cy }
    case 'bottom': return { dx: 0, dy: container.bottom - elRect.bottom }
    default: return { dx: 0, dy: 0 }
  }
}

export function isTypingTarget(el) {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}
