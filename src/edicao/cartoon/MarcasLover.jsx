/*
 * "Quero ir" e "Já fui" — painel do Sweet Lover (docs/cartoon-2026-2/10 §10.14), salvo no aparelho, sem conta.
 * A mesma peça no mapa, no cartão do catálogo, na ficha e na Minha rota. Botão de alternância: rótulo fixo +
 * aria-pressed (o estado não troca o nome), ícone da edição + texto. Sem a Minha rota no contexto (prévia do
 * painel), não aparece.
 * Quero ir é da UNIDADE (vira parada); já fui é da CASA (vira progresso "x de N casas").
 */
import React from 'react'
import { EDICAO } from '../config.js'
import { Link } from '../componentes/base.jsx'
import { IconeCartoon } from '../componentes/sistema/IconeCartoon.jsx'
import { Chip } from '../componentes/sistema/pecas.jsx'
import { useRota } from './contexto.js'
import { LOVER as T } from './textos.js'

/** Quero ir para UMA unidade: entra e sai da lista (as paradas da Minha rota). */
export function QueroIr ({ u, nome }) {
  const rota = useRota()
  if (!rota) return null
  const sim = rota.tem(u.id)
  return <Chip className="ct-marca" ativo={sim} icone="quero-ir" onClick={() => (sim ? rota.remover(u.id, nome) : rota.adicionar(u.id, nome))}>{T.queroIr}</Chip>
}

/**
 * Quero ir para a CASA: com uma unidade, é o botão dela; com várias, o visitante escolhe qual — o link leva às
 * unidades (`#unidades` na própria ficha; `?ver=unidades` vindo do catálogo). Sem unidade, nada a marcar.
 */
export function QueroIrCasa ({ p, navigate, naFicha = false }) {
  const rota = useRota()
  const us = p.unidades || []
  if (!rota || !us.length) return null
  if (us.length === 1) return <QueroIr u={us[0]} nome={p.casa.nome} />
  const naLista = us.filter((u) => rota.tem(u.id)).length
  const filhos = <><IconeCartoon nome="quero-ir" tamanho={32} /><span>{T.queroIr}<span className="ct-marca__nota">{naLista ? T.naLista(naLista) : T.escolher(us.length)}</span></span></>
  const className = `ct-chip ct-chip--icone ct-marca${naLista ? ' is-ligada' : ''}`
  return naFicha
    ? <a className={className} href="#unidades">{filhos}</a>
    : <Link className={className} href={`${EDICAO.caminho}/participantes/${p.slug}?ver=unidades`} navigate={navigate}>{filhos}</Link>
}

/** Já fui: marca a casa (todas as unidades). Sem unidade, não há o que visitar. */
export function JaFui ({ p }) {
  const rota = useRota()
  if (!rota || !(p.unidades || []).length) return null
  return <Chip className="ct-marca" ativo={rota.foi(p)} icone="ja-fui" onClick={() => rota.alternarVisita(p)}>{T.jaFui}</Chip>
}
