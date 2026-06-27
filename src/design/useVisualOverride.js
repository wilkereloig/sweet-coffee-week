// Store + hook do Visual Refinement Mode.
//
// Camadas de dados:
//  - visualOverrides.json  -> verdade commitada (importada estática; aplicada em prod também).
//  - working (localStorage) -> edições ainda não salvas no código.
//  - cleared (Set)          -> ids resetados nesta sessão (ignoram o arquivo até salvar).
//
// effectiveOverride(id, bp) = cleared? {} : { ...file[id][bp], ...working[id][bp] }
//
// Estado de edição (active/selected/editBp) também vive aqui, com pub/sub.

import React from 'react'
import fileOverrides from './visualOverrides.json'
import { findVisualElement, breakpointForWidth } from './visualEditableRegistry'

const LS_KEY = 'swc_visual_overrides_working_v1'

function readLS() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

let working = readLS()
const cleared = new Set()
let active = false
let selectedId = null
let editBp = detectBreakpoint()

const listeners = new Set()
function emit() { listeners.forEach((fn) => fn()) }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) }

function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(working)) } catch { /* modo privado */ }
}

export function detectBreakpoint() {
  try { return breakpointForWidth(window.innerWidth) } catch { return 'desktop' }
}

// --- Leitura -------------------------------------------------------------
export function effectiveOverride(id, bp) {
  if (cleared.has(id)) return { ...(working[id] && working[id][bp]) }
  const f = (fileOverrides[id] && fileOverrides[id][bp]) || {}
  const w = (working[id] && working[id][bp]) || {}
  return { ...f, ...w }
}

// --- Escrita -------------------------------------------------------------
export function setOverride(id, bp, patch) {
  cleared.delete(id)
  const base = effectiveOverride(id, bp)
  const merged = { ...base, ...patch }
  working = { ...working, [id]: { ...(working[id] || {}), [bp]: merged } }
  persist()
  emit()
}

export function nudge(id, bp, dx, dy) {
  const cur = effectiveOverride(id, bp)
  setOverride(id, bp, { x: (cur.x || 0) + dx, y: (cur.y || 0) + dy })
}

export function resetElement(id) {
  const next = { ...working }
  delete next[id]
  working = next
  cleared.add(id)
  persist()
  emit()
}

export function resetPage(page) {
  for (const el of Object.keys(fileOverrides)) cleared.add(el)
  working = {}
  persist()
  emit()
}

// --- Modo de edição ------------------------------------------------------
export function isActive() { return active }
export function setActive(v) {
  const nv = !!v
  if (nv === active) return
  active = nv
  if (!nv) selectedId = null
  else editBp = detectBreakpoint()
  emit()
}
export function toggleActive() { setActive(!active) }

export function getSelected() { return selectedId }
export function selectElement(id) { if (selectedId !== id) { selectedId = id; emit() } }
export function clearSelection() { if (selectedId !== null) { selectedId = null; emit() } }

export function getEditBreakpoint() { return editBp }
export function setEditBreakpoint(bp) { if (bp !== editBp) { editBp = bp; emit() } }

// --- Aplicação de estilo -------------------------------------------------
function styleFor(id, ov) {
  const s = {}
  const type = findVisualElement(id)?.type
  const x = ov.x || 0, y = ov.y || 0, scale = ov.scale ?? 1, rot = ov.rotate || 0
  if (x || y || scale !== 1 || rot) {
    s['--vo-x'] = `${x}px`; s['--vo-y'] = `${y}px`; s['--vo-scale'] = `${scale}`; s['--vo-rotate'] = `${rot}deg`
    s.transform = 'translate(var(--vo-x,0px), var(--vo-y,0px)) scale(var(--vo-scale,1)) rotate(var(--vo-rotate,0deg))'
  }
  if (ov.maxWidth != null) s.maxWidth = `${ov.maxWidth}px`
  if (ov.marginTop) s.marginTop = `${ov.marginTop}px`
  if (ov.marginBottom) s.marginBottom = `${ov.marginBottom}px`
  if (ov.paddingTop) s.paddingTop = `${ov.paddingTop}px`
  if (ov.paddingBottom) s.paddingBottom = `${ov.paddingBottom}px`
  if (ov.opacity != null && ov.opacity !== 1) s.opacity = ov.opacity
  if (ov.zIndex) {
    s.zIndex = ov.zIndex
    if (type === 'block' || type === 'text') s.position = 'relative'
  }
  if (ov.align) {
    if (type === 'text') s.textAlign = ov.align
    else if (ov.align === 'center') { s.marginLeft = 'auto'; s.marginRight = 'auto' }
    else if (ov.align === 'left') s.marginRight = 'auto'
    else if (ov.align === 'right') s.marginLeft = 'auto'
  }
  return s
}

