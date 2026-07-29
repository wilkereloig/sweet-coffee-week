import React from 'react'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../config/channels'

/*
 * Tela de acesso (diálogo modal) — redesign 2026.
 * Dois cartões com borda tracejada e selo "em breve": não são botões, porque os
 * painéis ainda não existem. Foco preso no diálogo, Esc fecha, foco volta ao
 * gatilho. Spec: design_handoff_site_institucional/README.md (§ Tela de acesso).
 */

const ACESSOS = [
  {
    titulo: 'Sou participante',
    texto: 'Marcas inscritas acompanham o combo, os dados da edição e os resultados do Sweet Awards.',
    rotulo: 'Painel · em breve',
    traco: 'M7 11h13v6a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6v-6ZM20 13h3a3 3 0 0 1 0 6h-3M5 27h17',
    fundo: '#4D257E',
  },
  {
    titulo: 'Organização',
    texto: 'Equipe do festival gerencia participantes, conteúdo das edições e apuração da premiação.',
    rotulo: 'Admin · em breve',
    traco: 'M16 5l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2-6.5-3.5-6.5 3.5 1.3-7.2-5.3-5.1 7.3-1L16 5Z',
    fundo: '#01AFCC',
  },
]

const FOCAVEIS = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'

export function AccessDialog({ open, onClose }) {
  const caixaRef = React.useRef(null)

  React.useEffect(() => {
    if (!open) return
    const gatilho = document.activeElement
    document.body.style.overflow = 'hidden'
    if (caixaRef.current) caixaRef.current.focus()

    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      if (gatilho && typeof gatilho.focus === 'function') gatilho.focus()
    }
  }, [open, onClose])

  if (!open) return null

  // Trap de foco: Tab não escapa do diálogo.
  const prenderTab = (ev) => {
    if (ev.key !== 'Tab') return
    const caixa = caixaRef.current
    if (!caixa) return
    const itens = [...caixa.querySelectorAll(FOCAVEIS)]
    if (!itens.length) return
    const primeiro = itens[0]
    const ultimo = itens[itens.length - 1]
    if (ev.shiftKey && document.activeElement === primeiro) { ev.preventDefault(); ultimo.focus() }
    else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primeiro.focus() }
  }

  return (
    <div className="scw-acesso" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className="scw-acesso__caixa"
        role="dialog"
        aria-modal="true"
        aria-label="Área de acesso"
        tabIndex={-1}
        ref={caixaRef}
        onKeyDown={prenderTab}
      >
        <button type="button" className="scw-acesso__fechar" onClick={onClose} aria-label="Fechar">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </button>

        <span className="scw-rotulo">Área de acesso</span>
        <h2 className="scw-acesso__titulo">
          Entrar no <em className="scw-italico" style={{ color: '#B3213B' }}>Sweet &amp; Coffee Week</em>.
        </h2>
        <p className="scw-corpo" style={{ margin: '14px 0 clamp(22px,2.6vw,32px)', maxWidth: '52ch', color: '#6A2C15' }}>
          Escolha por onde você entra. Cada acesso leva a um painel diferente — um para as marcas
          participantes, outro para a organização do festival.
        </p>

        <div className="scw-grade" style={{ '--scw-min': '260px', '--scw-gap': 'clamp(12px,1.6vw,18px)' }}>
          {ACESSOS.map((a) => (
            <div key={a.titulo} className="scw-acesso__cartao">
              <span className="scw-acesso__selo" aria-hidden="true" style={{ background: a.fundo }}>
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                  <path d={a.traco} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <b className="scw-h3">{a.titulo}</b>
              <span className="scw-corpo" style={{ fontSize: 14.5, color: '#6A2C15' }}>{a.texto}</span>
              <span className="scw-pill scw-pill--bege" style={{ marginTop: 6, fontSize: 11, letterSpacing: '.12em' }}>
                {a.rotulo}
              </span>
            </div>
          ))}
        </div>

        <p
          className="scw-corpo"
          style={{
            margin: 'clamp(20px,2.4vw,28px) 0 0',
            paddingTop: 'clamp(16px,1.8vw,22px)',
            borderTop: '1px solid #EBD6B4',
            fontSize: 13.5,
            color: '#6A2C15',
          }}
        >
          Os painéis estão em construção. Enquanto isso, marcas e organização falam com a equipe pelo{' '}
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 800, color: '#B3213B' }}>
            {INSTAGRAM_HANDLE}
          </a>.
        </p>
      </div>
    </div>
  )
}
