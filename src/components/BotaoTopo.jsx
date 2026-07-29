import React from 'react'

/*
 * Botão "Topo" — redesign 2026 (patch 29/07/2026).
 * Aparece depois de uma tela e meia de rolagem: antes disso é ruído sobre o herói.
 */
export function BotaoTopo() {
  const [ver, setVer] = React.useState(false)

  React.useEffect(() => {
    let pedido = 0
    const medir = () => { pedido = 0; setVer(window.scrollY > window.innerHeight * 1.5) }
    const aoRolar = () => { if (!pedido) pedido = window.requestAnimationFrame(medir) }
    window.addEventListener('scroll', aoRolar, { passive: true })
    medir()
    return () => { window.removeEventListener('scroll', aoRolar); if (pedido) cancelAnimationFrame(pedido) }
  }, [])

  if (!ver) return null

  const subir = () => {
    const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduz ? 'auto' : 'smooth' })
    // Foco volta ao título: quem navega por teclado não fica preso no rodapé.
    const h1 = document.querySelector('main h1')
    if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }) }
  }

  return (
    <button type="button" className="scw-topo" onClick={subir}>
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 13V3M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Topo
    </button>
  )
}
