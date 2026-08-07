import React from 'react'
import loversLogoRaw from '../assets/lovers-logo.svg?raw'
import loversWordmarkRaw from '../assets/lovers-wordmark.svg?raw'

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
  chevronLeft: (p = {}) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  chevronRight: (p = {}) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
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
  search: (p = {}) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="m20 20-3.6-3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
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
  home: (p = {}) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...p}>
      <path d="M3 8l6-5 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.5 7.5V14.5h9V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  lock: (p = {}) => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...p}>
      <rect x="3" y="7" width="10" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  sound: (p = {}) => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M2 6.2h2.4L8 3.4v9.2L4.4 9.8H2V6.2Z" fill="currentColor"/>
      <path d="M10.6 5.6a3.3 3.3 0 0 1 0 4.8M12.6 3.8a6.1 6.1 0 0 1 0 8.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  soundOff: (p = {}) => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M2 6.2h2.4L8 3.4v9.2L4.4 9.8H2V6.2Z" fill="currentColor"/>
      <path d="M10.8 6.4l3.4 3.4M14.2 6.4l-3.4 3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  user: (p = {}) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...p}>
      <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2.5 15.5c0-3.038 2.91-5.5 6.5-5.5s6.5 2.462 6.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
}
