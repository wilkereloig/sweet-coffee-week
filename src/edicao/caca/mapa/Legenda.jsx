/*
 * Legenda do mapa: os três estados da casa (forma + texto), a revisita e o Sicredi — a "chave" de leitura do desenho e a
 * prova de que nada ali depende só de cor. Recolhível desde o redesign de 06/11/2026: quem já sabe ler não paga o espaço,
 * quem não sabe abre uma vez. `children`: itens extras da vista (o mapa real põe a sua legenda de pontos aqui).
 */
import React from 'react'
import { SeloEstado } from './SeloEstado.jsx'
import { ESTADO_TEXTO, MAPA_CACA as T } from './textos.js'
import { IMAGEM_REVISITA } from './imagens.js'

export function LegendaEstados ({ comEstados = true, comSicredi = true, sicrediImagem, children = null }) {
  return (
    <details className="ct-caca-mapa__legenda">
      <summary>{T.estadosTitulo}</summary>
      {children}
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
    </details>
  )
}
