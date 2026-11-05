/*
 * Painel "Minha rota" da página do mapa (§6.2; docs/cartoon-2026-2/14 §14.13): o progresso "x de N casas", as paradas
 * na ordem do visitante (placas numeradas, subir/descer por teclado, remover), Google Maps em trechos, compartilhar,
 * "ordenar pelo caminho do mapa" e as casas visitadas ("já fui" marcado ou carimbo). A unidade que saiu da edição
 * aparece sinalizada (nunca some calada). Tudo salvo no aparelho, sem conta. Sem "melhor caminho": não há cálculo de
 * percurso no projeto — a ordem do mapa é a dos bairros no desenho, e o texto diz isso.
 */
import React from 'react'
import { EDICAO } from '../../../config.js'
import * as M from '../../../dados/modelo.js'
import { linksDeRota } from '../../../rota/minhaRota.js'
import { ordemDoCaminho } from '../../../rota/mundo.js'
import { Link } from '../../../componentes/base.jsx'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { Placa, Botao } from '../../../componentes/sistema/pecas.jsx'
import { useRota } from '../../contexto.js'
import { JaFui } from '../../MarcasLover.jsx'
import { SeloEstado } from '../../../caca/mapa/SeloEstado.jsx'
import { ROTA as T } from '../../textos.js'

