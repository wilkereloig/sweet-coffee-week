import React from 'react'

/*
 * SectionHeader — cabeçalho de seção reutilizável: H2 + lead opcional.
 * SEM eyebrow/kicker por cima do título (CLAUDE.md §5 — preferência registrada:
 * o título abre a seção direto). Estilo em src/styles/layout.css (.section-head),
 * só com tokens existentes. `align` = 'center' | 'start'.
 *
 * Slot `children` para conteúdo extra (ações, nota) abaixo do lead.
 */
const cx = (...parts) => parts.filter(Boolean).join(' ')

export function SectionHeader({
  as: Tag = 'div',
  title,
  lead,
  align = 'center',
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag className={cx('section-head', `section-head--${align}`, className)} {...rest}>
      {title != null ? <h2 className="section-head__title">{title}</h2> : null}
      {lead != null ? <p className="section-head__lead">{lead}</p> : null}
      {children}
    </Tag>
  )
}
