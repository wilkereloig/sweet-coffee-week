/*
 * 1 · Topo da casa: canal Elenco + cenário do tema (só os objetos; a faixa com o combo fica fixa no pé — CenarioFixo).
 * Revisão de 03/11 ("a foto vende sozinha"): a foto do combo sobe para o topo, ao lado do nome (celular: logo depois
 * dele), levando ao bloco do combo; o preço da edição fica à vista no letreiro desenhado.
 * Revisão de 04/11 (ficha): o NOME DO COMBO vem antes do preço — quem chega pelo QR confere o que vem e quanto custa
 * sem rolar —, e o texto de apresentação da casa saiu daqui para "Sobre a casa" (competia com a foto; no celular
 * empurrava o combo para fora da primeira tela).
 * Dois grupos com rótulo e desenhos diferentes para não se confundirem: "Como pedir" são ATALHOS (levam ao endereço
 * e horário, ou ao link de pedido) e "Minha rota" são MARCAÇÕES do visitante (ficam salvas no aparelho).
 * O atalho de Delivery só abre um link direto quando não há dúvida de qual unidade é (M.destinoDelivery); com
 * várias unidades e canais diferentes ele leva a "Como pedir", onde cada unidade tem o seu.
 */
import React from 'react'
import * as M from '../../../dados/modelo.js'
import { TopoCanal } from '../../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { CenarioTema } from '../../../componentes/sistema/CenarioTema.jsx'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { LogoDesenhada } from '../../../componentes/sistema/LogoDesenhada.jsx'
import { Quadro, Preco } from '../../../componentes/sistema/pecas.jsx'
import { Foto } from '../../../componentes/base.jsx'
import { PARTICIPANTE as T, ATENDIMENTO } from '../../textos.js'
import { QueroIrCasa, JaFui } from '../../MarcasLover.jsx'
import { Ancora } from './Ancora.jsx'

export function Topo ({ p, encerrada, rota, navigate }) {
  const unidades = p.unidades || []
  const foto = p.combo?.fotos?.principal
  const preco = !encerrada ? p.combo?.preco : null
  const nomeCombo = p.combo?.nome ? M.caixaLegivel(p.combo.nome) : ''
  const maiorPalavra = Math.max(5, ...String(p.casa.nome || '').split(/\s+/).map((w) => [...w].length))
  const selos = M.MODOS.map(([k]) => k).filter((k) => M.estadoModo(p, k).estado === 'sim')
  // Atalho de cada modo: no local e para viagem levam ao endereço e ao horário; delivery ao link de pedido, se for
  // inequívoco, ou a "Como pedir" (escolher a unidade, ou ver o que a casa informou).
  const delivery = M.destinoDelivery(p)
  const destinoModo = (k) => {
    if (k !== 'delivery') return { para: 'unidades', dica: T.comoPedirDica[k] }
    if (delivery.tipo === 'link') return { href: delivery.link, dica: T.comoPedirDica.delivery }
    return { para: 'atendimento', dica: delivery.tipo === 'escolher' ? T.comoPedirDica.deliveryEscolher : T.comoPedirDica.deliveryInfo }
  }

  return (
    <TopoCanal canal="elenco" className="ct-casa ct-ficha__topo ct-reticula" aria-labelledby="casa-nome">
      <CenarioTema slug={p.slug} semKit="natal" faixa={false} />
      <div className="ct-ficha__cabeca">
        <LogoDesenhada casa={p.casa} className="ct-ficha__logo" fita={false} />
        <div className="ct-ficha__titulo">
          {/* --ct-palavra: a palavra mais longa do nome manda no tamanho da letra, então nome curto ou longo nunca vaza da coluna. */}
          <div className="ct-ficha__nome" style={{ '--ct-palavra': maiorPalavra }}>
            <Letreiro nivel={1} id="casa-nome" tamanho="display" texto={p.casa.nome} />
          </div>
          <div className="ct-ficha__info">
            {p.casa.tema && <p className="ct-ficha__tema">{T.tema(p.casa.tema)}</p>}
            {(nomeCombo || preco) && (
              <div className="ct-ficha__oferta">
                {nomeCombo && <p className="ct-ficha__combo">{nomeCombo}</p>}
                {preco && <Preco rotulo={T.precoRotulo} valor={M.formatarPreco(preco)} className="ct-ficha__preco" />}
              </div>
            )}
          </div>
        </div>
        {foto && (
          <Ancora para="combo" className="ct-ficha__vitrine" aria-label={T.verCombo}>
            <span className="ct-explosao ct-ficha__explosao" aria-hidden="true" />
            <Quadro className="ct-ficha__foto"><Foto foto={foto} proporcao="4 / 5" alt={foto.alt || ''} prioridade /></Quadro>
          </Ancora>
        )}
        <div className="ct-ficha__acoes">
          {!encerrada && selos.length > 0 && (
            <nav className="ct-ficha__grupo" aria-labelledby="como-pedir-rotulo">
              <p id="como-pedir-rotulo" className="ct-rotulo">{T.atendimentoTitulo}</p>
              <ul className="ct-ficha__modos">
                {selos.map((k) => {
                  const { dica, para, href } = destinoModo(k)
                  const conteudo = (
                    <>
                      <IconeCartoon nome={ATENDIMENTO[k].icone} tamanho={32} />
                      <span className="ct-atalho__texto">
                        <span className="ct-atalho__nome">{ATENDIMENTO[k].rotulo}</span>
                        <span className="ct-atalho__dica">{dica}</span>
                      </span>
                      <span className="ct-atalho__seta" aria-hidden="true">{href ? '↗' : '↓'}</span>
                    </>
                  )
                  return (
                    <li key={k}>
                      {href
                        ? <a className="ct-atalho" href={href} target="_blank" rel="noopener noreferrer">{conteudo}<span className="ct-sr"> {T.abreEmNovaAba}</span></a>
                        : <Ancora className="ct-atalho" para={para}>{conteudo}</Ancora>}
                    </li>
                  )
                })}
              </ul>
            </nav>
          )}
          {rota && unidades.length > 0 && (
            <div className="ct-ficha__grupo ct-ficha__grupo--rota" role="group" aria-labelledby="minha-rota-rotulo">
              <p id="minha-rota-rotulo" className="ct-rotulo">{T.minhaRota}</p>
              <div className="ct-ficha__marcas"><QueroIrCasa p={p} navigate={navigate} naFicha /><JaFui p={p} /></div>
              <p className="ct-ficha__nota">{T.minhaRotaNota}</p>
            </div>
          )}
        </div>
      </div>
    </TopoCanal>
  )
}
