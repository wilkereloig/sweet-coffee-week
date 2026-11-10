/* Cartão do apoiador escolhido no mapa (o mesmo nos dois mapas): a marca, o rótulo e TODOS os locais dele, cada um com "Como chegar".
   Ponto de retirada: rótulo "Retirada de vouchers" com o ícone, e a frase oficial como único texto. */
import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon.jsx'
import { Botao, Rotulo } from '../../componentes/sistema/pecas.jsx'
import { ICONE } from '../../cartoon/textos.js'
import { MARCAS_PARCEIROS } from '../../../data/imageLibrary'
import { linkComoChegarLocal, ehRetirada, textoDoApoio } from './apoio.js'
import { SeloRetirada } from './SeloRetirada.jsx'

export function CartaoApoio ({ apoio, fechar }) {
  if (!apoio) return null
  const logo = MARCAS_PARCEIROS[apoio.marca]
  const retirada = ehRetirada(apoio)
  return (
    <article className="ct-mapa__cartao ct-caca-mapa__sicredi-cartao" aria-labelledby="mapa-cartao-nome" tabIndex={-1}>
      <div className="ct-mapa__cartao-cabeca">
        <img className="ct-caca-mapa__apoio-logo" src={logo.src} alt="" width={120} height={Math.round((120 * logo.altura) / logo.largura)} decoding="async" />
        <div>
          {retirada ? <SeloRetirada /> : <Rotulo>Apoio</Rotulo>}
          <h2 id="mapa-cartao-nome" className="ct-mapa__cartao-nome">{apoio.nome}</h2>
        </div>
        <button type="button" className="ct-mapa__fechar" onClick={fechar} aria-label="Fechar"><ScwIcon nome="fechar" tamanho={20} /></button>
      </div>
      <p className="ct-nota">{textoDoApoio(apoio)}</p>
      <ul className="ct-caca-mapa__apoio-locais">
        {apoio.locais.map((l) => (
          <li key={l.id}>
            {apoio.locais.length > 1 && <strong>{l.nome}</strong>}
            <span className="ct-mapa__cartao-linha"><ScwIcon nome={ICONE.endereco} tamanho={20} /><span>{l.endereco}</span></span>
            <Botao tipo="secundario" href={linkComoChegarLocal(l)} target="_blank" rel="noopener noreferrer"><ScwIcon nome={ICONE.comoChegar} tamanho={20} />Como chegar</Botao>
          </li>
        ))}
      </ul>
    </article>
  )
}

/** Vista em lista: os mesmos apoiadores dos dois mapas, com o mesmo rótulo do pin. Tocar abre o cartão (com endereço e "Como chegar"). */
export function ListaApoio ({ apoios, selecionada, aoSelecionar }) {
  if (!apoios.length) return null
  return (
    <section className="ct-caca-mapa__sicredi" aria-labelledby="apoio-titulo">
      <h2 id="apoio-titulo" className="ct-sub">Apoio da edição</h2>
      <ul className="ct-caca-mapa__sicredi-lista">
        {apoios.map((a) => {
          const sel = selecionada === a.id || String(selecionada).startsWith(`${a.id}@`)
          return (
            <li key={a.id} id={`mapa-${a.id}`} className={`ct-caca-mapa__sicredi-item${sel ? ' is-sel' : ''}`}>
              <button type="button" className="ct-caca-mapa__sicredi-sel" aria-pressed={sel} onClick={() => aoSelecionar(sel ? '' : a.id)}>
                {ehRetirada(a) ? <SeloRetirada /> : <span className="ct-caca-mapa__sicredi-selo">Apoio</span>}
                <strong>{a.nome}</strong>
                <span>{a.locais.length > 1 ? `${a.locais.length} endereços` : a.locais[0].endereco}</span>
                <span className="ct-nota">{textoDoApoio(a)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
