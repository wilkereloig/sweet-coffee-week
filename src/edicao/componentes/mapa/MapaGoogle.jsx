/*
 * Mapa das unidades no Google Maps (D-03 revisto em 31/10/2026: Wilker pediu o mapa do Google).
 * Mesma interface do MapaUnidades (MapLibre), que segue como reserva quando falta a chave:
 * { pontos, selecionada, aoSelecionar, voce }. Cada ponto pode trazer `pin` (o pin desenhado do tema
 * da casa, imageLibrary → pinEdicao); sem ele, o marcador da edição em CSS.
 *
 * Chave: VITE_GOOGLE_MAPS_KEY (e o Map ID em VITE_GOOGLE_MAPS_MAP_ID; sem ele, DEMO_MAP_ID). Nunca vai para o
 * console (defeito herdado do MapaGoogle antigo, docs/cartoon-2026-2/06 §6.1). Marcadores avançados
 * (AdvancedMarkerElement) com um <button> nomeado dentro: a seleção sincroniza com a lista, como no outro mapa.
 */
import React from 'react'
import { pinDaCasa, pinSicredi, atualizarPin, marcarRota, fioDoPin, aplicarAfastamento, seloDoGrupo } from './pin.js'
import { partesDoNome } from './indicadores.js'
import { planejarNoMapa } from './afastar.js'
import { MAPA_CACA as TC } from '../../caca/mapa/textos.js'

const CHAVE = import.meta.env.VITE_GOOGLE_MAPS_KEY
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'
// Chave recusada (domínio fora da lista, cota, faturamento): o Google não rejeita o script — chama este global.
// Quem estiver na tela troca para o mapa reserva (MapLibre) em vez de mostrar o aviso de erro do Google.
let avisarFalha = null
if (typeof window !== 'undefined') window.gm_authFailure = () => avisarFalha?.()
const NATAL = { lat: -5.81, lng: -35.21 }
const ZOOM_PERTO = 13 // abaixo disso o mapa mostra a cidade toda: pins pequenos (16-mapa-tela.css, .ct-mapa__mapa--longe)

