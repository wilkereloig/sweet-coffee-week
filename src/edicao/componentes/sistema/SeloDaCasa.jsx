/*
 * Selo da casa: a logo oficial num círculo no canto da foto do combo (a "lâmina" do carrossel). Peça única da Entrada
 * (Nosso elenco) e do catálogo (Casas e Combos): a mesma logo, o mesmo tratamento.
 * A logo é a desenhada (cor) quando existe; senão a oficial do acervo/Storage. Sem logo nenhuma, não renderiza (nada de imagem
 * quebrada nem círculo vazio). Decorativo: o nome da casa já está no cartão. O pai precisa ser `position: relative`.
 */
import React from 'react'
import { imagemPublica } from '../../dados/publico.js'

export function SeloDaCasa ({ casa, className = '' }) {
  const src = casa?.logo_desenhada?.cor || imagemPublica(casa?.logo)
  const [quebrada, setQuebrada] = React.useState(false)
  if (!src || quebrada) return null
  return (
    <span className={`ct-selo-casa${className ? ` ${className}` : ''}`} aria-hidden="true">
      <img src={src} alt="" loading="lazy" decoding="async" onError={() => setQuebrada(true)} />
    </span>
  )
}
