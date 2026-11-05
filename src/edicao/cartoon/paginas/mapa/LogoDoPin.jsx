/*
 * A logo da casa como aparece no pin do mapa (lista 13, M1) — o MESMO pin no mapa ilustrado e no real: a logo desenhada,
 * P&B enquanto a casa não tem carimbo e colorida depois do primeiro. Na lista e no cartão ela repete o pin, para a pessoa
 * ligar a linha ao ponto no mapa. Sem desenho, a inicial (nunca logo inventada).
 *
 * `estado`: o da Caça no servidor ('nao-visitada' | 'pendente' | 'conquistada' | null — sem mapa). É a única regra de
 * cor: carimbo pendente ou conquistado = colorida; o resto = P&B.
 */
import React from 'react'
import { logoDesenhadaEdicao } from '../../../../data/imageLibrary'

export const ehCarimbada = (estado) => estado === 'pendente' || estado === 'conquistada'

/** Logo desenhada do pin (P&B ou colorida, pelo estado), ou null se a casa ainda não tem desenho. */
export const logoDoPin = (p, estado) => {
  const arte = logoDesenhadaEdicao(p.slug)
  return arte ? (ehCarimbada(estado) ? arte.cor : arte.pb) : null
}

export function LogoDoPin ({ p, tamanho = 44, estado = null }) {
  const src = logoDoPin(p, estado)
  if (src) return <img className="ct-mapa__logo ct-mapa__logo--disco" src={src} width={tamanho} height={tamanho} alt="" loading="lazy" style={{ '--ct-logo-lado': `${tamanho}px` }} />
  const inicial = (p.casa?.nome || '?').replace(/^\[DEMO\]\s*/, '').trim().charAt(0).toUpperCase()
  return <span className="ct-mapa__logo ct-mapa__logo--inicial" style={{ '--ct-logo-lado': `${tamanho}px` }} aria-hidden="true">{inicial}</span>
}
