import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { I } from '../../../components/icons'
import { EmptyState } from '../../../components/placeholders'
import { PARTICIPANTS } from '../../../data/participants'
import { COMBOS } from '../../../data/combos'
import { LOVERS_SHOW_COMBO_DETAILS } from '../../../config/loversRelease'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY
const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'

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
    hours: location.hours || participant.hours || null,
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

const DAY_ABBR = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function formatHourLabel(hhmm) {
  const [h, m] = hhmm.split(':')
  return m === '00' ? `${parseInt(h, 10)}h` : `${parseInt(h, 10)}h${m}`
}

// Status aberto/fechado calculado no fuso de Natal/RN (America/Fortaleza, UTC-3 sem horário de verão)
function getOpenStatus(hours, now = new Date()) {
  if (!hours || typeof hours !== 'object') return { state: 'unknown', label: '', detail: '' }

  // hora/dia atuais no fuso da loja
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Fortaleza',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const get = t => parts.find(p => p.type === t)?.value
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const today = weekdayMap[get('weekday')]
  let hh = parseInt(get('hour'), 10)
  if (hh === 24) hh = 0
  const nowMin = hh * 60 + parseInt(get('minute'), 10)

  const toMin = hhmm => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }
  const slotsFor = d => Array.isArray(hours[d]) ? hours[d] : []

  // aberto agora? (slots de hoje; close <= open = cruza a meia-noite)
  for (const [open, close] of slotsFor(today)) {
    const o = toMin(open), c = toMin(close)
    const openNow = c <= o ? nowMin >= o : nowMin >= o && nowMin < c
    if (openNow) {
      return { state: 'open', label: 'Aberto', detail: `Fecha às ${formatHourLabel(close)}` }
    }
  }

  // aberto por slot de ontem que cruzou a meia-noite (madrugada de hoje)?
  const yesterday = (today + 6) % 7
  for (const [open, close] of slotsFor(yesterday)) {
    const o = toMin(open), c = toMin(close)
    if (c <= o && nowMin < c) {
      return { state: 'open', label: 'Aberto', detail: `Fecha às ${formatHourLabel(close)}` }
    }
  }

  // abre ainda hoje?
  const laterToday = slotsFor(today)
    .map(([open]) => open)
    .filter(open => toMin(open) > nowMin)
    .sort((a, b) => toMin(a) - toMin(b))
  if (laterToday.length > 0) {
    return { state: 'closed', label: 'Fechado', detail: `Abre às ${formatHourLabel(laterToday[0])}` }
  }

  // próximo dia com horário (até 7 dias à frente)
  for (let i = 1; i <= 7; i++) {
    const d = (today + i) % 7
    const slots = slotsFor(d)
    if (slots.length > 0) {
      const open = slots.map(s => s[0]).sort((a, b) => toMin(a) - toMin(b))[0]
      const when = i === 1 ? 'amanhã' : DAY_ABBR[d]
      return { state: 'closed', label: 'Fechado', detail: `Abre ${when} às ${formatHourLabel(open)}` }
    }
  }

  return { state: 'closed', label: 'Fechado', detail: '' }
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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

if (GOOGLE_MAPS_API_KEY) {
  setOptions({ key: GOOGLE_MAPS_API_KEY })
}

const HEART_PATHS =
  '<path class="lovers-pin__heart-outer" d="M51.15,0C22.95,0,0,22.9,0,51.05c0,39.08,45.48,86.75,47.42,88.76,2.04,2.12,5.44,2.12,7.47,0,1.94-2.01,47.42-49.68,47.42-88.76,0-28.15-22.95-51.05-51.15-51.05Z"/>' +
  '<path class="lovers-pin__heart-inner" d="M23.13,60.44c-1.98-9.32-.14-21.72,6.3-27.84,2.86-2.72,6.99-3.23,10.13-.84,5.61,4.26,7.23,11.05,8.66,18.39,3.98-10.22,11.47-25.23,21.91-28.17,4.32-1.22,8.34,1,9.28,5.46,1.03,4.87.38,9.84-1.14,14.73-6.55,21.16-21.44,42.56-35.26,60.38-8.23-12.97-17-26.76-19.9-42.12Z"/>'

// Pin como elemento DOM (AdvancedMarkerElement) → permite usar a fonte real dos títulos (Typekit)
function buildPinElement(label, selected) {
  const el = document.createElement('div')
  el.className = 'lovers-pin' + (selected ? ' lovers-pin--selected' : '')
  const text = label ? String(label).toUpperCase() : ''
  el.innerHTML =
    `<svg class="lovers-pin__svg" viewBox="0 0 102.3 141.39" xmlns="http://www.w3.org/2000/svg">${HEART_PATHS}</svg>` +
    (text ? `<span class="lovers-pin__badge">${text}</span>` : '')
  return el
}

// ─── GoogleMap component ─────────────────────────────────────────────────────

