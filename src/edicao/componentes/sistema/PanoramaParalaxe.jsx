/*
 * Panorama de Natal preso à base do topo da Entrada, com paralaxe suave (pedido do Wilker, 11/11/2026: "fixado na barra inferior,
 * com efeito paralaxe, a cidade de Natal, uma arte que a gente tem"). A arte é decorativa: fica ATRÁS do texto e dos botões
 * (z-index 0; o texto do topo é z-index 1) e nunca recebe toque.
 *
 * Movimento: só `transform` (compositor, sem layout). Enquanto o topo sai da tela, a arte desce devagar em relação à página
 * (--ct-pano-p vai de 0 a 1 com a rolagem; o CSS converte em um deslocamento de poucos por cento da altura da arte). Um
 * `scroll` passivo com requestAnimationFrame; nada roda com `prefers-reduced-motion` (a arte fica parada) nem com o topo
 * já fora da tela (o progresso trava em 1).
 * O pai precisa ser `position: relative` com `overflow: hidden` (o TopoCanal da Entrada é).
 */
import React from 'react'
import { cenaEdicao, srcSet } from '../../../data/imageLibrary'

export function PanoramaParalaxe ({ chave = 'panorama', className = '' }) {
  const cena = cenaEdicao(chave)
  const ref = React.useRef(null)
  React.useEffect(() => {
    const img = ref.current
    const topo = img?.parentElement
    if (!img || !topo || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let quadro = 0
    const mover = () => {
      quadro = 0
      const r = topo.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)))
      img.style.setProperty('--ct-pano-p', p.toFixed(3))
    }
    const ler = () => { if (!quadro) quadro = requestAnimationFrame(mover) }
    mover()
    window.addEventListener('scroll', ler, { passive: true })
    window.addEventListener('resize', ler)
    return () => { cancelAnimationFrame(quadro); window.removeEventListener('scroll', ler); window.removeEventListener('resize', ler) }
  }, [])
  if (!cena) return null
  return (
    <img ref={ref} className={`ct-panorama ${className}`.trim()} src={cena.src} srcSet={srcSet(cena.src)} sizes="100vw"
      width={cena.largura} height={cena.altura} alt="" aria-hidden="true" decoding="async" />
  )
}
