import { useEffect } from 'react'

/*
 * useRevealOnScroll — revela elementos com classe de motion ao entrarem na
 * viewport (Motion System). Adiciona `.is-in` uma única vez por elemento.
 *
 * - Observa, dentro de rootRef, qualquer elemento com classe de reveal
 *   (.motion-reveal*, .motion-stagger, .motion-image-reveal).
 * - Respeita prefers-reduced-motion: revela tudo de imediato, sem observar.
 * - Sem dependências; leve; desconecta no unmount.
 *
 * Doc: src/design/SITE_DIRECTION.md (§ Motion System).
 */
const REVEAL_SELECTOR =
  '.motion-reveal, .motion-reveal-up, .motion-reveal-left, .motion-reveal-right, .motion-stagger, .motion-image-reveal'

export function useRevealOnScroll(rootRef, deps = []) {
  useEffect(() => {
    const root = (rootRef && rootRef.current) || document
    const els = root.querySelectorAll(REVEAL_SELECTOR)
    if (!els.length) return

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Sem movimento ou sem suporte a IntersectionObserver → revela tudo já.
    if (reduce || typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('is-in'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            io.unobserve(entry.target) // anima uma vez
          }
        })
      },
      // threshold 0: revela assim que qualquer pixel entra (o rootMargin negativo
      // controla o gatilho). threshold positivo quebrava em elementos mais altos
      // que a viewport — ex.: a timeline de Edições (~7700px) nunca atingia 15%
      // de fração visível e os cards ficavam invisíveis.
      { threshold: 0, rootMargin: '0px 0px -8% 0px' }
    )

    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
