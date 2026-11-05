/*
 * O Sicredi no mapa (spec 15 §11): cartão da agência escolhida e a seção de lista. Patrocinador: sempre com o rótulo
 * "Patrocinador" e dizendo que NÃO conta como casa nem como carimbo. "Como chegar" abre o Google Maps pelo ponto
 * conferido (ou pelo endereço escrito); sem nenhum dos dois, o botão não aparece. Nada de coordenada ou endereço inventado.
 */
import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon.jsx'
import { Botao, Rotulo } from '../../componentes/sistema/pecas.jsx'
import { ICONE } from '../../cartoon/textos.js'
import { MARCAS_PARCEIROS } from '../../../data/imageLibrary'
import { linkComoChegarSicredi } from './sicredi.js'
import { MAPA_CACA as T } from './textos.js'

export function CartaoSicredi ({ agencia, fechar }) {
  if (!agencia) return null
  const link = linkComoChegarSicredi(agencia)
  return (
    <article className="ct-mapa__cartao ct-caca-mapa__sicredi-cartao" aria-labelledby="mapa-cartao-nome">
      <div className="ct-mapa__cartao-cabeca">
        <img className="ct-caca-mapa__sicredi-logo" src={MARCAS_PARCEIROS.sicredi.src} alt={MARCAS_PARCEIROS.sicredi.alt} width={80} height={Math.round((80 * MARCAS_PARCEIROS.sicredi.altura) / MARCAS_PARCEIROS.sicredi.largura)} decoding="async" />
        <div>
          <Rotulo>{T.sicrediRotulo}</Rotulo>
          <h2 id="mapa-cartao-nome" className="ct-mapa__cartao-nome">{agencia.nome}</h2>
        </div>
        <button type="button" className="ct-mapa__fechar" onClick={fechar} aria-label="Fechar"><ScwIcon nome="fechar" tamanho={20} /></button>
      </div>
      <p className="ct-mapa__cartao-linha"><ScwIcon nome={ICONE.endereco} tamanho={20} /><span>{agencia.endereco || T.sicrediSemEndereco}</span></p>
      <p className={`ct-mapa__local${agencia.precisao === 'confirmada' ? '' : ' ct-mapa__local--aprox'}`}>{T.sicrediPonto[agencia.precisao]}</p>
      {agencia.numeroEmConferencia && <p className="ct-nota">{T.sicrediNumero}</p>}
      <p className="ct-nota ct-caca-mapa__sicredi-aviso">{T.sicrediAviso}</p>
      {link && (
        <div className="ct-acoes">
          <Botao href={link} target="_blank" rel="noopener noreferrer"><ScwIcon nome={ICONE.comoChegar} tamanho={20} />{T.sicrediComoChegar}</Botao>
        </div>
      )}
    </article>
  )
}

/** Seção da vista em lista: as agências com nome, endereço, aviso e "Como chegar". Uma lista própria (não são casas). */
export function ListaSicredi ({ agencias, selecionada, aoSelecionar }) {
  if (!agencias.length) return null
  return (
    <section className="ct-caca-mapa__sicredi" aria-labelledby="sicredi-titulo">
      <h2 id="sicredi-titulo" className="ct-sub">{T.sicrediTitulo}</h2>
      <p className="ct-nota">{T.sicrediAviso}</p>
      <ul className="ct-caca-mapa__sicredi-lista">
        {agencias.map((a) => {
          const link = linkComoChegarSicredi(a)
          return (
            <li key={a.id} id={`mapa-${a.id}`} className={`ct-caca-mapa__sicredi-item${selecionada === a.id ? ' is-sel' : ''}`}>
              <button type="button" className="ct-caca-mapa__sicredi-sel" aria-pressed={selecionada === a.id} onClick={() => aoSelecionar(selecionada === a.id ? '' : a.id)}>
                <span className="ct-caca-mapa__sicredi-selo">{T.sicrediRotulo}</span>
                <strong>{a.nome}</strong>
                <span>{a.endereco || T.sicrediSemEndereco}</span>
                <span className={`ct-mapa__local${a.precisao === 'confirmada' ? '' : ' ct-mapa__local--aprox'}`}>{T.sicrediPonto[a.precisao]}</span>
                {a.numeroEmConferencia && <span className="ct-nota">{T.sicrediNumero}</span>}
                <span className="ct-nota">{T.sicrediNaoConta}</span>
              </button>
              {link && <div className="ct-mapa__acoes"><Botao tipo="secundario" href={link} target="_blank" rel="noopener noreferrer"><ScwIcon nome={ICONE.comoChegar} tamanho={20} />{T.sicrediComoChegar}</Botao></div>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
