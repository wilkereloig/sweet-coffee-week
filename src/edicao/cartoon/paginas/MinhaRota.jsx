/*
 * Minha rota → painel do Sweet Lover (§6.2; docs/cartoon-2026-2/10 §10.14). Topo no canal Rota com o progresso
 * "x de N casas" (ícone + barra). "Quero ir": as paradas na ordem do visitante, em placas numeradas ligadas pelo
 * tracejado vermelho, com subir/descer por teclado, "já fui" e remover; unidade que saiu da edição aparece
 * sinalizada (nunca some calada); Google Maps em trechos e link para compartilhar. "Já fui": as casas visitadas.
 * Tudo salvo no aparelho, sem conta. Sem "melhor caminho": não há cálculo de percurso no projeto.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import * as M from '../../dados/modelo.js'
import { resolverParadas, linksDeRota, idsDaBusca, progresso } from '../../rota/minhaRota.js'
import { Link, AvisoDesatualizado, AvisoDemo, AvisoRetrato } from '../../componentes/base.jsx'
import { TopoCanal, CenaTopo } from '../../componentes/sistema/TopoCanal.jsx'
import { letreiroEdicao } from '../../../data/imageLibrary'
import { Letreiro } from '../../componentes/sistema/Letreiro.jsx'
import { IconeCartoon } from '../../componentes/sistema/IconeCartoon.jsx'
import { Placa, Botao } from '../../componentes/sistema/pecas.jsx'
import { useRota } from '../contexto.js'
import { JaFui } from '../MarcasLover.jsx'
import { ROTA as T } from '../textos.js'

export function MinhaRota ({ navigate, dados }) {
  const rota = useRota()
  const lista = dados?.participantes || []
  const C = EDICAO.caminho
  const compartilhada = React.useMemo(() => idsDaBusca(location.search), [])
  const vendoCompartilhada = compartilhada.length > 0 && compartilhada.join() !== rota.ids.join()
  const paradas = resolverParadas(vendoCompartilhada ? compartilhada : rota.ids, lista)
  // "Já fui" completa a parada: ela sai das pendentes (sem sair da rota) e a casa aparece em "Já fui".
  const pendentes = vendoCompartilhada ? paradas : paradas.filter((pa) => !pa.ativa || !rota.foi(pa.participante))
  const visiveis = pendentes.map((pa) => pa.id)
  const links = linksDeRota(pendentes)
  const visitadas = lista.filter((p) => rota.foi(p))
  const prog = progresso(rota.visitadas, lista)
  const [copiado, setCopiado] = React.useState('')

  const compartilhar = async () => {
    const url = `${location.origin}${C}/minha-rota?u=${pendentes.filter((pa) => pa.ativa).map((pa) => pa.id).join(',')}`
    try {
      if (navigator.share) await navigator.share({ title: 'Minha rota na Sweet & Coffee Week Cartoon', url })
      else { await navigator.clipboard.writeText(url); setCopiado(T.copiado) }
    } catch { setCopiado(T.copie(url)) }
  }

  const avisos = (
    <>
      <AvisoDesatualizado ativo={dados?.desatualizado} />
      <AvisoDemo ativo={dados?.demo} />
      <AvisoRetrato retrato={dados?.retrato} />
    </>
  )
  const topo = (texto, comProgresso = false) => (
    <TopoCanal canal="rota" className="ct-rota-topo" aria-labelledby="rota-titulo">
      <Letreiro nivel={1} id="rota-titulo" texto={T.titulo} imagem={letreiroEdicao('rota')} />
      <p className="ct-lead">{texto}</p>
      {comProgresso && prog.total > 0 && (
        <div className="ct-progresso">
          <IconeCartoon nome="progresso" tamanho={64} />
          <div className="ct-progresso__corpo">
            <p className="ct-progresso__texto" id="rota-progresso"><strong>{T.progresso(prog.feitas, prog.total)}</strong> {T.progressoRotulo}</p>
            <progress className="ct-progresso__barra" max={prog.total} value={prog.feitas} aria-labelledby="rota-progresso" />
          </div>
        </div>
      )}
      <CenaTopo chave="placas" />
    </TopoCanal>
  )

  if (dados?.fase === 'encerrada') {
    return <>{avisos}{topo(T.encerrada)}<section className="ct-bloco"><Botao href={`${C}/participantes`} navigate={navigate}>{T.verCasas}</Botao></section></>
  }
  if (!dados?.participantes_publicos || !lista.length) return <>{avisos}{topo(T.semElenco)}</>

  return (
    <div className="ct-rota">
      {avisos}
      {topo(T.lead, !vendoCompartilhada)}

      <section className="ct-bloco ct-rota__secao" aria-labelledby="rota-quero">
        {vendoCompartilhada && (
          <div className="ct-aviso">
            <p>{T.compartilhada}</p>
            <button type="button" className="ct-botao" onClick={() => { rota.substituir(compartilhada); navigate(`${C}/minha-rota`) }}>{T.salvar}</button>
          </div>
        )}
        <Letreiro id="rota-quero" texto={T.queroIrTitulo} />
        {!pendentes.length ? (
          <div className="ct-estado ct-estado--vazio">
            <IconeCartoon nome="quero-ir" tamanho={64} />
            <p>{paradas.length ? T.tudoVisitado : T.queroIrVazio}</p>
            <div className="ct-acoes">
              <Botao href={`${C}/mapa`} navigate={navigate}><IconeCartoon nome="mapa" tamanho={32} />{T.abrirMapa}</Botao>
              <Botao tipo="secundario" href={`${C}/participantes`} navigate={navigate}>{T.verCasas}</Botao>
            </div>
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
                        {pa.unidade.combo && M.textoEstado(M.estadoAgora(pa.unidade, undefined, dados?.edicao)) && <p className="ct-nota">{M.textoEstado(M.estadoAgora(pa.unidade, undefined, dados?.edicao))}</p>}
                      </>
                    ) : <p className="ct-parada__nome">{T.saiu}</p>}
                  </div>
                  {!vendoCompartilhada && (
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
              {!vendoCompartilhada && <Botao tipo="secundario" onClick={compartilhar}><IconeCartoon nome="compartilhar" tamanho={32} />{T.compartilhar}</Botao>}
            </div>
            <p className="ct-nota">{T.ordem}</p>
            {copiado && <p className="ct-nota" role="status">{copiado}</p>}
          </>
        )}
      </section>

      {!vendoCompartilhada && (
        <section className="ct-bloco ct-rota__secao" aria-labelledby="rota-foi">
          <Letreiro id="rota-foi" texto={T.jaFuiTitulo} />
          {visitadas.length ? (
            <ul className="ct-visitadas">
              {visitadas.map((p) => (
                <li key={p.slug} className="ct-visitada">
                  <IconeCartoon nome="ja-fui" tamanho={48} />
                  <Link className="ct-visitada__nome" href={`${C}/participantes/${p.slug}`} navigate={navigate}>{p.casa.nome}</Link>
                  <JaFui p={p} />
                </li>
              ))}
            </ul>
          ) : <p className="ct-ni">{T.jaFuiVazio}</p>}
          <p className="ct-nota">{T.aparelho}</p>
        </section>
      )}
    </div>
  )
}
