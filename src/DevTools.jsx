import React from 'react'

const MODES = [
  { id: 'desktop', label: 'Desktop', width: null },
  { id: 'mobile',  label: 'Mobile · 390', width: 390 },
]

export function DevViewportSwitcher({ children }) {
  const [mode, setMode] = React.useState('desktop')

  /* Inside an iframe: just render content, no switcher */
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top

  if (!import.meta.env.DEV || isInIframe) return children

  const src = window.location.href

  return (
    <>
      {/* Switcher pill — fixed, always visible */}
      <div style={{
        position: 'fixed', top: 12, right: 12, zIndex: 99999,
        display: 'flex', gap: 3,
        background: 'rgba(15,15,15,.92)',
        backdropFilter: 'blur(8px)',
        padding: '5px 6px', borderRadius: 8,
        fontFamily: 'monospace', fontSize: 11,
        boxShadow: '0 2px 12px rgba(0,0,0,.4)',
        pointerEvents: 'all',
      }}>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              padding: '4px 10px', borderRadius: 5, border: 'none',
              background: mode === m.id ? 'rgba(255,255,255,.95)' : 'transparent',
              color: mode === m.id ? '#111' : 'rgba(255,255,255,.55)',
              cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 'inherit',
              letterSpacing: '.04em',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Preview frame — iframe gets its own viewport = correct media queries */}
      {mode === 'mobile' ? (
        <div style={{
          background: '#111',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}>
          <iframe
            key="mobile"
            src={src}
            title="Mobile Preview"
            style={{
              width: 390,
              height: '100vh',
              border: 'none',
              display: 'block',
              boxShadow: '0 0 0 1px rgba(255,255,255,.08), 0 24px 80px rgba(0,0,0,.6)',
            }}
          />
        </div>
      ) : (
        <iframe
          key="desktop"
          src={src}
          title="Desktop Preview"
          style={{
            width: '100%',
            height: '100vh',
            border: 'none',
            display: 'block',
          }}
        />
      )}
    </>
  )
}
