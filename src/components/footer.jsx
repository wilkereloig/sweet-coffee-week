import React from 'react'
import { I } from './icons'
import { NAV_LINKS } from './nav'

export function SiteFooter({ navigate }) {
  const go = (path) => (e) => { e.preventDefault(); navigate(path) }
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="site-footer__top">
          <div>
            <div style={{ marginBottom: 18 }}>
              <img src="/images/logo-sweet-coffee-week-header.svg" alt="Sweet & Coffee Week" height={52} style={{ display: 'block', filter: 'brightness(0) invert(1)' }} />
            </div>
            <p style={{ color: 'rgba(255,244,236,.7)', fontSize: 15, maxWidth: 360, margin: 0 }}>
              A temporada mais doce de Natal. Um festival gastronômico que reúne marcas, sabores e cidade em uma rota de combos exclusivos.
            </p>
            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <a href="https://www.instagram.com/sweetcoffeeweek" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{
                width: 42, height: 42, borderRadius: 999,
                border: '1px solid rgba(255,244,236,.25)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}><I.ig /></a>
            </div>
          </div>

          <div>
            <h4>O festival</h4>
            <a href="#/" onClick={go('/')}>O Sweet</a>
            <a href="#/lovers" onClick={go('/lovers')}>Lovers</a>
            <a href="#/edicoes" onClick={go('/edicoes')}>Edições</a>
            <a href="#/curiosidades" onClick={go('/curiosidades')}>Curiosidades</a>
          </div>
          <div>
            <h4>Edição atual</h4>
            <span className="footer-locked" title="Em breve" aria-disabled="true">Combos <I.lock /></span>
            <span className="footer-locked" title="Em breve" aria-disabled="true">Mapa da Doçura <I.lock /></span>
            <span className="footer-locked" title="Em breve" aria-disabled="true">Sweet & Coffee Week Awards <I.lock /></span>
          </div>
          <div>
            <h4>Participar</h4>
            <a href="#/participar" onClick={go('/participar')}>Quero participar</a>
            <a href="#/apoiar" onClick={go('/apoiar')}>Quero apoiar</a>
            <a href="#/contato" onClick={go('/contato')}>Contato</a>
            <a href="mailto:imprensa@sweetcoffeeweek.com.br">Imprensa</a>
          </div>
        </div>

        <div className="site-footer__bottom">
          <div>© 2026 SWEET & COFFEE WEEK — TODOS OS DIREITOS RESERVADOS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            REALIZAÇÃO
            <span style={{
              padding: '5px 12px',
              border: '1px solid rgba(255,244,236,.25)',
              borderRadius: 999,
              color: 'var(--bg)',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 13,
              letterSpacing: 0,
              textTransform: 'none',
            }}>F2 Experience</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
