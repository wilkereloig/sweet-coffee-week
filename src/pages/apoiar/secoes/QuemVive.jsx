import React from 'react'
import { QUEM_VIVE as Q } from '../../../data/conteudo/apoiar'
import { Cabeca, Destaque } from '../../participar/comum'

/* 03 Quem vive o festival — o argumento da página: com quem a marca conversa.
   Grade editorial (índice + filete, sem bullet) e, separada por um vão maior
   de propósito, a prova de imprensa. */
export function QuemVive() {
  return (
    <section className="scw-secao scw-secao--choco" aria-labelledby="pa-quem-vive-titulo">
      <Cabeca
        icone="pessoas"
        rotulo={Q.rotulo}
        idTitulo="pa-quem-vive-titulo"
        titulo={<>{Q.titulo} <Destaque base="var(--scw-creme)" dest="var(--scw-cyan)">{Q.destaque}</Destaque></>}
        apoio={Q.apoio}
      />
      {/* O índice vem do próprio array: escrito à mão sai de sincronia. */}
      <ul className="pa-quem">
        {Q.publico.map((p, i) => (
          <li key={p} className="pa-quem__item">
            <span className="pa-quem__indice">{String(i + 1).padStart(2, '0')}</span>
            <span className="pa-quem__texto">{p}</span>
          </li>
        ))}
      </ul>
      <div className="pa-veiculos__bloco">
        <span className="pa-veiculos__rotulo">{Q.imprensaRotulo}</span>
        <ul className="pa-veiculos">
          {Q.veiculos.map((v) => <li key={v}>{v}</li>)}
        </ul>
      </div>
    </section>
  )
}
