import React from 'react'
import { Rotulo } from '../../../components/Rotulo'

/*
 * Cabeça das quatro seções de consulta: rótulo + H2 + apoio à direita.
 * O H2 recebe o foco quando o índice salta para a seção (tabIndex -1): quem
 * navega por teclado ou leitor de tela chega ao título, não ao topo da página.
 */
export function Cabeca({ secao }) {
  return (
    <div className="swa-cab">
      <div>
        <Rotulo icone={secao.icone}>{secao.rotulo}</Rotulo>
        <h2 className="scw-h2" id={`${secao.id}-titulo`} tabIndex={-1}>{secao.titulo}</h2>
      </div>
      {secao.apoio && <p className="swa-apoio">{secao.apoio}</p>}
    </div>
  )
}
