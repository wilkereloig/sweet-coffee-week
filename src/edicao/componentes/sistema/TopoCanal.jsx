/*
 * Topo de página no canal de cor (docs/cartoon-2026-2/10 §10.2): Estreia
 * amarelo · Elenco creme · Cardápio rosa · Rota turquesa · Gala chocolate ·
 * Serviço creme com faixa azul. O corpo da página continua creme.
 * Cardápio (rosa) põe tinta creme no canal inteiro e só fecha ~3,9:1: o rosa é
 * moldura. Ali só entra texto grande, ou texto pequeno dentro de peça com fundo
 * próprio (.ct-painel creme; Placa, Etiqueta, Pílula). Na Gala (creme sobre
 * chocolate, ~14:1) qualquer texto passa.
 * Com <CenarioTema> como 1º filho, o topo reserva o espaço do cenário (§10.15).
 */
import React from 'react'

export const CANAIS = ['estreia', 'elenco', 'cardapio', 'rota', 'gala', 'servico']

export function TopoCanal ({ canal, children, className = '', ...resto }) {
  return <section className={`ct-canal ct-canal--${canal} ${className}`.trim()} {...resto}>{children}</section>
}
