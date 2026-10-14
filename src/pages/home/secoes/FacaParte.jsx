import React from 'react'
import { proximaEdicao as PROX } from '../../../data/proximaEdicao'
import { FACA_PARTE as T } from '../../../data/conteudo/home'
import { Rotulo } from '../../../components/Rotulo'
import { Seta } from '../../../components/Seta'
import { TituloDestaque } from '../TituloDestaque'

/* ============================================================================
   06 Faça parte — duas portas curtas, cada uma na cor do DESTINO (§6.2):
   casas → Participar (cyan), empresas → Apoiar (marrom). O pré-cadastro é
   informação pública de proximaEdicao.js, não manchete; o aprofundamento
   mora nas páginas próprias. Embaixo, o caminho para o Contato.
   ========================================================================= */

const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const P = T.participar
/* "Próxima edição: Novembro · pré-cadastro aberto" — cada pedaço só aparece
   se a fonte tiver o dado (campo null não aparece, A4). */
const ESTADO = [PROX.periodo || (PROX.mes && maiuscula(PROX.mes)), P.estado[PROX.status]].filter(Boolean).join(' · ')
const PRE_CADASTRO_ABERTO = PROX.status === 'pre-cadastro' && !!PROX.preCadastro

export function FacaParte({ ir }) {
  const A = T.apoiar
  return (
    <section className="scw-secao scw-secao--creme hm-parte" aria-labelledby="hm-parte-titulo">
      <div className="hm-parte__cab">
        <Rotulo icone="loja">{T.rotulo}</Rotulo>
        <h2 id="hm-parte-titulo" className="scw-h2">
          <TituloDestaque t={T.titulo} />
        </h2>
      </div>

      <div className="hm-portas" data-mo-sequencia>
        <article className="hm-porta hm-porta--participar" aria-labelledby="hm-porta-participar">
          <span className="hm-porta__eixo">{P.eixo}</span>
          <h3 id="hm-porta-participar" className="hm-porta__titulo">{P.titulo}</h3>
          <p className="hm-porta__texto">{P.texto}</p>
          {ESTADO && (
            <p className="hm-porta__estado">
              <span>{P.proxima}</span> {ESTADO}
            </p>
          )}
          {PRE_CADASTRO_ABERTO && <p className="hm-porta__nota">{P.nota}</p>}
          <div className="hm-porta__acoes">
            {PRE_CADASTRO_ABERTO && (
              /* Página estática: <a href> com a barra final, nunca navigate() (§10.4-b). */
              <a className="scw-btn hm-btn--choco" href={PROX.preCadastro}>
                {P.acao} <Seta />
              </a>
            )}
            <a className="hm-link hm-link--escuro" href="/participar" onClick={ir('/participar')}>
              {P.link} <Seta size={16} />
            </a>
          </div>
        </article>

        <article className="hm-porta hm-porta--apoiar" aria-labelledby="hm-porta-apoiar">
          <span className="hm-porta__eixo">{A.eixo}</span>
          <h3 id="hm-porta-apoiar" className="hm-porta__titulo">{A.titulo}</h3>
          <p className="hm-porta__texto">{A.texto}</p>
          <div className="hm-porta__acoes">
            <a className="scw-btn hm-btn--bege" href="/apoiar" onClick={ir('/apoiar')}>
              {A.acao} <Seta />
            </a>
          </div>
        </article>
      </div>

      <p className="hm-parte__contato">
        <span>{T.contato.texto}</span>
        <a className="hm-link hm-link--escuro" href="/contato" onClick={ir('/contato')}>
          {T.contato.link} <Seta size={16} />
        </a>
      </p>
    </section>
  )
}

export default FacaParte
