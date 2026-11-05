/*
 * Guardar o mapa: o link pessoal é uma CREDENCIAL (como uma senha). Só se copia para a área de transferência da própria
 * pessoa: nada de botão de envio para WhatsApp ou rede social, porque o endereço de compartilhamento levaria a chave junto
 * (spec 15 §4). A recuperação por e-mail é o caminho normal para outro aparelho.
 */
import React from 'react'
import * as C from '../rota/carimbo.js'
import { CACA } from './textos.js'

const T = CACA.guardar

export function GuardarMapa ({ chave }) {
  const [estado, setEstado] = React.useState('') // '' · 'copiado' · 'falhou'
  const copiar = async () => {
    try { await navigator.clipboard.writeText(C.linkDoMapa(globalThis.location?.origin || '', chave)); setEstado('copiado') } catch { setEstado('falhou') }
  }
  if (!C.chaveValida(chave)) return null
  return (
    <div className="ct-carimbar__guardar">
      <p className="ct-sub">{T.titulo}</p>
      <p className="ct-nota">{T.texto}</p>
      <p className="ct-nota"><strong>{T.aviso}</strong></p>
      <div className="ct-acoes">
        <button type="button" className="ct-botao ct-botao--contorno" onClick={copiar}>{estado === 'copiado' ? T.copiado : T.copiar}</button>
      </div>
      <p className="ct-sr" aria-live="polite">{estado === 'copiado' ? T.anuncio : ''}</p>
      {estado === 'falhou' && <p className="ct-aviso" role="alert">{T.falhou}</p>}
    </div>
  )
}
