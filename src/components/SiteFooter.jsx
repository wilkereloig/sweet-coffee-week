import React from 'react'
import { INICIO_INSTITUCIONAL } from '../edicao/config'
import { NAV_LINKS, MARCA_SCW } from './nav'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../config/channels'
import { abrirPreferencias } from '../lib/consentimento'
import IconeUi from './scw-icons/IconeUi'

/* Documentos legais: ficam no rodapé de toda página, inclusive com a
   navegação reduzida (`semLinks`) — nunca no menu principal. */
export const LINKS_LEGAIS = [
  ['/privacidade', 'Política de Privacidade'],
  ['/cookies', 'Política de Cookies'],
  ['/termos', 'Termos de Uso'],
  ['/uso-de-imagem', 'Uso de imagem'],
]

/**
 * Rodapé institucional — reconstruído em 14/10/2026.
 * Três áreas (identidade · Explore · Contato), depois os documentos legais com
 * as preferências de cookies e, por fim, a base com direitos e realização.
 * Aparece nas rotas de FOOTER_ROUTES (App.jsx), Edições inclusive; nunca no
 * painel. Uma implementação só para todas as páginas.
 *
 * `semLinks` — publicação "só Participar" (18/09/2026): saem a navegação e o
 * "Fale com a gente", que levariam de volta à própria Participar. Ficam a
 * marca, o Instagram e a base. Os documentos legais e as preferências de
 * cookies ficam SEMPRE (13/10/2026).
 */
export function SiteFooter({ navigate, route, semLinks = false }) {
  const ir = (href) => (e) => {
    e.preventDefault()
    navigate(href.replace('#', ''))
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  const ano = 2026 // ponytail: Date.* barrado em alguns runtimes; ano da edição atual

  return (
    <footer className={'scw-footer' + (semLinks ? ' scw-footer--reduzido' : '')} role="contentinfo">
      <div className="scw-footer__topo">
        <a href={`#${INICIO_INSTITUCIONAL}`} className="scw-footer__marca" onClick={ir(`#${INICIO_INSTITUCIONAL}`)}>
          <img src={MARCA_SCW} alt="Sweet & Coffee Week — página inicial" />
        </a>

        <div className="scw-footer__grupos">
          {!semLinks && (
            <nav className="scw-footer__grupo scw-footer__grupo--explore" aria-labelledby="scw-footer-explore">
              <h2 id="scw-footer-explore" className="scw-footer__titulo">Explore</h2>
              <ul className="scw-footer__nav">
                {NAV_LINKS.map((l) => {
                  const ativo = route === l.id
                  return (
                    <li key={l.id}>
                      <a
                        href={l.href}
                        className={ativo ? 'is-ativo' : undefined}
                        aria-current={ativo ? 'page' : undefined}
                        onClick={ativo ? (e) => e.preventDefault() : ir(l.href)}
                      >
                        {l.label}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </nav>
          )}

          <section className="scw-footer__grupo scw-footer__grupo--contato" aria-labelledby="scw-footer-contato">
            <h2 id="scw-footer-contato" className="scw-footer__titulo">Contato</h2>
            <ul className="scw-footer__contato">
              <li>
                <a className="scw-footer__insta" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                  <IconeUi nome="instagram" tamanho={20} />
                  {INSTAGRAM_HANDLE}
                  <span className="scw-sr">(Instagram, abre em nova aba)</span>
                </a>
              </li>
              {!semLinks && (
                <li>
                  <a className="scw-footer__fale" href="#/contato" onClick={ir('#/contato')}>Fale com a gente</a>
                </li>
              )}
            </ul>
          </section>
        </div>
      </div>

      <nav className="scw-footer__legal" aria-label="Privacidade e termos">
        <ul>
          {LINKS_LEGAIS.map(([href, rotulo]) => (
            <li key={href}>
              <a href={`#${href}`} onClick={ir(`#${href}`)}>{rotulo}</a>
            </li>
          ))}
          <li className="scw-footer__pref">
            <button type="button" aria-haspopup="dialog" onClick={abrirPreferencias}>Preferências de cookies</button>
          </li>
        </ul>
      </nav>

      <div className="scw-footer__base">
        <p className="scw-footer__direitos">
          <span>&copy; {ano} Sweet &amp; Coffee Week</span>{' '}
          <span>Natal e Parnamirim, RN</span>
        </p>
        <p className="scw-footer__realiza">Realização <strong>F2 Experience</strong></p>
      </div>
    </footer>
  )
}
