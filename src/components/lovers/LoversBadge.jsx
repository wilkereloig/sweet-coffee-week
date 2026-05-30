import React from 'react'

const VARIANT = {
  pink: 'lovers-badge--pink',
  yellow: '', // base já é amarelo
  cyan: 'lovers-badge--cyan',
  purple: 'lovers-badge--purple',
  cream: 'lovers-badge--cream',
  dark: 'lovers-badge--dark',
}

/**
 * Badge Lovers (pílula uppercase).
 * variant: pink | yellow | cyan | purple | cream | dark
 */
export function LoversBadge({ children, variant = 'yellow', className = '', ...rest }) {
  const cls = ['lovers-badge', VARIANT[variant] || '', className].filter(Boolean).join(' ')
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  )
}
