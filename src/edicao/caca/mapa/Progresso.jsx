/*
 * Progresso pessoal e próximo passo, no alto do mapa (spec 15 §10). "X de N casas validadas" vem do servidor; sem mapa a
 * pessoa recebe o convite para criar o dela; leitura que falha diz a verdade e deixa tentar de novo.
 * `proximo`: { tipo, slug, nome } de `proximoPasso` + o nome da casa. As ações recebem o slug.
 */
import React from 'react'
import { IconeCartoon } from '../../componentes/sistema/IconeCartoon.jsx'
import { Botao } from '../../componentes/sistema/pecas.jsx'
import { Carregando } from '../../componentes/base.jsx'
import { progressoPessoal } from './estados.js'
import { MAPA_CACA as T } from './textos.js'

export function ProgressoPessoal ({ estado, mapa, totalDaEdicao, proximo, aoVerCasa, aoAvaliar, atualizar, navigate }) {
  const id = React.useId()
  if (estado === 'carregando') return <div className="ct-progresso ct-caca-mapa__progresso"><Carregando texto={T.lendoMapa} /></div>
  if (estado === 'falha') {
    return (
      <div className="ct-progresso ct-caca-mapa__progresso" role="alert">
        <p>{T.falhaMapa}</p>
        {atualizar && <button type="button" className="ct-botao ct-botao--contorno" onClick={atualizar}>{T.tentarDeNovo}</button>}
      </div>
    )
  }
  if (estado === 'sem-mapa') {
    return (
      <div className="ct-progresso ct-caca-mapa__progresso">
        <IconeCartoon nome="progresso" tamanho={64} />
        <div className="ct-progresso__corpo ct-caca-mapa__progresso-corpo">
          <p>{T.semMapa}</p>
          <Botao href={T.caminhos.central} navigate={navigate}>{T.criarMapa}</Botao>
        </div>
      </div>
    )
  }
  const p = progressoPessoal(mapa, totalDaEdicao)
  const detalhe = T.progressoDetalhe(p.pendentes, p.extras)
  const passo = proximo && proximo.tipo !== 'criar-mapa' && proximo.tipo !== 'nenhum' ? proximo : null
  return (
    <div className="ct-progresso ct-caca-mapa__progresso">
      <IconeCartoon nome="progresso" tamanho={64} />
      <div className="ct-progresso__corpo ct-caca-mapa__progresso-corpo">
        <p className="ct-progresso__texto" id={id}><strong>{T.progresso(p.feitas, p.total)}</strong></p>
        <progress className="ct-progresso__barra" max={p.total || 1} value={p.feitas} aria-labelledby={id} />
        {detalhe && <p className="ct-nota">{detalhe}</p>}
        {passo && (
          <div className="ct-caca-mapa__proximo" role="group" aria-label={T.proximoTitulo}>
            <p><strong>{T.proximoTitulo}.</strong> {passo.tipo === 'completo' ? T.proximo.completo : T.proximo[passo.tipo](passo.nome)}</p>
            {passo.tipo === 'avaliar' && aoAvaliar && <button type="button" className="ct-botao" onClick={() => aoAvaliar(passo.slug)}>{T.acaoProximo.avaliar}</button>}
            {(passo.tipo === 'rota' || passo.tipo === 'visitar') && aoVerCasa && <button type="button" className="ct-botao ct-botao--contorno" onClick={() => aoVerCasa(passo.slug)}>{T.acaoProximo[passo.tipo]}</button>}
          </div>
        )}
      </div>
    </div>
  )
}
