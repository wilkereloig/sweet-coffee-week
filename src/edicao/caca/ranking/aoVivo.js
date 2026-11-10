/*
 * Atualização durante o uso (09/11/2026): relê de tempos em tempos SÓ com a aba à vista, e de novo quando a pessoa volta à aba ou a
 * internet volta. Consulta periódica controlada, de propósito: o ranking é uma função pública agregada (não há tabela para assinar sem
 * expor dado pessoal) e uma leitura por minuto por aba aberta é pouco para o banco. Aba escondida não consulta nada.
 */
import React from 'react'

export const INTERVALO_AO_VIVO = 60_000

/** Deve reler agora? Só com a página visível. Separado para testar sem navegador. */
export const podeReler = (doc = globalThis.document) => !doc || doc.visibilityState !== 'hidden'

export function usarAoVivo (reler, ms = INTERVALO_AO_VIVO) {
  const fn = React.useRef(reler)
  fn.current = reler
  React.useEffect(() => {
    const tentar = () => { if (podeReler()) fn.current() }
    const relogio = setInterval(tentar, ms)
    document.addEventListener('visibilitychange', tentar)
    window.addEventListener('online', tentar)
    return () => { clearInterval(relogio); document.removeEventListener('visibilitychange', tentar); window.removeEventListener('online', tentar) }
  }, [ms])
}

/** "há pouco" · "há 3 min" · "às 14:05" (mais de uma hora). */
export function quandoAtualizou (em, agora = Date.now()) {
  if (!em) return ''
  const min = Math.floor((agora - em) / 60_000)
  if (min < 1) return 'agora há pouco'
  if (min < 60) return `há ${min} min`
  return `às ${new Date(em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}
