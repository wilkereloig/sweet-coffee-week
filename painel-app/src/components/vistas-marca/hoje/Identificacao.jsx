import React from 'react'
import { LogoMarca } from '../../ui'

/*
 * Quem é a marca e em que edição, em duas linhas. No celular o cabeçalho da página e a identificação
 * da barra do topo somem (≤900px), então este bloco é a única identificação ali; no computador a barra
 * e o cabeçalho já dizem isto e o bloco fica escondido (inicio-marca.css).
 */
export function Identificacao({ nome, logoUrl, edicao, fase }) {
  const sub = [edicao, fase].filter(Boolean).join(' · ')
  return (
    <div className="im-ident">
      <LogoMarca url={logoUrl} nome={nome} tamanho={44} />
      <div className="im-ident__texto">
        <p className="im-ident__nome">{nome}</p>
        {sub && <p className="im-ident__sub">{sub}</p>}
      </div>
    </div>
  )
}
