/*
 * "Como carimbar": os três passos, à vista (05/11/2026, pedido do Wilker). Texto em CACA.comoCarimbar (src/edicao/caca/textos.js).
 * `aberto`: aberto por padrão para quem ainda não validou nenhuma casa; depois vira uma linha que se abre ao toque.
 */
import React from 'react'
import { CACA } from '../textos.js'

export function ComoCarimbar ({ aberto = false }) {
  const T = CACA.comoCarimbar
  return (
    <details className="ct-como-carimbar" open={aberto}>
      <summary>{T.titulo}</summary>
      <ol className="ct-como-carimbar__passos">
        {T.passos.map((p) => (
          <li key={p.titulo}><strong>{p.titulo}</strong><span>{p.texto}</span></li>
        ))}
      </ol>
      <p className="ct-nota">{T.nota}</p>
    </details>
  )
}
