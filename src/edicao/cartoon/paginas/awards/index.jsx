/*
 * Sweet Awards (lista 13, N1 + A1): avaliar e premiação numa página só. /cartoon/avaliar e /cartoon/premiacao
 * abrem aqui (o QR impresso aponta para /avaliar), cada uma rolando para a sua seção.
 *   Topo (canal Gala): a marca do Sweet Awards, o troféu sob o holofote e a ação da fase.
 *   Como funciona: três passos + o que se avalia (os critérios do banco, com a pergunta de cada um).
 *   Avaliação: o formulário em passos (avaliação aberta), ou "abre em …" (antes), ou encerrada.
 *   Premiados: quando os resultados saem; antes, "resultados depois de <fim do festival>" (D-15).
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import { EDICAO } from '../../../config.js'
import { carregarCriterios } from '../../../dados/publico.js'
import * as M from '../../../dados/modelo.js'
import { trofeuEdicao, MARCA_SWEET_AWARDS, srcSet } from '../../../../data/imageLibrary'
import { Avisos, Carregando, Falha } from '../../../componentes/base.jsx'
import { TopoCanal } from '../../../componentes/sistema/TopoCanal.jsx'
import { Olhinhos } from '../../../componentes/sistema/Olhinhos.jsx'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { Botao, Passos, Gibi } from '../../../componentes/sistema/pecas.jsx'
import { AWARDS as T, FASE_TEXTO, ICONE } from '../../textos.js'
import { Formulario } from './Formulario.jsx'
import { Resultados } from './Resultados.jsx'

function useCriterios (ligado) {
  const [c, setC] = React.useState(null)
  const carregar = React.useCallback(() => { setC(null); carregarCriterios(EDICAO.codigo).then((r) => setC(r || [])).catch(() => setC('falha')) }, [])
  React.useEffect(() => { if (ligado) carregar() }, [ligado, carregar])
  return [c, carregar]
}

export function SweetAwards ({ navigate, dados, foco }) {
  const aberta = !!dados?.avaliacao?.aberta
  const resultados = !!dados?.resultados_publicos
  const encerrada = dados?.fase === 'encerrada'
  const [criterios, recarregar] = useCriterios(!resultados)
  const fim = /^\d{4}-(\d{2})-(\d{2})/.exec(dados?.edicao?.fim || '')
  const trofeu = trofeuEdicao()
  const C = EDICAO.caminho

  // /premiacao abre nos premiados; /avaliar com ?participante= abre no formulário (vindo da ficha da casa).
  React.useEffect(() => {
    const alvo = foco === 'premiacao' ? (resultados ? 'resultados' : 'como') : new URLSearchParams(location.search).get('participante') ? 'avaliacao' : ''
    if (alvo) requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(alvo)?.scrollIntoView({ block: 'start' })))
  }, [foco, resultados])

  let avaliacao
  if (aberta) {
    if (criterios === null) avaliacao = <Carregando texto="Carregando a avaliação…" />
    else if (criterios === 'falha' || !criterios.length) avaliacao = <Falha titulo="Não conseguimos abrir a avaliação agora" texto="Confira a conexão e tente de novo." tentar={recarregar} />
    else avaliacao = <Formulario dados={dados} criterios={criterios} navigate={navigate} />
  } else if (!resultados) {
    const abre = M.aberturaDaAvaliacao(dados)
    avaliacao = (
      <div className="ct-avaliar__fechada">
        {/* "Abre em": olhinhos em expectativa olhando para a data. Só neste estado, que não tem formulário. */}
        {encerrada ? <IconeCartoon nome="avaliar" tamanho={64} />
          : <Olhinhos expressao="expectativa" olhar={{ x: 0.7, y: 0 }} tamanho={120} className="ct-avaliar__olhos" />}
        <div>
          <p className="ct-sub">{encerrada ? FASE_TEXTO.avaliacaoEncerrada : abre ? T.abre(abre) : FASE_TEXTO.avaliacaoFechada}</p>
          {!encerrada && <p>{T.abreLead}</p>}
          {!encerrada && (
            <div className="ct-acoes">
              <Botao href={`${C}/participantes`} navigate={navigate}>{T.verCasas}</Botao>
              <Botao tipo="secundario" href={`${C}/mapa`} navigate={navigate}><IconeCartoon nome="mapa" tamanho={32} />{T.abrirMapa}</Botao>
            </div>
          )}
        </div>
      </div>
    )
  }

  // A lista "O que você avalia" saiu (03/11): o formulário já faz cada pergunta com a ajuda dela, e fechada não há critérios.
  const secaoComo = !resultados && !encerrada && (
    <section id="como" className="ct-bloco ct-awards__secao" aria-labelledby="aw-como">
      <Letreiro id="aw-como" texto={T.comoTitulo} />
      <Passos passos={T.passos} />
    </section>
  )
  const secaoAvaliacao = avaliacao && (
    <section id="avaliacao" className="ct-bloco ct-awards__secao ct-avaliar" aria-labelledby="aw-avaliacao">
      <Letreiro id="aw-avaliacao" texto={T.formTitulo} />
      {avaliacao}
    </section>
  )

  return (
    <>
      <Avisos desatualizado={dados?.desatualizado} demo={dados?.demo} retrato={dados?.retrato} />
      <TopoCanal canal="gala" className="ct-gala ct-palco" aria-labelledby="pr-titulo">
        <Gibi chave="palco" className="ct-palco__fundo" prioridade />
        <div className="ct-palco__corpo">
          <h1 id="pr-titulo" className="ct-gala__marca">
            <img src={MARCA_SWEET_AWARDS.src} width={MARCA_SWEET_AWARDS.largura} height={MARCA_SWEET_AWARDS.altura} alt="" decoding="async" />
            <span className="ct-sr">{T.titulo}</span>
          </h1>
          <p className="ct-palco__texto">{T.lead}</p>
          {!resultados && <p className="ct-sub">{T.depois(fim ? `${fim[2]}/${fim[1]}` : '')}</p>}
          <div className="ct-acoes">
            {resultados ? <Botao href="#resultados">{T.verPremiados}</Botao>
              : aberta ? <Botao href="#avaliacao"><ScwIcon nome={ICONE.avaliar} tamanho={20} />{T.irAvaliar}</Botao> : null}
          </div>
        </div>
        <figure className="ct-gala__palco">
          {/* Encantados com o troféu: ao lado dele no palco, olhando para ele. */}
          <Olhinhos expressao="encantado" olhar={{ x: 0.8, y: 0.3 }} tamanho={112} className="ct-gala__olhos" />
          <img className="ct-palco__trofeu" src={trofeu.src} srcSet={srcSet(trofeu.src)} sizes="(max-width: 899px) 60vw, 340px" width={trofeu.largura} height={trofeu.altura} alt={T.trofeuAlt} decoding="async" />
        </figure>
      </TopoCanal>

      {resultados && <Resultados navigate={navigate} />}

      {/* Aberta: o formulário logo depois do topo (quem chega pelo QR da mesa quer avaliar); "Como funciona" vem depois. */}
      {aberta ? <>{secaoAvaliacao}{secaoComo}</> : <>{secaoComo}{secaoAvaliacao}</>}
    </>
  )
}
