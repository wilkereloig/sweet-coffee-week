import React, { useState, useEffect, useRef, useMemo } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { PARTICIPANTS } from '../../../data/participants'

// Mapa 3D fotorrealista (Google Photorealistic 3D Tiles via maps3d, beta).
// Provider opt-in (ver Mapa.jsx). Em qualquer erro de API → onError → fallback 2D.
// Requer Map Tiles API habilitada + billing no Cloud.

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY
const NATAL_CENTER = { lat: -5.7945, lng: -35.2110 }

if (GOOGLE_MAPS_API_KEY) {
  setOptions({ key: GOOGLE_MAPS_API_KEY, v: 'beta' })
}

function getAllLocations() {
  const out = []
  for (const p of PARTICIPANTS) {
    const source = Array.isArray(p.locations) && p.locations.length > 0
      ? p.locations
      : [{ id: `${p.id}-main`, name: p.neighborhood, address: p.address, neighborhood: p.neighborhood, city: p.city, latitude: p.latitude, longitude: p.longitude, mapsUrl: p.mapsUrl }]
    for (const loc of source) {
      if (!Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) continue
      out.push({
        id: loc.id || `${p.id}-loc`,
        participantName: p.name,
        participantSlug: p.slug,
        locationName: loc.name || p.neighborhood || '',
        address: loc.address || p.address || '',
        neighborhood: loc.neighborhood || p.neighborhood || '',
        city: loc.city || p.city || '',
        instagram: p.instagram || '',
        mapsUrl: loc.mapsUrl || p.mapsUrl || '',
        lat: loc.latitude,
        lng: loc.longitude,
      })
    }
  }
  return out
}

function getMapsLink(loc) {
  if (loc.mapsUrl) return loc.mapsUrl
  return `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`
}

