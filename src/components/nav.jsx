import React from 'react'
import { I, LogoMark, HeartTiny, LoversWordmark } from './icons'

export const NAV_LINKS = [
  { id: 'home',         label: 'O Sweet',      href: '#/', locked: true },
  { id: 'curiosidades', label: 'Curiosidades', href: '#/curiosidades', locked: true },
  { id: 'edicoes',      label: 'Edições',      href: '#/edicoes',      locked: true },
  { id: 'participar',   label: 'Participar',   href: '#/participar',   locked: true },
  { id: 'apoiar',       label: 'Apoiar',       href: '#/apoiar',       locked: true },
  { id: 'contato',      label: 'Contato',      href: '#/contato',      locked: true },
]

const LOVERS_LINKS = [
  { id: 'lovers', label: 'Sobre a edição',      href: '#/lovers' },
  { id: 'combos', label: 'Combos',              href: '#/lovers/combos',  locked: true, tooltip: 'Disponível em 4 de junho' },
  { id: 'mapa',   label: 'Mapa da Doçura',      href: '#/lovers/mapa',    locked: true, tooltip: 'Disponível em 4 de junho' },
  { id: 'awards', label: 'Sweet & Coffee Week Awards', href: '#/lovers/awards', locked: true, tooltip: 'Disponível em 4 de junho' },
]

const IS_LOVERS_ROUTE = ['lovers', 'combos', 'combo-detail', 'mapa', 'awards']

