/* Cartão do apoiador escolhido no mapa: a marca, o rótulo "Apoio" e TODOS os locais dela, cada um com "Como chegar". */
import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon.jsx'
import { Botao, Rotulo } from '../../componentes/sistema/pecas.jsx'
import { ICONE } from '../../cartoon/textos.js'
import { MARCAS_PARCEIROS } from '../../../data/imageLibrary'
import { linkComoChegarLocal } from './apoio.js'

export function CartaoApoio ({ apoio, fechar }) {
  if (!apoio) return null
  const logo = MARCAS_PARCEIROS[apoio.marca]
  return (
    <article className="ct-mapa__cartao ct-caca-mapa__sicredi-cartao" aria-labelledby="mapa-cartao-nome" tabIndex={-1}>
      <div className="ct-mapa__cartao-cabeca">
        <img className="ct-caca-mapa__apoio-logo" src={logo.src} alt="" width={120} height={Math.round((120 * logo.altura) / logo.largura)} decoding="async" />
        <div>
          <Rotulo>Apoio</Rotulo>
          <h2 id="mapa-cartao-nome" className="ct-mapa__cartao-nome">{apoio.nome}</h2>
        </div>
        <button type="button" className="ct-mapa__fechar" onClick={fechar} aria-label="Fechar"><ScwIcon nome="fechar" tamanho={20} /></button>
      </div>
      <p className="ct-nota">{apoio.descricao} Não conta como casa nem como carimbo.</p>
      <ul className="ct-caca-mapa__apoio-locais">
        {apoio.locais.map((l) => (
          <li key={l.nome}>
            <strong>{l.nome}</strong>
            <span className="ct-mapa__cartao-linha"><ScwIcon nome={ICONE.endereco} tamanho={20} /><span>{l.endereco}</span></span>
            <Botao tipo="secundario" href={linkComoChegarLocal(l)} target="_blank" rel="noopener noreferrer"><ScwIcon nome={ICONE.comoChegar} tamanho={20} />Como chegar</Botao>
          </li>
        ))}
      </ul>
    </article>
  )
}
