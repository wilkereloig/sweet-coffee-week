import React from 'react'

/*
 * Painel deslizante genérico (gaveta no desktop, folha no celular) — usado
 * por toda ação "abrir X" do painel. Espelha #fundo/#detalhe e
 * .og-detalhe/.og-detalhe__rolo de public/painel/index.html, e o
 * comportamento de abrirFolha()/fecharDetalhe() (linhas ~3392-3426): abre
 * na hora, fecha com animação (.is-fechando, 260ms — mesmo tempo nas duas
 * telas: ogGavetaSai no desktop, ogFolhaSai no celular) e só desmonta depois.
 * Mesmo padrão de src/components/MobileMenu.jsx (montada/fechando).
 */
const SAIDA = 260 // espelha .og-detalhe.is-fechando (260ms) em painel.css

export function Folha({ aberto, titulo, sub, onFechar, children }) {
  const [montada, setMontada] = React.useState(aberto)
  const [fechando, setFechando] = React.useState(false)
  const tituloId = React.useId()

  React.useEffect(() => {
    if (aberto) { setMontada(true); setFechando(false); return }
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
  }, [aberto])

  if (!montada) return null

  return (
    <>
      <button className="og-fundo" hidden={!aberto} aria-label="Fechar detalhe" onClick={onFechar} />
      <aside
        className={'og-detalhe' + (fechando ? ' is-fechando' : '')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
      >
        <div className="og-detalhe__topo">
          <div>
            <h2 id={tituloId}>{titulo}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button className="og-btn og-btn--vazado og-btn--mini og-detalhe__fechar" type="button" onClick={onFechar}>
            Fechar
          </button>
        </div>
        <div className="og-detalhe__rolo">{children}</div>
      </aside>
    </>
  )
}
