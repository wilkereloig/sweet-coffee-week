import React from 'react'
import { agruparPorDia, dataHoraExtensa } from '../lib/central'
import { traduzirErro, Carregando, Erro, Vazio } from './ui'

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
  const noFim = React.useRef(true) // a pessoa está no fim da conversa (ou ainda não rolou)
  const ultimoId = React.useRef(null)

  // Mensagem que chega sozinha (outra pessoa, outra aba, reconexão) não arrasta quem está relendo o começo da conversa;
  // a própria mensagem, a primeira carga e quem já está no fim seguem para o fim, como sempre.
  React.useEffect(() => {
    const ms = mensagens || []
    const ultima = ms[ms.length - 1]
    const primeira = ultimoId.current === null
    ultimoId.current = ultima ? ultima.id : ''
    if (fimRef.current && (primeira || noFim.current || (ultima && ultima.de === lado))) fimRef.current.scrollIntoView({ block: 'end' })
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
      {/* role="log": leitor de tela anuncia só o que CHEGA, não o histórico inteiro. */}
      <div className="ui-conversa__rolo" role="log" aria-label="Mensagens"
        onScroll={(e) => { const el = e.currentTarget; noFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}>
        {carregando && !(mensagens && mensagens.length) && <Carregando linhas={3} texto="Carregando a conversa…" />}
        {erro && <Erro titulo="Não consegui carregar a conversa" texto={erro} onTentar={onTentar} />}
        {!carregando && !erro && grupos.length === 0 && (
          <Vazio titulo="Nenhuma mensagem ainda">
            {lado === 'marca' ? 'Escreva para a organização quando precisar.' : 'Escreva a primeira mensagem para a marca.'}
          </Vazio>
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
