/*
 * A saudação do cartão "Mapa de <apelido>" (saudacao.js), como hook: sorteada UMA vez por visita, para a frase não trocar a cada renderização, e refeita só
 * se o jogo, os dados da edição ou a faixa do dia mudarem. O relógio é o de Natal, como o resto do site. Devolve { saudacao, incentivo }.
 */
import React from 'react'
import { horaEmNatal } from '../dados/modelo.js'
import { saudar, contextoDaSaudacao, faixaDoDia } from './saudacao.js'

export function useSaudacao (apelido, resumo, dados) {
  const [sorteio] = React.useState(() => ({ a: Math.random(), b: Math.random() }))
  const faixa = faixaDoDia(horaEmNatal())
  const { total, validadas, faltam, pendentes, completo } = resumo
  const edicao = dados?.edicao
  const participantes = dados?.participantes
  return React.useMemo(
    () => saudar(contextoDaSaudacao({ apelido, resumo: { total, validadas, faltam, pendentes, completo }, dados: { edicao, participantes } }), sorteio),
    [apelido, total, validadas, faltam, pendentes, completo, edicao, participantes, faixa, sorteio], // eslint-disable-line react-hooks/exhaustive-deps -- `faixa` só entra como gatilho: a hora é lida dentro de contextoDaSaudacao
  )
}
