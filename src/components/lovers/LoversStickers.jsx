import React from 'react'
import { LOVERS_STICKERS } from '../../config/loversStickers'
export function LoversStickers({ page, className = '' }) {
  const items = LOVERS_STICKERS[page] || []
  if (!items.length) return null
  return (
    <div className={`lovers-stickers ${className}`.trim()} aria-hidden="true">
      {items.map((it, i) => (
        <img key={i} className="lovers-sticker-img" src={it.src} alt="" loading="lazy"
             draggable="false"
             style={{ ...it.style, transform: 'rotate(var(--rot, 0deg)) scale(var(--scale, 1))' }} />
      ))}
    </div>
  )
}
