import React from 'react'
import { POOLS, pickStickers } from '../../config/loversStickers'

// Parallax no scroll: cada wrapper desliza vertical conforme a posição na tela,
// proporcional ao data-parallax. Bounded (em torno do próprio elemento), suave,
// rAF-throttled. Respeita prefers-reduced-motion.
function useStickerParallax() {
  const ref = React.useRef(null)
  React.useEffect(() => {
    const root = ref.current
    if (!root) return
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const wraps = Array.from(root.querySelectorAll('.lovers-sticker-wrap'))
    if (!wraps.length) return
    let raf = 0
    const update = () => {
      raf = 0
      const vh = window.innerHeight || document.documentElement.clientHeight
      for (const w of wraps) {
        const p = parseFloat(w.dataset.parallax || '0')
        if (!p) continue
        const r = w.getBoundingClientRect()
        const offset = (r.top + r.height / 2) - vh / 2
        w.style.setProperty('--py', `${(-offset * p).toFixed(1)}px`)
      }
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return ref
}

export function LoversStickers({ page, className = '' }) {
  // Sorteia a cada mount — adesivos e posições mudam a cada abertura/refresh de página.
  const items = React.useMemo(() => pickStickers(POOLS[page] || []), [page])
  const ref = useStickerParallax()
  if (!items.length) return null
  return (
    <div ref={ref} className={`lovers-stickers ${className}`.trim()} aria-hidden="true">
      {items.map((it, i) => {
        const st = it.style || {}
        // Separa: posição/tamanho vão no wrapper (parallax); rotação/escala na img (float).
        const { '--rot': rot, '--scale': scale, '--parallax': par, ...pos } = st
        return (
          <span
            key={i}
            className="lovers-sticker-wrap"
            data-parallax={par ?? undefined}
            style={pos}
          >
            <img
              className="lovers-sticker-img"
              src={it.src}
              alt=""
              loading="lazy"
              draggable="false"
              style={{ '--rot': rot ?? '0deg', '--scale': scale ?? 1, animationDelay: `${(i % 5) * 0.6}s` }}
            />
          </span>
        )
      })}
    </div>
  )
}
