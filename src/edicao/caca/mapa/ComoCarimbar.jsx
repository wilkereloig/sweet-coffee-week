/*
 * "Como carimbar": os três passos, à vista (05/11/2026, pedido do Wilker). Texto em CACA.comoCarimbar (src/edicao/caca/textos.js).
 * Sempre fechada (06/11/2026, pedido do Wilker): aberta ocupava a tela inteira. A linha parece uma gaveta (borda, fundo branco, seta em disco)
 * e abre ao toque.
 */
import React from 'react'
import { CACA } from '../textos.js'
import { FolhaGuia, marcarGuiaVisto } from '../guia/GuiaCarimbar.jsx'
import { GUIA } from '../guia/textos.js'

// `navigate` é opcional: sem ele, os links do guia trocam de página pelo navegador.
export function ComoCarimbar ({ navigate = (h) => globalThis.location.assign(h) } = {}) {
  const T = CACA.comoCarimbar
  const [guia, setGuia] = React.useState(false)
  return (
    <details className="ct-como-carimbar">
      <summary>{T.titulo}</summary>
      <ol className="ct-como-carimbar__passos">
        {T.passos.map((p) => (
          <li key={p.titulo}><strong>{p.titulo}</strong><span>{p.texto}</span></li>
        ))}
      </ol>
      <p className="ct-nota">{T.nota}</p>
      <p><button type="button" className="ct-link" data-como-carimbar onClick={() => { marcarGuiaVisto(); setGuia(true) }}>{GUIA.completo}</button></p>
      <FolhaGuia aberta={guia} aoFechar={() => setGuia(false)} navigate={navigate} />
    </details>
  )
}
