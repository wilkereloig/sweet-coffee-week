/*
 * Os premiados (só com o interruptor 6: resultados_publicos() devolve null antes). Pódio por categoria e trilha,
 * empate permitido; cada lugar leva o troféu do seu metal (22/10: 1º ouro, 2º prata, 3º cobre). 2º e 3º sem
 * registro ficam ausentes, nunca preenchidos (CLAUDE.md §8.5).
 */
import React from 'react'
import { EDICAO } from '../../../config.js'
import { carregarResultados } from '../../../dados/publico.js'
import { trofeuEdicao } from '../../../../data/imageLibrary'
import { Link, Carregando } from '../../../componentes/base.jsx'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { Etiqueta } from '../../../componentes/sistema/pecas.jsx'
import { AWARDS as T, FASE_TEXTO } from '../../textos.js'

const METAL = { 1: 'ouro', 2: 'prata', 3: 'cobre' }

export function Resultados ({ navigate }) {
  const [res, setRes] = React.useState('carregando')
  React.useEffect(() => { carregarResultados(EDICAO.codigo).then((r) => setRes(r || [])).catch(() => setRes('falha')) }, [])
  const grupos = Array.isArray(res) ? Object.values(res.reduce((acc, r) => {
    const k = `${r.trilha}|${r.categoria}`
    ;(acc[k] = acc[k] || { trilha: r.trilha, categoria: r.categoria, itens: [] }).itens.push(r)
    return acc
  }, {})) : []

  return (
    <section id="resultados" className="ct-bloco ct-awards__secao" aria-labelledby="pr-res">
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
                  const trofeu = trofeuEdicao(METAL[n])
                  return (
                    <li key={n} className={`ct-podio__linha ct-podio__linha--${n}`}>
                      <span className="ct-podio__lugar">
                        <img src={trofeu.src} width={trofeu.largura} height={trofeu.altura} alt="" decoding="async" />
                        {T.lugar[n]}
                      </span>
                      <span>
                        {ganhadores.map((w, i) => (
                          <React.Fragment key={i}>{i ? ' e ' : ''}{w.slug ? <Link href={`${EDICAO.caminho}/participantes/${w.slug}`} navigate={navigate}>{w.nome}</Link> : w.nome}</React.Fragment>
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
  )
}
