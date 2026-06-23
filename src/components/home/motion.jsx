import React from 'react'

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Observa elementos [data-reveal] dentro da página e adiciona .is-in ao entrar
// na viewport. Respeita prefers-reduced-motion (entrega tudo visível na hora).
export function useScrollReveal(dep) {
  React.useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal]'))
    if (!('IntersectionObserver' in window) || prefersReduced()) {
      els.forEach((el) => el.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    )
    els.forEach((el) => io.observe(el))
    // Failsafe: garante visibilidade mesmo se o observer não disparar.
    const t = setTimeout(() => els.forEach((el) => el.classList.add('is-in')), 1600)
    return () => {
      io.disconnect()
      clearTimeout(t)
    }
  }, [dep])
}

// Número que sobe de 0 até `to` quando entra na viewport.
export function CountUp({ to, prefix = '', suffix = '', duration = 1500 }) {
  const ref = React.useRef(null)
  const [val, setVal] = React.useState(0)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReduced() || !('IntersectionObserver' in window)) {
      setVal(to)
      return
    }
    let raf = 0
    let started = false
    const run = () => {
      const start = performance.now()
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - p, 3)
        setVal(Math.round(eased * to))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started) {
            started = true
            run()
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.6 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to, duration])

  return (
    <span ref={ref}>
      {prefix}
      {val}
      {suffix}
    </span>
  )
}
