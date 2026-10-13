import React from 'react'
import { heroPhotos } from '../../../data/imageLibrary'
import { HeroFotos } from '../../../components/HeroFotos'
import { ABERTURA } from '../../../data/conteudo/sweet-awards'

/* Banda de foto: a entrega dos prêmios, nas duas telas (§6.9). */
const FOTOS = heroPhotos('historico-awards')

/*
 * 01 — Abertura. Título, lead e três números, e nada mais: a vitrine dos
 * quatro primeiros lugares saiu em 06/08/2026 (§7.3, §11) — as mesmas fotos
 * abrem os resultados logo abaixo. A coreografia de entrada é do scw-motion.css,
 * pelas classes `.swa-hero`, `.swa-hero__texto` e `.swa-numeros` (não renomear).
 */
export function Abertura({ numeros }) {
  return (
    <section className="swa-hero scw-hero-veu" aria-labelledby="swa-titulo" data-mo-fora>
      <HeroFotos fotos={FOTOS} />
      <div className="swa-hero__texto">
        <h1 className="scw-h1" id="swa-titulo">{ABERTURA.titulo}</h1>
        <p className="scw-lead">{ABERTURA.lead}</p>
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
