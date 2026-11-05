import React from 'react'
import { useLeitura } from '../../../lib/leituraVivaReact'
import { cacaApi, mensagemCaca, rotuloEstado, tomEstado, estaVencido, csvDe } from '../../../lib/caca'
import { entregar } from '../../../lib/entrega'
import { Selo } from '../../ui'
import { avisar } from '../../Confirmar'

/*
 * Peças que as abas da Caça (Edição › Carimbos) dividem. O banco decide permissão, transição e corte; aqui só
 * se lê, se mostra e se repassa o motivo do "não" em português.
 */

/** As duas leituras que várias abas usam. Releem sozinhas quando uma gravação confirma (domínio `carimbos`). */
export function useDadosCaca(edicao) {
  const premios = useLeitura(() => cacaApi.premios(edicao), ['carimbos'], { chave: edicao })
  const config = useLeitura(() => cacaApi.config(), ['carimbos'], { chave: 'caca-config' })
  return { premios, config }
}

/** Executa uma ação do painel: um botão ocupado por vez e o motivo do "não" num aviso. */
export function useExecutar() {
  const [ocupado, setOcupado] = React.useState(null)
  const executar = React.useCallback(async (chave, fn) => {
    setOcupado(chave)
    try { return await fn() } catch (e) {
      if (e && e.message === 'sessao_expirada') throw e
      await avisar(mensagemCaca(e))
      return undefined
    } finally { setOcupado(null) }
  }, [])
  return [ocupado, executar]
}

export function SeloEstado({ premio }) {
  return (
    <span className="cp-estado">
      <Selo tom={tomEstado(premio.estado)}>{rotuloEstado(premio.estado)}</Selo>
      {estaVencido(premio) && <Selo tom="atencao">Prazo vencido</Selo>}
    </span>
  )
}

/** Contato só existe no JSON de quem tem `relatorio.ler`; sem a chave, a célula nem é desenhada. */
export const contatoDe = (m) => [m.email, m.whatsapp].filter(Boolean).join(' · ')

export const baixarCsv = (nome, linhas) => entregar(new File(['﻿' + csvDe(linhas)], nome, { type: 'text/csv;charset=utf-8' }))

/** Aviso que o leitor de tela anuncia (resultado de uma ação confirmada pelo servidor). */
export function AvisoOk({ texto, onFechar }) {
  if (!texto) return null
  return (
    <p className="ui-nota ui-nota--ok cp-aviso" role="status">
      {texto}{' '}
      {onFechar && <button type="button" className="cp-aviso__fechar" onClick={onFechar}>Entendi</button>}
    </p>
  )
}

export function Tabela({ rotulo, colunas, children }) {
  return (
    <div className="ui-tabela-rolagem" tabIndex={0} role="region" aria-label={rotulo}>
      <table className="ui-tabela cp-tabela">
        <thead><tr>{colunas.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
