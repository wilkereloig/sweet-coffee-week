import React from 'react'
import { NAV_LINKS } from './nav'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../config/channels'

/**
 * Rodapé institucional do Sweet & Coffee Week.
 * Componente global do institucional — usar em todas as páginas institucionais,
 * exceto o painel interno (ver App.jsx). Segue a régua de espaçamento/container
 * da Home (.section + .wrap). Doc: src/design/SITE_DIRECTION.md (§ Rodapé).
 *
 * Três colunas: identidade · navegação · convite (CTA Participar + canal de ideias
 * no Instagram). Sem formulário no rodapé — coleta de ideias fica no canal real
 * (Instagram); briefing de participação vive na página Participar.
 */
export function SiteFooter({ navigate }) {
  const go = (href) => (e) => {
    e.preventDefault()
    navigate(href.replace('#', ''))
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  const year = 2026 // ponytail: Date.* barred em alguns runtimes; ano da edição atual

  return (
    <footer className="section site-footer" role="contentinfo">
      <div className="wrap">
        <div className="site-footer__grid">
          {/* Identidade */}
          <div className="site-footer__col site-footer__brand">
            <a href="#/" className="site-footer__name" onClick={go('#/')}>Sweet &amp; Coffee Week</a>
            <p className="site-footer__tagline">
              O festival que transforma Natal em uma rota de sabores, encontros e descobertas.
            </p>
            <a className="site-footer__ig" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              {INSTAGRAM_HANDLE}
            </a>
          </div>

          {/* Navegação institucional — mesma navegação interna do header */}
          <nav className="site-footer__col site-footer__nav" aria-label="Navegação institucional">
            <h3 className="site-footer__h">Navegue</h3>
            <ul>
              {NAV_LINKS.map((l) => (
                <li key={l.id}>
                  <a href={l.href} onClick={go(l.href)}>{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Convite — CTA de participação + canal real de ideias */}
          <div className="site-footer__col site-footer__cta">
            <h3 className="site-footer__h">Faça parte da próxima edição</h3>
            <p className="site-footer__cta-help">
              Leve sua marca pro festival ou mande sua ideia de tema e participante — a gente lê tudo.
            </p>
            <a className="site-footer__cta-btn" href="#/participar" onClick={go('#/participar')}>
              Quero participar
            </a>
            <a className="site-footer__cta-ig" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              Enviar ideia no Instagram &rarr;
            </a>
          </div>
        </div>

        <div className="site-footer__base">
          <span>&copy; {year} Sweet &amp; Coffee Week</span>
          <span className="site-footer__base-realiza">Realização <strong>F2 Experience</strong></span>
        </div>
      </div>
    </footer>
  )
}
