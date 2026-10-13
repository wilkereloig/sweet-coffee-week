import React from 'react'

/* Seta de ação ("ir para") dos botões e links do institucional. Traço em
   currentColor; o gesto de avançar 4px no hover é do CSS do botão (§6.15). */
export function Seta({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default Seta
