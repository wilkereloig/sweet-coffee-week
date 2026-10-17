import React from 'react'
import { descreverAtividade, dataHoraExtensa, tempoRelativo } from '../lib/central'
import { Autor } from './Avatar'

/*
 * Linha do tempo do histórico (tabela `auditoria`, via get_atividade): QUEM,
 * O QUE, QUANDO e, se for o caso, em QUAL marca e o que mudou. O autor é o
 * rótulo gravado no momento da ação — conta desativada ou renomeada depois
 * não reescreve o passado; a foto vem do diretório pelo id (sem foto, ou sem
 * id — acesso compartilhado, sistema —, iniciais ou ícone).
 */
export function Atividade({ linhas, comMarca = true, onAbrirMarca }) {
  if (!linhas || !linhas.length) return null
  return (
    <ol className="ui-tempo">
      {linhas.map((a) => {
        const observacao = a.acao === 'observacao'
        return (
          <li className={'ui-tempo__item' + (observacao ? ' is-observacao' : '')} key={a.id}>
            <p className="ui-tempo__texto">{descreverAtividade(a, { comMarca })}</p>
            <p className="ui-tempo__meta">
              <Autor id={a.ator_user_id} rotulo={a.ator_rotulo} tamanho={20} />
              <span aria-hidden="true"> · </span>
              <time dateTime={a.at} title={dataHoraExtensa(a.at)}>{dataHoraExtensa(a.at)}</time>
              <span className="ui-tempo__relativo"> ({tempoRelativo(a.at)})</span>
              {comMarca && a.participante_id && onAbrirMarca && (
                <>
                  <span aria-hidden="true"> · </span>
                  <button type="button" className="og-link" onClick={() => onAbrirMarca(a.participante_id)}>abrir marca</button>
                </>
              )}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
