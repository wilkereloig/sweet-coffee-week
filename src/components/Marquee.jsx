/*
 * Marquee — a faixa de palavras que corre logo abaixo do herói.
 *
 * O markup era o mesmo em Home, Participar e Apoiar: três `<ul>` idênticos,
 * porque a faixa precisa de cópias suficientes para o laço não mostrar buraco
 * ao voltar ao começo. Ao entrar a quarta página (Sweet Awards, 21/08/2026), a
 * cópia virou componente (§5.3 — ao ver a 2ª cópia, extraia; nunca a 3ª).
 *
 * O que muda entre páginas é só a lista de palavras. A faixa é a mesma peça em
 * todas — mesmo gradiente, mesmo ritmo —, então a aparência vive inteira em
 * `.scw-marquee` (scw-2026.css) e nada de visual é passado por prop.
 *
 * `aria-hidden` porque é reforço de tom, não informação: as palavras repetem em
 * caixa-alta o que as seções ao redor já dizem por extenso, e um leitor de tela
 * ouviria a lista três vezes seguidas.
 */

import React from 'react'

/* Três voltas é o mínimo que cobre a tela mais larga sem vão no laço. */
const VOLTAS = [0, 1, 2]

/**
 * @param {object}   props
 * @param {string[]} props.palavras  as palavras da faixa, em minúsculas
 */
export function Marquee({ palavras }) {
  if (!palavras || !palavras.length) return null

  return (
    <div className="scw-marquee" aria-hidden="true">
      {VOLTAS.map((volta) => (
        <ul key={volta}>
          {palavras.map((palavra) => (
            <li key={palavra}>
              <span className="scw-marquee__palavra">{palavra}</span>
              <span className="scw-marquee__ponto" />
            </li>
          ))}
        </ul>
      ))}
    </div>
  )
}

export default Marquee
