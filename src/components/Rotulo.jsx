import React from 'react'
import ScwIcon from './scw-icons/ScwIcon'

/*
 * Rotulo — o rótulo de seção (.scw-rotulo), com ícone opcional de 20px
 * (§6.6: ícone do rótulo de seção é 20; 16 fica só em chip e legenda).
 * Repetia-se como `<span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon …/>…`
 * em toda seção de Participar, Apoiar e Contato.
 */
export function Rotulo({ icone, className = '', children, as: Tag = 'span', ...resto }) {
  const cls = ['scw-rotulo', icone && 'scw-rotulo--com-icone', className].filter(Boolean).join(' ')
  return (
    <Tag className={cls} {...resto}>
      {icone && <ScwIcon nome={icone} tamanho={20} />}
      {children}
    </Tag>
  )
}

export default Rotulo
