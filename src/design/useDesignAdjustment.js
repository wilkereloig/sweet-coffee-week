// Hook que conecta um elemento editável ao store do Design Mode.
// Uso: const photo = useDesignAdjustment('home.hero.photo')
//      <div style={photo.style} ... />
// Retorna {} de estilo quando o ajuste está no default (no-op visual).

import React from 'react'
import { getAdjustment, subscribe, styleFor } from './layoutAdjustments'

export function useDesignAdjustment(id) {
  const [adj, setAdj] = React.useState(() => getAdjustment(id))

  React.useEffect(() => {
    setAdj(getAdjustment(id))
    return subscribe(() => setAdj(getAdjustment(id)))
  }, [id])

  return { adj, style: styleFor(adj) }
}
