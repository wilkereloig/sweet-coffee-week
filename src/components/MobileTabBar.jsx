import React from 'react'
import { precarregar } from '../pages/carregadores'
import IconeUi from './scw-icons/IconeUi'

/*
 * Barra inferior estilo aplicativo (≤900px) — redesign 2026.
 * 5 abas: festival, edições, awards, participar e "mais" (abre a folha com as
 * páginas restantes). Ícone cresce ao ativar, rótulo em peso 800 e um
 * indicador de 3px desliza entre abas.
 *
 * ⚠️ 27/08/2026 (pedido do Wilke): a cor da página deixou de pintar só o
 * ÍCONE ativo — agora pinta a BARRA INTEIRA. Antes, roxo (Awards) e marrom
 * (Apoiar) caíam num fallback amarelo em `pageColorDark()` porque sobre o
 * chocolate fixo davam 1,45:1/1,53:1, ilegíveis (§10.6). Virando a barra a
 * própria `--scw-pagina` e o ícone/rótulo `--scw-pagina-tinta` — o MESMO par
 * já testado AA no §6.2 (pior caso: laranja/chocolate 4,78:1) — o fallback
 * deixa de ser necessário: não sobra cor nenhuma que precise de exceção.
 * Ativo vs inativo continua por escala do ícone + peso do rótulo + indicador,
 * nunca por cor — não há mais "cor de página" e "cor de fallback" ao mesmo
 * tempo na barra.
 * Spec: design_handoff_site_institucional/README.md (§ Menu mobile).
 */

const ABAS = [
  { id: 'home',             label: 'festival',   href: '/',             icone: 'inicio' },
  { id: 'edicoes',          label: 'edições',    href: '/edicoes',      icone: 'edicao' },
  { id: 'historico-awards', label: 'awards',     href: '/sweet-awards', icone: 'trofeu' },
  { id: 'participar',       label: 'participar', href: '/participar',   icone: 'loja' },
  { id: 'mais',             label: 'mais',       action: 'mais',        icone: 'mais-acoes' },
]

/** Apoiar e Contato vivem dentro da folha "mais" — nessas rotas a 5ª aba acende. */
const NA_FOLHA = ['apoiar', 'contato']

export function MobileTabBar({ route, navigate, onOpenMenu, menuOpen }) {
  const indiceAtivo = (() => {
    if (menuOpen || NA_FOLHA.includes(route)) return 4
    const i = ABAS.findIndex((a) => a.id === route)
    return i < 0 ? 0 : i
  })()
  return (
    <nav className="scw-abas scw-casca-base" aria-label="Navegação rápida">
      <div className="scw-abas__grade">
        <span
          className="scw-abas__indicador"
          aria-hidden="true"
          style={{ '--scw-aba-i': indiceAtivo }}
        />
        {ABAS.map((a, i) => {
          const ehMais = a.action === 'mais'
          const ativo = i === indiceAtivo
          const conteudo = (
            <>
              <IconeUi nome={a.icone} tamanho={24} className="scw-aba__icone" />
              <span className="scw-aba__rotulo">{a.label}</span>
            </>
          )
          const cls = `scw-aba${ativo ? ' is-ativa' : ''}`

          if (ehMais) {
            return (
              <button
                key={a.id}
                type="button"
                className={cls}
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
              aria-current={ativo ? 'page' : undefined}
              aria-label={`Ir para ${a.label}`}
              onTouchStart={() => precarregar(a.id)}
              onFocus={() => precarregar(a.id)}
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
