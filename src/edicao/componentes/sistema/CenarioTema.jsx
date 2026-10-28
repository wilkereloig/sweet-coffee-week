/*
 * Cenário por tema (docs/cartoon-2026-2/10 §10.15, família 3): camada decorativa
 * para o topo da ficha da casa. Vai como PRIMEIRO filho do <TopoCanal>: o CSS
 * (`.ct-canal:has(> .ct-cenario)`) reserva o espaço e põe o texto do topo acima.
 * Faixa de cenário colada na base, inteira (sem recorte), objeto A ao lado do nome (acima no celular),
 * objeto B pequeno no canto oposto. Casa sem kit não renderiza nada.
 *
 * Reação ao mouse: --mx/--my em [-1, 1] no próprio .ct-cenario, atualizadas em
 * pointermove com requestAnimationFrame; o CSS converte em até 8px de
 * deslocamento. Sem listener com movimento reduzido e no toque.
 *
 * `semKit="natal"` (ficha da casa): casa sem kit ganha a faixa de Natal como chão, sem objetos
 * (.ct-cenario--natal não reserva o espaço do objeto A).
 */
import React from 'react'
import { kitTemaEdicao, cenaEdicao, srcSet } from '../../../data/imageLibrary'

export function CenarioTema ({ slug, semKit = null }) {
  const kit = kitTemaEdicao(slug)
  const chao = !kit && semKit ? cenaEdicao(semKit) : null
  const raiz = React.useRef(null)
  const faixa = kit ? kit.cenario : chao

  // A faixa vai inteira: o topo (pai) precisa da proporção do arquivo para reservar a altura dela.
  React.useLayoutEffect(() => {
    const topo = raiz.current?.parentElement
    if (!topo || !faixa) return undefined
    topo.style.setProperty('--ct-cen-razao', (faixa.altura / faixa.largura).toFixed(4))
    return () => topo.style.removeProperty('--ct-cen-razao')
  }, [faixa])

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

  if (chao) {
    return (
      <div className="ct-cenario ct-cenario--natal" ref={raiz} aria-hidden="true">
        <img className="ct-cenario__faixa" src={chao.src} srcSet={srcSet(chao.src)} sizes="100vw" width={chao.largura} height={chao.altura} alt="" decoding="async" />
      </div>
    )
  }
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
