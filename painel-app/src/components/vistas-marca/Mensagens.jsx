import React from 'react'
import { api } from '../../lib/marcaApi'
import { VistaCabeca } from '../VistaCabeca'
import { Conversa } from '../Conversa'
import { Icone } from '../Icone'
import { useSincronizar, useGuarda } from '../../lib/sync/react'
import { idsParaMarcarLidas } from '../../lib/sincMarca'

/*
 * Mensagens (marca) — a conversa com a organização. A marca lê pela própria
 * RLS (só as suas) e escreve pela RPC `marca_enviar_mensagem`, que resolve a
 * marca pela sessão: a tela nunca diz de quem é a mensagem.
 */
export function Mensagens({ aoMudarMensagens, voltar }) {
  const [msgs, setMsgs] = React.useState([])
  const [carregando, setCarregando] = React.useState(true)
  const [erro, setErro] = React.useState(null)
  const avisarRef = React.useRef(aoMudarMensagens)
  avisarRef.current = aoMudarMensagens
  const guarda = useGuarda()
  const temDados = React.useRef(false)
  const tentadas = React.useRef(new Set())    // mensagens que esta tela já mandou marcar como lidas
  const faltaLer = React.useRef(false)        // chegou mensagem com a aba escondida: ler quando ela voltar

  // Releitura silenciosa: a lista é trocada de uma vez (o campo de resposta não é tocado) e, se a leitura
  // falha, a conversa que já estava na tela continua — só o indicador de sincronização mostra a falha.
  const carregar = React.useCallback(async () => {
    const vale = guarda()
    let l
    try {
      l = (await api('mensagens?select=id,de,corpo,criada_em,lida_em&order=criada_em.asc')) || []
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      if (!vale()) return
      if (!temDados.current) setErro(e.message)
      setCarregando(false)
      throw e
    }
    if (!vale()) return
    setMsgs(l)
    setErro(null)
    setCarregando(false)
    temDados.current = true
    // Abrir a conversa é ler o que a organização mandou — com a aba à vista, como era no relógio de 20 s.
    // `tentadas` garante que isto nunca vira laço (marcar → anunciar → reler → marcar).
    const novas = idsParaMarcarLidas(l, tentadas.current)
    if (!novas.length) { faltaLer.current = false; return }
    if (document.visibilityState === 'hidden') { faltaLer.current = true; return }
    faltaLer.current = false
    novas.forEach((id) => tentadas.current.add(id))
    try {
      await api('rpc/marca_ler_mensagens', { metodo: 'POST', corpo: {} })
    } catch (e) {
      novas.forEach((id) => tentadas.current.delete(id))   // tenta de novo na próxima leitura
      if (e && e.message === 'sessao_expirada') return
      throw e                                               // a lista segue na tela
    }
    if (avisarRef.current) avisarRef.current()
  }, [guarda])

  React.useEffect(() => { carregar().catch(() => {}) }, [carregar])
  useSincronizar(['mensagens'], carregar)
  // Não é releitura de dado: só marca como lido o que chegou enquanto a aba estava escondida.
  React.useEffect(() => {
    const volta = () => { if (document.visibilityState === 'visible' && faltaLer.current) carregar().catch(() => {}) }
    document.addEventListener('visibilitychange', volta)
    return () => document.removeEventListener('visibilitychange', volta)
  }, [carregar])

  async function enviar(corpo) {
    await api('rpc/marca_enviar_mensagem', { metodo: 'POST', corpo: { p_corpo: corpo } })
    // A mensagem já foi enviada: releitura que falhar aqui não pode virar "falha ao enviar" (o texto voltaria ao campo).
    await carregar().catch(() => {})
  }

  return (
    <section className="ui-vista-marca">
      {voltar && <button type="button" className="og-link fm-voltar" onClick={voltar}><Icone nome="voltar" tamanho={16} /> Voltar</button>}
      <VistaCabeca
        acento="roxo" icone="mensagens" titulo="Mensagens" nota="Fale com a organização por aqui. A resposta chega como aviso."
      />
      <Conversa mensagens={msgs} lado="marca" carregando={carregando} erro={erro} onTentar={() => carregar().catch(() => {})} onEnviar={enviar} />
    </section>
  )
}
