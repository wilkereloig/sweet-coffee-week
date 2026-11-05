/*
 * 2 · O combo (canal Cardápio: o rosa é moldura; o texto pequeno mora no painel creme e nos cartões).
 * Foto principal + preço + o que vem no combo; um cartão por item com a galeria DO ITEM (principal, detalhe
 * partido, outras opções — lista 13, P3), a etiqueta do tipo com ícone (P2), restrições e trocas; no fim, o
 * resumo do combo inteiro para quem tem restrição.
 * Revisão de 04/11 (ficha): "No combo" deixou de ser uma linha de nomes e virou a faixa dos três itens — miniatura,
 * tipo (doce · salgado · bebida) e nome —, cada um levando ao seu cartão; o aviso de alergênicos diz "Contém" e
 * "Pode conter" (antes só o primeiro); o resumo do fim repete o que a casa declarou antes das quatro restrições.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import * as M from '../../../dados/modelo.js'
import { TopoCanal } from '../../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { Galeria } from '../../../componentes/sistema/Galeria.jsx'
import { Etiqueta, Quadro, Rotulo } from '../../../componentes/sistema/pecas.jsx'
import { Foto } from '../../../componentes/base.jsx'
import { PARTICIPANTE as T, RESTRICAO, ICONE } from '../../textos.js'
import { Alimentar, Trocas } from './Alimentar.jsx'
import { Ancora } from './Ancora.jsx'

// Algumas casas começam a descrição pelo tipo ("DOCE: …"), que a etiqueta já diz: tira só esse prefixo.
const semPrefixoDoTipo = (texto, tipo) => String(texto || '').replace(new RegExp(`^\\s*${tipo}\\s*:\\s*`, 'i'), '')

/** As fotos do item na ordem da galeria: a lista do item (principal + detalhe + opções) ou, no dado antigo, a foto única. */
const fotosDoItem = (i) => (i.fotos?.length ? i.fotos : [i.foto].filter(Boolean))

/**
 * O que vem no combo, de relance: uma linha por item (miniatura · tipo · nome) que rola até o cartão dele. O id do cartão
 * é a POSIÇÃO, não o tipo: há casas com dois doces. Sem foto, o ícone do tipo; sem nome, só o tipo (o cartão diz
 * "nome não informado").
 */
function Composicao ({ itens }) {
  return (
    <ul className="ct-composicao">
      {itens.map((i) => {
        const foto = fotosDoItem(i).find((f) => f?.path)
        return (
          <li key={i.posicao}>
            <Ancora para={`item-${i.posicao}`} className="ct-composicao__item">
              <span className="ct-composicao__foto" aria-hidden="true">
                {foto ? <Foto foto={foto} proporcao="1 / 1" alt="" /> : <ScwIcon nome={ICONE.tipo[i.tipo]} tamanho={24} />}
              </span>
              <span className="ct-composicao__texto">
                <span className="ct-composicao__tipo">{T.tipos[i.tipo]}</span>
                {i.nome && <span className="ct-composicao__nome">{M.caixaLegivel(i.nome)}</span>}
              </span>
            </Ancora>
          </li>
        )
      })}
    </ul>
  )
}

function Item ({ i, unidades }) {
  const descricao = semPrefixoDoTipo(i.descricao, i.tipo)
  const fotos = fotosDoItem(i)
  return (
    <li className="ct-item" id={`item-${i.posicao}`}>
      <Etiqueta icone={ICONE.tipo[i.tipo]}>{T.tipos[i.tipo]}</Etiqueta>
      {fotos.length > 0 && <Galeria fotos={fotos} nome={i.nome || T.tipos[i.tipo]} proporcao="4 / 5" />}
      {i.nome ? <h3 className="ct-item__nome">{M.caixaLegivel(i.nome)}</h3> : <p className="ct-item__nome ct-ni">{T.nomeNi}</p>}
      {descricao && <p className="ct-item__descricao">{descricao}</p>}
      {i.ingredientes && (
        <div className="ct-item__bloco">
          <Rotulo icone={ICONE.ingredientes}>{T.ingredientes}</Rotulo>
          <p>{i.ingredientes}</p>
        </div>
      )}
      <div className="ct-item__bloco ct-item__restricoes">
        <Rotulo icone={ICONE.restricoes}>{T.restricoesTitulo}</Rotulo>
        <Alimentar item={i} />
      </div>
      <Trocas lista={i.substituicoes} unidades={unidades} nomeItem={i.nome} />
    </li>
  )
}

