import React from 'react'
import { aplicarRota } from './regras.js'

/**
 * Lê e mantém o grupo aberto (`caca_grupo_ler`). Fases: 'carregando' · 'pronto' · 'negado' (não é integrante, grupo
 * inexistente ou saiu/foi removido: o servidor responde igual nos três) · 'falha' (rede). Relê quando a aba volta ao
 * primeiro plano, para quem foi removido, a rota e o ranking aparecerem sem recarregar a página.
 * Leitura antiga nunca sobrescreve uma operação mais nova: cada leitura tem número, e `aplicar` invalida as em voo.
 */
export function useGrupo ({ caca, grupoId }) {
  const { api, chave, atualizar } = caca
  const [estado, setEstado] = React.useState({ fase: 'carregando', grupo: null })
  const seq = React.useRef(0)

  const ler = React.useCallback(async ({ silencioso = false } = {}) => {
    const n = ++seq.current
    if (!silencioso) setEstado((e) => (e.grupo ? e : { fase: 'carregando', grupo: null }))
    const r = await api.grupoLer(chave, grupoId)
    if (n !== seq.current) return r
    if (r.ok) setEstado({ fase: 'pronto', grupo: r })
    else if (r.motivo === 'negado') setEstado({ fase: 'negado', grupo: null })
    else if (r.motivo === 'mapa_desconhecido') atualizar() // a chave caducou: a página volta à criação do mapa
    else setEstado((e) => (e.grupo ? e : { fase: 'falha', grupo: null })) // releitura que falha não derruba o que já está na tela
    return r
  }, [api, chave, grupoId, atualizar])

  React.useEffect(() => {
    ler()
    return () => { seq.current += 1 }
  }, [ler])

  React.useEffect(() => {
    const voltou = () => { if (document.visibilityState === 'visible') ler({ silencioso: true }) }
    document.addEventListener('visibilitychange', voltou)
    return () => document.removeEventListener('visibilitychange', voltou)
  }, [ler])

  const aplicar = React.useCallback((r) => {
    seq.current += 1
    setEstado((e) => (e.grupo ? { ...e, grupo: aplicarRota(e.grupo, r) } : e))
  }, [])
  const perdeuAcesso = React.useCallback(() => { seq.current += 1; setEstado({ fase: 'negado', grupo: null }) }, [])

  return { ...estado, ler, aplicar, perdeuAcesso }
}
