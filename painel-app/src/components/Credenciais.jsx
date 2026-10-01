import React from 'react'
import { montarRecado, linkWhatsApp } from '../lib/participantes'
import { traduzirErro } from './ui'

// As credenciais aparecem UMA VEZ SÓ — pintadas na hora da criação e nunca
// recarregadas (a senha não fica guardada em lugar nenhum). Compartilhada
// pelas entradas que criam ou regeram acesso (ficha, lote, candidatura).
//
// `onRegistrar(canal)` (29/09/2026) grava o envio: 'copiado', 'whatsapp_aberto'
// ou 'enviado_manual'. Abrir o WhatsApp NÃO é "enviado" — só o clique em
// "Marcar como enviado" diz isso.
export function Credenciais({ nomeMarca, responsavel, telefone, login, senha, onRegistrar, compacto = false }) {
  const [copiado, setCopiado] = React.useState(false)
  const [enviado, setEnviado] = React.useState(false) // false | 'enviando' | true
  const [erroEnvio, setErroEnvio] = React.useState(null)
  const texto = montarRecado({ nomeMarca: nomeMarca || 'sua marca', responsavel, login, senha, origem: window.location.origin })
  const link = linkWhatsApp(telefone, texto)
  const registrar = (canal) => Promise.resolve(onRegistrar && onRegistrar(canal))

  // "Enviado" é afirmação: só aparece depois de o servidor gravar.
  async function marcarEnviado() {
    setEnviado('enviando'); setErroEnvio(null)
    try { await registrar('enviado_manual'); setEnviado(true) }
    catch (e) { setEnviado(false); setErroEnvio('Não marcou: ' + traduzirErro(e.message)) }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      registrar('copiado').catch(() => {}) // registro de rastro: falhar não desfaz a cópia
    } catch {
      // Sem clipboard (contexto inseguro, permissão negada): os dados estão
      // na tela logo acima. Não fingir que copiou.
      setCopiado('manual')
    }
    window.setTimeout(() => setCopiado(false), 2400)
  }

  return (
    <div className={'og-cred' + (compacto ? ' og-cred--compacto' : '')}>
      {!compacto && <p className="og-cred__aviso">Anote ou envie agora. <b>Esta senha não aparece de novo.</b></p>}
      <dl className="og-cred__par"><dt>Login</dt><dd>{login}</dd></dl>
      <dl className="og-cred__par"><dt>Senha temporária</dt><dd>{senha}</dd></dl>
      <div className="og-cred__acoes">
        <button className="og-btn og-btn--mini" type="button" onClick={copiar}>
          {copiado === true ? 'Copiado' : copiado === 'manual' ? 'Selecione acima' : 'Copiar acesso'}
        </button>
        {link
          ? <a className="og-btn og-btn--vazado og-btn--mini" target="_blank" rel="noopener noreferrer" href={link} onClick={() => { registrar('whatsapp_aberto').catch(() => {}) }}>Enviar pelo WhatsApp</a>
          : <span className="og-forms__nota">Sem WhatsApp no cadastro. Dá para copiar e colar.</span>}
        {onRegistrar && (
          <button className="og-btn og-btn--vazado og-btn--mini" type="button" disabled={!!enviado} onClick={marcarEnviado}>
            {enviado === true ? 'Marcado como enviado' : enviado ? 'Marcando…' : 'Marcar como enviado'}
          </button>
        )}
      </div>
      {erroEnvio && <p className="ui-nota ui-nota--erro" role="alert">{erroEnvio}</p>}
      {!compacto && <p className="og-forms__nota">No primeiro acesso a marca é obrigada a trocar a senha. É isso que faz a mensagem do WhatsApp parar de valer depois de usada.</p>}
    </div>
  )
}
