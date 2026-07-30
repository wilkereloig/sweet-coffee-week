import React from 'react'
import { BotaoTopo } from 'site-sweet-coffee-week'

// Só aparece depois de 1,5 tela de rolagem (lê window.scrollY direto, sem
// prop de override) — por isso o preview cria respiro vertical e rola a
// JANELA de verdade no mount, não um wrapper local.
export const AposRolar = () => {
  React.useEffect(() => {
    window.scrollTo(0, window.innerHeight * 2)
  }, [])
  return (
    <div style={{ height: '260vh', position: 'relative' }}>
      <p style={{ padding: 24, fontFamily: 'system-ui', color: '#6A2C15' }}>
        Role a página — o botão fica fixo no canto inferior direito.
      </p>
      <BotaoTopo />
    </div>
  )
}
