import React, { useState, useEffect, useRef, useMemo } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { PARTICIPANTS } from '../../../data/participants'
import { COMBOS } from '../../../data/combos'

// Mapa 3D fotorrealista (Google Photorealistic 3D Tiles via maps3d, beta).
// Provider opt-in (ver Mapa.jsx). Em erro de API → onError → fallback 2D.
// Requer Map Tiles API habilitada + billing. mode é OBRIGATÓRIO (senão não renderiza).

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY
const NATAL_CENTER = { lat: -5.7945, lng: -35.2110 }

if (GOOGLE_MAPS_API_KEY) {
  setOptions({ key: GOOGLE_MAPS_API_KEY, v: 'beta' })
}

// ─── helpers de horário (espelham o mapa 2D) ──────────────────────────────────
const DAY_ABBR = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function formatHourLabel(hhmm) {
  const [h, m] = hhmm.split(':')
  return m === '00' ? `${parseInt(h, 10)}h` : `${parseInt(h, 10)}h${m}`
}

function getOpenStatus(hours, now = new Date()) {
  if (!hours || typeof hours !== 'object') return { state: 'unknown', label: '', detail: '' }
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
  const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
  const slotsFor = d => Array.isArray(hours[d]) ? hours[d] : []

  for (const [open, close] of slotsFor(today)) {
    const o = toMin(open), c = toMin(close)
    const openNow = c <= o ? nowMin >= o : nowMin >= o && nowMin < c
    if (openNow) return { state: 'open', label: 'Aberto', detail: `Fecha às ${formatHourLabel(close)}` }
  }
  const yesterday = (today + 6) % 7
  for (const [open, close] of slotsFor(yesterday)) {
    const o = toMin(open), c = toMin(close)
    if (c <= o && nowMin < c) return { state: 'open', label: 'Aberto', detail: `Fecha às ${formatHourLabel(close)}` }
  }
  const laterToday = slotsFor(today).map(([open]) => open).filter(open => toMin(open) > nowMin).sort((a, b) => toMin(a) - toMin(b))
  if (laterToday.length > 0) return { state: 'closed', label: 'Fechado', detail: `Abre às ${formatHourLabel(laterToday[0])}` }
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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function getMapsLink(loc) {
  if (loc.mapsUrl) return loc.mapsUrl
  return `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`
}

function getAllLocations() {
  const out = []
  PARTICIPANTS.forEach((p, idx) => {
    const combo = COMBOS.find(c => c.participantId === p.id) || null
    const source = Array.isArray(p.locations) && p.locations.length > 0
      ? p.locations
      : [{ id: `${p.id}-main`, name: p.neighborhood, address: p.address, neighborhood: p.neighborhood, city: p.city, latitude: p.latitude, longitude: p.longitude, mapsUrl: p.mapsUrl, openingHours: p.openingHours, hours: p.hours }]
    for (const loc of source) {
      if (!Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) continue
      out.push({
        id: loc.id || `${p.id}-loc`,
        number: idx + 1,
        participantName: p.name,
        participantSlug: p.slug,
        logo: p.logo || '',
        edition: p.edition || '',
        theme: p.theme || '',
        comboName: combo?.name || '',
        comboSlug: combo?.slug || p.slug || '',
        hasCombo: Boolean(combo),
        instagram: p.instagram || '',
        whatsapp: p.whatsapp || '',
        locationName: loc.name || p.neighborhood || '',
        address: loc.address || p.address || '',
        neighborhood: loc.neighborhood || p.neighborhood || '',
        city: loc.city || p.city || '',
        openingHours: loc.openingHours || p.openingHours || '',
        hours: loc.hours || p.hours || null,
        mapsUrl: loc.mapsUrl || p.mapsUrl || '',
        lat: loc.latitude,
        lng: loc.longitude,
      })
    }
  })
  return out
}

export function MapaGoogle3DPage({ onError, onExit }) {
  const containerRef = useRef(null)
  const apiRef = useRef(null)
  const mapElRef = useRef(null)
  const markersRef = useRef({})
  const popoverRef = useRef(null)

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

  const flyTo = (loc, range = 700) => {
    const map = mapElRef.current
    if (!map) return
    try {
      map.flyCameraTo({
        endCamera: { center: { lat: loc.lat, lng: loc.lng, altitude: 0 }, tilt: 65, range, heading: 0 },
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

      const status = getOpenStatus(loc.hours)
      const mapsLink = getMapsLink(loc)
      const igHandle = loc.instagram.replace(/^@/, '')
      const waDigits = loc.whatsapp.replace(/\D/g, '')

      const logoHtml = loc.logo
        ? `<img class="m3c-logo" src="${escapeHtml(loc.logo)}" alt="" />`
        : `<div class="m3c-logo m3c-logo--empty">${escapeHtml(loc.participantName.slice(0, 1))}</div>`

      const badgeHtml = status.state !== 'unknown'
        ? `<span class="m3c-badge m3c-badge--${status.state}"><span class="m3c-dot"></span>${escapeHtml(status.label)}</span>`
        : ''

      // caixa "Ver mais" — só com o que existir
      const moreParts = []
      if (loc.address) moreParts.push(`<div class="m3c-row"><span>📍</span><span>${escapeHtml(loc.address)}</span></div>`)
      if (loc.openingHours) moreParts.push(`<div class="m3c-row"><span>🕒</span><span>${escapeHtml(loc.openingHours).replace(/\n/g, '<br>')}</span></div>`)
      if (status.detail) moreParts.push(`<div class="m3c-row m3c-row--status m3c-row--${status.state}"><span>•</span><span>${escapeHtml(status.detail)}</span></div>`)
      if (loc.comboName) moreParts.push(`<div class="m3c-row"><span>🍫</span><span>${escapeHtml(loc.comboName)}</span></div>`)
      if (loc.hasCombo) moreParts.push(`<a class="m3c-combo-btn" href="#/lovers/combos/${escapeHtml(loc.comboSlug)}">Ver combo →</a>`)
      if (waDigits) moreParts.push(`<a class="m3c-row m3c-row--link" href="https://wa.me/${waDigits}" target="_blank" rel="noopener"><span>📞</span><span>WhatsApp</span></a>`)

      const detailsHtml = moreParts.length
        ? `<details class="m3c-more"><summary>Ver mais</summary><div class="m3c-more-body">${moreParts.join('')}</div></details>`
        : ''

      const content = document.createElement('div')
      content.className = 'm3c'
      content.innerHTML = `
        <div class="m3c-head">
          ${logoHtml}
          <div class="m3c-titles">
            ${loc.edition ? `<span class="m3c-kicker">${escapeHtml(loc.edition)}</span>` : ''}
            <strong class="m3c-name">${escapeHtml(loc.participantName)}</strong>
            ${loc.theme ? `<span class="m3c-theme">${escapeHtml(loc.theme)}</span>` : ''}
          </div>
        </div>
        <div class="m3c-sub">
          ${badgeHtml}
          <span class="m3c-place">${escapeHtml([loc.neighborhood, loc.city].filter(Boolean).join(' · '))}</span>
        </div>
        <div class="m3c-actions">
          <a href="${escapeHtml(mapsLink)}" target="_blank" rel="noopener">Como chegar</a>
          ${igHandle ? `<a href="https://instagram.com/${escapeHtml(igHandle)}" target="_blank" rel="noopener">Instagram</a>` : ''}
        </div>
        ${detailsHtml}`

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

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) { setFailed(true); onError?.('missing-key'); return }
    let cancelled = false
    ;(async () => {
      try {
        const maps3d = await importLibrary('maps3d')
        const { Map3DElement, Marker3DInteractiveElement, AltitudeMode, PopoverElement, MapMode } = maps3d
        if (cancelled || !containerRef.current || mapElRef.current) return
        if (!Map3DElement || !Marker3DInteractiveElement) throw new Error('maps3d API indisponível')

        apiRef.current = { Marker3DInteractiveElement, AltitudeMode, PopoverElement }

        const map3d = new Map3DElement({
          center: { lat: NATAL_CENTER.lat, lng: NATAL_CENTER.lng, altitude: 0 },
          range: 9000,
          tilt: 55,
          heading: 0,
          mode: MapMode ? MapMode.HYBRID : 'HYBRID',
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
      if (mapElRef.current) { mapElRef.current.remove(); mapElRef.current = null }
    }
  }, [])

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
      flyTo({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 1200)
    })
  }

  if (failed) return null

  return (
    <div className="map3d-wrap">
      <style>{`
        .map3d-wrap { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 50; }
        .map3d-canvas { width: 100%; height: 100%; }
        .map3d-overlay {
          position: absolute; top: 16px; left: 16px; z-index: 5;
          width: 300px; max-width: calc(100% - 32px);
          background: rgba(255,241,230,0.96); backdrop-filter: blur(6px);
          border-radius: 14px; padding: 14px; box-shadow: 0 4px 18px rgba(0,0,0,0.25);
          display: flex; flex-direction: column; gap: 10px; max-height: calc(100% - 32px);
        }
        .map3d-topbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .map3d-title { font-family: var(--font-lovers-display,serif); color: var(--lovers-red,#D63648); font-size: 19px; margin: 0; }
        .map3d-exit {
          border: 1px solid var(--lovers-red,#D63648); background: #fff; color: var(--lovers-red,#D63648);
          border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;
        }
        .map3d-exit:hover { background: var(--lovers-red,#D63648); color: #fff; }
        .map3d-chips { display: flex; flex-wrap: wrap; gap: 6px; max-height: 90px; overflow-y: auto; }
        .map3d-chip { border: 1px solid var(--lovers-red,#D63648); background: transparent; color: var(--lovers-red,#D63648); border-radius: 999px; padding: 3px 10px; font-size: 12px; cursor: pointer; }
        .map3d-chip--active { background: var(--lovers-red,#D63648); color: #fff; }
        .map3d-list { list-style: none; margin: 0; padding: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
        .map3d-item { display: flex; align-items: center; gap: 8px; text-align: left; width: 100%; border: none; background: transparent; padding: 8px 10px; border-radius: 8px; cursor: pointer; font-size: 14px; color: var(--ink,#2B1810); }
        .map3d-item:hover { background: rgba(214,54,72,0.08); }
        .map3d-item--active { background: rgba(214,54,72,0.16); font-weight: 600; }
        .map3d-item-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; background: #bbb; }
        .map3d-item-dot--open { background: #2e9e5b; }
        .map3d-item-dot--closed { background: #d14b4b; }
        .map3d-item-txt small { display: block; opacity: 0.7; font-size: 12px; }
        .map3d-locate { align-self: flex-start; border: none; background: var(--lovers-red,#D63648); color: #fff; border-radius: 999px; padding: 6px 14px; font-size: 13px; cursor: pointer; }

        /* ── card do popover ── */
        .m3c { display: flex; flex-direction: column; gap: 8px; padding: 10px; min-width: 210px; max-width: 260px; font-family: var(--font-lovers-body, sans-serif); }
        .m3c-head { display: flex; gap: 10px; align-items: center; }
        .m3c-logo { width: 44px; height: 44px; border-radius: 10px; object-fit: cover; flex: 0 0 auto; background: #fff; }
        .m3c-logo--empty { display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--lovers-red,#D63648); background: var(--lovers-cream,#FFF1E6); }
        .m3c-titles { display: flex; flex-direction: column; gap: 1px; }
        .m3c-kicker { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; opacity: .6; }
        .m3c-name { color: var(--lovers-red,#D63648); font-size: 16px; line-height: 1.1; }
        .m3c-theme { font-size: 12px; font-style: italic; opacity: .8; }
        .m3c-sub { display: flex; align-items: center; gap: 8px; font-size: 12px; }
        .m3c-place { opacity: .8; }
        .m3c-badge { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; font-size: 11px; padding: 2px 7px; border-radius: 999px; }
        .m3c-badge--open { background: #e6f5ec; color: #1e7a44; }
        .m3c-badge--closed { background: #fbe9e9; color: #b23535; }
        .m3c-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        .m3c-actions { display: flex; gap: 8px; }
        .m3c-actions a { flex: 1; text-align: center; background: var(--lovers-red,#D63648); color: #fff; border-radius: 999px; padding: 6px 8px; font-size: 12px; font-weight: 700; text-decoration: none; }
        .m3c-actions a:hover { opacity: .9; }
        .m3c-more { border-top: 1px solid rgba(0,0,0,.1); padding-top: 4px; }
        .m3c-more > summary { cursor: pointer; font-size: 12px; font-weight: 700; color: var(--lovers-red,#D63648); list-style: none; padding: 4px 0; }
        .m3c-more > summary::-webkit-details-marker { display: none; }
        .m3c-more > summary::after { content: ' ▾'; }
        .m3c-more[open] > summary::after { content: ' ▴'; }
        .m3c-more-body { display: flex; flex-direction: column; gap: 6px; padding-top: 4px; }
        .m3c-row { display: flex; gap: 7px; font-size: 12px; line-height: 1.3; color: var(--ink,#2B1810); text-decoration: none; }
        .m3c-row > span:first-child { flex: 0 0 auto; }
        .m3c-row--link { color: var(--lovers-red,#D63648); font-weight: 600; }
        .m3c-row--status { font-weight: 600; }
        .m3c-combo-btn { display: inline-block; background: var(--lovers-cream,#FFF1E6); color: var(--lovers-red,#D63648); border: 1px solid var(--lovers-red,#D63648); border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 700; text-decoration: none; text-align: center; }

        @media (max-width: 720px) {
          .map3d-overlay { width: calc(100% - 32px); max-height: 42%; }
        }
      `}</style>

      <div ref={containerRef} className="map3d-canvas" />

      <div className="map3d-overlay">
        <div className="map3d-topbar">
          <h2 className="map3d-title">Mapa da Doçura — 3D</h2>
          {onExit && <button className="map3d-exit" onClick={onExit}>← Mapa 2D</button>}
        </div>
        <div className="map3d-chips">
          <button className={`map3d-chip ${!filterBairro ? 'map3d-chip--active' : ''}`} onClick={() => setFilterBairro(null)}>Todos</button>
          {bairros.map(b => (
            <button key={b} className={`map3d-chip ${filterBairro === b ? 'map3d-chip--active' : ''}`} onClick={() => setFilterBairro(b)}>{b}</button>
          ))}
        </div>
        <ul className="map3d-list">
          {visible.map(loc => {
            const st = getOpenStatus(loc.hours)
            return (
              <li key={loc.id}>
                <button className={`map3d-item ${selectedId === loc.id ? 'map3d-item--active' : ''}`} onClick={() => selectLocation(loc)}>
                  <span className={`map3d-item-dot ${st.state === 'open' ? 'map3d-item-dot--open' : st.state === 'closed' ? 'map3d-item-dot--closed' : ''}`} aria-hidden="true"></span>
                  <span className="map3d-item-txt">
                    {loc.participantName}
                    <small>{loc.locationName || loc.neighborhood}</small>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <button className="map3d-locate" onClick={locateUser}>Minha localização</button>
      </div>
    </div>
  )
}
