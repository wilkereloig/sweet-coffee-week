/*
 * Cenário por tema (docs/cartoon-2026-2/10 §10.15, família 3): camada decorativa
 * para o topo da ficha da casa. Vai como PRIMEIRO filho do <TopoCanal>: o CSS
 * (`.ct-canal:has(> .ct-cenario)`) reserva o espaço e põe o texto do topo acima.
 * Faixa de cenário colada na base, objeto A ao lado do nome (acima no celular),
 * objeto B pequeno no canto oposto. Casa sem kit não renderiza nada.
 *
 * Reação ao mouse: --mx/--my em [-1, 1] no próprio .ct-cenario, atualizadas em
 * pointermove com requestAnimationFrame; o CSS converte em até 8px de
 * deslocamento. Sem listener com movimento reduzido e no toque.
 */
import React from 'react'
import { kitTemaEdicao, srcSet } from '../../../data/imageLibrary'

export function CenarioTema ({ slug }) {
  const kit = kitTemaEdicao(slug)
  const raiz = React.useRef(null)

  React.useEffect(() => {
    const cenario = raiz.current
    const topo = cenario?.parentElement
    if (!topo || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return undefined
    let quadro = 0
    const pousa = (x, y) => {
      cancelAnimationFrame(quadro)
      quadro = requestAnimationFrame(() => { cenario.style.setProperty('--mx', x); cenario.style.setProperty('--my', y) })
    }
    const mexe = (e) => {
      if (e.pointerType === 'touch') return
      const r = topo.getBoundingClientRect()
      pousa(((e.clientX - r.left) / r.width * 2 - 1).toFixed(3), ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3))
    }
    const volta = () => pousa(0, 0)
    topo.addEventListener('pointermove', mexe)
    topo.addEventListener('pointerleave', volta)
    return () => {
      cancelAnimationFrame(quadro)
      topo.removeEventListener('pointermove', mexe)
      topo.removeEventListener('pointerleave', volta)
    }
  }, [kit])

  if (!kit) return null
  const { cenario, objetoA, objetoB } = kit
  return (
    <div className="ct-cenario" ref={raiz} aria-hidden="true">
      <img className="ct-cenario__faixa" src={cenario.src} srcSet={srcSet(cenario.src)} sizes="100vw" width={cenario.largura} height={cenario.altura} alt="" decoding="async" />
      <img className="ct-cenario__objeto ct-cenario__objeto--a" src={objetoA.src} width={objetoA.largura} height={objetoA.altura} alt="" decoding="async" />
      <img className="ct-cenario__objeto ct-cenario__objeto--b" src={objetoB.src} width={objetoB.largura} height={objetoB.altura} alt="" decoding="async" />
    </div>
  )
}
