import React from 'react'
import { INSTAGRAM_URL } from '../config/channels'

/*
 * Tela de acesso (diálogo modal) — redesign 2026, refeito em 20/08/2026 pelo
 * handoff `design_handoff_completo_2026-08/01-CASCA-E-ACESSO.md` §4.
 *
 * A mudança: os dois caminhos deixam de ter o mesmo peso, porque só um deles
 * leva a algum lugar hoje.
 *
 *   Organização    chapa chocolate + botão de ação amarelo → /organizacao/
 *   Participante   chapa bege com moldura TRACEJADA — é a mesma reserva honesta
 *                  das fotos que faltam (§6.12). Selo "em breve", sem hover,
 *                  sem botão morto: card sem destino não sobe (§6.15.6).
 *
 * A ordem inverteu de propósito — quem entra hoje vem primeiro — e a régua de
 * 5px acompanha: cyan (organização) à esquerda, roxo (participante) à direita.
 *
 * O link agora é o BOTÃO, não o card inteiro: com uma ação declarada dentro,
 * um <a> por fora aninharia interativo em interativo.
 *
 * O painel da organização é PÁGINA ESTÁTICA em public/organizacao/, fora do
 * bundle. Por isso é um <a> comum e não `navigate()`: o router só ouve
 * hashchange/popstate, então a navegação normal do navegador é o que entrega o
 * arquivo — e é justamente o que mantém o painel acessível com
 * COMING_SOON_PUBLICATION = true.
 *
 * Foco preso no diálogo, Esc fecha, foco volta ao gatilho.
 */

const ACESSOS = [
  {
    titulo: 'Organização',
    texto: 'Respostas dos formulários do site: contato, participação e apoio.',
    // A barra final não é enfeite: sem ela o servidor não resolve o índice do
    // diretório e a rota cai no fallback do SPA — ou seja, volta para a home.
    acao: { texto: 'Entrar no admin', href: '/organizacao/' },
    variante: 'destaque',
    // Prancheta com visto: gestão e apuração. A estrela fica reservada ao Sweet Awards.
    traco: 'M8 8h16v19H8zM12 8V5h8v3M12.5 18l3 3 6-7',
    // Cyan sobre chocolate fecha 4,9:1. Roxo aqui daria 1,45:1 — por isso ele
    // só aparece no card claro (§6.1).
    fundo: 'var(--scw-cyan)',
    tinta: 'var(--scw-choco)',
  },
  {
    titulo: 'Sou participante',
    texto: 'Combo, dados da edição e resultados do Sweet Awards.',
    rotulo: 'Painel · em breve',
    variante: 'reserva',
    // Toldo de loja: quem entra aqui é o estabelecimento, não o consumidor.
    // Sem linha de chão — a 21px ela encosta na borda do selo e só suja o ícone.
    traco: 'M4 12l3-6h18l3 6M6 12v14h20V12M13 26v-7h6v7',
    fundo: 'rgba(77, 37, 126, .14)',
    tinta: 'var(--scw-roxo)',
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
        aria-labelledby="scw-acesso-titulo"
        tabIndex={-1}
        ref={caixaRef}
        onKeyDown={prenderTab}
      >
        <div className="scw-acesso__topo">
          <div className="scw-acesso__marca">
            <img src="/logos/lockup-scw-creme.svg" alt="Sweet &amp; Coffee Week" />
            <span className="scw-acesso__eyebrow">Área<br />de acesso</span>
          </div>
          <button type="button" className="scw-acesso__fechar" onClick={onClose} aria-label="Fechar">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="scw-acesso__regua" aria-hidden="true" />

        <div className="scw-acesso__corpo">
          <h2 className="scw-acesso__titulo" id="scw-acesso-titulo">
            Entrar no <em className="scw-italico" style={{ color: 'var(--scw-marrom)' }}>Sweet &amp; Coffee Week</em>.
          </h2>
          <p className="scw-acesso__lead">Escolha por onde você entra.</p>

          <div className="scw-grade" style={{ '--scw-min': '260px', '--scw-gap': 'clamp(12px,1.6vw,18px)' }}>
            {ACESSOS.map((a) => (
              <div key={a.titulo} className={`scw-acesso__cartao scw-acesso__cartao--${a.variante}`}>
                <div className="scw-acesso__cabeca">
                  <span className="scw-acesso__selo" aria-hidden="true" style={{ background: a.fundo, color: a.tinta }}>
                    <svg width="21" height="21" viewBox="0 0 32 32" fill="none">
                      <path d={a.traco} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <b className="scw-h3">{a.titulo}</b>
                </div>
                <span className="scw-acesso__cartao-txt">{a.texto}</span>

                {a.acao ? (
                  <a className="scw-acesso__acao" href={a.acao.href}>
                    {a.acao.texto}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                ) : (
                  <span className="scw-acesso__espera">{a.rotulo}</span>
                )}
              </div>
            ))}
          </div>

          <div className="scw-acesso__pe">
            <p className="scw-acesso__pe-texto">
              O painel do participante ainda está em construção. Até lá, a equipe atende por aqui.
            </p>
            <a className="scw-acesso__cta" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              Falar com a equipe
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 12L12 4M6 4h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
