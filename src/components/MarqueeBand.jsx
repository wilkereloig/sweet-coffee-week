import React from 'react'

/*
 * MarqueeBand — faixa de palavras em movimento contínuo (direção jul/2026,
 * refs de campanha: grandes bandas horizontais entre seções).
 *
 * - Lista triplicada = loop sem salto em qualquer largura; anima só transform.
 * - Decorativa: repete frases que já existem no conteúdo da página, então o
 *   bloco inteiro fica fora da árvore de acessibilidade (aria-hidden).
 * - Pausa no hover; prefers-reduced-motion mostra uma faixa estática centrada.
 * - Tons: coral (default) · yellow · pink · choco — sempre pares da paleta.
 * CSS: bloco .swc-marquee em src/styles.css.
 */
export function MarqueeBand({ words, tone = 'coral', className = '' }) {
  const row = (
    <ul className="swc-marquee__list">
      {words.map((w) => (
        <li key={w}>
          <span className="swc-marquee__word">{w}</span>
          <span className="swc-marquee__dot">&#10022;</span>
        </li>
      ))}
    </ul>
  )
  return (
    <div aria-hidden="true" className={`swc-marquee swc-marquee--${tone} ${className}`.trim()}>
      {row}
      {row}
      {row}
    </div>
  )
}
