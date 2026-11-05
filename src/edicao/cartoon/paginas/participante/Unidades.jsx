/*
 * 4 · Onde encontrar: um cartão por unidade, com tudo o que é DELA — nome e situação de hoje no cabeçalho; endereço,
 * ações e o que ela atende à esquerda; o horário no festival à direita (no desktop). Linhas de informação com ícone de contorno.
 * Revisão de 04/11 (ficha): o horário abre em frases ("Todos os dias, das 12h às 21h") e a grade de 5 a 15/11 vira
 * "Ver todos os dias do festival" — fechada quando as frases já dizem tudo (todos os dias iguais, ou por semana),
 * aberta quando o horário muda dia a dia —; a situação de hoje sobe para o topo do cartão, em pílula.
 * Com várias unidades que atendem de jeitos diferentes, cada cartão diz o que a sua atende.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import { EDICAO } from '../../../config.js'
import * as M from '../../../dados/modelo.js'
import * as H from '../../../dados/horarioFestival.js'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { Botao, Pilula } from '../../../componentes/sistema/pecas.jsx'
import { PARTICIPANTE as T, ATENDIMENTO, ICONE } from '../../textos.js'
import { QueroIr } from '../../MarcasLover.jsx'
import { MAPA_NO_AR } from '../../contexto.js'

/**
 * O horário no festival. Com as datas da edição: as frases em destaque (a leitura de relance) e, abaixo, os dias um a um
 * com o de hoje marcado. Sem as datas da edição, só as frases de sempre.
 */
