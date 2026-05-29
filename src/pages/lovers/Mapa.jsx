import React from 'react'
import { MapaGooglePage } from './maps/MapaGoogle'

export function MapaPage({ navigate, variant }) {
  return <MapaGooglePage navigate={navigate} variant={variant} />
}
