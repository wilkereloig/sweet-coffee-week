import React from 'react'
import { heroPhotos } from '../../../data/imageLibrary'
import { HeroFotos } from '../../../components/HeroFotos'
import Seta from '../../../components/Seta'
import { ABERTURA, SECOES } from '../../../data/conteudo/sweet-awards'
import { irPara } from './Indice'

/* Área de foto: a entrega dos prêmios, nas duas telas (§6.9). */
const FOTOS = heroPhotos('historico-awards')
const PREMIADOS = SECOES.resultados.id

/*
 * 01 — Abertura. Título, lead, a ação que leva aos premiados e os três
 * números, num conjunto só, sobre o herói fotográfico compartilhado (§6.9). A vitrine dos quatro primeiros lugares saiu em 06/08/2026
 * (§7.3, §11). A foto surge pelo scw-motion.css; o texto já abre legível.
 */
export function Abertura({ numeros }) {
  return (
    <section className="scw-heroi-foto swa-hero" aria-labelledby="swa-titulo" data-mo-fora>
      <HeroFotos fotos={FOTOS} />
      <div className="scw-heroi-foto__texto swa-hero__texto">
        <h1 className="scw-h1" id="swa-titulo">{ABERTURA.titulo}</h1>
        <p className="scw-lead">{ABERTURA.lead}</p>
        <a className="scw-btn scw-btn--solido swa-hero__acao" href={`#${PREMIADOS}`} onClick={irPara(PREMIADOS)}>
          {ABERTURA.acao} <Seta />
        </a>
        <dl className="swa-numeros">
          <div>
            <dt>Edições premiadas</dt>
            <dd>{numeros.edicoes}</dd>
          </div>
          <div>
            <dt>Prêmios entregues</dt>
            <dd>{numeros.premios}</dd>
          </div>
          <div>
            <dt>Marcas premiadas</dt>
            <dd>{numeros.marcas}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
