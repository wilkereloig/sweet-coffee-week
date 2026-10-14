import React from 'react'
import IconeUi from '../../components/scw-icons/IconeUi'

/* Glifos de controle de Edições — ADAPTADORES do registro de ícones v3
   (14/10/2026). A seta "para a frente" é a peça comum `Seta`; aqui ficam a de
   voltar e os sinais de abrir/fechar. `size` antigo encaixa na escala 16/20. */
const glifo = (nome) => function Glifo({ size = 15 }) {
  return <IconeUi nome={nome} tamanho={size <= 17 ? 16 : 20} />
}

export const SetaVolta = glifo('seta-esquerda')
export const Chevron = glifo('abrir')
export const Xis = glifo('fechar')
export const Mais = glifo('mais')
