/*
 * Mapa (§6.1): a LISTA de unidades vem primeiro e funciona sozinha. O mapa
 * interativo carrega sob demanda (MapaUnidades) e, se falhar, a lista segue.
 * Entram no mapa só unidades com coordenada conferida pela organização.
 * Localização do visitante só por botão; ordena por distância em linha reta,
 * dita assim. A posição não sai do navegador.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import * as M from '../../dados/modelo.js'
import { Link, AvisoDesatualizado, AvisoDemo } from '../../componentes/base.jsx'
import { useRota } from '../contexto.js'
import { CENA_TEXTO } from '../textos.js'

const MapaUnidades = React.lazy(() => import('../../componentes/mapa/MapaUnidades.jsx'))

function km (a, b) {
  const R = 6371; const r = (x) => (x * Math.PI) / 180
  const dLat = r(b.lat - a.lat); const dLng = r(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function Mapa ({ navigate, dados }) {
  const rota = useRota()
  const [f, setF] = React.useState(() => M.filtrosDaBusca(location.search))
  const [sel, setSel] = React.useState(() => new URLSearchParams(location.search).get('unidade') || '')
  const [posicao, setPosicao] = React.useState(null)
  const [geo, setGeo] = React.useState(typeof navigator !== 'undefined' && 'geolocation' in navigator ? 'disponivel' : 'indisponivel')
  const [verMapa, setVerMapa] = React.useState(false)
  const lista = dados?.participantes || []
  const filtrados = M.filtrar(lista, f)
  const encerrada = dados?.fase === 'encerrada'

  const unidades = filtrados.flatMap((p) => (p.unidades || []).map((u) => ({ u, p })))
    .map((x) => ({ ...x, dist: posicao && x.u.coordenada ? km(posicao, x.u.coordenada) : null }))
    .sort((a, b) => (posicao ? (a.dist ?? 1e9) - (b.dist ?? 1e9) : 0) || (a.u.endereco?.bairro || '').localeCompare(b.u.endereco?.bairro || '', 'pt-BR'))
  const noMapa = unidades.filter((x) => x.u.coordenada)

  React.useEffect(() => {
    const q = new URLSearchParams(location.search)
    if (sel) q.set('unidade', sel); else q.delete('unidade')
    const s = q.toString()
    history.replaceState(history.state, '', location.pathname + (s ? `?${s}` : ''))
    if (sel) document.getElementById(`mapa-${sel}`)?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  const localizar = () => {
    setGeo('pedindo')
    navigator.geolocation.getCurrentPosition(
      (p) => { setPosicao({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeo('ok') },
      () => setGeo('negada'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }

  if (encerrada) {
    return (
      <section className="ct-bloco">
        <h1 className="ct-h1">{CENA_TEXTO.mapa.titulo}</h1>
        <p className="ct-lead">A edição terminou. As casas seguem no catálogo como registro.</p>
        <Link className="ct-botao" href={`${EDICAO.caminho}/participantes`} navigate={navigate}>Ver as casas</Link>
      </section>
    )
  }

  return (
    <section className="ct-bloco ct-mapa" aria-labelledby="mapa-titulo">
      <AvisoDesatualizado ativo={dados?.desatualizado} />
      <AvisoDemo ativo={dados?.demo} />
      <h1 id="mapa-titulo" className="ct-h1">{CENA_TEXTO.mapa.titulo}</h1>
      {!dados?.participantes_publicos || !lista.length ? <p className="ct-lead">O elenco desta edição será revelado em breve.</p> : (
        <>
          <div className="ct-filtros">
            <label className="ct-campo ct-campo--busca"><span className="ct-sr">Buscar casa ou bairro</span>
              <input type="search" value={f.q} placeholder="Buscar casa ou bairro" onChange={(e) => setF({ ...f, q: e.target.value })} /></label>
            {M.opcoesFiltro(lista).modos.map((k) => (
              <button key={k} type="button" className="ct-chip" aria-pressed={f.modo === k} onClick={() => setF({ ...f, modo: f.modo === k ? '' : k })}>
                {M.MODOS.find(([m]) => m === k)[1]}
              </button>
            ))}
            {geo === 'disponivel' && <button type="button" className="ct-botao ct-botao--contorno" onClick={localizar}>Usar minha localização</button>}
            {geo === 'pedindo' && <p className="ct-nota" role="status">Pedindo sua localização…</p>}
            {geo === 'ok' && <p className="ct-nota" role="status">Ordenado pela distância em linha reta até você.</p>}
            {geo === 'negada' && <p className="ct-nota" role="status">Sem acesso à localização. A lista segue por bairro.</p>}
          </div>
          <div className="ct-mapa__corpo">
            <ul className="ct-mapa__lista" aria-label={`${unidades.length} unidades`}>
              {unidades.map(({ u, p, dist }) => {
                const titulo = `${p.casa.nome}${u.nome ? ` · ${u.nome}` : ''}`
                return (
                  <li key={u.id} id={`mapa-${u.id}`} className={`ct-mapa__item${sel === u.id ? ' is-sel' : ''}`}>
                    <button type="button" className="ct-mapa__sel" aria-pressed={sel === u.id} onClick={() => setSel(sel === u.id ? '' : u.id)}>
                      <strong>{titulo}</strong>
                      <span>{M.enderecoEmLinha(u.endereco)}</span>
                      {u.combo && M.textoEstado(M.estadoAgora(u, undefined, dados?.edicao)) && <span className="ct-nota">{M.textoEstado(M.estadoAgora(u, undefined, dados?.edicao))}</span>}
                      {dist != null && <span className="ct-nota">{dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1).replace('.', ',')} km`} em linha reta</span>}
                      {!u.coordenada && <span className="ct-nota">Localização no mapa em conferência.</span>}
                    </button>
                    {sel === u.id && (
                      <div className="ct-acoes">
                        <Link className="ct-botao" href={`${EDICAO.caminho}/participantes/${p.slug}`} navigate={navigate}>Ver a casa</Link>
                        <a className="ct-botao ct-botao--contorno" href={M.linkComoChegar(u)} target="_blank" rel="noopener noreferrer">Como chegar</a>
                        <button type="button" className="ct-botao ct-botao--contorno" aria-pressed={rota.tem(u.id)}
                          onClick={() => (rota.tem(u.id) ? rota.remover(u.id, titulo) : rota.adicionar(u.id, titulo))}>
                          {rota.tem(u.id) ? 'Na sua rota' : 'Adicionar à Minha rota'}
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className="ct-mapa__area">
              {noMapa.length === 0 ? <p className="ct-nota">As localizações no mapa estão em conferência. Use a lista.</p>
                : verMapa ? (
                  <React.Suspense fallback={<p className="ct-nota" role="status">Carregando o mapa…</p>}>
                    <ErroDoMapa>
                      <MapaUnidades pontos={noMapa.map(({ u, p }) => ({ id: u.id, lat: u.coordenada.lat, lng: u.coordenada.lng, titulo: `${p.casa.nome}${u.nome ? ` · ${u.nome}` : ''}` }))}
                        selecionada={sel} aoSelecionar={setSel} />
                    </ErroDoMapa>
                  </React.Suspense>
                ) : <button type="button" className="ct-botao" onClick={() => setVerMapa(true)}>Ver no mapa ({noMapa.length})</button>}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

class ErroDoMapa extends React.Component {
  constructor (p) { super(p); this.state = { erro: false } }
  static getDerivedStateFromError () { return { erro: true } }
  render () { return this.state.erro ? <p className="ct-nota" role="alert">O mapa não carregou. A lista ao lado tem todas as unidades.</p> : this.props.children }
}
