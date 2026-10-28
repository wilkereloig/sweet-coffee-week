/*
 * Entrada da edição (/cartoon; docs/cartoon-2026-2/10 §10.7). Topo no canal Estreia: selo, letreiro
 * desenhado "Agora é hora de provar!", a TV antiga com a placa do período na tela e a placa com o nº de
 * casas — placas só com o que é fato do dado. No corpo creme, em ordem: Como funciona · Nosso elenco
 * (as logos desenhadas, levando a cada casa e ao catálogo) · Onde ficam (bairros com a contagem real,
 * levando ao Mapa; a faixa de Natal é o chão) · Avalie · Dúvidas. O mapa interativo NÃO carrega aqui.
 * Olhinhos (E2, à espera de aprovação): o lugar fica reservado no topo, sem nada desenhado.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import * as M from '../../dados/modelo.js'
import { letreiroEdicao, cenaEdicao, seloEdicao, srcSet } from '../../../data/imageLibrary'
import { Link, AvisoDesatualizado, AvisoDemo, AvisoRetrato, Falha, Carregando } from '../../componentes/base.jsx'
import { TopoCanal } from '../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../componentes/sistema/Letreiro.jsx'
import { IconeCartoon } from '../../componentes/sistema/IconeCartoon.jsx'
import { LogoDesenhada } from '../../componentes/sistema/LogoDesenhada.jsx'
import { Etiqueta, Placa, Botao } from '../../componentes/sistema/pecas.jsx'
import { ENTRADA as T, CATALOGO, DUVIDAS, FASE_TEXTO, PERIODO } from '../textos.js'

const C = EDICAO.caminho

export function Entrada ({ navigate, dados, carregando, erro, tentar }) {
  const selo = seloEdicao()
  const tv = cenaEdicao('tv')
  const natal = cenaEdicao('natal')
  const elenco = dados?.participantes_publicos ? dados.participantes || [] : []
  const bairros = M.contarBairros(elenco)
  const periodo = M.periodoDaEdicao(dados?.edicao, PERIODO)
  const encerrada = dados?.fase === 'encerrada'
  const aberta = !!dados?.avaliacao?.aberta
  const abre = M.aberturaDaAvaliacao(dados)
  const textoAvalie = aberta ? T.avalieAberta
    : encerrada ? FASE_TEXTO.avaliacaoEncerrada
    : abre ? T.avalieAbre(abre) : FASE_TEXTO.avaliacaoFechada

  return (
    <>
      <AvisoDesatualizado ativo={dados?.desatualizado} />
      <AvisoDemo ativo={dados?.demo} />
      <AvisoRetrato retrato={dados?.retrato} />

      <TopoCanal canal="estreia" className="ct-estreia" aria-labelledby="ct-estreia-titulo">
        <div className="ct-estreia__texto">
          {/* O cabeçalho já nomeia a edição (link do selo); aqui o selo é a abertura, sem repetir o nome. */}
          <img className="ct-estreia__selo" src={selo.src} srcSet={srcSet(selo.src)} sizes="160px" alt="" width={selo.largura} height={selo.altura} />
          <Letreiro nivel={1} id="ct-estreia-titulo" texto={T.titulo} imagem={letreiroEdicao('provar')} />
          <p className="ct-estreia__frase">{encerrada ? FASE_TEXTO.encerrada : T.frase}</p>
          <div className="ct-acoes">
            <Botao tipo="acao" href={`${C}/participantes`} navigate={navigate}>{T.acaoParticipantes}</Botao>
            {!encerrada && <Botao tipo="secundario" href={`${C}/mapa`} navigate={navigate}>{T.acaoMapa}</Botao>}
          </div>
        </div>
        <div className="ct-estreia__cena">
          {/* Lugar dos olhinhos (E2): reservado, vazio até a aprovação. */}
          <div className="ct-estreia__olhos" aria-hidden="true" />
          <figure className="ct-estreia__tv">
            <img src={tv.src} width={tv.largura} height={tv.altura} alt="" decoding="async" fetchpriority="high" />
            {periodo && <div className="ct-estreia__tela"><Placa numero={periodo.numero} rotulo={periodo.rotulo} /></div>}
            {elenco.length > 0 && (
              <div className="ct-estreia__casas"><Placa numero={String(elenco.length)} rotulo={CATALOGO.placa(elenco.length)} cor="turquesa" /></div>
            )}
          </figure>
        </div>
      </TopoCanal>

      {!encerrada && (
        <section className="ct-bloco ct-entrada__como" aria-labelledby="ct-como">
          <Etiqueta as="h2" cor="azul" id="ct-como">{T.comoTitulo}</Etiqueta>
          <ol className="ct-passos">
            {T.passos.map((p, i) => (
              <li key={p.titulo}>
                <IconeCartoon nome={p.icone} tamanho={64} />
                <h3 className="ct-passos__titulo"><span className="ct-passos__n" aria-hidden="true">{i + 1}</span>{p.titulo}</h3>
                <p>{p.texto}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="ct-bloco ct-entrada__elenco" aria-labelledby="ct-elenco">
        <Letreiro id="ct-elenco" texto={T.elencoTitulo} imagem={letreiroEdicao('elenco')} />
        {erro ? <Falha titulo="Não conseguimos carregar as casas agora" texto="Confira a conexão e tente de novo." tentar={tentar} />
          : carregando ? <Carregando texto="Carregando as casas…" />
          : elenco.length ? (
            <>
              <ul className="ct-mural">
                {elenco.map((p) => (
                  <li key={p.slug}>
                    <Link className="ct-mural__link" href={`${C}/participantes/${p.slug}`} navigate={navigate}>
                      <LogoDesenhada casa={p.casa} alt="" />
                      <span className="ct-mural__nome">{p.casa.nome}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="ct-acoes"><Botao href={`${C}/participantes`} navigate={navigate}>{T.verTodas(elenco.length)}</Botao></div>
            </>
          ) : <p className="ct-lead">{FASE_TEXTO.semElenco}</p>}
      </section>

      {!encerrada && bairros.length > 0 && (
        <section className="ct-onde" aria-labelledby="ct-onde">
          <div className="ct-bloco">
            <Letreiro id="ct-onde" texto={T.ondeTitulo} />
            <p className="ct-lead">{T.ondeLead}</p>
            <ul className="ct-bairros">
              {bairros.map(({ bairro, casas }) => (
                <li key={bairro}>
                  <Link className="ct-bairro" href={`${C}/mapa?bairro=${encodeURIComponent(bairro)}`} navigate={navigate}>
                    {bairro}<span className="ct-bairro__n" aria-hidden="true">{casas}</span><span className="ct-sr">, {T.bairroCasas(casas)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Botao tipo="secundario" href={`${C}/mapa`} navigate={navigate}>{T.acaoMapa}</Botao>
          </div>
          <img className="ct-onde__chao" src={natal.src} srcSet={srcSet(natal.src)} sizes="100vw" width={natal.largura} height={natal.altura} alt="" loading="lazy" decoding="async" />
        </section>
      )}

      <section className="ct-bloco ct-entrada__avalie" aria-labelledby="ct-avalie">
        <Letreiro id="ct-avalie" texto={T.avalieTitulo} />
        <p className="ct-lead">{textoAvalie}</p>
        <div className="ct-acoes">
          {!encerrada && <Botao href={`${C}/avaliar`} navigate={navigate}>{aberta ? T.avaliar : T.comoAvaliar}</Botao>}
          <Botao tipo={encerrada ? 'primario' : 'secundario'} href={`${C}/premiacao`} navigate={navigate}>{T.premiacao}</Botao>
        </div>
      </section>

      <section className="ct-bloco ct-entrada__duvidas" aria-labelledby="ct-duvidas">
        <Letreiro id="ct-duvidas" texto={T.duvidasTitulo} />
        <div className="ct-duvidas">
          {DUVIDAS.map(([q, r]) => <details key={q}><summary>{q}</summary><p>{r}</p></details>)}
        </div>
      </section>
    </>
  )
}
