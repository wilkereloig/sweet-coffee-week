/* Página do patrocinador (/cartoon/patrocinador). O QR do verso do mapa A5 (código `patrocinador`) leva aqui.
   Institucional e neutra, a pedido do Wilker: fundo branco (versão preferencial do logo, sem box), sem os elementos de
   gibi da edição. Agências = as bandeiras Sicredi do mapa (src/data/mundoEdicao.js); textos em ../textos.js. */
import React from 'react'
import { EDICAO } from '../../config.js'
import { Link } from '../../componentes/base.jsx'
import { MARCAS_PARCEIROS, mundoEdicao } from '../../../data/imageLibrary'
import { MAPA_NO_AR } from '../contexto.js'
import { PATROCINADOR as T } from '../textos.js'

const linkMapa = (s) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.nome}, ${s.endereco}`)}`

export function Patrocinador ({ navigate }) {
  const mundo = mundoEdicao()
  const logo = MARCAS_PARCEIROS.sicredi
  return (
    <section className="ct-patrocinador" aria-labelledby="patrocinador-titulo">
      <div className="ct-patrocinador__sobre">
        <img className="ct-patrocinador__logo" src={logo.src} alt={logo.alt} width={logo.largura} height={logo.altura} />
        <p className="ct-patrocinador__rotulo">{T.rotulo}</p>
        <h1 id="patrocinador-titulo">{T.titulo}</h1>
        <p>{T.sobre}</p>
        <p>{T.edicao}</p>
        <a href={T.siteUrl} target="_blank" rel="noopener" className="ct-patrocinador__site">{T.site}</a>
      </div>
      <div className="ct-patrocinador__agencias">
        <h2>{T.agencias}</h2>
        <ul>
          {mundo.sicredi.map((s) => (
            <li key={s.nome}>
              <strong>{s.nome}</strong>
              <span>{s.endereco}</span>
              <a href={linkMapa(s)} target="_blank" rel="noopener" aria-label={T.verNoMapaRotulo(s.nome)}>{T.verNoMapa}</a>
            </li>
          ))}
        </ul>
        {MAPA_NO_AR && <Link href={`${EDICAO.caminho}/mapa`} navigate={navigate} className="ct-patrocinador__voltar">{T.voltar}</Link>}
      </div>
    </section>
  )
}
