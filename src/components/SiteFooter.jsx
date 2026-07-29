import React from 'react'
import { NAV_LINKS, LOCKUP_CREME } from './nav'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../config/channels'

/**
 * Rodapé institucional — redesign 2026.
 * Uma faixa com logo, navegação em linha, Instagram e contato; barra final com
 * direitos e realização. Não aparece em Edições (ver App.jsx).
 * Spec: design_handoff_site_institucional/README.md (§ Casca / Rodapé).
 */
export function SiteFooter({ navigate, route }) {
  const ir = (href) => (e) => {
    e.preventDefault()
    navigate(href.replace('#', ''))
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  const ano = 2026 // ponytail: Date.* barrado em alguns runtimes; ano da edição atual

  return (
    <footer className="scw-footer" role="contentinfo">
      <div className="scw-footer__linha">
        <a href="#/" className="scw-footer__marca" onClick={ir('#/')}>
          <img src={LOCKUP_CREME} alt="Sweet & Coffee Week" />
        </a>

        <nav className="scw-footer__nav" aria-label="Navegação do rodapé">
          {NAV_LINKS.map((l) => {
            const ativo = route === l.id
            return (
              <a
                key={l.id}
                href={l.href}
                className={ativo ? 'is-ativo' : undefined}
                aria-current={ativo ? 'page' : undefined}
                onClick={ativo ? (e) => e.preventDefault() : ir(l.href)}
              >
                {l.label}
              </a>
            )
          })}
        </nav>

        <div className="scw-footer__extras">
          <a className="scw-footer__insta" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="17" cy="7" r="1.2" fill="currentColor" />
            </svg>
            {INSTAGRAM_HANDLE}
          </a>
          <a href="#/contato" onClick={ir('#/contato')}
             style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, font: "700 14.5px/1 'Nexa Slab',sans-serif", color: 'rgba(254,240,221,.84)' }}>
            Falar com a gente
          </a>
        </div>
      </div>

      <div className="scw-footer__base">
        <span>&copy; {ano} Sweet &amp; Coffee Week · Natal e Parnamirim, RN</span>
        <span>Realização <strong>F2 Experience</strong></span>
      </div>
    </footer>
  )
}
