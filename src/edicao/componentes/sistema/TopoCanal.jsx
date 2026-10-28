/*
 * Topo de página no canal de cor (docs/cartoon-2026-2/10 §10.2): Estreia
 * amarelo · Elenco creme · Cardápio rosa · Rota turquesa · Gala chocolate ·
 * Serviço creme com faixa azul. O corpo da página continua creme.
 * Cardápio (rosa) e Gala (chocolate) põem tinta creme no canal inteiro: ali só
 * entra texto grande, ou texto pequeno dentro de peça com fundo próprio
 * (.ct-rotulo/.ct-lead viram placa creme no Cardápio; Placa, Etiqueta, Pílula).
 */
import React from 'react'

export const CANAIS = ['estreia', 'elenco', 'cardapio', 'rota', 'gala', 'servico']

export function TopoCanal ({ canal, children, className = '' }) {
  return <section className={`ct-canal ct-canal--${canal} ${className}`.trim()}>{children}</section>
}
