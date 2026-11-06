import React from 'react'
import { api } from '../../lib/marcaApi'
import { Folha } from '../Folha'
import { codigoDeliveryCompleto, formatarCodigoDelivery, linhasDoPedido, normalizarCodigoDelivery, recadoDoDelivery } from '../../lib/deliveryCasa'

/*
 * "Carimbo de delivery" (balcão da casa): o cliente pediu por delivery, recebeu e mandou um código temporário pelo canal do pedido.
 * A casa digita, confere o essencial e confirma que entregou. Só vale para a própria casa; nunca mexe em voucher nem em presença.
 * O código e os dados do cliente não vão para log nem para o endereço da página.
 */
export function CarimboDelivery({ aberto, onFechar }) {
  const [texto, setTexto] = React.useState('')
  const [pedido, setPedido] = React.useState(null)
  const [fase, setFase] = React.useState('') // '' | 'consultando' | 'confirmando'
  const [aviso, setAviso] = React.useState(null) // { ok } | { erro }
  const campo = React.useRef(null)
  const codigo = normalizarCodigoDelivery(texto)

  React.useEffect(() => { if (!aberto) { setTexto(''); setPedido(null); setAviso(null); setFase('') } }, [aberto])
  React.useEffect(() => { if (aberto && campo.current) campo.current.focus() }, [aberto])

  async function chamar(fn) {
    try { return await api('rpc/' + fn, { metodo: 'POST', corpo: { p_codigo: codigo } }) } catch (e) { return { ok: false, motivo: (e && e.message) || 'rede' } }
  }
  async function consultar(ev) {
    ev.preventDefault()
    if (fase) return
    if (!codigoDeliveryCompleto(texto)) { setAviso({ erro: 'O código tem 6 letras e números.' }); return }
    setFase('consultando'); setAviso(null)
    const r = await chamar('caca_delivery_consultar')
    setFase('')
    if (r && r.ok === true && r.pedido) setPedido(r.pedido)
    else setAviso({ erro: recadoDoDelivery(r && r.motivo) })
  }
  async function confirmar() {
    if (fase) return
    setFase('confirmando'); setAviso(null)
    const r = await chamar('caca_delivery_confirmar')
    setFase('')
    if (r && r.ok === true) { setPedido(null); setTexto(''); setAviso({ ok: 'Carimbo registrado para o cliente. Ele só vale como casa depois que o cliente avaliar o combo.' }) }
    else { setPedido(null); setAviso({ erro: recadoDoDelivery(r && r.motivo) }) }
  }

  return (
    <Folha aberto={aberto} onFechar={onFechar} titulo="Confirmar carimbo de delivery" sub="Para o cliente que pediu por delivery e já recebeu o combo.">
      <div className="bal-ajuda">
        {!pedido && (
          <form className="ui-form ui-form--linha-dupla" onSubmit={consultar}>
            <label className="og-campo"><span>Código que o cliente enviou</span>
              <input ref={campo} type="text" inputMode="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="ABC-123"
                value={formatarCodigoDelivery(codigo)} onChange={(e) => setTexto(e.target.value)} aria-describedby="dlv-ajuda" />
            </label>
            <button className="og-btn" type="submit" disabled={!!fase}>{fase === 'consultando' ? 'Conferindo…' : 'Conferir pedido'}</button>
          </form>
        )}
        <p id="dlv-ajuda" className="ui-nota">O código vale 24 horas e uma única vez, e só aparece para a casa do pedido. Nunca peça o link nem a chave do mapa do cliente.</p>

        {pedido && (
          <div role="group" aria-label="Dados do pedido">
            <dl className="bal-pedido">
              {linhasDoPedido(pedido).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
            <p className="ui-nota"><b>Confirme só se este pedido foi entregue por esta casa.</b> A confirmação cria o carimbo do cliente e não se desfaz por aqui.</p>
            <div className="ui-acoes">
              <button className="og-btn" type="button" onClick={confirmar} disabled={!!fase}>{fase === 'confirmando' ? 'Confirmando…' : 'Confirmar entrega'}</button>
              <button className="og-btn og-btn--sec" type="button" onClick={() => { setPedido(null); setAviso(null) }} disabled={!!fase}>Não é este pedido</button>
            </div>
          </div>
        )}

        <div aria-live="polite">
          {aviso && (aviso.ok ? <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p> : <p className="ui-nota ui-nota--erro" role="alert">{aviso.erro}</p>)}
        </div>
      </div>
    </Folha>
  )
}
