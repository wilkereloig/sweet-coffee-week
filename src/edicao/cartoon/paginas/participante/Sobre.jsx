/*
 * 5 · Sobre a casa: o texto de apresentação que a casa escreveu e as fotos da casa (fachada, salão), quando existem.
 * A apresentação morava no topo, ao lado do nome, e competia com a foto do combo; aqui ela tem o seu lugar, depois de
 * "onde encontrar". Sem texto e sem foto a seção não existe (nada de bloco vazio): as fotos do combo e dos itens moram nos cartões.
 */
import React from 'react'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { Galeria } from '../../../componentes/sistema/Galeria.jsx'
import { PARTICIPANTE as T } from '../../textos.js'

export function Sobre ({ p }) {
  const texto = String(p.casa.apresentacao || '').trim()
  const fotos = (p.unidades || []).flatMap((u) => u.fotos || [])
  if (!texto && !fotos.length) return null
  return (
    <section id="sobre" className="ct-bloco ct-ficha__secao" aria-labelledby="sobre-titulo">
      <Letreiro id="sobre-titulo" texto={texto ? T.sobreACasa : T.fotosDaCasa} />
      {texto && <p className="ct-lead ct-ficha__apresentacao">{texto}</p>}
      {fotos.length > 0 && (
        <>
          {texto && <p className="ct-rotulo">{T.fotosDaCasa}</p>}
          <div className="ct-ficha__fotos-casa"><Galeria fotos={fotos} nome={p.casa.nome} proporcao="4 / 3" /></div>
        </>
      )}
    </section>
  )
}
