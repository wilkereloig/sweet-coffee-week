import React from 'react'
import { organizarMetas } from './logica.js'

/**
 * Lê `caca_metas_ler` uma vez por mapa. estado: 'carregando' | 'pronto' | 'falha'. `metas` já organizada (ou null).
 * Compartilhado pela página de Metas e pelo centro de avisos da central, para os dois nunca discordarem.
 */
export function usarMetas (caca) {
  const [estado, setEstado] = React.useState('carregando')
  const [metas, setMetas] = React.useState(null)
  const [rodada, setRodada] = React.useState(0)
  const { chave, api } = caca
  React.useEffect(() => {
    if (!chave) return undefined
    let vivo = true
    setEstado('carregando')
    api.metasLer(chave).then((r) => {
      if (!vivo) return
      if (r.ok) { setMetas(organizarMetas(r.metas)); setEstado('pronto') } else setEstado('falha')
    })
    return () => { vivo = false }
  }, [chave, api, rodada])
  const tentar = React.useCallback(() => setRodada((n) => n + 1), [])
  return { estado, metas, tentar }
}
