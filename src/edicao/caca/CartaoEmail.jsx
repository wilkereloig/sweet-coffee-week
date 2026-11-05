/*
 * E-mail do mapa em UM cartão (spec 15 §4), montado em toda tela da Caça onde a pessoa já tem mapa.
 *   · e-mail pendente: "Confirmar e-mail" (código de 6 dígitos). O mapa funciona sem confirmar; o lembrete volta a cada visita
 *     ("Agora não" esconde só nesta visita, sessionStorage).
 *   · código certo → o link pessoal sai SOZINHO para o e-mail agora confirmado (sem segundo botão). O estado é verdadeiro:
 *     "pedido aceito" não é "entregue", e a falha oferece "Tentar enviar novamente" sem perder o mapa nem a confirmação.
 *   · e-mail confirmado: "Receber meu link por e-mail" (limites no servidor: 1/min, 5/h).
 * O link é uma CREDENCIAL: a chave vai só no corpo do pedido; chave, link e e-mail inteiro nunca vão para URL, log ou analytics.
 * `caca` = useCaca({ comEmail: true }).
 */
import React from 'react'
import { EDICAO } from '../config.js'
import { CodigoPorEmail } from './CodigoPorEmail.jsx'
import { api as apiPadrao } from './api.js'
import { emailMascarado } from './regras.js'
import { CACA } from './textos.js'
import { useCaca } from './useCaca.js'

const T = CACA.email
const CHAVE = `scw:edicao:${EDICAO.codigo}:caca-email-dispensado`

const lerDispensa = () => { try { return globalThis.sessionStorage.getItem(CHAVE) === '1' } catch { return false } }
const gravarDispensa = () => { try { globalThis.sessionStorage.setItem(CHAVE, '1') } catch { /* sem storage: só some até recarregar */ } }

export function CartaoEmail ({ caca, navigate, api = apiPadrao }) {
  const [aberto, setAberto] = React.useState(false)
  const [dispensado, setDispensado] = React.useState(lerDispensa)
  // '' · 'enviando' · 'aceito' (o serviço aceitou o pedido) · 'limitado' · 'falhou'. `recemConfirmou` = acabou de digitar o código aqui.
  const [envio, setEnvio] = React.useState('')
  const [recemConfirmou, setRecemConfirmou] = React.useState(false)

  const email = caca.mapa?.email
  const mascarado = emailMascarado(email) || 'o seu e-mail'

  async function enviarLink () {
    setEnvio('enviando')
    const r = await api.enviarLink({ email, chave: caca.chave })
    setEnvio(r.ok ? (r.limitado ? 'limitado' : 'aceito') : 'falhou')
  }
  async function aoConfirmar () {
    setRecemConfirmou(true)
    caca.atualizar() // o e-mail passa a 'confirmado'; este cartão segue montado e mostra o resultado do envio
    await enviarLink()
  }

  if (!email || !caca.chave) return null
  const pendente = caca.email === 'pendente'
  const confirmado = caca.email === 'confirmado'
  if (!pendente && !confirmado) return null

  const mensagem = (
    <div aria-live="polite">
      {envio === 'enviando' && <p className="ct-nota" role="status">{T.enviandoLink}</p>}
      {envio === 'aceito' && <p className="ct-nota" role="status">{recemConfirmou ? T.confirmadoLinkPedido(mascarado) : T.linkPedido(mascarado)}</p>}
      {envio === 'limitado' && <p className="ct-nota" role="status">{T.linkLimitado}</p>}
      {envio === 'falhou' && (
        <>
          <p className="ct-aviso" role="alert">{recemConfirmou ? T.confirmadoLinkFalhou : T.linkRede}</p>
          <div className="ct-acoes"><button type="button" className="ct-botao ct-botao--contorno" onClick={enviarLink}>{T.tentarEnviar}</button></div>
        </>
      )}
    </div>
  )

  if (pendente && !recemConfirmou) {
    if (dispensado) return null
    return (
      <aside className="ct-central__linha ct-central__linha--aviso" aria-label={T.aviso}>
        <p className="ct-central__linha-texto"><strong>{T.aviso}</strong> {T.ajuda}</p>
        {aberto
          ? (
            <>
              <p className="ct-nota">{T.maisDeUmMapa}</p>
              <CodigoPorEmail finalidade="confirmar" emailFixo={email} chave={caca.chave} navigate={navigate} aoConcluir={aoConfirmar} />
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

  // Confirmado (agora ou antes): o primeiro envio já saiu sozinho; aqui só o resultado e, depois, o botão de pedir de novo.
  return (
    <aside className="ct-carimbar__guardar" aria-label={T.receberLink}>
      {!recemConfirmou && <p className="ct-nota">{T.receberLinkAjuda}</p>}
      {envio !== 'enviando' && envio !== 'falhou' && (
        <div className="ct-acoes">
          <button type="button" className="ct-botao ct-botao--contorno" onClick={enviarLink}>{T.receberLink}</button>
        </div>
      )}
      {mensagem}
    </aside>
  )
}

/** Para telas que não têm o estado da Caça (carimbo, depois da avaliação): lê o mapa deste aparelho e mostra o cartão. Sem mapa, nada. */
export function CartaoEmailDoAparelho ({ navigate }) {
  const caca = useCaca()
  return caca.estado === 'pronto' ? <CartaoEmail caca={caca} navigate={navigate} /> : null
}
