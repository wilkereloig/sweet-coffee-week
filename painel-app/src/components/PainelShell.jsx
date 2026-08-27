import React from 'react'

export const DESTINOS = ['mesa', 'respostas', 'participantes', 'producao', 'equipe']

export const TITULOS = {
  mesa: ['A mesa', 'onde cada marca está'],
  respostas: ['Respostas', 'dos formulários do site'],
  participantes: ['Marcas', 'com acesso ao cadastro'],
  producao: ['Produção', 'pedidos, arquivos e fotos'],
  equipe: ['Equipe', 'edição e contas'],
}

// Uma cor da paleta fechada por vista, nunca repetida (CLAUDE.md §6.3).
const ACENTO_VISTA = { mesa: 'amarelo', respostas: 'cyan', participantes: 'roxo', producao: 'laranja', equipe: 'marrom' }

const ICONE = {
  mesa: <><path d="M5 20V11" /><path d="M12 20V5" /><path d="M19 20v-6" /><path d="M3.5 20h17" /></>,
  respostas: <><path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.1A7.5 7.5 0 1 1 20 12Z" /><path d="M9 11h6" /><path d="M9 14.5h3.5" /></>,
  // ⚠️ participantes/producao/equipe ganham ícone real na Fase 2, junto da
  // vista de verdade — copiar de public/painel/index.html na hora, não
  // adivinhar aqui.
  participantes: <circle cx="12" cy="12" r="8" />,
  producao: <rect x="4" y="4" width="16" height="16" />,
  equipe: <path d="M4 12h16" />,
}

function aplicarAcento(vista) {
  const cor = ACENTO_VISTA[vista] || 'amarelo'
  const escura = cor === 'roxo' || cor === 'marrom'
  document.body.style.setProperty('--pn-acento', 'var(--scw-' + cor + ')')
  document.body.style.setProperty('--pn-acento-tinta', 'var(--scw-' + (escura ? 'creme' : 'choco') + ')')
  document.body.style.setProperty('--pn-acento-escuro', 'var(--scw-' + (escura ? 'amarelo' : cor) + ')')
}

export function PainelShell({ vistas, onSair }) {
  const [vista, setVista] = React.useState('respostas') // Fase 1: mesa não existe ainda

  React.useEffect(() => { aplicarAcento(vista) }, [vista])

  const [titulo, sub] = TITULOS[vista] || TITULOS.respostas
  const Vista = vistas[vista]

  return (
    <>
      <nav className="pn-rail" aria-label="Seções do painel">
        <img className="pn-rail__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        {DESTINOS.map((d) => (
          <button
            key={d}
            className={'pn-rail__btn' + (d === vista ? ' is-ativa' : '')}
            type="button"
            title={TITULOS[d][0]}
            onClick={() => setVista(d)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONE[d]}
            </svg>
          </button>
        ))}
      </nav>

      <header className="pn-cabeca">
        <img className="pn-cabeca__marca" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        <div className="pn-cabeca__texto">
          <p className="pn-cabeca__titulo">{titulo}</p>
          <p className="pn-cabeca__sub">{sub}</p>
        </div>
        <div className="pn-cabeca__dir">
          <button className="pn-cabeca__btn" type="button" aria-label="Sair" onClick={onSair}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8.6 17.6 15 11l-6.4-6.6" /><path d="M15 11H3.4" /><path d="M18.6 4.4v13.2" />
            </svg>
          </button>
        </div>
      </header>

      <main className="og-corpo">
        {Vista ? <Vista /> : <p>Em construção — chega na Fase 2.</p>}
      </main>
    </>
  )
}
