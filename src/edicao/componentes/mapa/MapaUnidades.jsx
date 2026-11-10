/*
 * Mapa interativo das unidades — carregado sob demanda (React.lazy em Mapa.jsx).
 *
 * Provedor (D-03, conferido em 14/10/2026): OpenFreeMap — "completely free",
 * uso comercial permitido, sem chave nem cadastro, sem limite de visualização;
 * tiles vetoriais, por isso MapLibre GL (o servidor público do OpenStreetMap é
 * "best-effort" e avisa que serviço comercial pode perder o acesso).
 * Trocar de provedor = trocar ESTILO abaixo; as páginas só conhecem a interface
 * { pontos, selecionada, aoSelecionar, voce }.
 *
 * Acessibilidade: o mapa é complementar — toda função existe na lista ao lado.
 * Cada marcador é um <button> com nome; a seleção sincroniza com a lista.
 * Ponto aproximado (`aproximada`: coordenada "a conferir" do retrato) tem marcador próprio e diz isso no nome:
 * nunca se passa por localização exata. "Quero ir" / "Já fui" mudam o marcador sem refazer o enquadramento.
 */
import React from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { pinDaCasa, pinSicredi, atualizarPin, marcarRota, fioDoPin, aplicarAfastamento, seloDoGrupo } from './pin.js'
import { partesDoNome } from './indicadores.js'
import { planejarNoMapa } from './afastar.js'
import { poligonoCirculo } from './circulo.js'
import { MAPA_CACA as TC } from '../../caca/mapa/textos.js'

const ESTILO = 'https://tiles.openfreemap.org/styles/liberty'
const NATAL = [-35.21, -5.81]
const ZOOM_PERTO = 13.5 // abaixo disso o mapa mostra a cidade toda: pins pequenos (16-mapa-tela.css, .ct-mapa__mapa--longe)

const nomeDoPonto = (p) => [p.titulo, p.aproximada && 'ponto aproximado', p.quero && 'quero ir', p.foi && 'já fui', ...partesDoNome(p.pin)].filter(Boolean).join(', ')

