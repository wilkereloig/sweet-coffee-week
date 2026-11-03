/*
 * 3 · Como pedir: um cartão por modo (no local · para viagem · delivery) com o estado e, no delivery, os canais
 * de pedido; embaixo, os canais da casa (Instagram, site).
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import * as M from '../../../dados/modelo.js'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { Botao, Rotulo } from '../../../componentes/sistema/pecas.jsx'
import { PARTICIPANTE as T, ATENDIMENTO, ICONE } from '../../textos.js'

/** Link http(s) de verdade (o dado já gravado antes da validação do painel não é confiável). */
export const linkSeguro = (c) => /^https?:\/\//i.test(String(c.link || '').trim())

function Modo ({ p, k, nomesUnidades }) {
  const { estado, unidades } = M.estadoModo(p, k)
  const variasUnidades = (p.unidades || []).length > 1
  const texto = estado === 'sim'
    ? (variasUnidades ? T.modo.simEm(nomesUnidades(unidades)) : T.modo.sim)
    : estado === 'nao_informado' && variasUnidades && unidades.length ? `${T.modo.nao_informado}: ${nomesUnidades(unidades)}` : T.modo[estado]
  return (
    <li className={`ct-modo ct-modo--${k}`} data-estado={estado}>
      <IconeCartoon nome={ATENDIMENTO[k].icone} tamanho={48} />
      <div className="ct-modo__texto">
        <h3 className="ct-modo__nome">{ATENDIMENTO[k].rotulo}</h3>
        <p className="ct-modo__estado">{texto}</p>
        {k === 'delivery' && estado === 'sim' && unidades.map((u) => {
          const canais = (u.combo?.canais || []).filter((c) => /^https?:\/\//i.test(String(c.link || '').trim()))
          return (
            <div key={u.id} className="ct-modo__delivery">
              {variasUnidades && <p className="ct-rotulo">{u.nome || u.endereco?.bairro}</p>}
              {canais.length > 0 && (
                <p>{T.pedirPor}:{' '}
                  {canais.map((c, i) => <a key={i} className="ct-link" href={String(c.link).trim()} target="_blank" rel="noopener noreferrer">{T.canais[c.tipo] || c.tipo}</a>)
                    .reduce((acc, el, i) => (i ? [...acc, ' · ', el] : [el]), [])}
                </p>
              )}
              {u.combo?.delivery_regioes && <p>{T.regioes}: {u.combo.delivery_regioes}</p>}
              <p>{T.taxa}: {u.combo?.delivery_taxa || T.taxaNi}</p>
            </div>
          )
        })}
      </div>
    </li>
  )
}

export function ComoPedir ({ p }) {
  const nomesUnidades = (lista) => M.juntar(lista.map((u) => u.nome || u.endereco?.bairro || p.casa.nome))
  const instagram = p.casa.instagram && p.casa.instagram.replace(/^@/, '').trim()
  const site = p.casa.site && linkSeguro({ link: p.casa.site }) ? p.casa.site : null
  return (
    <section id="atendimento" className="ct-bloco ct-ficha__secao" aria-labelledby="atendimento-titulo">
      <Letreiro id="atendimento-titulo" texto={T.atendimentoTitulo} />
      <ul className="ct-modos">
        {M.MODOS.map(([k]) => <Modo key={k} p={p} k={k} nomesUnidades={nomesUnidades} />)}
      </ul>
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
