import React from 'react'
import { LOVERS_STICKERS } from '../../config/loversStickers'
export function LoversStickers({ page }) {
  const items = LOVERS_STICKERS[page] || []
  if (!items.length) return null
  return (
    <div className="lovers-stickers" aria-hidden="true">
      {items.map((it, i) => (
        <img key={i} className="lovers-sticker-img" src={it.src} alt="" loading="lazy"
             style={{ ...it.style, transform: `rotate(var(--rot, 0deg))` }} />
      ))}
    </div>
  )
}
