/*
 * Lista rápida abaixo do desenho (spec 15 §10: "busca/lista, sem exigir achar a bandeirinha"). Cada casa é um botão com o
 * número da bandeirinha, o nome, o estado (forma + texto) e a parada da rota; escolher leva o desenho até ela. Segue a
 * ordem do caminho do mapa e respeita os filtros (casa fora do filtro some daqui; no desenho só fica apagada).
 * As agências do Sicredi entram num grupo à parte, com o rótulo "Patrocinador".
 * `itens`: [{ id, numero, titulo, bairro, estado, revisitas, parada, proxima }] · `agencias`: [{ id, nome, endereco }].
 */
import React from 'react'
import { SeloEstado } from './SeloEstado.jsx'
import { MAPA_CACA as T } from './textos.js'

export function CasasEmLista ({ itens, agencias = [], selecionada, aoSelecionar, aberta = false }) {
  return (
    <details className="ct-caca-mapa__rapida" open={aberta || undefined}>
      <summary>{T.listaRapida(itens.length)}</summary>
      <p className="ct-nota">{T.listaRapidaAjuda}</p>
      <ul className="ct-caca-mapa__rapida-lista">
        {itens.map((c) => (
          <li key={c.id}>
            <button type="button" className={`ct-caca-mapa__rapida-item${c.id === selecionada ? ' is-sel' : ''}${c.proxima ? ' is-proxima' : ''}`}
              aria-pressed={c.id === selecionada} onClick={() => aoSelecionar(c.id === selecionada ? '' : c.id)}>
              <span className="ct-caca-mapa__rapida-num" aria-hidden="true">{c.numero}</span>
              <span className="ct-caca-mapa__rapida-texto">
                <strong>{c.titulo}</strong>
                {c.bairro && <span>{c.bairro}</span>}
                <span className="ct-caca-mapa__rapida-marcas">
                  <SeloEstado estado={c.estado} revisitas={c.revisitas} tamanho={22} />
                  {c.parada && <span className="ct-caca-mapa__rapida-parada">{`Parada ${c.parada}`}</span>}
                  {c.proxima && <span className="ct-caca-mapa__rapida-proxima">{T.proximaMarca}</span>}
                </span>
              </span>
            </button>
          </li>
        ))}
        {agencias.map((a) => (
          <li key={a.id}>
            <button type="button" className={`ct-caca-mapa__rapida-item ct-caca-mapa__rapida-item--sicredi${a.id === selecionada ? ' is-sel' : ''}`}
              aria-pressed={a.id === selecionada} onClick={() => aoSelecionar(a.id === selecionada ? '' : a.id)}>
              <span className="ct-caca-mapa__sicredi-selo">{T.sicrediRotulo}</span>
              <span className="ct-caca-mapa__rapida-texto"><strong>{a.nome}</strong><span>{T.sicrediNaoConta}</span></span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}
