import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import { FotoAcervo } from '../../../components/FotoAcervo'
import { fotoGanho, RESERVA } from '../../../data/imageLibrary'
import { GANHOS, NUMEROS } from '../../../data/conteudo/participar'
import { Cabeca, Destaque } from '../comum'

/* 04 O que a participação oferece — o mosaico fotográfico dos ganhos (§6.16,
   superfície fotográfica, sem link e sem hover) e, embaixo, a escala do
   festival. Eram duas seções com duas cabeças; viraram uma: os números são a
   prova do que o mosaico afirma. */
export function Oferece() {
  return (
    <section id="ganhos" className="scw-secao scw-secao--creme" aria-labelledby="pa-ganhos-titulo">
      <Cabeca
        icone="estrela"
        rotulo="O que a participação oferece"
        idTitulo="pa-ganhos-titulo"
        titulo={<>O que a edição <Destaque>coloca na mesa</Destaque> da sua marca.</>}
      />
      <ul className="pa-ganhos">
        {GANHOS.map((g) => {
          const foto = fotoGanho(g.chave)
          return (
            <li className="pa-ganho" key={g.chave} style={{ '--c': g.cor, '--tinta': g.tinta }}>
              {foto
                ? <FotoAcervo foto={foto} papel="cheia" />
                : <div className="scw-reserva">{RESERVA}</div>}
              <span className="scw-pill pa-ganho__selo">{g.selo}</span>
              <div className="pa-ganho__texto">
                <h3 className="scw-h3">{g.titulo}</h3>
                <p>{g.texto}</p>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="pa-escala">
        <div className="pa-escala__cabeca">
          <h3 className="pa-escala__titulo">{NUMEROS.titulo}</h3>
          <p className="pa-escala__nota">{NUMEROS.nota}</p>
        </div>
        <ul className="pa-numeros pa-numeros--quatro">
          {NUMEROS.itens.map((n) => (
            <li key={n.t} style={{ '--card': n.cor, '--card-tinta': n.tinta }}>
              <span className="scw-disco pa-num__disco" aria-hidden="true">
                <ScwIcon nome={n.i} tamanho={32} />
              </span>
              <b>{n.n}</b>
              <strong>{n.t}</strong>
              <span>{n.d}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
