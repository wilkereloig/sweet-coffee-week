import React from 'react'

/**
 * A hora de agora, atualizada enquanto a página fica aberta: a cada `ms` e quando a aba volta a ficar visível (aba em
 * segundo plano segura os timers). Quem usa recalcula "aberto agora" sem recarregar a página.
 */
export function useAgora (ms = 30000) {
  const [agora, setAgora] = React.useState(() => new Date())
  React.useEffect(() => {
    const atualizar = () => setAgora(new Date())
    const id = setInterval(atualizar, ms)
    const aoVoltar = () => { if (!document.hidden) atualizar() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', aoVoltar) }
  }, [ms])
  return agora
}
