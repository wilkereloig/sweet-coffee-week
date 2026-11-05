/*
 * "Receber meu link por e-mail": manda o link pessoal do mapa (uma CREDENCIAL) para o e-mail JÁ confirmado. O servidor guarda só o
 * hash da chave, então a chave vai no pedido; a edge function só envia se o e-mail do mapa estiver confirmado. Só aparece com
 * `caca.email === 'confirmado'`. A resposta é a mesma exista ou não mapa, então o texto promete só "se o e-mail estiver confirmado".
 * Chave, link e e-mail inteiro nunca vão para URL, log ou analytics (o e-mail aparece mascarado).
 */
import React from 'react'
import { api as apiPadrao } from './api.js'
import { emailMascarado } from './regras.js'
import { CACA } from './textos.js'

const T = CACA.email

export function ReceberLink ({ caca, api = apiPadrao }) {
  const [estado, setEstado] = React.useState('') // '' · 'enviando' · 'ok' · 'limitado' · 'rede'
  if (caca.email !== 'confirmado' || !caca.mapa?.email || !caca.chave) return null
  const mascarado = emailMascarado(caca.mapa.email) || 'o seu e-mail'
  async function enviar () {
    setEstado('enviando')
    const r = await api.enviarLink({ email: caca.mapa.email, chave: caca.chave })
    setEstado(r.ok ? (r.limitado ? 'limitado' : 'ok') : 'rede')
  }
  return (
    <div className="ct-carimbar__guardar">
      <p className="ct-nota">{T.receberLinkAjuda}</p>
      <div className="ct-acoes">
        <button type="button" className="ct-botao ct-botao--contorno" onClick={enviar} disabled={estado === 'enviando'}>
          {estado === 'enviando' ? T.enviandoLink : T.receberLink}
        </button>
      </div>
      <div aria-live="polite">
        {estado === 'ok' && <p className="ct-nota">{T.linkReenviado(mascarado)}</p>}
        {estado === 'limitado' && <p className="ct-nota">{T.linkLimitado}</p>}
        {estado === 'rede' && <p className="ct-aviso" role="alert">{T.linkRede}</p>}
      </div>
    </div>
  )
}
