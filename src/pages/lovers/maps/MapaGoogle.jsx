import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { I } from '../../../components/icons'
import { EmptyState } from '../../../components/placeholders'
import { PARTICIPANTS } from '../../../data/participants'
import { COMBOS } from '../../../data/combos'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

const NATAL_CENTER = { lat: -5.7945, lng: -35.2110 }
const NATAL_ZOOM = 13


// ─── helpers ────────────────────────────────────────────────────────────────

function getParticipantLocations(participant) {
  const source = Array.isArray(participant.locations) && participant.locations.length > 0
    ? participant.locations
    : [{
        id: `${participant.id}-main`,
        name: participant.neighborhood || 'Unidade principal',
        address: participant.address,
        neighborhood: participant.neighborhood,
        city: participant.city,
        latitude: participant.latitude,
        longitude: participant.longitude,
        mapsUrl: participant.mapsUrl,
      }]

  return source.map((location, index) => ({
    id: location.id || `${participant.id}-location-${index}`,
    participantId: participant.id,
    participantSlug: participant.slug,
    participantName: participant.name,
    participantLogo: participant.logo,
    participantInstagram: participant.instagram,
    brandColor: participant.brandColor,
    locationName: location.name || participant.neighborhood || `Unidade ${index + 1}`,
    address: location.address || participant.address,
    neighborhood: location.neighborhood || participant.neighborhood,
    city: location.city || participant.city,
    latitude: location.latitude ?? null,
    longitude: location.longitude ?? null,
    mapsUrl: location.mapsUrl || participant.mapsUrl || '',
  }))
}

function getLocationMapsUrl(location) {
  if (location.mapsUrl) return location.mapsUrl
  if (Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`
  }
  if (!location.address) return null
  const query = encodeURIComponent(`${location.address}, ${location.city || ''}`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

function getDirectionsUrl(location, userLocation) {
  const destination = Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
    ? `${location.latitude},${location.longitude}`
    : location.address
      ? `${location.address}, ${location.city || ''}`
      : null

  if (!destination) return getLocationMapsUrl(location)

  const destinationParam = encodeURIComponent(destination)

  if (userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)) {
    const originParam = encodeURIComponent(`${userLocation.lat},${userLocation.lng}`)
    return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destinationParam}&travelmode=driving`
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${destinationParam}&travelmode=driving`
}

function haversineKm(a, b) {
  if (!a || !b) return null
  const R = 6371
  const toRad = v => (v * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function formatDistance(km) {
  if (!Number.isFinite(km)) return ''
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1).replace('.', ',')} km`
}

function getParticipantMinDistance(participant, locationsWithDistance) {
  const distances = locationsWithDistance
    .filter(l => l.participantId === participant.id && Number.isFinite(l.distanceKm))
    .map(l => l.distanceKm)
  return distances.length > 0 ? Math.min(...distances) : Infinity
}

function isMapDebugEnabled() {
  return typeof window !== 'undefined' && window.location.href.includes('debug=1')
}

function normalizeSearchText(value) {
  // eslint-disable-next-line no-misleading-character-class
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, '')
    .toLowerCase()
    .trim()
}

if (GOOGLE_MAPS_API_KEY) {
  setOptions({ key: GOOGLE_MAPS_API_KEY })
}

