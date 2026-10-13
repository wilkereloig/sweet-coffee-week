import React from 'react'
import { DEPOIS as D } from '../../../data/conteudo/participar'
import { Cabeca, Destaque } from '../comum'

/* 05 Depois do pré-cadastro — trilha de cinco passos sobre chocolate. O apoio
   da cabeça é o que não pode se perder: pré-cadastro não é vaga. */
export function Depois() {
  return (
    <section id="depois-do-pre-cadastro" className="scw-secao scw-secao--choco" aria-labelledby="pa-depois-titulo">
      <Cabeca
        icone="mapa/trajeto"
        rotulo={D.rotulo}
        idTitulo="pa-depois-titulo"
        titulo={<>{D.titulo} <Destaque base="var(--scw-creme)" dest="var(--scw-amarelo)">{D.destaque}</Destaque></>}
        apoio={D.apoio}
      />
      <ol className="pa-passos">
        {D.passos.map((p, i) => (
          <li className="pa-passo" key={p.titulo} style={{ '--c': p.cor, '--tinta': p.tinta }}>
            <span className="pa-passo__no" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="scw-h3">{p.titulo}</h3>
            <p>{p.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
