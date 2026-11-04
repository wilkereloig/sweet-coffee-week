/*
 * Mapa — página única do mapa, da Minha rota e do Mapa da Doçura (§6.1–§6.2; docs/cartoon-2026-2/14 §14.13).
 * Três vistas das mesmas casas: MUNDO (Natal desenhada como mapa de jogo — só com a arte aprovada, ou no DEV como
 * prévia), MAPA REAL (Google Maps; sem chave ou se o Google recusar, o MapLibre) e LISTA. Ao lado, o cartão da casa
 * escolhida e o painel com duas abas: Minha rota (paradas, Google Maps, compartilhar) e Carimbos (o álbum).
 * `/cartoon/minha-rota` é esta mesma página entrando pela rota (topo da rota; no celular o painel vem antes do mapa).
 * Filtros: busca, bairro, como pedir, aberto agora (só no festival), quero ir e já fui (salvo no aparelho); no
 * Mundo a casa fora do filtro fica apagada, não some. "Perto de mim" só por botão; a posição não sai do navegador.
 * Endereço: ?vista, ?painel, ?unidade, os filtros e ?u (rota compartilhada) — o link reabre a mesma tela.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import { EDICAO } from '../../../config.js'
import * as M from '../../../dados/modelo.js'
import { mundoEdicao, letreiroEdicao } from '../../../../data/imageLibrary'
import { resolverParadas, pendentes, idsDaBusca } from '../../../rota/minhaRota.js'
import { casasNoMundo, pontosDaRota, tracado } from '../../../rota/mundo.js'
import { estadoAlbum, prepararAvaliacao } from '../../../rota/carimbo.js'
import { useMeuMapa } from '../../../rota/useMeuMapa.js'
import { Avisos } from '../../../componentes/base.jsx'
import { TopoCanal, CenaTopo } from '../../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { Botao, Chip } from '../../../componentes/sistema/pecas.jsx'
import { useRota } from '../../contexto.js'
import { useEnderecoDaBusca } from '../../useEnderecoDaBusca.js'
import { QueroIr, JaFui } from '../../MarcasLover.jsx'
import { MAPA as T, ROTA as TR, LOVER, FASE_TEXTO, ATENDIMENTO } from '../../textos.js'
import { AlbumCarimbos } from '../AlbumCarimbos.jsx'
import { Cartao } from './Cartao.jsx'
import { LogoDoPin, pinDaCasa } from './LogoDoPin.jsx'
import { Mundo } from './Mundo.jsx'
import { PainelRota } from './PainelRota.jsx'

// Google Maps quando a chave existe neste ambiente (D-03 revisto, 31/10); sem ela — ou se o Google recusar a chave
// ou não carregar —, o MapLibre (OpenFreeMap), que não pede chave. A página só conhece a interface comum.
const MapaGoogle = React.lazy(() => import('../../../componentes/mapa/MapaGoogle.jsx'))
const MapaLibre = React.lazy(() => import('../../../componentes/mapa/MapaUnidades.jsx'))
const VAZIO = { q: '', bairro: '', modo: '', aberto: false, queroIr: false, jaFui: false }
const VISTAS = ['mundo', 'real', 'lista']
const PAINEIS = ['rota', 'album']
const largo = () => matchMedia('(min-width: 900px)').matches
const inicial = (p) => (p.casa?.nome || '?').replace(/^\[DEMO\]\s*/, '').trim().charAt(0).toUpperCase()

const notaDoLugar = (c) => (!c ? T.semCoordenada : c.conferir ? (c.precisao === 'rua' ? T.aproximadaRua : T.aproximada) : '')

