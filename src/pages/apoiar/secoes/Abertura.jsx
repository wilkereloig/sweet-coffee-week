import React from 'react'
import { heroPhotos } from '../../../data/imageLibrary'
import { ABERTURA } from '../../../data/conteudo/apoiar'
import { Seta } from '../../../components/Seta'
import { Destaque, HeroPa, irPara } from '../../participar/comum'

const FOTOS = heroPhotos('apoiar')

/* 01 Abertura. Título curto (12/10/2026): dizer de saída o que a página pede,
   e deixar o valor para o lead. Chapa marrom, tinta creme: destaque amarelo
   (6,2:1 sobre o marrom). */
export function Abertura() {
  return (
    <HeroPa
      fotos={FOTOS}
      titulo={<>{ABERTURA.titulo}{' '}<Destaque base="var(--scw-creme)" dest="var(--scw-amarelo)">{ABERTURA.destaque}</Destaque></>}
      lead={ABERTURA.lead}
    >
      <a href="#proposta" className="scw-btn scw-btn--solido" onClick={irPara('proposta')}>
        {ABERTURA.acao} <Seta />
      </a>
      <a href="#alcance" className="scw-btn scw-btn--contorno-claro" onClick={irPara('alcance')}>
        {ABERTURA.secundaria}
      </a>
    </HeroPa>
  )
}
