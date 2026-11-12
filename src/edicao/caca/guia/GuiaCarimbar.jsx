/*
 * Guia "Como carimbar" (09/11/2026): UM conteúdo, três entradas.
 *   <BotaoComoCarimbar>  o atalho permanente (hub, mapa, tela do carimbo): abre o guia numa folha (a mesma Folha do mapa:
 *                        foco preso, Escape, véu, foco de volta ao botão).
 *   <PrimeiraVez>        introdução do primeiro acesso, como cartão NA tela; "Ver como carimbar" ou "Agora não" gravam que a
 *                        pessoa já viu (só neste aparelho) e o cartão não volta. O guia segue no atalho.
 *   <GuiaConteudo>       os passos e as dúvidas, para quem quiser embutir.
 * Textos em ./textos.js (cada frase segue o fluxo real).
 */
import React from 'react'
import { createPortal } from 'react-dom'
import { Link } from '../../componentes/base.jsx'
import { Folha } from '../../cartoon/paginas/mapa/Folha.jsx'
import { CACA_CAMINHOS as RUA } from '../textos.js'
import { GUIA as G, CHAVE_GUIA } from './textos.js'

const guardado = () => { try { return globalThis.localStorage || null } catch { return null } }
export const guiaVisto = () => { try { return guardado()?.getItem(CHAVE_GUIA) === 'visto' } catch { return false } }
export const marcarGuiaVisto = () => { try { guardado()?.setItem(CHAVE_GUIA, 'visto') } catch { /* sem armazenamento: só não lembra */ } }

export function GuiaConteudo ({ navigate, aoSair }) {
  return (
    <div className="ct-guia">
      <p className="ct-guia__lead">{G.lead}</p>
      <ol className="ct-guia__passos">
        {G.passos.map((p) => <li key={p.titulo}><strong>{p.titulo}</strong><span>{p.texto}</span></li>)}
      </ol>
      <h3 className="ct-sub">{G.duvidasTitulo}</h3>
      {G.duvidas.map((d) => (
        <details key={d.p} className="ct-central__detalhes ct-guia__duvida">
          <summary>{d.p}</summary>
          <p>{d.r}</p>
          {d.href && <p><Link href={d.href} navigate={navigate} className="ct-link" aoIr={aoSair}>{d.acao}</Link></p>}
        </details>
      ))}
      <p className="ct-nota"><Link href={RUA.regulamento} navigate={navigate} className="ct-link" aoIr={aoSair}>{G.regulamento}</Link></p>
    </div>
  )
}

/**
 * Guia numa folha, controlado por quem chama. Vai por portal à raiz da edição (os tokens --ct-* moram em .ct-edicao): o botão pode estar
 * dentro de outra folha ou de um <details>, e folha fixa dentro de folha animada ficaria presa na caixa dela.
 */
export function FolhaGuia ({ aberta, aoFechar, navigate }) {
  if (!aberta) return null
  return createPortal(
    <Folha variante="jogo" aberta titulo={G.titulo} rotuloFechar={G.fechar} aoFechar={aoFechar}>
      <GuiaConteudo navigate={navigate} aoSair={aoFechar} />
    </Folha>,
    document.querySelector('.ct-edicao') || document.body,
  )
}

export function BotaoComoCarimbar ({ navigate, className = 'ct-chip ct-guia__botao', rotulo = G.abrir }) {
  const [aberta, setAberta] = React.useState(false)
  return (
    <>
      <button type="button" className={className} data-como-carimbar aria-haspopup="dialog" onClick={() => { marcarGuiaVisto(); setAberta(true) }}>
        <span className="ct-guia__interrogacao" aria-hidden="true">?</span><span>{rotulo}</span>
      </button>
      <FolhaGuia aberta={aberta} aoFechar={() => setAberta(false)} navigate={navigate} />
    </>
  )
}

export function PrimeiraVez ({ navigate }) {
  const [mostra, setMostra] = React.useState(() => !guiaVisto())
  const [aberta, setAberta] = React.useState(false)
  if (!mostra && !aberta) return null
  return (
    <>
      {mostra && (
        <section className="ct-guia__intro" aria-labelledby="guia-intro">
          <h2 id="guia-intro" className="ct-sub">{G.intro.titulo}</h2>
          <p>{G.intro.texto}</p>
          <div className="ct-acoes">
            <button type="button" className="ct-botao" data-guia-ver onClick={() => { marcarGuiaVisto(); setMostra(false); setAberta(true) }}>{G.intro.ver}</button>
            <button type="button" className="ct-botao ct-botao--contorno" data-guia-depois onClick={() => { marcarGuiaVisto(); setMostra(false) }}>{G.intro.depois}</button>
          </div>
        </section>
      )}
      <FolhaGuia aberta={aberta} aoFechar={() => setAberta(false)} navigate={navigate} />
    </>
  )
}
