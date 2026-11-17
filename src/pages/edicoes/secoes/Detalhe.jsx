import React from 'react'
import { SetaVolta } from '../icones'
import { TEXTOS } from '../../../data/conteudo/edicoes'
import { detalhe, rotuloMarcas } from '../acervo'
import { GaleriaEdicao } from './GaleriaEdicao'
import { Historia } from './Historia'
import { Participantes } from './Participantes'
import { Premiacao, PremiacaoEmApuracao } from './Premiacao'
import { Lancamento } from './Lancamento'
import { Continuidade } from './Continuidade'

/*
 * DETALHE DE UMA EDIÇÃO — /edicoes/<código>, rolagem natural.
 *
 * Ordem de leitura: voltar · identificação e tema · ficha · marca da edição →
 * fotos → história → vídeo de lançamento (quando o acervo tem) → marcas →
 * Sweet Awards (quando houve, ou "em apuração") → anterior,
 * próxima e todas. No celular a ordem é a mesma: título e ficha chegam antes
 * da galeria.
 *
 * Ao abrir, o foco vai para o título (o App só move o foco quando a ROTA muda,
 * e aqui a rota continua sendo 'edicoes').
 */
export function Detalhe({ code }) {
  const d = React.useMemo(() => detalhe(code), [code])
  const titulo = React.useRef(null)

  // O título da aba sai de pageMeta.js, que conhece a rota da edição.
  React.useEffect(() => {
    if (titulo.current) titulo.current.focus({ preventScroll: true })
  }, [d])

  const logo = d.marca && d.marca.logo

  return (
    <article className="edx edx-det" aria-labelledby="edx-det-titulo">
      <header className="edx-det__topo">
        <a className="edx-voltar" href="#/edicoes">
          <SetaVolta size={16} />{TEXTOS.voltar}
        </a>
        <div className="edx-det__grade">
          <div className="edx-det__texto">
            <p className="edx-det__quando">{d.identificacao}<span aria-hidden="true"> · </span><span className="edx-det__etapa">{d.etapa}</span></p>
            <h1 id="edx-det-titulo" className="scw-h1 edx-det__titulo" tabIndex={-1} ref={titulo}>{d.tema}</h1>
            {d.narrativa.lead && <p className="scw-lead edx-det__lead">{d.narrativa.lead}</p>}
            <dl className="edx-ficha">
              <div><dt>Período</dt><dd>{d.periodo || 'Não registrado no acervo'}</dd></div>
              <div><dt>Marcas</dt><dd>{d.n != null ? `${rotuloMarcas(d.n)} participantes` : TEXTOS.marcasPendentes}</dd></div>
              <div><dt>Sweet Awards</dt><dd>{d.premiacao.resumo}</dd></div>
            </dl>
          </div>
          {logo && (
            <figure className="edx-det__marca">
              <img src={logo} alt={`Marca da edição ${d.tema}`} decoding="async" />
            </figure>
          )}
        </div>
      </header>

      <GaleriaEdicao fotos={d.fotos} porMarca={d.porMarca} marcas={d.n} tema={d.tema} ano={d.ano} ilustrativa={d.ilustrativa} />
      <Historia narrativa={d.narrativa} curiosidades={d.curiosidades} />
      {d.lancamento && <Lancamento video={d.lancamento} tema={d.tema} />}
      <Participantes participantes={d.participantes} n={d.n} code={d.code} />
      {d.premiacao.teve && <Premiacao premiacao={d.premiacao} />}
      {d.premiacao.emApuracao && <PremiacaoEmApuracao />}
      <Continuidade anterior={d.anterior} proxima={d.proxima} />
    </article>
  )
}
