import React from 'react'
import { Icone } from './Icone'
import { NivelTitulo } from './ui'

/*
 * Painel deslizante genérico (gaveta no desktop, folha no celular) — usado
 * por toda ação "abrir X" do painel. Abre na hora, fecha com animação
 * (.is-fechando, 260ms — ogGavetaSai no desktop, ogFolhaSai no celular) e só
 * desmonta depois. Mesmo padrão de src/components/MobileMenu.jsx.
 *
 * Acessibilidade (auditoria 28/09/2026): Esc fecha, o foco entra na folha ao
 * abrir, Tab não sai dela enquanto aberta, e o foco volta para quem abriu.
 */
const SAIDA = 260 // espelha .og-detalhe.is-fechando (260ms) em painel.css

export const FOCAVEIS = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function Folha({ aberto, titulo, sub, onFechar, children, larga = false }) {
  const [montada, setMontada] = React.useState(aberto)
  const [fechando, setFechando] = React.useState(false)
  const tituloId = React.useId()
  const caixaRef = React.useRef(null)
  const origemRef = React.useRef(null)

  React.useEffect(() => {
    if (aberto) {
      origemRef.current = document.activeElement
      setMontada(true); setFechando(false); return
    }
    if (!montada) return
    const devolver = () => {
      // Se outra folha já puxou o foco (aviso que fecha a central e abre uma
      // ficha), não arranca de lá: só devolve se o foco ficou sem dono.
      const ativo = document.activeElement
      const semDono = !ativo || ativo === document.body || (caixaRef.current && caixaRef.current.contains(ativo))
      if (!semDono) return
      const o = origemRef.current
      if (o && typeof o.focus === 'function' && document.contains(o)) o.focus()
    }
    const semMovimento =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (semMovimento) { setMontada(false); devolver(); return }
    setFechando(true)
    const t = window.setTimeout(() => { setMontada(false); setFechando(false); devolver() }, SAIDA)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  // Foco para dentro ao abrir: o título (tabIndex -1) — não o primeiro campo,
  // para o teclado do celular não subir sozinho por cima do conteúdo.
  React.useEffect(() => {
    if (aberto && montada && caixaRef.current) {
      const h = caixaRef.current.querySelector('h2')
      if (h) h.focus()
    }
  }, [aberto, montada])

  function tecla(ev) {
    if (ev.key === 'Escape') { ev.stopPropagation(); onFechar(); return }
    if (ev.key !== 'Tab' || !caixaRef.current) return
    const els = [...caixaRef.current.querySelectorAll(FOCAVEIS)].filter((el) => el.offsetParent !== null)
    if (!els.length) return
    const primeiro = els[0], ultimo = els[els.length - 1]
    if (ev.shiftKey && document.activeElement === primeiro) { ev.preventDefault(); ultimo.focus() }
    else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primeiro.focus() }
  }

  if (!montada) return null

  return (
    <>
      <div className="og-fundo" hidden={!aberto} aria-hidden="true" onClick={onFechar} />
      <aside
        ref={caixaRef}
        className={'og-detalhe' + (larga ? ' og-detalhe--larga' : '') + (fechando ? ' is-fechando' : '')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        // Focável sem entrar no Tab: clicar num espaço vazio da folha deixa o
        // foco NELA (não no body), e Esc e o laço do Tab continuam valendo.
        tabIndex={-1}
        onKeyDown={tecla}
      >
        <div className="og-detalhe__topo">
          <div className="og-detalhe__titulos">
            <h2 id={tituloId} tabIndex={-1}>{titulo}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button className="og-detalhe__fechar" type="button" aria-label="Fechar" onClick={onFechar}>
            <Icone nome="fechar" tamanho={20} />
          </button>
        </div>
        <div className="og-detalhe__rolo">
          <NivelTitulo.Provider value={3}>{children}</NivelTitulo.Provider>
        </div>
      </aside>
    </>
  )
}
