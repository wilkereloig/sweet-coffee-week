import React from 'react'

/*
 * Casca do site institucional — redesign 2026.
 * Spec: design_handoff_site_institucional/README.md (§ Casca).
 * Cabeçalho fixo com véu em degradê, logo transbordando metade abaixo da linha,
 * nav de 6 itens onde o item ativo vira pill sólida na cor da página, e botão
 * de acesso (ícone de chave) que abre o diálogo da área restrita.
 */

/** Cor principal por página: menu ativo, barra de 5px e selo do herói.
 *  `menu` é a variante usada no selo (Participar escurece p/ contraste). */
export const PAGE_COLORS = {
  home:                { cor: '#FDBB1A', tinta: '#3D1308', menu: '#FDBB1A' },
  edicoes:             { cor: '#01AFCC', tinta: '#3D1308', menu: '#01AFCC' },
  'historico-awards':  { cor: '#4D257E', tinta: '#FEF0DD', menu: '#4D257E' },
  participar:          { cor: '#F10767', tinta: '#FEF0DD', menu: '#D0055B' },
  apoiar:              { cor: '#B3213B', tinta: '#FEF0DD', menu: '#B3213B' },
  contato:             { cor: '#6A2C15', tinta: '#FEF0DD', menu: '#6A2C15' },
}

export const pageColor = (route) => PAGE_COLORS[route] || PAGE_COLORS.home

export const LOCKUP_CREME = '/logos/lockup-scw-creme.svg'

export const NAV_LINKS = [
  { id: 'home',              label: 'o festival',   href: '#/' },
  { id: 'edicoes',           label: 'edições',      href: '#/edicoes' },
  { id: 'historico-awards',  label: 'sweet awards', href: '#/sweet-awards' },
  { id: 'participar',        label: 'participar',   href: '#/participar' },
  { id: 'apoiar',            label: 'apoiar',       href: '#/apoiar' },
  { id: 'contato',           label: 'contato',      href: '#/contato' },
]

/** Passar o mouse mostra a cor da página — mas só amarelo e cyan têm contraste
 *  suficiente sobre o véu escuro; as demais caem no amarelo. */
function hoverColor(id) {
  const tom = pageColor(id).menu
  return tom === '#FDBB1A' || tom === '#01AFCC' ? tom : '#FDBB1A'
}

export function ChaveIcon(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="8.5" cy="8.5" r="4.2" />
      <path d="M11.6 11.6 20 20M17 17l2-2M14.4 14.4l1.6-1.6" />
    </svg>
  )
}

export function SiteHeader({ route, navigate, onOpenAccess, accessOpen }) {
  const go = (href) => (e) => {
    e.preventDefault()
    navigate(href.replace('#', ''))
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  return (
    <header className="scw-header">
      <div className="scw-header__veu" aria-hidden="true" />
      <div className="scw-header__linha">
        <a href="#/" className="scw-marca" onClick={go('#/')}>
          <img src={LOCKUP_CREME} alt="Sweet & Coffee Week" />
        </a>

        <nav className="scw-nav" aria-label="Navegação principal">
          {NAV_LINKS.map((l) => {
            const ativo = route === l.id
            const c = pageColor(l.id)
            return (
              <a
                key={l.id}
                href={l.href}
                className={ativo ? 'is-ativo' : undefined}
                aria-current={ativo ? 'page' : undefined}
                onClick={ativo ? (e) => e.preventDefault() : go(l.href)}
                style={{
                  '--scw-nav-cor': c.menu,
                  '--scw-nav-tinta': c.tinta,
                  '--scw-nav-hover': hoverColor(l.id),
                }}
              >
                {l.label}
              </a>
            )
          })}
        </nav>

        <button
          type="button"
          className="scw-acesso-topo"
          onClick={onOpenAccess}
          aria-haspopup="dialog"
          aria-expanded={!!accessOpen}
          aria-label="Acessar área restrita"
        >
          <ChaveIcon />
        </button>
      </div>
    </header>
  )
}
