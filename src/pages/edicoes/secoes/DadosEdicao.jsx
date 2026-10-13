import React from 'react'
import { TEXTOS } from '../../../data/conteudo/edicoes'

/* Ficha da edição (período · marcas · Sweet Awards) e lista de marcas — as
   mesmas peças no desktop e no celular, só a classe muda. */

export function Ficha({ classe, periodo, nParticipantes, premiacao }) {
  return (
    <dl className={classe}>
      <div><dt>Período</dt><dd>{periodo}</dd></div>
      <div><dt>Marcas</dt><dd>{nParticipantes} participantes</dd></div>
      <div><dt>Sweet Awards</dt><dd>{premiacao}</dd></div>
    </dl>
  )
}

/* Nomes canônicos, em ordem alfabética (edicoesData.js). A nota diz o que a
   galeria NÃO diz: as fotos são da edição, não de uma casa da lista. */
export function ListaMarcas({ classe, participantes }) {
  return (
    <>
      <ul className={classe}>
        {participantes.length
          ? participantes.map((p) => <li key={p}><span className="scw-edx__ponto" aria-hidden="true" />{p}</li>)
          : <li>{TEXTOS.marcasPendentes}</li>}
      </ul>
      <p className="scw-edx__nota">{TEXTOS.notaFotos}</p>
    </>
  )
}

export const rotuloMarcas = (n) => (typeof n === 'number' ? `Ver as ${n} marcas` : 'Ver participantes')
