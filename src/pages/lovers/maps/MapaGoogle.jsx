import React, { useState, useEffect, useRef } from 'react'
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

console.log('[Mapa Pins]', {
  total: PARTICIPANTS.length,
  withAddress: PARTICIPANTS.filter(p => p.address).length,
  withCoords: PARTICIPANTS.filter(p => p.latitude && p.longitude).length,
  withoutCoords: PARTICIPANTS.filter(p => p.address && (!p.latitude || !p.longitude)).map(p => p.name),
})

if (GOOGLE_MAPS_API_KEY) {
  setOptions({ key: GOOGLE_MAPS_API_KEY })
}

function getMapsSearchUrl(p) {
  if (!p?.address) return null
  const query = encodeURIComponent(`${p.address}, ${p.city || 'Natal/RN'}`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

function getMapsDirectionsUrl(p) {
  if (p?.latitude && p?.longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`
  }
  return getMapsSearchUrl(p)
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

function GoogleMap({ participants, selected, onSelect, userLocation, onError }) {
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
    if (!GOOGLE_MAPS_API_KEY) {
      onError?.('missing-key')
      return
    }
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

        const coords = participants.filter(p => p.latitude && p.longitude)

        coords.forEach(p => {
          const el = buildPinEl(false)
          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: p.latitude, lng: p.longitude },
            title: p.name,
            content: el,
          })
          marker.addListener('gmp-click', () => onSelect(p))
          markersRef.current[p.id] = { marker, el }
        })

        if (coords.length > 1) {
          const bounds = new google.maps.LatLngBounds()
          coords.forEach(p => bounds.extend({ lat: p.latitude, lng: p.longitude }))
          map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
        } else if (coords.length === 1) {
          map.setCenter({ lat: coords[0].latitude, lng: coords[0].longitude })
          map.setZoom(15)
        }

        instanceRef.current = { map, AdvancedMarkerElement }
      } catch (e) {
        console.error('[Google Maps Load Error]', {
          name: e?.name,
          message: e?.message,
          stack: e?.stack,
          error: e,
        })
        onError?.('load-error')
      }
    })()

    return () => {
      cancelled = true
      Object.values(markersRef.current).forEach(({ marker }) => { marker.map = null })
      instanceRef.current = null
      markersRef.current = {}
    }
  }, [])

  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, { el }]) => {
      const isSelected = selected?.id === id
      const path = el.querySelector('path')
      if (path) path.setAttribute('fill', isSelected ? PIN_DARK : PIN_RED)
      el.style.transform = isSelected ? 'scale(1.35)' : 'scale(1)'
    })
    if (selected?.latitude && selected?.longitude && instanceRef.current) {
      instanceRef.current.map.panTo({ lat: selected.latitude, lng: selected.longitude })
    }
  }, [selected])

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
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filterBairro, setFilterBairro] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [locLoading, setLocLoading] = useState(false)
  const [locError, setLocError] = useState(null)
  const [mapError, setMapError] = useState(null)

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

  const participants = PARTICIPANTS.map(p => ({
    ...p,
    combo: COMBOS.find(c => c.participantId === p.id) || null,
  }))

  // Flat list: one entry per unit (location). Used for map pins.
  // When participant has multiple units, each unit becomes its own pin.
  // When participant has only 1 unit (or no locations[]), there is a single pin per participant.
  // eslint-disable-next-line no-unused-vars
  const mapLocations = participants.flatMap(p => {
    const units = (p.locations && p.locations.length > 0) ? p.locations : [{
      id: p.id, name: '', address: p.address, neighborhood: p.neighborhood, city: p.city,
      latitude: p.latitude, longitude: p.longitude, mapsUrl: p.mapsUrl,
    }]
    return units.map(loc => ({
      id: loc.id || `${p.id}-${loc.name || 'principal'}`,
      participantId: p.id,
      participantName: p.name,
      participantSlug: p.slug,
      locationName: loc.name || '',
      name: (units.length > 1 && loc.name) ? `${p.name} — ${loc.name}` : p.name,
      address: loc.address || '',
      neighborhood: loc.neighborhood || p.neighborhood || '',
      city: loc.city || p.city || '',
      latitude: loc.latitude ?? null,
      longitude: loc.longitude ?? null,
      mapsUrl: loc.mapsUrl || '',
      logo: p.logo,
      brandColor: p.brandColor,
      instagram: p.instagram,
      combo: p.combo,
    }))
  })

  const neighborhoods = [...new Set(participants.map(p => p.neighborhood).filter(Boolean))]
    .sort()
    .map(n => ({ name: n, count: participants.filter(p => p.neighborhood === n).length }))

  const filtered = participants
    .filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
      const matchBairro = !filterBairro || p.neighborhood === filterBairro
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

  const hasData = false
  const hasMissingCoords = participants.some(p => p.address && (!p.latitude || !p.longitude))

  function handleListClick(p) {
    setSelected(prev => prev?.id === p.id ? null : p)
  }

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
                    participants={participants}
                    selected={selected}
                    onSelect={setSelected}
                    userLocation={userLocation}
                    onError={setMapError}
                  />
                )}

                {selected && (
                  <div className="mapa-selected-card" style={{
                    position: 'absolute', bottom: 16, left: 16, right: 16,
                    zIndex: 1000,
                    background: 'var(--lovers-cream)',
                    border: '2px solid var(--lovers-red)',
                    borderRadius: 16, padding: '16px 20px',
                    boxShadow: '0 8px 32px rgba(43,24,16,.2)',
                  }}>
                    <button
                      onClick={() => setSelected(null)}
                      style={{
                        position: 'absolute', top: 8, right: 12,
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 20, color: 'var(--lovers-red)', lineHeight: 1,
                      }}
                    >×</button>
                    <div className="mono" style={{ color: 'var(--lovers-red)', fontSize: 11, marginBottom: 4 }}>
                      {selected.neighborhood}
                    </div>
                    <div style={{ fontFamily: 'var(--font-lovers-display)', fontSize: 22, lineHeight: 1.1, color: 'var(--lovers-ink)', marginBottom: 4 }}>
                      {selected.name}
                    </div>
                    {selected.combo && (
                      <div style={{ fontSize: 14, color: 'var(--lovers-brown)', opacity: .85, marginBottom: 6 }}>
                        Combo: <strong>{selected.combo.name}</strong>
                      </div>
                    )}
                    {selected.address && (
                      <div className="mono" style={{ fontSize: 12, color: 'var(--lovers-brown)', opacity: .6, marginBottom: 4 }}>
                        {selected.address}
                      </div>
                    )}
                    {selected.openingHours && (
                      <div className="mono" style={{ fontSize: 12, color: 'var(--lovers-brown)', opacity: .6, marginBottom: 12 }}>
                        {selected.openingHours}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                      {selected.combo?.slug && (
                        <button
                          className="btn btn-lovers btn-sm"
                          onClick={() => navigate(`/lovers/combos/${selected.combo.slug}`)}
                          style={{ fontSize: 13 }}
                        >
                          Ver combo <I.arrow />
                        </button>
                      )}
                      {getMapsDirectionsUrl(selected) && (
                        <a
                          href={getMapsDirectionsUrl(selected)}
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
                  placeholder="Buscar participante..."
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
                  {filtered.length === participants.length
                    ? `PARTICIPANTES · ${participants.length}`
                    : `MOSTRANDO · ${filtered.length} de ${participants.length}`}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--lovers-brown)', opacity: .5, fontSize: 14 }}>
                      Nenhum participante encontrado
                    </div>
                  )}
                  {filtered.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleListClick(p)}
                      style={{
                        background: selected?.id === p.id ? 'var(--lovers-cream)' : '#fff',
                        border: `1.5px solid ${selected?.id === p.id ? 'var(--lovers-red)' : 'rgba(135,14,45,.15)'}`,
                        borderRadius: 14, padding: '14px 16px',
                        cursor: 'pointer', transition: 'border-color .15s, background .15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <div className="mono" style={{ color: 'var(--lovers-red)', fontSize: 10 }}>{p.neighborhood}</div>
                        {p.dist !== null && (
                          <div className="mono" style={{ fontSize: 10, color: '#4285F4', fontWeight: 600 }}>{formatDist(p.dist)}</div>
                        )}
                      </div>
                      <div style={{ fontFamily: 'var(--font-lovers-display)', fontSize: 18, lineHeight: 1.2, color: 'var(--lovers-ink)', marginBottom: 2 }}>
                        {p.name}
                      </div>
                      {p.combo && (
                        <div style={{ fontSize: 13, color: 'var(--lovers-brown)', opacity: .75 }}>{p.combo.name}</div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                        {p.combo?.slug && (
                          <button
                            className="btn btn-lovers btn-sm"
                            style={{ fontSize: 12 }}
                            onClick={(e) => { e.stopPropagation(); navigate(`/lovers/combos/${p.combo.slug}`) }}
                          >
                            Ver combo
                          </button>
                        )}
                        {getMapsDirectionsUrl(p) && (
                          <a
                            href={getMapsDirectionsUrl(p)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm"
                            style={{ background: 'var(--lovers-red)', color: 'var(--lovers-cream)', border: 0, fontSize: 12 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Mapa
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
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
