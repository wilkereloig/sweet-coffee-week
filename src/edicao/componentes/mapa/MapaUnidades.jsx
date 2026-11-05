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
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { pinDaCasa, pinSicredi, elementoDoGrupo } from './pin.js'
import { agruparPontos } from './agrupar.js'
import { MAPA_CACA as TC } from '../../caca/mapa/textos.js'

const ESTILO = 'https://tiles.openfreemap.org/styles/liberty'
const NATAL = [-35.21, -5.81]
const ZOOM_PERTO = 13.5 // abaixo disso o mapa mostra a cidade toda: pins pequenos (16-mapa-tela.css, .ct-mapa__mapa--longe)

const nomeDoPonto = (p) => [p.titulo, p.aproximada && 'ponto aproximado', p.quero && 'quero ir', p.foi && 'já fui'].filter(Boolean).join(', ')

// `gestos`: 'cooperativo' (padrão: um dedo rola a página, dois movem o mapa) ou 'livre' (tela cheia: não há página para rolar,
// um dedo move o mapa). O contêiner pode mudar de tamanho (tela cheia): o MapLibre acompanha sozinho (trackResize) e
// mantém centro e zoom — o mapa não é recriado ao entrar e sair da tela cheia.
export default function MapaUnidades ({ pontos, selecionada, aoSelecionar, voce = null, gestos = 'cooperativo' }) {
  const caixa = React.useRef(null)
  const mapa = React.useRef(null)
  const marcadores = React.useRef(new Map())
  const marcaVoce = React.useRef(null)
  const grupos = React.useRef([])
  const pontosAtuais = React.useRef(pontos)
  const reagrupar = React.useRef(null)
  const [erro, setErro] = React.useState(false)
  pontosAtuais.current = pontos

  // Casas que se cobririam na tela viram um círculo com o número (agrupar.js); a escolhida e o Sicredi ficam sempre soltos.
  // Roda ao fim de cada zoom e quando o conjunto ou a escolha mudam; só tira e põe os marcadores no mapa.
  reagrupar.current = () => {
    const m = mapa.current
    if (!m) return
    for (const g of grupos.current) g.remove()
    grupos.current = []
    const achados = agruparPontos(pontosAtuais.current, { zoom: m.getZoom(), base: 512, zoomPerto: ZOOM_PERTO, fixos: [selecionada] })
    const escondidos = new Set(achados.flatMap((g) => g.ids))
    for (const [id, mk] of marcadores.current) {
      if (escondidos.has(id)) mk.remove()
      else if (!mk.getElement().isConnected) mk.addTo(m)
    }
    for (const g of achados) {
      const aproximar = () => {
        const limites = new maplibregl.LngLatBounds()
        for (const p of g.membros) limites.extend([p.lng, p.lat])
        m.fitBounds(limites, { padding: 72, maxZoom: 17, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400 })
      }
      const el = elementoDoGrupo(g.ids.length, TC.grupoNome(g.ids.length), aproximar)
      grupos.current.push(new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([g.lng, g.lat]).addTo(m))
    }
  }

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
    m.on('zoomend', () => reagrupar.current?.())
    escala()
    m.on('error', (e) => { if (e?.error?.status >= 400 || /style/i.test(String(e?.error?.message || ''))) setErro(true) })
    return () => { m.remove(); mapa.current = null; marcadores.current.clear(); grupos.current = []; marcaVoce.current = null }
  }, [])

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
    marcadores.current.clear()
    const limites = new maplibregl.LngLatBounds()
    // O enquadramento segue as casas; só sem nenhuma casa na tela (filtro vazio) ele vai para as agências do Sicredi.
    const alvo = pontos.some((p) => !p.sicredi) ? pontos.filter((p) => !p.sicredi) : pontos
    for (const p of pontos) {
      const el = document.createElement('button')
      el.type = 'button'
      if (p.sicredi) { // patrocinador: marcador próprio, fora da contagem de marcadores das casas (.ct-marcador)
        el.className = 'ct-sicredi-marcador'
        el.append(pinSicredi(p.pin))
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
    if (alvo.length > 1) m.fitBounds(limites, { padding: 48, maxZoom: 15, duration: 0 })
    else if (alvo.length === 1) m.jumpTo({ center: [alvo[0].lng, alvo[0].lat], zoom: 15 })
    reagrupar.current?.()
  }, [pontos.map((p) => p.id).join(), aoSelecionar])

  // Estado de cada marcador (aproximado, quero ir, já fui, selecionado): classe + nome. classList, não
  // className: o MapLibre põe as classes de posicionamento dele no mesmo elemento.
  React.useEffect(() => {
    for (const p of pontos) {
      const el = marcadores.current.get(p.id)?.getElement()
      if (!el) continue
      if (p.sicredi) {
        el.classList.toggle('ct-sicredi-marcador--aprox', !!p.aproximada)
        el.classList.toggle('is-sel', p.id === selecionada)
        el.setAttribute('aria-label', TC.sicrediNomeMarcador(p.titulo, !!p.aproximada))
        el.setAttribute('aria-pressed', String(p.id === selecionada))
        continue
      }
      el.classList.add('ct-marcador')
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
      const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches
      mapa.current.easeTo({ center: mk.getLngLat(), zoom: Math.max(mapa.current.getZoom(), 14), duration: reduzir ? 0 : 400 })
    }
  }, [selecionada])

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

  if (erro) return <p className="ct-nota" role="alert">O mapa não carregou. A lista tem todas as unidades.</p>
  return <div ref={caixa} className="ct-mapa__mapa" role="region" aria-label="Mapa das unidades (a lista tem as mesmas informações)" />
}
