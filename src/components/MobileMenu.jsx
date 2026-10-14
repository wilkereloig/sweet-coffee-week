import React from 'react'
import { NAV_LINKS, MARCA_SCW, pageColorDark, ChaveIcon } from './nav'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../config/channels'
import { useArrastarFechar } from '../hooks/useArrastarFechar'
import { precarregar } from '../pages/carregadores'
import { LINKS_LEGAIS } from './SiteFooter'
import { abrirPreferencias } from '../lib/consentimento'
import IconeUi from './scw-icons/IconeUi'

/*
 * Folha "mais" do mobile — redesign 2026.
 * Sobe da base (@keyframes scwFolha) com as páginas restantes, o acesso e o
 * Instagram. Estado controlado por fora (App), aberta pela 5ª aba da tab bar.
 * Esc fecha, trava o scroll do fundo e devolve o foco ao gatilho.
 * Spec: design_handoff_site_institucional/README.md (§ Menu mobile).
 */
/* Duração de saída da folha — espelha .scw-folha.is-fechando em scw-motion.css. */
const SAIDA = 260

export function MobileMenu({ open, route, navigate, onClose, onOpenAccess }) {
  const folhaRef = React.useRef(null)
  const puxadorRef = useArrastarFechar(onClose)
  // A folha entra por animação mas sumia seca ao fechar. Ela sobrevive ao
  // `open: false` pelo tempo da animação de saída e só então desmonta.
  const [montada, setMontada] = React.useState(open)
  const [fechando, setFechando] = React.useState(false)

  React.useEffect(() => {
    if (open) { setMontada(true); setFechando(false); return }
    if (!montada) return
    const semMovimento =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (semMovimento) { setMontada(false); return }
    setFechando(true)
    const t = window.setTimeout(() => { setMontada(false); setFechando(false) }, SAIDA)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  /* `onClose` chega do App como função nova a cada render. Com ele na lista de
     dependências, qualquer re-render com a folha aberta desfazia e refazia o
     efeito: o foco voltava ao gatilho e pulava de novo para o "fechar". */
  const fecharRef = React.useRef(onClose)
  fecharRef.current = onClose

  React.useEffect(() => {
    if (!open) return
    const gatilho = document.activeElement
    const folha = folhaRef.current
    const focaveis = () => (folha
      ? [...folha.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')]
      : [])

    const fechar = folha && folha.querySelector('.scw-folha__fechar')
    if (fechar) fechar.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') { fecharRef.current(); return }
      if (e.key !== 'Tab') return
      const itens = focaveis()
      if (!itens.length) return
      const primeiro = itens[0]
      const ultimo = itens[itens.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', onKey)
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflowAnterior
      // Só devolve o foco se ele ainda estiver na folha (ou solto no body):
      // quem fechou navegando já teve o foco levado ao conteúdo pelo App.
      const ativo = document.activeElement
      const soltou = !ativo || ativo === document.body || (folha && folha.contains(ativo))
      if (soltou && gatilho && typeof gatilho.focus === 'function') gatilho.focus()
    }
  }, [open])

  if (!montada) return null

  const ir = (href) => (e) => {
    e.preventDefault()
    navigate(href.replace('#', ''))
    onClose()
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  return (
    <>
      <div
        className={'scw-folha-veu' + (fechando ? ' is-fechando' : '')}
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        className={'scw-folha' + (fechando ? ' is-fechando' : '')}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        aria-hidden={fechando ? 'true' : undefined}
        ref={folhaRef}
      >
        <span className="scw-folha__puxador" aria-hidden="true" ref={puxadorRef} />

        <div className="scw-folha__topo">
          <img src={MARCA_SCW} alt="Sweet & Coffee Week" />
          <button type="button" className="scw-folha__fechar" onClick={onClose} aria-label="Fechar menu">
            <IconeUi nome="fechar" tamanho={20} />
          </button>
        </div>

        <nav className="scw-folha__nav" aria-label="Navegação principal">
          {NAV_LINKS.map((l) => {
            const ativo = route === l.id
            return (
              <a
                key={l.id}
                href={l.href}
                className={ativo ? 'is-ativo' : undefined}
                aria-current={ativo ? 'page' : undefined}
                onClick={ativo ? (e) => { e.preventDefault(); onClose() } : ir(l.href)}
                onTouchStart={() => precarregar(l.id)}
                onFocus={() => precarregar(l.id)}
                style={{ '--scw-folha-cor': pageColorDark(l.id) }}
              >
                {l.label}
                <IconeUi nome="seta-direita" tamanho={20} />
              </a>
            )
          })}
        </nav>

        <button
          type="button"
          className="scw-folha__acesso"
          onClick={() => { onClose(); if (onOpenAccess) onOpenAccess() }}
          aria-haspopup="dialog"
        >
          Painel SCW
          <ChaveIcon />
        </button>

        <a className="scw-folha__insta" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
          {INSTAGRAM_HANDLE} no Instagram
        </a>

        {/* Privacidade: a folha é a navegação inteira no celular, inclusive em
            Edições, que não tem o rodapé comum. */}
        <div className="scw-folha__legal">
          {LINKS_LEGAIS.map(([href, rotulo]) => (
            <a key={href} href={`#${href}`} onClick={(e) => { e.preventDefault(); onClose(); navigate(href) }}>{rotulo}</a>
          ))}
          <button type="button" aria-haspopup="dialog" onClick={() => { onClose(); abrirPreferencias() }}>
            Preferências de cookies
          </button>
        </div>
      </div>
    </>
  )
}
