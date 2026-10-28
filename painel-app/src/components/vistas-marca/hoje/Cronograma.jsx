import React from 'react'
import { textoPrazo } from '../../../lib/operacao'
import { dataBr } from '../../../lib/inicioMarca'

// Próximos itens do cronograma da edição (só o que a marca pode ver; as datas vêm da organização).
export function Cronograma({ itens, hoje }) {
  return (
    <ul className="ui-lista-simples">
      {itens.map((i) => (
        <li key={i.id}>
          <b>{i.titulo}</b>
          <span>
            {i.tipo === 'periodo' ? dataBr(i.inicio) + ' a ' + dataBr(i.fim) : i.tipo === 'prazo' ? 'até ' + dataBr(i.fim) : dataBr(i.inicio)}
            {' · '}{textoPrazo(i, hoje)}{i.condicao ? ' · ' + i.condicao : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}
