// Painel de desenvolvimento do Design Mode.
// Lista os elementos editáveis da página, mostra controles (slider + input),
// aplica ao vivo via store e exporta CSS/JSON para revisão manual.
// Renderizado apenas quando isDesignModeEnabled() é true (ver Home.jsx).

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

// Definição de cada controle: rótulo, faixa e passo.
const CONTROL_META = {
  x: { label: 'X', min: -400, max: 400, step: 1, unit: 'px', def: 0 },
  y: { label: 'Y', min: -400, max: 400, step: 1, unit: 'px', def: 0 },
  scale: { label: 'Scale', min: 0.5, max: 2, step: 0.01, unit: '', def: 1 },
  rotate: { label: 'Rotate', min: -45, max: 45, step: 0.5, unit: '°', def: 0 },
  width: { label: 'Width', min: 120, max: 1200, step: 1, unit: 'px', def: null },
  z: { label: 'z-index', min: 0, max: 50, step: 1, unit: '', def: null },
}

function Control({ id, adj, name }) {
  const meta = CONTROL_META[name]
  const raw = adj[name]
  const value = raw == null ? meta.def : raw
  // Para width/z (default null): slider parte do mínimo; input vazio = limpar.
  const sliderValue = value == null ? meta.min : value

  const onSlider = (e) => setAdjustment(id, { [name]: Number(e.target.value) })
  const onInput = (e) => {
    const v = e.target.value
    if (v === '') return setAdjustment(id, { [name]: meta.def })
    setAdjustment(id, { [name]: Number(v) })
  }

  return (
    <label style={S.ctrl}>
      <span style={S.ctrlLabel}>{meta.label}</span>
      <input
        type="range"
        min={meta.min}
        max={meta.max}
        step={meta.step}
        value={sliderValue}
        onChange={onSlider}
        style={S.range}
      />
      <input
        type="number"
        step={meta.step}
        value={value == null ? '' : value}
        placeholder={meta.def == null ? 'auto' : String(meta.def)}
        onChange={onInput}
        style={S.num}
      />
    </label>
  )
}

function Row({ el }) {
  const [open, setOpen] = React.useState(false)
  const [adj, setAdj] = React.useState(() => getAdjustment(el.id))
  React.useEffect(() => subscribe(() => setAdj(getAdjustment(el.id))), [el.id])

  const touched =
    adj.x !== 0 || adj.y !== 0 || adj.scale !== 1 || adj.rotate !== 0 || adj.width != null || adj.z != null

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
      {open && (
        <div style={S.controls}>
          {el.controls.map((name) => (
            <Control key={name} id={el.id} adj={adj} name={name} />
          ))}
        </div>
      )}
    </div>
  )
}

export function DesignModePanel({ page = 'home' }) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [copied, setCopied] = React.useState('')
  const els = elementsForPage(page)

  const copy = async (kind) => {
    const text = kind === 'css' ? toCSS() : toJSON()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(''), 1400)
    } catch {
      // fallback: seleciona via prompt para cópia manual
      window.prompt('Copie manualmente:', text)
    }
  }

  if (collapsed) {
    return (
      <button type="button" onClick={() => setCollapsed(false)} style={S.fab} title="Abrir Design Mode">
        ✎
      </button>
    )
  }

  return (
    <aside style={S.panel} aria-label="Design Mode">
      <div style={S.header}>
        <strong style={S.title}>Design Mode</strong>
        <span style={S.badge}>dev</span>
        <button type="button" onClick={() => setCollapsed(true)} style={S.close} title="Minimizar">
          –
        </button>
      </div>

      <div style={S.list}>
        {els.map((el) => (
          <Row key={el.id} el={el} />
        ))}
      </div>

      <div style={S.actions}>
        <button type="button" onClick={() => copy('css')} style={S.btn}>
          {copied === 'css' ? '✓ copiado' : 'Copiar CSS'}
        </button>
        <button type="button" onClick={() => copy('json')} style={S.btn}>
          {copied === 'json' ? '✓ copiado' : 'Copiar JSON'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Resetar todos os ajustes desta sessão?')) resetAll()
          }}
          style={{ ...S.btn, ...S.btnDanger }}
        >
          Resetar ajustes
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
    boxShadow: '0 18px 50px rgba(0,0,0,.5)', font: '13px/1.4 system-ui, sans-serif',
    overflow: 'hidden',
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
