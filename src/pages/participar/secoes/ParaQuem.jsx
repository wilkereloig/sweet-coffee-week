import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import { Rotulo } from '../../../components/Rotulo'
import { PARA_QUEM as P } from '../../../data/conteudo/participar'
import { Destaque } from '../comum'

/* Disco na cor do ciclo, tinta que passa sobre ele (§6.3): sobre o bege a cor
   vai para o grafismo, não para o texto. */
const DISCOS = [
  { c: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)' },
  { c: 'var(--scw-cyan)', tinta: 'var(--scw-choco)' },
  { c: 'var(--scw-magenta)', tinta: 'var(--scw-creme)' },
]

// "A, B e C." — a lista de tipos de casa como frase corrida.
const frase = (itens) => `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}.`

/* 03 Para quem é + como funciona — uma seção, duas colunas: quem cabe na
   edição (à esquerda, em tipografia) e o que a edição pede da casa (à
   direita, em três passos). O id `como-funciona` é o destino da ação
   secundária do herói. */
export function ParaQuem() {
  return (
    <section id="como-funciona" className="scw-secao scw-secao--bege" aria-labelledby="pa-quem-titulo">
      <div className="pa-paraquem">
        <div className="pa-paraquem__quem">
          <Rotulo icone="topicos/quem-pode">{P.rotulo}</Rotulo>
          <h2 className="scw-h2" id="pa-quem-titulo">
            {P.titulo} <Destaque>{P.destaque}</Destaque>
          </h2>
          <p className="pa-tipos">{frase(P.tipos)}</p>
          <p className="pa-paraquem__nota">{P.onde} {P.semLoja}</p>
        </div>

        <div className="pa-paraquem__como">
          <h3 className="scw-h3">{P.comoTitulo}</h3>
          <ol className="pa-como">
            {P.como.map((c, i) => (
              <li key={c.titulo}>
                <span className="scw-disco" aria-hidden="true" style={{ '--c': DISCOS[i].c, '--tinta': DISCOS[i].tinta }}>
                  <ScwIcon nome={c.icone} tamanho={24} />
                </span>
                <div>
                  <strong>{c.titulo}</strong>
                  <p>{c.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
