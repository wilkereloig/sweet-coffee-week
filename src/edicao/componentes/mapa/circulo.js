/** Círculo geográfico (polígono GeoJSON de `n` lados) de raio `raioKm` ao redor de { lat, lng } — o "alcance" discreto do Perto de mim no mapa real. */
export function poligonoCirculo ({ lat, lng }, raioKm, n = 72) {
  const R = 6371
  const d = raioKm / R
  const la = (lat * Math.PI) / 180
  const lo = (lng * Math.PI) / 180
  const anel = []
  for (let i = 0; i <= n; i++) {
    const b = (2 * Math.PI * i) / n
    const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b))
    const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2))
    anel.push([(lo2 * 180) / Math.PI, (la2 * 180) / Math.PI])
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [anel] } }
}