function SiteSidebar({ route, navigate, isLovers }) {
  return (
    <aside className={`site-sidebar${isLovers ? ' lovers' : ''}`}>
      <a href="#/" className="sidebar__brand" onClick={(e) => { e.preventDefault(); navigate('/') }}
         style={{ position: 'relative', display: 'block', height: 176 }}>
        <img
          src="/images/logo-sweet-coffee-week.svg"
          alt="Sweet & Coffee Week"
          height={176}
          style={{
            display: 'block',
            position: 'absolute',
            top: 0, left: 0,
            opacity: isLovers ? 0 : 1,
            transform: isLovers ? 'scale(.85)' : 'scale(1)',
            transition: 'opacity .4s ease, transform .4s ease',
            pointerEvents: 'none',
          }}
        />
        <img
          src="/images/sweet-lovers-logo.svg"
          alt="Sweet & Coffee Week Lovers"
          height={176}
          style={{
            display: 'block',
            position: 'absolute',
            top: 0, left: 0,
            opacity: isLovers ? 1 : 0,
            transform: isLovers ? 'scale(1)' : 'scale(.85)',
            transition: 'opacity .4s ease, transform .4s ease',
            pointerEvents: 'none',
          }}
        />
      </a>

      <nav className="sidebar__nav">
        <div className="sidebar__section-label">Institucional</div>
        {NAV_LINKS.map((l) => (
          l.locked ? (
            <span key={l.id}
                  className="sidebar__link locked"
                  data-tooltip={l.tooltip || 'Em breve'}
                  aria-disabled="true">
              {l.label}
              <I.lock />
            </span>
          ) : (
            <a key={l.id}
               href={l.href}
               className={`sidebar__link${route === l.id ? ' active' : ''}`}
               onClick={(e) => { e.preventDefault(); navigate(l.href.replace('#', '')) }}>
              {l.label}
            </a>
          )
        ))}
      </nav>

      <div className="sidebar__lovers">
        <div className="sidebar__lovers-badge" style={{ marginBottom: 12 }}>
          <LoversWordmark width={120} />
        </div>
        {LOVERS_LINKS.map((l) => (
          l.locked ? (
            <span key={l.id}
                  className="sidebar__link locked"
                  title="Em breve"
                  aria-disabled="true">
              {l.label}
              <I.lock />
            </span>
          ) : (
            <a key={l.id}
               href={l.href}
               className={`sidebar__link${route === l.id || (l.id === 'combos' && route === 'combo-detail') ? ' lovers-active' : ''}`}
               onClick={(e) => { e.preventDefault(); navigate(l.href.replace('#', '')) }}>
              {l.label}
            </a>
          )
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div className="sidebar__credit">Realização<br />F2 Experience</div>
    </aside>
  )
}

function BrandLogo({ isLovers, navigate }) {
  return (
    <a href="#/" className="brand" onClick={(e) => { e.preventDefault(); navigate('/') }}
       style={{ position: 'relative', display: 'inline-block' }}>
      {/* Logo institucional — fica no fluxo normal para definir o tamanho do container */}
      <img
        src="/images/logo-sweet-coffee-week-header.svg"
        alt="Sweet & Coffee Week"
        height={48}
        style={{
          display: 'block',
          opacity: isLovers ? 0 : 1,
          transform: isLovers ? 'scale(.88)' : 'scale(1)',
          transition: 'opacity .4s ease, transform .4s ease',
        }}
      />
      {/* Logo Lovers — sobreposta em absolute */}
      <img
        src="/images/sweet-lovers-logo.svg"
        alt="Sweet & Coffee Week Lovers"
        height={48}
        style={{
          display: 'block',
          position: 'absolute',
          top: 0, left: 0,
          opacity: isLovers ? 1 : 0,
          transform: isLovers ? 'scale(1)' : 'scale(.88)',
          transition: 'opacity .4s ease, transform .4s ease',
          pointerEvents: 'none',
        }}
      />
    </a>
  )
}

function LoversDropdown({ route, navigate }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef(null)
  const isActive = IS_LOVERS_ROUTE.includes(route)

  React.useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className={`lovers-nav-btn ${isActive ? 'active' : ''}`}
        aria-expanded={open}
      >
        <LoversWordmark width={80} />
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
             style={{ transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="lovers-dropdown">
          <div className="lovers-dropdown__header">
            <HeartTiny size={11} color="var(--lovers-red)" />
            <span className="mono" style={{ fontSize: 10, letterSpacing: '.12em', color: 'var(--lovers-red)' }}>SWEET & COFFEE WEEK LOVERS · 16ª EDIÇÃO</span>
          </div>
          {LOVERS_LINKS.map((l) => (
            l.locked ? (
              <span key={l.id} className="locked" data-tooltip={l.tooltip || 'Em breve'} aria-disabled="true">
                {l.label}
                <I.lock />
              </span>
            ) : (
              <a key={l.id}
                 href={l.href}
                 className={route === l.id ? 'active' : ''}
                 onClick={(e) => { e.preventDefault(); navigate(l.href.replace('#', '')); setOpen(false) }}>
                {l.label}
              </a>
            )
          ))}
        </div>
      )}
    </div>
  )
}

export function SiteHeader({ route, navigate }) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const isLovers = IS_LOVERS_ROUTE.includes(route)

  return (
    <React.Fragment>
      <SiteSidebar route={route} navigate={navigate} isLovers={isLovers} />

      <header className={`site-header ${isLovers ? 'lovers' : ''}`}>
        <div className="site-header__inner">
          <BrandLogo isLovers={isLovers} navigate={navigate} />

          <nav className="nav-main">
            {NAV_LINKS.map((l) => (
              l.locked ? (
                <span key={l.id} className="nav-locked" data-tooltip={l.tooltip || 'Em breve'} aria-disabled="true">
                  {l.label} <I.lock />
                </span>
              ) : (
                <a key={l.id}
                   href={l.href}
                   className={route === l.id ? 'active' : ''}
                   onClick={(e) => { e.preventDefault(); navigate(l.href.replace('#', '')) }}>
                  {l.label}
                </a>
              )
            ))}
          </nav>

          <div className="nav-cta">
            <LoversDropdown route={route} navigate={navigate} />
            <button className="menu-toggle" onClick={() => setMobileOpen(true)}>
              <I.menu /> Menu
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)}>
        <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
          <button className="close" onClick={() => setMobileOpen(false)}><I.close /></button>

          <div className="eyebrow mb-3">Institucional</div>
          {NAV_LINKS.map((l) => (
            l.locked ? (
              <span key={l.id} className="locked" data-tooltip={l.tooltip || 'Em breve'} aria-disabled="true"
                    style={{ opacity: .5, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'not-allowed' }}>
                {l.label} <I.lock />
              </span>
            ) : (
              <a key={l.id}
                 href={l.href}
                 onClick={(e) => { e.preventDefault(); navigate(l.href.replace('#', '')); setMobileOpen(false) }}>
                {l.label}
              </a>
            )
          ))}

          <div className="eyebrow mb-3 mt-4" style={{ borderTop: '1px solid var(--line)', paddingTop: 24 }}>
            <LoversWordmark width={100} />
          </div>
          {LOVERS_LINKS.map((l) => (
            l.locked ? (
              <span key={l.id} className="locked" data-tooltip={l.tooltip || 'Em breve'} aria-disabled="true"
                    style={{ opacity: .5, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'not-allowed' }}>
                {l.label}
                <I.lock />
              </span>
            ) : (
              <a key={l.id}
                 href={l.href}
                 style={{ color: route === l.id ? 'var(--lovers-red)' : undefined }}
                 onClick={(e) => { e.preventDefault(); navigate(l.href.replace('#', '')); setMobileOpen(false) }}>
                {l.label}
              </a>
            )
          ))}
        </div>
        </div>
      )}

      <style>{`
        .lovers-nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(135,14,45,.3);
          background: rgba(135,14,45,.06);
          color: var(--lovers-ink, var(--ink-soft));
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: .1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background .15s, border-color .15s;
          white-space: nowrap;
        }
        .lovers-nav-btn:hover,
        .lovers-nav-btn.active {
          background: rgba(135,14,45,.12);
          border-color: rgba(135,14,45,.5);
          color: var(--lovers-red);
        }
        .lovers-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 220px;
          background: var(--bg-card, #fff);
          border: 1px solid var(--line);
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(43,24,16,.12);
          overflow: hidden;
          z-index: 200;
        }
        .lovers-dropdown__header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--lovers-cream, #FFF1E6);
          border-bottom: 1px solid rgba(135,14,45,.15);
        }
        .lovers-dropdown a {
          display: block;
          padding: 11px 16px;
          font-size: 14px;
          color: var(--ink);
          text-decoration: none;
          transition: background .1s;
        }
        .lovers-dropdown a:hover { background: rgba(135,14,45,.05); }
        .lovers-dropdown a.active { color: var(--lovers-red); font-weight: 600; }
      `}</style>
    </React.Fragment>
  )
}
