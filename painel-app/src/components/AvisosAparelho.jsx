import React from 'react'
import { avisoSuportado, assinaturaDoAparelho, ligarAvisos, desligarAvisos, ehIOS, instalado } from '../lib/push'
import { COMO_LIBERAR, plataforma } from '../lib/instalar'
import { traduzirErro, Botao } from './ui'

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
const textoBloqueado = () => 'As notificações estão bloqueadas, e o painel não pode pedir de novo. Para liberar: ' + COMO_LIBERAR(plataforma(), instalado())

export function AvisosAparelho({ registrar, remover, conferir, testar, explicacao, compacto = false, onMudou }) {
  const [assinatura, setAssinatura] = React.useState(null)
  // Assinatura do navegador que o banco não reconhece como desta conta (outra
  // marca ou a organização usou este aparelho): não é "ligados".
  const [deOutraConta, setDeOutraConta] = React.useState(false)
  // Em ref: quem chama costuma passar função nova a cada render, e ela não
  // pode reiniciar a leitura (seria um laço de efeito).
  const conferirRef = React.useRef(conferir)
  conferirRef.current = conferir
  const [negado, setNegado] = React.useState(false)
  const [aviso, setAviso] = React.useState(null)
  const [ocupado, setOcupado] = React.useState(false)
  const suportado = avisoSuportado()

  const atualizar = React.useCallback(async () => {
    if (!avisoSuportado()) return
    setNegado(Notification.permission === 'denied')
    let a = await assinaturaDoAparelho()
    let outra = false
    // Falha ao conferir (rede) não desliga nada: fica o que o navegador diz.
    if (a && conferirRef.current) outra = !(await conferirRef.current(a.endpoint).catch(() => true))
    if (outra) a = null
    setDeOutraConta(outra)
    setAssinatura(a)
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
      // Bloqueado: a linha de estado logo acima já diz como liberar; repetir a frase em vermelho seria lê-la duas vezes.
      if (m === 'bloqueado') setAviso(null)
      else {
        setAviso({
          tom: 'erro',
          texto: m === 'sem_resposta' ? 'Você fechou o pedido sem responder. Toque em "Ligar avisos" de novo.'
            : 'Não consegui ligar: ' + traduzirErro(m),
        })
      }
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
        <Botao icone="sino" disabled={ocupado} onClick={ligar}>Ligar avisos</Botao>
        {aviso && <p className={'ui-nota' + (aviso.tom === 'erro' ? ' ui-nota--erro' : '')} role={aviso.tom === 'erro' ? 'alert' : 'status'}>{aviso.texto}</p>}
      </div>
    )
  }

  // Sem suporte também tem linha de estado: quem abre o sino sabe na hora se recebe ou não.
  if (!suportado) {
    const ios = ehIOS()
    const app = instalado()
    // iOS abaixo de 16.4: instalar não adianta, então não manda instalar — manda atualizar.
    const antigo = plataforma().iosAntigo
    return (
      <div className="ui-avisos-aparelho">
        <p className="ui-estado-linha">
          <span className="ui-ponto" data-tom="neutro" aria-hidden="true" />
          <b>{ios && !app && !antigo ? 'Desligados neste aparelho' : 'Indisponíveis neste aparelho'}</b>
        </p>
        <p className="ui-nota">
          {antigo ? 'Atualize o iPhone para iOS 16.4 ou mais novo para receber avisos. Com a versão atual, nem instalando o painel eles funcionam.'
            : ios && !app
            ? <>No iPhone e no iPad os avisos só funcionam com o painel instalado: toque em <b>Compartilhar</b> no Safari → <b>Adicionar à Tela de Início</b>, abra pelo ícone e volte aqui.</>
            : ios ? 'Atualize o iPhone para iOS 16.4 ou mais novo para receber avisos.'
            : 'Este navegador não recebe avisos. Tente pelo Chrome, Edge, Firefox ou Safari atualizados.'}
        </p>
      </div>
    )
  }

  return (
    <div className="ui-avisos-aparelho">
      <p className="ui-estado-linha">
        <span className="ui-ponto" data-tom={assinatura ? 'ok' : (negado ? 'erro' : 'neutro')} aria-hidden="true" />
        <b>{assinatura ? 'Ligados neste aparelho' : (negado ? 'Bloqueados neste aparelho' : 'Desligados neste aparelho')}</b>
      </p>
      <p className="ui-nota">
        {assinatura ? 'Este aparelho recebe aviso mesmo com o painel fechado.'
          : negado ? textoBloqueado()
          // Linha de outra conta OU desativada pelo servidor (conferir só vê a ativa): nos dois casos, ligar resolve.
          : deOutraConta ? 'Este aparelho não está recebendo os avisos desta conta. Toque em "Ligar avisos" para voltar a receber.'
          : Notification.permission === 'granted' ? 'O navegador já permite avisos, mas este aparelho ainda não está registrado. Toque em "Ligar avisos".'
          : explicacao}
      </p>
      {aviso && <p className={'ui-nota' + (aviso.tom === 'erro' ? ' ui-nota--erro' : aviso.tom === 'ok' ? ' ui-nota--ok' : '')} role={aviso.tom === 'erro' ? 'alert' : 'status'}>{aviso.texto}</p>}
      <div className="ui-linha-acoes">
        {assinatura && <button className="og-btn og-btn--vazado og-btn--mini" type="button" disabled={ocupado} onClick={desligar}>Desligar</button>}
        {assinatura && testar && <Botao icone="enviar" variante="secundario" onClick={enviarTeste}>Enviar um teste</Botao>}
        {!assinatura && !negado && <Botao icone="sino" disabled={ocupado} onClick={ligar}>Ligar avisos</Botao>}
      </div>
    </div>
  )
}