function GoogleMap({ locations, selectedLocationId, onSelectLocation, userLocation, onError, onToggleRoute, getIsInRoute }) {
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
        const { AdvancedMarkerElement } = await importLibrary('marker')
        if (cancelled || !mapRef.current || instanceRef.current) return

        const map = new Map(mapRef.current, {
          center: NATAL_CENTER,
          zoom: NATAL_ZOOM,
          scrollwheel: true,
          gestureHandling: 'greedy',
          mapId: GOOGLE_MAPS_MAP_ID,
          renderingType: google.maps.RenderingType?.VECTOR,
          isFractionalZoomEnabled: true,
        })

        const infoWindow = new google.maps.InfoWindow()
        instanceRef.current = { map, infoWindow, AdvancedMarkerElement }
        setMapReady(true)
      } catch (e) {
        console.error('[Google Maps Load Error]', { name: e?.name, message: e?.message, error: e })
        onError?.('load-error')
      }
    })()

    return () => {
      cancelled = true
      Object.values(markersRef.current).forEach(m => { m.map = null })
      markersRef.current = {}
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null)
        userMarkerRef.current = null
      }
      instanceRef.current = null
    }
  }, [])

  // Rebuild markers + clusterer whenever visible locations change
  useEffect(() => {
    if (!instanceRef.current) return

    const { map, infoWindow, AdvancedMarkerElement } = instanceRef.current

    Object.values(markersRef.current).forEach(marker => { marker.map = null })
    markersRef.current = {}

    const validLocations = locations.filter(loc =>
      Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)
    )

    validLocations.forEach(loc => {
      const marker = new AdvancedMarkerElement({
        position: { lat: loc.latitude, lng: loc.longitude },
        title: `${loc.participantName} — ${loc.locationName}`,
        content: buildPinElement(loc.pinLabel, false),
        gmpClickable: true,
      })
      marker.pinLabelText = loc.pinLabel
      marker.map = map

      marker.addListener('gmp-click', () => {
        onSelectLocation?.(loc)
        const inRoute = getIsInRoute ? getIsInRoute(loc) : false
        infoWindow.setContent(`
          <div style="font-family:sans-serif;max-width:240px;line-height:1.4;">
            <strong style="font-size:14px;">${escapeHtml(loc.participantName)}</strong><br/>
            <span style="font-size:13px;color:#555;">${escapeHtml(loc.locationName)}</span><br/>
            <small style="color:#888;">${escapeHtml([loc.neighborhood, loc.city].filter(Boolean).join(' · '))}</small><br/>
            ${loc.address ? `<small style="color:#888;">${escapeHtml(loc.address)}</small>` : ''}
            ${loc.theme ? `<div style="margin-top:6px;font-size:12px;color:#D63648;font-style:italic;">${escapeHtml(loc.theme)}</div>` : ''}
            ${loc.edition ? `<div style="margin-top:2px;font-size:10px;font-weight:800;color:#D63648;text-transform:uppercase;letter-spacing:.06em;">${escapeHtml(loc.edition)}</div>` : ''}
            <button id="iw-route-btn" type="button" style="margin-top:10px;width:100%;padding:8px 10px;border:0;border-radius:999px;cursor:pointer;font-weight:700;font-size:12px;background:${inRoute ? '#eee' : '#F20567'};color:${inRoute ? '#3a0f1e' : '#fff'};">${inRoute ? '✓ Na minha rota — remover' : '+ Adicionar à minha rota'}</button>
          </div>
        `)
        infoWindow.open({ anchor: marker, map })
        google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
          const btn = document.getElementById('iw-route-btn')
          if (btn) btn.onclick = () => { onToggleRoute?.(loc); infoWindow.close() }
        })
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
      const sel = id === selectedLocationId
      marker.content = buildPinElement(marker.pinLabelText, sel)
      marker.zIndex = sel ? 999 : 1
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

  return (
    <div className="google-map-wrapper">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
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

// Lê os ids de parada da rota a partir do hash (#/lovers/mapa?rota=id1,id2,...)
function readRouteIdsFromHash() {
  try {
    const h = window.location.hash || ''
    const qi = h.indexOf('?')
    if (qi === -1) return null
    const rota = new URLSearchParams(h.slice(qi + 1)).get('rota')
    if (!rota) return null
    return rota.split(',').map(s => s.trim()).filter(Boolean)
  } catch { return null }
}

// Monta a URL compartilhável da rota
function buildRouteShareUrl(ids) {
  const base = `${window.location.origin}${window.location.pathname}#/lovers/mapa`
  return ids && ids.length ? `${base}?rota=${ids.join(',')}` : base
}

export function MapaGooglePage({ navigate }) {
  const isFullscreen = true
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
    const fromUrl = readRouteIdsFromHash()
    if (fromUrl && fromUrl.length) return fromUrl
    try {
      const saved = window.localStorage.getItem('sweet-lovers-route')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [isRoutePanelOpen, setIsRoutePanelOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const storyRef = useRef(null)
  // espelho dos ids da rota p/ o callback do pin (InfoWindow) ler o estado atual sem recriar marcadores
  const routeIdsRef = useRef(routeLocationIds)
  useEffect(() => { routeIdsRef.current = routeLocationIds }, [routeLocationIds])
  const getIsInRoute = useCallback((loc) => routeIdsRef.current.includes(loc.id), [])
  // esconde a tabbar inferior enquanto a tela "Minha rota" (fullscreen) está aberta
  useEffect(() => {
    document.body.classList.toggle('route-overlay-open', isRoutePanelOpen)
    return () => document.body.classList.remove('route-overlay-open')
  }, [isRoutePanelOpen])

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

  // ── numeração da legenda (estável, ordem da lista) ──────────────────────────
  const participantNumberById = useMemo(() => {
    const map = {}
    participants.forEach((p, i) => { map[p.id] = i + 1 })
    return map
  }, [participants])

  const pinLabelByLocationId = useMemo(() => {
    const map = {}
    participants.forEach((p, i) => {
      const num = i + 1
      const locs = getParticipantLocations(p)
      const multi = locs.length > 1
      locs.forEach((loc, j) => {
        map[loc.id] = multi ? `${num}${String.fromCharCode(97 + j)}` : `${num}`
      })
    })
    return map
  }, [participants])

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
        theme: p.theme || null,
        edition: p.edition || null,
        pinLabel: pinLabelByLocationId[loc.id],
      }))
    ),
  [filteredParticipants, pinLabelByLocationId])

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
      const fa = Number.isFinite(da), fb = Number.isFinite(db)
      if (fa && fb) return da - db
      if (fa) return -1
      if (fb) return 1
      return 0
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

  // remove da rota IDs de unidades que não existem mais (lojas removidas)
  useEffect(() => {
    setRouteLocationIds(cur => {
      const valid = cur.filter(id => allLocations.some(l => l.id === id))
      return valid.length === cur.length ? cur : valid
    })
  }, [allLocations])

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

  const toggleRouteLocation = useCallback((location) => {
    setRouteLocationIds(cur =>
      cur.includes(location.id) ? cur.filter(id => id !== location.id) : [...cur, location.id]
    )
  }, [])

  function removeRouteLocation(locationId) {
    setRouteLocationIds(cur => cur.filter(id => id !== locationId))
  }

  function clearRoute() { setRouteLocationIds([]) }

  function copyRouteLink() {
    const url = buildRouteShareUrl(routeLocationIds)
    try {
      navigator.clipboard?.writeText(url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch { /* clipboard indisponível */ }
  }

  // Gera imagem 9:16 do card de rota e dispara o compartilhamento nativo (IG Stories) — fallback: download
  async function shareStory() {
    if (!routeLocationIds.length || sharing) return
    setSharing(true)
    try {
      const url = buildRouteShareUrl(routeLocationIds)
      const QR = await import('qrcode')
      const qr = await QR.toDataURL(url, { margin: 1, width: 240, color: { dark: '#3a0f1e', light: '#ffffff' } })
      setQrDataUrl(qr)
      // espera o QR pintar antes de capturar
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const { toBlob } = await import('html-to-image')
      const blob = await toBlob(storyRef.current, { pixelRatio: 1, width: 1080, height: 1920, cacheBust: true, backgroundColor: '#F5B800' })
      if (!blob) throw new Error('falha ao gerar imagem')
      const file = new File([blob], 'minha-rota-lovers.png', { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Minha Rota Lovers', text: 'Minha rota no Sweet & Coffee Week Lovers 💜 sweetcoffeeweek.com.br' })
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'minha-rota-lovers.png'
        a.click()
        URL.revokeObjectURL(a.href)
      }
    } catch (e) {
      console.error('[share story]', e)
    } finally {
      setSharing(false)
    }
  }

  function moveRouteLocation(locationId, direction) {
    setRouteLocationIds(current => {
      const index = current.indexOf(locationId)
      if (index === -1) return current
      const nextIndex = direction === 'up' ? index - 1 : index + 1
      if (nextIndex < 0 || nextIndex >= current.length) return current
      const updated = [...current]
      const [item] = updated.splice(index, 1)
      updated.splice(nextIndex, 0, item)
      return updated
    })
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

  const routeMapsUrl = getRouteGoogleMapsUrl(routeLocations, userLocation)

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`page-enter kv-lovers lovers-gradient-bg mapa-wide mapa-scene${isFullscreen ? ' mapa-fullscreen' : ''}`} style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .35 }}></div>

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
            <div className="mapa-topbar" role="toolbar" aria-label="Ações do mapa">
              <button type="button" className="mapa-topbar__btn" onClick={() => setSearchOpen(true)}>
                <I.search width={16} height={16} /><span>Buscar</span>
              </button>
              <button type="button" className="mapa-topbar__btn" onClick={() => setIsRoutePanelOpen(true)}>
                <I.route width={16} height={16} /><span>Minha rota{routeLocationIds.length ? ` · ${routeLocationIds.length}` : ''}</span>
              </button>
              <button type="button" className="mapa-topbar__btn" onClick={requestUserLocation} disabled={locating}>
                <I.pin width={16} height={16} /><span>{locating ? 'Localizando…' : 'Perto de mim'}</span>
              </button>
            </div>
            {searchOpen && (
              <div className="mapa-search-modal" role="dialog" aria-modal="true" onClick={() => setSearchOpen(false)}>
                <div className="mapa-search-modal__panel" onClick={e => e.stopPropagation()}>
                  <div className="mapa-search-modal__head">
                    <strong>Buscar e filtrar</strong>
                    <button type="button" className="mapa-search-modal__close" onClick={() => setSearchOpen(false)} aria-label="Fechar"><I.close width={18} height={18} /></button>
                  </div>
                  <input
                    type="text"
                    className="mapa-search"
                    autoFocus
                    aria-label="Buscar participante, bairro ou endereço"
                    placeholder={LOVERS_SHOW_COMBO_DETAILS ? 'Busque por loja, bairro ou tema' : 'Busque por participante, bairro ou unidade'}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <div className="mapa-search-modal__filters">
                    <button onClick={() => setFilterBairro(null)} className="mapa-chip" style={{ background: !filterBairro ? 'var(--lovers-red)' : 'transparent', color: !filterBairro ? '#fff' : 'var(--lovers-red)' }}>
                      Todos · {participants.length}
                    </button>
                    {neighborhoods.map(n => (
                      <button key={n.name} onClick={() => setFilterBairro(prev => prev === n.name ? null : n.name)} className="mapa-chip" style={{ background: filterBairro === n.name ? 'var(--lovers-red)' : 'transparent', color: filterBairro === n.name ? '#fff' : 'var(--lovers-red)' }}>
                        {n.name} · {n.count}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
            <div className="mapa-layout mapa-floating-layout">

              {/* ── mapa ── */}
              <div className="mapa-container mapa-floating-panel mapa-floating-panel--map">
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
                    onToggleRoute={toggleRouteLocation}
                    getIsInRoute={getIsInRoute}
                  />
                )}

              </div>

              {/* ── lista lateral ── */}
              <div className="map-sidebar mapa-floating-panel mapa-floating-panel--sidebar">
                {/* controles (busca/localização/filtros/contagem) movidos para a barra superior — sidebar mostra só os participantes */}
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
                    const allLocs = getParticipantLocations(p)
                    const locs = filterBairro
                      ? allLocs.filter(l => l.neighborhood === filterBairro)
                      : allLocs
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
                        {/* cabeçalho do card — clicável: expande/recolhe + seleciona no mapa */}
                        <div
                          className="map-card-header"
                          role="button"
                          tabIndex={0}
                          aria-expanded={isActive}
                          onClick={() => {
                            if (isActive) { setSelectedParticipantId(null); setSelectedLocationId(null) }
                            else if (locsForCard[0]) { focusLocation(locsForCard[0]) }
                            else { setSelectedParticipantId(p.id) }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              if (isActive) { setSelectedParticipantId(null); setSelectedLocationId(null) }
                              else if (locsForCard[0]) { focusLocation(locsForCard[0]) }
                              else { setSelectedParticipantId(p.id) }
                            }
                          }}
                        >
                          <div className="map-card-brand">
                            {p.logo ? (
                              <div className="map-card-logo">
                                <img src={p.logo} alt={`Logo ${p.name}`} />
                              </div>
                            ) : (
                              <div className="map-card-logo map-card-logo--empty" aria-hidden="true">
                                {p.name.slice(0, 1)}
                              </div>
                            )}
                            <span className="map-card-number" aria-label={`Número ${participantNumberById[p.id]} no mapa`}>
                              {participantNumberById[p.id]}
                            </span>
                          </div>
                          <div className="map-card-title-group">
                            {LOVERS_SHOW_COMBO_DETAILS && p.edition && <span className="map-card-edition-kicker">{p.edition}</span>}
                            <h3>{p.name}</h3>
                            {LOVERS_SHOW_COMBO_DETAILS && p.theme && (
                              <div className="map-card-theme"><em>{p.theme}</em></div>
                            )}
                            <div className="map-card-meta">
                              {multiUnit ? `${locs.length} unidades` : locs[0]?.neighborhood}
                              {userLocation && Number.isFinite(minDist) && minDist !== Infinity
                                ? ` · ${formatDistance(minDist)}`
                                : ''}
                            </div>
                            {LOVERS_SHOW_COMBO_DETAILS && p.combo && (
                              <div className="map-card-combo">{p.combo.name}</div>
                            )}
                          </div>
                          <span className="map-card-chevron" aria-hidden="true">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </span>
                        </div>

                        {/* lista de unidades — visível só quando expandido */}
                        {isActive && (<>
                        <div className={`map-location-list${manyUnits ? ' map-location-list--many' : ''}`}>
                          {locsForCard.map(loc => {
                            const isLocActive = selectedLocationId === loc.id
                            const hasCoords = Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)
                            const directionsUrl = getDirectionsUrl(loc, userLocation)
                            const distStr = formatDistance(loc.distanceKm)
                            const status = getOpenStatus(loc.hours)

                            return (
                              <div
                                key={loc.id}
                                className={`map-location-row${isLocActive ? ' map-location-row--active' : ''}`}
                                onClick={() => focusLocation(loc)}
                              >
                                <div className="map-location-topline">
                                  {status.state !== 'unknown' && (
                                    <span className={`map-location-status map-location-status--${status.state}`}>
                                      <span className="map-location-status-dot" aria-hidden="true"></span>
                                      <strong>{status.label}</strong>
                                    </span>
                                  )}
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

                                {status.detail && (
                                  <div className={`map-location-status-line map-location-status-line--${status.state}`}>
                                    {status.detail}
                                  </div>
                                )}

                                <div className="map-location-actions">
                                  {hasCoords && (
                                    <button
                                      type="button"
                                      className={`map-icon-action${isLocActive ? ' map-icon-action--active' : ''}`}
                                      title="Ver no mapa"
                                      aria-label="Ver no mapa"
                                      onClick={e => { e.stopPropagation(); focusLocation(loc) }}
                                    >
                                      {isLocActive ? <I.pinFill /> : <I.pin />}
                                    </button>
                                  )}
                                  {directionsUrl && (
                                    <a
                                      className="map-icon-action map-icon-action--primary"
                                      title="Traçar rota"
                                      aria-label="Traçar rota"
                                      href={directionsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M21.71 11.29l-9-9a1 1 0 0 0-1.42 0l-9 9a1 1 0 0 0 0 1.42l9 9a1 1 0 0 0 1.42 0l9-9a1 1 0 0 0 0-1.42zM14 14.5V12h-4v3H8v-4a1 1 0 0 1 1-1h5V7.5l3.5 3.5-3.5 3.5z" />
                                      </svg>
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    className={`map-icon-action map-icon-action--route${isInRoute(loc) ? ' map-icon-action--selected' : ''}`}
                                    title={isInRoute(loc) ? 'Remover da rota' : 'Adicionar à rota'}
                                    aria-label={isInRoute(loc) ? 'Remover da rota' : 'Adicionar à rota'}
                                    onClick={e => { e.stopPropagation(); toggleRouteLocation(loc) }}
                                  >
                                    {isInRoute(loc) ? <I.heart /> : <I.heartLine />}
                                  </button>
                                  {loc.participantInstagram && (
                                    <a
                                      className="map-icon-action"
                                      title="Instagram"
                                      aria-label="Instagram"
                                      href={`https://instagram.com/${loc.participantInstagram.replace(/^@/, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <I.ig />
                                    </a>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {p.combo?.slug && (
                          <button
                            type="button"
                            className="map-card-combo-btn"
                            onClick={() => navigate(`/lovers/combos/${p.combo.slug}`)}
                          >
                            {LOVERS_SHOW_COMBO_DETAILS ? 'Ver combo' : 'Ver participante'} <I.arrow />
                          </button>
                        )}
                        </>)}
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

            {/* FAB removido — "Minha rota" agora vive na barra superior (.mapa-topbar) */}

            {isRoutePanelOpen && (
              <div className="sweet-route-screen" role="dialog" aria-modal="true">
                <header className="sweet-route-screen__head">
                  <button type="button" className="sweet-route-screen__close" onClick={() => setIsRoutePanelOpen(false)} aria-label="Fechar">←</button>
                  <div className="sweet-route-screen__titles">
                    <h2>Minha rota</h2>
                    <span>{routeLocations.length} {routeLocations.length === 1 ? 'parada' : 'paradas'}</span>
                  </div>
                  {routeLocations.length > 0 && (
                    <details className="sweet-route-menu">
                      <summary aria-label="Mais ações">⋯</summary>
                      <div className="sweet-route-menu__pop">
                        <button type="button" onClick={copyRouteLink}>{linkCopied ? 'Link copiado ✓' : 'Copiar link da rota'}</button>
                        <button type="button" onClick={clearRoute}>Limpar rota</button>
                      </div>
                    </details>
                  )}
                </header>

                <div className="sweet-route-screen__body">
                  {routeLocations.length === 0 ? (
                    <div className="sweet-route-empty">
                      <strong>Sua rota está vazia</strong>
                      <p>Toque nos pins do mapa (ou nos cards) para adicionar participantes à sua rota.</p>
                    </div>
                  ) : (
                    <ol className="sweet-route-stops">
                      {routeLocations.map((location, index) => {
                        const locationMeta = [location.neighborhood, location.city].filter(Boolean).join(' · ')
                        return (
                          <li className="sweet-route-stop" key={location.id}>
                            <span className="sweet-route-stop__num">{index + 1}</span>
                            <div className="sweet-route-stop__info">
                              <strong>{location.participantName}</strong>
                              {locationMeta && <span>{locationMeta}</span>}
                            </div>
                            <details className="sweet-route-stop__menu">
                              <summary aria-label="Ações da parada">⋮</summary>
                              <div className="sweet-route-stop__pop">
                                <button type="button" disabled={index === 0} onClick={(e) => { moveRouteLocation(location.id, 'up'); e.currentTarget.closest('details').open = false }}>Subir</button>
                                <button type="button" disabled={index === routeLocations.length - 1} onClick={(e) => { moveRouteLocation(location.id, 'down'); e.currentTarget.closest('details').open = false }}>Descer</button>
                                <button type="button" className="is-danger" onClick={(e) => { e.currentTarget.closest('details').open = false; removeRouteLocation(location.id) }}>Remover</button>
                              </div>
                            </details>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                  {routeLocations.length > 9 && (
                    <p className="sweet-route-note">O Google Maps usa as primeiras 9 paradas no trajeto.</p>
                  )}
                </div>

                <footer className="sweet-route-screen__foot">
                  <button type="button" onClick={shareStory} disabled={sharing || !routeLocations.length} className="sweet-route-cta">
                    {sharing ? 'Gerando imagem…' : 'Compartilhar'}
                  </button>
                  {routeMapsUrl && (
                    <a href={routeMapsUrl} target="_blank" rel="noopener noreferrer" className="sweet-route-cta sweet-route-cta--ghost">
                      Abrir no Maps
                    </a>
                  )}
                </footer>
              </div>
            )}

            {/* Card 9:16 off-screen para exportar imagem do Stories */}
            <div className="sweet-story-stage" aria-hidden="true">
              <div className="sweet-story" ref={storyRef}>
                <div className="sweet-story__head">
                  <span className="sweet-story__kicker">SWEET &amp; COFFEE WEEK LOVERS</span>
                  <h2 className="sweet-story__title">MINHA ROTA<br/>DA DOÇURA</h2>
                  <span className="sweet-story__date">4 A 14 DE JUNHO · NATAL/RN</span>
                </div>
                <ol className="sweet-story__list">
                  {routeLocations.slice(0, 8).map((loc, i) => {
                    return (
                      <li key={loc.id} className="sweet-story__stop">
                        <span className="sweet-story__num">{i + 1}</span>
                        <div className="sweet-story__info">
                          <strong>{loc.participantName}</strong>
                          <span>{[loc.neighborhood, loc.city].filter(Boolean).join(' · ')}</span>
                        </div>
                      </li>
                    )
                  })}
                </ol>
                {routeLocations.length > 8 && <p className="sweet-story__more">+ {routeLocations.length - 8} paradas na minha rota</p>}
                <div className="sweet-story__foot">
                  {qrDataUrl && <img className="sweet-story__qr" src={qrDataUrl} alt="" />}
                  <div className="sweet-story__cta">
                    <strong>Monte a sua rota</strong>
                    <span>sweetcoffeeweek.com.br</span>
                  </div>
                </div>
              </div>
            </div>
</>
          )}

        </div>

        <style>{`
          /* ── wrapper do mapa ── */
          .google-map-wrapper { position: relative; width: 100%; height: 100%; }
          /* esticar largura: soltar o max-width do container só na página do mapa */
          .mapa-wide > section > .wrap { max-width: none; }
          /* cenário ilustrado: imagem cobre a página inteira do mapa */
          .mapa-scene {
            background-image: url('/mapa-lovers-site-3840.webp');
            background-size: cover;
            background-position: center center;
            background-repeat: no-repeat;
            background-attachment: scroll;
            min-height: 100svh;
          }
          /* véu creme translúcido por cima da arte, atrás do conteúdo, p/ leitura */
          .mapa-scene > section { background: rgba(255,241,230,.42) !important; }
          /* painéis legíveis sobre o cenário */
          .mapa-scene .map-sidebar-sticky,
          .mapa-scene .map-sidebar-scroll { -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }

          /* ── pin HTML (AdvancedMarkerElement) ── */
          .lovers-pin {
            position: relative;
            width: 40px;
            height: 55px;
            cursor: pointer;
            transition: transform .15s ease;
            transform-origin: bottom center;
          }
          .lovers-pin__svg { width: 100%; height: 100%; display: block; overflow: visible; }
          .lovers-pin__heart-outer { fill: #f10767; }
          .lovers-pin__heart-inner { fill: #7f0018; }
          .lovers-pin__badge {
            position: absolute;
            right: -9px;
            bottom: 7px;
            min-width: 25px;
            height: 25px;
            padding: 0 5px;
            border-radius: 999px;
            background: #F5B800;
            color: #3F1A0A;
            font-family: var(--font-lovers-display);
            font-weight: 700;
            font-size: 17px;
            line-height: 25px;
            text-align: center;
            box-sizing: border-box;
            box-shadow: 0 1px 3px rgba(0,0,0,.25);
          }
          .lovers-pin--selected { transform: scale(1.25); }
          .lovers-pin--selected .lovers-pin__heart-outer { fill: #b80050; }
          .lovers-pin--selected .lovers-pin__heart-inner { fill: #4a000e; }
          /* ── painéis flutuantes desktop (lista esquerda / mapa direita) ──
             Variáveis de espaçamento p/ blocos flutuando sobre o cenário. */
          .mapa-fullscreen {
            --map-page-margin: clamp(20px, 4vw, 72px);
            --map-panel-gap: clamp(18px, 2vw, 34px);
            --map-panel-radius: clamp(28px, 3vw, 48px);
            --map-floating-panel-h: min(760px, calc(100svh - 200px));
          }
          .mapa-fullscreen .lovers-bg { display: none; }
          .mapa-fullscreen > section { padding: 0 !important; background: transparent !important; }
          .mapa-fullscreen > section > .wrap { max-width: none; width: 100%; padding: 0; }
          /* header compacto integrado ao cenário, antes dos painéis */
          .mapa-fullscreen .mapa-hero {
            margin: clamp(18px, 3vw, 36px) auto clamp(14px, 1.6vw, 22px);
            padding: 0 var(--map-page-margin);
          }
          /* dois painéis flutuantes de MESMA altura (limite fixo) */
          .mapa-fullscreen .mapa-layout {
            width: min(100% - calc(var(--map-page-margin) * 2), 1540px);
            margin: 0 auto clamp(20px, 3vw, 40px);
            grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
            gap: var(--map-panel-gap);
            height: var(--map-floating-panel-h);
            min-height: 620px;
            max-height: 820px;
            align-items: stretch;
          }
          /* painel do mapa flutua à direita, cantos arredondados, moldura roxa */
          .mapa-fullscreen .mapa-container {
            height: 100%;
            min-height: 0;
            border-radius: var(--map-panel-radius);
            overflow: hidden;
            border: 1px solid rgba(255,232,210,.22);
            box-shadow: 0 24px 70px rgba(43,24,16,.24);
            order: 2;
          }
          .mapa-fullscreen .mapa-container .google-map-wrapper,
          .mapa-fullscreen .mapa-container .google-map-wrapper > div {
            width: 100%; height: 100%; min-height: 100%;
          }
          /* painel da lista flutua à esquerda — flex column, rolagem interna */
          .mapa-fullscreen .map-sidebar {
            height: 100%;
            min-height: 0;
            order: 1;
            display: flex;
            flex-direction: column;
            border: 1px solid rgba(255,232,210,.22);
            border-radius: var(--map-panel-radius);
            overflow: hidden;
            background: rgba(82,43,127,.94);
            -webkit-backdrop-filter: blur(10px);
            backdrop-filter: blur(10px);
            box-shadow: 0 24px 70px rgba(43,24,16,.24);
            padding: 0;
            color: var(--lovers-cream);
          }
          .mapa-fullscreen .map-sidebar-sticky {
            flex: 0 0 auto;
            padding: clamp(16px, 1.6vw, 22px) clamp(16px, 1.6vw, 22px) 14px;
            background: rgba(82,43,127,.96);
          }
          .mapa-fullscreen .map-sidebar-scroll {
            flex: 1 1 auto;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 0 clamp(16px, 1.6vw, 22px) clamp(16px, 1.6vw, 22px);
            scrollbar-color: rgba(255,232,210,.48) transparent;
          }
          /* ocultar filtros por bairro (lógica preservada no JSX) */
          .mapa-fullscreen .map-neighborhood-filters { display: none; }
          /* contraste sobre painel roxo: contador + busca + botão localização */
          .mapa-fullscreen .map-sidebar .mono { color: var(--lovers-cream) !important; }
          .mapa-fullscreen .map-sidebar .mapa-search {
            background: #fff; color: var(--lovers-brown);
            border-color: rgba(255,232,210,.68);
          }
          .mapa-fullscreen .map-sidebar .mapa-search::placeholder { color: rgba(63,26,10,.62); }
          /* botão "Usar minha localização" e chips de distância: outline creme legível */
          .mapa-fullscreen .map-sidebar .mapa-chip {
            border-color: rgba(255,232,210,.5);
            color: var(--lovers-cream) !important;
          }
          .mapa-fullscreen .map-sidebar .mapa-chip:hover { background: var(--lovers-pink); color: #fff !important; }
          /* scrollbar discreta (WebKit) */
          .mapa-fullscreen .map-sidebar-scroll::-webkit-scrollbar { width: 8px; }
          .mapa-fullscreen .map-sidebar-scroll::-webkit-scrollbar-track {
            background: rgba(255,232,210,.14); border-radius: 999px;
          }
          .mapa-fullscreen .map-sidebar-scroll::-webkit-scrollbar-thumb {
            background: rgba(255,232,210,.48); border-radius: 999px;
          }
          .mapa-fullscreen .map-sidebar-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(255,232,210,.68);
          }
          /* tablet: reduz sidebar/gap/margens */
          @media (max-width: 1180px) {
            .mapa-fullscreen .mapa-layout { grid-template-columns: minmax(260px, 320px) minmax(0, 1fr); }
          }
          /* mobile: empilha — mapa primeiro, lista depois, alturas controladas */
          @media (max-width: 860px) {
            .mapa-fullscreen {
              --map-page-margin: 16px;
              --map-panel-gap: 16px;
              --map-panel-radius: 26px;
            }
            .mapa-fullscreen .mapa-layout {
              width: calc(100% - 28px);
              grid-template-columns: 1fr;
              height: auto;
              min-height: 0;
              max-height: none;
            }
            .mapa-fullscreen .mapa-container { min-height: 360px; height: 52svh; max-height: 520px; order: 1; }
            .mapa-fullscreen .map-sidebar { height: min(680px, 72svh); min-height: 480px; max-height: 720px; order: 2; }
          }
          @media (max-width: 480px) {
            .mapa-fullscreen { --map-panel-radius: 22px; }
            .mapa-fullscreen .map-sidebar { height: 70svh; }
          }
          /* ── layout flutuante (padrão): lista esquerda, mapa direita ──
             Painéis de mesma altura flutuando sobre o cenário, margens + radius. */
          .mapa-floating-layout {
            --map-page-margin: clamp(18px, 4vw, 72px);
            --map-panel-gap: clamp(18px, 2vw, 34px);
            --map-panel-radius: clamp(28px, 3vw, 48px);
            --map-floating-panel-h: min(760px, calc(100svh - 190px));
            width: min(100% - calc(var(--map-page-margin) * 2), 1540px);
            margin: 0 auto;
            display: grid;
            grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
            gap: var(--map-panel-gap);
            align-items: stretch;
          }
          .mapa-floating-panel {
            position: relative;
            overflow: hidden;
            border-radius: var(--map-panel-radius);
            min-height: 620px;
            height: var(--map-floating-panel-h);
            max-height: 820px;
            box-shadow: 0 24px 70px rgba(43,24,16,.24);
            border: 1px solid rgba(255,232,210,.22);
          }
          /* lista flutua à esquerda (coluna estreita) */
          .mapa-floating-panel--sidebar {
            order: 1;
            display: flex;
            flex-direction: column;
            background: rgba(79,32,146,.96);
            color: var(--lovers-cream);
          }
          /* mapa flutua à direita (coluna larga) */
          .mapa-floating-panel--map {
            order: 2;
            background: rgba(79,32,146,.84);
          }
          /* Google Map preenche todo o painel */
          .mapa-floating-panel--map .mapa-container,
          .mapa-floating-panel--map .google-map-wrapper,
          .mapa-floating-panel--map .google-map-wrapper > div {
            width: 100%; height: 100%; min-height: 100%;
          }
          /* sidebar: topo fixo + lista rolável internamente */
          .mapa-floating-panel--sidebar .map-sidebar-sticky {
            flex: 0 0 auto;
            position: sticky;
            top: 0;
            z-index: 5;
            padding: clamp(18px, 2vw, 26px);
            background: rgba(79,32,146,.98);
          }
          .mapa-floating-panel--sidebar .map-sidebar-scroll {
            flex: 1 1 auto;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
            padding: clamp(16px, 2.4vw, 24px) clamp(18px, 2vw, 26px) clamp(18px, 2vw, 26px);
            scrollbar-color: rgba(255,232,210,.52) rgba(255,232,210,.14);
            scrollbar-width: thin;
          }
          .mapa-floating-panel--sidebar .map-sidebar-scroll::-webkit-scrollbar { width: 8px; }
          .mapa-floating-panel--sidebar .map-sidebar-scroll::-webkit-scrollbar-track {
            background: rgba(255,232,210,.14); border-radius: 999px;
          }
          .mapa-floating-panel--sidebar .map-sidebar-scroll::-webkit-scrollbar-thumb {
            background: rgba(255,232,210,.52); border-radius: 999px;
          }
          /* contraste sobre painel roxo: troca textos vermelhos por creme */
          .mapa-floating-panel--sidebar .mono { color: var(--lovers-cream) !important; }
          .mapa-floating-panel--sidebar .mono button { color: var(--lovers-cream) !important; }
          .mapa-floating-panel--sidebar .mapa-search {
            width: 100%;
            background: #fff; color: var(--lovers-brown);
            border: 1.5px solid rgba(255,232,210,.72);
            box-shadow: 0 10px 24px rgba(43,24,16,.16);
          }
          .mapa-floating-panel--sidebar .mapa-search::placeholder { color: rgba(63,26,10,.62); }
          /* cor/contraste dos chips vêm dos estilos inline (creme inativo, roxo-sobre-creme ativo);
             aqui só borda padrão p/ chips sem cor inline. */
          .mapa-floating-panel--sidebar .mapa-chip { border-color: rgba(255,232,210,.55); }

          /* ── Barra superior do mapa (ações discretas) ── */
          .mapa-topbar {
            position: sticky; top: 0; z-index: 20;
            display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;
            padding: 10px 0 12px;
          }
          .mapa-topbar__btn {
            display: inline-flex; align-items: center; gap: 7px;
            padding: 8px 14px; border-radius: 999px;
            background: rgba(255,255,255,.92); color: var(--lovers-brown);
            border: 1px solid rgba(135,14,45,.18);
            font-family: var(--font-lovers-body); font-weight: 700;
            font-size: 12.5px; letter-spacing: .02em; cursor: pointer;
            box-shadow: 0 4px 14px rgba(43,24,16,.10);
            transition: transform .15s, box-shadow .15s, background .15s;
          }
          .mapa-topbar__btn:hover { transform: translateY(-1px); background: #fff; box-shadow: 0 8px 20px rgba(43,24,16,.16); }
          .mapa-topbar__btn:disabled { opacity: .6; cursor: default; transform: none; box-shadow: none; }
          .mapa-topbar__btn svg { flex-shrink: 0; }

          /* ── Modal de busca + filtro ── */
          .mapa-search-modal {
            position: fixed; inset: 0; z-index: 400;
            background: rgba(43,24,16,.45);
            -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
            display: flex; align-items: flex-start; justify-content: center;
            padding: 12vh 16px 16px;
          }
          .mapa-search-modal__panel {
            width: 100%; max-width: 460px;
            background: var(--lovers-cream); color: var(--lovers-brown);
            border-radius: 22px; padding: 18px;
            box-shadow: 0 30px 70px rgba(43,24,16,.4);
          }
          .mapa-search-modal__head {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 12px;
            font-family: var(--font-lovers-display); font-size: 18px; text-transform: uppercase;
          }
          .mapa-search-modal__close { background: none; border: 0; cursor: pointer; color: var(--lovers-brown); padding: 4px; line-height: 0; }
          .mapa-search-modal__panel .mapa-search { width: 100%; }
          .mapa-search-modal__filters { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
          .mapa-search-modal__filters .mapa-chip { color: var(--lovers-red); border-color: rgba(214,54,72,.4); }

          /* botão secundário-primário (Abrir no Maps) */
          .sweet-route-primary--alt { background: var(--lovers-purple); }

          /* ── Card 9:16 do Stories (renderizado off-screen, exportado como imagem) ── */
          .sweet-story-stage { position: fixed; top: 0; left: -10000px; width: 1080px; height: 1920px; pointer-events: none; z-index: -1; }
          .sweet-story {
            width: 1080px; height: 1920px; box-sizing: border-box;
            padding: 96px 84px; display: flex; flex-direction: column;
            background: #F5B800;
            color: #3a0f1e; font-family: var(--font-lovers-body);
          }
          .sweet-story__head { text-align: center; }
          .sweet-story__kicker { font-family: var(--font-mono); font-size: 26px; letter-spacing: .26em; opacity: .7; }
          .sweet-story__title { font-family: var(--font-lovers-display); font-weight: 900; font-size: 118px; line-height: .9; text-transform: uppercase; margin: 26px 0 18px; }
          .sweet-story__date { font-family: var(--font-mono); font-size: 26px; letter-spacing: .14em; color: #870e2d; font-weight: 700; }
          .sweet-story__list { list-style: none; margin: 64px 0 0; padding: 0; display: flex; flex-direction: column; gap: 22px; flex: 1; justify-content: center; }
          .sweet-story__stop { display: flex; align-items: center; gap: 28px; background: #fff; border-radius: 28px; padding: 26px 34px; }
          .sweet-story__num { flex: 0 0 auto; width: 62px; height: 62px; border-radius: 999px; background: #F20567; color: #fff; display: flex; align-items: center; justify-content: center; font-family: var(--font-lovers-display); font-weight: 900; font-size: 38px; }
          .sweet-story__info { display: flex; flex-direction: column; gap: 8px; min-width: 0; flex: 1; }
          .sweet-story__info strong { font-family: var(--font-lovers-display); font-weight: 800; font-size: 44px; line-height: 1.05; text-transform: uppercase; color: #3a0f1e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
          .sweet-story__info span { font-family: var(--font-mono); font-size: 24px; opacity: .8; color: #3a0f1e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
          .sweet-story__more { text-align: center; font-family: var(--font-mono); font-size: 28px; opacity: .85; margin: 20px 0 0; }
          .sweet-story__foot { display: flex; align-items: center; gap: 34px; margin-top: 54px; padding-top: 42px; border-top: 2px solid rgba(58,15,30,.22); }
          .sweet-story__qr { width: 150px; height: 150px; border-radius: 18px; background: #fff; padding: 10px; box-sizing: border-box; }
          .sweet-story__cta { display: flex; flex-direction: column; gap: 6px; }
          .sweet-story__cta strong { font-family: var(--font-lovers-display); font-weight: 800; font-size: 46px; text-transform: uppercase; }
          .sweet-story__cta span { font-family: var(--font-mono); font-size: 28px; color: #870e2d; }

          /* ── Tela "Minha rota" fullscreen ── */
          .sweet-route-screen { position: fixed; inset: 0; z-index: 500; display: flex; flex-direction: column; background: #F5B800; color: #3a0f1e; }
          .sweet-route-screen__head { display: flex; align-items: center; gap: 14px; padding: calc(16px + env(safe-area-inset-top, 0px)) 18px 14px; border-bottom: 1px solid rgba(58,15,30,.16); }
          .sweet-route-screen__close { width: 42px; height: 42px; border-radius: 999px; border: 0; background: rgba(58,15,30,.10); color: #3a0f1e; font-size: 22px; cursor: pointer; flex: 0 0 auto; }
          .sweet-route-screen__titles { flex: 1; display: flex; flex-direction: column; }
          .sweet-route-screen__titles h2 { margin: 0; font-family: var(--font-lovers-display); font-weight: 800; font-size: 26px; text-transform: uppercase; line-height: 1; }
          .sweet-route-screen__titles span { font-family: var(--font-mono); font-size: 12px; letter-spacing: .1em; opacity: .7; margin-top: 4px; }
          .sweet-route-menu { position: relative; flex: 0 0 auto; }
          .sweet-route-menu summary { list-style: none; width: 42px; height: 42px; border-radius: 999px; background: rgba(58,15,30,.10); color: #3a0f1e; display: flex; align-items: center; justify-content: center; font-size: 22px; cursor: pointer; }
          .sweet-route-menu summary::-webkit-details-marker { display: none; }
          .sweet-route-menu__pop { position: absolute; right: 0; top: 48px; background: #fff; color: var(--lovers-brown); border-radius: 14px; box-shadow: 0 16px 40px rgba(0,0,0,.35); display: flex; flex-direction: column; min-width: 210px; overflow: hidden; z-index: 2; }
          .sweet-route-menu__pop button { background: none; border: 0; text-align: left; padding: 14px 16px; font-size: 14px; cursor: pointer; font-family: var(--font-lovers-body); color: var(--lovers-brown); }
          .sweet-route-menu__pop button:hover { background: rgba(0,0,0,.05); }
          .sweet-route-screen__body { flex: 1; overflow-y: auto; padding: 18px; }
          .sweet-route-empty { text-align: center; margin: 16vh auto 0; max-width: 280px; }
          .sweet-route-empty strong { display: block; font-family: var(--font-lovers-display); font-size: 26px; text-transform: uppercase; margin-bottom: 10px; }
          .sweet-route-empty p { font-size: 15px; opacity: .8; line-height: 1.5; }
          .sweet-route-stops { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
          .sweet-route-stop { position: relative; display: flex; align-items: center; gap: 14px; background: #fff; border-radius: 18px; padding: 14px 56px 14px 16px; }
          .sweet-route-stop__num { flex: 0 0 auto; width: 30px; height: 30px; border-radius: 999px; background: #F20567; color: #fff; display: flex; align-items: center; justify-content: center; font-family: var(--font-lovers-display); font-weight: 800; font-size: 16px; }
          .sweet-route-stop__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; color: #3a0f1e; }
          .sweet-route-stop__info strong { font-family: var(--font-lovers-display); font-weight: 700; font-size: 17px; line-height: 1.1; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
          .sweet-route-stop__info span { font-family: var(--font-mono); font-size: 11px; opacity: .7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
          .sweet-route-stop__menu { position: absolute; top: 8px; right: 10px; }
          .sweet-route-stop__menu summary { list-style: none; width: 40px; height: 40px; border-radius: 999px; display: flex; align-items: center; justify-content: center; font-size: 22px; line-height: 1; color: #3a0f1e; cursor: pointer; }
          .sweet-route-stop__menu summary::-webkit-details-marker { display: none; }
          .sweet-route-stop__menu summary:hover { background: rgba(58,15,30,.08); }
          .sweet-route-stop__pop { position: absolute; right: 0; top: 44px; z-index: 3; background: #fff; border-radius: 14px; box-shadow: 0 16px 40px rgba(0,0,0,.28); display: flex; flex-direction: column; min-width: 160px; overflow: hidden; }
          .sweet-route-stop__pop button { background: none; border: 0; text-align: left; padding: 13px 16px; font-size: 14px; font-family: var(--font-lovers-body); color: #3a0f1e; cursor: pointer; }
          .sweet-route-stop__pop button:hover { background: rgba(0,0,0,.05); }
          .sweet-route-stop__pop button:disabled { opacity: .35; cursor: default; }
          .sweet-route-stop__pop button.is-danger { color: #c41024; }
          .sweet-route-note { text-align: center; font-family: var(--font-mono); font-size: 12px; opacity: .7; margin-top: 16px; }
          .sweet-route-screen__foot { display: flex; gap: 10px; padding: 14px 18px calc(14px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid rgba(58,15,30,.16); }
          .sweet-route-cta { flex: 1; text-align: center; padding: 16px; border-radius: 999px; border: 0; cursor: pointer; font-family: var(--font-lovers-display); font-weight: 800; font-size: 16px; text-transform: uppercase; background: #F20567; color: #fff; text-decoration: none; }
          .sweet-route-cta--ghost { background: transparent; border: 1.5px solid rgba(58,15,30,.45); color: #3a0f1e; }
          .sweet-route-cta:disabled { opacity: .5; cursor: default; }
          /* filtros por bairro ocultos de verdade (estados/funções preservados no JSX) */
          .map-neighborhood-filters { display: none !important; }

          /* ── header editorial ── */
          .mapa-hero {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: clamp(42px, 7vw, 88px) 0 clamp(28px, 4vw, 56px);
          }
          .mapa-hero__sticker, .mapa-hero__kicker { align-self: center; }
          .mapa-hero__sticker {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transform: rotate(-2deg);
            margin-bottom: 14px;
            padding: 7px 14px;
            border-radius: 999px;
            background: #F5B800;
            color: #3F1A0A;
            font-family: var(--font-lovers-body);
            font-weight: 900;
            font-size: 12px;
            letter-spacing: .06em;
            text-transform: uppercase;
            box-shadow: 0 8px 20px rgba(135,14,45,.16);
          }
          .mapa-hero__sticker svg { width: 14px; height: 14px; }
          .mapa-hero__kicker {
            display: block;
            margin-bottom: 8px;
            font-family: var(--font-lovers-body);
            font-weight: 900;
            font-size: 12px;
            letter-spacing: .2em;
            text-transform: uppercase;
            color: var(--lovers-red);
          }
          .mapa-hero__title {
            margin: 0;
            max-width: 980px;
            margin-inline: auto;
            text-align: center;
            font-family: var(--font-lovers-display);
            font-size: clamp(42px, 7vw, 88px);
            line-height: .86;
            letter-spacing: .01em;
            text-transform: uppercase;
            color: var(--lovers-ink);
          }
          .mapa-hero__subtitle {
            max-width: 760px;
            margin: clamp(14px, 2vw, 20px) auto 0;
            text-align: center;
            font-family: var(--font-lovers-body);
            font-size: clamp(15px, 1.5vw, 18px);
            line-height: 1.45;
            color: var(--lovers-brown);
          }
          .mapa-hero__microcopy {
            max-width: 620px;
            margin: 12px auto 0;
            text-align: center;
            font-family: var(--font-lovers-body);
            font-weight: 800;
            font-size: 13px;
            line-height: 1.4;
            letter-spacing: .02em;
            color: var(--lovers-red);
          }
          @media (max-width: 560px) {
            .mapa-hero { margin-bottom: 18px; }
            .mapa-hero__title { font-size: clamp(34px, 11vw, 48px); line-height: .9; }
            .mapa-hero__subtitle { font-size: 14px; }
            .mapa-hero__sticker { font-size: 11px; padding: 6px 12px; margin-bottom: 12px; }
            .mapa-hero__kicker { letter-spacing: .16em; }
          }

          /* ── busca ── */
          .mapa-search {
            width: 100%;
            box-sizing: border-box;
            border: 1.5px solid rgba(135,14,45,.2);
            border-radius: 999px;
            padding: 12px 18px;
            font-size: 14px;
            font-family: var(--font-lovers-body);
            background: #fff;
            color: var(--lovers-ink);
            outline: none;
            margin-bottom: 12px;
            transition: border-color .15s, box-shadow .15s;
          }
          .mapa-search::placeholder { color: var(--lovers-brown); opacity: .55; }
          .mapa-search:focus { box-shadow: 0 0 0 3px rgba(214,54,72,.12); }

          /* ── foco visível (a11y) ── */
          .mapa-chip:focus-visible,
          .map-icon-action:focus-visible,
          .map-card-combo-btn:focus-visible,
          .sweet-route-icon-action:focus-visible,
          .sweet-route-primary:focus-visible,
          .sweet-route-secondary:focus-visible,
          .sweet-route-close:focus-visible,
          .sweet-route-fab:focus-visible,
          .mapa-search:focus-visible {
            outline: 3px solid var(--lovers-pink);
            outline-offset: 2px;
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
            width: min(560px, 100%);
            max-height: min(92vh, 920px);
            overflow-y: auto;
            border-radius: 32px;
            background: rgba(43,24,16,.32);
            border: 1px solid rgba(255,255,255,.22);
            box-shadow: 0 30px 80px rgba(43,24,16,.34);
            padding: clamp(14px, 3vw, 22px);
          }
          .sweet-route-close {
            position: absolute;
            top: 14px;
            right: 14px;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,.3);
            background: rgba(255,255,255,.15);
            color: var(--lovers-cream);
            font-size: 24px;
            line-height: 1;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;
          }
          .sweet-route-share-card {
            position: relative;
            overflow: hidden;
            border-radius: 28px;
            padding: clamp(24px, 5vw, 42px);
            background:
              radial-gradient(circle at 12% 8%, rgba(241,7,103,.24), transparent 30%),
              radial-gradient(circle at 88% 12%, rgba(255,190,60,.28), transparent 32%),
              linear-gradient(145deg, var(--lovers-cream) 0%, #fff7ec 48%, #ffd9e8 100%);
            border: 2px solid rgba(135,14,45,.18);
            box-shadow: inset 0 0 0 1px rgba(255,255,255,.55);
          }
          .sweet-route-share-card::before {
            content: "";
            position: absolute;
            inset: 14px;
            border: 1px dashed rgba(135,14,45,.18);
            border-radius: 22px;
            pointer-events: none;
          }
          .sweet-route-top {
            position: relative;
            z-index: 1;
            display: flex;
            justify-content: space-between;
            gap: 10px;
            align-items: center;
            margin-bottom: 18px;
          }
          .sweet-route-kicker,
          .sweet-route-date {
            display: inline-flex;
            align-items: center;
            border-radius: 999px;
            padding: 8px 12px;
            font-family: var(--font-lovers-body);
            font-size: 10px;
            font-weight: 900;
            letter-spacing: .1em;
            text-transform: uppercase;
          }
          .sweet-route-kicker { background: var(--lovers-red); color: var(--lovers-cream); }
          .sweet-route-date { background: var(--lovers-pink); color: var(--lovers-cream); }
          .sweet-route-share-card h2 {
            position: relative;
            z-index: 1;
            margin: 0;
            font-family: var(--font-lovers-display);
            font-size: clamp(44px, 9vw, 76px);
            line-height: .82;
            color: var(--lovers-ink);
            text-transform: uppercase;
            letter-spacing: .01em;
          }
          .sweet-route-share-card > p {
            position: relative;
            z-index: 1;
            margin: 14px 0 0;
            max-width: 420px;
            color: var(--lovers-brown);
            font-size: 15px;
            line-height: 1.42;
          }
          .sweet-route-summary {
            position: relative;
            z-index: 1;
            margin: 22px 0;
            display: inline-flex;
            align-items: center;
            gap: 12px;
            border-radius: 20px;
            background: var(--lovers-red);
            color: var(--lovers-cream);
            padding: 12px 16px;
            font-family: var(--font-lovers-body);
            text-transform: uppercase;
            letter-spacing: .06em;
            font-size: 12px;
            font-weight: 900;
          }
          .sweet-route-summary strong { font-size: 36px; line-height: 1; font-weight: 900; }
          .sweet-route-list {
            position: relative;
            z-index: 1;
            display: grid;
            gap: 10px;
            padding: 0;
            margin: 0;
            list-style: none;
          }
          .sweet-route-stop {
            display: grid;
            grid-template-columns: 58px 1fr;
            gap: 14px;
            align-items: start;
            padding: 14px;
            border-radius: 20px;
            background: rgba(255,255,255,.82);
            border: 1px solid rgba(135,14,45,.14);
          }
          .sweet-route-brand {
            position: relative;
            width: 58px;
            height: 58px;
            border-radius: 50%;
            overflow: visible;
            flex-shrink: 0;
          }
          .sweet-route-brand-image,
          .sweet-route-brand-fallback {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fff;
            border: 1.5px solid rgba(135,14,45,.18);
            box-shadow: 0 6px 16px rgba(43,24,16,.10);
          }
          .sweet-route-brand-image {
            object-fit: cover;
            object-position: center;
            display: block;
          }
          .sweet-route-brand-fallback {
            color: var(--lovers-cream);
            background: var(--lovers-pink);
            font-family: var(--font-lovers-body);
            font-weight: 900;
            font-size: 22px;
          }
          .sweet-route-stop-badge {
            position: absolute;
            top: -6px;
            left: -6px;
            min-width: 22px;
            height: 22px;
            border-radius: 999px;
            padding: 0 6px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: var(--lovers-red);
            color: var(--lovers-cream);
            font-family: var(--font-lovers-body);
            font-size: 11px;
            font-weight: 900;
            line-height: 1;
            border: 2px solid #fff;
            box-shadow: 0 4px 12px rgba(43,24,16,.18);
            z-index: 2;
          }
          .sweet-route-stop-content { min-width: 0; }
          .sweet-route-stop-content strong {
            display: block;
            color: var(--lovers-ink);
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: .04em;
            line-height: 1.05;
          }
          .sweet-route-stop-content span,
          .sweet-route-stop-content small {
            display: block;
            color: var(--lovers-brown);
            margin-top: 4px;
          }
          .sweet-route-stop-content span {
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: .04em;
            font-size: 11px;
            color: var(--lovers-red);
          }
          .sweet-route-stop-content small {
            font-size: 11px;
            opacity: .78;
            line-height: 1.35;
          }
          .sweet-route-stop-actions {
            grid-column: 2;
            display: flex;
            gap: 6px;
            margin-top: 9px;
          }
          .sweet-route-icon-action {
            width: 28px;
            height: 28px;
            border-radius: 999px;
            border: 1px solid rgba(135,14,45,.22);
            background: rgba(255,255,255,.68);
            color: var(--lovers-red);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 900;
            line-height: 1;
            cursor: pointer;
            transition: background .18s ease, color .18s ease, opacity .18s ease, transform .18s ease;
          }
          .sweet-route-icon-action:hover:not(:disabled) {
            background: var(--lovers-red);
            color: var(--lovers-cream);
            transform: translateY(-1px);
          }
          .sweet-route-icon-action:disabled { opacity: .32; cursor: not-allowed; }
          .sweet-route-icon-action--danger { border-color: rgba(135,14,45,.34); }
          @media (max-width: 560px) {
            .sweet-route-stop {
              grid-template-columns: 52px 1fr;
              gap: 12px;
              padding: 12px;
            }
            .sweet-route-brand { width: 52px; height: 52px; }
            .sweet-route-stop-actions { gap: 5px; }
            .sweet-route-icon-action { width: 30px; height: 30px; }
          }
          .sweet-route-warning {
            position: relative;
            z-index: 1;
            margin-top: 14px;
            color: var(--lovers-red);
            font-weight: 800;
            font-size: 12px;
          }
          .sweet-route-footer {
            position: relative;
            z-index: 1;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid rgba(135,14,45,.18);
            display: grid;
            gap: 4px;
            text-align: center;
            color: var(--lovers-red);
            text-transform: uppercase;
            letter-spacing: .08em;
          }
          .sweet-route-footer strong {
            font-family: var(--font-lovers-body);
            font-size: 13px;
            font-weight: 900;
          }
          .sweet-route-footer span {
            font-family: var(--font-lovers-body);
            font-size: 10px;
            font-weight: 800;
          }
          .sweet-route-print-hint {
            margin: 14px 4px 0;
            color: var(--lovers-cream);
            opacity: .86;
            font-size: 12px;
            line-height: 1.4;
            text-align: center;
          }
          .sweet-route-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 16px;
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
            border: 1px solid rgba(255,255,255,.4);
            background: transparent;
            color: var(--lovers-cream);
            font-family: var(--font-lovers-body);
            font-weight: 900;
            font-size: 13px;
            letter-spacing: .06em;
            text-transform: uppercase;
            cursor: pointer;
          }
          @media (max-width: 768px) {
            /* sobe o FAB acima da barra inferior fixa (.lovers-tabbar) para não ficar escondido */
            .sweet-route-fab { bottom: calc(78px + env(safe-area-inset-bottom, 0px)); }
          }
          @media (max-width: 560px) {
            .sweet-route-fab { left: 16px; right: 16px; bottom: calc(78px + env(safe-area-inset-bottom, 0px)); }
            .sweet-route-overlay { padding: 10px; }
            .sweet-route-panel { border-radius: 24px; padding: 10px; }
            .sweet-route-share-card { border-radius: 22px; padding: 22px 16px; }
            .sweet-route-top { align-items: flex-start; flex-direction: column; gap: 8px; }
            .sweet-route-stop { grid-template-columns: 34px 1fr; }
            .sweet-route-remove { grid-column: 2; justify-self: start; margin-top: 6px; }
            .sweet-route-number { width: 34px; height: 34px; font-size: 14px; }
            .sweet-route-actions { flex-direction: column; }
            .sweet-route-primary, .sweet-route-secondary { width: 100%; justify-content: center; }
          }

          /* ── chips de filtro ── */
          .mapa-chip {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 34px;
            font-family: var(--font-lovers-body);
            font-size: 11px;
            font-weight: 900;
            padding: 6px 14px;
            border-radius: 999px;
            border: 1.5px solid var(--lovers-red);
            cursor: pointer;
            transition: background .15s, color .15s, box-shadow .15s, transform .15s;
            white-space: nowrap;
            text-transform: uppercase;
            letter-spacing: .06em;
          }
          .mapa-chip:hover { background: var(--lovers-red); color: #fff; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(135,14,45,.18); }
          .mapa-chip:disabled { opacity: .6; cursor: default; transform: none; box-shadow: none; }

          /* ── card do participante ── */
          .map-participant-card {
            background: #fff;
            border: 1.5px solid rgba(135,14,45,.22);
            border-radius: 18px;
            padding: 14px;
            transition: border-color .18s, background .18s, box-shadow .18s;
          }
          .map-participant-card:hover {
            border-color: rgba(135,14,45,.4);
            box-shadow: 0 10px 26px rgba(135,14,45,.1);
          }
          .map-participant-card--active {
            background: var(--lovers-cream);
            border-color: var(--lovers-red);
            box-shadow: 0 18px 42px rgba(135,14,45,.18);
          }

          /* ── cabeçalho do card ── */
          .map-card-header {
            display: flex;
            gap: 14px;
            align-items: center;
            margin-bottom: 0;
            cursor: pointer;
            border-radius: 14px;
          }
          .map-participant-card--active .map-card-header { margin-bottom: 14px; }
          .map-card-header:focus-visible { outline: 2px solid var(--lovers-pink, #f20567); outline-offset: 2px; }
          .map-card-chevron {
            margin-left: auto; flex: 0 0 auto; display: flex; align-items: center;
            color: rgba(135,14,45,.5); transition: transform .2s ease;
          }
          .map-participant-card--active .map-card-chevron { transform: rotate(180deg); }
          @media (prefers-reduced-motion: reduce) { .map-card-chevron { transition: none; } }
          .map-card-brand {
            position: relative;
            flex: 0 0 auto;
          }
          .map-card-logo {
            width: 60px;
            height: 60px;
            border-radius: 15px;
            background: #fff;
            border: 1px solid rgba(135,14,45,.12);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            padding: 0;
          }
          .map-card-logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            object-position: center;
            display: block;
          }
          .map-card-logo--empty {
            font-family: var(--font-lovers-display);
            font-size: 28px;
            color: var(--lovers-red);
            text-transform: uppercase;
          }
          .map-card-number {
            position: absolute;
            right: -7px;
            bottom: -7px;
            min-width: 24px;
            height: 24px;
            padding: 0 6px;
            border-radius: 999px;
            background: #F5B800;
            color: #3F1A0A;
            font-family: var(--font-lovers-display);
            font-weight: 700;
            font-size: 14px;
            line-height: 24px;
            text-align: center;
            box-sizing: border-box;
            border: 2px solid #fff;
            box-shadow: 0 2px 6px rgba(0,0,0,.18);
          }
          .map-card-title-group {
            min-width: 0;
            flex: 1;
            padding-top: 2px;
          }
          .map-card-edition-kicker {
            display: inline-block;
            font-family: var(--font-lovers-body);
            font-size: 9px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: .1em;
            color: #fff;
            background: var(--lovers-red);
            border-radius: 999px;
            padding: 3px 9px;
            margin-bottom: 7px;
          }
          .map-card-title-group h3 {
            margin: 0;
            font-family: var(--font-lovers-display);
            font-size: clamp(26px, 2.1vw, 34px);
            line-height: .9;
            color: var(--lovers-ink);
            text-transform: uppercase;
            letter-spacing: .015em;
            text-wrap: balance;
          }
          .map-card-theme {
            margin-top: 8px;
            padding-left: 11px;
            border-left: 3px solid #F5B800;
          }
          .map-card-theme em {
            font-style: italic;
            font-size: 17px;
            font-weight: 600;
            color: var(--lovers-ink);
            line-height: 1.18;
          }
          .map-card-ig {
            margin-top: 9px;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-family: var(--font-lovers-body);
            font-size: 12px;
            font-weight: 800;
            color: var(--lovers-red);
            text-decoration: none;
          }
          .map-card-ig svg { width: 14px; height: 14px; }
          .map-card-ig:hover { text-decoration: underline; }
          .map-card-meta {
            margin-top: 8px;
            font-size: 12px;
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
          .map-card-combo-btn {
            margin-top: 12px;
            width: 100%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            border-radius: 999px;
            min-height: 40px;
            padding: 0 18px;
            background: var(--lovers-red);
            color: var(--lovers-cream);
            border: 0;
            font-family: var(--font-lovers-body);
            font-weight: 900;
            font-size: 12px;
            letter-spacing: .06em;
            text-transform: uppercase;
            cursor: pointer;
            transition: transform .15s, background .15s;
          }
          .map-card-combo-btn:hover { transform: translateY(-1px); background: var(--lovers-pink); }

          /* ── lista de unidades ── */
          .map-location-list {
            display: grid;
            gap: 12px;
            padding-top: 14px;
            border-top: 1px solid rgba(135,14,45,.12);
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
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          .map-location-title {
            flex: 1;
            min-width: 0;
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
          .map-location-status {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            flex: 0 0 auto;
            font-size: 11px;
            line-height: 1;
            font-family: var(--font-lovers-body);
            border-radius: 999px;
            padding: 4px 9px;
          }
          .map-location-status strong {
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: .05em;
          }
          .map-location-status-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            flex: 0 0 auto;
          }
          .map-location-status--open { background: rgba(27,138,90,.12); }
          .map-location-status--open strong { color: #1B8A5A; }
          .map-location-status--open .map-location-status-dot { background: #1B8A5A; }
          .map-location-status--closed { background: rgba(214,54,72,.1); }
          .map-location-status--closed strong { color: var(--lovers-red); }
          .map-location-status--closed .map-location-status-dot { background: var(--lovers-red); }
          .map-location-status-line {
            margin-top: 6px;
            font-size: 12px;
            font-family: var(--font-lovers-body);
            font-weight: 700;
            color: var(--lovers-brown);
            opacity: .75;
          }
          .map-location-status-line--open { color: #1B8A5A; opacity: .9; }

          /* ── botões de ação (ícones) ── */
          .map-location-actions {
            display: flex;
            gap: 8px;
            margin-top: 10px;
          }
          .map-icon-action {
            width: 44px;
            height: 44px;
            flex: 0 0 auto;
            border: 2px solid rgba(135,14,45,.24);
            background: rgba(255,255,255,.9);
            color: var(--lovers-red);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            text-decoration: none;
            transition: transform .15s, background .15s, color .15s, border-color .15s, box-shadow .15s;
          }
          .map-icon-action svg { width: 20px; height: 20px; }
          .map-icon-action:hover {
            transform: translateY(-2px);
            filter: brightness(.93);
            box-shadow: 0 8px 18px rgba(135,14,45,.22);
          }
          /* 4 ações com cores distintas (preenchidas) */
          .map-icon-action[title="Ver no mapa"] {
            background: var(--lovers-cyan); color: #04282d; border-color: var(--lovers-cyan);
          }
          .map-icon-action--primary {
            background: var(--lovers-pink); color: #fff; border-color: var(--lovers-pink);
          }
          .map-icon-action--route {
            background: var(--lovers-purple); color: #fff; border-color: var(--lovers-purple);
          }
          .map-icon-action[title="Instagram"] {
            background: var(--lovers-yellow); color: var(--lovers-brown); border-color: var(--lovers-yellow);
          }
          /* estados de seleção vencem (specificity 2 classes + ordem) */
          .map-icon-action.map-icon-action--active {
            background: var(--lovers-red); color: var(--lovers-cream); border-color: var(--lovers-red);
          }
          .map-icon-action.map-icon-action--selected {
            background: var(--lovers-red); color: var(--lovers-cream); border-color: var(--lovers-red);
          }

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

          /* ── responsivo: empilha painéis — mapa primeiro, lista depois ── */
          @media (max-width: 860px) {
            .mapa-floating-layout {
              width: calc(100% - 28px);
              grid-template-columns: 1fr;
              gap: 16px;
            }
            .mapa-floating-panel { height: auto; min-height: 0; max-height: none; }
            .mapa-floating-panel--map { height: 52svh; min-height: 360px; max-height: 520px; order: 1; }
            .mapa-floating-panel--sidebar { height: min(680px, 72svh); min-height: 480px; max-height: 720px; order: 2; }
          }
          @media (max-width: 480px) {
            .mapa-floating-layout { --map-panel-radius: 22px; }
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
