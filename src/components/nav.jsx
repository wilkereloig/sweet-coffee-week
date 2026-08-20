import React from 'react'

/*
 * Casca do site institucional — redesign 2026.
 * Spec: design_handoff_site_institucional/README.md (§ Casca).
 * Cabeçalho fixo com véu em degradê, logo transbordando metade abaixo da linha,
 * nav de 6 itens onde o item ativo vira pill sólida na cor da página, e botão
 * de acesso (ícone de chave) que abre o diálogo da área restrita.
 */

/** Cor principal por página: menu ativo, barra de 5px e selo do herói.
 *  `menu` é a variante usada no selo (Participar escurece p/ contraste).
 *  Apoiar (cyan) e Contato (bege) — redesign 29/07/2026. */
export const PAGE_COLORS = {
  home:                { cor: '#FDBB1A', tinta: '#3D1308', menu: '#FDBB1A' },
  edicoes:             { cor: '#FF4810', tinta: '#3D1308', menu: '#FF4810' },
  'historico-awards':  { cor: '#4D257E', tinta: '#FEF0DD', menu: '#4D257E' },
  // Participar herdou o cyan de Apoiar e Apoiar ficou com o marrom (PATCH 01,
  // ago/2026): as duas fecham AA na pill do menu com a própria cor, então o
  // desvio para chocolate que o magenta exigia deixou de existir.
  participar:          { cor: '#01AFCC', tinta: '#3D1308', menu: '#01AFCC' },
  apoiar:              { cor: '#6A2C15', tinta: '#FEF0DD', menu: '#6A2C15' },
  contato:             { cor: '#F8E4C1', tinta: '#3D1308', menu: '#F8E4C1' },
}

export const pageColor = (route) => PAGE_COLORS[route] || PAGE_COLORS.home

/** Variante para superfície ESCURA (rodapé, folha do menu, barra de abas):
 *  sobre chocolate, roxo dá 1,45:1 e marrom 1,53:1 — ilegível. Essas duas caem
 *  no amarelo (9,5:1), que é o que o PATCH 01 §1.1 manda usar para ESCREVER
 *  sobre chocolate. Laranja (4,78:1) e cyan (6,23:1) passam e ficam. */
const MENU_ESCURO = {
  home: '#FDBB1A', edicoes: '#FF4810', 'historico-awards': '#FDBB1A',
  participar: '#01AFCC', apoiar: '#FDBB1A', contato: '#F8E4C1',
}
export const pageColorDark = (id) => MENU_ESCURO[id] || '#FDBB1A'

/* Marca do cabeçalho, da folha "mais" e do rodapé. O selo tem disco escuro
   (#381610) e letras creme — sobre o véu chocolate do header o disco some e
   ficam as letras; é o comportamento esperado da peça. */
export const MARCA_SCW = '/images/logo-seal-sweet-coffee.svg'

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

/*
 * `apenasAcesso` — cabeçalho reduzido ao botão de acesso, para a landing
 * /em-breve. Ela é a única página pública enquanto o gate está ligado, e as
 * rotas do menu não existem para o visitante: um link para /participar levaria
 * de volta à própria landing. Então some a navegação e some a marca, que a
 * landing já traz em tamanho grande no herói.
 *
 * É variante, não cópia: o botão, o aria e a geometria continuam sendo os
 * mesmos deste componente (§5.3).
 */
export function SiteHeader({ route, navigate, onOpenAccess, accessOpen, apenasAcesso = false }) {
  // Rolou → o véu do cabeçalho fecha, para o menu não competir com a foto que
  // passa por baixo. Só a opacidade do véu muda: a geometria (padding de 50px,
  // logo transbordando metade abaixo da linha) é regra estrutural do §4.1 e
  // encolher o cabeçalho tiraria a logo do lugar.
  const [rolado, setRolado] = React.useState(false)
  React.useEffect(() => {
    let pedido = 0
    const medir = () => {
      pedido = 0
      setRolado(window.scrollY > 40)
    }
    const aoRolar = () => { if (!pedido) pedido = window.requestAnimationFrame(medir) }
    medir()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => {
      window.removeEventListener('scroll', aoRolar)
      if (pedido) window.cancelAnimationFrame(pedido)
    }
  }, [])

  const go = (href) => (e) => {
    e.preventDefault()
    navigate(href.replace('#', ''))
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  return (
    <header className={'scw-header' + (rolado ? ' is-rolado' : '') + (apenasAcesso ? ' scw-header--so-acesso' : '')}>
      <div className="scw-header__veu" aria-hidden="true" />
      <div className="scw-header__linha">
        {!apenasAcesso && (
        <a href="#/" className="scw-marca" onClick={go('#/')}>
          <img src={MARCA_SCW} alt="Sweet & Coffee Week" />
        </a>
        )}

        {!apenasAcesso && (
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
        )}

        <button
          type="button"
          className="scw-acesso-topo"
          onClick={onOpenAccess}
          aria-haspopup="dialog"
          aria-expanded={!!accessOpen}
          aria-label="Acessar área restrita"
        >
          <ChaveIcon width="17" height="17" strokeWidth="2" />
          <span>Acesso</span>
        </button>
      </div>
    </header>
  )
}
