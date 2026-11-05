/*
 * Cobertura do mapa real: quantas unidades têm ponto conferido, aproximado ou nenhum — e quem está sem ponto continua
 * aparecendo, numa lista com o endereço e o cartão (nunca some calado). `semPonto`: linhas `{ u, p }` sem coordenada.
 */
import React from 'react'
import * as M from '../../dados/modelo.js'
import { coberturaDoMapa } from './estados.js'
import { MAPA_CACA as T } from './textos.js'

export function Cobertura ({ linhas, aoSelecionar, selecionada }) {
  const c = coberturaDoMapa(linhas.map((x) => x.u))
  const semPonto = linhas.filter((x) => !x.u.coordenada)
  if (!c.total) return null
  return (
    <div className="ct-caca-mapa__cobertura">
      <p className="ct-nota" role="status">{T.cobertura(c)}</p>
      {semPonto.length > 0 && (
        <details className="ct-caca-mapa__sem-ponto">
          <summary>{`${T.semLocalizacaoTitulo} (${semPonto.length})`}</summary>
          <p className="ct-nota">{T.semLocalizacaoAjuda}</p>
          <ul>
            {semPonto.map(({ u, p }) => (
              <li key={u.id}>
                <button type="button" aria-pressed={selecionada === u.id} onClick={() => aoSelecionar(selecionada === u.id ? '' : u.id)}>
                  <strong>{M.tituloDaUnidade(p, u)}</strong>
                  <span>{M.enderecoEmLinha(u.endereco)}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
