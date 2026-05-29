import React, { useState, useEffect, useRef } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { PARTICIPANTS } from '../../../data/participants'

// POC — Mapa 3D fotorrealista (Google Photorealistic 3D Tiles via maps3d).
// Fase 1 do docs/PLANO_MAPA_3D.md: globo + pins. Sem popup/cluster/sidebar ainda.
// Requer Map Tiles API habilitada no Cloud + billing. Sem isso, onError → fallback 2D.

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

const NATAL_CENTER = { lat: -5.7945, lng: -35.2110 }

// versão beta é obrigatória para a biblioteca maps3d
if (GOOGLE_MAPS_API_KEY) {
  setOptions({ key: GOOGLE_MAPS_API_KEY, v: 'beta' })
}

function getAllLocations() {
  const out = []
  for (const p of PARTICIPANTS) {
    const source = Array.isArray(p.locations) && p.locations.length > 0
      ? p.locations
      : [{ id: `${p.id}-main`, name: p.name, latitude: p.latitude, longitude: p.longitude }]
    for (const loc of source) {
      if (!Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) continue
      out.push({
        id: loc.id || `${p.id}-loc`,
        label: p.name,
        lat: loc.latitude,
        lng: loc.longitude,
      })
    }
  }
  return out
}

export function MapaGoogle3DPage({ onError }) {
  const containerRef = useRef(null)
  const mapElRef = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) { onError?.('missing-key'); setFailed(true); return }
    let cancelled = false

    ;(async () => {
      try {
        const { Map3DElement, Marker3DElement } = await importLibrary('maps3d')
        if (cancelled || !containerRef.current || mapElRef.current) return

        const map3d = new Map3DElement({
          center: { lat: NATAL_CENTER.lat, lng: NATAL_CENTER.lng, altitude: 0 },
          range: 5000,
          tilt: 60,
          heading: 0,
        })
        map3d.style.width = '100%'
        map3d.style.height = '100%'
        containerRef.current.appendChild(map3d)
        mapElRef.current = map3d

        for (const loc of getAllLocations()) {
          const marker = new Marker3DElement({
            position: { lat: loc.lat, lng: loc.lng, altitude: 30 },
            label: loc.label,
            altitudeMode: 'RELATIVE_TO_GROUND',
            extruded: true,
          })
          map3d.append(marker)
        }
      } catch (e) {
        console.error('[Google Maps 3D Load Error]', { name: e?.name, message: e?.message, error: e })
        onError?.('load-error-3d')
        setFailed(true)
      }
    })()

    return () => {
      cancelled = true
      if (mapElRef.current) {
        mapElRef.current.remove()
        mapElRef.current = null
      }
    }
  }, [])

  if (failed) return null
  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
