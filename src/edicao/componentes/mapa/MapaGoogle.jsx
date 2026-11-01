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

const CHAVE = import.meta.env.VITE_GOOGLE_MAPS_KEY
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'
const NATAL = { lat: -5.81, lng: -35.21 }

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
  el.className = `ct-marcador${p.pin ? ' ct-marcador--pin' : ''}`
  if (p.pin) {
    // O <span> carrega o anel (aproximado) e o selo (quero ir / já fui); o botão é do provedor do mapa.
    const caixa = document.createElement('span')
    caixa.className = 'ct-pin'
    const img = document.createElement('img')
    Object.assign(img, { src: p.pin.src, alt: '', width: 48, height: Math.round(48 * p.pin.altura / p.pin.largura) })
    caixa.append(img)
    el.append(caixa)
  }
  el.addEventListener('click', () => aoSelecionar(p.id))
  return el
}

export default function MapaGoogle ({ pontos, selecionada, aoSelecionar, voce = null }) {
  const caixa = React.useRef(null)
  const mapa = React.useRef(null)
  const libs = React.useRef(null)
  const marcadores = React.useRef(new Map())
  const marcaVoce = React.useRef(null)
  const [pronto, setPronto] = React.useState(false)
  const [erro, setErro] = React.useState(false)

  React.useEffect(() => {
    let vivo = true
    carregarGoogle()
      .then(async (g) => {
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([g.importLibrary('maps'), g.importLibrary('marker')])
        if (!vivo || !caixa.current) return
        libs.current = { AdvancedMarkerElement, LatLngBounds: g.LatLngBounds }
        mapa.current = new Map(caixa.current, {
          center: NATAL, zoom: 12, mapId: MAP_ID, gestureHandling: 'cooperative',
          streetViewControl: false, mapTypeControl: false, fullscreenControl: true, clickableIcons: false,
        })
        setPronto(true)
      })
      .catch(() => vivo && setErro(true))
    return () => {
      vivo = false
      for (const mk of marcadores.current.values()) mk.map = null
      marcadores.current.clear()
    }
  }, [])

  // Marcadores e enquadramento: só quando o CONJUNTO de unidades muda (filtro), não a cada marca.
  React.useEffect(() => {
    const m = mapa.current
    if (!pronto || !m) return
    const { AdvancedMarkerElement, LatLngBounds } = libs.current
    for (const mk of marcadores.current.values()) mk.map = null
    marcadores.current.clear()
    const limites = new LatLngBounds()
    for (const p of pontos) {
      const pos = { lat: p.lat, lng: p.lng }
      marcadores.current.set(p.id, new AdvancedMarkerElement({ map: m, position: pos, content: elementoDoPonto(p, aoSelecionar), title: p.titulo }))
      limites.extend(pos)
    }
    if (pontos.length > 1) m.fitBounds(limites, 48)
    else if (pontos.length === 1) { m.setCenter({ lat: pontos[0].lat, lng: pontos[0].lng }); m.setZoom(15) }
  }, [pronto, pontos.map((p) => p.id).join(), aoSelecionar])

  // Estado de cada marcador (aproximado, quero ir, já fui, selecionado): classe + nome.
  React.useEffect(() => {
    for (const p of pontos) {
      const el = marcadores.current.get(p.id)?.content
      if (!el) continue
      el.classList.toggle('ct-marcador--aprox', !!p.aproximada)
      el.classList.toggle('ct-marcador--quero', !!p.quero)
      el.classList.toggle('ct-marcador--foi', !!p.foi)
      el.classList.toggle('is-sel', p.id === selecionada)
      el.setAttribute('aria-label', nomeDoPonto(p))
      el.setAttribute('aria-pressed', String(p.id === selecionada))
    }
  })

  React.useEffect(() => {
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
