import React from 'react'

/**
 * Seção Lovers com cabeçalho padrão (eyebrow + título + subtítulo).
 * Usa as classes .lovers-section / .lovers-section-header já existentes.
 * center: centraliza o cabeçalho.
 */
export function LoversSection({
  eyebrow,
  title,
  subtitle,
  children,
  center = false,
  className = '',
  ...rest
}) {
  const hasHeader = eyebrow || title || subtitle
  return (
    <section className={`section lovers-section ${className}`.trim()} {...rest}>
      <div className="wrap">
        {hasHeader && (
          <div className={`lovers-section-header${center ? ' is-center' : ''}`}>
            {eyebrow && <span className="lovers-eyebrow">{eyebrow}</span>}
            {title && <h2 className="lovers-section__title">{title}</h2>}
            {subtitle && <p className="lovers-section__lead">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}
