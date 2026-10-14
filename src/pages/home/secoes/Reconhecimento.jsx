import React from 'react'
import { AWARDS_DADOS } from '../../../data/handoff/awardsData'
import { estatisticas } from '../../sweet-awards/consulta'
import { fotosHome } from '../../../data/imageLibrary'
import { RECONHECIMENTO as T } from '../../../data/conteudo/home'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import { FotoAcervo } from '../../../components/FotoAcervo'
import { Rotulo } from '../../../components/Rotulo'
import { Seta } from '../../../components/Seta'
import { TituloDestaque } from '../TituloDestaque'

/* ============================================================================
   05 Reconhecimento — o Sweet Awards, na chapa roxa (a cor do DESTINO, §6.2).
   Foto de uma entrega real e a regra de quem dá a nota; o total de prêmios
   entregues sai de AWARDS_DADOS pela mesma conta do herói do Sweet Awards
   (`estatisticas`), nunca digitado — as duas páginas mostram o mesmo número.
   ========================================================================= */

const PREMIOS_ENTREGUES = estatisticas(AWARDS_DADOS.edicoes).premios

export function Reconhecimento({ ir }) {
  const foto = fotosHome('premio')
  return (
    <section className="scw-secao hm-awards" aria-labelledby="hm-awards-titulo" data-mo-sequencia>
      <figure className="hm-awards__foto">
        <FotoAcervo foto={foto} papel="cartao" />
        <figcaption>{foto.legenda}</figcaption>
      </figure>
      <div className="hm-awards__texto">
        <Rotulo icone="avaliacao" className="hm-rotulo--amarelo">{T.rotulo}</Rotulo>
        <h2 id="hm-awards-titulo" className="scw-h2 hm-h2--claro">
          <TituloDestaque t={T.titulo} base="var(--scw-creme)" dest="var(--scw-amarelo)" />
        </h2>
        <p className="hm-apoio hm-apoio--clara">{T.texto}</p>
        <p className="hm-awards__numero">
          <span className="scw-disco" aria-hidden="true"><ScwIcon nome="estrela" tamanho={24} /></span>
          <strong className="scw-numeral">{PREMIOS_ENTREGUES}</strong>
          <span>{T.numero}</span>
        </p>
        <a className="scw-btn hm-btn--creme" href="/sweet-awards" onClick={ir('/sweet-awards')}>
          {T.cta} <Seta />
        </a>
      </div>
    </section>
  )
}

export default Reconhecimento
