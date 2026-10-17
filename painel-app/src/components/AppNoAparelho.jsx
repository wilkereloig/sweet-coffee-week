import React from 'react'
import { avisoSuportado, assinaturaDoAparelho, ligarAvisos, instalado } from '../lib/push'
import { estadoAtual, ouvirInstalacao, pedirInstalacao, conviteAdiado, adiarConvite, plataforma, etapaDoConvite } from '../lib/instalar'
import { pendencias } from '../lib/pendencias'
import { AvisosAparelho } from './AvisosAparelho'
import { VerificarAtualizacao, monitorDoPainel } from './Conexao'
import { Icone } from './Icone'
import { Botao, Secao, traduzirErro } from './ui'
import { rpc } from '../lib/rpc'
import { CHAVE_SESSAO } from '../../../src/lib/adminAccess'

/*
 * O painel como app neste aparelho: instalar e ligar avisos. Três peças, uma
 * mecânica só (lib/instalar.js + lib/push.js + <AvisosAparelho>):
 *   <InstalarApp>               — o estado da instalação e a ação certa para ele;
 *   <ConviteAparelho>           — o diálogo depois do login (18/10/2026): instalar,
 *                                 depois notificações; "Agora não" adia 7 dias
 *                                 por conta e aparelho. Substituiu o cartão solto
 *                                 da Mesa e do Início;
 *   <AplicativoENotificacoes>   — a seção de Meu perfil / Sua conta.
 * Nada aqui pede permissão ou abre o pedido de instalação sem um toque.
 */
// Avisos da organização: por RPC (a senha compartilhada ou a sessão nominal).
const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''
const semFuncao = (e) => /Could not find the function|does not exist|PGRST202/i.test(String(e && e.message))
export const PUSH_ORGANIZACAO = {
  registrar: (a) => rpc('registrar_push_organizacao', { p_secret: lerSenha(), p_endpoint: a.endpoint, p_p256dh: a.p256dh, p_auth: a.auth, p_user_agent: a.userAgent }),
  remover: (endpoint) => rpc('remover_push_organizacao', { p_secret: lerSenha(), p_endpoint: endpoint }),
  // O servidor confirma que ESTE endpoint é desta conta (não basta o navegador ter assinatura).
  conferir: (endpoint) => rpc('push_aparelho', { p_secret: lerSenha(), p_endpoint: endpoint }).then((r) => !!(r && r.registrado)).catch((e) => { if (semFuncao(e)) return true; throw e }),
  estado: (endpoint) => rpc('push_aparelho', { p_secret: lerSenha(), p_endpoint: endpoint }),
  preferir: (endpoint, ligado) => rpc('push_aparelho', { p_secret: lerSenha(), p_endpoint: endpoint, p_avisar_versao: ligado }),
}

const BENEFICIO = 'Abre direto no painel, em tela cheia, e recebe avisos mesmo com ele fechado.'

function useInstalacao() {
  const [estado, setEstado] = React.useState(estadoAtual)
  React.useEffect(() => ouvirInstalacao(() => setEstado(estadoAtual())), [])
  return estado
}

export function InstalarApp({ compacto = false }) {
  const estado = useInstalacao()
  const [aviso, setAviso] = React.useState(null)

  async function instalar() {
    setAviso(null)
    const aceitou = await pedirInstalacao()
    setAviso(aceitou ? 'Instalando. O ícone do Painel SCW aparece na tela inicial.' : 'Instalação cancelada. Dá para instalar depois em Meu perfil › Aplicativo e notificações.')
  }

  if (estado === 'instalado') {
    if (compacto) return null
    return (
      <p className="ui-estado-linha">
        <span className="ui-ponto" data-tom="ok" aria-hidden="true" />
        <b>Aberto como app neste aparelho</b>
      </p>
    )
  }
  return (
    <div className="ui-instalar">
      {!compacto && <p className="ui-nota">{BENEFICIO}</p>}
      {estado === 'pronto' && <button className="og-btn og-btn--mini" type="button" onClick={instalar}>Instalar o painel</button>}
      {estado === 'ios' && (
        <p className="ui-nota">No iPhone e no iPad: no Safari, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>. Abra o painel pelo ícone novo. Só assim os avisos funcionam no iPhone.</p>
      )}
      {estado === 'manual' && !compacto && (
        <p className="ui-nota">Aberto no navegador. Se o Painel SCW já está na sua tela inicial, abra por lá. Para instalar: procure <b>Instalar app</b> ou <b>Adicionar à tela inicial</b> no menu do navegador. O painel também funciona direto pelo navegador.</p>
      )}
      {aviso && <p className="ui-nota" role="status">{aviso}</p>}
    </div>
  )
}

