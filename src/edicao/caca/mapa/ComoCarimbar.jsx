/*
 * "Como carimbar": os três passos, à vista (05/11/2026, pedido do Wilker). Texto em CACA.comoCarimbar (src/edicao/caca/textos.js).
 * Sempre fechada (06/11/2026, pedido do Wilker): aberta ocupava a tela inteira. A linha parece uma gaveta (borda, fundo branco, seta em disco)
 * e abre ao toque.
 */
import React from 'react'
import { CACA } from '../textos.js'

export function ComoCarimbar () {
  const T = CACA.comoCarimbar
  return (
    <details className="ct-como-carimbar">
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
