import React from 'react'
import { Icone } from './Icone'

/*
 * Cabeçalho de vista — disco colorido + título + nota. No desktop é ELE o
 * título da página (<h1>): a barra fixa mostra só o contexto. No celular
 * some (display:none) e o <h1> passa a ser o da barra fixa — um título
 * visível por tela, nunca o mesmo duas vezes.
 * `icone` é o NOME no registro único (components/Icone.jsx).
 */
export function VistaCabeca({ acento, icone, titulo, nota }) {
  return (
    <div className="pn-vista-cabeca" data-acento={acento}>
      <span className="pn-acento-disco" aria-hidden="true"><Icone nome={icone} tamanho={24} /></span>
      <div className="pn-vista-cabeca__texto">
        <h1 className="pn-vista-cabeca__titulo">{titulo}</h1>
        {nota && <p className="pn-vista-cabeca__nota">{nota}</p>}
      </div>
    </div>
  )
}
