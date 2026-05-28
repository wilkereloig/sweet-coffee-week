import React, { useState, useEffect, useRef, useMemo } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { I } from '../../../components/icons'
import { EmptyState } from '../../../components/placeholders'
import { PARTICIPANTS } from '../../../data/participants'
import { COMBOS } from '../../../data/combos'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

const NATAL_CENTER = { lat: -5.7945, lng: -35.2110 }
const NATAL_ZOOM = 13

const PIN_RED = '#D63648'
const PIN_DARK = '#870E2D'
const PIN_CREAM = '#FFF1E6'

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

if (GOOGLE_MAPS_API_KEY) {
  setOptions({ key: GOOGLE_MAPS_API_KEY })
}

function pinIcon(selected) {
  return {
    path: 'M12 1C5.924 1 1 5.924 1 12c0 9.5 11 19 11 19S23 21.5 23 12C23 5.924 18.076 1 12 1z',
    fillColor: selected ? PIN_DARK : PIN_RED,
    fillOpacity: 1,
    strokeColor: PIN_CREAM,
    strokeWeight: 1.5,
    scale: selected ? 1.35 : 1,
    anchor: new google.maps.Point(12, 31),
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

        locations.forEach(loc => {
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

        if (locations.length > 1) {
          const bounds = new google.maps.LatLngBounds()
          locations.forEach(loc => bounds.extend({ lat: loc.latitude, lng: loc.longitude }))
          map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 })
        } else if (locations.length === 1) {
          map.setCenter({ lat: locations[0].latitude, lng: locations[0].longitude })
          map.setZoom(15)
        }

        instanceRef.current = { map, infoWindow }
      } catch (e) {
        console.error('[Google Maps Load Error]', { name: e?.name, message: e?.message, error: e })
        onError?.('load-error')
      }
    })()

    return () => {
      cancelled = true
      Object.values(markersRef.current).forEach(m => m.setMap(null))
      instanceRef.current = null
      markersRef.current = {}
    }
  }, [])

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
  }, [selectedLocationId])

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
    const q = search.toLowerCase()
    return participants.filter(p => {
      const locs = getParticipantLocations(p)
      const matchSearch = !q || (
        p.name.toLowerCase().includes(q) ||
        locs.some(l =>
          (l.locationName || '').toLowerCase().includes(q) ||
          (l.neighborhood || '').toLowerCase().includes(q) ||
          (l.address || '').toLowerCase().includes(q) ||
          (l.city || '').toLowerCase().includes(q)
        )
      )
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

  function handleSelectLocation(location) {
    setSelectedParticipantId(location.participantId)
    setSelectedLocationId(location.id)
    const el = document.getElementById(`map-card-${location.participantId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  // ── derived ui state ───────────────────────────────────────────────────────

  const hasMissingCoords = allLocations.some(l => !Number.isFinite(l.latitude) || !Number.isFinite(l.longitude))
  const hasData = true

  const selectedLocation = useMemo(() =>
    selectedLocationId ? allLocations.find(l => l.id === selectedLocationId) : null,
  [selectedLocationId, allLocations])

  const selectedParticipant = useMemo(() =>
    selectedParticipantId ? participants.find(p => p.id === selectedParticipantId) : null,
  [selectedParticipantId, participants])

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

      <section style={{ paddingBottom: 80, position: 'relative' }}>
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
                    <div style={{ fontFamily: 'var(--font-lovers-display)', fontSize: 22, lineHeight: 1.1, color: 'var(--lovers-ink)', marginBottom: 4 }}>
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
              <div className="mapa-list">

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
              </div>
            </div>
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
          .mapa-list {
            height: 580px;
            overflow-y: auto;
            padding-right: 4px;
          }
          .mapa-list::-webkit-scrollbar { width: 4px; }
          .mapa-list::-webkit-scrollbar-thumb {
            background: rgba(135,14,45,.3);
            border-radius: 4px;
          }

          /* ── chips de filtro ── */
          .mapa-chip {
            font-family: var(--font-lovers-body);
            font-size: 11px;
            padding: 4px 10px;
            border-radius: 20px;
            border: 1.5px solid var(--lovers-red);
            cursor: pointer;
            transition: background .15s, color .15s;
            white-space: nowrap;
          }
          .mapa-chip:hover { background: var(--lovers-red); color: #fff; }
          .mapa-chip:disabled { opacity: .6; cursor: default; }

          /* ── card do participante ── */
          .map-participant-card {
            background: #fff;
            border: 1.5px solid rgba(135,14,45,.15);
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
            margin-bottom: 14px;
          }
          .map-card-logo {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            background: #fff;
            border: 1px solid rgba(135,14,45,.12);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex: 0 0 auto;
          }
          .map-card-logo img {
            max-width: 82%;
            max-height: 82%;
            object-fit: contain;
          }
          .map-card-title-group {
            min-width: 0;
            flex: 1;
          }
          .map-card-title-group h3 {
            margin: 0;
            font-family: var(--font-lovers-display);
            font-size: 22px;
            line-height: 1;
            color: var(--lovers-ink);
          }
          .map-card-meta {
            margin-top: 5px;
            font-size: 11px;
            font-family: var(--font-lovers-body);
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: .06em;
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
            gap: 8px;
          }
          .map-location-list--many {
            gap: 6px;
          }
          .map-location-row {
            padding: 10px 12px;
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
            background: rgba(135,14,45,.08);
            box-shadow: 0 8px 20px rgba(135,14,45,.10);
          }
          .map-location-list--many .map-location-row {
            padding: 8px 10px;
          }

          /* ── conteúdo da unidade ── */
          .map-location-topline {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 8px;
          }
          .map-location-title {
            font-size: 13px;
            font-weight: 700;
            color: var(--lovers-ink);
          }
          .map-location-row--active .map-location-title {
            color: var(--lovers-red);
          }
          .map-location-distance {
            font-size: 11px;
            font-weight: 900;
            color: var(--lovers-red);
            white-space: nowrap;
            font-family: var(--font-lovers-body);
          }
          .map-location-meta {
            margin-top: 3px;
            font-size: 10px;
            font-family: var(--font-lovers-body);
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: .07em;
            color: var(--lovers-red);
            opacity: .75;
          }
          .map-location-address {
            margin-top: 5px;
            font-size: 11px;
            color: var(--lovers-brown);
            opacity: .65;
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
            border: 1px solid rgba(135,14,45,.18);
            background: rgba(255,255,255,.82);
            color: var(--lovers-red);
            border-radius: 999px;
            min-height: 30px;
            padding: 0 11px;
            font-size: 11px;
            font-weight: 900;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform .15s, background .15s, color .15s;
            font-family: var(--font-lovers-body);
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
            .mapa-list { height: auto; }
          }
          @media (max-width: 560px) {
            .map-card-logo { width: 44px; height: 44px; border-radius: 12px; }
            .map-card-title-group h3 { font-size: 19px; }
            .map-location-topline { flex-direction: column; align-items: flex-start; gap: 2px; }
            .map-location-actions { gap: 5px; }
            .map-location-action { min-height: 32px; flex: 1; }
          }
        `}</style>
      </section>
    </div>
  )
}