// Hook aplicado a cada elemento editável: retorna props spreadáveis (data-id + style).
// O estilo segue o breakpoint REAL da viewport (o que está na tela).
export function useVisualOverride(id) {
  const [, force] = React.useReducer((n) => n + 1, 0)
  const [bp, setBp] = React.useState(detectBreakpoint)

  React.useEffect(() => subscribe(force), [])
  React.useEffect(() => {
    const on = () => setBp(detectBreakpoint())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  const ov = effectiveOverride(id, bp)
  return { 'data-editable-id': id, style: styleFor(id, ov) }
}

// --- Serialização / salvamento ------------------------------------------
// Monta o objeto final (file + working, menos cleared), só com valores presentes.
function buildOutput() {
  const out = {}
  const ids = new Set([...Object.keys(fileOverrides), ...Object.keys(working)])
  for (const id of ids) {
    if (cleared.has(id)) continue
    const bps = {}
    const allBp = new Set([
      ...Object.keys(fileOverrides[id] || {}),
      ...Object.keys(working[id] || {}),
    ])
    for (const bp of allBp) {
      const merged = effectiveOverride(id, bp)
      if (merged && Object.keys(merged).length) bps[bp] = merged
    }
    if (Object.keys(bps).length) out[id] = bps
  }
  return out
}

export function toJSON() {
  return JSON.stringify(buildOutput(), null, 2)
}

function declsFor(id, ov) {
  const type = findVisualElement(id)?.type
  const d = []
  const x = ov.x || 0, y = ov.y || 0, scale = ov.scale ?? 1, rot = ov.rotate || 0
  if (x || y || scale !== 1 || rot) d.push(`  transform: translate(${x}px, ${y}px) scale(${scale}) rotate(${rot}deg);`)
  if (ov.maxWidth != null) d.push(`  max-width: ${ov.maxWidth}px;`)
  if (ov.marginTop) d.push(`  margin-top: ${ov.marginTop}px;`)
  if (ov.marginBottom) d.push(`  margin-bottom: ${ov.marginBottom}px;`)
  if (ov.paddingTop) d.push(`  padding-top: ${ov.paddingTop}px;`)
  if (ov.paddingBottom) d.push(`  padding-bottom: ${ov.paddingBottom}px;`)
  if (ov.opacity != null && ov.opacity !== 1) d.push(`  opacity: ${ov.opacity};`)
  if (ov.zIndex) d.push(`  z-index: ${ov.zIndex};`)
  if (ov.align && type === 'text') d.push(`  text-align: ${ov.align};`)
  return d
}

const BP_MEDIA = { tablet: '@media (max-width: 1024px)', mobile: '@media (max-width: 640px)' }

export function toCSS() {
  const data = buildOutput()
  const blocks = []
  for (const id of Object.keys(data)) {
    for (const bp of Object.keys(data[id])) {
      const decls = declsFor(id, data[id][bp])
      if (!decls.length) continue
      const rule = `[data-editable-id="${id}"] {\n${decls.join('\n')}\n}`
      blocks.push(bp === 'desktop' ? rule : `${BP_MEDIA[bp]} {\n${rule.replace(/^/gm, '  ')}\n}`)
    }
  }
  return blocks.join('\n\n') || '/* nenhum ajuste */'
}

// POST para o endpoint dev do Vite, que grava src/design/visualOverrides.json.
export async function saveToCode() {
  const data = buildOutput()
  const res = await fetch('/__visual-overrides', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Falha ao salvar (${res.status})`)
  return data
}
