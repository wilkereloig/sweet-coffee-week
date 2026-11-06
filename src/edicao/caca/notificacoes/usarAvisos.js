import React from 'react'
import { organizarAvisos } from './logica.js'

/**
 * Lê a central de avisos do mapa (`caca_avisos_ler`). estado: 'carregando' | 'pronto' | 'falha'.
 * `marcarVistos(ids)` grava no servidor e atualiza a lista na tela; se a gravação falhar, a tela não finge que viu.
 * Ao voltar para a aba (ou reabrir o app instalado) a lista é relida sem piscar, para o contador do sino não ficar velho.
 */
export function usarAvisos (caca) {
  const [estado, setEstado] = React.useState('carregando')
  const [avisos, setAvisos] = React.useState([])
  const [rodada, setRodada] = React.useState(0)
  const { chave, api } = caca
  React.useEffect(() => {
    if (!chave) return undefined
    let vivo = true
    setEstado((e) => (e === 'pronto' ? e : 'carregando')) // releitura silenciosa: a lista que já está na tela não some
    api.avisosLer(chave).then((r) => {
      if (!vivo) return
      if (r.ok) { setAvisos(organizarAvisos(r.avisos)); setEstado('pronto') } else setEstado((e) => (e === 'pronto' ? e : 'falha'))
    })
    return () => { vivo = false }
  }, [chave, api, rodada])
  React.useEffect(() => {
    const volta = () => { if (document.visibilityState === 'visible') setRodada((n) => n + 1) }
    document.addEventListener('visibilitychange', volta)
    return () => document.removeEventListener('visibilitychange', volta)
  }, [])
  const tentar = React.useCallback(() => { setEstado('carregando'); setRodada((n) => n + 1) }, [])
  const marcarVistos = React.useCallback(async (ids) => {
    const r = await api.avisosVisto(chave, ids)
    if (r.ok) setAvisos((lista) => lista.map((a) => (ids.includes(a.id) ? { ...a, visto: true } : a)))
    return r.ok
  }, [api, chave])
  return { estado, avisos, tentar, marcarVistos }
}
