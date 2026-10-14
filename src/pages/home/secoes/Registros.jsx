import React from 'react'
import { fotosHome } from '../../../data/imageLibrary'
import { resolveParticipant } from '../../../data/participantAssets'
import { REGISTROS as T } from '../../../data/conteudo/home'
import { FotoAcervo } from '../../../components/FotoAcervo'
import { Rotulo } from '../../../components/Rotulo'
import { Seta } from '../../../components/Seta'
import { TituloDestaque } from '../TituloDestaque'

/* ============================================================================
   03 Em registros — comida, pessoas e casas, em fotos reais de edições
   passadas (cada legenda diz de onde é o registro), e a voz de uma casa
   participante, sempre identificada: pessoa + marca.
   Mosaico sem laço e sem autoplay: a entrada é a do motor, item a item.
   ========================================================================= */

const JOLIE = resolveParticipant(T.voz.marca)

export function Registros({ ir }) {
  const V = T.voz
  return (
    <section className="scw-secao scw-secao--choco hm-registros" aria-labelledby="hm-registros-titulo">
      <div className="hm-cab">
        <div>
          <Rotulo icone="coracao" className="hm-rotulo--amarelo">{T.rotulo}</Rotulo>
          <h2 id="hm-registros-titulo" className="scw-h2 hm-h2--claro">
            <TituloDestaque t={T.titulo} base="var(--scw-creme)" dest="var(--scw-amarelo)" />
          </h2>
        </div>
        <p className="hm-apoio hm-apoio--clara">{T.apoio}</p>
      </div>

      <div className="hm-mosaico" data-mo-sequencia>
        {fotosHome('mosaico').map((foto) => (
          <figure className="hm-mosaico__item" key={foto.src}>
            <FotoAcervo foto={foto} papel="cartao" />
            <figcaption>{foto.legenda}</figcaption>
          </figure>
        ))}
      </div>

      <div className="hm-voz" data-mo-sequencia>
        <figure className="hm-voz__foto">
          <FotoAcervo foto={fotosHome('jolie')} papel="cartao" />
        </figure>
        <figure className="hm-voz__texto">
          <span className="scw-rotulo hm-rotulo--amarelo">{V.rotulo}</span>
          <blockquote className="hm-voz__frase">{V.frase}</blockquote>
          <figcaption className="hm-voz__assinatura">
            <span className="hm-voz__marca">
              {JOLIE.logo
                ? <img src={JOLIE.logo} alt="" loading="lazy" decoding="async" />
                : <span aria-hidden="true">{JOLIE.fallback}</span>}
            </span>
            <span className="hm-voz__id">
              <b>{V.pessoa}</b>
              <span>{V.marca}</span>
            </span>
          </figcaption>
          <a className="hm-link hm-link--claro" href="/participar?scrollTo=depoimentos" onClick={ir('/participar?scrollTo=depoimentos')}>
            {V.link} <Seta size={16} />
          </a>
        </figure>
      </div>
    </section>
  )
}

export default Registros
