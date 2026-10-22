import React from 'react'
import { Modulo } from '../../ui'

/*
 * Um cartão de AÇÃO da Visão geral: o card inteiro é o atalho para a lista que ele conta (o "Abrir …" no pé
 * diz QUAL). É o `Modulo` do painel — nenhum segundo sistema de cartões. O miolo é só texto em linha:
 * dentro de um <button> só cabe conteúdo de frase. O que o cartão conta, a permissão e a rota vêm prontos de
 * lib/visaoGeral.js (`acoesDaEquipe`); aqui só se desenha.
 */
export function CartaoAcao({ acao, navegar }) {
  return (
    <Modulo icone={acao.icone} titulo={acao.titulo} onClick={() => navegar(acao.rota)} rotuloIr={'Abrir ' + acao.destino}>
      <span className="ms-acao">
        <span className="ui-modulo__num">{acao.n}</span>
        <span className="ms-acao__frase">{acao.frase}</span>
      </span>
      {acao.detalhe && <span className="ms-acao__detalhe">{acao.detalhe}</span>}
    </Modulo>
  )
}
