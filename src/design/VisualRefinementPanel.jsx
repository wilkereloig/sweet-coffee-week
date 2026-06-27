// Painel contextual do Visual Refinement Mode.
// Mostra só os controles permitidos pelo tipo do elemento selecionado,
// seletor de breakpoint, botões de alinhamento, e ações de salvar/copiar/resetar.

import React from 'react'
import { elementsForPage, findVisualElement, canDrag, BREAKPOINTS } from './visualEditableRegistry'
import {
  subscribe, effectiveOverride, setOverride, resetElement, resetPage,
  getSelected, selectElement, getEditBreakpoint, setEditBreakpoint,
  toJSON, toCSS, saveToCode,
} from './useVisualOverride'
import { getContainerFeatures, features, alignDelta } from './visualRefinementUtils'

const CTRL = {
  x: { label: 'X', min: -400, max: 400, step: 1, def: 0 },
  y: { label: 'Y', min: -400, max: 400, step: 1, def: 0 },
  scale: { label: 'Scale', min: 0.5, max: 2, step: 0.01, def: 1 },
  rotate: { label: 'Rotate', min: -45, max: 45, step: 0.5, def: 0 },
  zIndex: { label: 'z-index', min: 0, max: 50, step: 1, def: 0 },
  opacity: { label: 'Opacity', min: 0, max: 1, step: 0.05, def: 1 },
  maxWidth: { label: 'Max-W', min: 120, max: 1400, step: 1, def: null, unit: 'px' },
  marginTop: { label: 'Mt', min: -200, max: 400, step: 1, def: 0 },
  marginBottom: { label: 'Mb', min: -200, max: 400, step: 1, def: 0 },
  paddingTop: { label: 'Pt', min: 0, max: 400, step: 1, def: 0 },
  paddingBottom: { label: 'Pb', min: 0, max: 400, step: 1, def: 0 },
}

function NumberControl({ id, bp, name, value }) {
  const meta = CTRL[name]
  const v = value == null ? meta.def : value
  const onChange = (e) => {
    const raw = e.target.value
    setOverride(id, bp, { [name]: raw === '' ? meta.def : Number(raw) })
  }
  return (
    <label style={S.ctrl}>
      <span style={S.ctrlLabel}>{meta.label}</span>
      {meta.def != null ? (
        <input type="range" min={meta.min} max={meta.max} step={meta.step} value={v ?? meta.min} onChange={onChange} style={S.range} />
      ) : (
        <span />
      )}
      <input type="number" step={meta.step} value={v == null ? '' : v} placeholder={meta.def == null ? 'auto' : ''} onChange={onChange} style={S.num} />
    </label>
  )
}