export function MapaGoogle3DPage({ onError }) {
  const containerRef = useRef(null)
  const apiRef = useRef(null)        // { Marker3DInteractiveElement, AltitudeMode, PopoverElement }
  const mapElRef = useRef(null)
  const markersRef = useRef({})      // id -> marker element
  const popoverRef = useRef(null)
  const userMarkerRef = useRef(null)

  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [filterBairro, setFilterBairro] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  const allLocations = useMemo(getAllLocations, [])
  const bairros = useMemo(
    () => [...new Set(allLocations.map(l => l.neighborhood).filter(Boolean))].sort(),
    [allLocations]
  )
  const visible = useMemo(
    () => filterBairro ? allLocations.filter(l => l.neighborhood === filterBairro) : allLocations,
    [allLocations, filterBairro]
  )

  // ── flyTo helper ──
  const flyTo = (loc, range = 700) => {
    const map = mapElRef.current
    if (!map) return
    try {
      map.flyCameraTo({
        endCamera: {
          center: { lat: loc.lat, lng: loc.lng, altitude: 0 },
          tilt: 65,
          range,
          heading: 0,
        },
        durationMillis: 1400,
      })
    } catch {
      map.center = { lat: loc.lat, lng: loc.lng, altitude: 0 }
      map.range = range
      map.tilt = 65
    }
  }

  const openPopover = (loc) => {
    const map = mapElRef.current
    const { PopoverElement } = apiRef.current || {}
    const marker = markersRef.current[loc.id]
    if (!map || !PopoverElement || !marker) return
    try {
      if (popoverRef.current) { popoverRef.current.remove(); popoverRef.current = null }
      const content = document.createElement('div')
      content.className = 'map3d-popover'
      const mapsLink = getMapsLink(loc)
      content.innerHTML = `
        <strong>${loc.participantName}</strong>
        ${loc.neighborhood ? `<span class="map3d-pop-bairro">${loc.neighborhood}</span>` : ''}
        ${loc.address ? `<span class="map3d-pop-addr">${loc.address}</span>` : ''}
        <div class="map3d-pop-actions">
          <a href="${mapsLink}" target="_blank" rel="noopener">Como chegar</a>
          ${loc.instagram ? `<a href="https://instagram.com/${loc.instagram.replace('@','')}" target="_blank" rel="noopener">${loc.instagram}</a>` : ''}
        </div>`
      const popover = new PopoverElement({ open: true })
      popover.positionAnchor = marker
      popover.append(content)
      map.append(popover)
      popoverRef.current = popover
    } catch (e) {
      console.warn('[3D popover falhou]', e?.message)
    }
  }

  const selectLocation = (loc) => {
    setSelectedId(loc.id)
    flyTo(loc)
    openPopover(loc)
  }

  // ── init ──
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) { setFailed(true); onError?.('missing-key'); return }
    let cancelled = false
    ;(async () => {
      try {
        const maps3d = await importLibrary('maps3d')
        const { Map3DElement, Marker3DInteractiveElement, AltitudeMode, PopoverElement } = maps3d
        if (cancelled || !containerRef.current || mapElRef.current) return
        if (!Map3DElement || !Marker3DInteractiveElement) throw new Error('maps3d API indisponível')

        apiRef.current = { Marker3DInteractiveElement, AltitudeMode, PopoverElement }

        const map3d = new Map3DElement({
          center: { lat: NATAL_CENTER.lat, lng: NATAL_CENTER.lng, altitude: 0 },
          range: 9000,
          tilt: 55,
          heading: 0,
        })
        map3d.style.width = '100%'
        map3d.style.height = '100%'
        containerRef.current.appendChild(map3d)
        mapElRef.current = map3d
        setReady(true)
      } catch (e) {
        console.error('[Google Maps 3D Load Error]', { name: e?.name, message: e?.message, error: e })
        setFailed(true)
        onError?.('load-error-3d')
      }
    })()
    return () => {
      cancelled = true
      if (popoverRef.current) { popoverRef.current.remove(); popoverRef.current = null }
      Object.values(markersRef.current).forEach(m => m.remove?.())
      markersRef.current = {}
      if (userMarkerRef.current) { userMarkerRef.current.remove?.(); userMarkerRef.current = null }
      if (mapElRef.current) { mapElRef.current.remove(); mapElRef.current = null }
    }
  }, [])

  // ── (re)build markers when visible set changes ──
  useEffect(() => {
    const map = mapElRef.current
    const api = apiRef.current
    if (!ready || !map || !api) return
    const { Marker3DInteractiveElement, AltitudeMode } = api

    Object.values(markersRef.current).forEach(m => m.remove?.())
    markersRef.current = {}

    for (const loc of visible) {
      try {
        const marker = new Marker3DInteractiveElement({
          position: { lat: loc.lat, lng: loc.lng, altitude: 40 },
          altitudeMode: AltitudeMode ? AltitudeMode.RELATIVE_TO_GROUND : undefined,
          label: loc.participantName,
          extruded: true,
        })
        marker.addEventListener('gmp-click', () => selectLocation(loc))
        map.append(marker)
        markersRef.current[loc.id] = marker
      } catch (e) {
        console.warn('[3D marker falhou]', loc.id, e?.message)
      }
    }
  }, [ready, visible])

  const locateUser = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      flyTo(loc, 1200)
    })
  }

  if (failed) return null

  return (
    <div className="map3d-wrap">
      <style>{`
        .map3d-wrap { position: relative; width: 100%; height: 100%; }
        .map3d-canvas { width: 100%; height: 100%; }
        .map3d-overlay {
          position: absolute; top: 16px; left: 16px; z-index: 5;
          width: 300px; max-width: calc(100% - 32px);
          background: rgba(255,241,230,0.96); backdrop-filter: blur(6px);
          border-radius: 14px; padding: 14px; box-shadow: 0 4px 18px rgba(0,0,0,0.25);
          display: flex; flex-direction: column; gap: 10px; max-height: calc(100% - 32px);
        }
        .map3d-title { font-family: var(--font-lovers-display,serif); color: var(--lovers-red,#D63648); font-size: 20px; margin: 0; }
        .map3d-chips { display: flex; flex-wrap: wrap; gap: 6px; max-height: 96px; overflow-y: auto; }
        .map3d-chip {
          border: 1px solid var(--lovers-red,#D63648); background: transparent;
          color: var(--lovers-red,#D63648); border-radius: 999px;
          padding: 3px 10px; font-size: 12px; cursor: pointer;
        }
        .map3d-chip--active { background: var(--lovers-red,#D63648); color: #fff; }
        .map3d-list { list-style: none; margin: 0; padding: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
        .map3d-item {
          text-align: left; width: 100%; border: none; background: transparent;
          padding: 8px 10px; border-radius: 8px; cursor: pointer; font-size: 14px;
          color: var(--ink,#2B1810);
        }
        .map3d-item:hover { background: rgba(214,54,72,0.08); }
        .map3d-item--active { background: rgba(214,54,72,0.16); font-weight: 600; }
        .map3d-item small { display: block; opacity: 0.7; font-size: 12px; }
        .map3d-locate {
          align-self: flex-start; border: none; background: var(--lovers-red,#D63648);
          color: #fff; border-radius: 999px; padding: 6px 14px; font-size: 13px; cursor: pointer;
        }
        .map3d-popover { display: flex; flex-direction: column; gap: 3px; padding: 8px 10px; min-width: 180px; font-size: 13px; }
        .map3d-popover strong { color: var(--lovers-red,#D63648); font-size: 15px; }
        .map3d-pop-bairro { font-weight: 600; opacity: 0.8; }
        .map3d-pop-addr { opacity: 0.75; }
        .map3d-pop-actions { display: flex; gap: 10px; margin-top: 6px; }
        .map3d-pop-actions a { color: var(--lovers-red,#D63648); text-decoration: underline; }
        @media (max-width: 720px) {
          .map3d-overlay { width: calc(100% - 32px); max-height: 45%; }
        }
      `}</style>

      <div ref={containerRef} className="map3d-canvas" />

      <div className="map3d-overlay">
        <h2 className="map3d-title">Mapa da Doçura — 3D</h2>
        <div className="map3d-chips">
          <button
            className={`map3d-chip ${!filterBairro ? 'map3d-chip--active' : ''}`}
            onClick={() => setFilterBairro(null)}
          >Todos</button>
          {bairros.map(b => (
            <button
              key={b}
              className={`map3d-chip ${filterBairro === b ? 'map3d-chip--active' : ''}`}
              onClick={() => setFilterBairro(b)}
            >{b}</button>
          ))}
        </div>
        <ul className="map3d-list">
          {visible.map(loc => (
            <li key={loc.id}>
              <button
                className={`map3d-item ${selectedId === loc.id ? 'map3d-item--active' : ''}`}
                onClick={() => selectLocation(loc)}
              >
                {loc.participantName}
                <small>{loc.locationName || loc.neighborhood}</small>
              </button>
            </li>
          ))}
        </ul>
        <button className="map3d-locate" onClick={locateUser}>Minha localização</button>
      </div>
    </div>
  )
}
