import React from 'react'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'

/*
 * PageShell — casca padrão de TODA página institucional.
 * Substitui o boilerplate repetido em cada página:
 *   const rootRef = React.useRef(null); useRevealOnScroll(rootRef)
 *   return <div className="page-enter X-page" ref={rootRef}>…</div>
 *
 * `name` gera a classe de página (`name="cur"` → `cur-page`). O ref de reveal
 * é próprio da casca — o Motion System (useRevealOnScroll) observa os filhos
 * dentro dela. Não define visual novo; só centraliza a estrutura de raiz.
 */
const cx = (...parts) => parts.filter(Boolean).join(' ')

export function PageShell({ as: Tag = 'div', name, className = '', children, ...rest }) {
  const rootRef = React.useRef(null)
  useRevealOnScroll(rootRef)
  return (
    <Tag ref={rootRef} className={cx('page-enter', name && `${name}-page`, className)} {...rest}>
      {children}
    </Tag>
  )
}
