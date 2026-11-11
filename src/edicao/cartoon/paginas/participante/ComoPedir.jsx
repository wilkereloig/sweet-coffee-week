/*
 * 2 · Peça ou venha (era "Como pedir"; redesenho de 11/11/2026): vem logo depois da capa, ANTES do combo detalhado — quem
 * chegou para comprar não rola cinco cartões de item para achar o canal. O carimbo de delivery foi para "Carimbe e avalie".
 * Um cartão compacto por modo (no local · para viagem · delivery) com o estado — "Em todas as unidades"
 * quando todas oferecem, senão em quais — e, havendo delivery, o painel de pedido: os canais de CADA unidade que entrega
 * (o canal é da unidade, nunca da casa), com a taxa e a região uma vez só quando valem para todas. Embaixo, os canais da
 * casa (Instagram, site).
 * Revisão de 04/11 (ficha): o delivery saiu de dentro do cartão do modo (que ficava três vezes mais alto que os outros dois
 * e deixava o resto da fileira vazio) e os canais viraram botões de 44px com o nome da unidade.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import * as M from '../../../dados/modelo.js'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { Botao, Rotulo } from '../../../componentes/sistema/pecas.jsx'
import { PARTICIPANTE as T, ATENDIMENTO, ICONE } from '../../textos.js'

const nomeDaUnidade = (u, p) => M.caixaLegivel(u.nome || u.endereco?.bairro || p.casa.nome)

function Modo ({ p, k }) {
  const { estado, unidades } = M.estadoModo(p, k)
  const todas = (p.unidades || []).length
  const varias = todas > 1
  const emTodas = varias && unidades.length === todas
  const onde = () => M.juntar(unidades.map((u) => nomeDaUnidade(u, p)))
  if (estado === 'nao_informado') return null // a casa não declarou: o cartão não aparece
  const texto = estado === 'sim'
    ? (varias ? (emTodas ? T.modo.todas : T.modo.simEm(onde())) : T.modo.sim)
    : T.modo[estado]
  return (
    <li className={`ct-modo ct-modo--${k}`} data-estado={estado}>
      <IconeCartoon nome={ATENDIMENTO[k].icone} tamanho={48} />
      <div className="ct-modo__texto">
        <h3 className="ct-modo__nome">{ATENDIMENTO[k].rotulo}</h3>
        <p className="ct-modo__estado">{texto}</p>
      </div>
    </li>
  )
}

/**
 * Uma linha por unidade que entrega, com os canais DELA. Taxa e região: se todas as unidades dizem o mesmo (inclusive
 * "não informada"), uma frase só no fim; se diferem, cada uma na sua linha.
 */
function Delivery ({ p }) {
  const modo = M.estadoModo(p, 'delivery')
  if (modo.estado !== 'sim') return null
  const entregam = modo.unidades
  const varias = entregam.length > 1
  const igual = (campo) => entregam.every((u) => (u.combo?.[campo] || '') === (entregam[0].combo?.[campo] || ''))
  const taxaUnica = igual('delivery_taxa')
  const regiaoUnica = igual('delivery_regioes')
  const taxaDe = (u) => u.combo?.delivery_taxa
  // Só entra o que a casa informou: unidade sem canal, taxa nem região não ganha linha; sem nada para dizer, o painel some.
  const temConteudo = (u) => M.canaisSeguros(u).length > 0 || (!taxaUnica && taxaDe(u)) || (!regiaoUnica && u.combo?.delivery_regioes)
  const comConteudo = entregam.filter(temConteudo)
  const taxaComum = taxaUnica && taxaDe(entregam[0])
  const regiaoComum = regiaoUnica && entregam[0].combo?.delivery_regioes
  if (!comConteudo.length && !taxaComum && !regiaoComum) return null
  return (
    <div id="delivery" className={`ct-delivery${varias ? ' ct-delivery--varias' : ''}`} role="group" aria-labelledby="delivery-titulo">
      <h3 id="delivery-titulo" className="ct-delivery__titulo"><IconeCartoon nome={ATENDIMENTO.delivery.icone} tamanho={32} />{T.pedirDelivery}</h3>
      <ul className="ct-delivery__lista">
        {comConteudo.map((u) => {
          const canais = M.canaisSeguros(u)
          return (
            <li key={u.id} className="ct-delivery__unidade">
              {varias && <p className="ct-delivery__nome">{nomeDaUnidade(u, p)}</p>}
              <div className="ct-delivery__corpo">
                {canais.length > 0
                  ? (
                    <div className="ct-acoes">
                      {canais.map((c, i) => (
                        <Botao key={i} tipo="secundario" href={String(c.link).trim()} target="_blank" rel="noopener noreferrer">
                          {T.canais[c.tipo] || c.tipo}<span aria-hidden="true"> ↗</span><span className="ct-sr"> {T.abreEmNovaAba}</span>
                        </Botao>
                      ))}
                    </div>
                  )
                  : null}
                {!taxaUnica && taxaDe(u) && <p className="ct-delivery__nota">{T.taxa}: {taxaDe(u)}</p>}
                {!regiaoUnica && u.combo?.delivery_regioes && <p className="ct-delivery__nota">{T.regioes}: {u.combo.delivery_regioes}</p>}
              </div>
            </li>
          )
        })}
      </ul>
      {(taxaComum || regiaoComum) && (
        <div className="ct-delivery__comum">
          {taxaComum && <p className="ct-delivery__nota">{T.taxa}: {taxaComum}</p>}
          {regiaoComum && <p className="ct-delivery__nota">{T.regioes}: {regiaoComum}</p>}
        </div>
      )}
    </div>
  )
}

export function ComoPedir ({ p }) {
  const instagram = p.casa.instagram && p.casa.instagram.replace(/^@/, '').trim()
  const site = p.casa.site && M.linkHttp(p.casa.site) ? p.casa.site : null
  const modosDeclarados = M.MODOS.filter(([k]) => M.estadoModo(p, k).estado !== 'nao_informado')
  // Nada declarado (nenhum modo, sem delivery, sem canais da casa): a seção não aparece.
  if (!modosDeclarados.length && !instagram && !site) return null
  return (
    <section id="atendimento" className="ct-bloco ct-ficha__secao" aria-labelledby="atendimento-titulo">
      <Letreiro id="atendimento-titulo" texto={T.atendimentoTitulo} />
      {modosDeclarados.length > 0 && (
        <ul className="ct-modos">
          {modosDeclarados.map(([k]) => <Modo key={k} p={p} k={k} />)}
        </ul>
      )}
      <Delivery p={p} />
      {(instagram || site) && (
        <div className="ct-ficha__fale">
          <Rotulo icone={ICONE.whatsapp}>{T.faleCom}</Rotulo>
          <div className="ct-acoes">
            {instagram && <Botao tipo="secundario" href={`https://www.instagram.com/${instagram}/`} target="_blank" rel="noopener noreferrer"><ScwIcon nome={ICONE.instagram} tamanho={20} />@{instagram}</Botao>}
            {site && <Botao tipo="secundario" href={site} target="_blank" rel="noopener noreferrer"><ScwIcon nome={ICONE.site} tamanho={20} />{T.site}</Botao>}
          </div>
        </div>
      )}
    </section>
  )
}
