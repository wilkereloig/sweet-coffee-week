import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import { TEXTOS } from '../../../data/conteudo/edicoes'

/*
 * VÍDEO DE LANÇAMENTO — só nas edições em que o acervo guarda o vídeo (hoje, a
 * Cartoon: saiu da abertura da Home quando a edição encerrou, 16/11/2026).
 * Identificado como lançamento, para ninguém ler como campanha em curso.
 * Não toca sozinho: `preload="none"` e capa; o arquivo só baixa no play, com
 * controles nativos.
 */
export function Lancamento({ video, tema }) {
  const L = TEXTOS.lancamento
  return (
    <section className="scw-secao edx-lanc" aria-labelledby="edx-lanc-titulo">
      <div className="edx-lanc__texto">
        <h2 id="edx-lanc-titulo" className="scw-h2">{L.titulo}</h2>
        <p className="scw-corpo">{L.texto}</p>
        <a
          className="scw-btn edx-lanc__ir"
          href={video.instagram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${L.instagram} (abre em nova aba)`}
        >
          <ScwIcon nome="instagram" tamanho={24} /> {L.instagram}
        </a>
      </div>
      <figure className="edx-lanc__tela">
        <video src={video.src} poster={video.capa} preload="none" controls playsInline aria-label={L.video(tema)} />
      </figure>
    </section>
  )
}

export default Lancamento
