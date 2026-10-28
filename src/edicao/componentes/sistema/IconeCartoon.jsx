/*
 * Ícone ilustrado da edição (docs/cartoon-2026-2/10 §10.15, família 1).
 * Decorativo por contrato: o ícone NUNCA carrega função sozinho — quem usa põe o
 * texto ao lado. Por isso `alt=""` + `aria-hidden`, e nome inexistente não renderiza.
 * O arquivo é 192×192; exibido a 32, 48 ou 64 px (até 3x). Nada abaixo de 28 px.
 */
import React from 'react'
import { iconeEdicao } from '../../../data/imageLibrary'

const TAMANHOS = [32, 48, 64]

export function IconeCartoon ({ nome, tamanho = 48 }) {
  const icone = iconeEdicao(nome)
  if (!icone) return null
  const lado = TAMANHOS.includes(tamanho) ? tamanho : 48
  return <img className="ct-icone" src={icone.src} width={lado} height={lado} alt="" aria-hidden="true" decoding="async" />
}
