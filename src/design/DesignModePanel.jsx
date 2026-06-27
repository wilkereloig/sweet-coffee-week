// Painel de desenvolvimento do Design Mode (MVP).
// Lista os elementos editáveis da página, mostra X/Y/scale/rotate (slider + input),
// aplica ao vivo via store e exporta JSON/CSS para revisão manual.
// Aparece só quando isDesignModeEnabled() é true (gating em Home.jsx).
// Abre/fecha via FAB (canto inferior direito) ou atalho Ctrl+Shift+D.

import React from 'react'
import { elementsForPage } from './editableElements'
import {
  getAdjustment,
  setAdjustment,
  resetOne,
  resetAll,
  subscribe,
  toCSS,
  toJSON,
} from './layoutAdjustments'

// Controles do MVP: rótulo, faixa e passo.
const CONTROLS = [
  { key: 'x', label: 'X', min: -400, max: 400, step: 1, def: 0 },
  { key: 'y', label: 'Y', min: -400, max: 400, step: 1, def: 0 },
  { key: 'scale', label: 'Scale', min: 0.5, max: 2, step: 0.01, def: 1 },
  { key: 'rotate', label: 'Rotate', min: -45, max: 45, step: 0.5, def: 0 },
]

function Control({ id, adj, meta }) {
  const value = adj[meta.key]
  const onChange = (e) => {
    const v = e.target.value
    setAdjustment(id, { [meta.key]: v === '' ? meta.def : Number(v) })
  }
  return (
    <label style={S.ctrl}>
      <span style={S.ctrlLabel}>{meta.label}</span>
      <input type="range" min={meta.min} max={meta.max} step={meta.step} value={value} onChange={onChange} style={S.range} />
      <input type="number" step={meta.step} value={value} onChange={onChange} style={S.num} />
    </label>
  )
}

function Row({ el }) {
  const [open, setOpen] = React.useState(false)
  const [adj, setAdj] = React.useState(() => getAdjustment(el.id))
  React.useEffect(() => subscribe(() => setAdj(getAdjustment(el.id))), [el.id])

  const touched = adj.x !== 0 || adj.y !== 0 || adj.scale !== 1 || adj.rotate !== 0

  return (
    <div style={S.row}>
      <div style={S.rowHead}>
        <button type="button" onClick={() => setOpen((o) => !o)} style={S.rowToggle}>
          <span style={{ opacity: 0.6 }}>{open ? '▾' : '▸'}</span>
          <span>{el.label}</span>
          {touched && <span style={S.dot} title="ajustado" />}
        </button>
        {touched && (
          <button type="button" onClick={() => resetOne(el.id)} style={S.rowReset} title="Resetar este elemento">
            ↺
          </button>
        )}
      </div>
      {el.note && open && <p style={S.note}>{el.note}</p>}
      {open && (
        <div style={S.controls}>
          {CONTROLS.map((meta) => (
            <Control key={meta.key} id={el.id} adj={adj} meta={meta} />
          ))}
        </div>
      )}
    </div>
  )
}

export function DesignModePanel({ page = 'home' }) {
  const [open, setOpen] = React.useState(false)
  const [copied, setCopied] = React.useState('')
  const els = elementsForPage(page)

  // Atalho Ctrl+Shift+D abre/fecha o painel.
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const copy = async (kind) => {
    const text = kind === 'css' ? toCSS() : toJSON()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(''), 1400)
    } catch {
      window.prompt('Copie manualmente:', text)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={S.fab} title="Design Mode (Ctrl+Shift+D)">
        ✎
      </button>
    )
  }

  return (
    <aside style={S.panel} aria-label="Design Mode">
      <div style={S.header}>
        <strong style={S.title}>Design Mode</strong>
        <span style={S.badge}>dev</span>
        <button type="button" onClick={() => setOpen(false)} style={S.close} title="Fechar (Ctrl+Shift+D)">
          –
        </button>
      </div>

      <div style={S.list}>
        {els.map((el) => (
          <Row key={el.id} el={el} />
        ))}
      </div>

      <div style={S.actions}>
        <button type="button" onClick={() => copy('json')} style={S.btn}>
          {copied === 'json' ? '✓ copiado' : 'Copiar JSON'}
        </button>
        <button type="button" onClick={() => copy('css')} style={S.btn}>
          {copied === 'css' ? '✓ copiado' : 'Copiar CSS'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Resetar todos os ajustes desta sessão?')) resetAll()
          }}
          style={{ ...S.btn, ...S.btnDanger }}
        >
          Resetar
        </button>
      </div>
    </aside>
  )
}

// Estilos inline (isolados, não dependem do CSS do site).
const S = {
  panel: {
    position: 'fixed', right: 16, bottom: 16, zIndex: 99999, width: 320, maxHeight: '80vh',
    display: 'flex', flexDirection: 'column', background: '#1c1410', color: '#f3e9e1',
    border: '1px solid rgba(255,255,255,.12)', borderRadius: 14,
    boxShadow: '0 18px 50px rgba(0,0,0,.5)', font: '13px/1.4 system-ui, sans-serif', overflow: 'hidden',
  },
  header: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,.1)' },
  title: { fontSize: 13, letterSpacing: '.02em' },
  badge: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', padding: '2px 6px', borderRadius: 6, background: '#3a2a1f', color: '#e7b27a' },
  close: { marginLeft: 'auto', width: 24, height: 24, border: 'none', borderRadius: 6, background: 'rgba(255,255,255,.08)', color: '#f3e9e1', cursor: 'pointer', fontSize: 16, lineHeight: 1 },
  list: { padding: 8, overflowY: 'auto', flex: 1 },
  row: { borderBottom: '1px solid rgba(255,255,255,.06)' },
  rowHead: { display: 'flex', alignItems: 'center' },
  rowToggle: { flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px', border: 'none', background: 'transparent', color: '#f3e9e1', cursor: 'pointer', textAlign: 'left', font: 'inherit' },
  rowReset: { width: 26, height: 26, border: 'none', borderRadius: 6, background: 'transparent', color: '#caa', cursor: 'pointer', fontSize: 14 },
  dot: { width: 7, height: 7, borderRadius: '50%', background: '#e7b27a' },
  note: { margin: '0 6px 6px', padding: '6px 8px', borderRadius: 6, background: 'rgba(231,178,122,.12)', color: '#e7b27a', fontSize: 11 },
  controls: { display: 'grid', gap: 8, padding: '4px 6px 12px' },
  ctrl: { display: 'grid', gridTemplateColumns: '54px 1fr 56px', alignItems: 'center', gap: 8 },
  ctrlLabel: { fontSize: 11, color: '#c9b8aa' },
  range: { width: '100%', accentColor: '#e7b27a' },
  num: { width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,.15)', background: '#120c09', color: '#f3e9e1', font: '12px system-ui' },
  actions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 10, borderTop: '1px solid rgba(255,255,255,.1)' },
  btn: { padding: '8px 6px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.06)', color: '#f3e9e1', cursor: 'pointer', font: '12px system-ui', fontWeight: 600 },
  btnDanger: { gridColumn: '1 / -1', borderColor: 'rgba(214,54,72,.5)', color: '#ffb3bd', background: 'rgba(214,54,72,.12)' },
  fab: { position: 'fixed', right: 16, bottom: 16, zIndex: 99999, width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,.15)', background: '#1c1410', color: '#e7b27a', cursor: 'pointer', fontSize: 18, boxShadow: '0 12px 30px rgba(0,0,0,.45)' },
}
