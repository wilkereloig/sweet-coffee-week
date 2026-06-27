// Store de ajustes do Design Mode (MVP).
// - Valores base (defaults) por elemento: x, y, scale, rotate.
// - Persistência TEMPORÁRIA em localStorage (nunca grava no código).
// - Pub/sub para o painel e os elementos atualizarem ao vivo.
// - Serializadores "Copiar JSON" / "Copiar CSS" com formato fixo.
// Nada aqui altera produção: tudo vive no navegador até você revisar e aplicar à mão.

import { EDITABLE_ELEMENTS } from './editableElements'

const STORAGE_KEY = 'swc_design_adjustments_v1'

// Flag local para ligar o painel fora de DEV (ex.: testar num preview).
export const ENABLE_DESIGN_MODE = false

export const DEFAULTS = { x: 0, y: 0, scale: 1, rotate: 0 }

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

// Aplica um patch parcial { x?, y?, scale?, rotate? } a um id.
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
  return adj.x === 0 && adj.y === 0 && adj.scale === 1 && adj.rotate === 0
}

// Estilo inline aplicado ao elemento. Só injeta transform/vars quando o ajuste
// é diferente do default, para não criar transform/stacking em nós não tocados.
export function styleFor(adj) {
  if (isDefault(adj)) return {}
  return {
    '--edit-x': `${adj.x}px`,
    '--edit-y': `${adj.y}px`,
    '--edit-scale': `${adj.scale}`,
    '--edit-rotate': `${adj.rotate}deg`,
    transform:
      'translate(var(--edit-x, 0px), var(--edit-y, 0px)) scale(var(--edit-scale, 1)) rotate(var(--edit-rotate, 0deg))',
  }
}

// --- Serializadores (formato fixo do MVP) ---------------------------------

function transformStr(adj) {
  return `translate(${adj.x}px, ${adj.y}px) scale(${adj.scale}) rotate(${adj.rotate}deg)`
}

// CSS por data-editable-id, snapshot de todos os elementos registrados.
//   [data-editable-id="home.hero.photo"] {
//     transform: translate(0px, 0px) scale(1) rotate(0deg);
//   }
export function toCSS() {
  return EDITABLE_ELEMENTS.map((el) => {
    const adj = getAdjustment(el.id)
    return `[data-editable-id="${el.id}"] {\n  transform: ${transformStr(adj)};\n}`
  }).join('\n\n')
}

// JSON snapshot de todos os elementos registrados.
//   { "home.hero.photo": { "x": 0, "y": 0, "scale": 1, "rotate": 0 } }
export function toJSON() {
  const out = {}
  for (const el of EDITABLE_ELEMENTS) out[el.id] = getAdjustment(el.id)
  return JSON.stringify(out, null, 2)
}

// --- Gating ---------------------------------------------------------------
// Painel só aparece em DEV, com a flag ENABLE_DESIGN_MODE, ?design=1 na URL,
// ou localStorage swc_design=1. Em build de produção sem flag: não renderiza.
export function isDesignModeEnabled() {
  try {
    if (import.meta.env && import.meta.env.DEV) return true
  } catch {
    /* import.meta indisponível */
  }
  if (ENABLE_DESIGN_MODE) return true
  try {
    const hay = `${location.search} ${location.hash}`
    if (/[?&]design=1\b/.test(hay)) return true
    if (localStorage.getItem('swc_design') === '1') return true
  } catch {
    /* sem window/localStorage */
  }
  return false
}
