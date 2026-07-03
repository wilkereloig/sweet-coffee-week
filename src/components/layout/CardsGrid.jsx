import React from 'react'
import { StaggerContainer } from '../motion'

/*
 * CardsGrid — grade responsiva de cards. Base .cards-grid (src/styles/layout.css)
 * com nº de colunas via `columns` (→ --cards-cols). Por padrão é um
 * StaggerContainer: os filhos diretos entram em sequência (Motion System) —
 * sem animação nova. `stagger={false}` para grade estática.
 *
 * `className` acresce (a classe da página, quando houver, vence os defaults por
 * ordem de cascata). Não impõe visual — reaproveita o padrão de grid existente.
 */
const cx = (...parts) => parts.filter(Boolean).join(' ')

export function CardsGrid({
  as = 'div',
  columns,
  className = '',
  stagger = true,
  style,
  children,
  ...rest
}) {
  const gridStyle = columns ? { '--cards-cols': columns, ...style } : style
  const cls = cx('cards-grid', className)
  if (stagger) {
    return (
      <StaggerContainer as={as} className={cls} style={gridStyle} {...rest}>
        {children}
      </StaggerContainer>
    )
  }
  const Tag = as
  return (
    <Tag className={cls} style={gridStyle} {...rest}>
      {children}
    </Tag>
  )
}
