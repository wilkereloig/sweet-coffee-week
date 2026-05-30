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
 * Card de dado/estatística (número grande + label + texto).
 * variant: pink | cyan | yellow | purple | coral | burgundy
 */
export function LoversStatCard({ number, label, text, variant = 'pink', className = '' }) {
  const cls = ['lovers-stat-card', BG[variant] || BG.pink, className].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      <span className="lovers-stat-card__num">{number}</span>
      {label && <span className="lovers-stat-card__label">{label}</span>}
      {text && <span className="lovers-stat-card__text">{text}</span>}
    </div>
  )
}
