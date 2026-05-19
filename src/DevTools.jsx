import React from 'react'

const MODES = [
  { id: 'desktop', label: 'Desktop', width: null },
  { id: 'mobile',  label: 'Mobile',  width: 390  },
]

export function DevViewportSwitcher({ children }) {
  const [mode, setMode] = React.useState('desktop')

  if (!import.meta.env.DEV) return children

  const current = MODES.find(m => m.id === mode)

  return (
    <>
      <div style={{
        position: 'fixed', top: 12, right: 12, zIndex: 99999,
        display: 'flex', gap: 3,
        background: 'rgba(15,15,15,.92)',
        backdropFilter: 'blur(8px)',
        padding: '5px 6px', borderRadius: 8,
        fontFamily: 'monospace', fontSize: 11,
        boxShadow: '0 2px 12px rgba(0,0,0,.4)',
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
              transition: 'background .15s, color .15s',
            }}
          >
            {m.label}{m.width ? ` · ${m.width}` : ''}
          </button>
        ))}
      </div>

      {current.width ? (
        <div style={{
          background: '#111',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}>
          <div style={{
            width: current.width,
            minHeight: '100vh',
            background: '#fff',
            boxShadow: '0 0 0 1px rgba(255,255,255,.08), 0 24px 80px rgba(0,0,0,.6)',
            overflow: 'hidden',
            position: 'relative',
          }}>
            {children}
          </div>
        </div>
      ) : children}
    </>
  )
}
