import React from 'react'
import * as C from '../rota/carimbo.js'
import { CACA } from './textos.js'

const T = CACA.fila

/**
 * "Tinha fila?" na tela do carimbo validado (docs/cartoon-2026-2/20-movimento-nas-casas.md, parte C).
 * Opcional: um toque grava (caca_fila_responder confere a chave e o carimbo por GPS daquela unidade nas últimas 3 h).
 * Tocar outra opção troca a resposta. Falha não atrapalha nada: o carimbo já está valendo.
 */
export function FilaPergunta ({ chave, unidade }) {
  const [escolha, setEscolha] = React.useState('')
  const [estado, setEstado] = React.useState('') // '' · enviando · ok · falhou
  if (!chave || !unidade) return null

  async function responder (valor) {
    setEscolha(valor); setEstado('enviando')
    try {
      const r = await C.chamar('caca_fila_responder', { p_chave: chave, p_unidade: unidade, p_resposta: valor })
      setEstado(r?.ok === true ? 'ok' : 'falhou')
    } catch { setEstado('falhou') }
  }

  return (
    <div className="ct-carimbar__avaliar" role="group" aria-labelledby="caca-fila-pergunta">
      <p className="ct-sub" id="caca-fila-pergunta">{T.pergunta}</p>
      <p className="ct-nota">{T.nota}</p>
      <div className="ct-acoes">
        {T.opcoes.map(([valor, rotulo]) => (
          <button key={valor} type="button" className={`ct-botao ${escolha === valor ? 'ct-botao--feito' : 'ct-botao--contorno'}`}
            aria-pressed={escolha === valor} disabled={estado === 'enviando'} onClick={() => responder(valor)}>{rotulo}</button>
        ))}
      </div>
      {(estado === 'ok' || estado === 'falhou') && <p className="ct-nota" role="status">{estado === 'ok' ? T.obrigado : T.falhou}</p>}
    </div>
  )
}