function Dias ({ linhas, periodo }) {
  if (!linhas?.length) return <p className="ct-unidade__ni">{T.horarioNi}</p>
  const datas = periodo ? H.datasDoFestival(String(periodo.inicio || '').slice(0, 10), String(periodo.fim || '').slice(0, 10)) : []
  const dias = H.diasDeLinhas(linhas, datas)
  const frases = M.horarioNoFestival(linhas, periodo)
  if (!dias.some((d) => d.periodos?.length)) return <ul className="ct-unidade__frases">{frases.map((h) => <li key={h}>{h}</li>)}</ul>
  const hoje = M.hojeEmNatal()
  const modo = H.modoDeDias(dias)
  return (
    <>
      <ul className="ct-unidade__frases ct-unidade__frases--destaque">{frases.map((h) => <li key={h}>{h}</li>)}</ul>
      {/* Todos os dias iguais: a frase já é a programação inteira, a grade repetiria onze vezes o mesmo horário. */}
      {modo !== 'todos' && (
        <details className="ct-dias-detalhe" open={modo === 'dias'}>
          <summary>{T.verDias}</summary>
          <ul className="ct-dias">
            {dias.map((d) => (
              <li key={d.data} className={`ct-dia${d.data === hoje ? ' is-hoje' : ''}${d.periodos?.length ? '' : ' is-fechado'}`}>
                <span className="ct-dia__nome">{H.rotuloDia(d.data)}{d.data === hoje && <span className="ct-dia__hoje">{T.hoje}</span>}</span>
                <span className="ct-dia__horas">{d.periodos?.length ? H.periodosTexto(d.periodos) : T.naoAbre}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  )
}

/** Os modos que a unidade declarou "sim" para o combo (nunca deduz: "não informado" não entra). */
const modosDaUnidade = (u) => M.MODOS.map(([k]) => k).filter((k) => u.combo?.modos?.[k] === 'sim')

function Unidade ({ u, casa, navigate, comCombo, rota, periodo, mostrarModos }) {
  const est = M.estadoAgora(u, undefined, periodo)
  const agora = M.textoEstado(est)
  const titulo = M.caixaLegivel(u.nome || u.endereco?.bairro || casa.nome)
  const comoChegar = M.linkComoChegar(u)
  const obs = comCombo ? M.observacaoUtil(u.combo?.observacao) : ''
  const modos = mostrarModos ? modosDaUnidade(u) : []
  return (
    <article className="ct-unidade" aria-labelledby={`un-${u.id}`}>
      <header className="ct-unidade__cab">
        <div className="ct-unidade__ident">
          <h3 id={`un-${u.id}`} className="ct-unidade__nome">{titulo}</h3>
          {u.nome && u.endereco?.bairro && <p className="ct-rotulo">{u.endereco.bairro}</p>}
        </div>
        {comCombo && u.combo?.disponibilidade?.length > 0 && agora && (
          <p className={`ct-agora ct-agora--${est.estado}`}>
            {est.estado === 'aberto' && <IconeCartoon nome="aberto-agora" tamanho={32} />}{agora}
          </p>
        )}
      </header>
      <div className="ct-unidade__corpo">
        <div className="ct-unidade__onde">
          <p className="ct-unidade__linha"><ScwIcon nome={ICONE.endereco} tamanho={20} />
            <span>{M.enderecoEmLinha(u.endereco) || T.unidadesNi}{u.endereco?.referencia ? ` (${u.endereco.referencia})` : ''}</span></p>
          {modos.length > 0 && (
            <ul className="ct-unidade__modos" aria-label={T.unidadesComModos}>
              {modos.map((k) => <li key={k}><Pilula>{ATENDIMENTO[k].rotulo}</Pilula></li>)}
            </ul>
          )}
          {obs && <p className="ct-unidade__obs">{obs}</p>}
          {(!u.coordenada || u.coordenada.conferir) && <p className="ct-unidade__obs">{T.localizacaoConferencia}</p>}
          <div className="ct-acoes">
            {rota && <QueroIr u={u} nome={M.tituloDaUnidade({ casa }, u)} />}
            {comoChegar && <Botao tipo="secundario" href={comoChegar} target="_blank" rel="noopener noreferrer"><ScwIcon nome={ICONE.comoChegar} tamanho={20} />{T.comoChegar}</Botao>}
            {u.whatsapp && <Botao tipo="secundario" href={M.linkWhatsApp(u.whatsapp)} target="_blank" rel="noopener noreferrer"><ScwIcon nome={ICONE.whatsapp} tamanho={20} />{T.whatsapp}</Botao>}
            {MAPA_NO_AR && u.coordenada && navigate && <Botao tipo="secundario" href={`${EDICAO.caminho}/mapa?unidade=${u.id}`} navigate={navigate}><ScwIcon nome={ICONE.mapa} tamanho={20} />{T.verNoMapa}</Botao>}
          </div>
        </div>
        {comCombo && (
          <div className="ct-unidade__horario">
            <p className="ct-unidade__linha ct-rotulo"><ScwIcon nome={ICONE.horario} tamanho={20} /><span>{T.horarioFestival}</span></p>
            <Dias linhas={u.combo?.disponibilidade} periodo={periodo} />
          </div>
        )}
      </div>
    </article>
  )
}

export function Unidades ({ p, navigate, comCombo, rota, periodo }) {
  const unidades = p.unidades || []
  // Só vale dizer o que cada unidade atende quando elas não atendem todas do mesmo jeito (senão é o que "Como pedir" já disse).
  const mostrarModos = comCombo && unidades.length > 1 && new Set(unidades.map((u) => modosDaUnidade(u).join())).size > 1
  return (
    <section id="unidades" className="ct-bloco ct-ficha__secao" aria-labelledby="un-titulo">
      <Letreiro id="un-titulo" texto={T.unidadesTitulo(unidades.length)} />
      {unidades.length ? (
        <div className={`ct-unidades${unidades.length > 1 ? ' ct-unidades--varias' : ''}`}>
          {unidades.map((u) => <Unidade key={u.id} u={u} casa={p.casa} navigate={navigate} comCombo={comCombo} rota={rota} periodo={periodo} mostrarModos={mostrarModos} />)}
        </div>
      ) : <p className="ct-ni">{T.unidadesNi}</p>}
    </section>
  )
}
