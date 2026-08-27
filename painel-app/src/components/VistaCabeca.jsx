import React from 'react'

/*
 * Cabeçalho de vista — disco colorido + título + nota. Espelha
 * .pn-vista-cabeca/.pn-acento-disco/.pn-vista-cabeca__texto/__titulo/__nota
 * de public/painel/index.html (uma seção por vista, linhas 1186-1341).
 *
 * `viewBox`/`strokeWidth` são opcionais porque a fonte usa DOIS sistemas de
 * ícone: as vistas da organização desenham em 24×24/1.8 (padrão daqui), as
 * da marca em 32×32/2.2 (ex.: #mvPedidos, ~1633) — mesma grade da rail da
 * marca (PainelMarcaShell.jsx). O `viewBox` do wrapper tem que casar com o
 * das coordenadas do ícone, senão ele corta nas bordas.
 */
export function VistaCabeca({ acento, icone, titulo, nota, viewBox = '0 0 24 24', strokeWidth = 1.8 }) {
  return (
    <div className="pn-vista-cabeca" data-acento={acento}>
      <span className="pn-acento-disco" aria-hidden="true">
        <svg viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          {icone}
        </svg>
      </span>
      <span className="pn-vista-cabeca__texto">
        <span className="pn-vista-cabeca__titulo">{titulo}</span>
        <span className="pn-vista-cabeca__nota">{nota}</span>
      </span>
    </div>
  )
}
