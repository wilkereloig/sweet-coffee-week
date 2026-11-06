/*
 * Lê `caca_premios_publico` e mantém a leitura fresca (o estado do dia muda com o relógio do servidor). Um hook só para a aba
 * "Prêmios" e para o pop-up "O que você disputa": os dois mostram os mesmos dias, o mesmo corte e o mesmo estado.
 */
import React from 'react'
import { organizarPremios } from './logica.js'

const REFRESCO_MS = 60000

/**
 * estado: 'carregando' | 'pronto' | 'falha'. `dado` já passou por organizarPremios.
 * `refrescar: false` lê uma vez só (o pop-up decide ao abrir; a aba Prêmios, que fica aberta, segue relendo a cada minuto).
 */
export function usarPremios (api, { refrescar = true } = {}) {
  const [estado, setEstado] = React.useState('carregando')
  const [dado, setDado] = React.useState(null)
  const [rodada, setRodada] = React.useState(0)
  React.useEffect(() => {
    let vivo = true
    const ler = () => api.premiosLer().then((r) => {
      if (!vivo) return
      if (r.ok) { setDado(organizarPremios(r.premios)); setEstado('pronto') } else setEstado((e) => (e === 'pronto' ? e : 'falha'))
    })
    ler()
    const id = refrescar ? setInterval(ler, REFRESCO_MS) : null
    return () => { vivo = false; if (id) clearInterval(id) }
  }, [api, rodada, refrescar])
  const tentar = React.useCallback(() => { setEstado('carregando'); setRodada((n) => n + 1) }, [])
  return { estado, dado, tentar }
}
