import React from 'react'
import { resolveParticipant } from '../../../data/participantAssets'
import { TEXTOS } from '../../../data/conteudo/edicoes'
import { rotuloMarcas } from '../acervo'

/*
 * MARCAS PARTICIPANTES — seção própria, lista tipográfica em colunas, nomes
 * canônicos em ordem alfabética (edicoesData.js). A contagem do título é a
 * da lista inteira, mesmo com ela recolhida.
 *
 * Logo só onde o vínculo marca × edição está confirmado no acervo: a Lovers
 * (2026.1), a única edição com pasta por participante (imageLibrary.js). Nas
 * outras, o nome em tipografia — nunca a logo de hoje colada numa edição de
 * anos atrás, que pode ter tido outra marca.
 */
const LIMITE = 18
const COM_LOGO = new Set(['2026.1'])

export function Participantes({ participantes, n, code }) {
  const [todas, setTodas] = React.useState(false)
  const id = 'edx-marcas-lista'
  const longa = participantes.length > LIMITE
  const visiveis = longa && !todas ? participantes.slice(0, LIMITE) : participantes
  const logos = COM_LOGO.has(code)

  return (
    <section className="scw-secao scw-secao--bege edx-marcas" aria-labelledby="edx-marcas-titulo">
      <h2 id="edx-marcas-titulo" className="scw-h2 edx-marcas__titulo">
        {n != null ? `${rotuloMarcas(n)} participantes` : 'Marcas participantes'}
      </h2>
      {participantes.length ? (
        <ul id={id} className={`edx-marcas__lista${logos ? ' edx-marcas__lista--logos' : ''}`}>
          {visiveis.map((nome) => {
            const p = logos ? resolveParticipant(nome) : null
            return (
              <li key={nome}>
                {p && (p.logo
                  ? <img className="edx-marcas__logo" src={p.logo} alt="" loading="lazy" decoding="async" />
                  : <span className="edx-marcas__logo edx-marcas__iniciais" aria-hidden="true">{p.fallback}</span>)}
                <span>{nome}</span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="scw-corpo">{TEXTOS.marcasPendentes}</p>
      )}
      {longa && (
        <button
          type="button"
          className="scw-btn scw-btn--contorno-escuro edx-marcas__mais"
          aria-expanded={todas}
          aria-controls={id}
          onClick={() => setTodas((v) => !v)}
        >
          {todas ? 'Mostrar menos' : `Mostrar as ${participantes.length} marcas`}
        </button>
      )}
    </section>
  )
}
