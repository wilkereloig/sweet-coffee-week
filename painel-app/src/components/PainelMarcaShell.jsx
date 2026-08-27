import React from 'react'

/*
 * Casca do painel da MARCA — rail (desktop), cabeça e abas (mobile). Porte
 * de public/painel/index.html: rail + cabeça (linhas 1428-1463) e abas
 * (1675-1720). Mesmo padrão de PainelShell.jsx (organização): recebe
 * `vistas` por prop e cai no placeholder quando a chave ainda não existe —
 * a próxima fase só PREENCHE `vistas`, não precisa tocar este arquivo.
 */
const DESTINOS = ['hoje', 'cadastro', 'pedidos', 'arquivos']
const TITULOS = { hoje: 'Hoje', cadastro: 'Cadastro', pedidos: 'Pedidos', arquivos: 'Arquivos' }

// Uma cor da paleta fechada por vista, nunca repetida (CLAUDE.md §6.3) —
// mesmo ciclo de ACENTO_VISTA_MARCA em public/painel/index.html.
const ACENTO_VISTA = { hoje: 'amarelo', cadastro: 'cyan', pedidos: 'laranja', arquivos: 'roxo' }

const ICONE = {
  hoje: <><circle cx="16" cy="17.4" r="10.4" /><path d="M16 12v5.4l4.2 2.6" /><path d="M13.6 3.4h4.8M16 5v2.6" /></>,
  cadastro: <>
    <path d="M6.6 6.4h18.8a2 2 0 0 1 2 2v15.2a2 2 0 0 1-2 2H6.6a2 2 0 0 1-2-2V8.4a2 2 0 0 1 2-2Z" />
    <rect x="8.4" y="10.4" width="7.2" height="7.2" rx="1.6" fill="currentColor" stroke="none" />
    <path d="M18.8 11.6h5.2M18.8 15.8h5.2M8.4 21.6h15.6" strokeWidth="2.4" />
  </>,
  pedidos: <><path d="M16 5.2 28.8 26.8H3.2L16 5.2Z" /><path d="M16 13v5.6" /><circle cx="16" cy="22.6" r="1.5" fill="currentColor" stroke="none" /></>,
  arquivos: <><path d="M16 5v14.4" /><path d="M9.4 13.6 16 20.2l6.6-6.6" /><path d="M6 25.8h20" /></>,
}

const ICONE_SAIR = <><path d="M8.6 17.6 15 11l-6.4-6.6" /><path d="M15 11H3.4" /><path d="M18.6 4.4v13.2" /></>
const ICONE_SINO = <><path d="M12 4.4c-3 0-5.4 2.4-5.4 5.6v3.3L5 16.6h14l-1.6-3.3v-3.3c0-3.2-2.4-5.6-5.4-5.6Z" /><path d="M10 19.2a2 2 0 0 0 4 0" /></>

function aplicarAcento(vista) {
  const cor = ACENTO_VISTA[vista] || 'amarelo'
  // roxo é chapa escura (texto creme); amarelo/cyan/laranja são chapa clara —
  // mesma régua de CLAUDE.md §6.2/§6.3 que o lado organização já aplica.
  const escura = cor === 'roxo'
  document.body.style.setProperty('--pn-acento', 'var(--scw-' + cor + ')')
  document.body.style.setProperty('--pn-acento-tinta', 'var(--scw-' + (escura ? 'creme' : 'choco') + ')')
  document.body.style.setProperty('--pn-acento-escuro', 'var(--scw-' + (escura ? 'amarelo' : cor) + ')')
}

export function PainelMarcaShell({ vistas = {}, onSair }) {
  const [vista, setVista] = React.useState('hoje')

  React.useEffect(() => { aplicarAcento(vista) }, [vista])

  const Vista = vistas[vista]

  return (
    <div className="pn-casca">
      <nav className="pn-rail" aria-label="Seções">
        <img className="pn-rail__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        {DESTINOS.map((d) => (
          <button
            key={d}
            className="pn-rail__btn"
            type="button"
            title={TITULOS[d]}
            aria-current={d === vista ? 'page' : undefined}
            onClick={() => setVista(d)}
          >
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONE[d]}
            </svg>
          </button>
        ))}
        <button className="pn-rail__sair" type="button" title="Sair" onClick={onSair}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONE_SAIR}</svg>
        </button>
      </nav>

      <header className="pn-cabeca">
        <img className="pn-cabeca__marca" src="/images/logo-seal-sweet-coffee.svg" alt="" />
        <span className="pn-cabeca__texto">
          <p className="pn-cabeca__titulo">{TITULOS[vista]}</p>
          <p className="pn-cabeca__sub"></p>
        </span>
        <span className="pn-cabeca__dir">
          {/* ponytail: notificações da marca ficam para a fase que traz as vistas reais e o carregamento de dados */}
          <button type="button" className="notif" aria-label="Notificações">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONE_SINO}</svg>
            <span className="pn-badge is-novo" hidden></span>
          </button>
          <button type="button" className="notif" aria-label="Sair" onClick={onSair}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONE_SAIR}</svg>
          </button>
        </span>
      </header>

      <main className="pn-vista">
        <div className="pn-vista__trilho">
          {Vista ? <Vista /> : <p>Em construção.</p>}
        </div>
      </main>

      <nav className="pn-abas" aria-label="Seções">
        <div className="pn-abas__grade">
          {DESTINOS.map((d) => (
            <button
              key={d}
              className="pn-aba"
              type="button"
              aria-current={d === vista ? 'page' : undefined}
              onClick={() => setVista(d)}
            >
              <svg fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 32 32" aria-hidden="true">
                {ICONE[d]}
              </svg>
              <span className="pn-aba__rotulo">{d}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
