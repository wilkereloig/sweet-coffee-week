import React from 'react'

/**
 * Reveal on scroll reutilizável. Adiciona `is-visible` aos elementos que
 * casam com `selector` quando entram na viewport. Respeita
 * prefers-reduced-motion (entrega tudo visível na hora).
 *
 * Reaproveita a mesma mecânica do hook antigo de Hub.jsx, mas compartilhável.
 */
export function useLoversReveal(selector = '.lovers-reveal, .reveal') {
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const els = document.querySelectorAll(selector)
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-visible'))
      return
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          io.unobserve(entry.target)
        }
      })
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [selector])
}
