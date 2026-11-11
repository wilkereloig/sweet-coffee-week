/*
 * 3 · O que vem no combo (canal Cardápio: o rosa é moldura; o texto pequeno mora no painel creme e nos cartões).
 * Redesenho de 11/11/2026 (auditoria da Página da casa): a capa já diz o nome do combo, o preço e mostra a foto principal —
 * aqui eles NÃO se repetem. O que fica: os avisos de alergênicos à vista (segurança primeiro), um cartão grande por item
 * (fita do tipo, foto/galeria do item, nome, descrição) com ingredientes, restrições e trocas RECOLHIDOS em "Ingredientes e
 * alergênicos" (consulta, não leitura corrida), as condições e, no fim, o resumo das restrições do combo inteiro.
 * O id do cartão é a POSIÇÃO, não o tipo: há casas com dois doces.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import * as M from '../../../dados/modelo.js'
import { TopoCanal } from '../../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { Galeria } from '../../../componentes/sistema/Galeria.jsx'
import { Etiqueta, Quadro, Rotulo } from '../../../componentes/sistema/pecas.jsx'
import { PARTICIPANTE as T, RESTRICAO, ICONE } from '../../textos.js'
import { Alimentar, Trocas, temAlimentar } from './Alimentar.jsx'
import { Ancora } from './Ancora.jsx'

// Algumas casas começam a descrição pelo tipo ("DOCE: …"), que a etiqueta já diz: tira só esse prefixo.
const semPrefixoDoTipo = (texto, tipo) => String(texto || '').replace(new RegExp(`^\\s*${tipo}\\s*:\\s*`, 'i'), '')

/** As fotos do item na ordem da galeria: a lista do item (principal + detalhe + opções) ou, no dado antigo, a foto única. */
const fotosDoItem = (i) => (i.fotos?.length ? i.fotos : [i.foto].filter(Boolean))

function Item ({ i, unidades }) {
  const descricao = semPrefixoDoTipo(i.descricao, i.tipo)
  const fotos = fotosDoItem(i)
  const comDetalhe = !!i.ingredientes || temAlimentar(i)
  return (
    <li className="ct-item" id={`item-${i.posicao}`}>
      <Etiqueta icone={ICONE.tipo[i.tipo]}>{T.tipos[i.tipo]}</Etiqueta>
      {fotos.length > 0 && <Galeria fotos={fotos} nome={i.nome || T.tipos[i.tipo]} proporcao="4 / 5" />}
      {i.nome && <h3 className="ct-item__nome">{M.caixaLegivel(i.nome)}</h3>}
      {descricao && <p className="ct-item__descricao">{descricao}</p>}
      {comDetalhe && (
        <details className="ct-item__mais">
          <summary><ScwIcon nome={ICONE.restricoes} tamanho={20} /><span>{T.ingredientesEAlergenicos}</span></summary>
          <div className="ct-item__mais-corpo">
            {i.ingredientes && (
              <div className="ct-item__bloco">
                <Rotulo icone={ICONE.ingredientes}>{T.ingredientes}</Rotulo>
                <p>{i.ingredientes}</p>
              </div>
            )}
            {temAlimentar(i) && (
              <div className="ct-item__bloco ct-item__restricoes">
                <Rotulo icone={ICONE.restricoes}>{T.restricoesTitulo}</Rotulo>
                <Alimentar item={i} />
              </div>
            )}
          </div>
        </details>
      )}
      <Trocas lista={i.substituicoes} unidades={unidades} nomeItem={i.nome} />
    </li>
  )
}

export function Combo ({ p, combo, itens }) {
  const fotos = combo.fotos || {}
  const alerta = M.fraseAlerta(itens)
  const podeConter = M.frasePodeConter(itens)
  // Só o que a casa declarou ("sim" ou "não"); o que ela não declarou não aparece.
  const vereditos = M.RESTRICOES.map(({ chave }) => ({ chave, v: M.veredito(itens, chave) })).filter(({ v }) => v !== 'nao_informado')
  const unidades = p.unidades || []
  // A foto principal já está na capa: aqui o quadro só existe com fotos a MAIS do combo inteiro.
  const extras = fotos.galeria || []
  // Descrição por item nos cartões abaixo: a do combo inteiro repetiria o mesmo texto ("DOCE: … SALGADO: …").
  const descricaoPorItem = itens.length > 0 && itens.every((i) => i.descricao)
  const textoDoCombo = combo.descricao && !descricaoPorItem ? combo.descricao : ''
  const comPainel = !!textoDoCombo || !!combo.condicoes
  return (
    <TopoCanal canal="cardapio" className="ct-cardapio" id="combo" aria-labelledby="combo-titulo">
      <Etiqueta icone={ICONE.noCombo}>{T.comboTitulo}</Etiqueta>
      <Letreiro nivel={2} id="combo-titulo" texto={T.noCombo} cor="amarelo" />
      {/* Alergênicos à vista, antes dos cartões: quem tem restrição vê sem abrir nada. */}
      {(alerta || podeConter) && (
        <div className="ct-alertas">
          {alerta && <Ancora para="restricoes" className="ct-alerta ct-alerta--contem">{alerta}</Ancora>}
          {podeConter && <Ancora para="restricoes" className="ct-alerta ct-alerta--pode">{podeConter}</Ancora>}
        </div>
      )}
      {(extras.length > 0 || comPainel) && (
        <div className={`ct-cardapio__grade${extras.length > 0 ? '' : ' ct-cardapio__grade--so-painel'}`}>
          {extras.length > 0 && (
            <Quadro className="ct-cardapio__foto">
              <Galeria fotos={extras} nome={T.maisFotos} proporcao="4 / 5" />
            </Quadro>
          )}
          {comPainel && (
            <div className="ct-painel ct-cardapio__painel">
              {textoDoCombo && <p>{textoDoCombo}</p>}
              {combo.condicoes && (
                <div>
                  <Rotulo icone={ICONE.condicoes}>{T.condicoes}</Rotulo>
                  <p>{combo.condicoes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {itens.length > 0 && (
        <ul className="ct-cardapio__itens">
          {itens.map((i) => <Item key={i.posicao} i={i} unidades={unidades} />)}
        </ul>
      )}
      {/* Resumo do combo inteiro para quem tem restrição; o detalhe de cada item está no cartão dele. */}
      <div id="restricoes" className="ct-painel ct-cardapio__restricoes">
        <h3 className="ct-cardapio__subtitulo"><ScwIcon nome={ICONE.restricoes} tamanho={24} />{T.restricoesTitulo}</h3>
        <p>{T.restricoesLead}</p>
        {vereditos.length > 0 && (
          <ul className="ct-vereditos">
            {vereditos.map(({ chave, v }) => (
              <li key={chave} className={`ct-veredito ct-veredito--${v}`}>
                {v === 'sim' ? <IconeCartoon nome={RESTRICAO[chave].icone} tamanho={32} /> : <span className="ct-veredito__marca" aria-hidden="true" />}
                <span>{RESTRICAO[chave][v]}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="ct-confirme">{T.confirme}</p>
      </div>
    </TopoCanal>
  )
}