// `gestos`: 'cooperativo' (padrão: um dedo rola a página, dois movem o mapa) ou 'livre' (tela cheia: não há página para rolar,
// um dedo move o mapa). O contêiner pode mudar de tamanho (tela cheia): o MapLibre acompanha sozinho (trackResize) e
// mantém centro e zoom — o mapa não é recriado ao entrar e sair da tela cheia.
export default function MapaUnidades ({ pontos, selecionada, aoSelecionar, voce = null, circulo = null, foco = null, gestos = 'cooperativo' }) {
  const caixa = React.useRef(null)
  const mapa = React.useRef(null)
  const marcadores = React.useRef(new Map())
  const marcaVoce = React.useRef(null)
  const fios = React.useRef(new Map()) // id → marcador do fio + bolinha do ponto verdadeiro (afastar.js)
  const selos = React.useRef([]) // selos de contagem dos grupos grandes (zoom longe)
  const pontosRef = React.useRef(pontos)
  const selecionadaRef = React.useRef(selecionada)
  pontosRef.current = pontos
  selecionadaRef.current = selecionada
  const [erro, setErro] = React.useState(false)

  // Pins que se cobrem no zoom de agora: afasta com fio, ou vira selo se forem demais. Só depende do zoom (arrastar não muda nada).
  const reorganizar = React.useCallback(() => {
    const m = mapa.current
    if (!m) return
    const pts = pontosRef.current.filter((p) => marcadores.current.has(p.id))
    const plano = planejarNoMapa(pts, { zoom: m.getZoom(), tile: 512, zoomPerto: ZOOM_PERTO, selecionada: selecionadaRef.current })
    aplicarAfastamento(plano, pts, { elemento: (id) => marcadores.current.get(id)?.getElement(), fio: (id) => fios.current.get(id)?.getElement() })
    for (const s of selos.current) s.remove()
    selos.current = plano.grupos.map((g) => {
      const membros = pts.filter((p) => g.ids.includes(p.id))
      const el = seloDoGrupo(membros.length, TC.grupoSelo(membros.length))
      el.addEventListener('click', () => {
        const caixa = new maplibregl.LngLatBounds()
        for (const p of membros) caixa.extend([p.lng, p.lat])
        // Grupo que já cabe na tela (uma corrente de pins encostados) não ganha zoom do fitBounds: o selo sempre aproxima ao menos 2 níveis.
        const cam = m.cameraForBounds(caixa, { padding: 96, maxZoom: 16 })
        m.easeTo({ center: cam?.center ?? caixa.getCenter(), zoom: Math.min(16, Math.max(cam?.zoom ?? 0, m.getZoom() + 2)), duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400 })
      })
      const lng = membros.reduce((t, p) => t + p.lng, 0) / membros.length
      const lat = membros.reduce((t, p) => t + p.lat, 0) / membros.length
      return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(m)
    })
  }, [])

  React.useEffect(() => {
    let m
    try {
      m = new maplibregl.Map({ container: caixa.current, style: ESTILO, center: NATAL, zoom: 11.5, attributionControl: { compact: false }, cooperativeGestures: true })
    } catch { setErro(true); return undefined }
    mapa.current = m
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    // Escala por zoom: de longe, os pins encolhem (a cidade inteira cabe sem um cobrir o outro); de perto voltam ao tamanho cheio.
    const escala = () => caixa.current?.classList.toggle('ct-mapa__mapa--longe', m.getZoom() < ZOOM_PERTO)
    m.on('zoom', escala)
    escala()
    m.on('zoomend', reorganizar)
    m.on('error', (e) => { if (e?.error?.status >= 400 || /style/i.test(String(e?.error?.message || ''))) setErro(true) })
    return () => { m.remove(); mapa.current = null; marcadores.current.clear(); fios.current.clear(); selos.current = []; marcaVoce.current = null }
  }, [reorganizar])

  React.useEffect(() => {
    const c = mapa.current?.cooperativeGestures
    if (!c) return
    if (gestos === 'livre') c.disable()
    else c.enable()
  }, [gestos])

  // Marcadores e enquadramento: só quando o CONJUNTO de unidades muda (filtro), não a cada marca.
  React.useEffect(() => {
    const m = mapa.current
    if (!m) return
    for (const mk of marcadores.current.values()) mk.remove()
    for (const mk of fios.current.values()) mk.remove()
    for (const mk of selos.current) mk.remove()
    marcadores.current.clear(); fios.current.clear(); selos.current = []
    const limites = new maplibregl.LngLatBounds()
    // O enquadramento segue as casas; só sem nenhuma casa na tela (filtro vazio) ele vai para as agências do Sicredi.
    const alvo = pontos.some((p) => !p.sicredi) ? pontos.filter((p) => !p.sicredi) : pontos
    // Os fios entram ANTES dos pins: no DOM, quem vem depois fica por cima, e o fio tem que passar por baixo de todos os pins.
    for (const p of pontos) fios.current.set(p.id, new maplibregl.Marker({ element: fioDoPin(), anchor: 'center' }).setLngLat([p.lng, p.lat]).addTo(m))
    // Do norte para o sul: no DOM quem vem depois fica na frente, então o pin mais ao sul cobre no máximo a cauda do vizinho de cima (afastar.js › MIOLO).
    for (const p of [...pontos].sort((a, b) => b.lat - a.lat || (a.id < b.id ? -1 : 1))) {
      const el = document.createElement('button')
      el.type = 'button'
      if (p.sicredi) { // patrocinador: marcador próprio, fora da contagem de marcadores das casas (.ct-marcador)
        el.className = 'ct-sicredi-marcador'
        el.append(pinSicredi(p.pin, p.promocao, { retirada: p.retirada }))
        el.addEventListener('click', () => aoSelecionar(p.id))
        marcadores.current.set(p.id, new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(m))
        continue
      }
      if (p.pin) {
        // O <span> carrega o anel (aproximado) e o selo (quero ir / já fui): o MapLibre posiciona o botão.
        el.append(pinDaCasa(p.pin))
        el.classList.add('ct-marcador--pin')
      }
      el.addEventListener('click', () => aoSelecionar(p.id))
      const mk = new maplibregl.Marker({ element: el, anchor: p.pin ? 'bottom' : 'center' }).setLngLat([p.lng, p.lat]).addTo(m)
      marcadores.current.set(p.id, mk)
    }
    for (const p of alvo) limites.extend([p.lng, p.lat])
    if (alvo.length > 1) {
      m.fitBounds(limites, { padding: 48, maxZoom: 15, duration: 0 })
      // Mesmo zoom mínimo de abertura do Google (12 com tile 256 = 11 no MapLibre, tile 512), no miolo das casas (mediana).
      if (m.getZoom() < 11) {
        const mediana = (v) => { const o = [...v].sort((a, b) => a - b); return o[Math.floor(o.length / 2)] }
        m.jumpTo({ center: [mediana(alvo.map((p) => p.lng)), mediana(alvo.map((p) => p.lat))], zoom: 11 })
      }
    } else if (alvo.length === 1) m.jumpTo({ center: [alvo[0].lng, alvo[0].lat], zoom: 15 })
    reorganizar()
  }, [pontos.map((p) => p.id).join(), aoSelecionar, reorganizar])

  // "Perto de mim": enquadra a pessoa e as casas mais perto dela. Roda a cada toque (foco.n) e quando o mapa passa a existir.
  React.useEffect(() => {
    const m = mapa.current
    if (!foco?.pontos?.length || !m) return
    const caixa = new maplibregl.LngLatBounds()
    for (const q of foco.pontos) caixa.extend([q.lng, q.lat])
    m.fitBounds(caixa, { padding: 72, maxZoom: 16, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500 })
  }, [foco?.n]) // eslint-disable-line react-hooks/exhaustive-deps -- só no toque

  // Estado de cada marcador (aproximado, quero ir, já fui, selecionado): classe + nome. classList, não
  // className: o MapLibre põe as classes de posicionamento dele no mesmo elemento.
  React.useEffect(() => {
    for (const p of pontos) {
      const el = marcadores.current.get(p.id)?.getElement()
      if (!el) continue
      if (p.sicredi) {
        el.classList.toggle('ct-sicredi-marcador--aprox', !!p.aproximada)
        el.classList.toggle('ct-sicredi-marcador--promocao', !!p.promocao)
        el.classList.toggle('is-sel', p.id === selecionada)
        el.setAttribute('aria-label', [p.nomeMarcador || TC.sicrediNomeMarcador(p.titulo, !!p.aproximada), p.promocao].filter(Boolean).join('. ')) // apoiador traz o próprio nome (apoio.js)
        el.setAttribute('aria-pressed', String(p.id === selecionada))
        continue
      }
      el.classList.add('ct-marcador')
      if (p.pin) { atualizarPin(el.firstElementChild, p.pin); marcarRota(el.firstElementChild, p.foi ? 'foi' : p.quero ? 'quero' : null) } // carimbo novo: a logo passa de P&B a colorida sem refazer o marcador
      el.classList.toggle('ct-marcador--aprox', !!p.aproximada)
      el.classList.toggle('ct-marcador--quero', !!p.quero)
      el.classList.toggle('ct-marcador--foi', !!p.foi)
      el.classList.toggle('is-sel', p.id === selecionada)
      el.classList.toggle('ct-marcador--perto', !!p.perto) // as casas da lista do Perto de mim: anel e número de ordem (data-perto)
      if (p.perto) el.dataset.perto = String(p.perto); else delete el.dataset.perto
      el.setAttribute('aria-label', nomeDoPonto(p))
      el.setAttribute('aria-pressed', String(p.id === selecionada))
    }
  })

  React.useEffect(() => {
    const mk = marcadores.current.get(selecionada)
    if (mk && mapa.current) {
      const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches
      mapa.current.easeTo({ center: mk.getLngLat(), zoom: Math.max(mapa.current.getZoom(), 14), duration: reduzir ? 0 : 400 })
    }
    reorganizar() // o pin escolhido não pode ficar escondido num selo
  }, [selecionada, reorganizar])

  // "Perto de mim": a posição do visitante só vira um ponto no mapa dele; não sai do navegador.
  React.useEffect(() => {
    marcaVoce.current?.remove()
    marcaVoce.current = null
    if (!voce || !mapa.current) return
    const el = document.createElement('span')
    el.className = 'ct-marcador ct-marcador--voce'
    el.setAttribute('role', 'img')
    el.setAttribute('aria-label', 'Você está aqui')
    marcaVoce.current = new maplibregl.Marker({ element: el }).setLngLat([voce.lng, voce.lat]).addTo(mapa.current)
  }, [voce?.lat, voce?.lng])

  // Círculo discreto ao redor da pessoa (`circulo`: { lat, lng, raioKm }). Só enquadra visualmente: nunca decide quais casas entram na lista.
  React.useEffect(() => {
    const m = mapa.current
    if (!m) return undefined
    const pinta = () => {
      if (m.getLayer('perto-linha')) m.removeLayer('perto-linha')
      if (m.getLayer('perto-fundo')) m.removeLayer('perto-fundo')
      if (m.getSource('perto-circulo')) m.removeSource('perto-circulo')
      if (!circulo) return
      m.addSource('perto-circulo', { type: 'geojson', data: poligonoCirculo(circulo, circulo.raioKm) })
      m.addLayer({ id: 'perto-fundo', type: 'fill', source: 'perto-circulo', paint: { 'fill-color': '#3D1308', 'fill-opacity': 0.05 } })
      m.addLayer({ id: 'perto-linha', type: 'line', source: 'perto-circulo', paint: { 'line-color': '#3D1308', 'line-width': 1.5, 'line-opacity': 0.45, 'line-dasharray': [2, 2] } })
    }
    if (m.isStyleLoaded()) pinta(); else m.once('load', pinta)
    return () => { m.off('load', pinta) }
  }, [circulo?.lat, circulo?.lng, circulo?.raioKm])

  if (erro) return <p className="ct-nota" role="alert">O mapa não carregou. A lista tem todas as unidades.</p>
  return <div ref={caixa} className="ct-mapa__mapa" role="region" aria-label="Mapa das unidades (a lista tem as mesmas informações)" />
}
