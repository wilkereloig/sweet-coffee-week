/*
 * Estado da permissão de localização deste navegador ('granted' · 'prompt' · 'denied'; 'desconhecido' sem a Permissions API),
 * acompanhado ao vivo: se a pessoa libera nas configurações e volta, o estado muda sozinho (05/11/2026). Só LÊ o estado: nunca
 * pede a posição (quem pede é o toque em "Carimbar aqui"), e nada é guardado nem enviado.
 */
import React from 'react'

export function usePermissaoLocalizacao () {
  const [estado, setEstado] = React.useState('desconhecido')
  React.useEffect(() => {
    let vivo = true
    let status = null
    const atualizar = () => { if (vivo && status) setEstado(status.state) }
    try {
      navigator.permissions?.query({ name: 'geolocation' })
        .then((s) => { status = s; atualizar(); s.addEventListener?.('change', atualizar) })
        .catch(() => {})
    } catch { /* sem Permissions API: segue como antes, a recusa do navegador é tratada no toque */ }
    return () => { vivo = false; status?.removeEventListener?.('change', atualizar) }
  }, [])
  return estado
}
