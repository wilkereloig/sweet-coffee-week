import React from 'react'
import { carregarMovimento } from '../dados/publico.js'
import { mapaDoMovimento } from './movimento.js'

const VAZIO = new Map()

/** Movimento público das casas (foto refeita a cada 15 min no banco). Relê a cada 2 min e quando a aba volta. Falha = sem selo. */
export function useMovimento (codigo) {
  const [mapa, setMapa] = React.useState(VAZIO)
  React.useEffect(() => {
    if (!codigo) return undefined
    let ativo = true
    const ler = () => carregarMovimento(codigo).then((r) => { if (ativo) setMapa(mapaDoMovimento(r)) }).catch(() => {})
    ler()
    const intervalo = setInterval(ler, 120000)
    const aoVoltar = () => { if (document.visibilityState === 'visible') ler() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => { ativo = false; clearInterval(intervalo); document.removeEventListener('visibilitychange', aoVoltar) }
  }, [codigo])
  return mapa
}
