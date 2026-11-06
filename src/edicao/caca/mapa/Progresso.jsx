/*
 * Progresso pessoal e próximo passo, no mapa (spec 15 §10). "X de N casas validadas" vem do servidor; sem mapa a pessoa
 * recebe o convite para criar o dela; leitura que falha diz a verdade e deixa tentar de novo.
 * Redesign de 06/11/2026 — o mapa é o protagonista, então é UMA faixa fina: ícone · "X de N casas validadas" · barra
 * (+ detalhe numa linha) e, só quando há o que fazer, o PRÓXIMO PASSO como um botão que diz a ação inteira (avaliar >
 * parada da rota > próxima casa do caminho): a ação principal da tela. A frase longa vai como descrição do botão.
 * `proximo`: { tipo, slug, nome } de `proximoPasso` + o nome da casa. As ações recebem o slug.
 */
import React from 'react'
import { IconeCartoon } from '../../componentes/sistema/IconeCartoon.jsx'
import { Botao } from '../../componentes/sistema/pecas.jsx'
import { Carregando } from '../../componentes/base.jsx'
import { progressoPessoal } from './estados.js'
import { ComoCarimbar } from './ComoCarimbar.jsx'
import { MAPA_CACA as T } from './textos.js'

export function ProgressoPessoal ({ estado, mapa, totalDaEdicao, proximo, geo, aoVerCasa, aoAvaliar, atualizar, navigate }) {
  const id = React.useId()
  const moldura = (corpo, extra = null) => (
    <section className="ct-progresso ct-caca-mapa__progresso ct-mapa__progresso" aria-label={T.progressoTitulo}>
      <div className="ct-mapa__progresso-topo">
        <IconeCartoon nome="progresso" tamanho={32} />
        <div className="ct-progresso__corpo ct-caca-mapa__progresso-corpo">{corpo}</div>
      </div>
      {extra}
    </section>
  )
  if (estado === 'carregando') return moldura(<Carregando texto={T.lendoMapa} />)
  if (estado === 'falha') {
    return moldura(
      <div role="alert">
        <p>{T.falhaMapa}</p>
        {atualizar && <button type="button" className="ct-botao ct-botao--contorno" onClick={atualizar}>{T.tentarDeNovo}</button>}
      </div>,
    )
  }
  if (estado === 'sem-mapa') {
    // Convite: o benefício (texto), UMA ação principal (o botão) e a ajuda ("Como carimbar") como acesso secundário, que abre no lugar.
    return (
      <section className="ct-progresso ct-mapa__convite" aria-label={T.progressoTitulo}>
        <IconeCartoon nome="progresso" tamanho={48} />
        <p className="ct-mapa__convite-texto">{T.semMapa}</p>
        <Botao href={T.caminhos.central} navigate={navigate}>{T.criarMapa}</Botao>
        <ComoCarimbar />
      </section>
    )
  }
  const p = progressoPessoal(mapa, totalDaEdicao)
  const detalhe = T.progressoDetalhe(p.pendentes, p.extras)
  return moldura(
    <>
      <p className="ct-progresso__texto" id={id}><strong>{T.progresso(p.feitas, p.total)}</strong></p>
      <progress className="ct-progresso__barra" max={p.total || 1} value={p.feitas} aria-labelledby={id} />
    </>,
    <>
      {detalhe && <p className="ct-nota ct-mapa__progresso-detalhe">{detalhe}</p>}
      <ProximoPasso proximo={proximo} geo={geo} aoVerCasa={aoVerCasa} aoAvaliar={aoAvaliar} />
      {/* Aberto para quem ainda não validou nenhuma casa nem tem carimbo esperando; depois, uma linha que abre ao toque. */}
      <ComoCarimbar />
    </>,
  )
}

/** A ação principal da tela. Só existe com algo a fazer ('criar-mapa' e 'nenhum' não têm botão: o convite já está na faixa). */
function ProximoPasso ({ proximo, geo, aoVerCasa, aoAvaliar }) {
  const idDescricao = React.useId()
  if (!proximo || proximo.tipo === 'criar-mapa' || proximo.tipo === 'nenhum') return null
  const { tipo, slug, nome, km } = proximo
  if (tipo === 'completo') return <div className="ct-mapa__proximo" role="group" aria-label={T.proximoTitulo}><p>{T.proximo.completo}</p></div>
  const aoClicar = tipo === 'avaliar' ? aoAvaliar : aoVerCasa
  if (!aoClicar) return null
  return (
    <div className="ct-mapa__proximo" role="group" aria-label={T.proximoTitulo}>
      <button type="button" className={`ct-botao ct-mapa__proximo-botao${tipo === 'avaliar' ? '' : ' ct-botao--contorno'}`} aria-describedby={idDescricao} onClick={() => aoClicar(slug)}>
        <span className="ct-mapa__proximo-rotulo">{T.proximoTitulo}</span>
        <span>{T.proximoAcao[tipo](nome, km)}</span>
      </button>
      <span id={idDescricao} className="ct-sr">{T.proximo[tipo](nome, km)}</span>
      {tipo === 'visitar' && !Number.isFinite(km) && T.pertoDica[geo] && <p className="ct-nota">{T.pertoDica[geo]}</p>}
    </div>
  )
}
