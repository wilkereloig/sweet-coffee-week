import React from 'react'

const BG = {
  pink: 'lv-bg-pink',
  cyan: 'lv-bg-cyan',
  yellow: 'lv-bg-yellow',
  purple: 'lv-bg-purple',
  coral: 'lv-bg-coral',
  burgundy: 'lv-bg-burgundy',
}

/**
 * Card de navegação (entrada para uma área). Renderiza <a>.
 * variant: pink | cyan | yellow | purple | coral | burgundy
 */
export function LoversNavCard({
  kicker,
  title,
  text,
  cta,
  href,
  onClick,
  variant = 'pink',
  icon,
  className = '',
}) {
  const cls = ['lovers-nav-card', BG[variant] || BG.pink, className].filter(Boolean).join(' ')
  return (
    <a href={href} onClick={onClick} className={cls}>
      {icon && <span className="lovers-nav-card__icon" aria-hidden="true">{icon}</span>}
      {kicker && <span className="lovers-nav-card__kicker">{kicker}</span>}
      {title && <span className="lovers-nav-card__title">{title}</span>}
      {text && <span className="lovers-nav-card__desc">{text}</span>}
      {cta && <span className="lovers-nav-card__arrow">{cta} →</span>}
    </a>
  )
}
