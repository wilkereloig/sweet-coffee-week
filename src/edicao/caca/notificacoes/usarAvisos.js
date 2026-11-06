import React from 'react'
import { organizarAvisos } from './logica.js'

/**
 * Lê a central de avisos do mapa (`caca_avisos_ler`). estado: 'carregando' | 'pronto' | 'falha'.
 * `marcarVistos(ids)` grava no servidor e atualiza a lista na tela; se a gravação falhar, a tela não finge que viu.
 */
export function usarAvisos (caca) {
  const [estado, setEstado] = React.useState('carregando')
  const [avisos, setAvisos] = React.useState([])
  const [rodada, setRodada] = React.useState(0)
  const { chave, api } = caca
  React.useEffect(() => {
    if (!chave) return undefined
    let vivo = true
    setEstado('carregando')
    api.avisosLer(chave).then((r) => {
      if (!vivo) return
      if (r.ok) { setAvisos(organizarAvisos(r.avisos)); setEstado('pronto') } else setEstado('falha')
    })
    return () => { vivo = false }
  }, [chave, api, rodada])
  const tentar = React.useCallback(() => setRodada((n) => n + 1), [])
  const marcarVistos = React.useCallback(async (ids) => {
    const r = await api.avisosVisto(chave, ids)
    if (r.ok) setAvisos((lista) => lista.map((a) => (ids.includes(a.id) ? { ...a, visto: true } : a)))
    return r.ok
  }, [api, chave])
  return { estado, avisos, tentar, marcarVistos }
}
