/*
 * Movimento de desenho animado enquanto a página rola (pedido do Wilker, 11/11/2026: "animar esses elementos na rolagem, com um
 * movimento que combine com o cartoon"). Fica DENTRO do herói da Entrada (o pai recebe as variáveis) e não desenha nada.
 *
 * Como funciona: a velocidade da rolagem "empurra" três molas amortecidas, uma para cada peso de elemento. O CSS lê o resultado
 * e mexe só em propriedades de transform (translate, rotate, scale):
 *   --ct-m1  mola pesada (a mesa com o combo): assenta rápido, com um quique;
 *   --ct-m2  mola leve (a explosão e os olhos): balança mais e demora um pouco mais para parar;
 *   --ct-m3  mola solta (a etiqueta e a luva): balança atrasada, como pendurada;
 *   --ct-mm  intensidade (0 a 1) da mola pesada, para o "estica e agacha" (squash & stretch);
 *   --ct-sp  progresso da rolagem sobre o herói (0 a 1), para a explosão girar devagar enquanto ele sai da tela.
 * Os valores vão de −1 a 1 (positivo = rolando para baixo). Calibradas em simulação: rolagem rápida chega a ±1, uma rolada lenta
 * a ±0,3, e tudo assenta em menos de um segundo depois que a rolagem para.
 *
 * Custo: o laço de quadros só roda enquanto há rolagem ou movimento a assentar; parado, nada roda. Com herói fora da tela as
 * variáveis voltam a zero. Com `prefers-reduced-motion` nada disso é ligado e os elementos ficam parados.
 */
import React from 'react'

// rigidez (k), amortecimento (c) e ganho (g) de cada mola — ver o cálculo no comentário do arquivo
const MOLAS = [{ k: 0.12, c: 0.8, g: 0.07 }, { k: 0.09, c: 0.84, g: 0.09 }, { k: 0.07, c: 0.86, g: 0.055 }]

export function BalancoNaRolagem () {
  const marca = React.useRef(null)
  React.useEffect(() => {
    const topo = marca.current?.parentElement
    if (!topo || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const estado = MOLAS.map(() => ({ x: 0, v: 0 }))
    let ultimoY = window.scrollY
    let ultimoRolar = 0
    let quadro = 0
    const zerar = () => {
      for (const s of estado) { s.x = 0; s.v = 0 }
      ['--ct-m1', '--ct-m2', '--ct-m3', '--ct-mm'].forEach((n) => topo.style.setProperty(n, '0'))
    }
    const passo = (agora) => {
      quadro = 0
      const y = window.scrollY
      const r = topo.getBoundingClientRect()
      const visivel = r.bottom > 0 && r.top < window.innerHeight
      // velocidade em px por quadro, normalizada (60 px por quadro ≈ 1) e limitada
      const sv = Math.max(-2, Math.min(2, (y - ultimoY) / 40))
      ultimoY = y
      if (visivel) {
        topo.style.setProperty('--ct-sp', Math.min(1, Math.max(0, -r.top / Math.max(1, r.height))).toFixed(3))
        let parado = true
        estado.forEach((s, i) => {
          const m = MOLAS[i]
          s.v += sv * m.g
          s.v += -m.k * s.x
          s.v *= m.c
          s.x = Math.max(-1, Math.min(1, s.x + s.v))
          if (Math.abs(s.x) > 0.004 || Math.abs(s.v) > 0.002) parado = false
          topo.style.setProperty(`--ct-m${i + 1}`, s.x.toFixed(3))
        })
        topo.style.setProperty('--ct-mm', Math.abs(estado[0].x).toFixed(3))
        if (parado && agora - ultimoRolar > 150) { zerar(); return }
      } else {
        zerar()
        return
      }
      quadro = requestAnimationFrame(passo)
    }
    const aoRolar = () => { ultimoRolar = performance.now(); if (!quadro) quadro = requestAnimationFrame(passo) }
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => { cancelAnimationFrame(quadro); window.removeEventListener('scroll', aoRolar); zerar() }
  }, [])
  return <span ref={marca} hidden aria-hidden="true" />
}
