import React from 'react'

/*
 * Cabeçalho de vista — disco colorido + título + nota. Espelha
 * .pn-vista-cabeca/.pn-acento-disco/.pn-vista-cabeca__texto/__titulo/__nota
 * de public/painel/index.html (uma seção por vista, linhas 1186-1341).
 */
export function VistaCabeca({ acento, icone, titulo, nota }) {
  return (
    <div className="pn-vista-cabeca" data-acento={acento}>
      <span className="pn-acento-disco" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
