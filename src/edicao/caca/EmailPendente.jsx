/*
 * Lembrete discreto enquanto o e-mail do mapa não foi confirmado (spec 15 §4). Só aparece com `caca.email === 'pendente'`;
 * a ação abre o mesmo fluxo de código da recuperação, com finalidade 'confirmar'.
 */
import React from 'react'
import { CodigoPorEmail } from './CodigoPorEmail.jsx'
import { CACA } from './textos.js'

const T = CACA.email

export function EmailPendente ({ caca, navigate }) {
  const [aberto, setAberto] = React.useState(false)
  const [dispensado, setDispensado] = React.useState(false)
  const [feito, setFeito] = React.useState(false)
  if (feito) return <p className="ct-nota" role="status">{T.confirmado}</p>
  if (caca.email !== 'pendente' || !caca.mapa?.email || dispensado) return null
  return (
    <aside className="ct-caca__aviso" aria-label={T.aviso}>
      <p className="ct-caca__aviso-texto"><strong>{T.aviso}</strong> {T.ajuda}</p>
      {aberto
        ? <CodigoPorEmail finalidade="confirmar" emailFixo={caca.mapa.email} chave={caca.chave} navigate={navigate}
            aoConcluir={() => { setFeito(true); caca.atualizar() }} />
        : (
          <div className="ct-acoes">
            <button type="button" className="ct-botao" onClick={() => setAberto(true)}>{T.acao}</button>
            <button type="button" className="ct-botao ct-botao--contorno" onClick={() => setDispensado(true)}>{T.fechar}</button>
          </div>
          )}
    </aside>
  )
}
