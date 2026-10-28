/*
 * Peças pequenas do sistema visual da Cartoon (docs/cartoon-2026-2/10 §10.4).
 * Só composição: o desenho mora em scw-cartoon.css, sobre os tokens --ct-*.
 */
import React from 'react'
import { Link } from '../base.jsx'

/** Fita amarela com o nome da seção. */
export function Etiqueta ({ children, as: Tag = 'p' }) {
  return <Tag className="ct-etiqueta">{children}</Tag>
}

/** Dado curto em chocolate. */
export function Pilula ({ children }) {
  return <span className="ct-pilula">{children}</span>
}

/** Selo ou nota em vermelho — texto grande, nunca frase. */
export function Carimbo ({ children }) {
  return <span className="ct-carimbo">{children}</span>
}

/** Dado duro: número grande + rótulo. A cor contrasta com o canal; a tinta é sempre chocolate. */
export function Placa ({ numero, rotulo, cor = 'amarelo' }) {
  return (
    <p className={`ct-placa ct-placa--${cor}`}>
      <span className="ct-placa__numero">{numero}</span>
      <span className="ct-placa__rotulo">{rotulo}</span>
    </p>
  )
}

const CLASSE_BOTAO = { primario: 'ct-botao', acao: 'ct-botao ct-botao--acao', secundario: 'ct-botao ct-botao--contorno' }

/**
 * Com `href` + `navigate` vira link da edição (SPA); com `href` sem `navigate`
 * (link externo, mapa, WhatsApp) vira <a> comum; sem `href`, botão.
 * Reusa .ct-botao, que as páginas já usam; `className` do chamador soma, não substitui.
 */
export function Botao ({ tipo = 'primario', href, navigate, children, className: extra = '', ...resto }) {
  const className = `${CLASSE_BOTAO[tipo] ?? CLASSE_BOTAO.primario} ${extra}`.trim()
  if (href && navigate) return <Link href={href} navigate={navigate} className={className} {...resto}>{children}</Link>
  if (href) return <a href={href} className={className} {...resto}>{children}</a>
  return <button type="button" className={className} {...resto}>{children}</button>
}

/** Quadro branco com fita nos cantos, para logo ou foto. */
export function Quadro ({ children, fita = true }) {
  return <div className={`ct-quadro${fita ? ' ct-quadro--fita' : ''}`}>{children}</div>
}

const BARRAS = ['creme', 'amarelo', 'turquesa', 'rosa', 'vermelho', 'azul', 'roxo']

/** Barras de sinal: a paleta inteira junta, só em transição — nunca fundo de texto. */
export function BarrasSinal () {
  return (
    <div className="ct-barras" aria-hidden="true">
      {BARRAS.map((c) => <span key={c} className={`ct-barras__b ct-barras__b--${c}`} />)}
    </div>
  )
}
