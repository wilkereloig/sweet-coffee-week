import React from 'react'

// Motor de compartilhamento: renderiza um card 9:16 (360x640 base, capturado a
// 3x = 1080x1920), mostra preview, e compartilha via Web Share API (arquivo) com
// fallback de download. Variantes: 'carteirinha' | 'meutop' | 'rota'.
// Inline styles de propósito: html-to-image rasteriza com mais fidelidade sem
// depender de CSS externo.

const SITE = 'sweetcoffeeweek.com.br'
const IG = '@sweetcoffeeweek'
const A = (n) => `/images/adesivos-site/adesivo%20(${n}).png`

const PURPLE = '#4F2092'
const CREAM = '#FFE8D2'
const RED = '#D63648'
const YELLOW = '#F5B800'
const PINK = '#F20567'
const BURGUNDY = '#870E2D'

function CardChrome({ children, accent = PURPLE }) {
  return (
    <div style={{
      width: 360, height: 640, position: 'relative', overflow: 'hidden',
      background: `linear-gradient(160deg, ${accent} 0%, ${BURGUNDY} 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Baloo 2','DM Sans',sans-serif", color: '#fff',
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.12, background:
        'radial-gradient(circle at 20% 15%, #fff 0 2px, transparent 3px), radial-gradient(circle at 70% 40%, #fff 0 2px, transparent 3px), radial-gradient(circle at 40% 80%, #fff 0 2px, transparent 3px)', backgroundSize: '120px 120px' }} />
      <div style={{ marginTop: 30, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: YELLOW, zIndex: 1 }}>
        Sweet &amp; Coffee Week Lovers
      </div>
      <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', zIndex: 1 }}>
        {children}
      </div>
      <div style={{ marginBottom: 26, textAlign: 'center', zIndex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>{IG}</div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: YELLOW, marginTop: 4 }}>{SITE}</div>
      </div>
    </div>
  )
}

function CardCarteirinha({ nome }) {
  return (
    <CardChrome accent={PURPLE}>
      <img src={A(50)} alt="" width={120} height={120} style={{ width: 120, height: 'auto', marginBottom: 8 }} />
      <div style={{ fontWeight: 900, fontSize: 40, lineHeight: 0.95, textTransform: 'uppercase', textAlign: 'center', color: '#fff' }}>Sweet Lover</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: YELLOW, marginTop: 4, letterSpacing: 1 }}>DE CARTEIRINHA</div>
      <div style={{ marginTop: 22, background: CREAM, color: BURGUNDY, borderRadius: 16, padding: '14px 22px', textAlign: 'center', minWidth: 220 }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: RED }}>Membro</div>
        <div style={{ fontWeight: 800, fontSize: 22, marginTop: 2 }}>{nome || 'Sweet Lover'}</div>
      </div>
    </CardChrome>
  )
}

function CardMeuTop({ nome, participante, nota }) {
  return (
    <CardChrome accent={RED}>
      <img src={A(10)} alt="" width={130} height={130} style={{ width: 130, height: 'auto', marginBottom: 10 }} />
      <div style={{ fontWeight: 900, fontSize: 34, lineHeight: 0.98, textTransform: 'uppercase', textAlign: 'center', color: '#fff' }}>Já votei no<br />Sweet Awards</div>
      {participante && (
        <div style={{ marginTop: 20, background: CREAM, color: BURGUNDY, borderRadius: 16, padding: '14px 22px', textAlign: 'center', minWidth: 240 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: RED }}>Avaliei</div>
          <div style={{ fontWeight: 800, fontSize: 20, marginTop: 2 }}>{participante}</div>
          {nota != null && <div style={{ fontWeight: 800, fontSize: 14, color: PINK, marginTop: 4 }}>nota {nota}/10 💛</div>}
        </div>
      )}
      {nome && <div style={{ marginTop: 14, fontWeight: 700, fontSize: 14, color: YELLOW }}>— {nome}</div>}
    </CardChrome>
  )
}

function CardRota({ nome, lojas = [] }) {
  return (
    <CardChrome accent={PURPLE}>
      <img src={A(47)} alt="" width={130} height={130} style={{ width: 130, height: 'auto', marginBottom: 8 }} />
      <div style={{ fontWeight: 900, fontSize: 34, lineHeight: 0.98, textTransform: 'uppercase', textAlign: 'center', color: '#fff' }}>Minha Rota<br />da Doçura</div>
      <div style={{ marginTop: 18, background: CREAM, color: BURGUNDY, borderRadius: 16, padding: '14px 18px', minWidth: 250, maxWidth: 290 }}>
        {(lojas.slice(0, 5)).map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', fontWeight: 700, fontSize: 14 }}>
            <span style={{ background: RED, color: '#fff', borderRadius: 999, width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flex: '0 0 auto' }}>{i + 1}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l}</span>
          </div>
        ))}
        {lojas.length > 5 && <div style={{ fontSize: 12, color: RED, fontWeight: 700, marginTop: 4 }}>+{lojas.length - 5} paradas</div>}
      </div>
      {nome && <div style={{ marginTop: 14, fontWeight: 700, fontSize: 14, color: YELLOW }}>— {nome}</div>}
    </CardChrome>
  )
}

function renderVariant(variant, data) {
  if (variant === 'carteirinha') return <CardCarteirinha {...data} />
  if (variant === 'meutop') return <CardMeuTop {...data} />
  if (variant === 'rota') return <CardRota {...data} />
  return null
}

const SHARE_TEXT = {
  carteirinha: 'Sou Sweet Lover de carteirinha 💛 Sweet & Coffee Week Lovers — sweetcoffeeweek.com.br @sweetcoffeeweek',
  meutop: 'Votei no Sweet Awards do Sweet & Coffee Week Lovers 💛 Vote também: sweetcoffeeweek.com.br @sweetcoffeeweek',
  rota: 'Essa é a minha Rota da Doçura no Sweet & Coffee Week Lovers 💛 Monte a sua: sweetcoffeeweek.com.br @sweetcoffeeweek',
}

export function ShareCardModal({ open, onClose, variant = 'carteirinha', data = {} }) {
  const cardRef = React.useRef(null)
  const [busy, setBusy] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function makeBlob() {
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready } catch {} }
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    const { toBlob } = await import('html-to-image')
    return toBlob(cardRef.current, { pixelRatio: 3, width: 360, height: 640, cacheBust: true })
  }

  async function doShare() {
    if (busy) return
    setBusy(true)
    try {
      const blob = await makeBlob()
      if (!blob) throw new Error('sem imagem')
      const file = new File([blob], `sweet-lovers-${variant}.png`, { type: 'image/png' })
      const text = SHARE_TEXT[variant]
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text })
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob); a.download = file.name; a.click()
        URL.revokeObjectURL(a.href)
      }
    } catch (e) { if (import.meta.env.DEV) console.error('[share]', e) }
    finally { setBusy(false) }
  }

  async function doDownload() {
    if (busy) return
    setBusy(true)
    try {
      const blob = await makeBlob()
      if (!blob) throw new Error('sem imagem')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = `sweet-lovers-${variant}.png`; a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) { if (import.meta.env.DEV) console.error('[download]', e) }
    finally { setBusy(false) }
  }

  function copyText() {
    try {
      navigator.clipboard.writeText(SHARE_TEXT[variant])
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  return (
    <div className="share-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="share-modal__panel" onClick={(e) => e.stopPropagation()}>
        <button className="share-modal__close" onClick={onClose} aria-label="Fechar">✕</button>
        <div className="share-modal__preview">
          <div ref={cardRef} className="share-card-capture">
            {renderVariant(variant, data)}
          </div>
        </div>
        <p className="share-modal__hint">Compartilhe no seu Story e marque <strong>{IG}</strong> 💛</p>
        <div className="share-modal__actions">
          <button className="lovers-button lovers-button--primary" disabled={busy} onClick={doShare}>
            {busy ? 'Gerando…' : 'Compartilhar'}
          </button>
          <button className="lovers-button lovers-button--secondary" disabled={busy} onClick={doDownload}>
            Baixar imagem
          </button>
          <button className="share-modal__copy" onClick={copyText}>{copied ? 'Copiado!' : 'Copiar legenda'}</button>
        </div>
      </div>
    </div>
  )
}
