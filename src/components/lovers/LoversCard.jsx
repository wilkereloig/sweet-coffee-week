import React from 'react'

const VARIANT = {
  pink: 'lovers-card--pink',
  yellow: 'lovers-card--yellow',
  cyan: 'lovers-card--cyan',
  purple: 'lovers-card--purple',
  cream: 'lovers-card--cream',
  dark: 'lovers-card--dark',
}

/**
 * Card Lovers. `as` define a tag (div/article/section).
 * variant: pink | yellow | cyan | purple | cream | dark (opcional)
 * interactive: ativa hover lift + cursor pointer
 */
export function LoversCard({
  children,
  variant,
  interactive = false,
  as: Tag = 'div',
  className = '',
  style,
  ...rest
}) {
  const cls = [
    'lovers-card',
    variant ? VARIANT[variant] : '',
    interactive ? 'lovers-card--interactive' : '',
    className,
  ].filter(Boolean).join(' ')
  return (
    <Tag className={cls} style={style} {...rest}>
      {children}
    </Tag>
  )
}