export function Combo ({ p, combo, itens, encerrada }) {
  const fotos = combo.fotos || {}
  const nomeCombo = combo.nome ? M.caixaLegivel(combo.nome) : T.comboSemNome(p.casa.nome)
  const alerta = M.fraseAlerta(itens)
  const podeConter = M.frasePodeConter(itens)
  const unidades = p.unidades || []
  // A foto principal já está no topo da ficha: aqui o quadro só volta com fotos a mais (ou com a reserva, sem foto).
  const extras = fotos.galeria || []
  const comQuadro = !fotos.principal || extras.length > 0
  // Descrição por item nos cartões abaixo: a do combo inteiro repetiria o mesmo texto ("DOCE: … SALGADO: …").
  const descricaoPorItem = itens.length > 0 && itens.every((i) => i.descricao)
  return (
    <TopoCanal canal="cardapio" className="ct-cardapio" id="combo" aria-labelledby="combo-titulo">
      <Etiqueta icone={ICONE.noCombo}>{T.comboTitulo}</Etiqueta>
      <Letreiro nivel={2} id="combo-titulo" texto={nomeCombo} cor="amarelo" />
      <div className={`ct-cardapio__grade${comQuadro ? '' : ' ct-cardapio__grade--so-painel'}`}>
        {comQuadro && (
          <Quadro className="ct-cardapio__foto">
            <Galeria fotos={[fotos.principal, ...extras]} nome={nomeCombo} proporcao="4 / 5" prioridade reserva={T.fotoReserva} />
          </Quadro>
        )}
        <div className="ct-painel ct-cardapio__painel">
          {/* O preço mora no topo da ficha (letreiro desenhado); aqui só a falta dele. */}
          {!encerrada && !combo.preco && <p className="ct-cardapio__preco ct-sub">{T.precoAConfirmar}</p>}
          {itens.length > 0 && (
            <div className="ct-composicao-bloco">
              <Rotulo icone={ICONE.noCombo}>{T.noCombo}</Rotulo>
              <Composicao itens={itens} />
            </div>
          )}
          {combo.descricao && !descricaoPorItem && <p>{combo.descricao}</p>}
          <div>
            <Rotulo icone={ICONE.condicoes}>{T.condicoes}</Rotulo>
            <p className={combo.condicoes ? '' : 'ct-ni'}>{combo.condicoes || T.condicoesNi}</p>
          </div>
          {(alerta || podeConter) && (
            <div className="ct-alertas">
              {alerta && <Ancora para="restricoes" className="ct-alerta ct-alerta--contem">{alerta}</Ancora>}
              {podeConter && <Ancora para="restricoes" className="ct-alerta ct-alerta--pode">{podeConter}</Ancora>}
            </div>
          )}
        </div>
      </div>
      {itens.length > 0 && (
        <ul className="ct-cardapio__itens">
          {itens.map((i) => <Item key={i.posicao} i={i} unidades={unidades} />)}
        </ul>
      )}
      {/* Resumo do combo inteiro para quem tem restrição; o detalhe de cada item está no cartão dele. */}
      <div id="restricoes" className="ct-painel ct-cardapio__restricoes">
        <h3 className="ct-cardapio__subtitulo"><ScwIcon nome={ICONE.restricoes} tamanho={24} />{T.restricoesTitulo}</h3>
        <p>{T.restricoesLead}</p>
        {(alerta || podeConter) && (
          <ul className="ct-declarado">
            {alerta && <li className="ct-declarado__linha ct-declarado__linha--contem"><ScwIcon nome={ICONE.contem} tamanho={20} /><span>{alerta}</span></li>}
            {podeConter && <li className="ct-declarado__linha ct-declarado__linha--pode"><ScwIcon nome={ICONE.podeConter} tamanho={20} /><span>{podeConter}</span></li>}
          </ul>
        )}
        <ul className="ct-vereditos">
          {M.RESTRICOES.map(({ chave }) => {
            const v = M.veredito(itens, chave)
            return (
              <li key={chave} className={`ct-veredito ct-veredito--${v}`}>
                {v === 'sim' ? <IconeCartoon nome={RESTRICAO[chave].icone} tamanho={32} /> : <span className="ct-veredito__marca" aria-hidden="true" />}
                <span>{RESTRICAO[chave][v]}</span>
              </li>
            )
          })}
        </ul>
        <p className="ct-confirme">{T.confirme}</p>
      </div>
    </TopoCanal>
  )
}