/* "Ver as instruções de novo" (Meu perfil) abre o mesmo diálogo, sem esperar os 7 dias. */
const reabrir = new Set()
export const abrirConviteAparelho = () => reabrir.forEach((f) => f())

// Uma vez por sessão e por conta: trocar de página não reabre.
const chaveSessao = (papel, conta) => 'scw_convite_visto_' + papel + '_' + conta
const jaMostrado = (papel, conta) => { try { return sessionStorage.getItem(chaveSessao(papel, conta)) === '1' } catch { return false } }
const marcarMostrado = (papel, conta) => { try { sessionStorage.setItem(chaveSessao(papel, conta), '1') } catch { /* segue */ } }

/* Outra coisa na frente? Diálogo, folha, tour, aviso de atualização, edição ou envio. */
function telaOcupada() {
  if (document.querySelector('[role="dialog"][aria-modal="true"], dialog[open], .og-detalhe, .ui-tour__balao')) return true
  if (pendencias().length) return true
  const a = document.activeElement
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true
  const m = monitorDoPainel()
  return !!(m && m.estado.disponivel && !m.estado.adiada) // a atualização vem antes do convite
}

async function lerAvisos(push) {
  if (!avisoSuportado()) return { suportado: false }
  const negado = Notification.permission === 'denied'
  const a = await assinaturaDoAparelho()
  let registrado = false
  if (a) registrado = push && push.conferir ? await push.conferir(a.endpoint).catch(() => true) : true
  return { suportado: true, registrado, negado }
}

const COMO_LIBERAR = (p, app) => p.ios ? 'Ajustes do iPhone › Notificações › Painel SCW › Permitir Notificações.'
  : p.android && app ? 'Configurações do aparelho › Apps › Painel SCW › Notificações › Permitir.'
  : p.android ? 'Toque no cadeado ao lado do endereço › Permissões › Notificações › Permitir.'
  : 'Clique no cadeado ao lado do endereço do site › Notificações › Permitir. Depois, recarregue o painel.'

/**
 * O convite depois do login. `liberado`: a casca diz quando pode (sem tour aberto,
 * conta carregada). Nunca sobre outro diálogo, nunca durante edição ou envio.
 */
