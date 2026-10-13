import React from 'react'
import { FotoAcervo } from '../../../components/FotoAcervo'
import { Seta } from '../../../components/Seta'
import { TEXTOS } from '../../../data/conteudo/edicoes'
import { anos, identificacao, quando, rotuloMarcas } from '../acervo'
import { NavAnos } from './NavAnos'

/*
 * COLEÇÃO — as 16 edições agrupadas por ano, do mais recente à estreia.
 *
 * Cada ano é um grupo com o numeral em cima e as edições embaixo; anos com
 * duas edições mostram as duas lado a lado, cada uma dizendo se é a 1ª ou a 2ª
 * do ano e o mês em que começou. A grade usa subgrid: os grupos ocupam 1, 2 ou
 * 4 colunas, mas o numeral e as fotos de todos os grupos de uma linha caem na
 * mesma altura (o desenho das larguras está em acervo.anos()).
 *
 * O cartão inteiro é o link — uma ação só, sem botão dentro. Só as capas
 * carregam aqui; a galeria de cada edição chega quando ela é aberta.
 */
const GRUPOS = anos()

function Cartao({ e, largo, prioridade }) {
  const logo = e.marca && e.marca.logo
  return (
    <a className={`edx-cartao${largo ? ' edx-cartao--largo' : ''}`} href={e.href} data-edicao={e.code}
      aria-label={`${e.tema}, ${identificacao(e)}${e.n != null ? `, ${rotuloMarcas(e.n)}` : ''}. ${TEXTOS.explorar} a edição`}>
      <span className="edx-cartao__foto">
        {e.capa
          ? <FotoAcervo foto={e.capa} papel={largo ? 'cartao' : 'miniatura'} prioridade={prioridade} alt="" />
          : <span className="edx-reserva">{TEXTOS.fotoPendente}</span>}
      </span>
      <span className="edx-cartao__texto">
        {logo && <img className="edx-cartao__marca" src={logo} alt="" loading="lazy" decoding="async" />}
        <span className="edx-cartao__quando">{quando(e)}</span>
        <h3 className="edx-cartao__tema">{e.tema}</h3>
        <span className="edx-cartao__pe">
          {e.n != null && <span>{rotuloMarcas(e.n)}</span>}
          <span className="edx-cartao__ir" aria-hidden="true">{TEXTOS.explorar}<Seta size={15} /></span>
        </span>
      </span>
    </a>
  )
}

export function Colecao() {
  return (
    <section className="edx-colecao" aria-labelledby="edx-colecao-titulo">
      <h2 id="edx-colecao-titulo" className="edx-sr">{TEXTOS.tituloColecao}</h2>
      <NavAnos grupos={GRUPOS} />
      <div className="edx-grade">
        {GRUPOS.map((g, gi) => (
          <section
            key={g.ano}
            id={`edx-ano-${g.ano}`}
            className={`edx-ano${g.largura ? ` edx-ano--${g.largura}` : ''}${g.edicoes.length > 1 ? ' edx-ano--par' : ''}`}
            aria-labelledby={`edx-ano-${g.ano}-t`}
            data-ano={g.ano}
          >
            <header className="edx-ano__cabeca">
              <h2 id={`edx-ano-${g.ano}-t`} className="edx-ano__num" tabIndex={-1}>{g.ano}</h2>
              {g.edicoes.length > 1 && <span className="edx-ano__nota">{TEXTOS.duasNoAno}</span>}
            </header>
            {g.edicoes.map((e) => (
              <Cartao key={e.code} e={e} largo={!!g.largura} prioridade={gi === 0} />
            ))}
          </section>
        ))}
      </div>
    </section>
  )
}