export function Mapa ({ navigate, dados, entrada = 'mapa' }) {
  const rota = useRota()
  const meu = useMeuMapa()
  const mundo = React.useMemo(() => mundoEdicao(), [])
  // Arte provisória (não aprovada) só como prévia no DEV: no ar, o Mundo só entra com a arte aprovada pelo Wilker.
  const comMundo = mundo.aprovada || import.meta.env.DEV
  const vistas = comMundo ? VISTAS : VISTAS.slice(1)
  const pedido = React.useMemo(() => new URLSearchParams(location.search), [])
  const compartilhada = React.useMemo(() => idsDaBusca(location.search), [])
  const [f, setF] = React.useState(() => {
    const b = M.filtrosDaBusca(location.search)
    return { ...VAZIO, q: b.q, bairro: b.bairro, modo: b.modo, aberto: b.aberto }
  })
  const [sel, setSel] = React.useState(() => pedido.get('unidade') || '')
  const [vista, setVista] = React.useState(() => (vistas.includes(pedido.get('vista')) ? pedido.get('vista') : comMundo ? 'mundo' : largo() ? 'real' : 'lista'))
  const [painel, setPainel] = React.useState(() => (PAINEIS.includes(pedido.get('painel')) ? pedido.get('painel') : 'rota'))
  const [posicao, setPosicao] = React.useState(null)
  const [geo, setGeo] = React.useState(typeof navigator !== 'undefined' && 'geolocation' in navigator ? 'disponivel' : 'indisponivel')
  // Mapa real no celular: só pelo botão, para não baixar o Google sem pedido. No desktop já vem.
  const [verMapa, setVerMapa] = React.useState(largo)
  const [provedor, setProvedor] = React.useState(import.meta.env.VITE_GOOGLE_MAPS_KEY ? 'google' : 'maplibre')
  const usarReserva = React.useCallback(() => setProvedor('maplibre'), [])
  const MapaUnidades = provedor === 'google' ? MapaGoogle : MapaLibre

  const lista = dados?.participantes || []
  const periodo = dados?.edicao
  const opcoes = React.useMemo(() => M.opcoesFiltro(lista, periodo), [lista, periodo])
  const filtro = { ...f, aberto: f.aberto && opcoes.hoje } // fora do festival, ?aberto=1 antigo não esconde nada
  const marcas = { rota: rota.ids, foi: rota.foi }
  const linhas = M.unidadesDoMapa(lista, filtro, marcas, { periodo, posicao })
  const noMapa = linhas.filter((x) => x.u.coordenada)
  const todas = comMundo ? M.unidadesDoMapa(lista, {}, marcas, { periodo }) : linhas
  const escolhida = linhas.find((x) => x.u.id === sel) || todas.find((x) => x.u.id === sel) || null
  const ativos = [f.q, f.bairro, f.modo, filtro.aberto, f.queroIr, f.jaFui].filter(Boolean).length
  const bairroOpcao = opcoes.bairros.find((b) => M.normalizar(b) === M.normalizar(f.bairro)) || ''

  // Carimbos (Mapa da Doçura) e rota: o que o álbum, o painel e o Mundo mostram vem daqui, uma vez.
  const album = meu.mapa ? estadoAlbum(lista, meu.mapa) : null
  const carimboDe = new Map((album?.casas || []).map((c) => [c.slug, c]))
  const carimbada = (p) => !!carimboDe.get(p.slug)?.colorida
  const visitou = (p) => rota.foi(p) || carimbada(p)
  const vendoCompartilhada = compartilhada.length > 0 && compartilhada.join() !== rota.ids.join()
  const paradas = resolverParadas(vendoCompartilhada ? compartilhada : rota.ids, lista)
  const faltam = vendoCompartilhada ? paradas : pendentes(paradas, visitou)
  const paradaDe = new Map(faltam.map((pa, i) => [pa.id, i + 1]))
  const aba = vendoCompartilhada ? 'rota' : painel

  const visiveis = new Set(linhas.map((x) => x.u.id))
  const casasMundo = comMundo ? casasNoMundo(mundo.unidades, todas).map(({ u, p, x, y, numero }) => {
    const c = carimboDe.get(p.slug)
    return {
      id: u.id, x, y, numero, titulo: M.tituloDaUnidade(p, u), tema: p.casa?.tema || '', doceria: mundo.doceria(p.slug), bandeira: mundo.bandeira(numero), pin: mundo.logo(p.slug), inicial: inicial(p),
      apagada: !visiveis.has(u.id), parada: paradaDe.get(u.id) || null, carimbos: c?.carimbos || 0, avaliou: !!c?.avaliou,
    }
  }) : []
  const trilha = comMundo ? tracado(pontosDaRota(faltam.filter((pa) => pa.ativa).map((pa) => pa.id), mundo.unidades), mundo.quadro) : ''

  const busca = new URLSearchParams(M.buscaDosFiltros({ q: f.q, bairro: f.bairro, modo: f.modo, aberto: filtro.aberto }))
  if (sel) busca.set('unidade', sel)
  if (vista !== 'mundo') busca.set('vista', vista)
  if (aba !== 'rota') busca.set('painel', aba)
  if (vendoCompartilhada) busca.set('u', compartilhada.join(','))
  useEnderecoDaBusca(busca)
  React.useEffect(() => { if (sel && vista === 'lista') document.getElementById(`mapa-${sel}`)?.scrollIntoView({ block: 'nearest' }) }, [sel, vista])

  const localizar = () => {
    setGeo('pedindo')
    navigator.geolocation.getCurrentPosition(
      (p) => { setPosicao({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeo('ok') },
      () => setGeo('negada'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }
  const muda = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const escolher = React.useCallback((id) => {
    setSel(id)
    // No celular o cartão fica embaixo da vista: rola só o necessário para ele aparecer.
    if (id && !largo()) requestAnimationFrame(() => document.querySelector('.ct-mapa__cartao')?.scrollIntoView({ block: 'nearest' }))
  }, [])
  const avaliar = (p, u) => navigate(prepararAvaliacao({ caminho: EDICAO.caminho, slug: p.slug, unidade: u.id, mapa: meu.mapa }))

  const topo = (texto) => (
    <TopoCanal canal="rota" className="ct-rota-topo" aria-labelledby="mapa-titulo">
      {entrada === 'rota'
        ? <Letreiro nivel={1} id="mapa-titulo" texto={TR.titulo} imagem={letreiroEdicao('rota')} />
        : <Letreiro nivel={1} id="mapa-titulo" texto={T.titulo} cor="amarelo" />}
      <p className="ct-lead">{texto}</p>
      <CenaTopo chave="placas" />
    </TopoCanal>
  )
  const avisos = <Avisos desatualizado={dados?.desatualizado} demo={dados?.demo} retrato={dados?.retrato} />
  const textoDe = (mapa, daRota) => (entrada === 'rota' ? daRota : mapa)

  if (dados?.fase === 'encerrada') {
    return <>{avisos}{topo(textoDe(T.encerrada, TR.encerrada))}<section className="ct-bloco"><Botao href={`${EDICAO.caminho}/participantes`} navigate={navigate}>{T.verCasas}</Botao></section></>
  }
  if (!dados?.participantes_publicos || !lista.length) return <>{avisos}{topo(textoDe(FASE_TEXTO.semElenco, TR.semElenco))}</>

  return (
    <>
      {avisos}
      {topo(textoDe(T.lead, TR.lead))}
      <section className={`ct-bloco ct-mapa${entrada === 'rota' ? ' ct-mapa--rota' : ''}`} aria-label="Casas da Cartoon">
        <div className="ct-mapa__corpo">
          <div className="ct-mapa__vista">
            <div className="ct-chips ct-mapa__vistas" role="group" aria-label={T.vistas}>
              {vistas.map((v) => <Chip key={v} ativo={vista === v} onClick={() => setVista(v)}>{T.vista[v]}</Chip>)}
            </div>

            <div className="ct-filtros ct-mapa__filtros">
              <label className="ct-campo ct-campo--busca"><span className="ct-sr">{T.busca}</span>
                <input type="search" value={f.q} placeholder={T.busca} onChange={(e) => muda('q', e.target.value)} />
              </label>
              {opcoes.bairros.length > 1 && (
                <label className="ct-campo ct-filtros__grupo">
                  <span className="ct-rotulo">{T.bairro}</span>
                  <select value={bairroOpcao} onChange={(e) => muda('bairro', e.target.value)}>
                    <option value="">{T.todos}</option>
                    {opcoes.bairros.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </label>
              )}
              <fieldset className="ct-filtros__grupo">
                <legend className="ct-rotulo">{T.comoPedir}</legend>
                <div className="ct-chips">
                  {M.MODOS.map(([k]) => (
                    <Chip key={k} ativo={f.modo === k} icone={ATENDIMENTO[k].icone} onClick={() => muda('modo', f.modo === k ? '' : k)}>{ATENDIMENTO[k].rotulo}</Chip>
                  ))}
                </div>
              </fieldset>
              <fieldset className="ct-filtros__grupo">
                <legend className="ct-rotulo">{T.mostrar}</legend>
                <div className="ct-chips">
                  {opcoes.hoje && <Chip ativo={f.aberto} icone="aberto-agora" onClick={() => muda('aberto', !f.aberto)}>{T.aberto}</Chip>}
                  <Chip ativo={f.queroIr} icone="quero-ir" onClick={() => muda('queroIr', !f.queroIr)}>{LOVER.queroIr}</Chip>
                  <Chip ativo={f.jaFui} icone="ja-fui" onClick={() => muda('jaFui', !f.jaFui)}>{LOVER.jaFui}</Chip>
                </div>
              </fieldset>
              {geo === 'disponivel' && <button type="button" className="ct-botao ct-botao--contorno ct-mapa__perto" onClick={localizar}><ScwIcon nome="local" tamanho={20} />{T.pertoDeMim}</button>}
              {geo === 'pedindo' && <p className="ct-nota" role="status">{T.pedindo}</p>}
              {geo === 'ok' && <p className="ct-nota" role="status">{T.ordenado}</p>}
              {geo === 'negada' && <p className="ct-nota" role="status">{T.negada}</p>}
            </div>

            <div className="ct-catalogo__resumo">
              <p className="ct-catalogo__conta" aria-live="polite">{T.contagem(linhas.length)}</p>
              {ativos > 0 && <button type="button" className="ct-link" onClick={() => setF(VAZIO)}>{T.limpar}</button>}
            </div>

            <div className="ct-mapa__tela">
              {vista === 'mundo' && (
                <>
                  {!mundo.aprovada && <p className="ct-nota ct-mapa__previa" role="note">{T.previa}</p>}
                  <Mundo mundo={mundo} casas={casasMundo} trilha={trilha} selecionada={sel} aoSelecionar={escolher} />
                </>
              )}

              {vista === 'real' && (
                <>
                  <div className="ct-mapa__area">
                    {noMapa.length === 0 ? <p className="ct-nota">{T.semMapa}</p>
                      : verMapa ? (
                        <React.Suspense fallback={<p className="ct-nota" role="status">{T.carregando}</p>}>
                          <ErroDoMapa>
                            <MapaUnidades key={provedor} selecionada={sel} aoSelecionar={escolher} voce={posicao} aoFalhar={provedor === 'google' ? usarReserva : undefined}
                              pontos={noMapa.map(({ u, p, quero, foi }) => ({ id: u.id, lat: u.coordenada.lat, lng: u.coordenada.lng, titulo: M.tituloDaUnidade(p, u), aproximada: !!u.coordenada.conferir, quero, foi, pin: pinDaCasa(p) }))} />
                          </ErroDoMapa>
                        </React.Suspense>
                      ) : <button type="button" className="ct-botao" onClick={() => setVerMapa(true)}><IconeCartoon nome="mapa" tamanho={32} />{T.verMapa(noMapa.length)}</button>}
                  </div>
                  {verMapa && noMapa.length > 0 && (
                    <ul className="ct-legenda" aria-label="Legenda do mapa">
                      <li className="ct-legenda__nota">{T.legendaPins}</li>
                      {Object.entries(T.legenda).filter(([k]) => k !== 'voce' || posicao).map(([k, texto]) => <li key={k}><span className={`ct-legenda__ponto ct-legenda__ponto--${k}`} aria-hidden="true" />{texto}</li>)}
                    </ul>
                  )}
                </>
              )}

              {vista === 'lista' && (linhas.length ? (
                <ul className="ct-mapa__lista" aria-label={T.contagem(linhas.length)}>
                  {linhas.map(({ u, p, dist, foi }) => {
                    const titulo = M.tituloDaUnidade(p, u)
                    const est = u.combo ? M.estadoAgora(u, undefined, dados?.edicao) : null
                    const agora = est ? M.textoEstado(est) : ''
                    const nota = notaDoLugar(u.coordenada)
                    return (
                      <li key={u.id} id={`mapa-${u.id}`} className={`ct-mapa__item${sel === u.id ? ' is-sel' : ''}${foi ? ' is-visitada' : ''}`}>
                        <button type="button" className="ct-mapa__sel" aria-pressed={sel === u.id} onClick={() => escolher(sel === u.id ? '' : u.id)}>
                          <LogoDoPin p={p} />
                          <span className="ct-mapa__sel-texto">
                            <strong>{titulo}</strong>
                            <span>{M.enderecoEmLinha(u.endereco)}</span>
                            {agora && <span className={`ct-mapa__estado ct-mapa__estado--${est.estado}`}>{agora}</span>}
                            {dist != null && <span className="ct-nota">{T.distancia(dist, !!u.coordenada?.conferir)}</span>}
                            {nota && <span className={`ct-mapa__local${u.coordenada ? ' ct-mapa__local--aprox' : ''}`}>{nota}</span>}
                          </span>
                        </button>
                        <div className="ct-mapa__marcas"><QueroIr u={u} nome={titulo} /><JaFui p={p} /></div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="ct-estado ct-estado--vazio">
                  <IconeCartoon nome="vazio" tamanho={64} />
                  <p>{T.nenhuma}</p>
                  <button type="button" className="ct-botao" onClick={() => setF(VAZIO)}>{T.limpar}</button>
                </div>
              ))}
            </div>
          </div>

          <div className="ct-mapa__lado">
            {(escolhida || entrada === 'mapa') && ( // entrando pela rota, a dica de "escolha uma casa" só atrapalha
              <Cartao linha={escolhida} periodo={periodo} navigate={navigate} fechar={() => setSel('')}
                parada={escolhida ? paradaDe.get(escolhida.u.id) || null : null} carimbo={escolhida ? carimboDe.get(escolhida.p.slug) || null : null} aoAvaliar={avaliar} />
            )}
            <section className="ct-mapa__painel" aria-label={T.painel}>
              {!vendoCompartilhada && (
                <div className="ct-chips ct-mapa__abas" role="group" aria-label={T.painel}>
                  {PAINEIS.map((k) => <Chip key={k} ativo={aba === k} onClick={() => setPainel(k)}>{T.abas[k]}</Chip>)}
                </div>
              )}
              {aba === 'rota'
                ? <PainelRota dados={dados} navigate={navigate} paradas={paradas} pendentes={faltam} compartilhada={vendoCompartilhada ? compartilhada : null}
                    visitou={visitou} carimbada={carimbada} mundo={comMundo ? mundo : null} />
                : <AlbumCarimbos dados={dados} navigate={navigate} meu={meu} />}
            </section>
          </div>
        </div>
      </section>
    </>
  )
}

class ErroDoMapa extends React.Component {
  constructor (p) { super(p); this.state = { erro: false } }
  static getDerivedStateFromError () { return { erro: true } }
  render () { return this.state.erro ? <p className="ct-nota" role="alert">{T.falhou}</p> : this.props.children }
}
