import React, { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { I } from '../../components/icons'
import { EmptyState } from '../../components/placeholders'
import { PARTICIPANTS } from '../../data/participants'
import { COMBOS } from '../../data/combos'

const participantsSource = PARTICIPANTS
const combosSource = COMBOS

const NATAL_CENTER = [-5.7945, -35.2110]
const NATAL_ZOOM = 13

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

function heartPin(selected) {
  return `<div style="
    width:36px;height:36px;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    background:${selected ? '#870E2D' : '#FFD6E0'};
    border:2.5px solid #870E2D;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 10px rgba(135,14,45,.45);
    cursor:pointer;
    transition:background .15s;
  "><span style="transform:rotate(45deg);font-size:13px;line-height:1;">♥</span></div>`
}

function userPin() {
  return `<div style="
    width:20px;height:20px;border-radius:50%;
    background:#4285F4;border:3px solid #fff;
    box-shadow:0 2px 8px rgba(66,133,244,.6);
  "></div>`
}

function heartIcon(selected) {
  return L.divIcon({
    html: heartPin(selected),
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  })
}

function userIcon() {
  return L.divIcon({
    html: userPin(),
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function LeafletMap({ participants, selected, onSelect, userLocation }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})
  const userMarkerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(NATAL_CENTER, NATAL_ZOOM)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    participants.forEach(p => {
      if (!p.latitude || !p.longitude) return
      const marker = L.marker([p.latitude, p.longitude], { icon: heartIcon(false) }).addTo(map)
      marker.on('click', () => onSelect(p))
      markersRef.current[p.id] = marker
    })
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null; markersRef.current = {} }
  }, [])

  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      marker.setIcon(heartIcon(selected?.id === String(id)))
    })
    if (selected?.latitude && selected?.longitude && mapRef.current) {
      mapRef.current.panTo([selected.latitude, selected.longitude])
    }
  }, [selected])

  useEffect(() => {
    if (!mapRef.current) return
    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null }
    if (userLocation) {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon() }).addTo(mapRef.current)
      mapRef.current.setView([userLocation.lat, userLocation.lng], 14)
    }
  }, [userLocation])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

export function MapaPage({ navigate }) {
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filterBairro, setFilterBairro] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [locLoading, setLocLoading] = useState(false)
  const [locError, setLocError] = useState(null)
  function handleLocate() {
    if (userLocation) {
      setUserLocation(null)
      setLocError(null)
      return
    }
    if (!navigator.geolocation) {
      setLocError('Geolocalização não suportada neste navegador.')
      return
    }
    setLocLoading(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocLoading(false)
      },
      err => {
        setLocLoading(false)
        if (err.code === 1) setLocError('Permissão negada. Ative a localização no navegador.')
        else setLocError('Não foi possível obter sua localização.')
      },
      { timeout: 10000 }
    )
  }

  const participants = participantsSource.map(p => ({
    ...p,
    combo: combosSource.find(c => c.participantId === p.id) || null,
  }))

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

  const hasData = participants.length > 0
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

              {/* Mapa interativo */}
              <div className="mapa-container">
                <LeafletMap
                  participants={participants}
                  selected={selected}
                  onSelect={setSelected}
                  userLocation={userLocation}
                />

                {/* Card do participante selecionado */}
                {selected && (
                  <div className="mapa-selected-card" style={{
                    position: 'absolute', bottom: 16, left: 16, right: 16,
                    zIndex: 1000,
                    background: 'var(--lovers-cream)',
                    border: '2px solid var(--lovers-red)',
                    borderRadius: 16,
                    padding: '16px 20px',
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
                    <div style={{
                      fontFamily: 'var(--font-lovers-display)', fontSize: 22,
                      lineHeight: 1.1, color: 'var(--lovers-ink)', marginBottom: 4,
                    }}>
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

              {/* Lista de participantes */}
              <div className="mapa-list">

                {/* Busca */}
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

                {/* Filtros por bairro */}
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

                {/* Botão localização */}
                <button
                  onClick={handleLocate}
                  disabled={locLoading}
                  className="mapa-chip"
                  style={{
                    width: '100%',
                    marginBottom: 8,
                    padding: '8px 12px',
                    background: userLocation ? 'var(--lovers-red)' : 'transparent',
                    color: userLocation ? '#fff' : 'var(--lovers-red)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
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

                {/* Contador */}
                <div className="mono mb-3" style={{ color: 'var(--lovers-red)', fontSize: 12 }}>
                  {filtered.length === participants.length
                    ? `PARTICIPANTES · ${participants.length}`
                    : `MOSTRANDO · ${filtered.length} de ${participants.length}`}
                </div>

                {/* Lista */}
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
                        borderRadius: 14,
                        padding: '14px 16px',
                        cursor: 'pointer',
                        transition: 'border-color .15s, background .15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <div className="mono" style={{ color: 'var(--lovers-red)', fontSize: 10 }}>
                          {p.neighborhood}
                        </div>
                        {p.dist !== null && (
                          <div className="mono" style={{ fontSize: 10, color: '#4285F4', fontWeight: 600 }}>
                            {formatDist(p.dist)}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-lovers-display)', fontSize: 18,
                        lineHeight: 1.2, color: 'var(--lovers-ink)', marginBottom: 2,
                      }}>
                        {p.name}
                      </div>
                      {p.combo && (
                        <div style={{ fontSize: 13, color: 'var(--lovers-brown)', opacity: .75 }}>
                          {p.combo.name}
                        </div>
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
