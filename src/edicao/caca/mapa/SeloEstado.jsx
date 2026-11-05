/*
 * O estado de uma casa na Caça, dito de três jeitos ao mesmo tempo — forma do pin, texto e (por último) cor — para nunca
 * depender só de cor. Usado no cartão, na lista e na legenda. `revisitas` > 0 acrescenta o selo "+N".
 */
import React from 'react'
import { ESTADO_TEXTO, MAPA_CACA as T } from './textos.js'
import { IMAGENS_ESTADO, IMAGEM_REVISITA } from './imagens.js'

export function SeloEstado ({ estado, revisitas = 0, tamanho = 28, longo = false }) {
  if (!estado) return null
  const img = IMAGENS_ESTADO[estado]
  return (
    <span className={`ct-selo-estado ct-selo-estado--${estado}`}>
      <img src={img.src} width={Math.round(tamanho * (img.largura / img.altura))} height={tamanho} alt="" loading="lazy" draggable={false} />
      <span>{longo ? ESTADO_TEXTO[estado].rotulo : ESTADO_TEXTO[estado].curto}</span>
      {revisitas > 0 && (
        <span className="ct-selo-estado__revisita" title={T.revisitas(revisitas)}>
          <img src={IMAGEM_REVISITA.src} width={tamanho} height={tamanho} alt="" loading="lazy" draggable={false} />
          <b aria-hidden="true">{T.revisitaCurta(revisitas)}</b>
          <span className="ct-sr">{T.revisitas(revisitas)}</span>
        </span>
      )}
    </span>
  )
}
