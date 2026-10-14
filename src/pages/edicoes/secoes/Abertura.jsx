import React from 'react'
import { HeroFotos } from '../../../components/HeroFotos'
import { festivalFacts } from '../../../data/festivalFacts'
import { TEXTOS } from '../../../data/conteudo/edicoes'
import { fotosAbertura } from '../acervo'

/*
 * ABERTURA — o mesmo herói fotográfico das páginas institucionais (§6.9,
 * 14/10/2026, pedido do Wilker): texto à esquerda na chapa da página
 * (laranja), e na área de foto os quatro registros de edições diferentes, em
 * crossfade. Rótulo, título, uma frase e a linha de números.
 *
 * A linha de números vem de festivalFacts (16 edições · 123 marcas · 410
 * participações), a mesma fonte do resto do site — nada digitado aqui.
 */
const FOTOS = fotosAbertura()
const F = festivalFacts

export function Abertura() {
  return (
    <section className="scw-heroi-foto edx-abre" aria-labelledby="edx-titulo" data-mo-fora>
      <HeroFotos fotos={FOTOS} />
      <div className="scw-heroi-foto__texto edx-abre__texto">
        <span className="scw-rotulo edx-abre__rotulo">{TEXTOS.rotulo}</span>
        <h1 id="edx-titulo" className="scw-h1 edx-abre__titulo">{TEXTOS.titulo}</h1>
        <p className="scw-lead edx-abre__lead">{TEXTOS.lead}</p>
        <p className="edx-abre__dados">
          {F.editions.value} edições desde {F.firstYear} · {F.brands.value} marcas · {F.participations.value} participações
        </p>
      </div>
    </section>
  )
}
