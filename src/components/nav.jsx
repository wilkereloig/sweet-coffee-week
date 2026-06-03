import React from 'react'
import { I, LogoMark, HeartTiny, LoversWordmark } from './icons'
import { PARTICIPANTS } from '../data/participants'
import { LOVERS_SHOW_COMBO_DETAILS } from '../config/loversRelease'

export const NAV_LINKS = [
  { id: 'home',         label: 'O Sweet',      href: '#/', locked: true },
  { id: 'curiosidades', label: 'Curiosidades', href: '#/curiosidades', locked: true },
  { id: 'edicoes',      label: 'Edições',      href: '#/edicoes',      locked: true },
  { id: 'participar',   label: 'Participar',   href: '#/participar',   locked: true },
  { id: 'apoiar',       label: 'Apoiar',       href: '#/apoiar',       locked: true },
  { id: 'contato',      label: 'Contato',      href: '#/contato',      locked: true },
]

const LOVERS_LINKS = [
  { id: 'lovers',        label: 'Sobre a edição',  sub: 'Entenda a edição',      href: '#/lovers' },
  { id: 'participantes', label: 'Participantes',    sub: 'Escolha seus combos',   href: '#/lovers/participantes' },
  { id: 'mapa',          label: 'Mapa da Doçura',   sub: 'Monte sua rota',        href: '#/lovers/mapa' },
  { id: 'premiacao',     label: 'Premiação',        sub: 'Avalie seus favoritos', href: '#/lovers/premiacao' },
]

