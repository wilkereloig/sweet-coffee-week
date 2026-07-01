import { useEffect, useRef } from 'react'

/*
 * useReveal — reveal por-elemento (Motion System). Observa o PRÓPRIO elemento
 * (ref retornado) e adiciona `.is-in` uma vez ao entrar na viewport.
 *
 * Complementa useRevealOnScroll (que observa VÁRIOS elementos dentro de um
 * root). Este é para os componentes de motion auto-contidos (src/components/
 * motion/): cada um gerencia seu próprio observer, sem depender de a página
 * chamar useRevealOnScroll. Mesmos parâmetros do observer (threshold 0 +
 * rootMargin -8%), mesma regra de prefers-reduced-motion.
 *
 * Doc: src/design/SITE_DIRECTION.md (§ Motion System).
 */
export function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduce || typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-in')
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
      { threshold: 0, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}
