import React from 'react'
import { I } from './icons'
import { NAV_LINKS } from './nav'

/*
 * Menu full-screen do mobile. Extraído do SiteHeader — estado controlado por
 * fora (App), aberto pela aba "Menu" da MobileTabBar. Esc fecha, trava scroll
 * do fundo enquanto aberto. Spec:
 * docs/superpowers/specs/2026-07-10-mobile-tabbar-nav-design.md
 */
export function MobileMenu({ open, route, navigate, onClose }) {
  const dialogRef = React.useRef(null)

  React.useEffect(() => {
    if (!open) return
    const opener = document.activeElement // gatilho, para devolver o foco ao fechar
    const dialog = dialogRef.current
    const focusables = () => (dialog
      ? dialog.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')
      : [])

    // Foco inicial dentro do menu (botão fechar).
    const closeBtn = dialog && dialog.querySelector('.close')
    if (closeBtn) closeBtn.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      // Trap de foco: Tab não escapa do dialog modal.
      const items = focusables()
      if (!items.length) return
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus() }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus() }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      if (opener && typeof opener.focus === 'function') opener.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const go = (path) => (e) => { e.preventDefault(); navigate(path); onClose() }

  return (
    <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" ref={dialogRef}>
      <div className="mobile-menu__top">
        <a href="#/" className="mobile-menu__brand" onClick={go('/')}>
          <img src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" height={40} />
        </a>
        <button className="close" onClick={onClose} aria-label="Fechar menu"><I.close /></button>
      </div>

      <nav className="mobile-menu__section mobile-menu__section--institutional" aria-label="Institucional">
        {NAV_LINKS.map((l, i) => (
          <a key={l.id}
             href={l.href}
             className={`mobile-menu__inst-link${route === l.id ? ' active' : ''}`}
             aria-current={route === l.id ? 'page' : undefined}
             onClick={go(l.href.replace('#', ''))}>
            <span className="mobile-menu__inst-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <span className="mobile-menu__inst-label">{l.label}</span>
          </a>
        ))}
      </nav>

      <div className="mobile-menu__section mobile-menu__section--access">
        <div className="mobile-menu__section-title">Acesso</div>
        <button type="button" className="mobile-menu__access-btn" disabled>
          <span>Área do Participante</span>
          <span className="mobile-menu__badge">Em breve</span>
        </button>
        <button
          type="button"
          className="mobile-menu__access-btn mobile-menu__access-btn--admin"
          onClick={go('/painel-admin')}
        >
          Área Admin →
        </button>
      </div>

      <div className="mobile-menu__footer">
        <a className="mobile-menu__ig" href="https://instagram.com/sweetcoffeeweek" target="_blank" rel="noopener noreferrer">@sweetcoffeeweek</a>
        <span className="mobile-menu__credit">Realização F2 Experience</span>
      </div>
    </div>
  )
}
