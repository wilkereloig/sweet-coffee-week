import React from 'react'
import { api } from '../../lib/marcaApi'
import { VistaCabeca } from '../VistaCabeca'
import { Conversa } from '../Conversa'

/*
 * Mensagens (marca) — a conversa com a organização. A marca lê pela própria
 * RLS (só as suas) e escreve pela RPC `marca_enviar_mensagem`, que resolve a
 * marca pela sessão: a tela nunca diz de quem é a mensagem.
 */
export function Mensagens({ aoMudarMensagens }) {
  const [msgs, setMsgs] = React.useState([])
  const [carregando, setCarregando] = React.useState(true)
  const [erro, setErro] = React.useState(null)
  const avisarRef = React.useRef(aoMudarMensagens)
  avisarRef.current = aoMudarMensagens

  const carregar = React.useCallback(async () => {
    try {
      const l = await api('mensagens?select=id,de,corpo,criada_em,lida_em&order=criada_em.asc')
      setMsgs(l || [])
      setErro(null)
      // Abrir a conversa é ler o que a organização mandou.
      if ((l || []).some((m) => m.de === 'organizacao' && !m.lida_em)) {
        await api('rpc/marca_ler_mensagens', { metodo: 'POST', corpo: {} })
        if (avisarRef.current) avisarRef.current()
      }
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  React.useEffect(() => {
    carregar()
    const t = setInterval(() => { if (document.visibilityState === 'visible') carregar() }, 20000)
    return () => clearInterval(t)
  }, [carregar])

  async function enviar(corpo) {
    await api('rpc/marca_enviar_mensagem', { metodo: 'POST', corpo: { p_corpo: corpo } })
    await carregar()
  }

  return (
    <section className="ui-vista-marca">
      <VistaCabeca
        acento="roxo" icone="mensagens" titulo="Mensagens" nota="Fale com a organização por aqui. A resposta chega como aviso."
      />
      <Conversa mensagens={msgs} lado="marca" carregando={carregando} erro={erro} onTentar={carregar} onEnviar={enviar} />
    </section>
  )
}
