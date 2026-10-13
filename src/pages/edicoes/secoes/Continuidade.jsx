import React from 'react'
import { FotoAcervo } from '../../../components/FotoAcervo'
import { Seta } from '../../../components/Seta'
import { TEXTOS } from '../../../data/conteudo/edicoes'
import { SetaVolta } from '../icones'

/*
 * CONTINUIDADE — fecha o detalhe na chapa da página: a edição anterior e a
 * seguinte, cada uma com tema, ano e capa (não só uma seta), e a volta para a
 * coleção. Na estreia não há anterior; na Lovers não há seguinte — a edição em
 * campanha não é histórico.
 */
function Vizinha({ e, rotulo, lado }) {
  return (
    <a className={`edx-seq__item edx-seq__item--${lado}`} href={e.href}>
      <span className="edx-seq__foto">{e.capa && <FotoAcervo foto={e.capa} papel="miniatura" alt="" />}</span>
      <span className="edx-seq__texto">
        <span className="edx-seq__rotulo">
          {lado === 'ant' && <SetaVolta size={14} />}{rotulo}{lado === 'prox' && <Seta size={14} />}
        </span>
        <span className="edx-seq__tema">{e.tema}</span>
        <span className="edx-seq__ano">{e.ano}</span>
      </span>
    </a>
  )
}

export function Continuidade({ anterior, proxima }) {
  return (
    <nav className="scw-secao scw-secao--compacta edx-seq" aria-label="Outras edições">
      <div className="edx-seq__vizinhas">
        {anterior ? <Vizinha e={anterior} rotulo={TEXTOS.anterior} lado="ant" /> : <span className="edx-seq__vazio" />}
        {proxima ? <Vizinha e={proxima} rotulo={TEXTOS.proxima} lado="prox" /> : <span className="edx-seq__vazio" />}
      </div>
      <a className="scw-btn edx-seq__todas" href="#/edicoes"><SetaVolta size={16} />{TEXTOS.voltar}</a>
    </nav>
  )
}
