/*
 * O que a casa declarou de cada item (restrições, características) e as opções de troca.
 * Cada linha abre com um ícone de contorno do assunto (lista 13, P2): quem tem restrição acha "Contém" de relance.
 * O que o painel não tem aparece como "não informado" — nunca deduzido.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import * as M from '../../../dados/modelo.js'
import { PARTICIPANTE as T, ICONE } from '../../textos.js'

function Linha ({ tipo, icone, titulo, children }) {
  return (
    <div className={`ct-alimentar__linha${tipo ? ` ct-alimentar__linha--${tipo}` : ''}`}>
      <dt><ScwIcon nome={icone} tamanho={20} /><span>{titulo}</span></dt>
      <dd>{children}</dd>
    </div>
  )
}

export function Alimentar ({ item }) {
  if (!item.alimentar?.length) return <p className="ct-alimentar__nada"><ScwIcon nome={ICONE.naoInformado} tamanho={20} /><span>{T.restricoesNada}</span></p>
  const r = M.resumoItem(item)
  const c = r.caracteristicas
  const extras = [
    c.lactose !== 'nao_informado' && T.lactose[c.lactose],
    c.vegano === 'sim' && T.vegano.sim,
    c.vegetariano === 'sim' && c.vegano !== 'sim' && T.vegetariano.sim,
    c.acucar_adicionado !== 'nao_informado' && T.acucar[c.acucar_adicionado],
  ].filter(Boolean)
  return (
    <dl className="ct-alimentar">
      {r.contem.length > 0 && <Linha tipo="contem" icone={ICONE.contem} titulo={T.contem}>{M.juntar(r.contem)}</Linha>}
      {r.podeConter.length > 0 && <Linha tipo="pode" icone={ICONE.podeConter} titulo={T.podeConter}>{M.juntar(r.podeConter)}</Linha>}
      {r.naoContem.length > 0 && <Linha icone={ICONE.naoContem} titulo={T.naoContem}>{M.juntar(r.naoContem)}</Linha>}
      {r.naoInformado.length > 0 && <Linha tipo="ni" icone={ICONE.naoInformado} titulo={T.naoInformado}>{M.juntar(r.naoInformado)}</Linha>}
      {extras.length > 0 && <Linha tipo="extra" icone={ICONE.caracteristicas} titulo="Características">{extras.join(' · ')}</Linha>}
    </dl>
  )
}

// Desde 02/11/2026 a troca é um item alternativo (nome, descrição e alergênicos próprios); o original é o próprio item.
// "Troca X por Y" só no registro antigo, em que o original era outra coisa e não havia descrição.
const plano = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
const trocaAntiga = (s, nomeItem) => !!s.original && !s.descricao && plano(s.original) !== plano(nomeItem)
const alergenicosDaTroca = (s, estado) => (s.alimentar || []).filter((d) => d.estado === estado)
  .map((d) => (d.aspecto === 'outro_alergenico' && d.observacao) || M.rotuloAspecto(d.aspecto))

export function Trocas ({ lista, unidades, nomeItem }) {
  if (!lista?.length) return null
  const nomeUnidade = (id) => unidades.find((u) => u.id === id)?.nome || unidades.find((u) => u.id === id)?.endereco?.bairro || id
  return (
    <details className="ct-trocas">
      <summary><ScwIcon nome={ICONE.trocas} tamanho={20} /><span>{T.trocas} ({lista.length})</span></summary>
      <ul>
        {lista.map((s, i) => {
          const contem = alergenicosDaTroca(s, 'contem'), pode = alergenicosDaTroca(s, 'pode_conter')
          return (
            <li key={i}>
              {trocaAntiga(s, nomeItem)
                ? <p>{T.troca.de} <strong>{s.original}</strong> {T.troca.por} <strong>{s.alternativa}</strong></p>
                : <p><strong>{s.alternativa}</strong>{s.descricao ? ` — ${s.descricao}` : ''}</p>}
              <p className="ct-trocas__meta">
                {[T.troca[s.disponibilidade],
                  s.acrescimo > 0 ? T.troca.acrescimo(M.formatarPreco(s.acrescimo)) : null,
                  s.como_solicitar,
                  s.unidades?.length ? `só em ${M.juntar(s.unidades.map(nomeUnidade))}` : null,
                ].filter(Boolean).join(' · ')}
              </p>
              {contem.length > 0 && <p className="ct-trocas__meta">{T.contem}: {M.juntar(contem)}</p>}
              {pode.length > 0 && <p className="ct-trocas__meta">{T.podeConter}: {M.juntar(pode)}</p>}
            </li>
          )
        })}
      </ul>
    </details>
  )
}
