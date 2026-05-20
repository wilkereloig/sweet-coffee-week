import React from 'react'

const IconDesktop = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.5" y="2.5" width="15" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M6 15.5h6M9 12.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const IconMobile = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4.5" y="1.5" width="9" height="15" rx="2" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="9" cy="14" r=".8" fill="currentColor"/>
  </svg>
)

const MODES = [
  { id: 'desktop', Icon: IconDesktop, title: 'Desktop' },
  { id: 'mobile',  Icon: IconMobile,  title: 'Mobile 390' },
]

export function DevViewportSwitcher({ children }) {
  const [mode, setMode] = React.useState('desktop')

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top
  if (!import.meta.env.DEV || isInIframe) return children

  const src = window.location.href

  return (
    <>
      {mode === 'mobile' ? (
        <div style={{ background: '#111', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <iframe
            key="mobile"
            src={src}
            title="Mobile Preview"
            style={{ width: 390, height: '100vh', border: 'none', display: 'block', boxShadow: '0 0 0 1px rgba(255,255,255,.08), 0 24px 80px rgba(0,0,0,.6)' }}
          />
        </div>
      ) : (
        <iframe
          key="desktop"
          src={src}
          title="Desktop Preview"
          style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
        />
      )}

      <div style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 99999,
        display: 'flex', gap: 2,
        background: 'rgba(15,15,15,.92)',
        backdropFilter: 'blur(8px)',
        padding: '4px 5px', borderRadius: 10,
        boxShadow: '0 2px 16px rgba(0,0,0,.5)',
        pointerEvents: 'all',
      }}>
        {MODES.map(({ id, Icon, title }) => (
          <button
            key={id}
            title={title}
            onClick={() => setMode(id)}
            style={{
              width: 36, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 7, border: 'none',
              background: mode === id ? 'rgba(255,255,255,.95)' : 'transparent',
              color: mode === id ? '#111' : 'rgba(255,255,255,.55)',
              cursor: 'pointer',
              transition: 'background .12s, color .12s',
            }}
          >
            <Icon />
          </button>
        ))}
      </div>
    </>
  )
}
