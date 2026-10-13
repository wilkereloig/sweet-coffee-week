import React from 'react'
import { TEXTOS } from '../../../data/conteudo/edicoes'

/*
 * HISTÓRIA — no fluxo da página, nada atrás de botão. Texto corrido à
 * esquerda (o começo do festival, só na estreia; por que a edição marcou; um
 * destaque; o que ficou) e as curiosidades do acervo ao lado. Sem texto
 * nenhum, a seção não existe.
 */
function Bloco({ titulo, children }) {
  return (
    <section className="edx-hist__bloco">
      <h3 className="edx-hist__sub">{titulo}</h3>
      {children}
    </section>
  )
}

export function Historia({ narrativa, abertura, curiosidades }) {
  const temTexto = abertura || narrativa.marco || narrativa.curiosidade || narrativa.legado
  if (!temTexto && !curiosidades.length) return null
  return (
    <section className="scw-secao edx-hist" aria-labelledby="edx-hist-titulo">
      <h2 id="edx-hist-titulo" className="scw-h2 edx-hist__titulo">{TEXTOS.historia}</h2>
      <div className={`edx-hist__grade${curiosidades.length ? '' : ' edx-hist__grade--so-texto'}`}>
        {temTexto && (
          <div className="edx-hist__texto">
            {abertura && (
              <Bloco titulo={TEXTOS.comecoFestival}>
                {abertura.paragrafos.map((p) => <p key={p.slice(0, 32)} className="scw-corpo">{p}</p>)}
              </Bloco>
            )}
            {narrativa.marco && <Bloco titulo={TEXTOS.marco}><p className="scw-corpo">{narrativa.marco}</p></Bloco>}
            {narrativa.curiosidade && <Bloco titulo={TEXTOS.destaque}><p className="scw-corpo">{narrativa.curiosidade}</p></Bloco>}
            {narrativa.legado && <Bloco titulo={TEXTOS.legado}><p className="scw-corpo">{narrativa.legado}</p></Bloco>}
          </div>
        )}
        {curiosidades.length > 0 && (
          <aside className="edx-hist__curios" aria-labelledby="edx-curios-titulo">
            <h3 id="edx-curios-titulo" className="edx-hist__sub">{TEXTOS.curiosidades}</h3>
            <ul>
              {curiosidades.map((c) => (
                <li key={c.t}>
                  <strong>{c.t}</strong>
                  <span>{c.x}</span>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </section>
  )
}
