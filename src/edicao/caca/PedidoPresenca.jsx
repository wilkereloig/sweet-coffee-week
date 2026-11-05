/*
 * Pedido de revisão de presença (docs/cartoon-2026-2/15-caca-gps-excecao.md): a pessoa está na casa, o GPS falhou
 * de novo e de novo, e pede à ORGANIZAÇÃO que olhe o caso. Não carimba nem conta nada; só vira carimbo se a
 * organização aprovar no painel. A casa não participa. Só confirma "enviado" com `ok` do servidor.
 */
import React from 'react'
import { api as apiPadrao } from './api.js'
import { GPS, mensagemDoPedido } from './textos-gps.js'
import { motivoDoPedido } from './gps.js'
import { quandoVolta } from '../rota/carimbo.js'

const T = GPS.pedido

/** `recusa` = resposta do carimbo (motivo, precisao, distancia_m…); `posicao` = última leitura { lat, lng, precisao } (só em memória). */
export function PedidoPresenca ({ chave, slug, casa, recusa, posicao, aoVoltar, aoEnviar, api = apiPadrao }) {
  const [nota, setNota] = React.useState('')
  const [estado, setEstado] = React.useState('form') // form · enviando · enviado
  const [erro, setErro] = React.useState('')
  const titulo = React.useRef(null)
  React.useEffect(() => { if (estado === 'enviado') titulo.current?.focus() }, [estado])

  async function enviar (e) {
    e.preventDefault()
    if (estado === 'enviando') return
    setEstado('enviando'); setErro('')
    const r = await api.excecaoPedir(chave, {
      slug, motivo: motivoDoPedido(recusa), nota,
      lat: posicao?.lat, lng: posicao?.lng, precisao: posicao?.precisao,
    })
    if (r.ok === true && r.estado === 'pendente') { setEstado('enviado'); aoEnviar?.(); return }
    setEstado('form')
    setErro(mensagemDoPedido(r.motivo, r.liberado_em ? quandoVolta(r.liberado_em) : ''))
  }

  if (estado === 'enviado') {
    return (
      <div className="ct-carimbar__pedido" role="status">
        <p className="ct-sub" ref={titulo} tabIndex={-1}>{T.enviadoTitulo}</p>
        <p className="ct-nota">{T.enviadoTexto(casa)}</p>
        <div className="ct-acoes"><button type="button" className="ct-botao ct-botao--contorno" onClick={aoVoltar}>{T.cancelar}</button></div>
      </div>
    )
  }
  return (
    <form className="ct-form ct-carimbar__pedido" onSubmit={enviar} noValidate aria-labelledby="pedido-presenca">
      <p id="pedido-presenca" className="ct-sub">{T.titulo}</p>
      <p className="ct-nota">{T.lead}</p>
      <p className="ct-nota">{T.quemDecide}</p>
      <label className="ct-campo"><span>{T.notaRotulo}</span>
        <textarea rows={3} maxLength={T.notaMax} value={nota} onChange={(e) => setNota(e.target.value)} aria-describedby="pedido-nota-ajuda" />
        <small id="pedido-nota-ajuda">{T.notaAjuda}</small>
      </label>
      <p className="ct-nota">{T.privacidade}</p>
      {erro && <p className="ct-aviso" role="alert">{erro}</p>}
      <div className="ct-acoes">
        <button type="submit" className="ct-botao" disabled={estado === 'enviando'}>{estado === 'enviando' ? T.enviando : T.enviar}</button>
        <button type="button" className="ct-botao ct-botao--contorno" onClick={aoVoltar} disabled={estado === 'enviando'}>{T.cancelar}</button>
      </div>
    </form>
  )
}
