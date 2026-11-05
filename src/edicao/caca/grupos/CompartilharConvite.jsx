/*
 * O link de convite de um grupo: copiar e (quando o aparelho tem) compartilhar pela folha nativa. O token só existe em
 * memória, no momento em que o servidor o entrega (criar grupo ou gerar link novo): nada vai para storage, log,
 * analytics ou cópia fora do que a própria pessoa mandar. A mensagem de compartilhamento leva só o nome do grupo.
 */
import React from 'react'
import { linkDoConvite, validadeDoConvite } from './regras.js'
import { GRUPOS } from './textos.js'

const T = GRUPOS.convite

export function CompartilharConvite ({ token, nomeGrupo, expiraEm }) {
  const [estado, setEstado] = React.useState('') // '' · 'copiado' · 'falhou'
  const link = linkDoConvite(globalThis.location?.origin || '', token)
  const validade = validadeDoConvite(expiraEm)
  const podeCompartilhar = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  React.useEffect(() => { setEstado('') }, [token])
  if (!link) return null

  const copiar = async () => {
    try { await navigator.clipboard.writeText(link); setEstado('copiado') } catch { setEstado('falhou') }
  }
  const compartilhar = async () => {
    try { await navigator.share({ title: T.tituloCompartilhar, text: T.mensagem(nomeGrupo), url: link }) } catch { /* cancelou a folha ou o aparelho recusou: o botão de copiar segue valendo */ }
  }

  return (
    <div className="ct-grupos__convite">
      <label className="ct-campo"><span>{T.campo}</span>
        <input type="text" readOnly value={link} onFocus={(e) => e.target.select()} spellCheck={false} />
      </label>
      <p className="ct-nota">{T.avisoGuardar}{validade ? ` ${T.validoAte(validade)}` : ''}</p>
      <div className="ct-acoes">
        <button type="button" className="ct-botao" onClick={copiar}>{estado === 'copiado' ? T.copiado : T.copiar}</button>
        {podeCompartilhar && <button type="button" className="ct-botao ct-botao--contorno" onClick={compartilhar}>{T.compartilhar}</button>}
      </div>
      <p className="ct-sr" aria-live="polite">{estado === 'copiado' ? T.copiadoAnuncio : ''}</p>
      {estado === 'falhou' && <p className="ct-aviso" role="alert">{T.falhouCopiar}</p>}
    </div>
  )
}
