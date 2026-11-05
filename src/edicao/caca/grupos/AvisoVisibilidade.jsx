/*
 * Aviso OBRIGATÓRIO de visibilidade (spec 15 §7/§8): apelido e progresso passam a ser vistos pelos integrantes.
 * Usado ao criar o grupo e ao entrar por convite; o aceite viaja ao banco como `p_aceite_visibilidade`.
 */
import React from 'react'
import { GRUPOS } from './textos.js'

const T = GRUPOS.aviso

export function AvisoVisibilidade ({ marcado, aoMudar, erro = '', id = 'grupo-aviso' }) {
  return (
    <div className="ct-grupos__aviso">
      <p id={`${id}-t`} className="ct-sub">{T.titulo}</p>
      <p id={`${id}-d`} className="ct-nota">{T.texto}</p>
      <label className="ct-check">
        <input type="checkbox" checked={marcado} onChange={(e) => aoMudar(e.target.checked)} required aria-describedby={`${id}-d${erro ? ` ${id}-e` : ''}`} aria-invalid={erro ? 'true' : undefined} />
        <span>{T.aceite}</span>
      </label>
      {erro && <p id={`${id}-e`} className="ct-aviso" role="alert">{erro}</p>}
    </div>
  )
}
