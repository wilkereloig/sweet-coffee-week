import React from 'react'

/*
 * Cabeçalho de vista — disco colorido + título + nota. No desktop é ELE o
 * título da página (<h1>): a barra fixa mostra só o contexto. No celular
 * some (display:none) e o <h1> passa a ser o da barra fixa — um título
 * visível por tela, nunca o mesmo duas vezes.
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
      <div className="pn-vista-cabeca__texto">
        <h1 className="pn-vista-cabeca__titulo">{titulo}</h1>
        {nota && <p className="pn-vista-cabeca__nota">{nota}</p>}
      </div>
    </div>
  )
}