export function PainelRota ({ dados, navigate, paradas, pendentes, compartilhada, visitou, estadoDe = () => null, revisitasDe = () => 0, mundo }) {
  const rota = useRota()
  const lista = dados?.participantes || []
  const C = EDICAO.caminho
  const visiveis = pendentes.map((pa) => pa.id)
  const links = linksDeRota(pendentes)
  const visitadas = lista.filter(visitou)
  const podeOrdenar = !compartilhada && mundo && pendentes.filter((pa) => mundo.unidades[pa.id]).length > 1
  const [copiado, setCopiado] = React.useState('')

  const compartilhar = async () => {
    const url = `${location.origin}${C}/mapa?u=${pendentes.filter((pa) => pa.ativa).map((pa) => pa.id).join(',')}`
    try {
      if (navigator.share) await navigator.share({ title: 'Minha rota na Sweet & Coffee Week Cartoon', url })
      else { await navigator.clipboard.writeText(url); setCopiado(T.copiado) }
    } catch { setCopiado(T.copie(url)) }
  }

  return (
    <div className="ct-rota ct-painel-rota">
      {/* O progresso ("X de N casas") mora na faixa do alto da página; aqui não se repete a mesma conta. */}
      {!compartilhada && (
        <details className="ct-rota__ajuda">
          <summary>{T.tresMarcasRotulo}</summary>
          <ul className="ct-rota__marcas">
            {T.tresMarcas.map(([nome, texto]) => <li key={nome}><strong>{nome}:</strong> {texto}</li>)}
          </ul>
        </details>
      )}

      <section className="ct-rota__secao" aria-labelledby="rota-quero">
        {compartilhada && (
          <div className="ct-aviso">
            <p>{T.compartilhada}</p>
            <button type="button" className="ct-botao" onClick={() => rota.substituir(compartilhada)}>{T.salvar}</button>
          </div>
        )}
        <Letreiro id="rota-quero" texto={T.queroIrTitulo} />
        {!pendentes.length ? (
          <div className="ct-estado ct-estado--vazio">
            <IconeCartoon nome="quero-ir" tamanho={64} />
            <p>{paradas.length ? T.tudoVisitado : T.queroIrVazio}</p>
            <Botao tipo="secundario" href={`${C}/participantes`} navigate={navigate}>{T.verCasas}</Botao>
          </div>
        ) : (
          <>
            <ol className="ct-paradas">
              {pendentes.map((pa, i) => (
                <li key={pa.id} className={`ct-parada${pa.ativa ? '' : ' ct-parada--saiu'}`}>
                  <Placa numero={String(i + 1)} rotulo={T.parada} />
                  <div className="ct-parada__cartao">
                    <div className="ct-parada__info">
                      {pa.ativa ? (
                        <>
                          <p className="ct-parada__nome"><Link href={`${C}/participantes/${pa.participante.slug}`} navigate={navigate}>{M.tituloDaUnidade(pa.participante, pa.unidade)}</Link></p>
                          <p>{M.enderecoEmLinha(pa.unidade.endereco)}</p>
                          {/* Quem participa da Caça vê o estado REAL de cada parada (do servidor); sem mapa, nada é desenhado. */}
                          {estadoDe(pa.participante.slug) && <SeloEstado estado={estadoDe(pa.participante.slug)} revisitas={revisitasDe(pa.participante.slug)} tamanho={24} longo />}
                          {pa.unidade.combo && M.textoEstado(M.estadoAgora(pa.unidade, undefined, dados?.edicao)) && <p className="ct-nota">{M.textoEstado(M.estadoAgora(pa.unidade, undefined, dados?.edicao))}</p>}
                        </>
                      ) : <p className="ct-parada__nome">{T.saiu}</p>}
                    </div>
                    {!compartilhada && (
                      <div className="ct-parada__acoes">
                        {pa.ativa && <JaFui p={pa.participante} />}
                        <button type="button" className="ct-botao ct-botao--contorno" disabled={i === 0} aria-label={`${T.subir} parada ${i + 1}`} onClick={() => rota.mover(pa.id, -1, visiveis)}>{T.subir}</button>
                        <button type="button" className="ct-botao ct-botao--contorno" disabled={i === pendentes.length - 1} aria-label={`${T.descer} parada ${i + 1}`} onClick={() => rota.mover(pa.id, 1, visiveis)}>{T.descer}</button>
                        <button type="button" className="ct-botao ct-botao--contorno" onClick={() => rota.remover(pa.id, pa.ativa ? pa.participante.casa.nome : 'Parada')}>{T.remover}</button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <div className="ct-acoes">
              {links.map((href, i) => (
                <Botao key={href} href={href} target="_blank" rel="noopener noreferrer"><IconeCartoon nome="como-chegar" tamanho={32} />{links.length > 1 ? T.abrirTrecho(i + 1) : T.abrirRota}</Botao>
              ))}
              {!compartilhada && <Botao tipo="secundario" onClick={compartilhar}><IconeCartoon nome="compartilhar" tamanho={32} />{T.compartilhar}</Botao>}
              {podeOrdenar && <Botao tipo="secundario" onClick={() => rota.substituir(ordemDoCaminho(rota.ids, mundo.unidades), T.ordenadoCaminho)}>{T.ordenarCaminho}</Botao>}
            </div>
            <p className="ct-nota">{T.ordem}</p>
            {podeOrdenar && <p className="ct-nota">{T.ordenarNota}</p>}
            {copiado && <p className="ct-nota" role="status">{copiado}</p>}
          </>
        )}
      </section>

      {!compartilhada && (
        <section className="ct-rota__secao" aria-labelledby="rota-foi">
          <Letreiro id="rota-foi" texto={T.jaFuiTitulo} />
          {visitadas.length ? (
            <ul className="ct-visitadas">
              {visitadas.map((p) => (
                <li key={p.slug} className="ct-visitada">
                  <IconeCartoon nome="ja-fui" tamanho={48} />
                  <Link className="ct-visitada__nome" href={`${C}/participantes/${p.slug}`} navigate={navigate}>{p.casa.nome}</Link>
                  {['pendente', 'conquistada'].includes(estadoDe(p.slug)) && <SeloEstado estado={estadoDe(p.slug)} revisitas={revisitasDe(p.slug)} tamanho={24} longo />}
                  {estadoDe(p.slug) !== 'conquistada' && <JaFui p={p} />}
                </li>
              ))}
            </ul>
          ) : <p className="ct-ni">{T.jaFuiVazio}</p>}
          <p className="ct-nota">{T.aparelho}</p>
        </section>
      )}

      {!compartilhada && (
        <section className="ct-rota__secao" aria-labelledby="rota-grupo">
          <Letreiro id="rota-grupo" texto={T.grupoTitulo} />
          <p className="ct-nota">{T.grupoTexto}</p>
          <div className="ct-acoes"><Botao tipo="secundario" href={`${C}/caca/grupos`} navigate={navigate}>{T.grupoAcao}</Botao></div>
        </section>
      )}
    </div>
  )
}
