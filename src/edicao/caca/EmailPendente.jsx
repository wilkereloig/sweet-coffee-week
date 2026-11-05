/*
 * Lembrete discreto enquanto o e-mail do mapa não foi confirmado (spec 15 §4). Só aparece com `caca.email === 'pendente'`;
 * a ação abre o mesmo fluxo de código da recuperação, com finalidade 'confirmar'. É uma linha dispensável: "Agora não"
 * a esconde nesta visita (sessionStorage), e ela volta na próxima, porque a confirmação só acontece por aqui.
 */
import React from 'react'
import { EDICAO } from '../config.js'
import { CodigoPorEmail } from './CodigoPorEmail.jsx'
import { api as apiPadrao } from './api.js'
import { emailMascarado } from './regras.js'
import { CACA } from './textos.js'

const T = CACA.email
const CHAVE = `scw:edicao:${EDICAO.codigo}:caca-email-dispensado`

const lerDispensa = () => { try { return globalThis.sessionStorage.getItem(CHAVE) === '1' } catch { return false } }
const gravarDispensa = () => { try { globalThis.sessionStorage.setItem(CHAVE, '1') } catch { /* sem storage: só some até recarregar */ } }

export function EmailPendente ({ caca, navigate, api = apiPadrao }) {
  const [aberto, setAberto] = React.useState(false)
  const [dispensado, setDispensado] = React.useState(lerDispensa)
  const [feito, setFeito] = React.useState('') // '' · 'link' (link enviado) · 'semLink' (confirmou, o envio do link falhou)
  const [enviandoLink, setEnviandoLink] = React.useState(false)
  // Depois do código certo, manda o link pessoal para o e-mail agora confirmado (uma vez; o botão "Receber meu link" refaz).
  async function aoConfirmar () {
    setEnviandoLink(true)
    const r = await api.enviarLink({ email: caca.mapa?.email, chave: caca.chave })
    setEnviandoLink(false)
    setFeito(r.ok ? 'link' : 'semLink')
    caca.atualizar()
  }
  if (enviandoLink) return <p className="ct-nota" role="status">{T.enviandoLink}</p>
  if (feito) return <p className="ct-nota" role="status">{feito === 'link' ? T.linkEnviado(emailMascarado(caca.mapa?.email) || 'o seu e-mail') : T.linkFalhou}</p>
  if (caca.email !== 'pendente' || !caca.mapa?.email || dispensado) return null
  return (
    <aside className="ct-central__linha ct-central__linha--aviso" aria-label={T.aviso}>
      <p className="ct-central__linha-texto"><strong>{T.aviso}</strong> {T.ajuda}</p>
      {aberto
        ? (
          <>
            <p className="ct-nota">{T.maisDeUmMapa}</p>
            <CodigoPorEmail finalidade="confirmar" emailFixo={caca.mapa.email} chave={caca.chave} navigate={navigate}
              aoConcluir={aoConfirmar} />
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
