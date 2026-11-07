import React from 'react'
import { organizarMeusPremios } from './logica.js'

const REFRESCO_MS = 60000

/** Lê os prêmios do mapa atual pela chave pessoal; não usa nem expõe a lista pública de ganhadores. */
export function usarMeusPremios (caca) {
  const [estado, setEstado] = React.useState(caca.chave ? 'carregando' : 'sem-mapa')
  const [premios, setPremios] = React.useState([])
  const [rodada, setRodada] = React.useState(0)

  React.useEffect(() => {
    if (!caca.chave) { setEstado('sem-mapa'); setPremios([]); return undefined }
    let vivo = true
    const ler = async () => {
      const r = await caca.api.meusPremios(caca.chave)
      if (!vivo) return
      if (r.ok) { setPremios(organizarMeusPremios(r.premios)); setEstado('pronto') }
      else setEstado((atual) => (atual === 'pronto' ? atual : 'falha'))
    }
    ler()
    const id = setInterval(ler, REFRESCO_MS)
    const aoVoltar = () => { if (document.visibilityState === 'visible') setRodada((n) => n + 1) }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => { vivo = false; clearInterval(id); document.removeEventListener('visibilitychange', aoVoltar) }
  }, [caca.chave, caca.api, rodada])

  const tentar = React.useCallback(() => { setEstado('carregando'); setRodada((n) => n + 1) }, [])
  return { estado, premios, tentar }
}
