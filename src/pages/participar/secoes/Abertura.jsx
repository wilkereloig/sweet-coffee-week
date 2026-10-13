import React from 'react'
import { heroPhotos } from '../../../data/imageLibrary'
import { ABERTURA, PRE_CADASTRO } from '../../../data/conteudo/participar'
import { Seta } from '../../../components/Seta'
import { Destaque, HeroPa, irPara } from '../comum'

const FOTOS = heroPhotos('participar')

/* 01 Abertura. O título encurtou (12/10/2026): a frase antiga juntava anúncio e
   pré-cadastro e quebrava em cinco linhas no celular, empurrando a ação para
   baixo do aviso de cookies. O mês da edição fica no lead, vindo do dado.
   Chapa cyan, tinta chocolate: o destaque é roxo (4,25:1, texto grande). */
export function Abertura() {
  return (
    <HeroPa
      fotos={FOTOS}
      titulo={<>{ABERTURA.titulo}{' '}<Destaque dest="var(--scw-roxo)">{ABERTURA.destaque}</Destaque></>}
      lead={ABERTURA.lead}
    >
      <a href={PRE_CADASTRO} className="scw-btn scw-btn--solido">
        {ABERTURA.acao} <Seta />
      </a>
      <a href="#como-funciona" className="scw-btn scw-btn--contorno-claro" onClick={irPara('como-funciona')}>
        {ABERTURA.secundaria}
      </a>
    </HeroPa>
  )
}