export function ConviteAparelho({ papel, conta, push, liberado = true }) {
  const dialogo = React.useRef(null)
  const origem = React.useRef(null)
  const [etapa, setEtapa] = React.useState(null) // 'instalar' | 'notificacoes' | 'pronto'
  const [comoInstalar, setComoInstalar] = React.useState(false)
  const [msg, setMsg] = React.useState(null) // { tom, texto }
  const [ocupado, setOcupado] = React.useState(false)
  const [avisos, setAvisos] = React.useState(null)
  const instalacao = useInstalacao()
  const p = plataforma()
  const app = instalado()

  const abrir = React.useCallback(async ({ forcado = false } = {}) => {
    const av = await lerAvisos(push)
    setAvisos(av)
    const e = etapaDoConvite({ standalone: instalado(), instalacao: estadoAtual(), movel: plataforma().movel, avisos: av })
    if (!e && !forcado) return false
    setMsg(null); setComoInstalar(false)
    setEtapa(e || 'pronto')
    return true
  }, [push])

  // Primeira abertura elegível: 2,5 s depois de a casca liberar; se a tela estiver ocupada, tenta mais umas vezes e desiste.
  React.useEffect(() => {
    if (!conta || !liberado || conviteAdiado(papel, conta) || jaMostrado(papel, conta)) return undefined
    let vivo = true
    let n = 0
    let t = null
    const tentar = async () => {
      if (!vivo) return
      if (telaOcupada()) { if (++n < 8) t = setTimeout(tentar, 15000); return }
      if (await abrir() && vivo) marcarMostrado(papel, conta)
    }
    t = setTimeout(tentar, 2500)
    return () => { vivo = false; clearTimeout(t) }
  }, [conta, liberado, papel, abrir])

  React.useEffect(() => {
    const f = () => abrir({ forcado: true })
    reabrir.add(f)
    return () => reabrir.delete(f)
  }, [abrir])

  React.useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (etapa && !d.open) { origem.current = document.activeElement; d.showModal() }
    if (!etapa && d.open) d.close()
  }, [etapa])

  function fechar({ adiar = true } = {}) {
    if (adiar && etapa !== 'pronto') adiarConvite(papel, conta)
    setEtapa(null)
    const o = origem.current
    setTimeout(() => { if (o && typeof o.focus === 'function' && document.contains(o)) o.focus() }, 0)
  }

  async function instalar() {
    setMsg(null)
    const aceitou = await pedirInstalacao()
    if (!aceitou) { setMsg({ tom: '', texto: 'Instalação cancelada. Quando quiser, está em Meu perfil › Aplicativo e notificações.' }); return }
    const av = await lerAvisos(push)
    setAvisos(av)
    if (av.suportado && !av.registrado) { setEtapa('notificacoes'); setMsg({ tom: 'ok', texto: 'Instalando. Enquanto isso, você já pode ativar as notificações.' }) }
    else { setEtapa('pronto'); setMsg({ tom: 'ok', texto: 'Instalando. Quando terminar, abra pelo ícone Painel SCW.' }) }
  }

  async function ativar() {
    if (!avisoSuportado()) { setMsg({ tom: 'erro', texto: p.ios && !app ? 'No iPhone, as notificações só funcionam com o painel aberto pelo ícone da Tela de Início.' : 'Este navegador não recebe notificações.' }); return }
    if (Notification.permission === 'denied') { setAvisos((a) => ({ ...a, negado: true })); return }
    setOcupado(true)
    setMsg({ tom: '', texto: 'Esperando sua resposta ao pedido do aparelho…' })
    try {
      await ligarAvisos(push.registrar) // grava no servidor antes de resolver
      const a = await assinaturaDoAparelho()
      const ok = !!a && (push.conferir ? await push.conferir(a.endpoint) : true)
      if (!ok) throw new Error('nao_confirmado')
      setEtapa('pronto')
      setMsg({ tom: 'ok', texto: 'Notificações ativadas neste aparelho. Em outro celular ou computador, ative em cada um.' })
    } catch (e) {
      const m = e && e.message
      if (m === 'bloqueado') { setAvisos((x) => ({ ...x, negado: true })); setMsg(null) }
      else setMsg({ tom: 'erro', texto: m === 'sem_resposta' ? 'O pedido foi fechado sem resposta. Toque em “Ativar notificações” de novo.'
        : m === 'nao_confirmado' ? 'O aparelho aceitou, mas o servidor não confirmou o registro. Tente de novo.'
        : 'Não consegui registrar este aparelho: ' + traduzirErro(m) })
    } finally { setOcupado(false) }
  }

  const movel = p.movel
  const negado = !!(avisos && avisos.negado)
  let titulo = ''
  let corpo = null
  let principal = null
  if (etapa === 'instalar') {
    titulo = movel ? 'Tenha o Painel SCW no seu celular' : 'Tenha o Painel SCW neste computador'
    corpo = (
      <>
        <p>Adicione o painel à tela inicial para abrir pelo ícone, como um aplicativo. Depois, você pode ativar as notificações para acompanhar as novidades.</p>
        {comoInstalar && (p.ios ? (
          <ol className="cv-passos">
            {!p.safari && <li><Icone nome="seta-direita" tamanho={20} /><span>Abra este endereço no <b>Safari</b> (no Chrome do iPhone não dá).</span></li>}
            <li><Icone nome="compartilhar" tamanho={20} /><span>Toque em <b>Compartilhar</b> (o quadrado com a seta, embaixo ou no topo).</span></li>
            <li><Icone nome="mais" tamanho={20} /><span>Escolha <b>Adicionar à Tela de Início</b>.</span></li>
            <li><Icone nome="feito" tamanho={20} /><span>Confirme em <b>Adicionar</b> e abra pelo novo ícone <b>Painel SCW</b>.</span></li>
          </ol>
        ) : (
          <ol className="cv-passos">
            <li><Icone nome="mais" tamanho={20} /><span>Abra o menu do navegador (⋮ ou ⋯).</span></li>
            <li><Icone nome="baixar" tamanho={20} /><span>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</span></li>
            <li><Icone nome="feito" tamanho={20} /><span>Abra pelo novo ícone <b>Painel SCW</b>.</span></li>
          </ol>
        ))}
        <p className="cv-nota">Já instalou? Abra pelo ícone “Painel SCW” — este convite aparece porque o painel está aberto no navegador. Sem instalar, tudo funciona pelo navegador também.</p>
      </>
    )
    principal = instalacao === 'pronto'
      ? <Botao variante="destaque" icone="baixar" onClick={instalar}>Instalar painel</Botao>
      : !comoInstalar
        ? <Botao variante="destaque" icone="informacao" onClick={() => setComoInstalar(true)}>Ver como instalar</Botao>
        : <Botao variante="destaque" icone="feito" onClick={() => fechar({ adiar: false })}>Entendi</Botao>
  } else if (etapa === 'notificacoes') {
    titulo = 'Ative as notificações do painel'
    corpo = negado ? (
      <>
        <p>As notificações estão <b>bloqueadas</b> para o painel neste aparelho, e o painel não pode pedir de novo.</p>
        <p>Para liberar: {COMO_LIBERAR(p, app)}</p>
      </>
    ) : (
      <p>Receba avisos sobre mensagens, tarefas e novidades da sua conta, incluindo atualizações do painel.</p>
    )
    principal = negado
      ? <Botao variante="destaque" icone="feito" onClick={() => fechar()}>Entendi</Botao>
      : <Botao variante="destaque" icone="sino" disabled={ocupado} onClick={ativar}>{ocupado ? 'Ativando…' : 'Ativar notificações'}</Botao>
  } else if (etapa === 'pronto') {
    titulo = 'Painel SCW neste aparelho'
    corpo = (
      <p>{app ? 'Aberto como aplicativo.' : 'Aberto no navegador.'} {avisos && avisos.registrado ? 'Notificações ativas neste aparelho.' : avisos && !avisos.suportado ? 'Este navegador não recebe notificações.' : ''}</p>
    )
    principal = <Botao variante="destaque" onClick={() => fechar({ adiar: false })}>Fechar</Botao>
  }

  return (
    <dialog ref={dialogo} className="cv" aria-labelledby="cv-titulo" onCancel={(e) => { e.preventDefault(); fechar() }}>
      {etapa && (
        <div className="cv__caixa">
          <button type="button" className="cv__fechar" aria-label="Fechar" onClick={() => fechar()}><Icone nome="fechar" tamanho={20} /></button>
          <img className="cv__marca" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" width="56" height="56" />
          <h2 id="cv-titulo" className="cv__titulo" tabIndex={-1}>{titulo}</h2>
          <div className="cv__corpo">{corpo}</div>
          {msg && <p className={'ui-nota' + (msg.tom === 'erro' ? ' ui-nota--erro' : msg.tom === 'ok' ? ' ui-nota--ok' : '')} role={msg.tom === 'erro' ? 'alert' : 'status'}>{msg.texto}</p>}
          <div className="cv__acoes">
            {principal}
            {etapa !== 'pronto' && !(etapa === 'notificacoes' && negado) && <button type="button" className="ui-link cv__depois" onClick={() => fechar()}>Agora não</button>}
          </div>
        </div>
      )}
    </dialog>
  )
}

