import React from 'react'
import { FotoAcervo } from '../../../components/FotoAcervo'
import { festivalFacts } from '../../../data/festivalFacts'
import { TEXTOS } from '../../../data/conteudo/edicoes'
import { fotosAbertura } from '../acervo'

/*
 * ABERTURA — compacta, na chapa da página (laranja): rótulo, título, uma frase
 * e quatro registros de edições diferentes. Não ocupa a tela inteira e não
 * repete os argumentos da Home: a página começa a mostrar a coleção já na
 * primeira dobra do desktop.
 *
 * A linha de números vem de festivalFacts (16 edições · 123 marcas · 410
 * participações), a mesma fonte do resto do site — nada digitado aqui.
 */
const FOTOS = fotosAbertura()
const F = festivalFacts

export function Abertura() {
  return (
    <section className="edx-abre" aria-labelledby="edx-titulo">
      <div className="edx-abre__texto">
        <span className="scw-rotulo edx-abre__rotulo">{TEXTOS.rotulo}</span>
        <h1 id="edx-titulo" className="scw-h1 edx-abre__titulo">{TEXTOS.titulo}</h1>
        <p className="scw-lead edx-abre__lead">{TEXTOS.lead}</p>
        <p className="edx-abre__dados">
          {F.editions.value} edições desde {F.firstYear} · {F.brands.value} marcas · {F.participations.value} participações
        </p>
      </div>
      <ul className="edx-abre__fotos" aria-label="Registros de edições diferentes">
        {FOTOS.map((f, i) => (
          <li key={f.src} className="edx-abre__foto">
            <FotoAcervo foto={f} papel="miniatura" prioridade={i < 2} />
          </li>
        ))}
      </ul>
    </section>
  )
}
