/*
 * PÁGINA INSTITUCIONAL — "Participar" (`/participar`, cyan).
 * ⚠️ É a única página pública hoje: PARTICIPAR_ONLY_PUBLICATION faz o domínio
 * inteiro abrir nela (src/App.jsx — não mexer na flag, A3).
 *
 * Jornada (12/10/2026): 01 Abertura · 02 Depoimentos · 03 Para quem é e como
 * funciona · 04 O que a participação oferece · 05 Depois do pré-cadastro ·
 * 06 Próximo passo. Texto em src/data/conteudo/participar.js; uma seção por
 * arquivo em ./secoes. A faixa de palavras (Marquee) saiu em 12/10 e voltou em
 * 14/10/2026, pedido do Wilker: em todas as páginas, exceto a Home e Edições.
 */
import React from 'react'
import { Seta } from '../../components/Seta'
import { Marquee } from '../../components/Marquee'
import { PRE_CADASTRO, PROXIMO, PALAVRAS } from '../../data/conteudo/participar'
import { BarraAcao } from './comum'
import { Abertura } from './secoes/Abertura'
import { Depoimentos } from './secoes/Depoimentos'
import { ParaQuem } from './secoes/ParaQuem'
import { Oferece } from './secoes/Oferece'
import { Depois } from './secoes/Depois'
import { ProximoPasso } from './secoes/ProximoPasso'
import '../../styles/scw-participar-apoiar.css'

export function ParticiparPage() {
  return (
    <>
      <Abertura />
      <Marquee palavras={PALAVRAS} />
      <Depoimentos />
      <ParaQuem />
      <Oferece />
      <Depois />
      <ProximoPasso />
      <BarraAcao texto={PROXIMO.barra}>
        <a href={PRE_CADASTRO} className="scw-btn scw-btn--solido">Fazer pré-cadastro <Seta /></a>
      </BarraAcao>
    </>
  )
}

export default ParticiparPage
