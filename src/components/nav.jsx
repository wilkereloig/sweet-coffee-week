import React from 'react'
import { I } from './icons'
import { useActiveEditionBrand } from '../state/activeEditionBrand'

function LoginDropdown({ navigate }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef(null)

  React.useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey) }
  }, [open])

  const go = (path) => { setOpen(false); navigate(path) }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="login-toggle"
        onClick={() => setOpen(o => !o)}
        aria-label="Acesso"
        aria-expanded={open}
        style={{ opacity: open ? 1 : undefined }}
      >
        <I.user />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          background: '#fff', borderRadius: 14, padding: '6px',
          boxShadow: '0 8px 32px rgba(43,24,16,.18), 0 0 0 1px rgba(43,24,16,.06)',
          minWidth: 210, zIndex: 200,
        }}>
          <button
            disabled
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '10px 14px', border: 0, borderRadius: 9,
              background: 'transparent', textAlign: 'left', cursor: 'not-allowed',
              fontFamily: 'inherit', fontSize: 14, color: '#B0907C', gap: 10,
            }}
          >
            <span>Área do Participante</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', background: '#F2B6A0', color: '#6B4A3A', borderRadius: 999, padding: '2px 8px' }}>
              Em breve
            </span>
          </button>
          <button
            onClick={() => go('/painel-admin')}
            style={{
              display: 'block', width: '100%', padding: '10px 14px', border: 0, borderRadius: 9,
              background: 'transparent', textAlign: 'left', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#2B1810',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#FFF4EC'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Área Admin →
          </button>
        </div>
      )}
    </div>
  )
}

export const NAV_LINKS = [
  { id: 'home',         label: 'O Festival',   href: '#/' },
  { id: 'edicoes',      label: 'Edições',      href: '#/edicoes' },
  { id: 'historico-awards', label: 'Sweet Awards', href: '#/sweet-awards' },
  { id: 'curiosidades', label: 'Curiosidades', href: '#/curiosidades' },
  { id: 'participar',   label: 'Participar',   href: '#/participar' },
  { id: 'apoiar',       label: 'Apoiar',       href: '#/apoiar' },
  { id: 'contato',      label: 'Contato',      href: '#/contato' },
]

function SiteSidebar({ route, navigate }) {
  return (
    <aside className="site-sidebar">
      <a href="#/" className="sidebar__brand" onClick={(e) => { e.preventDefault(); navigate('/') }}
         style={{ position: 'relative', display: 'block', height: 176 }}>
        <img
          src="/images/logo-sweet-coffee-week.svg"
          alt="Sweet & Coffee Week"
          height={176}
          style={{ display: 'block' }}
        />
      </a>

      <nav className="sidebar__nav">
        <div className="sidebar__section-label">Institucional</div>
        {NAV_LINKS.map((l) => (
          <a key={l.id}
             href={l.href}
             className={`sidebar__link${route === l.id ? ' active' : ''}`}
             aria-current={route === l.id ? 'page' : undefined}
             onClick={(e) => { e.preventDefault(); navigate(l.href.replace('#', '')) }}>
            {l.label}
          </a>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      <div className="sidebar__credit">Realização<br /><a href="https://f2experience.com.br" target="_blank" rel="noopener noreferrer" aria-label="F2 Experience" style={{ display: 'inline-block', marginTop: 4 }}><img src="/images/logo-f2experience.svg" alt="F2 Experience" style={{ height: 18, width: 'auto', display: 'block' }} /></a></div>
    </aside>
  )
}

// Logos do header que se alternam a cada 10s (selo padrão ⇄ selo 10 anos),
// com crossfade + leve "carimbo". Respeita prefers-reduced-motion (fica no 1º).
const BRAND_LOGOS = [
  { src: '/images/logo-seal-sweet-coffee.svg', alt: 'Sweet & Coffee Week' },
  { src: '/images/selo-10-anos.svg', alt: 'Sweet & Coffee Week — 10 anos' },
]

function BrandLogo({ navigate, route }) {
  const isHome = route === 'home'
  const [idx, setIdx] = React.useState(0)
  const editionBrand = useActiveEditionBrand()
  const showEditionBrand = route === 'edicoes' && !!editionBrand

  React.useEffect(() => {
    if (!isHome) { setIdx(0); return }
    const reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || BRAND_LOGOS.length <= 1) return
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      setIdx((i) => (i + 1) % BRAND_LOGOS.length)
    }, 10000)
    return () => clearInterval(id)
  }, [isHome])

  return (
    <a href="#/" className="brand brand-cycle" onClick={(e) => { e.preventDefault(); navigate('/') }}>
      {showEditionBrand ? (
        <img
          key={editionBrand.logo}
          src={editionBrand.logo}
          alt={editionBrand.alt}
          height={72}
          className="brand-cycle__img brand-cycle__img--edition is-in"
          decoding="async"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      ) : (
        BRAND_LOGOS.map((l, i) => (
          <img
            key={l.src}
            src={l.src}
            alt={i === idx ? l.alt : ''}
            aria-hidden={i === idx ? undefined : 'true'}
            height={72}
            className={'brand-cycle__img' + (i === idx ? ' is-in' : '')}
            decoding="async"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ))
      )}
    </a>
  )
}

export function SiteHeader({ route, navigate }) {
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Fora da Home, logo sempre compacta (estado menor) — sem esperar scroll.
  const isCompact = scrolled || route !== 'home'
  const transparent = route !== 'painel' && !scrolled

  // Menu mobile foi extraído p/ MobileMenu (aberto pela aba "Menu" da
  // MobileTabBar, montada no App). O hambúrguer sai no mobile — header mobile
  // = logo + login. Spec: docs/superpowers/specs/2026-07-10-mobile-tabbar-nav-design.md
  return (
    <header className={`site-header${isCompact ? ' scrolled' : ''}`}>
      <div className="site-header__inner">
        <BrandLogo navigate={navigate} light={transparent} route={route} />

        <nav className="nav-main">
          {NAV_LINKS.map((l) => (
            <a key={l.id}
               href={l.href}
               className={route === l.id ? 'active' : ''}
               aria-current={route === l.id ? 'page' : undefined}
               onClick={(e) => { e.preventDefault(); navigate(l.href.replace('#', '')) }}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="nav-cta">
          <LoginDropdown navigate={navigate} />
        </div>
      </div>
    </header>
  )
}
