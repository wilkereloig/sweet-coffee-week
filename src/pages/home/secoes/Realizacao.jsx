import React from 'react'
import { F2_NUMEROS } from '../../../data/conteudo/home'
import { Seta } from '../../../components/Seta'

/* ============================================================================
   07 Realização — bloco oficial da F2 Experience, preservado como estava.
   Quebra de marca proposital: KV da F2 (preto, acento magenta e a fonte
   da agência). Única seção fora da paleta e da Nexa — decisão do Wilker,
   registrada no CLAUDE.md §6.1, com teste que reprova o vazamento.
   ========================================================================= */

export function Realizacao() {
  return (
    <section className="scw-secao scw-secao--compacta f2-realiza">
      <div className="f2-realiza__kv" aria-hidden="true" />

      <div className="f2-realiza__conteudo">
        <div className="f2-realiza__topo">
          <span className="f2-realiza__indice">Realização <i /></span>
          <img className="f2-realiza__logo" src="/images/logo-f2experience.svg" alt="F2 Experience" loading="lazy" />
          <span className="f2-realiza__meta">Live Marketing · desde 2004</span>
        </div>

        <div className="f2-realiza__grade">
          <h2 className="f2-realiza__h2">
            Há mais de 20 anos <em>transformando</em> estratégia em criatividade.
          </h2>
          <div>
            <p className="f2-realiza__texto">
              A F2 Experience é a agência de live marketing que idealiza e realiza o
              Sweet &amp; Coffee Week: eventos, ativações e experiências de marca para
              quem quer conexão e resultado.
            </p>
            <a className="f2-realiza__cta" href="https://www.f2experience.com.br/" target="_blank" rel="noopener noreferrer">
              Conhecer a F2 Experience <Seta />
            </a>
          </div>
        </div>

        <dl className="f2-realiza__numeros">
          {F2_NUMEROS.map(([i, num, sufixo, rotulo]) => (
            <div key={i}>
              <span className="f2-realiza__ordem">{i}</span>
              <dt>{num}{sufixo && <em>{sufixo}</em>}</dt>
              <dd>{rotulo}</dd>
            </div>
          ))}
        </dl>

        <div className="f2-realiza__assinatura">
          <span>F2 <em>realiza.</em></span>
          <span className="f2-realiza__meta">contato@fabrica2.com.br · @f2experience</span>
        </div>
      </div>
    </section>
  )
}

export default Realizacao
