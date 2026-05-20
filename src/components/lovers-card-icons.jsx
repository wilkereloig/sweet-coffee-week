import React from 'react'

const base = {
  fill: 'none', stroke: 'currentColor', strokeWidth: '1.5',
  strokeLinecap: 'round', strokeLinejoin: 'round',
}

/* Coração com faísca — história, afeto, 10 anos */
export function IconMemory({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className} {...base}>
      <path d="M12 20C12 20 4 14.5 4 9.2A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.2C20 14.5 12 20 12 20z"/>
      <path d="M18 3l.6 1.4L20 5l-1.4.6L18 7l-.6-1.4L16 5l1.4-.6z" fill="currentColor" stroke="none"/>
    </svg>
  )
}

/* Três etiquetas empilhadas — repertório, 15 temas */
export function IconThemes({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className} {...base}>
      <rect x="3" y="16.5" width="18" height="4" rx="2"/>
      <rect x="5" y="11" width="14" height="4" rx="2"/>
      <rect x="7.5" y="5.5" width="9" height="4" rx="2"/>
    </svg>
  )
}

/* Calendário com coração — período da edição */
export function IconCalendarLovers({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className} {...base}>
      <rect x="3" y="4" width="18" height="17" rx="3"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/>
      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/>
      <path d="M12 19C11.8 18.8 8.5 16.5 8.5 14.5A2.2 2.2 0 0 1 12 13a2.2 2.2 0 0 1 3.5 1.5C15.5 16.5 12.2 18.8 12 19z"/>
    </svg>
  )
}

/* Etiqueta com check — escolher tema histórico */
export function IconChooseTheme({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className} {...base}>
      <path d="M4 4h12l4.5 8-4.5 8H4z"/>
      <circle cx="7.5" cy="12" r="1.5"/>
      <path d="M11 8.5l1.5 2.5 4.5-5"/>
    </svg>
  )
}

/* Três formas conectadas — doce + salgado + bebida */
export function IconBuildCombo({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className} {...base}>
      <circle cx="6.5" cy="7" r="3"/>
      <path d="M6.5 3.5v-1" strokeWidth="1.2"/>
      <rect x="14" y="4" width="6" height="6" rx="2"/>
      <path d="M12 21C11.8 20.8 9 18.5 9 16.8A2 2 0 0 1 12 15a2 2 0 0 1 3 1.8C15 18.5 12.2 20.8 12 21z"/>
      <line x1="9.5" y1="7" x2="14" y2="7" strokeDasharray="1.5 1.5" strokeWidth="1.2"/>
      <line x1="8.5" y1="9.5" x2="11" y2="15" strokeDasharray="1.5 1.5" strokeWidth="1.2"/>
      <line x1="14.5" y1="9.5" x2="13" y2="15" strokeDasharray="1.5 1.5" strokeWidth="1.2"/>
    </svg>
  )
}

/* Seta circular com coração — memória + renovação */
export function IconRecreate({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className} {...base}>
      <path d="M21 12a9 9 0 1 1-2-6"/>
      <path d="M19 2v5h-5"/>
      <path d="M12 16C11.8 15.8 9.5 14 9.5 12.5A1.8 1.8 0 0 1 12 11a1.8 1.8 0 0 1 2.5 1.5C14.5 14 12.2 15.8 12 16z"/>
    </svg>
  )
}

/* Trajeto com dois pins — rota dos Lovers */
export function IconRouteLovers({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className} {...base}>
      <path d="M5.5 19 Q9 13.5 13 12 Q17 10.5 19.5 5" strokeDasharray="2.5 2"/>
      <circle cx="5.5" cy="19" r="2.5"/>
      <circle cx="5.5" cy="19" r=".8" fill="currentColor" stroke="none"/>
      <path d="M19.5 2C19.5 2 23 5.5 19.5 8C16 5.5 19.5 2 19.5 2z"/>
      <circle cx="19.5" cy="5.2" r=".8" fill="currentColor" stroke="none"/>
    </svg>
  )
}
