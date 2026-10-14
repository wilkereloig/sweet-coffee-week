import React from 'react'
import IconeUi from './scw-icons/IconeUi'

/* Seta de ação ("ir para") dos botões e links do institucional — adaptador do
   registro de ícones (v3). `size` antigo encaixa na escala: até 17 → 16, acima
   → 20. O gesto de avançar 4px no hover é do CSS do botão (§6.15). */
export function Seta({ size = 17 }) {
  return <IconeUi nome="seta-direita" tamanho={size <= 17 ? 16 : 20} />
}

export default Seta
