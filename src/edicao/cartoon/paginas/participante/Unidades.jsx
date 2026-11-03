/*
 * 4 · Onde encontrar: um cartão por unidade — endereço e ações à esquerda; o horário no festival, dia a dia
 * (5 a 15/11, com o dia de hoje marcado), à direita no desktop. Linhas de informação com ícone de contorno.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import { EDICAO } from '../../../config.js'
import * as M from '../../../dados/modelo.js'
import * as H from '../../../dados/horarioFestival.js'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { Botao } from '../../../componentes/sistema/pecas.jsx'
import { PARTICIPANTE as T, ICONE } from '../../textos.js'
import { QueroIr } from '../../MarcasLover.jsx'

/** O horário no festival, dia a dia (5 a 15/11), com o dia de hoje marcado. Sem as datas da edição, em frases. */
function Dias ({ linhas, periodo }) {
  if (!linhas?.length) return <p className="ct-unidade__ni">{T.horarioNi}</p>
  const datas = periodo ? H.datasDoFestival(String(periodo.inicio || '').slice(0, 10), String(periodo.fim || '').slice(0, 10)) : []
  const dias = H.diasDeLinhas(linhas, datas)
  if (!dias.some((d) => d.periodos?.length)) return <ul className="ct-unidade__frases">{M.horarioNoFestival(linhas, periodo).map((h) => <li key={h}>{h}</li>)}</ul>
  const hoje = M.hojeEmNatal()
  return (
    <ul className="ct-dias">
      {dias.map((d) => (
        <li key={d.data} className={`ct-dia${d.data === hoje ? ' is-hoje' : ''}${d.periodos?.length ? '' : ' is-fechado'}`}>
          <span className="ct-dia__nome">{H.rotuloDia(d.data)}{d.data === hoje && <span className="ct-dia__hoje">{T.hoje}</span>}</span>
          <span className="ct-dia__horas">{d.periodos?.length ? H.periodosTexto(d.periodos) : T.naoAbre}</span>
        </li>
      ))}
    </ul>
  )
}

function Unidade ({ u, casa, navigate, comCombo, rota, periodo }) {
  const est = M.estadoAgora(u, undefined, periodo)
  const agora = M.textoEstado(est)
  const titulo = u.nome || u.endereco?.bairro || casa.nome
  const comoChegar = M.linkComoChegar(u)
  return (
    <article className="ct-unidade" aria-labelledby={`un-${u.id}`}>
      <div className="ct-unidade__onde">
        <h3 id={`un-${u.id}`} className="ct-unidade__nome">{titulo}</h3>
        {u.nome && u.endereco?.bairro && <p className="ct-rotulo">{u.endereco.bairro}</p>}
        <p className="ct-unidade__linha"><ScwIcon nome={ICONE.endereco} tamanho={20} />
          <span>{M.enderecoEmLinha(u.endereco) || T.unidadesNi}{u.endereco?.referencia ? ` (${u.endereco.referencia})` : ''}</span></p>
        {comCombo && u.combo?.observacao && <p className="ct-unidade__obs">{u.combo.observacao}</p>}
        {(!u.coordenada || u.coordenada.conferir) && <p className="ct-unidade__obs">{T.localizacaoConferencia}</p>}
        <div className="ct-acoes">
          {rota && <QueroIr u={u} nome={M.tituloDaUnidade({ casa }, u)} />}
          {comoChegar && <Botao tipo="secundario" href={comoChegar} target="_blank" rel="noopener noreferrer"><ScwIcon nome={ICONE.comoChegar} tamanho={20} />{T.comoChegar}</Botao>}
          {u.whatsapp && <Botao tipo="secundario" href={M.linkWhatsApp(u.whatsapp)} target="_blank" rel="noopener noreferrer"><ScwIcon nome={ICONE.whatsapp} tamanho={20} />{T.whatsapp}</Botao>}
          {u.coordenada && navigate && <Botao tipo="secundario" href={`${EDICAO.caminho}/mapa?unidade=${u.id}`} navigate={navigate}><ScwIcon nome={ICONE.mapa} tamanho={20} />{T.verNoMapa}</Botao>}
        </div>
      </div>
      {comCombo && (
        <div className="ct-unidade__horario">
          <p className="ct-unidade__linha ct-rotulo"><ScwIcon nome={ICONE.horario} tamanho={20} /><span>{T.horarioFestival}</span></p>
          <Dias linhas={u.combo?.disponibilidade} periodo={periodo} />
          {u.combo?.disponibilidade?.length > 0 && agora && (
            <p className={`ct-agora ct-agora--${est.estado}`}>
              {est.estado === 'aberto' && <IconeCartoon nome="aberto-agora" tamanho={32} />}{agora}
            </p>
          )}
        </div>
      )}
    </article>
  )
}

export function Unidades ({ p, navigate, comCombo, rota, periodo }) {
  const unidades = p.unidades || []
  return (
    <section id="unidades" className="ct-bloco ct-ficha__secao" aria-labelledby="un-titulo">
      <Letreiro id="un-titulo" texto={T.unidadesTitulo(unidades.length)} />
      {unidades.length ? (
        <div className={`ct-unidades${unidades.length > 1 ? ' ct-unidades--varias' : ''}`}>
          {unidades.map((u) => <Unidade key={u.id} u={u} casa={p.casa} navigate={navigate} comCombo={comCombo} rota={rota} periodo={periodo} />)}
        </div>
      ) : <p className="ct-ni">{T.unidadesNi}</p>}
    </section>
  )
}
