import React from 'react'
import { SIZES, srcSet } from '../data/imageLibrary'

/*
 * FotoAcervo — foto do acervo como <img> responsiva. Existiam cinco cópias da
 * mesma linha (src + srcSet + sizes + alt + objectPosition + lazy) em Home,
 * Participar, Apoiar, Awards e Edições (§5.3).
 *
 * `foto` é o objeto que sai de imageLibrary.js ({ src, alt, position }); o
 * caminho nunca é montado aqui (§6.12). `papel` escolhe um dos três `sizes`
 * fechados — miniatura · cartao · cheia. `prioridade` é para a primeira foto
 * visível da página: carrega já e avisa o navegador que ela importa.
 */
export function FotoAcervo({ foto, papel = 'cartao', className, prioridade = false, alt }) {
  if (!foto || !foto.src) return null
  return (
    <img
      className={className}
      src={foto.src}
      srcSet={srcSet(foto.src)}
      sizes={SIZES[papel] || SIZES.cartao}
      alt={alt != null ? alt : (foto.alt || '')}
      loading={prioridade ? 'eager' : 'lazy'}
      fetchpriority={prioridade ? 'high' : undefined}
      decoding="async"
      style={foto.position ? { objectPosition: foto.position } : undefined}
    />
  )
}

export default FotoAcervo
