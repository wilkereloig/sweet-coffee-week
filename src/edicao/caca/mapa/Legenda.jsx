/*
 * Legenda do mapa ilustrado: os três estados da casa (forma + texto), a revisita, a parada da rota e o Sicredi. É a
 * "chave" de leitura do desenho — e a prova de que nada ali depende só de cor.
 */
import React from 'react'
import { SeloEstado } from './SeloEstado.jsx'
import { ESTADO_TEXTO, MAPA_CACA as T } from './textos.js'
import { IMAGEM_REVISITA } from './imagens.js'

export function LegendaEstados ({ comEstados = true, comSicredi = true, sicrediImagem }) {
  return (
    <section className="ct-caca-mapa__legenda" aria-label={T.estadosTitulo}>
      <h3 className="ct-rotulo">{T.estadosTitulo}</h3>
      <ul className="ct-caca-mapa__legenda-lista">
        {comEstados && ['nao-visitada', 'pendente', 'conquistada'].map((e) => (
          <li key={e}><SeloEstado estado={e} /><span className="ct-caca-mapa__legenda-texto">{ESTADO_TEXTO[e].explica}</span></li>
        ))}
        {comEstados && (
          <li>
            <img className="ct-caca-mapa__legenda-selo" src={IMAGEM_REVISITA.src} width={28} height={28} alt="" loading="lazy" draggable={false} />
            <span className="ct-caca-mapa__legenda-texto">{T.legendaRevisita}</span>
          </li>
        )}
        {comSicredi && (
          <li>
            {sicrediImagem && <img className="ct-caca-mapa__legenda-sicredi" src={sicrediImagem} alt="" loading="lazy" draggable={false} />}
            <span className="ct-caca-mapa__legenda-texto">{T.sicrediLegenda}</span>
          </li>
        )}
      </ul>
    </section>
  )
}
