/*
 * Cabeçalho da edição sobre a seção inicial. O <header class="ct-topo"> é sobreposto (margem negativa em 01-base.css), então o
 * fundo da primeira seção sobe até o topo da janela; este hook entrega ao CSS a altura REAL dos controles (sem o degradê):
 *   --ct-topo-barra  (no .ct-edicao)  → área segura do conteúdo: a seção inicial soma isso ao próprio padding-top.
 * Mede de novo quando o cabeçalho muda de tamanho (logo, quebra da navegação, zoom, giro da tela, fonte maior).
 * Também marca .is-rolado depois de alguns pixels de rolagem: aí o degradê fica mais firme para o conteúdo que passa por baixo.
 */
import React from 'react'

export function useTopoSobreSecao (ref) {
  React.useLayoutEffect(() => {
    const topo = ref.current
    const raiz = topo?.closest('.ct-edicao')
    if (!topo || !raiz) return undefined
    const medir = () => {
      const fade = parseFloat(getComputedStyle(topo).getPropertyValue('--ct-topo-fade')) || 0
      raiz.style.setProperty('--ct-topo-barra', `${Math.max(0, topo.offsetHeight - fade)}px`)
    }
    const rolar = () => topo.classList.toggle('is-rolado', window.scrollY > 24)
    medir(); rolar()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(medir) : null
    ro?.observe(topo)
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', rolar, { passive: true })
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', rolar)
      raiz.style.removeProperty('--ct-topo-barra')
    }
  }, [ref])
}
