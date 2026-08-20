import React from 'react'
import { NAV_LINKS, MARCA_SCW, pageColorDark } from './nav'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../config/channels'

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
      if (e.key === 'Escape') { onClose(); return }
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
      if (gatilho && typeof gatilho.focus === 'function') gatilho.focus()
    }
  }, [open, onClose])

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
        <span className="scw-folha__puxador" aria-hidden="true" />

        <div className="scw-folha__topo">
          <img src={MARCA_SCW} alt="Sweet & Coffee Week" />
          <button type="button" className="scw-folha__fechar" onClick={onClose} aria-label="Fechar menu">
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
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
                style={{ '--scw-folha-cor': pageColorDark(l.id) }}
              >
                {l.label}
                <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
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
          Área de acesso
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2.5 15.5c0-3.038 2.91-5.5 6.5-5.5s6.5 2.462 6.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <a className="scw-folha__insta" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
          {INSTAGRAM_HANDLE} no Instagram
        </a>
      </div>
    </>
  )
}
