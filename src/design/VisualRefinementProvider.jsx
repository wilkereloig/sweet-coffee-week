// Ponto de montagem do Visual Refinement Mode.
// Só renderiza em DEV (ou com a flag local). Em produção: retorna null —
// painel, overlay e endpoint de escrita não existem para o usuário final.
// A aplicação dos overrides salvos NÃO depende deste componente: ela vem do
// hook useVisualOverride lendo visualOverrides.json (funciona em produção).

import React from 'react'
import { isActive, setActive, toggleActive, subscribe } from './useVisualOverride'
import { VisualRefinementOverlay } from './VisualRefinementOverlay'
import { VisualRefinementPanel } from './VisualRefinementPanel'

// Flag local para ligar fora de DEV (ex.: inspecionar num preview). Padrão: desligado.
export const ENABLE_VISUAL_REFINEMENT = false

export function isRefinementEnabled() {
  try { if (import.meta.env && import.meta.env.DEV) return true } catch { /* noop */ }
  if (ENABLE_VISUAL_REFINEMENT) return true
  try {
    if (/[?&]refine=1\b/.test(`${location.search} ${location.hash}`)) return true
  } catch { /* noop */ }
  return false
}

export function VisualRefinementProvider({ page = 'home' }) {
  if (!isRefinementEnabled()) return null
  return <RefinementRoot page={page} />
}

function RefinementRoot({ page }) {
  const [, force] = React.useReducer((n) => n + 1, 0)
  React.useEffect(() => subscribe(force), [])

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault()
        toggleActive()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const active = isActive()
  if (!active) {
    return (
      <button type="button" onClick={() => setActive(true)} style={FAB} title="Visual Refinement (Ctrl+Shift+D)">✎</button>
    )
  }
  return (
    <>
      <VisualRefinementOverlay />
      <VisualRefinementPanel page={page} onClose={() => setActive(false)} />
    </>
  )
}

const FAB = { position: 'fixed', right: 16, bottom: 16, zIndex: 99999, width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,.15)', background: '#1c1410', color: '#e7b27a', cursor: 'pointer', fontSize: 18, boxShadow: '0 12px 30px rgba(0,0,0,.45)' }
