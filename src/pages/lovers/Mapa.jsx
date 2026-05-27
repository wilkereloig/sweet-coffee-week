import React from 'react'
import { MapaLeafletPage } from './maps/MapaLeaflet'
import { MapaGooglePage } from './maps/MapaGoogle'

const MAP_PROVIDER = import.meta.env.VITE_LOVERS_MAP_PROVIDER || 'leaflet'

export function MapaPage({ navigate }) {
  if (MAP_PROVIDER === 'google') {
    return <MapaGooglePage navigate={navigate} />
  }

  return <MapaLeafletPage navigate={navigate} />
}
