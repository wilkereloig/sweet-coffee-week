import React from 'react'
import { useMovimentoReduzido } from '../../hooks/useCrossfade'

/*
 * Comportamentos próprios da Home (12/10/2026: saíram do corpo do antigo
 * Home.jsx sem mudar o que fazem).
 */

/**
 * Contadores que sobem UMA vez, quando `ref` entra na tela. 1400ms: a contagem
 * precisa de tempo para os dígitos serem lidos subindo. Com movimento reduzido
 * (ou sem IntersectionObserver) o valor final aparece direto.
 */
export function useContagem(alvos, ref) {
  const reduzido = useMovimentoReduzido()
  const [valores, setValores] = React.useState(() => (reduzido ? alvos : alvos.map(() => 0)))

  React.useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (reduzido || typeof IntersectionObserver === 'undefined') {
      setValores(alvos)
      return undefined
    }
    let raf = 0
    let inicio = 0
    const suave = (t) => 1 - Math.pow(1 - t, 3)
    const passo = (ts) => {
      if (!inicio) inicio = ts
      const p = Math.min(1, (ts - inicio) / 1400)
      setValores(alvos.map((a) => Math.round(suave(p) * a)))
      if (p < 1) raf = requestAnimationFrame(passo)
    }
    const io = new IntersectionObserver((entradas) => {
      if (!entradas.some((e) => e.isIntersecting)) return
      io.disconnect()
      raf = requestAnimationFrame(passo)
    }, { threshold: 0.3 })
    io.observe(el)
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf) }
    // alvos vem de constante de módulo: a contagem não reinicia por render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduzido])

  return valores
}

/**
 * Palavra destacada dos títulos (`[data-destaque]`): vira itálico colorido ao
 * entrar na tela (scwDestaque, de scw-2026.css). Sem movimento, já nasce no
 * estado final.
 */
export function useDestaqueTitulos(raizRef) {
  const reduzido = useMovimentoReduzido()
  React.useEffect(() => {
    const alvos = raizRef.current?.querySelectorAll('[data-destaque]')
    if (!alvos || !alvos.length) return undefined
    if (reduzido || typeof IntersectionObserver === 'undefined') {
      alvos.forEach((el) => { el.style.animation = 'none'; el.style.color = 'var(--dest)'; el.style.fontStyle = 'italic' })
      return undefined
    }
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return
        e.target.style.animation = 'scwDestaque var(--mo-longo) var(--mo-mola) 600ms both'
        io.unobserve(e.target)
      })
    }, { rootMargin: '0px 0px -18% 0px', threshold: 0.6 })
    alvos.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [raizRef, reduzido])
}
