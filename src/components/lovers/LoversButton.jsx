import React from 'react'

const VARIANT = {
  primary: 'lovers-button--primary',
  secondary: 'lovers-button--secondary',
  ghost: 'lovers-button--ghost',
  dark: 'lovers-button--dark',
}

/**
 * Botão Lovers. Renderiza <a> quando recebe `href`, senão <button>.
 * variant: primary | secondary | ghost | dark
 * size: default | small
 */
export function LoversButton({
  children,
  variant = 'primary',
  size = 'default',
  full = false,
  href,
  onClick,
  className = '',
  type = 'button',
  ...rest
}) {
  const cls = [
    'lovers-button',
    VARIANT[variant] || VARIANT.primary,
    size === 'small' ? 'lovers-button--small' : '',
    full ? 'lovers-button--full' : '',
    className,
  ].filter(Boolean).join(' ')

  if (href) {
    return (
      <a href={href} onClick={onClick} className={cls} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <button type={type} onClick={onClick} className={cls} {...rest}>
      {children}
    </button>
  )
}
