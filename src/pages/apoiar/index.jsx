/*
 * PÁGINA INSTITUCIONAL — "Apoiar" (`/apoiar`, marrom). Irmã da Participar:
 * mesmo herói e o mesmo CSS (scw-participar-apoiar.css).
 *
 * Seções (12/10/2026): 01 Abertura · 02 Alcance · 03 Quem vive o festival ·
 * 04 Onde a marca aparece (com os formatos que já aconteceram) · 05 Proposta.
 * Saíram os seis "motivos" em card — cada um repetia o público, o alcance ou
 * um ponto de contato — e a faixa de palavras (laço sem pausa, só atmosfera).
 * Texto em src/data/conteudo/apoiar.js; uma seção por arquivo em ./secoes.
 *
 * A proposta mantém a PERSISTÊNCIA REAL: `submit_support_interest` pela porta
 * protegida (src/lib/enviarFormulario.js), lógica pura em
 * src/lib/supportInterest.js. Nunca afirma "enviado" se a gravação falhar.
 */
import React from 'react'
import { Seta } from '../../components/Seta'
import { PROPOSTA } from '../../data/conteudo/apoiar'
import { BarraAcao, irPara } from '../participar/comum'
import { Abertura } from './secoes/Abertura'
import { Alcance } from './secoes/Alcance'
import { QuemVive } from './secoes/QuemVive'
import { OndeAparece } from './secoes/OndeAparece'
import { Proposta } from './secoes/Proposta'
import '../../styles/scw-participar-apoiar.css'

export function ApoiarPage() {
  return (
    <>
      <Abertura />
      <Alcance />
      <QuemVive />
      <OndeAparece />
      <Proposta />
      <BarraAcao texto={PROPOSTA.barra}>
        <a href="#proposta" className="scw-btn scw-btn--solido" onClick={irPara('proposta')}>
          {PROPOSTA.barraAcao} <Seta />
        </a>
      </BarraAcao>
    </>
  )
}

export default ApoiarPage
