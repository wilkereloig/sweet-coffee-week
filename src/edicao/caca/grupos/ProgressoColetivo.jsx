/*
 * Progresso coletivo do grupo (spec 15 §8): casas validadas por pelo menos um integrante, cada casa uma vez. É conquista
 * visual: não muda nenhuma regra individual. As casas conquistadas aparecem pelo nome, com um ✓ escrito, sem depender de cor.
 */
import React from 'react'
import { progressoColetivo, nomeParaRota } from './regras.js'
import { GRUPOS } from './textos.js'

const T = GRUPOS.coletivo

export function ProgressoColetivo ({ grupo, dados }) {
  const { total, feitas, faltam, completo } = progressoColetivo(grupo)
  const slugs = Array.isArray(grupo.casas_coletivas_slugs) ? grupo.casas_coletivas_slugs : []
  return (
    <section className="ct-caca__bloco ct-grupos__coletivo" aria-labelledby="grupo-coletivo">
      <h2 id="grupo-coletivo" className="ct-sub">{T.titulo}</h2>
      <p className="ct-caca__grande"><strong>{feitas} de {total}</strong> <span>{total === 1 ? 'casa' : 'casas'} conquistadas pelo grupo</span></p>
      <progress className="ct-caca__barra" value={feitas} max={Math.max(total, 1)} aria-label={T.texto(feitas, total)} />
      <p className="ct-nota"><strong>{completo ? T.completo : T.faltam(faltam)}</strong></p>
      <p className="ct-nota">{T.explica}</p>
      <h3 className="ct-grupos__subtitulo">{T.conquistadas}</h3>
      {slugs.length === 0
        ? <p className="ct-nota">{T.nenhuma}</p>
        : <ul className="ct-grupos__casas">{slugs.map((s) => <li key={s}><span aria-hidden="true">✓</span> {nomeParaRota(dados, s)}</li>)}</ul>}
    </section>
  )
}
