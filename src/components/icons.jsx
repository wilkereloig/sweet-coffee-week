import React from 'react'
import loversLogoRaw from '../assets/lovers-logo.svg?raw'

export const I = {
  arrow: (p = {}) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  arrowDown: (p = {}) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  cup: (p = {}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Z" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M16 11h2a2.5 2.5 0 0 1 0 5h-2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 4c.5 1.5-.5 2 0 3.5M11 4c.5 1.5-.5 2 0 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  plate: (p = {}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  pin: (p = {}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  pinFill: (p = {}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z"/>
      <circle cx="12" cy="9" r="2.4" fill="#fff"/>
    </svg>
  ),
  map: (p = {}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M3 6v13l6-3 6 3 6-3V3l-6 3-6-3-6 3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M9 3v13M15 6v13" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  cal: (p = {}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  heart: (p = {}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 20s-8-4.5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 6.5-8 11-8 11Z" fill="currentColor"/>
    </svg>
  ),
  heartLine: (p = {}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 20s-8-4.5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 6.5-8 11-8 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  star: (p = {}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 2l2.6 6.6L21 9.3l-5 4.6L17.5 21 12 17.4 6.5 21 8 13.9l-5-4.6 6.4-.7L12 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  starFill: (p = {}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2l2.6 6.6L21 9.3l-5 4.6L17.5 21 12 17.4 6.5 21 8 13.9l-5-4.6 6.4-.7L12 2Z"/>
    </svg>
  ),
  route: (p = {}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M5 6c0 4 14 2 14 6s-12 2-12 6" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 3" strokeLinecap="round"/>
      <circle cx="5" cy="6" r="2.2" fill="currentColor"/>
      <circle cx="7" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  donut: (p = {}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="9" cy="9" r=".8" fill="currentColor"/>
      <circle cx="16" cy="11" r=".8" fill="currentColor"/>
      <circle cx="14" cy="16" r=".8" fill="currentColor"/>
      <circle cx="8" cy="14" r=".8" fill="currentColor"/>
    </svg>
  ),
  croissant: (p = {}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M3 14c2-7 9-10 18-8-2 8-9 11-18 8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M8 8c1 2 3 4 7 5M12 5c1 3 3 6 7 7" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  ig: (p = {}) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="17" cy="7" r="1" fill="currentColor"/>
    </svg>
  ),
  close: (p = {}) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  menu: (p = {}) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...p}>
      <path d="M2 5h14M2 13h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  check: (p = {}) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M3 8.5l3.5 3.5 7-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  lock: (p = {}) => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...p}>
      <rect x="3" y="7" width="10" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
}

export function LogoMark({ size = 32, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14.5" stroke={color} strokeWidth="1.2"/>
      <path d="M9 13h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5v-4Z" fill={color}/>
      <path d="M20 14.5h1.5a2 2 0 0 1 0 4H20" stroke={color} strokeWidth="1.2"/>
      <circle cx="14" cy="9" r="1" fill={color}/>
    </svg>
  )
}

export function LoversSeal({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <path d="M28 2 C 30 6, 36 4, 38 8 C 42 8, 46 12, 46 16 C 50 18, 52 22, 50 26 C 54 28, 54 34, 50 36 C 52 40, 48 44, 44 44 C 44 48, 40 52, 36 50 C 34 54, 28 54, 26 50 C 22 52, 18 50, 18 46 C 14 46, 10 42, 12 38 C 8 36, 6 30, 10 28 C 6 24, 8 18, 12 18 C 12 14, 16 10, 20 12 C 22 8, 26 6, 28 2Z"
            fill="var(--lovers-burgundy)"/>
      <path d="M28 38 C 18 32, 14 26, 18 22 a 4 4 0 0 1 10 0 a 4 4 0 0 1 10 0 C 42 26, 38 32, 28 38 Z" fill="var(--lovers-yellow)"/>
    </svg>
  )
}

export function LoversLogo({ size = 200, variant = 'default', className = '' }) {
  const variantClass = variant === 'pink' ? 'lovers-logo--pink'
                     : variant === 'dark' ? 'lovers-logo--dark'
                     : ''
  const svgHtml = loversLogoRaw.replace(/<svg /, '<svg style="width:100%;height:100%;display:block" ')
  return (
    <div
      className={`lovers-logo ${variantClass} ${className}`}
      style={{ width: size, height: size, display: 'inline-block' }}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  )
}

export function Squiggle({ width = 80, color = 'var(--lovers-burgundy)', className = '' }) {
  return (
    <svg width={width} height="14" viewBox="0 0 80 14" fill="none" className={className}>
      <path d="M1 7 C 8 1, 16 13, 24 7 S 40 1, 48 7 S 64 13, 72 7 S 80 1, 79 7"
            stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

export function HeartTiny({ size = 12, color = 'var(--lovers-burgundy)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 20s-8-4.5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 6.5-8 11-8 11Z"/>
    </svg>
  )
}

export function TapeStrip({ children, rotate = -2, color = 'var(--lovers-yellow)' }) {
  return (
    <span className="sticker-tape" style={{ transform: `rotate(${rotate}deg)`, background: color }}>
      {children}
    </span>
  )
}
