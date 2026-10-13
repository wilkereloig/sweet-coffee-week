import React from 'react'
import { FotoAcervo } from '../../../components/FotoAcervo'
import { TEXTOS } from '../../../data/conteudo/edicoes'
import { TOTAL } from '../useEdicoes'

/*
 * CAPA DO CELULAR — a primeira foto do acervo em 4:5, a marca da edição no
 * alto e, embaixo, a etapa e o tema (h1). Remonta por edição (key no pai) e o
 * wipe + ken burns rodam de novo.
 *
 * No canto, o ANO da edição e a posição na linha do tempo: antes o canto só
 * dizia "01/16" e o ano aparecia apenas na régua da base.
 */
export function CapaMobile({ cena, numero, marca, capa }) {
  return (
    <div className="scw-edx-mob__capa">
      {capa
        ? <FotoAcervo foto={capa} papel="cheia" prioridade className="scw-edx-mob__capa-foto" />
        : <span className="scw-edx__reserva">{TEXTOS.fotoPendente}</span>}
      <span className="scw-edx-mob__capa-topo" aria-hidden="true" />
      <span className="scw-edx-mob__capa-base" aria-hidden="true" />

      <div className="scw-edx-mob__cab">
        {marca.logo
          ? <img className="scw-edx-mob__marca" src={marca.logo} alt={`Marca da edição ${cena.tema}`} decoding="async" />
          : <span className="scw-edx-mob__marca-reserva">{TEXTOS.marcaPendente}</span>}
        <p className="scw-edx-mob__quando">
          <b>{cena.code}</b>
          <span>edição {numero}/{TOTAL}</span>
        </p>
      </div>

      <div className="scw-edx-mob__titulo">
        <span className="scw-edx-mob__rotulo">{cena.etapa}</span>
        <h1 className="scw-edx-mob__tema">{cena.tema}</h1>
      </div>
    </div>
  )
}
