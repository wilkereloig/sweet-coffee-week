/*
 * A logo da casa como aparece no pin do mapa (lista 13, M1): a desenhada colorida, aparada, numa placa. Na lista e no
 * cartão ela repete o pin, para a pessoa ligar a linha ao ponto no mapa. Sem desenho, a inicial (nunca logo inventada).
 */
import React from 'react'
import { logoDesenhadaEdicao } from '../../../../data/imageLibrary'

export const pinDaCasa = (p) => logoDesenhadaEdicao(p.slug)?.pin || null

export function LogoDoPin ({ p, tamanho = 44 }) {
  const pin = pinDaCasa(p)
  if (pin) return <img className="ct-mapa__logo" src={pin.src} height={tamanho} alt="" loading="lazy" style={{ '--ct-logo-lado': `${tamanho}px` }} />
  const inicial = (p.casa?.nome || '?').replace(/^\[DEMO\]\s*/, '').trim().charAt(0).toUpperCase()
  return <span className="ct-mapa__logo ct-mapa__logo--inicial" style={{ '--ct-logo-lado': `${tamanho}px` }} aria-hidden="true">{inicial}</span>
}
