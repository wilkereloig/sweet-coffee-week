/*
 * Lembrete discreto enquanto o e-mail do mapa não foi confirmado (spec 15 §4). Só aparece com `caca.email === 'pendente'`;
 * a ação abre o mesmo fluxo de código da recuperação, com finalidade 'confirmar'. É uma linha dispensável: "Agora não"
 * a esconde nesta visita (sessionStorage), e ela volta na próxima, porque a confirmação só acontece por aqui.
 */
import React from 'react'
import { EDICAO } from '../config.js'
import { CodigoPorEmail } from './CodigoPorEmail.jsx'
import { CACA } from './textos.js'

const T = CACA.email
const CHAVE = `scw:edicao:${EDICAO.codigo}:caca-email-dispensado`

const lerDispensa = () => { try { return globalThis.sessionStorage.getItem(CHAVE) === '1' } catch { return false } }
const gravarDispensa = () => { try { globalThis.sessionStorage.setItem(CHAVE, '1') } catch { /* sem storage: só some até recarregar */ } }

export function EmailPendente ({ caca, navigate }) {
  const [aberto, setAberto] = React.useState(false)
  const [dispensado, setDispensado] = React.useState(lerDispensa)
  const [feito, setFeito] = React.useState(false)
  if (feito) return <p className="ct-nota" role="status">{T.confirmado}</p>
  if (caca.email !== 'pendente' || !caca.mapa?.email || dispensado) return null
  return (
    <aside className="ct-central__linha ct-central__linha--aviso" aria-label={T.aviso}>
      <p className="ct-central__linha-texto"><strong>{T.aviso}</strong> {T.ajuda}</p>
      {aberto
        ? (
          <>
            <p className="ct-nota">{T.maisDeUmMapa}</p>
            <CodigoPorEmail finalidade="confirmar" emailFixo={caca.mapa.email} chave={caca.chave} navigate={navigate}
              aoConcluir={() => { setFeito(true); caca.atualizar() }} />
          </>
          )
        : (
          <div className="ct-central__linha-acoes">
            <button type="button" className="ct-botao ct-central__mini" onClick={() => setAberto(true)}>{T.acao}</button>
            <button type="button" className="ct-botao ct-botao--contorno ct-central__mini" onClick={() => { gravarDispensa(); setDispensado(true) }}>{T.fechar}</button>
          </div>
          )}
    </aside>
  )
}
