/*
 * 5 · Provou? Carimbe e avalie (redesenho de 11/11/2026). Um painel só, na língua do painel da Caça da Home, no lugar de
 * três convites soltos: o bloco "Avalie", o aviso flutuante "Carimbar" (que cobria o pé da tela) e o botão do carimbo de
 * delivery (que morava em "Como pedir"). Só com a edição em curso, combo para avaliar e avaliação aberta — é quando o
 * carimbo existe. Carimbar NÃO carimba: leva à tela do carimbo, que pede o toque e a localização (casa com várias
 * unidades: quem escolhe é o banco, pela posição do celular). Mapa fora do ar: sem os botões da Caça, fica a avaliação.
 */
import React from 'react'
import * as M from '../../../dados/modelo.js'
import { EDICAO } from '../../../config.js'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { Botao, Gibi } from '../../../componentes/sistema/pecas.jsx'
import { PARTICIPANTE as T } from '../../textos.js'
import { CACA_CAMINHOS } from '../../../caca/textos.js'
import { DELIVERY as TD } from '../../../caca/delivery/textos.js'
import { MAPA_NO_AR } from '../../contexto.js'

export function Carimbe ({ p, navigate }) {
  const C = T.carimbe
  const entrega = M.estadoModo(p, 'delivery').estado === 'sim'
  return (
    <section id="carimbe" className="ct-bloco ct-ficha__secao" aria-labelledby="carimbe-titulo">
      <div className="ct-caca-chamada ct-reticula ct-ficha__carimbe">
        <span className="ct-explosao ct-caca-chamada__explosao" aria-hidden="true" />
        <span className="ct-caca-chamada__carimbo" aria-hidden="true"><IconeCartoon nome="ja-fui" tamanho={64} /></span>
        <div className="ct-caca-chamada__texto">
          <Letreiro id="carimbe-titulo" apoio={C.apoio} texto={MAPA_NO_AR ? C.titulo : C.tituloSoAvalie} cor="vermelho" />
          <p>{MAPA_NO_AR ? C.texto : C.textoSoAvalie}</p>
          <div className="ct-acoes ct-ficha__carimbe-acoes">
            {MAPA_NO_AR && <Botao tipo="acao" href={`${EDICAO.caminho}/carimbo/${p.slug}`} navigate={navigate}>{C.carimbar}</Botao>}
            <Botao tipo={MAPA_NO_AR ? 'secundario' : 'acao'} href={`${EDICAO.caminho}/avaliar?participante=${p.slug}`} navigate={navigate}>{T.avaliar}</Botao>
          </div>
          {/* Carimbo de delivery (Caça): só com delivery declarado "sim" por alguma unidade ("não informado" não é delivery). */}
          {MAPA_NO_AR && entrega && (
            <div className="ct-delivery__carimbo">
              <Botao tipo="secundario" href={`${CACA_CAMINHOS.delivery}?casa=${encodeURIComponent(p.slug)}`}><IconeCartoon nome={TD.acaoFichaIcone} tamanho={32} />{TD.acaoFicha}</Botao>
              <p className="ct-delivery__nota">{TD.acaoFichaDica}</p>
            </div>
          )}
        </div>
        <Gibi chave="luva-joinha" className="ct-caca-chamada__luva" />
      </div>
    </section>
  )
}
