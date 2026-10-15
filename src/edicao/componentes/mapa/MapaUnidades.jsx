/*
 * Mapa interativo das unidades — carregado sob demanda (React.lazy em Mapa.jsx).
 *
 * Provedor (D-03, conferido em 14/10/2026): OpenFreeMap — "completely free",
 * uso comercial permitido, sem chave nem cadastro, sem limite de visualização;
 * tiles vetoriais, por isso MapLibre GL (o servidor público do OpenStreetMap é
 * "best-effort" e avisa que serviço comercial pode perder o acesso).
 * Trocar de provedor = trocar ESTILO abaixo; as páginas só conhecem a interface
 * { pontos, selecionada, aoSelecionar }.
 *
 * Acessibilidade: o mapa é complementar — toda função existe na lista ao lado.
 * Cada marcador é um <button> com nome; a seleção sincroniza com a lista.
 */
import React from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const ESTILO = 'https://tiles.openfreemap.org/styles/liberty'
const NATAL = [-35.21, -5.81]

export default function MapaUnidades ({ pontos, selecionada, aoSelecionar }) {
  const caixa = React.useRef(null)
  const mapa = React.useRef(null)
  const marcadores = React.useRef(new Map())
  const [erro, setErro] = React.useState(false)

  React.useEffect(() => {
    let m
    try {
      m = new maplibregl.Map({ container: caixa.current, style: ESTILO, center: NATAL, zoom: 11.5, attributionControl: { compact: false }, cooperativeGestures: true })
    } catch { setErro(true); return undefined }
    mapa.current = m
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    m.on('error', (e) => { if (e?.error?.status >= 400 || /style/i.test(String(e?.error?.message || ''))) setErro(true) })
    return () => { m.remove(); mapa.current = null; marcadores.current.clear() }
  }, [])

  React.useEffect(() => {
    const m = mapa.current
    if (!m) return
    for (const mk of marcadores.current.values()) mk.remove()
    marcadores.current.clear()
    const limites = new maplibregl.LngLatBounds()
    for (const p of pontos) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'ct-marcador'
      el.setAttribute('aria-label', p.titulo)
      el.addEventListener('click', () => aoSelecionar(p.id))
      const mk = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m)
      marcadores.current.set(p.id, mk)
      limites.extend([p.lng, p.lat])
    }
    if (pontos.length > 1) m.fitBounds(limites, { padding: 48, maxZoom: 15, duration: 0 })
    else if (pontos.length === 1) m.jumpTo({ center: [pontos[0].lng, pontos[0].lat], zoom: 15 })
  }, [pontos.map((p) => p.id).join(), aoSelecionar])

  React.useEffect(() => {
    for (const [id, mk] of marcadores.current) {
      const el = mk.getElement()
      el.classList.toggle('is-sel', id === selecionada)
      el.setAttribute('aria-pressed', String(id === selecionada))
    }
    const mk = marcadores.current.get(selecionada)
    if (mk && mapa.current) {
      const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches
      mapa.current.easeTo({ center: mk.getLngLat(), zoom: Math.max(mapa.current.getZoom(), 14), duration: reduzir ? 0 : 400 })
    }
  }, [selecionada])

  if (erro) return <p className="ct-nota" role="alert">O mapa não carregou. A lista ao lado tem todas as unidades.</p>
  return <div ref={caixa} className="ct-mapa__mapa" role="region" aria-label="Mapa das unidades (a lista ao lado tem as mesmas informações)" />
}
