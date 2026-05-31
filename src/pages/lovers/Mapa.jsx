import React, { useState } from 'react'
import { MapaGooglePage } from './maps/MapaGoogle'
import { MapaGoogle3DPage } from './maps/MapaGoogle3D'

// Provider 3D é opt-in via env (VITE_LOVERS_MAP_PROVIDER=google3d)
// ou query de teste (#/lovers/mapa?map3d=1). Em erro, cai para o 2D.
function want3D() {
  if (import.meta.env.VITE_LOVERS_MAP_PROVIDER === 'google3d') return true
  if (typeof window !== 'undefined') {
    const hash = window.location.hash || ''
    if (/[?&]map3d=1/.test(hash) || /[?&]map3d=1/.test(window.location.search)) return true
  }
  return false
}

export function MapaPage({ navigate, variant }) {
  const [use3D, setUse3D] = useState(want3D())

  if (use3D) {
    return <MapaGoogle3DPage onError={() => setUse3D(false)} onExit={() => setUse3D(false)} />
  }
  return <MapaGooglePage navigate={navigate} variant={variant} />
}
