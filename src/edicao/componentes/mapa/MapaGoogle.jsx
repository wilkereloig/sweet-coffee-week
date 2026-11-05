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
import { pinDaCasa, pinSicredi, elementoDoGrupo } from './pin.js'
import { agruparPontos } from './agrupar.js'
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

const nomeDoPonto = (p) => [p.titulo, p.aproximada && 'ponto aproximado', p.quero && 'quero ir', p.foi && 'já fui'].filter(Boolean).join(', ')

function elementoDoPonto (p, aoSelecionar) {
  const el = document.createElement('button')
  el.type = 'button'
  if (p.sicredi) { // patrocinador: marcador próprio, fora da contagem de marcadores das casas (.ct-marcador)
    el.className = 'ct-sicredi-marcador'
    el.append(pinSicredi(p.pin))
    el.addEventListener('click', () => aoSelecionar(p.id))
    return el
  }
  el.className = `ct-marcador${p.pin ? ' ct-marcador--pin' : ''}`
  // O <span> carrega o anel (aproximado) e o selo (quero ir / já fui); o botão é do provedor do mapa.
  if (p.pin) el.append(pinDaCasa(p.pin))
  el.addEventListener('click', () => aoSelecionar(p.id))
  return el
}

// `gestos`: 'cooperativo' (padrão: ctrl/dois dedos para mover, a página rola) ou 'livre' (tela cheia: um dedo move o mapa).
// O contêiner pode mudar de tamanho (tela cheia): o mapa NÃO é recriado; o tamanho novo é avisado ao Google, com o centro mantido.
export default function MapaGoogle ({ pontos, selecionada, aoSelecionar, voce = null, aoFalhar = null, gestos = 'cooperativo' }) {
  const caixa = React.useRef(null)
  const mapa = React.useRef(null)
  const libs = React.useRef(null)
  const marcadores = React.useRef(new Map())
  const marcaVoce = React.useRef(null)
  const grupos = React.useRef([])
  const pontosAtuais = React.useRef(pontos)
  const reagrupar = React.useRef(null)
  const [pronto, setPronto] = React.useState(false)
  const [erro, setErro] = React.useState(false)
  pontosAtuais.current = pontos

  // Casas que se cobririam na tela viram um círculo com o número (agrupar.js); a escolhida e o Sicredi ficam sempre soltos.
  // Roda a cada parada do mapa (zoom/arrasto) e quando o conjunto ou a escolha mudam; só mexe em `map` dos marcadores.
  reagrupar.current = () => {
    const m = mapa.current
    if (!m || !libs.current) return
    const { AdvancedMarkerElement, LatLngBounds } = libs.current
    for (const g of grupos.current) g.map = null
    grupos.current = []
    const achados = agruparPontos(pontosAtuais.current, { zoom: m.getZoom(), base: 256, zoomPerto: ZOOM_PERTO, fixos: [selecionada] })
    const escondidos = new Set(achados.flatMap((g) => g.ids))
    for (const [id, mk] of marcadores.current) mk.map = escondidos.has(id) ? null : m
    for (const g of achados) {
      const aproximar = () => {
        const limites = new LatLngBounds()
        for (const p of g.membros) limites.extend({ lat: p.lat, lng: p.lng })
        m.fitBounds(limites, 72)
        window.google.maps.event.addListenerOnce(m, 'idle', () => { if (m.getZoom() > 17) m.setZoom(17) })
      }
      const el = elementoDoGrupo(g.ids.length, TC.grupoNome(g.ids.length), aproximar)
      grupos.current.push(new AdvancedMarkerElement({ map: m, position: { lat: g.lat, lng: g.lng }, content: el, zIndex: 1 }))
    }
  }

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
        mapa.current.addListener('idle', () => reagrupar.current?.())
        escala()
        setPronto(true)
      })
      .catch(() => { if (vivo) (aoFalhar ? aoFalhar() : setErro(true)) })
    return () => {
      vivo = false
      for (const mk of marcadores.current.values()) mk.map = null
      for (const g of grupos.current) g.map = null
      marcadores.current.clear()
      grupos.current = []
    }
  }, [])

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
    marcadores.current.clear()
    const limites = new LatLngBounds()
    // O enquadramento segue as casas; só sem nenhuma casa na tela (filtro vazio) ele vai para as agências do Sicredi.
    const casas = pontos.filter((p) => !p.sicredi)
    const alvo = casas.length ? casas : pontos
    for (const p of pontos) {
      const pos = { lat: p.lat, lng: p.lng }
      marcadores.current.set(p.id, new AdvancedMarkerElement({ map: m, position: pos, content: elementoDoPonto(p, aoSelecionar), title: p.titulo }))
    }
    for (const p of alvo) limites.extend({ lat: p.lat, lng: p.lng })
    if (alvo.length > 1) m.fitBounds(limites, 48)
    else if (alvo.length === 1) { m.setCenter({ lat: alvo[0].lat, lng: alvo[0].lng }); m.setZoom(15) }
    reagrupar.current?.()
  }, [pronto, pontos.map((p) => p.id).join(), aoSelecionar])

  // Estado de cada marcador (aproximado, quero ir, já fui, selecionado): classe + nome.
  React.useEffect(() => {
    for (const p of pontos) {
      const el = marcadores.current.get(p.id)?.content
      if (!el) continue
      if (p.sicredi) {
        el.classList.toggle('ct-sicredi-marcador--aprox', !!p.aproximada)
        el.classList.toggle('is-sel', p.id === selecionada)
        el.setAttribute('aria-label', TC.sicrediNomeMarcador(p.titulo, !!p.aproximada))
        el.setAttribute('aria-pressed', String(p.id === selecionada))
        continue
      }
      el.classList.toggle('ct-marcador--aprox', !!p.aproximada)
      el.classList.toggle('ct-marcador--quero', !!p.quero)
      el.classList.toggle('ct-marcador--foi', !!p.foi)
      el.classList.toggle('is-sel', p.id === selecionada)
      el.setAttribute('aria-label', nomeDoPonto(p))
      el.setAttribute('aria-pressed', String(p.id === selecionada))
    }
  })

  React.useEffect(() => {
    reagrupar.current?.() // a casa escolhida sai do grupo (e a anterior pode voltar a ele)
    const mk = marcadores.current.get(selecionada)
    if (mk && mapa.current) {
      mapa.current.panTo(mk.position)
      if (mapa.current.getZoom() < 14) mapa.current.setZoom(14)
    }
  }, [selecionada, pronto])

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

  if (erro) return <p className="ct-nota" role="alert">O mapa não carregou. A lista tem todas as unidades.</p>
  return <div ref={caixa} className="ct-mapa__mapa" role="region" aria-label="Mapa das unidades (a lista tem as mesmas informações)" />
}
