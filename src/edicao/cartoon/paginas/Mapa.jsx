/*
 * Mapa (§6.1; docs/cartoon-2026-2/10 §10.7 e §10.14): topo no canal Rota, a edição inteira num plano geral.
 * A LISTA vem primeiro e funciona sozinha (uma linha por unidade); o mapa interativo carrega sob demanda
 * (MapaUnidades): no desktop já ao abrir a página, no celular pelo botão "Ver no mapa" — e, se falhar, a lista segue.
 * No mapa entram as unidades com coordenada: a conferida pela organização como ponto, a aproximada do retrato
 * (`conferir`) com marcador próprio e dita assim; sem coordenada, só na lista, "localização em conferência".
 * Filtros: busca, bairro (contrato da Entrada: ?bairro=), aberto agora (só no festival), quero ir e já fui
 * (o painel do Sweet Lover, salvo no aparelho). "Perto de mim" só por botão; ordena pela distância em linha
 * reta, dita assim. A posição não sai do navegador.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import * as M from '../../dados/modelo.js'
import { Link, AvisoDesatualizado, AvisoDemo, AvisoRetrato } from '../../componentes/base.jsx'
import { TopoCanal, CenaTopo } from '../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../componentes/sistema/Letreiro.jsx'
import { IconeCartoon } from '../../componentes/sistema/IconeCartoon.jsx'
import { Botao, Chip } from '../../componentes/sistema/pecas.jsx'
import { useRota } from '../contexto.js'
import { QueroIr, JaFui } from '../MarcasLover.jsx'
import { MAPA as T, LOVER, FASE_TEXTO } from '../textos.js'

const MapaUnidades = React.lazy(() => import('../../componentes/mapa/MapaUnidades.jsx'))
const CHAVES_URL = ['q', 'bairro', 'aberto', 'unidade']

const notaDoLugar = (c) => (!c ? T.semCoordenada : c.conferir ? (c.precisao === 'rua' ? T.aproximadaRua : T.aproximada) : '')

export function Mapa ({ navigate, dados }) {
  const rota = useRota()
  const [f, setF] = React.useState(() => {
    const b = M.filtrosDaBusca(location.search)
    return { q: b.q, bairro: b.bairro, aberto: b.aberto, queroIr: false, jaFui: false }
  })
  const [sel, setSel] = React.useState(() => new URLSearchParams(location.search).get('unidade') || '')
  const [posicao, setPosicao] = React.useState(null)
  const [geo, setGeo] = React.useState(typeof navigator !== 'undefined' && 'geolocation' in navigator ? 'disponivel' : 'indisponivel')
  // Desktop: o mapa já vem (a área está na tela). Celular: só pelo botão, para não baixar o mapa sem pedido.
  const [verMapa, setVerMapa] = React.useState(() => matchMedia('(min-width: 900px)').matches)
  const lista = dados?.participantes || []
  const opcoes = React.useMemo(() => M.opcoesFiltro(lista, dados?.edicao), [lista, dados?.edicao])
  const filtro = { ...f, aberto: f.aberto && opcoes.hoje } // fora do festival, ?aberto=1 antigo não esconde nada
  const linhas = M.unidadesDoMapa(lista, filtro, { rota: rota.ids, foi: rota.foi }, { periodo: dados?.edicao, posicao })
  const noMapa = linhas.filter((x) => x.u.coordenada)
  const ativos = [f.q, f.bairro, filtro.aberto, f.queroIr, f.jaFui].filter(Boolean).length
  const bairroOpcao = opcoes.bairros.find((b) => M.normalizar(b) === M.normalizar(f.bairro)) || ''

  React.useEffect(() => {
    // Busca, bairro, aberto e a unidade escolhida vão para o endereço; ?preview e ?demo ficam como estão.
    const q = new URLSearchParams(location.search)
    for (const k of CHAVES_URL) q.delete(k)
    if (f.q) q.set('q', f.q)
    if (f.bairro) q.set('bairro', f.bairro)
    if (filtro.aberto) q.set('aberto', '1')
    if (sel) q.set('unidade', sel)
    const s = q.toString()
    history.replaceState(history.state, '', location.pathname + (s ? `?${s}` : ''))
  }, [f.q, f.bairro, filtro.aberto, sel])
  React.useEffect(() => { if (sel) document.getElementById(`mapa-${sel}`)?.scrollIntoView({ block: 'nearest' }) }, [sel])

  const localizar = () => {
    setGeo('pedindo')
    navigator.geolocation.getCurrentPosition(
      (p) => { setPosicao({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeo('ok') },
      () => setGeo('negada'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }
  const muda = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const topo = (texto) => (
    <TopoCanal canal="rota" className="ct-rota-topo" aria-labelledby="mapa-titulo">
      <Letreiro nivel={1} id="mapa-titulo" texto={T.titulo} cor="amarelo" />
      <p className="ct-lead">{texto}</p>
      <CenaTopo chave="placas" />
    </TopoCanal>
  )
  const avisos = (
    <>
      <AvisoDesatualizado ativo={dados?.desatualizado} />
      <AvisoDemo ativo={dados?.demo} />
      <AvisoRetrato retrato={dados?.retrato} />
    </>
  )

  if (dados?.fase === 'encerrada') {
    return (
      <>
        {avisos}
        {topo(T.encerrada)}
        <section className="ct-bloco"><Botao href={`${EDICAO.caminho}/participantes`} navigate={navigate}>{T.verCasas}</Botao></section>
      </>
    )
  }
  if (!dados?.participantes_publicos || !lista.length) return <>{avisos}{topo(FASE_TEXTO.semElenco)}</>

  return (
    <>
      {avisos}
      {topo(T.lead)}
      <section className="ct-bloco ct-mapa" aria-label="Unidades da Cartoon">
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
            <legend className="ct-rotulo">{T.mostrar}</legend>
            <div className="ct-chips">
              {opcoes.hoje && <Chip ativo={f.aberto} icone="aberto-agora" onClick={() => muda('aberto', !f.aberto)}>{T.aberto}</Chip>}
              <Chip ativo={f.queroIr} icone="quero-ir" onClick={() => muda('queroIr', !f.queroIr)}>{LOVER.queroIr}</Chip>
              <Chip ativo={f.jaFui} icone="ja-fui" onClick={() => muda('jaFui', !f.jaFui)}>{LOVER.jaFui}</Chip>
            </div>
          </fieldset>
          {geo === 'disponivel' && <button type="button" className="ct-botao ct-botao--contorno ct-mapa__perto" onClick={localizar}><IconeCartoon nome="endereco" tamanho={32} />{T.pertoDeMim}</button>}
          {geo === 'pedindo' && <p className="ct-nota" role="status">{T.pedindo}</p>}
          {geo === 'ok' && <p className="ct-nota" role="status">{T.ordenado}</p>}
          {geo === 'negada' && <p className="ct-nota" role="status">{T.negada}</p>}
        </div>

        <div className="ct-catalogo__resumo">
          <p className="ct-catalogo__conta" aria-live="polite">{T.contagem(linhas.length)}</p>
          {ativos > 0 && <button type="button" className="ct-link" onClick={() => setF({ q: '', bairro: '', aberto: false, queroIr: false, jaFui: false })}>{T.limpar}</button>}
        </div>

        <div className="ct-mapa__corpo">
          {linhas.length ? (
            <ul className="ct-mapa__lista" aria-label={T.contagem(linhas.length)}>
              {linhas.map(({ u, p, dist, foi }) => {
                const titulo = M.tituloDaUnidade(p, u)
                const agora = u.combo ? M.textoEstado(M.estadoAgora(u, undefined, dados?.edicao)) : ''
                const nota = notaDoLugar(u.coordenada)
                return (
                  <li key={u.id} id={`mapa-${u.id}`} className={`ct-mapa__item${sel === u.id ? ' is-sel' : ''}${foi ? ' is-visitada' : ''}`}>
                    <button type="button" className="ct-mapa__sel" aria-pressed={sel === u.id} onClick={() => setSel(sel === u.id ? '' : u.id)}>
                      <strong>{titulo}</strong>
                      <span>{M.enderecoEmLinha(u.endereco)}</span>
                      {agora && <span className="ct-nota">{agora}</span>}
                      {dist != null && <span className="ct-nota">{T.distancia(dist, !!u.coordenada?.conferir)}</span>}
                      {nota && <span className={`ct-mapa__local${u.coordenada ? ' ct-mapa__local--aprox' : ''}`}>{nota}</span>}
                    </button>
                    <div className="ct-mapa__marcas"><QueroIr u={u} nome={titulo} /><JaFui p={p} /></div>
                    {sel === u.id && (
                      <div className="ct-acoes ct-mapa__acoes">
                        <Botao href={`${EDICAO.caminho}/participantes/${p.slug}`} navigate={navigate}>{T.verCasa}</Botao>
                        {M.linkComoChegar(u) && <Botao tipo="secundario" href={M.linkComoChegar(u)} target="_blank" rel="noopener noreferrer"><IconeCartoon nome="como-chegar" tamanho={32} />{T.comoChegar}</Botao>}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="ct-estado ct-estado--vazio">
              <IconeCartoon nome="vazio" tamanho={64} />
              <p>{T.nenhuma}</p>
              <button type="button" className="ct-botao" onClick={() => setF({ q: '', bairro: '', aberto: false, queroIr: false, jaFui: false })}>{T.limpar}</button>
            </div>
          )}
          <div className="ct-mapa__lado">
            <div className="ct-mapa__area">
              {noMapa.length === 0 ? <p className="ct-nota">{T.semMapa}</p>
                : verMapa ? (
                  <React.Suspense fallback={<p className="ct-nota" role="status">{T.carregando}</p>}>
                    <ErroDoMapa>
                      <MapaUnidades selecionada={sel} aoSelecionar={setSel} voce={posicao}
                        pontos={noMapa.map(({ u, p, quero, foi }) => ({ id: u.id, lat: u.coordenada.lat, lng: u.coordenada.lng, titulo: M.tituloDaUnidade(p, u), aproximada: !!u.coordenada.conferir, quero, foi }))} />
                    </ErroDoMapa>
                  </React.Suspense>
                ) : <button type="button" className="ct-botao" onClick={() => setVerMapa(true)}><IconeCartoon nome="mapa" tamanho={32} />{T.verMapa(noMapa.length)}</button>}
            </div>
            {verMapa && noMapa.length > 0 && (
              <ul className="ct-legenda" aria-label="Legenda do mapa">
                {Object.entries(T.legenda).filter(([k]) => k !== 'voce' || posicao).map(([k, texto]) => <li key={k}><span className={`ct-legenda__ponto ct-legenda__ponto--${k}`} aria-hidden="true" />{texto}</li>)}
              </ul>
            )}
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