let carregando = null
/** Carregador oficial "inline bootstrap" do Google, sem dependência: um <script> só, carregado uma vez. */
function carregarGoogle () {
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps)
  carregando ??= new Promise((resolve, reject) => {
    const cb = `__ctMapa${Date.now()}`
    window[cb] = () => { delete window[cb]; resolve(window.google.maps) }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key: CHAVE, v: 'weekly', loading: 'async', language: 'pt-BR', region: 'BR', callback: cb })}`
    s.async = true
    s.onerror = () => { carregando = null; reject(new Error('google-maps')) }
    document.head.append(s)
  })
  return carregando
}

const nomeDoPonto = (p) => [p.titulo, p.aproximada && 'ponto aproximado', p.quero && 'quero ir', p.foi && 'já fui', ...partesDoNome(p.pin)].filter(Boolean).join(', ')

/**
 * O Google NÃO aceita filho focável (<button>) dentro de AdvancedMarkerElement: o invólucro engole o clique do botão. O marcador é que é o
 * botão (`gmpClickable`: o Google o torna focável, com Enter/Espaço) e o clique vem por `gmp-click`/`click` do PRÓPRIO marcador; o conteúdo de
 * pin e de agência é só desenho (<span>), e nome e "pressionado" vão no marcador. `tocar` já deve ser `umaVez`: os dois eventos podem chegar juntos.
 */
const umaVez = (fazer) => { let ultimo = 0; return () => { const agora = performance.now(); if (agora - ultimo < 400) return; ultimo = agora; fazer() } }
function marcadorClicavel (Marcador, opcoes, tocar) {
  const mk = new Marcador({ ...opcoes, gmpClickable: true })
  mk.addListener('click', tocar)
  mk.addEventListener('gmp-click', tocar)
  return mk
}

function elementoDoPonto (p) {
  const el = document.createElement('span')
  if (p.sicredi) { // patrocinador: marcador próprio, fora da contagem de marcadores das casas (.ct-marcador)
    el.className = 'ct-sicredi-marcador'
    el.append(pinSicredi(p.pin))
    return el
  }
  el.className = `ct-marcador${p.pin ? ' ct-marcador--pin' : ''}`
  // O <span> carrega o anel (aproximado) e o selo (quero ir / já fui); o botão é o marcador do provedor do mapa.
  if (p.pin) el.append(pinDaCasa(p.pin))
  return el
}

// `gestos`: 'cooperativo' (padrão: ctrl/dois dedos para mover, a página rola) ou 'livre' (tela cheia: um dedo move o mapa).
// O contêiner pode mudar de tamanho (tela cheia): o mapa NÃO é recriado; o tamanho novo é avisado ao Google, com o centro mantido.
export default function MapaGoogle ({ pontos, selecionada, aoSelecionar, voce = null, circulo = null, foco = null, aoFalhar = null, gestos = 'cooperativo' }) {
  const caixa = React.useRef(null)
  const mapa = React.useRef(null)
  const libs = React.useRef(null)
  const marcadores = React.useRef(new Map())
  const marcaVoce = React.useRef(null)
  const fios = React.useRef(new Map()) // id → marcador do fio + bolinha do ponto verdadeiro (afastar.js)
  const selos = React.useRef([]) // selos de contagem dos grupos grandes (zoom longe)
  const feito = React.useRef('') // zoom + escolha + pontos do último afastamento: o 'idle' do Google vem a cada arrasto, e só o zoom muda o desenho
  const pontosRef = React.useRef(pontos)
  const selecionadaRef = React.useRef(selecionada)
  pontosRef.current = pontos
  selecionadaRef.current = selecionada
  const [pronto, setPronto] = React.useState(false)
  const [erro, setErro] = React.useState(false)

  // Pins que se cobrem no zoom de agora: afasta com fio, ou vira selo se forem demais.
  const reorganizar = React.useCallback((forcar = false) => {
    const m = mapa.current
    if (!m || !libs.current) return
    const pts = pontosRef.current.filter((p) => marcadores.current.has(p.id))
    const zoom = m.getZoom() ?? 12
    const chave = `${zoom.toFixed(2)}|${selecionadaRef.current}|${pts.map((p) => p.id).join()}`
    if (!forcar && chave === feito.current) return
    feito.current = chave
    const plano = planejarNoMapa(pts, { zoom, tile: 256, zoomPerto: ZOOM_PERTO, selecionada: selecionadaRef.current })
    aplicarAfastamento(plano, pts, { elemento: (id) => marcadores.current.get(id)?.content, fio: (id) => fios.current.get(id)?.content })
    for (const s of selos.current) s.map = null
    selos.current = plano.grupos.map((g) => {
      const membros = pts.filter((p) => g.ids.includes(p.id))
      const el = seloDoGrupo(membros.length, TC.grupoSelo(membros.length))
      el.tabIndex = -1 // o marcador (gmpClickable) é o botão; o <button> do selo é só desenho aqui
      const aproximar = umaVez(() => {
        const caixa = new libs.current.LatLngBounds()
        for (const p of membros) caixa.extend({ lat: p.lat, lng: p.lng })
        const antes = m.getZoom() ?? 12
        m.fitBounds(caixa, 96)
        // Grupo que já cabe na tela (uma corrente de pins encostados) não ganha zoom do fitBounds: o selo sempre aproxima ao menos 2 níveis.
        const espera = window.google.maps.event.addListenerOnce(m, 'idle', () => {
          if ((m.getZoom() ?? antes) <= antes + 0.01) m.setZoom(Math.min(16, antes + 2))
          else if (m.getZoom() > 16) m.setZoom(16)
        })
        // Sem movimento de câmera não há 'idle': o ouvinte não pode ficar pendente e disparar num arrasto de muito depois.
        setTimeout(() => espera.remove(), 2000)
      })
      const lat = membros.reduce((t, p) => t + p.lat, 0) / membros.length
      const lng = membros.reduce((t, p) => t + p.lng, 0) / membros.length
      return marcadorClicavel(libs.current.AdvancedMarkerElement, { map: m, position: { lat, lng }, content: el, zIndex: 20 }, aproximar)
    })
  }, [])

  React.useEffect(() => {
    let vivo = true
    avisarFalha = aoFalhar
    carregarGoogle()
      .then(async (g) => {
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([g.importLibrary('maps'), g.importLibrary('marker')])
        if (!vivo || !caixa.current) return
        libs.current = { AdvancedMarkerElement, LatLngBounds: g.LatLngBounds }
        mapa.current = new Map(caixa.current, {
          center: NATAL, zoom: 12, mapId: MAP_ID, gestureHandling: 'cooperative',
          streetViewControl: false, mapTypeControl: false, fullscreenControl: false, clickableIcons: false, // a tela cheia é a da página (mesma seleção, filtros e cartão), não a do Google
          controlSize: 44, // zoom, tela cheia e câmera do Google com alvo de toque de 44 px (o padrão é 40)
        })
        // Escala por zoom: de longe os pins encolhem (a cidade inteira cabe sem um cobrir o outro); de perto voltam ao tamanho cheio.
        const escala = () => caixa.current?.classList.toggle('ct-mapa__mapa--longe', (mapa.current?.getZoom() ?? 12) < ZOOM_PERTO)
        mapa.current.addListener('zoom_changed', escala)
        mapa.current.addListener('idle', () => reorganizar()) // o Google só assenta o zoom aqui; arrastar repete a conta sem mudar nada (a chave de `feito` corta)
        escala()
        setPronto(true)
      })
      .catch(() => { if (vivo) (aoFalhar ? aoFalhar() : setErro(true)) })
    return () => {
      vivo = false
      for (const mk of marcadores.current.values()) mk.map = null
      for (const mk of fios.current.values()) mk.map = null
      for (const mk of selos.current) mk.map = null
      marcadores.current.clear(); fios.current.clear(); selos.current = []
    }
  }, [reorganizar])

  React.useEffect(() => {
    mapa.current?.setOptions({ gestureHandling: gestos === 'livre' ? 'greedy' : 'cooperative' })
  }, [gestos, pronto])

  // Tela cheia (ou qualquer mudança do contêiner): avisa o Google e devolve o centro de antes.
  React.useEffect(() => {
    const m = mapa.current
    if (!pronto || !m || !caixa.current || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => {
      const centro = m.getCenter()
      window.google?.maps?.event?.trigger(m, 'resize')
      if (centro) m.setCenter(centro)
    })
    ro.observe(caixa.current)
    return () => ro.disconnect()
  }, [pronto])

  // Marcadores e enquadramento: só quando o CONJUNTO de unidades muda (filtro), não a cada marca.
  React.useEffect(() => {
    const m = mapa.current
    if (!pronto || !m) return
    const { AdvancedMarkerElement, LatLngBounds } = libs.current
    for (const mk of marcadores.current.values()) mk.map = null
    for (const mk of fios.current.values()) mk.map = null
    for (const mk of selos.current) mk.map = null
    marcadores.current.clear(); fios.current.clear(); selos.current = []
    const limites = new LatLngBounds()
    // O enquadramento segue as casas; só sem nenhuma casa na tela (filtro vazio) ele vai para as agências do Sicredi.
    const casas = pontos.filter((p) => !p.sicredi)
    const alvo = casas.length ? casas : pontos
    // Fio abaixo (zIndex 1) de todos os pins (10): ele sai da ponta do pin e não pode passar por cima de nenhum.
    for (const p of pontos) fios.current.set(p.id, new AdvancedMarkerElement({ map: m, position: { lat: p.lat, lng: p.lng }, content: fioDoPin(), zIndex: 1 }))
    for (const p of pontos) {
      const pos = { lat: p.lat, lng: p.lng }
      marcadores.current.set(p.id, marcadorClicavel(AdvancedMarkerElement, { map: m, position: pos, content: elementoDoPonto(p), title: p.titulo, zIndex: 10 }, umaVez(() => aoSelecionar(p.id))))
    }
    for (const p of alvo) limites.extend({ lat: p.lat, lng: p.lng })
    if (alvo.length > 1) m.fitBounds(limites, 48)
    else if (alvo.length === 1) { m.setCenter({ lat: alvo[0].lat, lng: alvo[0].lng }); m.setZoom(15) }
    reorganizar(true)
  }, [pronto, pontos.map((p) => p.id).join(), aoSelecionar, reorganizar])

  // "Perto de mim": enquadra a pessoa e as casas mais perto dela. Roda a cada toque (foco.n) e quando o mapa passa a existir.
  React.useEffect(() => {
    const m = mapa.current
    if (!foco?.pontos?.length || !pronto || !m) return
    const caixa = new libs.current.LatLngBounds()
    for (const q of foco.pontos) caixa.extend({ lat: q.lat, lng: q.lng })
    m.fitBounds(caixa, 72)
    window.google.maps.event.addListenerOnce(m, 'idle', () => { if ((m.getZoom() ?? 0) > 17) m.setZoom(17) })
  }, [foco?.n, pronto]) // eslint-disable-line react-hooks/exhaustive-deps -- só no toque

  // Estado de cada marcador (aproximado, quero ir, já fui, selecionado): classe + nome.
  React.useEffect(() => {
    for (const p of pontos) {
      const mk = marcadores.current.get(p.id)
      const el = mk?.content
      if (!el) continue
      mk.setAttribute('aria-pressed', String(p.id === selecionada)) // o marcador é o botão (gmpClickable): nome e estado ficam nele
      if (p.sicredi) {
        el.classList.toggle('ct-sicredi-marcador--aprox', !!p.aproximada)
        el.classList.toggle('is-sel', p.id === selecionada)
        mk.setAttribute('aria-label', TC.sicrediNomeMarcador(p.titulo, !!p.aproximada))
        continue
      }
      if (p.pin) { atualizarPin(el.firstElementChild, p.pin); marcarRota(el.firstElementChild, p.foi ? 'foi' : p.quero ? 'quero' : null) } // carimbo novo: a logo passa de P&B a colorida sem refazer o marcador
      el.classList.toggle('ct-marcador--aprox', !!p.aproximada)
      el.classList.toggle('ct-marcador--quero', !!p.quero)
      el.classList.toggle('ct-marcador--foi', !!p.foi)
      el.classList.toggle('is-sel', p.id === selecionada)
      el.classList.toggle('ct-marcador--perto', !!p.perto) // as casas da lista do Perto de mim: anel e número de ordem (data-perto)
      if (p.perto) el.dataset.perto = String(p.perto); else delete el.dataset.perto
      mk.setAttribute('aria-label', nomeDoPonto(p))
    }
  })

  React.useEffect(() => {
    const mk = marcadores.current.get(selecionada)
    if (mk && mapa.current) {
      mapa.current.panTo(mk.position)
      if (mapa.current.getZoom() < 14) mapa.current.setZoom(14)
    }
    reorganizar() // o pin escolhido não pode ficar escondido num selo
  }, [selecionada, pronto, reorganizar])

  // "Perto de mim": a posição do visitante só vira um ponto no mapa dele; não sai do navegador.
  React.useEffect(() => {
    if (marcaVoce.current) marcaVoce.current.map = null
    marcaVoce.current = null
    if (!voce || !pronto || !mapa.current) return
    const el = document.createElement('span')
    el.className = 'ct-marcador ct-marcador--voce'
    el.setAttribute('role', 'img')
    el.setAttribute('aria-label', 'Você está aqui')
    marcaVoce.current = new libs.current.AdvancedMarkerElement({ map: mapa.current, position: { lat: voce.lat, lng: voce.lng }, content: el })
  }, [voce?.lat, voce?.lng, pronto])

  // Círculo discreto ao redor da pessoa (`circulo`: { lat, lng, raioKm }). Só enquadra visualmente: nunca decide quais casas entram na lista.
  const aro = React.useRef(null)
  React.useEffect(() => {
    aro.current?.setMap(null)
    aro.current = null
    if (!circulo || !pronto || !mapa.current) return undefined
    aro.current = new window.google.maps.Circle({
      map: mapa.current, center: { lat: circulo.lat, lng: circulo.lng }, radius: circulo.raioKm * 1000, clickable: false,
      strokeColor: '#3D1308', strokeOpacity: 0.45, strokeWeight: 1.5, fillColor: '#3D1308', fillOpacity: 0.05,
    })
    return () => { aro.current?.setMap(null); aro.current = null }
  }, [circulo?.lat, circulo?.lng, circulo?.raioKm, pronto])

  if (erro) return <p className="ct-nota" role="alert">O mapa não carregou. A lista tem todas as unidades.</p>
  return <div ref={caixa} className="ct-mapa__mapa" role="region" aria-label="Mapa das unidades (a lista tem as mesmas informações)" />
}
