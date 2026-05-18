import React from 'react'
import { I } from './icons'

export function PhotoPH({ label = 'FOTO', aspect = '4/3', icon = 'donut', lovers = false, rotate = 0, size = 'md' }) {
  const IconComp = I[icon] || I.donut
  return (
    <div
      className={`media-ph ${lovers ? 'kv-lovers-bg' : ''}`}
      style={{ aspectRatio: aspect, transform: rotate ? `rotate(${rotate}deg)` : undefined }}
    >
      <div className="icon-bg">
        <IconComp width={size === 'lg' ? 140 : 88} height={size === 'lg' ? 140 : 88} />
      </div>
      <span className="media-ph__label">{label}</span>
    </div>
  )
}

export function PhotoEditorial({ label = 'FOTO DO FESTIVAL', caption = '', aspect = '4/5', tone = 'warm', full = false }) {
  const toneStyles = {
    warm:   'linear-gradient(180deg, #E8C9A8 0%, #B68458 60%, #8A5B30 100%)',
    cool:   'linear-gradient(180deg, #C9C1B0 0%, #8B8470 60%, #564E3F 100%)',
    dark:   'linear-gradient(180deg, #5C3A21 0%, #2D1A0E 100%)',
    cream:  'linear-gradient(180deg, #F2DDC0 0%, #D8B788 100%)',
    coffee: 'linear-gradient(135deg, #3D2417 0%, #6B3F22 50%, #2D1A0E 100%)',
  }
  return (
    <figure
      style={{
        position: 'relative',
        margin: 0,
        borderRadius: full ? 0 : 18,
        overflow: 'hidden',
        aspectRatio: aspect,
        background: toneStyles[tone] || toneStyles.warm,
        width: '100%',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage:
          'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,.12), transparent 50%),' +
          'radial-gradient(ellipse at 70% 80%, rgba(0,0,0,.20), transparent 60%)',
      }}/>
      <span style={{
        position: 'absolute', top: 16, left: 16,
        background: 'rgba(255,244,236,.18)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: 'rgba(255,244,236,.92)',
        padding: '6px 10px',
        borderRadius: 6,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '.14em',
        textTransform: 'uppercase',
        border: '1px solid rgba(255,244,236,.22)',
      }}>{label}</span>
      {caption && (
        <figcaption style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '20px 20px 18px',
          color: 'rgba(255,244,236,.92)',
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.55))',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          letterSpacing: 0.01,
        }}>{caption}</figcaption>
      )}
    </figure>
  )
}

export function BlurredComboPH({ tema = 'Tema recriado', label = 'EM BREVE' }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <PhotoPH label="" aspect="4/3" icon="donut" />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(255,244,236,.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            transform: 'rotate(-4deg)',
            background: 'var(--ink)',
            color: 'var(--bg)',
            padding: '8px 16px',
            borderRadius: '999px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '.14em',
          }}>{label}</div>
        </div>
      </div>
      <div style={{ padding: 20 }}>
        <div className="mono" style={{ color: 'var(--ink-mute)' }}>â€”</div>
        <div className="h-3 mt-1" style={{ color: 'var(--ink-soft)' }}>Nome do combo</div>
        <div className="mono mt-1" style={{ color: 'var(--ink-mute)' }}>tema Â· bairro</div>
      </div>
    </div>
  )
}

export function ParticipantePH({ accent = 'linear-gradient(135deg, #F4D2BB, #E8B59B)', textColor = 'rgba(43,24,16,.4)' }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: accent,
        marginBottom: 16,
        position: 'relative',
        border: '1px solid var(--line)',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-serif)', fontStyle: 'italic',
          fontSize: 22, color: textColor,
        }}>â€”</div>
      </div>
      <div className="h-3" style={{ color: 'var(--ink-soft)' }}>Loja participante</div>
      <div className="mono mt-1" style={{ color: 'var(--ink-mute)' }}>bairro Â· zona</div>
    </div>
  )
}

export function LogoPH({ name = 'Marca', width = 160, height = 64 }) {
  return (
    <div style={{
      width, height,
      borderRadius: 10,
      background: 'rgba(43,24,16,.04)',
      border: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '.1em',
      color: 'var(--ink-mute)',
      textTransform: 'uppercase',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <span style={{ position: 'relative', zIndex: 1 }}>{name}</span>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0 8px, rgba(43,24,16,.03) 8px 9px)',
      }}/>
    </div>
  )
}

const fieldStyle = {
  fontFamily: 'var(--font-sans)',
  fontSize: 15,
  padding: '14px 16px',
  border: '1px solid var(--line-strong)',
  borderRadius: 12,
  background: 'var(--bg-card)',
  color: 'var(--ink)',
  outline: 'none',
  width: '100%',
}

export function FormFieldPH({ label, placeholder = '', type = 'text', full = false, options }) {
  if (type === 'select') {
    return (
      <label style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: full ? '1 / -1' : undefined }}>
        <span className="mono" style={{ textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-soft)' }}>{label}</span>
        <select style={fieldStyle}>
          <option value="">{placeholder || 'Selecione'}</option>
          {(options || []).map((o, i) => <option key={i}>{o}</option>)}
        </select>
      </label>
    )
  }
  if (type === 'textarea') {
    return (
      <label style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: full ? '1 / -1' : undefined }}>
        <span className="mono" style={{ textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-soft)' }}>{label}</span>
        <textarea rows={4} placeholder={placeholder} style={{ ...fieldStyle, resize: 'vertical', minHeight: 110 }} />
      </label>
    )
  }
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: full ? '1 / -1' : undefined }}>
      <span className="mono" style={{ textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-soft)' }}>{label}</span>
      <input type={type} placeholder={placeholder} style={fieldStyle} />
    </label>
  )
}

export function EmptyState({ title, subtitle, icon = 'cal', lovers = false }) {
  const IconComp = I[icon] || I.cal
  return (
    <div style={{
      textAlign: 'center',
      padding: 'clamp(40px, 6vw, 80px) 24px',
      border: `1.5px dashed ${lovers ? 'rgba(135,14,45,.35)' : 'var(--line-strong)'}`,
      borderRadius: 22,
      background: lovers ? 'rgba(255,241,230,.5)' : 'transparent',
    }}>
      <div style={{
        width: 64, height: 64, margin: '0 auto 20px',
        borderRadius: 999,
        background: lovers ? 'rgba(135,14,45,.1)' : 'rgba(43,24,16,.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: lovers ? 'var(--lovers-red)' : 'var(--ink-soft)',
      }}>
        <IconComp width={28} height={28} />
      </div>
      <div className="h-3" style={{ marginBottom: 8, color: 'var(--ink)' }}>{title}</div>
      <div className="text-mute" style={{ maxWidth: 440, margin: '0 auto', fontSize: 15 }}>{subtitle}</div>
    </div>
  )
}

