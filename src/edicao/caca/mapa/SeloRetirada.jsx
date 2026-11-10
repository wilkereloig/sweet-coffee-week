/* Selo do ponto de retirada dos vouchers: ícone + "Retirada de vouchers". O mesmo desenho do pin do mapa real (pin.js › seloRetirada). */
import React from 'react'
import { IconeCartoon } from '../../componentes/sistema/IconeCartoon.jsx'
import { RETIRADA } from './apoio.js'

export function SeloRetirada () {
  return <span className="ct-retirada"><IconeCartoon nome="retirada" tamanho={32} /><span className="ct-retirada__texto">{RETIRADA.rotulo}</span></span>
}
