import React from 'react'
import { pageColor } from './nav'

/*
 * Barra inferior estilo aplicativo (≤900px) — redesign 2026.
 * 5 abas: festival, edições, awards, participar e "mais" (abre a folha com as
 * páginas restantes). Ícone cresce ao ativar, rótulo assume a cor da página e
 * um indicador de 3px desliza entre abas.
 * Spec: design_handoff_site_institucional/README.md (§ Menu mobile).
 */

const ABAS = [
  { id: 'home',             label: 'festival',   href: '/',             traco: <><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10.5V20h12v-9.5" /><path d="M10 20v-5h4v5" /></> },
  { id: 'edicoes',          label: 'edições',    href: '/edicoes',      traco: <><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16" /><path d="M8.5 3v3M15.5 3v3" /><path d="M8.5 14h3" /></> },
  { id: 'historico-awards', label: 'awards',     href: '/sweet-awards', traco: <><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" /><path d="M8 5H5.5v1.5A3.5 3.5 0 0 0 8.6 10" /><path d="M16 5h2.5v1.5A3.5 3.5 0 0 1 15.4 10" /><path d="M12 12v4" /><path d="M8.5 20h7" /><path d="M9.8 16h4.4l.6 4H9.2l.6-4Z" /></> },
  { id: 'participar',       label: 'participar', href: '/participar',   traco: <><path d="M4 9h16v11H4z" /><path d="M4 9l2-4h12l2 4" /><path d="M12 12.5v5M9.5 15h5" /></> },
  { id: 'mais',             label: 'mais',       action: 'mais',        traco: <><circle cx="6" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="18" cy="12" r="1.4" /></> },
]

/** Apoiar e Contato vivem dentro da folha "mais" — nessas rotas a 5ª aba acende. */
const NA_FOLHA = ['apoiar', 'contato']

export function MobileTabBar({ route, navigate, onOpenMenu, menuOpen }) {
  const indiceAtivo = (() => {
    if (menuOpen || NA_FOLHA.includes(route)) return 4
    const i = ABAS.findIndex((a) => a.id === route)
    return i < 0 ? 0 : i
  })()
  const corIndicador = indiceAtivo === 4 ? '#FDBB1A' : pageColor(ABAS[indiceAtivo].id).menu

  return (
    <nav className="scw-abas" aria-label="Navegação rápida">
      <div className="scw-abas__grade">
        <span
          className="scw-abas__indicador"
          aria-hidden="true"
          style={{ '--scw-aba-i': indiceAtivo, '--scw-aba-cor': corIndicador }}
        />
        {ABAS.map((a, i) => {
          const ehMais = a.action === 'mais'
          const ativo = i === indiceAtivo
          const tom = ehMais ? '#FDBB1A' : pageColor(a.id).menu
          const conteudo = (
            <>
              <svg
                className="scw-aba__icone"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {a.traco}
              </svg>
              <span className="scw-aba__rotulo">{a.label}</span>
            </>
          )
          const cls = `scw-aba${ativo ? ' is-ativa' : ''}`
          const estilo = { '--scw-aba-tom': tom }

          if (ehMais) {
            return (
              <button
                key={a.id}
                type="button"
                className={cls}
                style={estilo}
                onClick={onOpenMenu}
                aria-haspopup="dialog"
                aria-expanded={!!menuOpen}
                aria-label="Mais páginas do site"
              >
                {conteudo}
              </button>
            )
          }
          return (
            <a
              key={a.id}
              href={`#${a.href}`}
              className={cls}
              style={estilo}
              aria-current={ativo ? 'page' : undefined}
              aria-label={`Ir para ${a.label}`}
              onClick={(e) => {
                e.preventDefault()
                navigate(a.href)
                if (typeof window !== 'undefined') window.scrollTo(0, 0)
              }}
            >
              {conteudo}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
