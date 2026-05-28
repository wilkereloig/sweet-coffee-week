import React, { useState, useEffect, useRef, useMemo } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { I } from '../../../components/icons'
import { EmptyState } from '../../../components/placeholders'
import { PARTICIPANTS } from '../../../data/participants'
import { COMBOS } from '../../../data/combos'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

const NATAL_CENTER = { lat: -5.7945, lng: -35.2110 }
const NATAL_ZOOM = 13

const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'
const PIN_RED = '#D63648'
const PIN_DARK = '#870E2D'
const PIN_CREAM = '#FFF1E6'

function buildPinEl(selected) {
  const el = document.createElement('div')
  el.style.cssText = 'cursor:pointer;filter:drop-shadow(0 2px 6px rgba(43,24,16,.45));transition:transform .15s'
  const fill = selected ? PIN_DARK : PIN_RED
  el.innerHTML = `<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 1C5.924 1 1 5.924 1 12c0 9.5 11 19 11 19S23 21.5 23 12C23 5.924 18.076 1 12 1z" fill="${fill}" stroke="${PIN_CREAM}" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="${PIN_CREAM}"/></svg>`
  return el
}

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

if (GOOGLE_MAPS_API_KEY) {
  setOptions({ key: GOOGLE_MAPS_API_KEY })
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`
}

function GoogleMap({ pinLocations, selectedLocationId, onMarkerClick, userLocation, mapInstanceRef, onError }) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)
  const markersRef = useRef({})
  const userMarkerRef = useRef(null)

  useEffect(() => {
    const previous = window.gm_authFailure
    window.gm_authFailure = () => {
      console.error('[Google Maps Auth Failure]', {
        hostname: window.location.hostname,
        href: window.location.href,
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
        const { AdvancedMarkerElement } = await importLibrary('marker')
        if (cancelled || !mapRef.current || instanceRef.current) return

        const map = new Map(mapRef.current, {
          center: NATAL_CENTER,
          zoom: NATAL_ZOOM,
          mapId: GOOGLE_MAPS_MAP_ID,
          scrollwheel: false,
          gestureHandling: 'cooperative',
        })

        if (mapInstanceRef) mapInstanceRef.current = map

        pinLocations.forEach(loc => {
          const el = buildPinEl(false)
          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: loc.latitude, lng: loc.longitude },
            title: `${loc.participantName} — ${loc.locationName}`,
            content: el,
          })
          marker.addListener('gmp-click', () => onMarkerClick(loc))
          markersRef.current[loc.id] = { marker, el }
        })

        if (pinLocations.length > 1) {
          const bounds = new google.maps.LatLngBounds()
          pinLocations.forEach(loc => bounds.extend({ lat: loc.latitude, lng: loc.longitude }))
          map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
        } else if (pinLocations.length === 1) {
          map.setCenter({ lat: pinLocations[0].latitude, lng: pinLocations[0].longitude })
          map.setZoom(15)
        }

        instanceRef.current = { map, AdvancedMarkerElement }
      } catch (e) {
        console.error('[Google Maps Load Error]', { name: e?.name, message: e?.message, error: e })
        onError?.('load-error')
      }
    })()

    return () => {
      cancelled = true
      Object.values(markersRef.current).forEach(({ marker }) => { marker.map = null })
      if (mapInstanceRef) mapInstanceRef.current = null
      instanceRef.current = null
      markersRef.current = {}
    }
  }, [])

  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, { el }]) => {
      const isSelected = selectedLocationId === id
      const path = el.querySelector('path')
      if (path) path.setAttribute('fill', isSelected ? PIN_DARK : PIN_RED)
      el.style.transform = isSelected ? 'scale(1.35)' : 'scale(1)'
    })
  }, [selectedLocationId])

  useEffect(() => {
    if (!instanceRef.current) return
    const { map, AdvancedMarkerElement } = instanceRef.current
    if (userMarkerRef.current) { userMarkerRef.current.map = null; userMarkerRef.current = null }
    if (userLocation) {
      const dot = document.createElement('div')
      dot.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#4285F4;border:2.5px solid white;box-shadow:0 2px 4px rgba(0,0,0,.3)'
      userMarkerRef.current = new AdvancedMarkerElement({
        map,
        position: { lat: userLocation.lat, lng: userLocation.lng },
        title: 'Minha localização',
        content: dot,
      })
      map.panTo({ lat: userLocation.lat, lng: userLocation.lng })
      map.setZoom(14)
    }
  }, [userLocation])

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
}

export function MapaGooglePage({ navigate }) {
  const [selectedParticipantId, setSelectedParticipantId] = useState(null)
  const [selectedLocationId, setSelectedLocationId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterBairro, setFilterBairro] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [locLoading, setLocLoading] = useState(false)
  const [locError, setLocError] = useState(null)
  const [mapError, setMapError] = useState(null)
  const mapInstanceRef = useRef(null)

  const participants = useMemo(() =>
    PARTICIPANTS.map(p => ({
      ...p,
      combo: COMBOS.find(c => c.participantId === p.id) || null,
    })),
  [])

  const allLocations = useMemo(() =>
    participants.flatMap(getParticipantLocations),
  [participants])

  const pinLocations = useMemo(() =>
    allLocations.filter(l => Number.isFinite(l.latitude) && Number.isFinite(l.longitude)),
  [allLocations])

  console.log('[Mapa Locations]', {
    participants: participants.length,
    allLocations: allLocations.length,
    pinLocations: pinLocations.length,
    withoutCoords: allLocations
      .filter(l => !Number.isFinite(l.latitude) || !Number.isFinite(l.longitude))
      .map(l => `${l.participantName} — ${l.locationName}`)
  })

  function focusLocation(location) {
    setSelectedParticipantId(location.participantId)
    setSelectedLocationId(location.id)
    if (mapInstanceRef.current && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
      mapInstanceRef.current.panTo({ lat: location.latitude, lng: location.longitude })
      mapInstanceRef.current.setZoom(15)
    }
  }

  function handleMarkerClick(location) {
    setSelectedParticipantId(location.participantId)
    setSelectedLocationId(location.id)
    const el = document.getElementById(`map-card-${location.participantId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  function handleLocate() {
    if (userLocation) { setUserLocation(null); setLocError(null); return }
    if (!navigator.geolocation) { setLocError('Geolocalização não suportada neste navegador.'); return }
    setLocLoading(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocLoading(false) },
      err => {
        setLocLoading(false)
        if (err.code === 1) setLocError('Permissão negada. Ative a localização no navegador.')
        else setLocError('Não foi possível obter sua localização.')
      },
      { timeout: 10000 }
    )
  }

  const neighborhoods = useMemo(() => {
    const counts = {}
    allLocations.forEach(l => {
      if (l.neighborhood) counts[l.neighborhood] = (counts[l.neighborhood] || 0) + 1
    })
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, count }))
  }, [allLocations])

  const filteredParticipants = useMemo(() => {
    const q = search.toLowerCase()
    return participants
      .filter(p => {
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
        const matchBairro = !filterBairro ||
          locs.some(l => l.neighborhood === filterBairro)
        return matchSearch && matchBairro
      })
      .map(p => ({
        ...p,
        dist: userLocation && p.latitude && p.longitude
          ? haversineKm(userLocation.lat, userLocation.lng, p.latitude, p.longitude)
          : null,
      }))
      .sort((a, b) => {
        if (a.dist !== null && b.dist !== null) return a.dist - b.dist
        return 0
      })
  }, [participants, search, filterBairro, userLocation])

  const hasMissingCoords = allLocations.some(l => !Number.isFinite(l.latitude) || !Number.isFinite(l.longitude))
  const hasData = true

  const selectedLocation = useMemo(() =>
    selectedLocationId ? allLocations.find(l => l.id === selectedLocationId) : null,
  [selectedLocationId, allLocations])

  const selectedParticipant = useMemo(() =>
    selectedParticipantId ? participants.find(p => p.id === selectedParticipantId) : null,
  [selectedParticipantId, participants])

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
                    pinLocations={pinLocations}
                    selectedLocationId={selectedLocationId}
                    onMarkerClick={handleMarkerClick}
                    userLocation={userLocation}
                    mapInstanceRef={mapInstanceRef}
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

              <div className="mapa-list">
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

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
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

                <button
                  onClick={handleLocate}
                  disabled={locLoading}
                  className="mapa-chip"
                  style={{
                    width: '100%', marginBottom: 8, padding: '8px 12px',
                    background: userLocation ? 'var(--lovers-red)' : 'transparent',
                    color: userLocation ? '#fff' : 'var(--lovers-red)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: locLoading ? .6 : 1,
                    cursor: locLoading ? 'default' : 'pointer',
                  }}
                >
                  <span style={{ fontSize: 14 }}>📍</span>
                  {locLoading ? 'Obtendo localização…' : userLocation ? 'Minha localização ativa' : 'Usar minha localização'}
                </button>
                {locError && (
                  <div className="mono" style={{ fontSize: 11, color: 'var(--lovers-red)', marginBottom: 8, lineHeight: 1.4 }}>
                    {locError}
                  </div>
                )}

                <div className="mono mb-3" style={{ color: 'var(--lovers-red)', fontSize: 12 }}>
                  {filteredParticipants.length === participants.length
                    ? `PARTICIPANTES · ${participants.length}`
                    : `MOSTRANDO · ${filteredParticipants.length} de ${participants.length}`}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredParticipants.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--lovers-brown)', opacity: .5, fontSize: 14 }}>
                      Nenhum participante encontrado
                    </div>
                  )}
                  {filteredParticipants.map(p => {
                    const isActive = selectedParticipantId === p.id
                    const locs = getParticipantLocations(p)
                    const multiUnit = locs.length > 1

                    return (
                      <div
                        id={`map-card-${p.id}`}
                        key={p.id}
                        style={{
                          background: isActive ? 'var(--lovers-cream)' : '#fff',
                          border: `1.5px solid ${isActive ? 'var(--lovers-red)' : 'rgba(135,14,45,.15)'}`,
                          borderRadius: 14, padding: '14px 16px',
                          transition: 'border-color .15s, background .15s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: multiUnit ? 10 : 4 }}>
                          <div>
                            {!multiUnit && (
                              <div className="mono" style={{ color: 'var(--lovers-red)', fontSize: 10, marginBottom: 2 }}>
                                {locs[0]?.neighborhood}
                              </div>
                            )}
                            <div style={{ fontFamily: 'var(--font-lovers-display)', fontSize: 18, lineHeight: 1.2, color: 'var(--lovers-ink)' }}>
                              {p.name}
                            </div>
                            {multiUnit && (
                              <div className="mono" style={{ color: 'var(--lovers-red)', fontSize: 10, marginTop: 2 }}>
                                {locs.length} UNIDADES
                              </div>
                            )}
                            {p.combo && (
                              <div style={{ fontSize: 13, color: 'var(--lovers-brown)', opacity: .75, marginTop: 2 }}>
                                {p.combo.name}
                              </div>
                            )}
                          </div>
                          {p.dist !== null && (
                            <div className="mono" style={{ fontSize: 10, color: '#4285F4', fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>
                              {formatDist(p.dist)}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: multiUnit ? 8 : 0 }}>
                          {locs.map(loc => {
                            const isLocActive = selectedLocationId === loc.id
                            const hasCoords = Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)
                            const mapsUrl = getLocationMapsUrl(loc)

                            return (
                              <div
                                key={loc.id}
                                style={{
                                  background: isLocActive ? 'rgba(214,54,72,.06)' : 'transparent',
                                  borderRadius: 8,
                                  padding: multiUnit ? '8px 10px' : 0,
                                  border: multiUnit
                                    ? `1px solid ${isLocActive ? 'rgba(214,54,72,.3)' : 'rgba(135,14,45,.1)'}`
                                    : 'none',
                                  transition: 'background .15s, border-color .15s',
                                }}
                              >
                                {multiUnit && (
                                  <div className="mono" style={{ fontSize: 10, color: 'var(--lovers-red)', marginBottom: 3 }}>
                                    {loc.locationName} · {loc.neighborhood}
                                  </div>
                                )}
                                {loc.address && (
                                  <div className="mono" style={{
                                    fontSize: 11, color: 'var(--lovers-brown)', opacity: .65,
                                    marginBottom: multiUnit ? 8 : 6, lineHeight: 1.4,
                                  }}>
                                    {loc.address}
                                  </div>
                                )}
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  {hasCoords && (
                                    <button
                                      className="btn btn-sm"
                                      style={{
                                        background: isLocActive ? 'var(--lovers-red)' : 'transparent',
                                        color: isLocActive ? '#fff' : 'var(--lovers-red)',
                                        border: '1.5px solid var(--lovers-red)',
                                        fontSize: 11, padding: '3px 10px',
                                        cursor: 'pointer',
                                      }}
                                      onClick={() => focusLocation(loc)}
                                    >
                                      Ver pin
                                    </button>
                                  )}
                                  {mapsUrl && (
                                    <a
                                      href={mapsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-sm"
                                      style={{ background: 'var(--lovers-red)', color: 'var(--lovers-cream)', border: 0, fontSize: 11, padding: '3px 10px' }}
                                      onClick={e => e.stopPropagation()}
                                    >
                                      Mapa
                                    </a>
                                  )}
                                  {!multiUnit && p.combo?.slug && (
                                    <button
                                      className="btn btn-lovers btn-sm"
                                      style={{ fontSize: 11, padding: '3px 10px' }}
                                      onClick={() => navigate(`/lovers/combos/${p.combo.slug}`)}
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
                          <div style={{ marginTop: 10 }}>
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
              </div>
            </div>
            </>
          )}

        </div>

        <style>{`
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
          .mapa-chip:hover {
            background: var(--lovers-red);
            color: #fff;
          }
          input[type=text]:focus {
            border-color: var(--lovers-red) !important;
          }
          @media (max-width: 880px) {
            .mapa-layout { grid-template-columns: 1fr; }
            .mapa-container { height: 360px; }
            .mapa-list { height: auto; }
            .mapa-selected-card {
              position: fixed !important;
              bottom: 0 !important;
              left: 0 !important;
              right: 0 !important;
              border-radius: 20px 20px 0 0 !important;
              max-height: 40vh;
              overflow-y: auto;
              animation: mapaSlideUp .25s ease;
            }
            @keyframes mapaSlideUp {
              from { transform: translateY(100%); }
              to   { transform: translateY(0); }
            }
          }
        `}</style>
      </section>
    </div>
  )
}
