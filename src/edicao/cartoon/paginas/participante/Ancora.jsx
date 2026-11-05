/*
 * Atalho para um bloco da própria ficha ("Endereço e horário", o item do combo, "Contém…").
 *
 * Rola até o bloco SEM mexer no endereço: a ficha também roda dentro da prévia do painel, que lê o hash como rota —
 * um `#unidades` ali jogava a pessoa para fora da prévia. A busca é dentro da ficha (`.ct-part`), nunca no documento:
 * o painel tem ids próprios (`combo`, `unidades`) e o primeiro do documento não é o nosso.
 * Sem o bloco (ou com Ctrl/Cmd/Shift/botão do meio) o link faz o que um link faz. O foco vai para o bloco, para
 * quem navega por teclado ou leitor de tela seguir de onde chegou.
 */
import React from 'react'

export function Ancora ({ para, children, ...resto }) {
  const ir = (e) => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const alvo = e.currentTarget.closest('.ct-part')?.querySelector(`#${para}`)
    if (!alvo) return
    e.preventDefault()
    const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    alvo.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' })
    if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1')
    alvo.focus({ preventScroll: true })
  }
  return <a href={`#${para}`} onClick={ir} {...resto}>{children}</a>
}
