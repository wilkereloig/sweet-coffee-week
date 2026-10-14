import React from 'react'
import { fotosHome } from '../../../data/imageLibrary'
import { COMO_FUNCIONA as T } from '../../../data/conteudo/home'
import { ANATOMIA_COMBO } from '../../../components/scw-icons/anatomia-combo'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import { FotoAcervo } from '../../../components/FotoAcervo'
import { PausaFotos } from '../../../components/HeroFotos'
import { useCrossfade } from '../../../hooks/useCrossfade'
import { Rotulo } from '../../../components/Rotulo'
import { TituloDestaque } from '../TituloDestaque'

/* ============================================================================
   02 Como funciona — o que é o combo e como a edição acontece. Texto,
   anatomia e laços à esquerda; combos completos de casas diferentes à
   direita, em crossfade (relógio de useCrossfade, com pausa).
   ⛔ A anatomia fica SEMPRE em uma linha, inclusive no celular (§7.1).
   ========================================================================= */

/* Disco na cor do ciclo, traço na tinta que fecha contraste sobre ela. */
const INGREDIENTES = [
  { nome: 'doce', tinta: 'var(--scw-creme)', cor: 'var(--scw-magenta)' },
  { nome: 'salgado', tinta: 'var(--scw-choco)', cor: 'var(--scw-amarelo)' },
  { nome: 'bebida', tinta: 'var(--scw-choco)', cor: 'var(--scw-cyan)' },
]

export function ComoFunciona() {
  const combos = fotosHome('combos')
  const { ativa, pedidas, reduzido, pausado, alternarPausa, temRotacao } = useCrossfade(combos.length)
  /* Sem movimento, uma foto só (e um download só). */
  const camadas = reduzido ? combos.slice(0, 1) : combos
  return (
    <section id="festival" className="scw-secao scw-secao--creme hm-festival" aria-labelledby="hm-festival-titulo">
      <div className="hm-festival__texto">
        <Rotulo icone="ciclo">{T.rotulo}</Rotulo>
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
                    <ScwIcon nome="mais" tamanho={16} />
                  </span>
                )}
                <div className="hm-ing">
                  <span className="hm-ing__disco" style={{ background: item.cor, color: item.tinta }} aria-hidden="true">
                    {/* Desenho de 64 (traço da família expressiva nesse tamanho);
                        o CSS escala para 58% do disco. */}
                    {ANATOMIA_COMBO[item.nome].map((nome, j) => (
                      <ScwIcon
                        key={nome}
                        nome={nome}
                        tamanho={64}
                        className="hm-ing__icone"
                        style={{ animationDelay: `${j * 2200}ms` }}
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
        {camadas.map((foto, i) => (
          /* Camada montada sempre (sem salto); a foto só entra quando o
             relógio a pede: a visível, a próxima e as já vistas. */
          <span key={foto.src} className={'hm-festival__camada' + (i === ativa ? ' is-ativa' : '')} aria-hidden={i === ativa ? undefined : true}>
            {pedidas[i] && <FotoAcervo foto={foto} papel="cartao" alt={i === ativa ? foto.alt : ''} />}
          </span>
        ))}
        <figcaption>{combos[ativa].legenda}</figcaption>
        {temRotacao && <PausaFotos pausado={pausado} alternar={alternarPausa} />}
      </figure>
    </section>
  )
}

export default ComoFunciona
