/*
 * Premiação (§6.4): como funciona antes; resultados SÓ com o interruptor 6
 * (resultados_publicos() devolve null antes). Pódio por categoria e trilha,
 * empate permitido, 2º e 3º ausentes = ausência honesta (CLAUDE.md §8.5).
 * Categorias provisórias (D-06) não aparecem como definitivas.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { carregarResultados } from '../../dados/publico.js'
import { Link, Carregando } from '../../componentes/base.jsx'
import { CENA_TEXTO, FASE_TEXTO } from '../textos.js'

const TRILHA = { sweet_lovers: 'Sweet Lovers (avaliação do público)', juri_tecnico: 'Júri técnico' }
const LUGAR = { 1: '1º lugar', 2: '2º lugar', 3: '3º lugar' }

export function Premiacao ({ navigate, dados }) {
  const [res, setRes] = React.useState(dados?.resultados_publicos ? 'carregando' : null)
  React.useEffect(() => {
    if (!dados?.resultados_publicos) return
    carregarResultados(EDICAO.codigo).then((r) => setRes(r || [])).catch(() => setRes('falha'))
  }, [dados?.resultados_publicos])

  const grupos = Array.isArray(res) ? res.reduce((acc, r) => {
    const k = `${r.trilha}|${r.categoria}`
    ;(acc[k] = acc[k] || { trilha: r.trilha, categoria: r.categoria, itens: [] }).itens.push(r)
    return acc
  }, {}) : {}

  return (
    <section className="ct-bloco" aria-labelledby="pr-titulo">
      <h1 id="pr-titulo" className="ct-h1">{CENA_TEXTO.premiacao.titulo}</h1>
      <p className="ct-lead">{CENA_TEXTO.premiacao.apoio}</p>
      {!dados?.resultados_publicos && (
        <>
          <p>As casas da Cartoon concorrem ao Sweet Awards. O público avalia durante o festival, e as categorias e o resultado são publicados aqui.</p>
          <p className="ct-nota">{FASE_TEXTO.resultadosEmBreve}</p>
          {dados?.avaliacao?.aberta && <Link className="ct-botao" href={`${EDICAO.caminho}/avaliar`} navigate={navigate}>Avaliar</Link>}
        </>
      )}
      {res === 'carregando' && <Carregando texto="Carregando os resultados…" />}
      {res === 'falha' && <p className="ct-aviso" role="alert">Não conseguimos carregar os resultados agora.</p>}
      {Array.isArray(res) && (Object.keys(grupos).length ? (
        <div className="ct-podios">
          {Object.values(grupos).map((g) => (
            <article key={`${g.trilha}${g.categoria}`} className="ct-podio">
              <p className="ct-rotulo">{TRILHA[g.trilha] || g.trilha}</p>
              <h2 className="ct-podio__cat">{g.categoria}</h2>
              <ol>
                {[1, 2, 3].map((n) => {
                  const ganhadores = g.itens.filter((i) => i.colocacao === n)
                  if (!ganhadores.length) return null
                  return (
                    <li key={n}><span className="ct-podio__lugar">{LUGAR[n]}</span>{' '}
                      {ganhadores.map((w, i) => (
                        <React.Fragment key={i}>{i ? ' e ' : ''}{w.slug
                          ? <Link href={`${EDICAO.caminho}/participantes/${w.slug}`} navigate={navigate}>{w.nome}</Link> : w.nome}</React.Fragment>
                      ))}
                      {ganhadores.length > 1 ? ' (empate)' : ''}
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