function pinSvg(selected) {
  const outer = selected ? '#b80050' : '#f10767'
  const inner = selected ? '#4a000e' : '#7f0018'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 102.3 141.39">
    <path fill="${outer}" d="M51.15,0C22.95,0,0,22.9,0,51.05c0,39.08,45.48,86.75,47.42,88.76,2.04,2.12,5.44,2.12,7.47,0,1.94-2.01,47.42-49.68,47.42-88.76,0-28.15-22.95-51.05-51.15-51.05Z"/>
    <path fill="${inner}" d="M23.13,60.44c-1.98-9.32-.14-21.72,6.3-27.84,2.86-2.72,6.99-3.23,10.13-.84,5.61,4.26,7.23,11.05,8.66,18.39,3.98-10.22,11.47-25.23,21.91-28.17,4.32-1.22,8.34,1,9.28,5.46,1.03,4.87.38,9.84-1.14,14.73-6.55,21.16-21.44,42.56-35.26,60.38-8.23-12.97-17-26.76-19.9-42.12Z"/>
  </svg>`
}

function pinIcon(selected) {
  const w = selected ? 44 : 36
  const h = selected ? 61 : 50
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(pinSvg(selected)),
    scaledSize: new google.maps.Size(w, h),
    anchor: new google.maps.Point(Math.round(w / 2), h),
  }
}

// ─── GoogleMap component ─────────────────────────────────────────────────────

function GoogleMap({ locations, selectedLocationId, onSelectLocation, userLocation, onError }) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)
  const markersRef = useRef({})
  const userMarkerRef = useRef(null)

  useEffect(() => {
    const previous = window.gm_authFailure
    window.gm_authFailure = () => {
      console.error('[Google Maps Auth Failure]', {
        hostname: window.location.hostname,
        keyStart: GOOGLE_MAPS_API_KEY ? GOOGLE_MAPS_API_KEY.slice(0, 8) : null,
      })
      onError?.('auth-failure')
      if (typeof previous === 'function') previous()
    }
    return () => { window.gm_authFailure = previous }
  }, [])

  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (!mapRef.current) return
    if (!GOOGLE_MAPS_API_KEY) { onError?.('missing-key'); return }
    let cancelled = false

    ;(async () => {
      try {
        const { Map } = await importLibrary('maps')
        if (cancelled || !mapRef.current || instanceRef.current) return

        const map = new Map(mapRef.current, {
          center: NATAL_CENTER,
          zoom: NATAL_ZOOM,
          scrollwheel: false,
          gestureHandling: 'cooperative',
        })

        const infoWindow = new google.maps.InfoWindow()
        instanceRef.current = { map, infoWindow }
        setMapReady(true)
      } catch (e) {
        console.error('[Google Maps Load Error]', { name: e?.name, message: e?.message, error: e })
        onError?.('load-error')
      }
    })()

    return () => {
      cancelled = true
      Object.values(markersRef.current).forEach(m => m.setMap(null))
      markersRef.current = {}
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null)
        userMarkerRef.current = null
      }
      instanceRef.current = null
    }
  }, [])

  // Rebuild markers whenever visible locations change
  useEffect(() => {
    if (!instanceRef.current) return

    const { map, infoWindow } = instanceRef.current

    Object.values(markersRef.current).forEach(marker => marker.setMap(null))
    markersRef.current = {}

    const validLocations = locations.filter(loc =>
      Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)
    )

    validLocations.forEach(loc => {
      const marker = new google.maps.Marker({
        map,
        position: { lat: loc.latitude, lng: loc.longitude },
        title: `${loc.participantName} — ${loc.locationName}`,
        icon: pinIcon(false),
      })

      marker.addListener('click', () => {
        onSelectLocation?.(loc)
        infoWindow.setContent(`
          <div style="font-family:sans-serif;max-width:220px;line-height:1.4;">
            <strong style="font-size:14px;">${loc.participantName}</strong><br/>
            <span style="font-size:13px;color:#555;">${loc.locationName}</span><br/>
            <small style="color:#888;">${[loc.neighborhood, loc.city].filter(Boolean).join(' · ')}</small><br/>
            ${loc.address ? `<small style="color:#888;">${loc.address}</small>` : ''}
          </div>
        `)
        infoWindow.open({ anchor: marker, map })
      })

      markersRef.current[loc.id] = marker
    })

    if (validLocations.length > 1) {
      const bounds = new google.maps.LatLngBounds()
      validLocations.forEach(loc => bounds.extend({ lat: loc.latitude, lng: loc.longitude }))
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 })
    } else if (validLocations.length === 1) {
      map.panTo({ lat: validLocations[0].latitude, lng: validLocations[0].longitude })
      map.setZoom(15)
    } else {
      map.panTo(NATAL_CENTER)
      map.setZoom(NATAL_ZOOM)
    }
  }, [locations, onSelectLocation, mapReady])

  // Highlight selected marker + pan
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      marker.setIcon(pinIcon(id === selectedLocationId))
    })
    if (selectedLocationId && instanceRef.current) {
      const loc = locations.find(l => l.id === selectedLocationId)
      if (loc && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)) {
        instanceRef.current.map.panTo({ lat: loc.latitude, lng: loc.longitude })
        instanceRef.current.map.setZoom(15)
      }
    }
  }, [selectedLocationId, locations])

  // User location marker
  useEffect(() => {
    if (!instanceRef.current) return
    const { map } = instanceRef.current
    if (userMarkerRef.current) { userMarkerRef.current.setMap(null); userMarkerRef.current = null }
    if (userLocation) {
      userMarkerRef.current = new google.maps.Marker({
        map,
        position: { lat: userLocation.lat, lng: userLocation.lng },
        title: 'Você está aqui',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#2E8CFF',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
          scale: 8,
        },
        zIndex: 999,
      })
      map.panTo({ lat: userLocation.lat, lng: userLocation.lng })
      map.setZoom(14)
    }
  }, [userLocation])

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
}

function getLocationDestination(location) {
  if (Number.isFinite(location.latitude) && Number.isFinite(location.longitude))
    return `${location.latitude},${location.longitude}`
  if (location.address) return `${location.address}, ${location.city || ''}`
  return ''
}

function getRouteGoogleMapsUrl(routeLocations, userLocation) {
  const validStops = routeLocations.map(getLocationDestination).filter(Boolean).slice(0, 9)
  if (validStops.length === 0) return null
  const origin = userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)
    ? `${userLocation.lat},${userLocation.lng}` : null
  const orig = origin ? `origin=${encodeURIComponent(origin)}&` : ''
  if (validStops.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&${orig}destination=${encodeURIComponent(validStops[0])}&travelmode=driving`
  }
  const dest = encodeURIComponent(validStops[validStops.length - 1])
  const waypoints = validStops.slice(0, -1).map(encodeURIComponent).join('|')
  return `https://www.google.com/maps/dir/?api=1&${orig}destination=${dest}&waypoints=${waypoints}&travelmode=driving`
}

// ─── MapaGooglePage ──────────────────────────────────────────────────────────

