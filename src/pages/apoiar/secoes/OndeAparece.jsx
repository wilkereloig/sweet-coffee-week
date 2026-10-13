import React from 'react'
import { FotoAcervo } from '../../../components/FotoAcervo'
import { editionPhotos, fotoGanho, heroPhotos, RESERVA } from '../../../data/imageLibrary'
import { FORMATOS, ONDE } from '../../../data/conteudo/apoiar'
import { Cabeca, Destaque } from '../../participar/comum'

/* Foto e legenda de cada canal — sempre de imageLibrary.js (§6.12), sempre
   registro real, e a legenda diz o que a imagem é. Escolhidas sem logo de
   patrocinador à vista (§9.6).
   ponytail: as quatro pegam emprestado de séries de outras telas (campanha da
   Celebration, o herói de Apoiar, o ganho de imprensa de Participar, o herói
   do Sweet Awards). O certo é uma série própria em imageLibrary.js — pedido
   registrado; quando existir, troca-se só este mapa. */
const FOTO = {
  digital: () => ({ foto: editionPhotos('2025')[5], legenda: 'Registro da edição Celebration · 2025' }),
  casas: () => ({ foto: heroPhotos('apoiar').at(-1), legenda: 'Equipe de uma casa participante' }),
  imprensa: () => ({ foto: fotoGanho('imprensa'), legenda: 'Wow Cookies na TV, na cobertura do festival' }),
  awards: () => ({ foto: heroPhotos('historico-awards')[0], legenda: 'O Maestro Café com os prêmios do Sweet Awards' }),
}

/* 04 Onde a marca aparece — quatro canais (foto + legenda + o que cabe em
   cada um, numa linha) e, embaixo, os formatos de ativação que já aconteceram
   (§9.6): exemplo real, marca não nomeada. */
export function OndeAparece() {
  return (
    <section id="formatos" className="scw-secao scw-secao--creme" aria-labelledby="pa-onde-titulo">
      <Cabeca
        icone="simbolos/descobrir"
        rotulo={ONDE.rotulo}
        idTitulo="pa-onde-titulo"
        titulo={<>{ONDE.titulo} <Destaque dest="var(--scw-roxo)">{ONDE.destaque}</Destaque></>}
        apoio={ONDE.apoio}
      />
      <ul className="pa-onde">
        {ONDE.canais.map((g) => {
          const { foto, legenda } = FOTO[g.chave]()
          return (
            <li key={g.chave} style={{ '--c': g.c, '--tinta': g.tinta }}>
              <figure>
                {foto ? <FotoAcervo foto={foto} papel="miniatura" /> : <div className="scw-reserva">{RESERVA}</div>}
                <figcaption>{legenda}</figcaption>
              </figure>
              <div className="pa-onde__texto">
                <h3 className="pa-onde__tag">{g.t}</h3>
                <p>{g.itens}</p>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="pa-formatos">
        <div className="pa-formatos__cabeca">
          <h3 className="pa-escala__titulo">{FORMATOS.titulo}</h3>
          <p className="pa-escala__nota">{FORMATOS.nota}</p>
        </div>
        <ol className="pa-formatos__lista">
          {FORMATOS.itens.map((f) => (
            <li key={f.t}>
              <strong>{f.t}</strong>
              <p>{f.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
