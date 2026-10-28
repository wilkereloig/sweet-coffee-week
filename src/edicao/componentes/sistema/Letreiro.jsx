/*
 * Título de seção (docs/cartoon-2026-2/10 §10.4). Com `imagem`: o letreiro
 * desenhado da edição, e o texto real fica no HTML para leitor de tela e busca.
 * Sem imagem: o texto em Grandstander com efeito de letreiro em CSS. O mesmo
 * componente segura os dois casos — a página não escolhe.
 */
import React from 'react'
import { srcSet } from '../../../data/imageLibrary'

export function Letreiro ({ texto, imagem, nivel = 2, tamanho = 'titulo', cor = 'vermelho', id }) {
  const Tag = `h${nivel}`
  if (imagem) {
    return (
      <Tag id={id} className="ct-letreiro ct-letreiro--imagem">
        <img src={imagem.src} srcSet={srcSet(imagem.src)} sizes="(max-width: 600px) 90vw, 560px" alt="" width={imagem.largura} height={imagem.altura} />
        <span className="ct-sr">{texto}</span>
      </Tag>
    )
  }
  return <Tag id={id} className={`ct-letreiro ct-letreiro--${tamanho} ct-letreiro--cor-${cor}`}>{texto}</Tag>
}
