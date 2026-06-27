import React from 'react'
import { I } from './icons'

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

  // Home: barra transparente sobre o hero escuro até rolar; demais páginas: sólida.
  const transparent = route === 'home' && !scrolled

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
                 onClick={(e) => { e.preventDefault(); navigate(l.href.replace('#', '')) }}>
                {l.label}
              </a>
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
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><I.close /></button>

            <div className="mobile-menu__section mobile-menu__section--institutional">
              <div className="mobile-menu__section-title">Institucional</div>
              {NAV_LINKS.map((l) => (
                <a key={l.id}
                   href={l.href}
                   className="mobile-menu__inst-link"
                   onClick={(e) => { e.preventDefault(); navigate(l.href.replace('#', '')); setMobileOpen(false) }}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  )
}