function AlignControl({ id, bp, value }) {
  return (
    <div style={S.ctrl}>
      <span style={S.ctrlLabel}>Align</span>
      <div style={S.seg}>
        {['left', 'center', 'right'].map((a) => (
          <button key={a} type="button" onClick={() => setOverride(id, bp, { align: value === a ? null : a })} style={{ ...S.segBtn, ...(value === a ? S.segOn : null) }}>
            {a[0].toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}

// Botões de alinhamento ao container (calculam x/y) — só p/ elementos arrastáveis.
function ContainerAlign({ id, bp }) {
  const apply = (kind) => {
    const node = document.querySelector(`[data-editable-id="${id}"]`)
    if (!node) return
    const cur = effectiveOverride(id, bp)
    const { dx, dy } = alignDelta(kind, features(node.getBoundingClientRect()), getContainerFeatures())
    setOverride(id, bp, { x: Math.round((cur.x || 0) + dx), y: Math.round((cur.y || 0) + dy) })
  }
  const B = ({ k, children }) => (
    <button type="button" onClick={() => apply(k)} style={S.alignBtn} title={k}>{children}</button>
  )
  return (
    <div style={S.alignRow}>
      <span style={S.ctrlLabel}>Alinhar</span>
      <div style={S.alignGrid}>
        <B k="left">⬅</B><B k="hcenter">⬌</B><B k="right">➡</B>
        <B k="top">⬆</B><B k="middle">⬍</B><B k="bottom">⬇</B>
      </div>
    </div>
  )
}

export function VisualRefinementPanel({ page = 'home', onClose }) {
  const [, force] = React.useReducer((n) => n + 1, 0)
  const [copied, setCopied] = React.useState('')
  const [saveMsg, setSaveMsg] = React.useState('')
  React.useEffect(() => subscribe(force), [])

  const els = elementsForPage(page)
  const selectedId = getSelected()
  const sel = selectedId ? findVisualElement(selectedId) : null
  const bp = getEditBreakpoint()
  const ov = selectedId ? effectiveOverride(selectedId, bp) : {}

  const copy = async (kind) => {
    const text = kind === 'css' ? toCSS() : toJSON()
    try { await navigator.clipboard.writeText(text); setCopied(kind); setTimeout(() => setCopied(''), 1400) }
    catch { window.prompt('Copie manualmente:', text) }
  }

  const save = async () => {
    const summary = toJSON()
    const count = Object.keys(JSON.parse(summary)).length
    if (!window.confirm(`Salvar ${count} elemento(s) ajustado(s) em visualOverrides.json?\n\n${summary.slice(0, 500)}`)) return
    try { await saveToCode(); setSaveMsg('✓ salvo no código'); setTimeout(() => setSaveMsg(''), 2000) }
    catch (err) { setSaveMsg(`✗ ${err.message}`); setTimeout(() => setSaveMsg(''), 4000) }
  }

  return (
    <aside style={S.panel} aria-label="Visual Refinement">
      <div style={S.header}>
        <strong style={S.title}>Visual Refinement</strong>
        <span style={S.badge}>dev</span>
        <button type="button" onClick={onClose} style={S.close} title="Fechar (Ctrl+Shift+D)">–</button>
      </div>

      {/* Breakpoint */}
      <div style={S.bpRow}>
        {BREAKPOINTS.map((b) => (
          <button key={b.key} type="button" onClick={() => setEditBreakpoint(b.key)} style={{ ...S.bpBtn, ...(bp === b.key ? S.bpOn : null) }}>
            {b.label}
          </button>
        ))}
      </div>

      {/* Selecionado + controles */}
      <div style={S.body}>
        {!sel ? (
          <p style={S.hint}>Clique num elemento da página para selecionar.</p>
        ) : (
          <div>
            <div style={S.selHead}>
              <span style={S.selName}>{sel.label}</span>
              <span style={S.selType}>{sel.type}</span>
            </div>
            {sel.note && <p style={S.note}>{sel.note}</p>}
            <div style={S.controls}>
              {sel.allowedControls.map((name) =>
                name === 'align'
                  ? <AlignControl key="align" id={sel.id} bp={bp} value={ov.align ?? null} />
                  : <NumberControl key={name} id={sel.id} bp={bp} name={name} value={ov[name] ?? null} />,
              )}
              {canDrag(sel) && <ContainerAlign id={sel.id} bp={bp} />}
            </div>
            <button type="button" onClick={() => resetElement(sel.id)} style={S.resetEl}>Resetar elemento</button>
          </div>
        )}

        {/* Lista p/ trocar seleção */}
        <div style={S.list}>
          {els.map((el) => (
            <button key={el.id} type="button" onClick={() => selectElement(el.id)} style={{ ...S.listItem, ...(el.id === selectedId ? S.listOn : null) }}>
              {el.label}
            </button>
          ))}
        </div>
      </div>

      <div style={S.actions}>
        <button type="button" onClick={save} style={{ ...S.btn, ...S.btnPrimary }}>{saveMsg || 'Salvar no código'}</button>
        <button type="button" onClick={() => copy('json')} style={S.btn}>{copied === 'json' ? '✓' : 'Copiar JSON'}</button>
        <button type="button" onClick={() => copy('css')} style={S.btn}>{copied === 'css' ? '✓' : 'Copiar CSS'}</button>
        <button type="button" onClick={() => { if (window.confirm('Resetar TODOS os ajustes da página?')) resetPage(page) }} style={{ ...S.btn, ...S.btnDanger }}>Resetar todos</button>
      </div>
    </aside>
  )
}

const S = {
  panel: { position: 'fixed', right: 16, bottom: 16, zIndex: 99999, width: 340, maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: '#1c1410', color: '#f3e9e1', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14, boxShadow: '0 18px 50px rgba(0,0,0,.5)', font: '13px/1.4 system-ui, sans-serif', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,.1)' },
  title: { fontSize: 13 },
  badge: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', padding: '2px 6px', borderRadius: 6, background: '#3a2a1f', color: '#e7b27a' },
  close: { marginLeft: 'auto', width: 24, height: 24, border: 'none', borderRadius: 6, background: 'rgba(255,255,255,.08)', color: '#f3e9e1', cursor: 'pointer', fontSize: 16, lineHeight: 1 },
  bpRow: { display: 'flex', gap: 6, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.08)' },
  bpBtn: { flex: 1, padding: '6px 4px', borderRadius: 7, border: '1px solid rgba(255,255,255,.14)', background: 'transparent', color: '#c9b8aa', cursor: 'pointer', font: '11px system-ui', fontWeight: 600 },
  bpOn: { background: '#e7b27a', color: '#241', borderColor: '#e7b27a' },
  body: { padding: 10, overflowY: 'auto', flex: 1 },
  hint: { margin: 0, padding: '14px 6px', color: '#9d8b7e', textAlign: 'center', fontSize: 12 },
  selHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  selName: { fontWeight: 700 },
  selType: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: '#2bc4e8', border: '1px solid rgba(43,196,232,.4)', borderRadius: 5, padding: '1px 5px' },
  note: { margin: '0 0 8px', padding: '6px 8px', borderRadius: 6, background: 'rgba(231,178,122,.12)', color: '#e7b27a', fontSize: 11 },
  controls: { display: 'grid', gap: 8 },
  ctrl: { display: 'grid', gridTemplateColumns: '54px 1fr 56px', alignItems: 'center', gap: 8 },
  ctrlLabel: { fontSize: 11, color: '#c9b8aa' },
  range: { width: '100%', accentColor: '#e7b27a' },
  num: { width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,.15)', background: '#120c09', color: '#f3e9e1', font: '12px system-ui' },
  seg: { display: 'flex', gap: 4, gridColumn: '2 / -1' },
  segBtn: { flex: 1, padding: '5px 0', borderRadius: 6, border: '1px solid rgba(255,255,255,.15)', background: 'transparent', color: '#c9b8aa', cursor: 'pointer', font: '11px system-ui', fontWeight: 700 },
  segOn: { background: '#e7b27a', color: '#241', borderColor: '#e7b27a' },
  alignRow: { display: 'grid', gridTemplateColumns: '54px 1fr', alignItems: 'center', gap: 8, marginTop: 2 },
  alignGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 },
  alignBtn: { padding: '5px 0', borderRadius: 6, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.05)', color: '#f3e9e1', cursor: 'pointer', fontSize: 13 },
  resetEl: { width: '100%', marginTop: 10, padding: '7px', borderRadius: 7, border: '1px solid rgba(255,255,255,.15)', background: 'transparent', color: '#caa', cursor: 'pointer', font: '12px system-ui' },
  list: { display: 'grid', gap: 4, marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.08)' },
  listItem: { textAlign: 'left', padding: '6px 8px', borderRadius: 6, border: '1px solid transparent', background: 'rgba(255,255,255,.04)', color: '#d8c8ba', cursor: 'pointer', font: '12px system-ui' },
  listOn: { borderColor: '#2bc4e8', color: '#fff', background: 'rgba(43,196,232,.12)' },
  actions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 10, borderTop: '1px solid rgba(255,255,255,.1)' },
  btn: { padding: '8px 6px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.06)', color: '#f3e9e1', cursor: 'pointer', font: '12px system-ui', fontWeight: 600 },
  btnPrimary: { gridColumn: '1 / -1', background: '#2bc4e8', color: '#06222b', borderColor: '#2bc4e8' },
  btnDanger: { gridColumn: '1 / -1', borderColor: 'rgba(214,54,72,.5)', color: '#ffb3bd', background: 'rgba(214,54,72,.12)' },
}
