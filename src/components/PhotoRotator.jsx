import React from 'react'
import { focalPosition } from '../data/focalPoints'

/*
 * PhotoRotator — galeria rotativa sutil (crossfade) para áreas de foto da Home.
 *
 * - Troca automática em intervalo controlado; transição por fade + leve scale.
 * - Sem setas nem controles (integra ao layout, não parece slider comum).
 * - prefers-reduced-motion: não rotaciona; mostra a 1ª imagem estática.
 * - Pausa quando a aba está oculta (document.hidden) — economia.
 * - object-fit: cover; imagens empilhadas (position:absolute) → sem layout shift.
 * - eager: prioriza a 1ª imagem (uso no hero). Demais são lazy.
 * - onError: esconde a imagem que falhar (não quebra o layout).
 * - onActiveChange(src, index): opcional — avisa quem instanciou qual imagem
 *   está em tela agora (ex.: Edições sincroniza o destaque da filmstrip com o
 *   crossfade automático em vez de só com a foto escolhida manualmente).
 * - useFocalPoint: opcional — aplica object-position/transform-origin a partir
 *   do ponto focal gerado (src/data/focalPoints.js), quando existe pra aquele
 *   src. Default false: comportamento inalterado (centro), porque a Home reusa
 *   as MESMAS fotos do acervo (src/data/homeGalleries.js) e não pode ser
 *   alterada sem solicitação explícita (CLAUDE.md §9) — só quem pedir o ponto
 *   focal (Edições) liga a prop.
 *
 * Doc: src/design/SITE_DIRECTION.md (§ Fotos & galerias).
 */
const ALT_FALLBACK = 'Combo participante do Sweet & Coffee Week'

export function PhotoRotator({ images, interval = 5000, className = '', eager = false, onActiveChange, useFocalPoint = false }) {
  const list = Array.isArray(images) ? images.filter((im) => im && im.src) : []
  const [idx, setIdx] = React.useState(0)

  const activeSrc = list[idx] && list[idx].src
  React.useEffect(() => {
    if (onActiveChange && activeSrc) onActiveChange(activeSrc, idx)
  }, [activeSrc, idx, onActiveChange])

  React.useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || list.length <= 1) return

    const delay = Math.max(2500, interval)
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      setIdx((i) => (i + 1) % list.length)
    }, delay)
    return () => clearInterval(id)
  }, [list.length, interval])

  if (!list.length) return null

  return (
    <div className={`photo-rotator ${className}`.trim()}>
      {list.map((im, i) => {
        const pos = useFocalPoint ? focalPosition(im.src) : null
        return (
          <img
            key={im.src + i}
            src={im.src}
            alt={im.alt || ALT_FALLBACK}
            className={'photo-rotator__img' + (i === idx ? ' is-active' : '')}
            style={pos ? { objectPosition: pos, transformOrigin: pos } : undefined}
            loading={eager && i === 0 ? 'eager' : 'lazy'}
            fetchpriority={eager && i === 0 ? 'high' : undefined}
            decoding="async"
            draggable="false"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )
      })}
    </div>
  )
}