export function MapaGooglePage({ navigate }) {
  const [selectedParticipantId, setSelectedParticipantId] = useState(null)
  const [selectedLocationId, setSelectedLocationId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterBairro, setFilterBairro] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [distanceFilterKm, setDistanceFilterKm] = useState(null)
  const [mapError, setMapError] = useState(null)
  const [routeLocationIds, setRouteLocationIds] = useState(() => {
    try {
      const saved = window.localStorage.getItem('sweet-lovers-route')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [isRoutePanelOpen, setIsRoutePanelOpen] = useState(false)

  const mapDebug = isMapDebugEnabled()

  // ── base data ──────────────────────────────────────────────────────────────

  const participants = useMemo(() =>
    PARTICIPANTS.map(p => ({
      ...p,
      combo: COMBOS.find(c => c.participantId === p.id) || null,
    })),
  [])

  const allLocations = useMemo(() =>
    participants.flatMap(getParticipantLocations),
  [participants])

  const neighborhoods = useMemo(() => {
    const counts = {}
    allLocations.forEach(l => {
      if (l.neighborhood) counts[l.neighborhood] = (counts[l.neighborhood] || 0) + 1
    })
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, count }))
  }, [allLocations])

  // ── search + bairro filter ─────────────────────────────────────────────────

  const filteredParticipants = useMemo(() => {
    const q = normalizeSearchText(search)
    return participants.filter(p => {
      const locs = getParticipantLocations(p)
      const participantText = normalizeSearchText([p.name, p.slug, p.instagram].filter(Boolean).join(' '))
      const locationsText = normalizeSearchText(
        locs.map(l => [l.locationName, l.address, l.neighborhood, l.city].filter(Boolean).join(' ')).join(' ')
      )
      const matchSearch = !q || participantText.includes(q) || locationsText.includes(q)
      const matchBairro = !filterBairro || locs.some(l => l.neighborhood === filterBairro)
      return matchSearch && matchBairro
    })
  }, [participants, search, filterBairro])

  // ── locations with distance ────────────────────────────────────────────────

  const visibleLocations = useMemo(() =>
    filteredParticipants.flatMap(p =>
      getParticipantLocations(p).map(loc => ({
        ...loc,
        participantId: p.id,
        participantSlug: p.slug,
        participantName: p.name,
        participantLogo: p.logo,
        participantInstagram: p.instagram,
        brandColor: p.brandColor,
      }))
    ),
  [filteredParticipants])

  const visibleLocationsWithDistance = useMemo(() =>
    visibleLocations.map(loc => {
      const hasCoords = Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)
      const distanceKm = userLocation && hasCoords
        ? haversineKm(userLocation, { lat: loc.latitude, lng: loc.longitude })
        : null
      return { ...loc, distanceKm }
    }),
  [visibleLocations, userLocation])

  const pinLocations = useMemo(() =>
    visibleLocationsWithDistance.filter(l =>
      Number.isFinite(l.latitude) && Number.isFinite(l.longitude)
    ),
  [visibleLocationsWithDistance])

  // ── distance filter ────────────────────────────────────────────────────────

  const distanceFilteredParticipantIds = useMemo(() => {
    if (!distanceFilterKm || !userLocation) return null
    const ids = new Set()
    visibleLocationsWithDistance.forEach(l => {
      if (Number.isFinite(l.distanceKm) && l.distanceKm <= distanceFilterKm) {
        ids.add(l.participantId)
      }
    })
    return ids
  }, [visibleLocationsWithDistance, distanceFilterKm, userLocation])

  const participantsAfterDistance = useMemo(() => {
    if (!distanceFilteredParticipantIds) return filteredParticipants
    return filteredParticipants.filter(p => distanceFilteredParticipantIds.has(p.id))
  }, [filteredParticipants, distanceFilteredParticipantIds])

  // ── sort by proximity ──────────────────────────────────────────────────────

  const finalParticipants = useMemo(() => {
    if (!userLocation) return participantsAfterDistance
    return [...participantsAfterDistance].sort((a, b) => {
      const da = getParticipantMinDistance(a, visibleLocationsWithDistance)
      const db = getParticipantMinDistance(b, visibleLocationsWithDistance)
      return da - db
    })
  }, [participantsAfterDistance, userLocation, visibleLocationsWithDistance])

  // ── diagnostics ───────────────────────────────────────────────────────────

  const mapDiagnostics = useMemo(() => {
    const source = allLocations
    const withCoords = source.filter(l => Number.isFinite(l.latitude) && Number.isFinite(l.longitude))
    const withoutCoords = source.filter(l => !Number.isFinite(l.latitude) || !Number.isFinite(l.longitude))
    const withMapsUrl = source.filter(l => Boolean(l.mapsUrl))
    const withoutMapsUrl = source.filter(l => !l.mapsUrl)

    const coordMap = new Map()
    source.forEach(l => {
      if (!Number.isFinite(l.latitude) || !Number.isFinite(l.longitude)) return
      const key = `${l.latitude.toFixed(6)},${l.longitude.toFixed(6)}`
      if (!coordMap.has(key)) coordMap.set(key, [])
      coordMap.get(key).push(`${l.participantName} — ${l.locationName}`)
    })
    const duplicatedCoords = Array.from(coordMap.entries())
      .filter(([, items]) => items.length > 1)
      .map(([coords, items]) => ({ coords, items }))

    return {
      participants: participants.length,
      units: source.length,
      withCoords: withCoords.length,
      withoutCoords: withoutCoords.map(l => `${l.participantName} — ${l.locationName}`),
      withMapsUrl: withMapsUrl.length,
      withoutMapsUrl: withoutMapsUrl.map(l => `${l.participantName} — ${l.locationName}`),
      duplicatedCoords,
    }
  }, [participants, allLocations])

  useEffect(() => {
    if (!mapDebug) return
    console.log('[Mapa Lovers Diagnostics]', mapDiagnostics)
  }, [mapDebug, mapDiagnostics])

  useEffect(() => {
    try { window.localStorage.setItem('sweet-lovers-route', JSON.stringify(routeLocationIds)) }
    catch {}
  }, [routeLocationIds])

  useEffect(() => {
    if (!isRoutePanelOpen) return
    const handler = e => { if (e.key === 'Escape') setIsRoutePanelOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isRoutePanelOpen])

  const routeLocations = useMemo(() =>
    routeLocationIds.map(id => allLocations.find(l => l.id === id)).filter(Boolean),
  [routeLocationIds, allLocations])

  // ── actions ────────────────────────────────────────────────────────────────

  function requestUserLocation() {
    setLocationError('')
    if (!navigator.geolocation) {
      setLocationError('Seu navegador não suporta localização.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      err => {
        console.error('[Mapa Geolocation Error]', err)
        setLocationError('Não foi possível acessar sua localização.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  function clearUserLocation() {
    setUserLocation(null)
    setLocationError('')
    setDistanceFilterKm(null)
  }

  function focusLocation(location) {
    setSelectedParticipantId(location.participantId)
    setSelectedLocationId(location.id)
  }

  const handleSelectLocation = useCallback((location) => {
    setSelectedParticipantId(location.participantId)
    setSelectedLocationId(location.id)
    const el = document.getElementById(`map-card-${location.participantId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  function isInRoute(location) { return routeLocationIds.includes(location.id) }

  function toggleRouteLocation(location) {
    setRouteLocationIds(cur =>
      cur.includes(location.id) ? cur.filter(id => id !== location.id) : [...cur, location.id]
    )
  }

  function removeRouteLocation(locationId) {
    setRouteLocationIds(cur => cur.filter(id => id !== locationId))
  }

  function clearRoute() { setRouteLocationIds([]) }

  // ── derived ui state ───────────────────────────────────────────────────────

  const hasMissingCoords = allLocations.some(l => !Number.isFinite(l.latitude) || !Number.isFinite(l.longitude))
  const hasData = true

  const selectedLocation = useMemo(() =>
    selectedLocationId ? allLocations.find(l => l.id === selectedLocationId) : null,
  [selectedLocationId, allLocations])

  const selectedParticipant = useMemo(() =>
    selectedParticipantId ? participants.find(p => p.id === selectedParticipantId) : null,
  [selectedParticipantId, participants])

  const routeMapsUrl = getRouteGoogleMapsUrl(routeLocations, userLocation)

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page-enter kv-lovers" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .35 }}></div>

      <section style={{ padding: 'clamp(40px, 6vw, 80px) 0 48px', position: 'relative' }}>
        <div className="wrap">
          <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
            <div className="eyebrow" style={{ color: 'var(--lovers-red)', marginBottom: 24, justifyContent: 'center' }}>
              <span className="dot" style={{ background: 'var(--lovers-red)' }}></span>
              MAPA DA DOÇURA
            </div>
            <h1 className="lovers-h1" style={{ fontSize: 'clamp(48px, 7vw, 96px)', margin: 0 }}>
              Mapa da Doçura<br/>
              <span style={{ color: 'var(--lovers-pink)' }}>Lovers.</span>
            </h1>
            <p className="lead mt-3" style={{ color: 'var(--lovers-brown)', opacity: .85 }}>
              Veja onde estão os participantes da edição e escolha sua próxima parada.
            </p>
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: 80, position: 'relative', background: 'rgba(255,241,230,.32)' }}>
        <div className="wrap">

          {!hasData ? (
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <EmptyState
                lovers
                icon="pin"
                title="Mapa em breve"
                subtitle="O Mapa da Doçura Lovers estará disponível em breve com todos os participantes da edição."
              />
            </div>
          ) : (
            <>
            {hasMissingCoords && (
              <div className="mono" style={{
                fontSize: 12, color: 'var(--lovers-brown)', opacity: .7,
                background: 'rgba(135,14,45,.06)',
                border: '1px solid rgba(135,14,45,.15)',
                borderRadius: 10, padding: '10px 14px',
                marginBottom: 16, lineHeight: 1.5,
              }}>
                Alguns participantes ainda estão sem pin no mapa, mas você já pode abrir o endereço no Google Maps.
              </div>
            )}
            <div className="mapa-layout">

              {/* ── mapa ── */}
              <div className="mapa-container">
                {mapError === 'missing-key' ? (
                  <div style={{
                    height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 12, padding: 32, textAlign: 'center',
                    background: 'var(--lovers-cream)', color: 'var(--lovers-brown)',
                  }}>
                    <div style={{ fontSize: 32 }}>🗺️</div>
                    <div style={{ fontFamily: 'var(--font-lovers-display)', fontSize: 22, color: 'var(--lovers-ink)' }}>
                      Chave do Google Maps não configurada.
                    </div>
                    <div className="mono" style={{ fontSize: 12, opacity: .7 }}>
                      Adicione VITE_GOOGLE_MAPS_KEY no .env.local e reinicie o servidor.
                    </div>
                  </div>
                ) : mapError ? (
                  <div style={{
                    height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 12, padding: 32, textAlign: 'center',
                    background: 'var(--lovers-cream)', color: 'var(--lovers-brown)',
                  }}>
                    <div style={{ fontSize: 32 }}>⚠️</div>
                    <div style={{ fontFamily: 'var(--font-lovers-display)', fontSize: 22, color: 'var(--lovers-ink)' }}>
                      Erro ao carregar o mapa.
                    </div>
                    <div className="mono" style={{ fontSize: 12, opacity: .7 }}>
                      Código: {mapError} — verifique a chave e as restrições no Google Cloud Console.
                    </div>
                  </div>
                ) : (
                  <GoogleMap
                    locations={pinLocations}
                    selectedLocationId={selectedLocationId}
                    onSelectLocation={handleSelectLocation}
                    userLocation={userLocation}
                    onError={setMapError}
                  />
                )}

                {selectedLocation && (
                  <div className="mapa-selected-card" style={{
                    position: 'absolute', bottom: 16, left: 16, right: 16,
                    zIndex: 1000,
                    background: 'var(--lovers-cream)',
                    border: '2px solid var(--lovers-red)',
                    borderRadius: 16, padding: '16px 20px',
                    boxShadow: '0 8px 32px rgba(43,24,16,.2)',
                  }}>
                    <button
                      onClick={() => { setSelectedParticipantId(null); setSelectedLocationId(null) }}
                      style={{
                        position: 'absolute', top: 8, right: 12,
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 20, color: 'var(--lovers-red)', lineHeight: 1,
                      }}
                    >×</button>
                    <div className="mono" style={{ color: 'var(--lovers-red)', fontSize: 11, marginBottom: 4 }}>
                      {selectedLocation.locationName} · {selectedLocation.neighborhood}
                    </div>
                    <div style={{ fontFamily: 'var(--font-lovers-display)', fontSize: 22, lineHeight: 1.1, color: 'var(--lovers-ink)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                      {selectedLocation.participantName}
                    </div>
                    {selectedParticipant?.combo && (
                      <div style={{ fontSize: 14, color: 'var(--lovers-brown)', opacity: .85, marginBottom: 6 }}>
                        Combo: <strong>{selectedParticipant.combo.name}</strong>
                      </div>
                    )}
                    {selectedLocation.address && (
                      <div className="mono" style={{ fontSize: 12, color: 'var(--lovers-brown)', opacity: .6, marginBottom: 4 }}>
                        {selectedLocation.address}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                      {selectedParticipant?.combo?.slug && (
                        <button
                          className="btn btn-lovers btn-sm"
                          onClick={() => navigate(`/lovers/combos/${selectedParticipant.combo.slug}`)}
                          style={{ fontSize: 13 }}
                        >
                          Ver combo <I.arrow />
                        </button>
                      )}
                      {getLocationMapsUrl(selectedLocation) && (
                        <a
                          href={getLocationMapsUrl(selectedLocation)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm"
                          style={{ background: 'var(--lovers-red)', color: 'var(--lovers-cream)', border: 0, fontSize: 13 }}
                        >
                          Abrir no mapa <I.arrow />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── lista lateral ── */}
              <div className="map-sidebar">
                <div className="map-sidebar-sticky">

                {/* busca */}
                <input
                  type="text"
                  placeholder="Buscar participante, bairro ou endereço..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    border: '1.5px solid rgba(135,14,45,.2)',
                    borderRadius: 10, padding: '9px 12px',
                    fontSize: 13, fontFamily: 'var(--font-lovers-body)',
                    background: '#fff', color: 'var(--lovers-ink)',
                    outline: 'none', marginBottom: 10,
                  }}
                />

                {/* filtros de bairro */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  <button
                    onClick={() => setFilterBairro(null)}
                    className="mapa-chip"
                    style={{ background: !filterBairro ? 'var(--lovers-red)' : 'transparent', color: !filterBairro ? '#fff' : 'var(--lovers-red)' }}
                  >
                    Todos · {participants.length}
                  </button>
                  {neighborhoods.map(n => (
                    <button
                      key={n.name}
                      onClick={() => setFilterBairro(prev => prev === n.name ? null : n.name)}
                      className="mapa-chip"
                      style={{ background: filterBairro === n.name ? 'var(--lovers-red)' : 'transparent', color: filterBairro === n.name ? '#fff' : 'var(--lovers-red)' }}
                    >
                      {n.name} · {n.count}
                    </button>
                  ))}
                </div>

                {/* botão localização */}
                {!userLocation ? (
                  <button
                    onClick={requestUserLocation}
                    disabled={locating}
                    className="mapa-chip"
                    style={{
                      width: '100%', marginBottom: locationError ? 4 : 10, padding: '8px 12px',
                      background: 'transparent', color: 'var(--lovers-red)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: locating ? .6 : 1,
                      cursor: locating ? 'default' : 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 14 }}>📍</span>
                    {locating ? 'Localizando…' : 'Usar minha localização'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
                    <div className="mapa-chip" style={{ background: 'var(--lovers-red)', color: '#fff', flex: 1, textAlign: 'center', padding: '6px 10px' }}>
                      <span style={{ fontSize: 12 }}>📍</span> Localização ativa
                    </div>
                    <button
                      onClick={clearUserLocation}
                      className="mapa-chip"
                      style={{ background: 'transparent', color: 'var(--lovers-red)', padding: '6px 10px' }}
                    >
                      Limpar
                    </button>
                  </div>
                )}

                {/* erro de localização */}
                {locationError && (
                  <div className="mono" style={{ fontSize: 11, color: 'var(--lovers-red)', marginBottom: 8, lineHeight: 1.4 }}>
                    {locationError}
                  </div>
                )}

                {/* filtros de distância — só quando localização ativa */}
                {userLocation && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                    {[null, 2, 5, 10].map(km => (
                      <button
                        key={km ?? 'all'}
                        onClick={() => setDistanceFilterKm(km)}
                        className="mapa-chip"
                        style={{
                          background: distanceFilterKm === km ? 'var(--lovers-red)' : 'transparent',
                          color: distanceFilterKm === km ? '#fff' : 'var(--lovers-red)',
                        }}
                      >
                        {km === null ? 'Todos' : `Até ${km} km`}
                      </button>
                    ))}
                  </div>
                )}

                {/* contagem + limpar seleção */}
                <div className="mono mb-3" style={{ color: 'var(--lovers-red)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>
                    {finalParticipants.length === participants.length
                      ? `PARTICIPANTES · ${participants.length}`
                      : `MOSTRANDO · ${finalParticipants.length} de ${participants.length}`}
                  </span>
                  {selectedLocationId && (
                    <button
                      type="button"
                      onClick={() => { setSelectedParticipantId(null); setSelectedLocationId(null) }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 10, color: 'var(--lovers-red)', opacity: .7,
                        fontFamily: 'var(--font-lovers-body)', fontWeight: 700,
                        padding: '2px 0', letterSpacing: '0.03em',
                      }}
                    >
                      LIMPAR SELEÇÃO ×
                    </button>
                  )}
                </div>
                </div>{/* /map-sidebar-sticky */}
                <div className="map-sidebar-scroll">

                {/* lista de cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* estado vazio */}
                  {finalParticipants.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--lovers-brown)', opacity: .6, fontSize: 14 }}>
                      {distanceFilterKm
                        ? (
                          <>
                            <div style={{ marginBottom: 8 }}>Nenhum participante encontrado nesse raio.</div>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'var(--lovers-red)', color: 'var(--lovers-cream)', border: 0, fontSize: 12 }}
                              onClick={() => setDistanceFilterKm(null)}
                            >
                              Limpar distância
                            </button>
                          </>
                        )
                        : 'Nenhum participante encontrado'
                      }
                    </div>
                  )}

                  {finalParticipants.map(p => {
                    const isActive = selectedParticipantId === p.id
                    const locs = getParticipantLocations(p)
                    const multiUnit = locs.length > 1
                    const manyUnits = locs.length > 4

                    // enrich with distance
                    const locsForCard = locs.map(loc => {
                      const enriched = visibleLocationsWithDistance.find(
                        l => l.participantId === p.id && l.id === loc.id
                      )
                      return enriched || loc
                    })

                    const minDist = getParticipantMinDistance(p, visibleLocationsWithDistance)

                    return (
                      <div
                        id={`map-card-${p.id}`}
                        key={p.id}
                        className={`map-participant-card${isActive ? ' map-participant-card--active' : ''}`}
                      >
                        {/* cabeçalho do card */}
                        <div className="map-card-header">
                          {p.logo && (
                            <div className="map-card-logo">
                              <img src={p.logo} alt={`Logo ${p.name}`} />
                            </div>
                          )}
                          <div className="map-card-title-group">
                            <h3>{p.name}</h3>
                            <div className="map-card-meta">
                              {multiUnit ? `${locs.length} unidades` : locs[0]?.neighborhood}
                              {userLocation && Number.isFinite(minDist) && minDist !== Infinity
                                ? ` · ${formatDistance(minDist)}`
                                : ''}
                            </div>
                            {p.combo && (
                              <div className="map-card-combo">{p.combo.name}</div>
                            )}
                          </div>
                        </div>

                        {/* lista de unidades */}
                        <div className={`map-location-list${manyUnits ? ' map-location-list--many' : ''}`}>
                          {locsForCard.map(loc => {
                            const isLocActive = selectedLocationId === loc.id
                            const hasCoords = Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)
                            const directionsUrl = getDirectionsUrl(loc, userLocation)
                            const distStr = formatDistance(loc.distanceKm)

                            return (
                              <div
                                key={loc.id}
                                className={`map-location-row${isLocActive ? ' map-location-row--active' : ''}`}
                                onClick={() => focusLocation(loc)}
                              >
                                <div className="map-location-topline">
                                  <strong className="map-location-title">{loc.locationName}</strong>
                                  {userLocation && distStr && (
                                    <span className="map-location-distance">{distStr}</span>
                                  )}
                                </div>

                                {(loc.neighborhood || loc.city) && (
                                  <div className="map-location-meta">
                                    {[loc.neighborhood, loc.city].filter(Boolean).join(' · ')}
                                  </div>
                                )}

                                {loc.address && (
                                  <div className="map-location-address">{loc.address}</div>
                                )}

                                <div className="map-location-actions">
                                  {hasCoords && (
                                    <button
                                      type="button"
                                      className={`map-location-action${isLocActive ? ' map-location-action--active' : ''}`}
                                      onClick={e => { e.stopPropagation(); focusLocation(loc) }}
                                    >
                                      Ver pin
                                    </button>
                                  )}
                                  {directionsUrl && (
                                    <a
                                      className="map-location-action map-location-action--primary"
                                      href={directionsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      Traçar rota
                                    </a>
                                  )}
                                  {!multiUnit && p.combo?.slug && (
                                    <button
                                      type="button"
                                      className="map-location-action"
                                      onClick={e => { e.stopPropagation(); navigate(`/lovers/combos/${p.combo.slug}`) }}
                                    >
                                      Ver combo
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className={`map-location-action${isInRoute(loc) ? ' map-location-action--selected' : ''}`}
                                    onClick={e => { e.stopPropagation(); toggleRouteLocation(loc) }}
                                  >
                                    {isInRoute(loc) ? 'REMOVER DA ROTA' : 'ADICIONAR À ROTA'}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {multiUnit && p.combo?.slug && (
                          <div style={{ marginTop: 12 }}>
                            <button
                              className="btn btn-lovers btn-sm"
                              style={{ fontSize: 12 }}
                              onClick={() => navigate(`/lovers/combos/${p.combo.slug}`)}
                            >
                              Ver combo
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* painel de diagnóstico — só com debug=1 */}
                {mapDebug && (
                  <div className="map-debug-panel">
                    <strong>Diagnóstico do mapa</strong>
                    <div>Participantes: {mapDiagnostics.participants}</div>
                    <div>Unidades: {mapDiagnostics.units}</div>
                    <div>Com coordenadas: {mapDiagnostics.withCoords}</div>
                    <div>Sem coordenadas: {mapDiagnostics.withoutCoords.length}</div>
                    <div>Com Maps URL: {mapDiagnostics.withMapsUrl}</div>
                    <div>Sem Maps URL: {mapDiagnostics.withoutMapsUrl.length}</div>

                    {mapDiagnostics.withoutCoords.length > 0 && (
                      <details>
                        <summary>Unidades sem coordenadas ({mapDiagnostics.withoutCoords.length})</summary>
                        <ul>
                          {mapDiagnostics.withoutCoords.map(item => <li key={item}>{item}</li>)}
                        </ul>
                      </details>
                    )}

                    {mapDiagnostics.withoutMapsUrl.length > 0 && (
                      <details>
                        <summary>Unidades sem Maps URL ({mapDiagnostics.withoutMapsUrl.length})</summary>
                        <ul>
                          {mapDiagnostics.withoutMapsUrl.map(item => <li key={item}>{item}</li>)}
                        </ul>
                      </details>
                    )}

                    {mapDiagnostics.duplicatedCoords.length > 0 && (
                      <details>
                        <summary>Coordenadas duplicadas ({mapDiagnostics.duplicatedCoords.length})</summary>
                        <ul>
                          {mapDiagnostics.duplicatedCoords.map(group => (
                            <li key={group.coords}>{group.coords}: {group.items.join(', ')}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
                </div>{/* /map-sidebar-scroll */}
              </div>{/* /map-sidebar */}
            </div>

            {routeLocations.length > 0 && (
              <button type="button" className="sweet-route-fab" onClick={() => setIsRoutePanelOpen(true)}>
                MINHA ROTA · {routeLocations.length} {routeLocations.length === 1 ? 'PARADA' : 'PARADAS'}
              </button>
            )}

            {isRoutePanelOpen && (
              <div className="sweet-route-overlay" role="dialog" aria-modal="true" onClick={() => setIsRoutePanelOpen(false)}>
                <div className="sweet-route-panel" onClick={e => e.stopPropagation()}>
                  <button type="button" className="sweet-route-close" onClick={() => setIsRoutePanelOpen(false)} aria-label="Fechar rota">×</button>
                  <div className="sweet-route-header">
                    <span className="sweet-route-kicker">ROTA DA DOÇURA</span>
                    <h2>MINHA ROTA LOVERS</h2>
                    <p>Estes são os destinos que você escolheu para viver o Sweet &amp; Coffee Week Lovers. Tire um print, compartilhe com os amigos e trace sua rota.</p>
                  </div>
                  <div className="sweet-route-summary">
                    <strong>{routeLocations.length}</strong>
                    <span>{routeLocations.length === 1 ? 'PARADA ESCOLHIDA' : 'PARADAS ESCOLHIDAS'}</span>
                  </div>
                  <ol className="sweet-route-list">
                    {routeLocations.map((location, index) => (
                      <li className="sweet-route-stop" key={location.id}>
                        <span className="sweet-route-number">{index + 1}</span>
                        <div>
                          <strong>{location.participantName}</strong>
                          <span>{location.locationName}</span>
                          <small>{[location.neighborhood, location.city].filter(Boolean).join(' · ')}</small>
                          {location.address && <small>{location.address}</small>}
                        </div>
                        <button type="button" className="sweet-route-remove" onClick={() => removeRouteLocation(location.id)}>REMOVER</button>
                      </li>
                    ))}
                  </ol>
                  {routeLocations.length > 9 && (
                    <p className="sweet-route-warning">O Google Maps aceita um número limitado de paradas. O link usará as primeiras 9 paradas.</p>
                  )}
                  <div className="sweet-route-actions">
                    {routeMapsUrl && (
                      <a href={routeMapsUrl} target="_blank" rel="noopener noreferrer" className="sweet-route-primary">
                        ABRIR ROTA NO GOOGLE MAPS
                      </a>
                    )}
                    <button type="button" onClick={clearRoute} className="sweet-route-secondary">LIMPAR ROTA</button>
                  </div>
                </div>
              </div>
            )}
</>
          )}

        </div>

        <style>{`
          /* ── layout ── */
          .mapa-layout {
            display: grid;
            grid-template-columns: 1.6fr 1fr;
            gap: 24px;
            align-items: start;
          }
          .mapa-container {
            height: 580px;
            position: relative;
            border-radius: 20px;
            overflow: hidden;
            border: 1px solid rgba(135,14,45,.2);
          }
          .map-sidebar {
            display: flex;
            flex-direction: column;
            height: 580px;
            min-height: 0;
            overflow: hidden;
          }
          .map-sidebar-sticky {
            flex: 0 0 auto;
            padding-bottom: 14px;
          }
          .map-sidebar-scroll {
            flex: 1 1 auto;
            min-height: 0;
            overflow-y: auto;
            overscroll-behavior: contain;
            padding-right: 6px;
            padding-bottom: 24px;
          }
          .map-sidebar-scroll::-webkit-scrollbar { width: 6px; }
          .map-sidebar-scroll::-webkit-scrollbar-thumb {
            background: rgba(135,14,45,.35);
            border-radius: 999px;
          }
          .map-sidebar-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          /* ── rota ── */
          .map-location-action--selected {
            background: var(--lovers-pink);
            color: var(--lovers-cream);
            border-color: var(--lovers-pink);
          }
          .sweet-route-fab {
            position: fixed;
            right: 24px;
            bottom: 24px;
            z-index: 30;
            border: 0;
            border-radius: 999px;
            min-height: 54px;
            padding: 0 22px;
            background: var(--lovers-red);
            color: var(--lovers-cream);
            font-family: var(--font-lovers-body);
            font-weight: 900;
            font-size: 13px;
            letter-spacing: .08em;
            text-transform: uppercase;
            box-shadow: 0 18px 36px rgba(135,14,45,.28);
            cursor: pointer;
            transition: transform .15s, box-shadow .15s;
          }
          .sweet-route-fab:hover { transform: translateY(-2px); box-shadow: 0 22px 44px rgba(135,14,45,.34); }
          .sweet-route-overlay {
            position: fixed;
            inset: 0;
            z-index: 80;
            background: rgba(43,24,16,.52);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }
          .sweet-route-panel {
            position: relative;
            width: min(720px, 100%);
            max-height: min(86vh, 920px);
            overflow-y: auto;
            border-radius: 32px;
            background: linear-gradient(135deg, var(--lovers-cream) 0%, #fff4ea 100%);
            border: 2px solid rgba(135,14,45,.18);
            box-shadow: 0 30px 80px rgba(43,24,16,.28);
            padding: clamp(24px, 4vw, 42px);
          }
          .sweet-route-close {
            position: absolute;
            top: 18px;
            right: 18px;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            border: 1px solid rgba(135,14,45,.2);
            background: #fff;
            color: var(--lovers-red);
            font-size: 28px;
            line-height: 1;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .sweet-route-kicker {
            display: inline-flex;
            border-radius: 999px;
            padding: 7px 14px;
            background: var(--lovers-red);
            color: var(--lovers-cream);
            font-family: var(--font-lovers-body);
            font-size: 11px;
            font-weight: 900;
            letter-spacing: .1em;
            text-transform: uppercase;
          }
          .sweet-route-header h2 {
            margin: 14px 0 8px;
            font-family: var(--font-lovers-display);
            font-size: clamp(38px, 7vw, 72px);
            line-height: .88;
            color: var(--lovers-ink);
            text-transform: uppercase;
          }
          .sweet-route-header p {
            max-width: 540px;
            color: var(--lovers-ink);
            font-size: 15px;
            line-height: 1.5;
            opacity: .82;
          }
          .sweet-route-summary {
            margin: 20px 0 18px;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            border-radius: 20px;
            background: var(--lovers-red);
            color: var(--lovers-cream);
            padding: 10px 18px;
            font-family: var(--font-lovers-body);
            text-transform: uppercase;
            letter-spacing: .06em;
            font-size: 12px;
            font-weight: 900;
          }
          .sweet-route-summary strong { font-size: 32px; line-height: 1; font-weight: 900; }
          .sweet-route-list { display: grid; gap: 10px; padding: 0; margin: 0; list-style: none; }
          .sweet-route-stop {
            display: grid;
            grid-template-columns: 44px 1fr auto;
            gap: 14px;
            align-items: center;
            padding: 14px;
            border-radius: 18px;
            background: rgba(255,255,255,.82);
            border: 1px solid rgba(135,14,45,.14);
          }
          .sweet-route-number {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--lovers-red);
            color: var(--lovers-cream);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--font-lovers-body);
            font-weight: 900;
            font-size: 16px;
          }
          .sweet-route-stop > div { min-width: 0; }
          .sweet-route-stop strong {
            display: block;
            color: var(--lovers-ink);
            font-size: 16px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: .04em;
            line-height: 1.1;
          }
          .sweet-route-stop span,
          .sweet-route-stop small {
            display: block;
            color: var(--lovers-ink);
            opacity: .72;
            margin-top: 3px;
            font-size: 13px;
          }
          .sweet-route-remove {
            border: 1px solid var(--lovers-red);
            background: transparent;
            color: var(--lovers-red);
            border-radius: 999px;
            min-height: 34px;
            padding: 0 14px;
            font-family: var(--font-lovers-body);
            font-weight: 900;
            font-size: 11px;
            letter-spacing: .06em;
            text-transform: uppercase;
            cursor: pointer;
            white-space: nowrap;
            transition: background .15s, color .15s;
          }
          .sweet-route-remove:hover { background: var(--lovers-red); color: var(--lovers-cream); }
          .sweet-route-warning {
            margin-top: 14px;
            color: var(--lovers-red);
            font-weight: 800;
            font-size: 13px;
          }
          .sweet-route-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 24px;
          }
          .sweet-route-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            min-height: 48px;
            padding: 0 22px;
            background: var(--lovers-red);
            color: var(--lovers-cream);
            border: 1px solid var(--lovers-red);
            font-family: var(--font-lovers-body);
            font-weight: 900;
            font-size: 13px;
            letter-spacing: .06em;
            text-transform: uppercase;
            text-decoration: none;
            cursor: pointer;
            transition: transform .15s;
          }
          .sweet-route-primary:hover { transform: translateY(-1px); }
          .sweet-route-secondary {
            border-radius: 999px;
            min-height: 48px;
            padding: 0 22px;
            border: 1px solid var(--lovers-red);
            background: transparent;
            color: var(--lovers-red);
            font-family: var(--font-lovers-body);
            font-weight: 900;
            font-size: 13px;
            letter-spacing: .06em;
            text-transform: uppercase;
            cursor: pointer;
          }
          @media (max-width: 560px) {
            .sweet-route-fab { left: 16px; right: 16px; bottom: 16px; }
            .sweet-route-overlay { padding: 12px; }
            .sweet-route-panel { border-radius: 24px; padding: 24px; }
            .sweet-route-stop { grid-template-columns: 36px 1fr; }
            .sweet-route-remove { grid-column: 2; justify-self: start; margin-top: 4px; }
            .sweet-route-number { width: 36px; height: 36px; font-size: 14px; }
            .sweet-route-actions { flex-direction: column; }
            .sweet-route-primary, .sweet-route-secondary { width: 100%; justify-content: center; }
          }

          /* ── chips de filtro ── */
          .mapa-chip {
            font-family: var(--font-lovers-body);
            font-size: 11px;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 20px;
            border: 1.5px solid var(--lovers-red);
            cursor: pointer;
            transition: background .15s, color .15s;
            white-space: nowrap;
            text-transform: uppercase;
            letter-spacing: .05em;
          }
          .mapa-chip:hover { background: var(--lovers-red); color: #fff; }
          .mapa-chip:disabled { opacity: .6; cursor: default; }

          /* ── card do participante ── */
          .map-participant-card {
            background: #fff;
            border: 1.5px solid rgba(135,14,45,.22);
            border-radius: 18px;
            padding: 16px;
            transition: border-color .18s, background .18s, box-shadow .18s;
          }
          .map-participant-card--active {
            background: var(--lovers-cream);
            border-color: var(--lovers-red);
            box-shadow: 0 18px 42px rgba(135,14,45,.18);
          }

          /* ── cabeçalho do card ── */
          .map-card-header {
            display: flex;
            gap: 12px;
            align-items: center;
            margin-bottom: 18px;
          }
          .map-card-logo {
            width: 72px;
            height: 72px;
            border-radius: 16px;
            background: #fff;
            border: 1px solid rgba(135,14,45,.12);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex: 0 0 auto;
            padding: 0;
          }
          .map-card-logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            object-position: center;
            display: block;
          }
          .map-card-title-group {
            min-width: 0;
            flex: 1;
          }
          .map-card-title-group h3 {
            margin: 0;
            font-family: var(--font-lovers-display);
            font-size: clamp(28px, 2.2vw, 38px);
            line-height: .92;
            color: var(--lovers-ink);
            text-transform: uppercase;
            letter-spacing: .015em;
            text-wrap: balance;
          }
          .map-card-meta {
            margin-top: 8px;
            font-size: 13px;
            line-height: 1.2;
            font-family: var(--font-lovers-body);
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: .08em;
            color: var(--lovers-red);
          }
          .map-card-combo {
            margin-top: 3px;
            font-size: 12px;
            color: var(--lovers-brown);
            opacity: .7;
          }

          /* ── lista de unidades ── */
          .map-location-list {
            display: grid;
            gap: 12px;
          }
          .map-location-list--many {
            gap: 10px;
          }
          .map-location-row {
            padding: 14px;
            border-radius: 12px;
            background: rgba(255,255,255,.74);
            border: 1px solid rgba(135,14,45,.1);
            cursor: pointer;
            transition: border-color .18s, box-shadow .18s, background .18s;
          }
          .map-location-row:hover {
            border-color: rgba(135,14,45,.3);
          }
          .map-location-row--active {
            border-color: var(--lovers-red);
            background: rgba(214,54,72,.13);
            box-shadow: 0 8px 20px rgba(214,54,72,.14);
          }
          .map-location-list--many .map-location-row {
            padding: 12px;
          }

          /* ── conteúdo da unidade ── */
          .map-location-topline {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 8px;
          }
          .map-location-title {
            font-size: 16px;
            line-height: 1.1;
            font-weight: 900;
            color: var(--lovers-ink);
            text-transform: uppercase;
            letter-spacing: .035em;
          }
          .map-location-row--active .map-location-title {
            color: var(--lovers-red);
          }
          .map-location-distance {
            font-size: 12px;
            line-height: 1;
            font-weight: 900;
            color: var(--lovers-red);
            white-space: nowrap;
            font-family: var(--font-lovers-body);
            text-transform: uppercase;
            letter-spacing: .04em;
          }
          .map-location-meta {
            margin-top: 5px;
            font-size: 12px;
            line-height: 1.25;
            font-family: var(--font-lovers-body);
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: .08em;
            color: var(--lovers-red);
          }
          .map-location-address {
            margin-top: 7px;
            font-size: 13px;
            color: var(--lovers-ink);
            opacity: .82;
            line-height: 1.4;
          }

          /* ── botões de ação ── */
          .map-location-actions {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin-top: 8px;
          }
          .map-location-action {
            border: 1px solid rgba(135,14,45,.22);
            background: rgba(255,255,255,.82);
            color: var(--lovers-red);
            border-radius: 999px;
            min-height: 36px;
            padding: 0 16px;
            font-size: 12px;
            line-height: 1;
            font-weight: 900;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform .15s, background .15s, color .15s;
            font-family: var(--font-lovers-body);
            text-transform: uppercase;
            letter-spacing: .05em;
          }
          .map-location-action--primary {
            background: var(--lovers-red);
            color: var(--lovers-cream);
            border-color: var(--lovers-red);
          }
          .map-location-action--active {
            background: var(--lovers-red);
            color: #fff;
            border-color: var(--lovers-red);
          }
          .map-location-action:hover { transform: translateY(-1px); }

          input[type=text]:focus { border-color: var(--lovers-red) !important; }

          /* ── debug panel ── */
          .map-debug-panel {
            margin-top: 16px;
            padding: 14px;
            border-radius: 14px;
            background: rgba(43,24,16,.06);
            border: 1px dashed rgba(43,24,16,.24);
            color: var(--lovers-ink);
            font-size: 12px;
            line-height: 1.5;
            font-family: 'JetBrains Mono', monospace;
          }
          .map-debug-panel strong {
            display: block;
            margin-bottom: 8px;
            color: var(--lovers-red);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: .08em;
          }
          .map-debug-panel details { margin-top: 8px; }
          .map-debug-panel summary { cursor: pointer; font-weight: 800; }
          .map-debug-panel ul { margin: 6px 0 0; padding-left: 18px; }

          /* ── responsivo ── */
          @media (max-width: 880px) {
            .mapa-layout { grid-template-columns: 1fr; }
            .mapa-container { height: 360px; }
            .map-sidebar { height: auto; overflow: visible; }
            .map-sidebar-scroll { max-height: 70vh; overflow-y: auto; }
          }
          @media (max-width: 560px) {
            .map-card-logo { width: 56px; height: 56px; border-radius: 13px; }
            .map-card-title-group h3 { font-size: clamp(24px, 8vw, 30px); line-height: .95; }
            .map-card-meta { font-size: 11px; }
            .map-location-title { font-size: 14px; }
            .map-location-meta { font-size: 10px; }
            .map-location-address { font-size: 12px; }
            .map-location-topline { flex-direction: column; align-items: flex-start; gap: 2px; }
            .map-location-actions { gap: 5px; }
            .map-location-action { min-height: 34px; padding: 0 12px; font-size: 11px; flex: 1; }
          }
        `}</style>
      </section>
    </div>
  )
}