const IS_LOVERS_ROUTE = ['home', 'lovers', 'participantes', 'combos', 'combo-detail', 'mapa', 'awards', 'premiacao', 'votar']

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
               className={`sidebar__link sidebar__link--lovers${route === l.id || (l.id === 'participantes' && (route === 'combos' || route === 'combo-detail')) || (l.id === 'premiacao' && (route === 'awards' || route === 'votar')) ? ' lovers-active' : ''}`}
               onClick={(e) => { e.preventDefault(); navigate(l.href.replace('#', '')) }}>
              <span className="sidebar__link-label">{l.label}</span>
              {l.sub && <span className="sidebar__link-sub">{l.sub}</span>}
            </a>
          )
        ))}
        <a href="#/lovers/painel"
           className={`sidebar__link sidebar__link--lovers${route === 'painel' ? ' lovers-active' : ''}`}
           onClick={(e) => { e.preventDefault(); navigate('/lovers/painel') }}>
          <span className="sidebar__link-label">Painel Sweet Awards</span>
          <span className="sidebar__link-sub">Área administrativa</span>
        </a>
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
        height={96}
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
        height={96}
        style={{
          display: 'block',
          position: 'absolute',
          top: 0, left: '50%',
          opacity: isLovers ? 1 : 0,
          transform: isLovers ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(.88)',
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
            <LoversWordmark width={96} />
            <div className="lovers-dropdown__header-sub">
              <HeartTiny size={9} color="var(--lovers-burgundy)" />
              <span>Sweet &amp; Coffee Week Lovers · 16ª edição</span>
            </div>
          </div>
          {LOVERS_LINKS.map((l) => (
            l.locked ? (
              <span key={l.id} className="locked" aria-disabled="true">
                <span style={{ flex: 1 }}>{l.label}</span>
                <span className="dropdown-soon-badge">em breve</span>
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

function LoversComboRail({ navigate, activeSlug }) {
  const participants = [...PARTICIPANTS]
    .filter(p => p.slug && p.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  return (
    <aside className="combo-rail">
      <div className="combo-rail__head">
        <span className="combo-rail__eyebrow">Participantes</span>
        <span className="combo-rail__count">{participants.length}</span>
      </div>
      <nav className="combo-rail__list">
        {participants.map(p => (
          <a key={p.slug}
             href={`#/lovers/combos/${p.slug}`}
             className={`combo-rail__item${p.slug === activeSlug ? ' is-active' : ''}`}
             onClick={(e) => { e.preventDefault(); navigate(`/lovers/combos/${p.slug}`) }}>
            <span className="combo-rail__name">{p.name}</span>
            {LOVERS_SHOW_COMBO_DETAILS && p.theme && <span className="combo-rail__theme">{p.theme}</span>}
          </a>
        ))}
      </nav>
    </aside>
  )
}

function LoversMobileNav({ route, navigate }) {
  const isActive = (id) =>
    route === id ||
    (id === 'participantes' && (route === 'combos' || route === 'combo-detail')) ||
    (id === 'premiacao' && (route === 'awards' || route === 'votar'))
  return (
    <nav className="lovers-mobile-nav" aria-label="Navegação Sweet & Coffee Week Lovers">
      <a href="#/lovers"
         className="lovers-mobile-nav__seal"
         aria-label="Sweet & Coffee Week Lovers — sobre a edição"
         onClick={(e) => { e.preventDefault(); navigate('/lovers') }}>
        <LoversWordmark width={62} />
      </a>
      <div className="lovers-mobile-nav__chips">
        {LOVERS_LINKS.map((l) => (
          <a key={l.id}
             href={l.href}
             className={`lovers-mobile-chip${isActive(l.id) ? ' is-active' : ''}`}
             aria-current={isActive(l.id) ? 'page' : undefined}
             onClick={(e) => { e.preventDefault(); navigate(l.href.replace('#', '')) }}>
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

export function SiteHeader({ route, navigate, path = '' }) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const isLovers = IS_LOVERS_ROUTE.includes(route)
  const showComboRail = route === 'participantes' || route === 'combos' || route === 'combo-detail'
  const activeSlug = route === 'combo-detail' ? path.split('/').pop() : null

  return (
    <React.Fragment>
      <SiteSidebar route={route} navigate={navigate} isLovers={isLovers} />
      {isLovers && <LoversMobileNav route={route} navigate={navigate} />}
      {showComboRail && <LoversComboRail navigate={navigate} activeSlug={activeSlug} />}

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
            <button
              className="menu-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <I.menu />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)}>
        <div className="mobile-menu mobile-menu--lovers" onClick={(e) => e.stopPropagation()}>
          <button className="close close--lovers" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><I.close /></button>

          <div className="mobile-menu__lovers-head">
            <LoversWordmark width={112} />
            <div className="mobile-menu__lovers-head-sub">Sweet &amp; Coffee Week Lovers · 16ª edição</div>
          </div>

          <div className="mobile-menu__section mobile-menu__section--lovers">
            {LOVERS_LINKS.map((l) => {
              const isActive = route === l.id
              if (l.locked) {
                return (
                  <span key={l.id} className="mobile-menu__item mobile-menu__item--locked" aria-disabled="true">
                    <span className="mobile-menu__item-label">{l.label}</span>
                    <span className="mobile-menu__item-right">
                      <span className="mobile-menu__badge">em breve</span>
                      <I.lock />
                    </span>
                  </span>
                )
              }
              return (
                <a key={l.id}
                   href={l.href}
                   className={`mobile-menu__item${isActive ? ' mobile-menu__item--active' : ''}`}
                   onClick={(e) => { e.preventDefault(); navigate(l.href.replace('#', '')); setMobileOpen(false) }}>
                  <span className="mobile-menu__item-label">{l.label}</span>
                </a>
              )
            })}
          </div>

          <div className="mobile-menu__section mobile-menu__section--institutional">
            <div className="mobile-menu__section-title">Institucional</div>
            {NAV_LINKS.map((l) => (
              l.locked ? (
                <span key={l.id} className="mobile-menu__inst-link locked" aria-disabled="true">
                  {l.label} <I.lock />
                </span>
              ) : (
                <a key={l.id}
                   href={l.href}
                   className="mobile-menu__inst-link"
                   onClick={(e) => { e.preventDefault(); navigate(l.href.replace('#', '')); setMobileOpen(false) }}>
                  {l.label}
                </a>
              )
            ))}
          </div>

          <div className="mobile-menu__section mobile-menu__section--institutional">
            <div className="mobile-menu__section-title">Administração</div>
            <a href="#/lovers/painel"
               className="mobile-menu__inst-link"
               onClick={(e) => { e.preventDefault(); navigate('/lovers/painel'); setMobileOpen(false) }}>
              Painel Sweet Awards
            </a>
          </div>

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
          width: min(320px, calc(100vw - 32px));
          background: var(--lovers-cream, #FFE8D2);
          border: 1.5px solid rgba(135,14,45,.2);
          border-radius: 20px;
          box-shadow: 0 16px 48px rgba(43,24,16,.16);
          overflow: hidden;
          z-index: 200;
        }
        .lovers-dropdown__header {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 14px 16px 12px;
          background: var(--lovers-yellow, #F5B800);
          border-bottom: 2px solid var(--lovers-pink, #F20567);
        }
        .lovers-dropdown__header-sub {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: var(--font-mono);
          font-size: 9px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--lovers-burgundy, #870E2D);
          opacity: .85;
        }
        .lovers-dropdown a {
          display: block;
          padding: 12px 16px;
          font-size: 14px;
          color: var(--lovers-brown, #3F1A0A);
          text-decoration: none;
          background: #fff;
          transition: background .1s;
          border-bottom: 1px solid rgba(135,14,45,.08);
        }
        .lovers-dropdown a:hover { background: rgba(245,184,0,.1); }
        .lovers-dropdown a.active { color: var(--lovers-burgundy); font-weight: 700; background: rgba(135,14,45,.06); }
        .dropdown-soon-badge {
          font-family: var(--font-mono);
          font-size: 8px;
          letter-spacing: .1em;
          text-transform: uppercase;
          background: var(--lovers-yellow, #F5B800);
          color: var(--lovers-brown, #3F1A0A);
          padding: 2px 6px;
          border-radius: 999px;
          white-space: nowrap;
          flex-shrink: 0;
        }
      `}</style>
    </React.Fragment>
  )
}
