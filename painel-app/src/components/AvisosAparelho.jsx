import React from 'react'
import { avisoSuportado, assinaturaDoAparelho, ligarAvisos, desligarAvisos, ehIOS, instalado } from '../lib/push'
import { traduzirErro } from './ui'

/*
 * "Avisos neste aparelho" — o mesmo bloco nos dois painéis. A permissão só é
 * pedida a partir deste botão, nunca ao abrir o painel (pedido sem contexto
 * vira "bloquear" por reflexo, e aí o site não consegue pedir de novo).
 *
 * `compacto`: versão de convite (uma linha e um botão), usada no Hoje da
 * marca e na mesa da organização para sugerir no momento em que faz sentido.
 */
const ONDE_ESTA_O_AVISO =
  'Se nada apareceu, o navegador pode ter recolhido o pedido: procure o ícone ' +
  'de sino ou de cadeado na barra de endereço e responda por lá.'

export function AvisosAparelho({ registrar, remover, testar, explicacao, compacto = false, onMudou }) {
  const [assinatura, setAssinatura] = React.useState(null)
  const [negado, setNegado] = React.useState(false)
  const [aviso, setAviso] = React.useState(null)
  const [ocupado, setOcupado] = React.useState(false)
  const suportado = avisoSuportado()

  const atualizar = React.useCallback(async () => {
    if (!avisoSuportado()) return
    setNegado(Notification.permission === 'denied')
    setAssinatura(await assinaturaDoAparelho())
  }, [])
  React.useEffect(() => { atualizar() }, [atualizar])

  async function ligar() {
    setOcupado(true)
    setAviso({ tom: '', texto: 'Pedindo permissão… ' + ONDE_ESTA_O_AVISO })
    // O navegador pode recolher o pedido num ícone da barra de endereço; depois
    // de 8s o recado muda para a pessoa saber onde procurar.
    const lembrete = setTimeout(() => setAviso({ tom: '', texto: 'Ainda esperando sua resposta. ' + ONDE_ESTA_O_AVISO }), 8000)
    // Resposta tardia não se perde: quando a permissão muda, a tela se redesenha.
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'notifications' })
        .then((p) => { p.onchange = () => atualizar() })
        .catch(() => { /* navegador sem a API: o caminho normal segue */ })
    }
    try {
      // `registrar` grava no banco ANTES de ligarAvisos resolver — só então a
      // tela afirma que ligou.
      await ligarAvisos(registrar)
      clearTimeout(lembrete)
      await atualizar()
      setAviso({ tom: 'ok', texto: 'Avisos ligados neste aparelho.' })
      if (onMudou) onMudou(true)
    } catch (e) {
      clearTimeout(lembrete)
      const m = e && e.message
      setAviso({
        tom: 'erro',
        texto: m === 'bloqueado'
          ? 'O navegador está bloqueando avisos deste site. Libere nas configurações do navegador (ícone de cadeado ao lado do endereço) e tente de novo.'
          : m === 'sem_resposta' ? 'Você fechou o pedido sem responder. Toque em "Ligar avisos" de novo.'
          : 'Não consegui ligar: ' + traduzirErro(m),
      })
      await atualizar()
    } finally {
      setOcupado(false)
    }
  }

  async function desligar() {
    setOcupado(true)
    try {
      await desligarAvisos(remover)
      await atualizar()
      setAviso({ tom: 'ok', texto: 'Avisos desligados neste aparelho.' })
      if (onMudou) onMudou(false)
    } catch (e) {
      setAviso({ tom: 'erro', texto: 'Não consegui desligar: ' + traduzirErro(e && e.message) })
    } finally {
      setOcupado(false)
    }
  }

  async function enviarTeste() {
    setAviso({ tom: '', texto: 'Enviando…' })
    try {
      const n = await testar()
      setAviso({ tom: n ? 'ok' : 'erro', texto: n ? 'Enviado para ' + n + (n === 1 ? ' aparelho.' : ' aparelhos.') : 'A função respondeu, mas nenhum aparelho recebeu.' })
    } catch (e) {
      setAviso({ tom: 'erro', texto: 'Falhou: ' + traduzirErro(e && e.message) })
    }
  }

  if (compacto) {
    if (!suportado || assinatura || negado) return null
    return (
      <div className="ui-convite">
        <p>{explicacao}</p>
        <button className="og-btn og-btn--mini" type="button" disabled={ocupado} onClick={ligar}>Ligar avisos</button>
        {aviso && aviso.tom === 'erro' && <p className="ui-nota ui-nota--erro" role="alert">{aviso.texto}</p>}
      </div>
    )
  }

  if (!suportado) {
    return (
      <p className="ui-nota">
        {ehIOS() && !instalado()
          ? <>No iPhone e no iPad os avisos só funcionam com o painel instalado: toque em <b>Compartilhar</b> no Safari → <b>Adicionar à Tela de Início</b>, abra pelo ícone e volte aqui.</>
          : 'Este navegador não recebe avisos. Tente pelo Chrome, Edge, Firefox ou Safari atualizados.'}
      </p>
    )
  }

  return (
    <div className="ui-avisos-aparelho">
      <p className="ui-estado-linha">
        <span className="ui-ponto" data-tom={assinatura ? 'ok' : (negado ? 'erro' : 'neutro')} aria-hidden="true" />
        <b>{assinatura ? 'Ligados neste aparelho' : (negado ? 'Bloqueados no navegador' : 'Desligados neste aparelho')}</b>
      </p>
      <p className="ui-nota">
        {assinatura ? 'Este aparelho recebe aviso mesmo com o painel fechado.'
          : negado ? 'A permissão foi negada. Libere nas configurações do navegador para este site — o painel não consegue pedir de novo.'
          : explicacao}
      </p>
      {aviso && <p className={'ui-nota' + (aviso.tom === 'erro' ? ' ui-nota--erro' : aviso.tom === 'ok' ? ' ui-nota--ok' : '')} role="status">{aviso.texto}</p>}
      <div className="ui-linha-acoes">
        {assinatura && <button className="og-btn og-btn--vazado og-btn--mini" type="button" disabled={ocupado} onClick={desligar}>Desligar</button>}
        {assinatura && testar && <button className="og-btn og-btn--vazado og-btn--mini" type="button" onClick={enviarTeste}>Enviar um teste</button>}
        {!assinatura && !negado && <button className="og-btn og-btn--mini" type="button" disabled={ocupado} onClick={ligar}>Ligar avisos</button>}
      </div>
    </div>
  )
}
