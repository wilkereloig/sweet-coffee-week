import React from 'react'
import { I } from './icons'

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
        className="menu-toggle"
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
  { id: 'vencedores',   label: 'Sweet Awards', href: '#/vencedores' },
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

function BrandLogo({ navigate }) {
  const [idx, setIdx] = React.useState(0)

  React.useEffect(() => {
    const reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || BRAND_LOGOS.length <= 1) return
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      setIdx((i) => (i + 1) % BRAND_LOGOS.length)
    }, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <a href="#/" className="brand brand-cycle" onClick={(e) => { e.preventDefault(); navigate('/') }}>
      {BRAND_LOGOS.map((l, i) => (
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
      ))}
    </a>
  )
}

export function SiteHeader({ route, navigate }) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Menu mobile aberto: fecha com Esc e trava o scroll do fundo.
  React.useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [mobileOpen])

  // Header idêntico à Home em todas as páginas públicas: transparente sobre o
  // topo até rolar (o scrim de topo garante legibilidade do menu claro sobre
  // qualquer fundo). Painel interno fica de fora (mantém barra sólida padrão).
  const transparent = route !== 'painel' && !scrolled

  return (
    <React.Fragment>
      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <div className="site-header__inner">
          <BrandLogo navigate={navigate} light={transparent} />

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
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><I.close /></button>

            <div className="mobile-menu__section mobile-menu__section--institutional">
              <div className="mobile-menu__section-title">Institucional</div>
              {NAV_LINKS.map((l) => (
                <a key={l.id}
                   href={l.href}
                   className={`mobile-menu__inst-link${route === l.id ? ' active' : ''}`}
                   aria-current={route === l.id ? 'page' : undefined}
                   onClick={(e) => { e.preventDefault(); navigate(l.href.replace('#', '')); setMobileOpen(false) }}>
                  {l.label}
                </a>
              ))}
            </div>

            <div className="mobile-menu__section" style={{ borderTop: '1px solid rgba(242,182,160,.4)', paddingTop: 20, marginTop: 4 }}>
              <div className="mobile-menu__section-title">Acesso</div>
              <button
                disabled
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 0', border: 0, background: 'transparent', textAlign: 'left', fontFamily: 'inherit', fontSize: 15, color: '#B0907C', cursor: 'not-allowed' }}
              >
                <span>Área do Participante</span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: '#F2B6A0', color: '#6B4A3A', borderRadius: 999, padding: '2px 8px' }}>Em breve</span>
              </button>
              <button
                style={{ display: 'block', width: '100%', padding: '10px 0', border: 0, background: 'transparent', textAlign: 'left', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#2B1810', cursor: 'pointer' }}
                onClick={() => { navigate('/painel-admin'); setMobileOpen(false) }}
              >
                Área Admin →
              </button>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  )
}