/** Avisar quando houver versão nova — preferência DESTE aparelho, no servidor. */
function PreferenciaVersao({ push }) {
  const [estado, setEstado] = React.useState(null) // { endpoint, ligado } | null
  const [erro, setErro] = React.useState(null)
  React.useEffect(() => {
    if (!push || !push.estado || !avisoSuportado()) return
    let vivo = true
    assinaturaDoAparelho().then(async (a) => {
      if (!a) return
      const r = await push.estado(a.endpoint).catch(() => null)
      if (vivo && r && r.registrado) setEstado({ endpoint: a.endpoint, ligado: r.avisar_versao !== false })
    })
    return () => { vivo = false }
  }, [push])
  if (!estado) return null
  async function mudar(ligado) {
    setErro(null)
    try { const r = await push.preferir(estado.endpoint, ligado); setEstado({ ...estado, ligado: !!(r && r.avisar_versao) }) }
    catch (e) { setErro('Não consegui mudar agora: ' + traduzirErro(e && e.message)) }
  }
  return (
    <div>
      <label className="og-campo og-campo--linha">
        <input type="checkbox" checked={estado.ligado} onChange={(e) => mudar(e.target.checked)} />
        <span>Avisar neste aparelho quando houver versão nova do painel</span>
      </label>
      {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
    </div>
  )
}

/** Meu perfil / Sua conta › "Aplicativo e notificações". */
export function AplicativoENotificacoes({ push, explicacao }) {
  return (
    <Secao titulo="Aplicativo e notificações" nota="Vale para ESTE aparelho: em outro celular ou computador, confira lá.">
      <div className="ui-pilha">
        <InstalarApp />
        {push && <AvisosAparelho explicacao={explicacao} {...push} />}
        {push && <PreferenciaVersao push={push} />}
        <div className="ui-linha-acoes">
          <Botao variante="secundario" icone="informacao" onClick={abrirConviteAparelho}>Ver as instruções de novo</Botao>
        </div>
        <VerificarAtualizacao />
      </div>
    </Secao>
  )
}
