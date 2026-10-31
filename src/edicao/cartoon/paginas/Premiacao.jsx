/*
 * Premiação (§6.4; docs/cartoon-2026-2/10 §10.7): topo no canal Gala (chocolate) com a marca própria do Sweet
 * Awards no título e o troféu v15 de ouro sob o holofote; no pódio, cada lugar leva o troféu do seu metal (decisões
 * de 22/10: 1º ouro, 2º prata, 3º cobre). Antes dos resultados: como funciona e "resultados depois de <fim do festival>" (do dado; nenhuma data
 * de divulgação inventada, D-15). Resultados SÓ com o interruptor 6 (resultados_publicos() devolve null antes):
 * pódio por categoria e trilha, empate permitido; 2º e 3º sem registro ficam ausentes, nunca preenchidos
 * (CLAUDE.md §8.5). Categorias provisórias (D-06) não aparecem como definitivas.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { carregarResultados } from '../../dados/publico.js'
import { trofeuEdicao, MARCA_SWEET_AWARDS, srcSet } from '../../../data/imageLibrary'
import { Link, Carregando } from '../../componentes/base.jsx'
import { TopoCanal } from '../../componentes/sistema/TopoCanal.jsx'
import { Olhinhos } from '../../componentes/sistema/Olhinhos.jsx'
import { Letreiro } from '../../componentes/sistema/Letreiro.jsx'
import { Etiqueta, Botao } from '../../componentes/sistema/pecas.jsx'
import { PREMIACAO as T, FASE_TEXTO } from '../textos.js'

const METAL = { 1: 'ouro', 2: 'prata', 3: 'cobre' }

export function Premiacao ({ navigate, dados }) {
  const [res, setRes] = React.useState(dados?.resultados_publicos ? 'carregando' : null)
  React.useEffect(() => {
    if (!dados?.resultados_publicos) return
    carregarResultados(EDICAO.codigo).then((r) => setRes(r || [])).catch(() => setRes('falha'))
  }, [dados?.resultados_publicos])

  const grupos = Array.isArray(res) ? Object.values(res.reduce((acc, r) => {
    const k = `${r.trilha}|${r.categoria}`
    ;(acc[k] = acc[k] || { trilha: r.trilha, categoria: r.categoria, itens: [] }).itens.push(r)
    return acc
  }, {})) : []
  const fim = /^\d{4}-(\d{2})-(\d{2})/.exec(dados?.edicao?.fim || '')
  const trofeu = trofeuEdicao()
  const C = EDICAO.caminho

  return (
    <>
      <TopoCanal canal="gala" className="ct-gala" aria-labelledby="pr-titulo">
        <div className="ct-gala__texto">
          <p className="ct-rotulo">{T.rotulo}</p>
          <h1 id="pr-titulo" className="ct-gala__marca">
            <img src={MARCA_SWEET_AWARDS.src} width={MARCA_SWEET_AWARDS.largura} height={MARCA_SWEET_AWARDS.altura} alt="" decoding="async" />
            <span className="ct-sr">{T.titulo}</span>
          </h1>
          <p className="ct-lead">{T.lead}</p>
          {!dados?.resultados_publicos && <p className="ct-sub">{T.depois(fim ? `${fim[2]}/${fim[1]}` : '')}</p>}
          <div className="ct-acoes">
            {dados?.avaliacao?.aberta
              ? <Botao href={`${C}/avaliar`} navigate={navigate}>{T.avaliar}</Botao>
              : !dados?.resultados_publicos && dados?.fase !== 'encerrada' && <Botao tipo="secundario" href={`${C}/avaliar`} navigate={navigate}>{T.comoAvaliar}</Botao>}
          </div>
        </div>
        <figure className="ct-gala__palco">
          {/* Encantados com o troféu: no alto do palco, olhando para baixo, para ele. */}
          <Olhinhos expressao="encantado" olhar={{ x: 0.5, y: 0.7 }} tamanho={112} className="ct-gala__olhos" />
          <img src={trofeu.src} srcSet={srcSet(trofeu.src)} sizes="(max-width: 899px) 60vw, 340px" width={trofeu.largura} height={trofeu.altura} alt={T.trofeuAlt} decoding="async" />
        </figure>
      </TopoCanal>

      {dados?.resultados_publicos && (
        <section className="ct-bloco" aria-labelledby="pr-res">
          <Letreiro id="pr-res" texto={T.resultadosTitulo} />
          {res === 'carregando' && <Carregando texto="Carregando os resultados…" />}
          {res === 'falha' && <p className="ct-aviso" role="alert">{T.falha}</p>}
          {Array.isArray(res) && (grupos.length ? (
            <div className="ct-podios">
              {grupos.map((g) => (
                <article key={`${g.trilha}${g.categoria}`} className="ct-podio">
                  <Etiqueta>{T.trilha[g.trilha] || g.trilha}</Etiqueta>
                  <h3 className="ct-podio__cat">{g.categoria}</h3>
                  <ol className="ct-podio__lugares">
                    {[1, 2, 3].map((n) => {
                      const ganhadores = g.itens.filter((i) => i.colocacao === n)
                      if (!ganhadores.length) return null // sem registro: ausente, nunca preenchido
                      return (
                        <li key={n} className={`ct-podio__linha ct-podio__linha--${n}`}>
                          <span className="ct-podio__lugar">
                            <img src={trofeuEdicao(METAL[n]).src} width={trofeuEdicao(METAL[n]).largura} height={trofeuEdicao(METAL[n]).altura} alt="" decoding="async" />
                            {T.lugar[n]}
                          </span>
                          <span>
                            {ganhadores.map((w, i) => (
                              <React.Fragment key={i}>{i ? ' e ' : ''}{w.slug ? <Link href={`${C}/participantes/${w.slug}`} navigate={navigate}>{w.nome}</Link> : w.nome}</React.Fragment>
                            ))}
                            {ganhadores.length > 1 ? T.empate : ''}
                          </span>
                        </li>
                      )
                    })}
                  </ol>
                </article>
              ))}
            </div>
          ) : <p>{FASE_TEXTO.resultadosEmBreve}</p>)}
        </section>
      )}
    </>
  )
}
