/* Regulamento do Mapa da Doçura (/cartoon/regulamento). Texto em ../regulamento.js; o que falta decidir aparece marcado. */
import React from 'react'
import { Link } from '../../componentes/base.jsx'
import { REGULAMENTO } from '../regulamento.js'

export function Regulamento ({ navigate }) {
  return (
    <section className="ct-bloco ct-regulamento">
      <h1 className="ct-h1">{REGULAMENTO.titulo}</h1>
      <p className="ct-lead">{REGULAMENTO.apoio}</p>
      {REGULAMENTO.secoes.map(([titulo, itens]) => (
        <section key={titulo} className="ct-regulamento__secao" aria-labelledby={`reg-${titulo}`}>
          <h2 id={`reg-${titulo}`} className="ct-sub">{titulo}</h2>
          {itens.map((t, i) => (typeof t === 'string'
            ? <p key={i}>{t}</p>
            : <p key={i}><mark className="ct-adefinir">A definir pela organização: {t.aDefinir}</mark></p>))}
        </section>
      ))}
      <div className="ct-acoes">
        <Link href="/contato" navigate={navigate} className="ct-botao ct-botao--contorno">Falar com a organização</Link>
      </div>
    </section>
  )
}
