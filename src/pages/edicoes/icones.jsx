import React from 'react'

/* Glifos de controle da página (traço em currentColor). A seta "para a frente"
   é a peça comum `Seta` (src/components/Seta.jsx); aqui ficam só a de voltar,
   espelho dela, e os três sinais de abrir/fechar. */
const svg = (d, largura = 1.7) => function Glifo({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth={largura} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const SetaVolta = svg('M13 8H3M7 4L3 8l4 4', 1.6)
export const Chevron = svg('M4 6.5l4 4 4-4', 1.9)
export const Xis = svg('M4 4l8 8M12 4l-8 8', 1.8)
export const Mais = svg('M8 3v10M3 8h10')
