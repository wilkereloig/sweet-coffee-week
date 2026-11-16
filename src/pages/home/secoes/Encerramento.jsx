import React from 'react'
import { ENCERRAMENTO as T } from '../../../data/conteudo/home'
import { LOGO_F2, MARCAS_PARCEIROS as M } from '../../../data/imageLibrary'
import { Rotulo } from '../../../components/Rotulo'
import { Seta } from '../../../components/Seta'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import { TituloDestaque } from '../TituloDestaque'

/* ============================================================================
   Encerramento da edição (16/11/2026) — logo abaixo da abertura, enquanto
   ENCERRAMENTO.ativo. O que está em apuração, o agradecimento, a expectativa
   da próxima edição (sugestão, participar, apoiar) e as marcas.
   As marcas ficam sobre branco: é o fundo da versão preferencial da Sicredi
   (manual de identidade, mesma regra da faixa de marcas da edição).
   ========================================================================= */

const Logo = ({ marca, className }) => (
  <img className={className} src={marca.src} alt={marca.alt} width={marca.largura} height={marca.altura} loading="lazy" decoding="async" />
)

export function Encerramento({ ir }) {
  if (T.ativo !== true) return null
  const A = T.apuracao
  return (
    <section id={T.id} className="scw-secao scw-secao--creme hm-fim" aria-labelledby="hm-fim-titulo">
      <div className="hm-fim__cab">
        <Rotulo icone="estrela">{T.rotulo}</Rotulo>
        <h2 id="hm-fim-titulo" className="scw-h2" tabIndex={-1}>
          <TituloDestaque t={T.titulo} />
        </h2>
      </div>

      <div className="hm-fim__grade" data-mo-sequencia>
        <article className="hm-fim__apura" aria-labelledby="hm-fim-apura">
          <h3 id="hm-fim-apura" className="hm-fim__h3">{A.titulo}</h3>
          <p className="hm-fim__texto">{A.texto}</p>
          <a
            className="scw-btn hm-btn--bege"
            href={A.instagram.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${A.instagram.rotulo} no Instagram (abre em nova aba)`}
          >
            <ScwIcon nome="instagram" tamanho={24} /> {A.instagram.rotulo}
          </a>
        </article>

        <div className="hm-fim__gratos">
          {T.agradecimentos.map((g) => (
            <article key={g.titulo} className="hm-fim__grato">
              <h3 className="hm-fim__h3">{g.titulo}</h3>
              <p className="hm-fim__texto">{g.texto}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="hm-fim__proxima">
        <h3 className="hm-fim__h3 hm-fim__h3--grande">{T.proxima.titulo}</h3>
        <p className="hm-fim__texto">{T.proxima.texto}</p>
        <div className="hm-acoes">
          {T.proxima.acoes.map((a) => (
            <a key={a.href} className={`scw-btn ${a.classe}`} href={a.href} onClick={a.interno ? ir(a.href) : undefined}>
              {a.rotulo} <Seta />
            </a>
          ))}
        </div>
      </div>

      <div className="hm-fim__marcas">
        <p className="hm-fim__texto">{T.marcas.texto}</p>
        <div className="hm-fim__logos">
          <div className="hm-fim__grupo">
            <p className="hm-fim__papel">{T.marcas.patrocinio}</p>
            <Logo marca={M.sicredi} className="hm-fim__logo hm-fim__logo--sicredi" />
          </div>
          <div className="hm-fim__grupo">
            <p className="hm-fim__papel">{T.marcas.apoio}</p>
            <div className="hm-fim__par">
              <Logo marca={M.senac} className="hm-fim__logo" />
              <Logo marca={M.espacoReduzido} className="hm-fim__logo" />
            </div>
          </div>
          <div className="hm-fim__grupo">
            <p className="hm-fim__papel">{T.marcas.realizacao}</p>
            <Logo marca={LOGO_F2} className="hm-fim__logo" />
          </div>
        </div>
      </div>
    </section>
  )
}

export default Encerramento
