import React from 'react'
import { fotosHome } from '../../../data/imageLibrary'
import { COMO_FUNCIONA as T } from '../../../data/conteudo/home'
import { ANATOMIA_COMBO } from '../../../components/scw-icons/anatomia-combo'
import { FotoAcervo } from '../../../components/FotoAcervo'
import { Rotulo } from '../../../components/Rotulo'
import { TituloDestaque } from '../TituloDestaque'

/* ============================================================================
   02 Como funciona — o que é o combo e como a edição acontece. Texto,
   anatomia e laços à esquerda; um combo completo à direita.
   ⛔ A anatomia fica SEMPRE em uma linha, inclusive no celular (§7.1).
   ========================================================================= */

/* Disco na cor do ciclo, traço na tinta que fecha contraste sobre ela. */
const INGREDIENTES = [
  { nome: 'doce', tinta: 'var(--scw-creme)', cor: 'var(--scw-magenta)' },
  { nome: 'salgado', tinta: 'var(--scw-choco)', cor: 'var(--scw-amarelo)' },
  { nome: 'bebida', tinta: 'var(--scw-choco)', cor: 'var(--scw-cyan)' },
]

export function ComoFunciona() {
  const combo = fotosHome('combo')
  return (
    <section id="festival" className="scw-secao scw-secao--creme hm-festival" aria-labelledby="hm-festival-titulo">
      <div className="hm-festival__texto">
        <Rotulo icone="topicos/ciclo">{T.rotulo}</Rotulo>
        <h2 id="hm-festival-titulo" className="scw-h2" tabIndex={-1}>
          <TituloDestaque t={T.titulo} />
        </h2>
        <p className="hm-apoio">{T.apoio}</p>

        <div className="hm-anatomia">
          <span className="scw-rotulo">{T.anatomia}</span>
          <div className="hm-ingredientes" data-mo-sequencia>
            {INGREDIENTES.map((item, i) => (
              <React.Fragment key={item.nome}>
                {i > 0 && (
                  <span className="hm-mais" aria-hidden="true">
                    <svg width="52%" height="52%" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
                      <path d="M16 5.8v20.4M5.8 16h20.4" />
                    </svg>
                  </span>
                )}
                <div className="hm-ing">
                  <span className="hm-ing__disco" style={{ background: item.cor, color: item.tinta }} aria-hidden="true">
                    {ANATOMIA_COMBO[item.nome].map((desenho, j) => (
                      <svg
                        key={j}
                        className="hm-ing__icone"
                        viewBox="0 0 32 32"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ animationDelay: `${j * 2200}ms` }}
                        dangerouslySetInnerHTML={{ __html: desenho }}
                      />
                    ))}
                  </span>
                  <strong className="hm-ing__nome">{item.nome}</strong>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <dl className="hm-lacos">
          {T.lacos.map(([quem, texto]) => (
            <div key={quem}>
              <dt>{quem}</dt>
              <dd>{texto}</dd>
            </div>
          ))}
        </dl>
      </div>

      <figure className="hm-festival__foto">
        <FotoAcervo foto={combo} papel="cartao" />
        <figcaption>{combo.legenda}</figcaption>
      </figure>
    </section>
  )
}

export default ComoFunciona
