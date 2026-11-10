/*
 * Lista de ranking, a mesma para o ranking geral e para o de um grupo: posição, apelido e progresso (casas, extras).
 * Empate = mesma posição, escrito ("empatado em 3º"), nunca só pela cor. A ordem e as posições chegam prontas do servidor.
 * `acao(linha)` encaixa um botão por linha (ex.: o dono remover integrante no grupo).
 */
import React from 'react'
import { prepararLinhas, rotuloPosicao, textoCasas, textoExtras } from './regras.js'
import { RANKING } from './textos.js'

export function ListaRanking ({ linhas, rotulo, indiceEu = -1, acao }) {
  const lista = prepararLinhas(linhas)
  return (
    <ol className="ct-rank" aria-label={rotulo}>
      {lista.map((l, i) => {
        const eu = l.eu === true || i === indiceEu
        return (
          <li key={l.membro_id || `${l.posicao}-${l.apelido}-${i}`} className={`ct-rank__linha${eu ? ' ct-rank__linha--eu' : ''}${l.oculto ? ' ct-rank__linha--oculta' : ''}`} aria-label={l.oculto ? `${rotuloPosicao(l.posicao)} lugar, ${RANKING.nomeOculto}` : undefined}>
            <span className="ct-rank__pos">{rotuloPosicao(l.posicao)}</span>
            <span className="ct-rank__nome">
              <strong>{l.oculto ? RANKING.nomeOculto : l.apelido}</strong>
              {eu && <span className="ct-rank__marca">{RANKING.voce}</span>}
              {l.papel === 'dono' && <span className="ct-rank__marca ct-rank__marca--dono">{l.rotuloDono || 'criou o grupo'}</span>}
              {l.empatada && <span className="ct-rank__empate">{RANKING.empatadoEm(l.posicao)}</span>}
              {l.semPosicao && <span className="ct-rank__empate">{RANKING.semPosicao}</span>}
            </span>
            <span className="ct-rank__prog">{l.oculto ? RANKING.dadosOcultos : `${textoCasas(l.casas)} · ${textoExtras(l.extras)}`}</span>
            {acao ? acao(l) : null}
          </li>
        )
      })}
    </ol>
  )
}
