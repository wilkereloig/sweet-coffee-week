import React from 'react'
import { agruparPorDia, dataHoraExtensa } from '../lib/central'
import { traduzirErro } from './ui'

/*
 * Conversa organização ⇄ marca — a mesma peça nos dois painéis. `lado` é
 * quem está olhando: as mensagens desse lado ficam à direita.
 *
 * O envio só aparece na tela depois de o banco confirmar (onEnviar resolve):
 * nunca afirmar "enviada" antes da hora (mesma regra do resto do painel). O
 * texto digitado fica no campo se o envio falhar.
 *
 * "Lida" é a leitura de quem RECEBE: a organização vê quando a marca abriu, e
 * a marca vê quando a organização abriu.
 */
export function Conversa({ mensagens, lado, onEnviar, podeEnviar = true, semPermissao, carregando, erro, onTentar, rotuloOutro }) {
  const [texto, setTexto] = React.useState('')
  const [enviando, setEnviando] = React.useState(false)
  const [erroEnvio, setErroEnvio] = React.useState(null)
  const fimRef = React.useRef(null)

  React.useEffect(() => {
    if (fimRef.current) fimRef.current.scrollIntoView({ block: 'end' })
  }, [mensagens && mensagens.length])

  async function enviar(ev) {
    if (ev) ev.preventDefault()
    const corpo = texto.trim()
    if (!corpo || enviando) return
    setEnviando(true)
    setErroEnvio(null)
    try {
      await onEnviar(corpo)
      setTexto('')
    } catch (e) {
      setErroEnvio(traduzirErro(e && e.message))
    } finally {
      setEnviando(false)
    }
  }

  function tecla(ev) {
    // Ctrl/⌘ + Enter envia; Enter sozinho quebra linha (mensagem longa é comum).
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) enviar(ev)
  }

  const grupos = agruparPorDia(mensagens || [])

  return (
    <div className="ui-conversa">
      <div className="ui-conversa__rolo" aria-live="polite">
        {carregando && !(mensagens && mensagens.length) && <p className="ui-nota">Carregando a conversa…</p>}
        {erro && (
          <p className="ui-nota" role="alert">
            {traduzirErro(erro)} {onTentar && <button className="og-link" type="button" onClick={onTentar}>Tentar de novo</button>}
          </p>
        )}
        {!carregando && !erro && grupos.length === 0 && (
          <p className="ui-nota">Nenhuma mensagem ainda. {lado === 'marca' ? 'Escreva para a organização quando precisar.' : 'Escreva a primeira mensagem para a marca.'}</p>
        )}
        {grupos.map((g) => (
          <div className="ui-conversa__dia" key={g.rotulo}>
            <p className="ui-conversa__data"><span>{g.rotulo}</span></p>
            {g.itens.map((m) => {
              const minha = m.de === lado
              const hora = new Date(m.criada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              const autor = minha ? 'Você' : (m.de === 'organizacao' ? (m.autor_rotulo && lado === 'organizacao' ? m.autor_rotulo : 'Organização') : (rotuloOutro || 'Marca'))
              const autorMeu = minha && lado === 'organizacao' && m.autor_rotulo ? m.autor_rotulo : autor
              return (
                <div className={'ui-msg' + (minha ? ' is-minha' : '')} key={m.id}>
                  <p className="ui-msg__corpo">{m.corpo}</p>
                  <p className="ui-msg__meta" title={dataHoraExtensa(m.criada_em)}>
                    {autorMeu} · {hora}
                    {minha && (m.lida_em ? ' · lida' : ' · enviada')}
                  </p>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={fimRef} />
      </div>

      {podeEnviar ? (
        <form className="ui-conversa__envio" onSubmit={enviar}>
          <label className="ui-oculto" htmlFor={'msg-' + lado}>Mensagem</label>
          <textarea
            id={'msg-' + lado}
            rows={2}
            maxLength={4000}
            placeholder={lado === 'marca' ? 'Escreva para a organização…' : 'Escreva para a marca…'}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={tecla}
          />
          <button className="og-btn" type="submit" disabled={enviando || !texto.trim()}>
            {enviando ? 'Enviando…' : 'Enviar'}
          </button>
          {erroEnvio && <p className="ui-nota ui-nota--erro" role="alert">{erroEnvio} O texto continua no campo.</p>}
        </form>
      ) : (
        <p className="ui-nota">{semPermissao || 'Sua função só lê as mensagens.'}</p>
      )}
    </div>
  )
}
