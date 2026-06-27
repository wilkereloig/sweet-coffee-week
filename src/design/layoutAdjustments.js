// Store de ajustes do Design Mode.
// - Valores base (defaults) por elemento.
// - Persistência TEMPORÁRIA em localStorage (nunca grava no código).
// - Pub/sub para o painel e os elementos atualizarem ao vivo.
// - Serializadores para "Copiar CSS" e "Copiar JSON".
// Nada aqui altera produção: tudo vive no navegador até você revisar e aplicar à mão.

import { EDITABLE_ELEMENTS, findElement } from './editableElements'

const STORAGE_KEY = 'swc_design_adjustments_v1'

export const DEFAULTS = { x: 0, y: 0, scale: 1, rotate: 0, width: null, z: null }

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

let state = readStorage()
const listeners = new Set()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage indisponível (modo privado) — ajustes seguem só em memória */
  }
}

function emit() {
  listeners.forEach((fn) => fn(state))
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Retorna o ajuste de um id já mesclado com os defaults.
export function getAdjustment(id) {
  return { ...DEFAULTS, ...(state[id] || {}) }
}

export function getAll() {
  return state
}

// Aplica um patch parcial { x?, y?, scale?, ... } a um id.
export function setAdjustment(id, patch) {
  const next = { ...getAdjustment(id), ...patch }
  state = { ...state, [id]: next }
  persist()
  emit()
}

export function resetOne(id) {
  if (!(id in state)) return
  const next = { ...state }
  delete next[id]
  state = next
  persist()
  emit()
}

export function resetAll() {
  state = {}
  persist()
  emit()
}

export function isDefault(adj) {
  return (
    adj.x === 0 &&
    adj.y === 0 &&
    adj.scale === 1 &&
    adj.rotate === 0 &&
    (adj.width == null) &&
    (adj.z == null)
  )
}

// Constrói o objeto de estilo inline aplicado ao elemento.
// Só injeta transform/vars quando o ajuste é diferente do default,
// para não criar transform/stacking context em elementos não tocados.
export function styleFor(adj) {
  if (isDefault(adj)) return {}
  const style = {
    '--edit-x': `${adj.x}px`,
    '--edit-y': `${adj.y}px`,
    '--edit-scale': `${adj.scale}`,
    '--edit-rotate': `${adj.rotate}deg`,
    transform:
      'translate(var(--edit-x, 0px), var(--edit-y, 0px)) scale(var(--edit-scale, 1)) rotate(var(--edit-rotate, 0deg))',
  }
  if (adj.width != null) style.width = `${adj.width}px`
  if (adj.z != null) style.zIndex = adj.z
  return style
}

// --- Serializadores -------------------------------------------------------

function transformDecl(adj) {
  const parts = []
  if (adj.x !== 0 || adj.y !== 0) parts.push(`translate(${adj.x}px, ${adj.y}px)`)
  if (adj.scale !== 1) parts.push(`scale(${adj.scale})`)
  if (adj.rotate !== 0) parts.push(`rotate(${adj.rotate}deg)`)
  return parts.join(' ')
}

// Gera CSS pronto para revisão (uma regra por elemento ajustado).
export function toCSS() {
  const blocks = []
  for (const el of EDITABLE_ELEMENTS) {
    const adj = getAdjustment(el.id)
    if (isDefault(adj)) continue
    const decls = []
    const t = transformDecl(adj)
    if (t) decls.push(`  transform: ${t};`)
    if (adj.width != null) decls.push(`  width: ${adj.width}px;`)
    if (adj.z != null) decls.push(`  z-index: ${adj.z};`)
    if (!decls.length) continue
    blocks.push(`/* ${el.id} — ${el.label} */\n${el.selector} {\n${decls.join('\n')}\n}`)
  }
  return blocks.join('\n\n') || '/* nenhum ajuste aplicado */'
}

// Gera JSON só com os ids efetivamente ajustados.
export function toJSON() {
  const out = {}
  for (const id of Object.keys(state)) {
    const adj = getAdjustment(id)
    if (isDefault(adj)) continue
    if (!findElement(id)) continue
    out[id] = adj
  }
  return JSON.stringify(out, null, 2)
}

// --- Gating ---------------------------------------------------------------
// Painel só aparece em DEV, com ?design=1 na URL, ou flag localStorage swc_design=1.
export function isDesignModeEnabled() {
  try {
    if (import.meta.env && import.meta.env.DEV) return true
  } catch {
    /* import.meta indisponível */
  }
  try {
    const hay = `${location.search} ${location.hash}`
    if (/[?&]design=1\b/.test(hay)) return true
    if (localStorage.getItem('swc_design') === '1') return true
  } catch {
    /* sem window/localStorage */
  }
  return false
}
