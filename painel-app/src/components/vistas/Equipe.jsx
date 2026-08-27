import React from 'react'
import { rpc, chamarFuncao } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { bytesDaChave, VAPID_PUBLICA } from '../../lib/avisos'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { VistaCabeca } from '../VistaCabeca'
import { Folha } from '../Folha'
import { ICONE } from '../PainelShell'

/*
 * Vista Equipe — porta fiel de public/painel/index.html: edição aberta
 * (renderEquipe/salvarEdicao, ~2782/~3901), contas da organização
 * (abrirNovaConta/criarConta/abrirMudarConta, ~3914-3995) e avisos push
 * neste aparelho (bytesDaChave.../testarAviso, ~4103-4269).
 */

function lerSenha() {
  return sessionStorage.getItem(CHAVE_SESSAO) || ''
}

const ONDE_ESTA_O_AVISO =
  'Se nada apareceu, o navegador pode ter recolhido o pedido: procure o ícone ' +
  'de sino ou de cadeado na barra de endereço e responda por lá.'

// Três coisas separadas, e confundi-las é o que gera "liguei e não chega":
// suporte do navegador, permissão da pessoa, e assinatura registrada no banco.
function avisoSuportado() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function assinaturaDoAparelho() {
  if (!avisoSuportado()) return null
  try {
    const reg = await navigator.serviceWorker.ready
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

function FolhaNovaConta({ aberto, funcoes, onFechar, onCriada }) {
  const [email, setEmail] = React.useState('')
  const [funcao, setFuncao] = React.useState((funcoes[0] && funcoes[0].codigo) || '')
  const [erro, setErro] = React.useState(null)
  const [criando, setCriando] = React.useState(false)
  const [credenciais, setCredenciais] = React.useState(null)

  React.useEffect(() => {
    if (!aberto) return
    setEmail('')
    setErro(null)
    setCriando(false)
    setCredenciais(null)
    setFuncao((funcoes[0] && funcoes[0].codigo) || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  async function criar() {
    const valor = email.trim()
    if (!valor) { setErro('Informe o e-mail.'); return }
    setCriando(true)
    setErro(null)
    try {
      const r = await chamarFuncao('criar-conta-organizacao', { secret: lerSenha(), email: valor, funcao })
      setCredenciais(r)
      await onCriada()
    } catch (e) {
      setErro(e.message)
      setCriando(false)
    }
  }

  return (
    <Folha aberto={aberto} titulo="Criar conta" sub="Uma pessoa da equipe, com função" onFechar={onFechar}>
      <div className="og-bloco" style={{ borderTop: 0, paddingTop: 0 }}>
        <p className="og-forms__nota">
          Aqui o e-mail é o de verdade, diferente da marca, que entra pelo nome do
          estabelecimento. A senha aparece uma vez, para você entregar, e vale para um login só.
        </p>
        <label className="og-campo"><span>E-mail</span>
          <input type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="og-campo"><span>Função</span>
          <select value={funcao} onChange={(e) => setFuncao(e.target.value)}>
            {funcoes.map((f) => <option key={f.codigo} value={f.codigo}>{f.rotulo}</option>)}
          </select>
        </label>
        {erro && <div className="og-aviso" data-tom="erro">{erro}</div>}
        {credenciais && <div className="og-aviso" data-tom="ok">Conta criada.</div>}
        {credenciais && (
          // A senha aparece UMA vez. Não fica gravada em lugar nenhum — o banco
          // só tem o hash. Fechar esta folha sem copiar significa gerar outra.
          <div className="og-bloco">
            <h3>Entregue estes dados</h3>
            <p className="og-par"><b>Login:</b> {credenciais.login}</p>
            <p className="og-par"><b>Senha:</b> {credenciais.senha}</p>
            <p className="og-forms__nota">Ela vale para um login: no primeiro acesso a pessoa troca.</p>
          </div>
        )}
        <button className="og-btn" type="button" disabled={criando || !!credenciais} onClick={criar}>
          {criando ? 'Criando…' : 'Criar conta'}
        </button>
      </div>
    </Folha>
  )
}

function FolhaMudarConta({ aberto, conta, funcoes, onFechar, onSalvo }) {
  // Guarda a última conta não-nula: `conta` vira null no mesmo render em que
  // `aberto` vira false, e a folha ainda precisa de conteúdo pra animar a
  // saída (Folha.jsx mantém `children` montado durante o fechamento).
  const [c, setC] = React.useState(conta)
  const [funcao, setFuncao] = React.useState((conta && conta.funcao) || '')
  const [aviso, setAviso] = React.useState(null)
  const [salvando, setSalvando] = React.useState(false)
  const [suspendendo, setSuspendendo] = React.useState(false)

  React.useEffect(() => {
    if (!conta) return
    setC(conta)
    setFuncao(conta.funcao || '')
    setAviso(null)
  }, [conta])

  async function salvarFuncao() {
    setSalvando(true)
    try {
      await rpc('definir_funcao_conta', { p_secret: lerSenha(), p_user: c.user_id, p_funcao: funcao })
      setAviso({ texto: 'Função salva.', tom: 'ok' })
      await onSalvo()
    } catch (e) {
      setAviso({ texto: e.message, tom: 'erro' })
    } finally {
      setSalvando(false)
    }
  }

  async function alternarSuspensao() {
    setSuspendendo(true)
    try {
      await rpc('suspender_conta', { p_secret: lerSenha(), p_user: c.user_id, p_ativo: !c.ativo })
      setAviso({ texto: c.ativo ? 'Conta suspensa.' : 'Conta reativada.', tom: 'ok' })
      await onSalvo()
    } catch (e) {
      setAviso({ texto: e.message, tom: 'erro' })
    } finally {
      setSuspendendo(false)
    }
  }

  return (
    <Folha aberto={aberto} titulo={(c && c.email) || 'Conta'} sub={(c && c.rotulo) || ''} onFechar={onFechar}>
      {c && (
        <div className="og-bloco" style={{ borderTop: 0, paddingTop: 0 }}>
          <label className="og-campo"><span>Função</span>
            <select value={funcao} onChange={(e) => setFuncao(e.target.value)}>
              {funcoes.map((f) => <option key={f.codigo} value={f.codigo}>{f.rotulo}</option>)}
            </select>
          </label>
          {aviso && <div className="og-aviso" data-tom={aviso.tom}>{aviso.texto}</div>}
          <button className="og-btn" type="button" disabled={salvando} onClick={salvarFuncao}>Salvar função</button>{' '}
          <button className="og-btn og-btn--vazado" type="button" disabled={suspendendo} onClick={alternarSuspensao}>
            {c.ativo ? 'Suspender' : 'Reativar'}
          </button>
          <p className="og-forms__nota">
            O banco recusa tirar o último administrador: é a trava que impede o painel de
            ficar sem ninguém que possa criar conta.
          </p>
        </div>
      )}
    </Folha>
  )
}

export function Equipe({ registrarAtualizar }) {
  const [config, setConfig] = React.useState(null)
  const [contas, setContas] = React.useState([])
  const [erro, setErro] = React.useState(null)

  const [codigoEdicao, setCodigoEdicao] = React.useState('')
  const [avisoEdicao, setAvisoEdicao] = React.useState(null)
  const [salvandoEdicao, setSalvandoEdicao] = React.useState(false)

  const [folha, setFolha] = React.useState(null) // null | {tipo:'nova'} | {tipo:'mudar', conta}

  const [assinatura, setAssinatura] = React.useState(null)
  const [negado, setNegado] = React.useState(false)
  const [avisoPush, setAvisoPush] = React.useState(null)

  const carregar = React.useCallback(async () => {
    setErro(null)
    const senha = lerSenha()
    try {
      const [c, k] = await Promise.all([
        rpc('get_config_admin', { p_secret: senha }),
        rpc('get_contas_organizacao', { p_secret: senha }),
      ])
      setConfig(c || null)
      setContas(k || [])
    } catch (e) {
      setConfig(null)
      setContas([])
      setErro(e.message)
    }
  }, [])

  const atualizarStatusPush = React.useCallback(async () => {
    if (!avisoSuportado()) { setAssinatura(null); setNegado(false); return }
    setNegado(Notification.permission === 'denied')
    setAssinatura(await assinaturaDoAparelho())
  }, [])

  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { atualizarStatusPush() }, [atualizarStatusPush])
  // Só a edição/contas entram no botão "Atualizar" do cabeçalho — os avisos
  // deste aparelho não dependem de o banco ter respondido (§renderEquipe).
  React.useEffect(() => {
    if (registrarAtualizar) registrarAtualizar(carregar)
  }, [registrarAtualizar, carregar])

  React.useEffect(() => {
    setCodigoEdicao((config && config.edicao_atual) || '')
  }, [config])

  async function salvarEdicao(codigo) {
    setSalvandoEdicao(true)
    setAvisoEdicao(null)
    try {
      await rpc('definir_edicao_atual', { p_secret: lerSenha(), p_codigo: codigo })
      await carregar()
    } catch (e) {
      setAvisoEdicao({ texto: e.message, tom: 'erro' })
    } finally {
      setSalvandoEdicao(false)
    }
  }

  async function ligarAvisos() {
    if (Notification.permission === 'denied') {
      setAvisoPush({
        texto: 'A permissão já está negada para este site. Reabrir depende das ' +
          'configurações do navegador. O painel não consegue pedir de novo.',
        tom: 'erro',
      })
      return
    }

    setAvisoPush({ texto: 'Pedindo permissão… ' + ONDE_ESTA_O_AVISO, tom: '' })
    const lembrete = setTimeout(() => {
      setAvisoPush({ texto: 'Ainda esperando sua resposta. ' + ONDE_ESTA_O_AVISO, tom: '' })
    }, 8000)

    // Resposta tardia não se perde: quando a permissão muda, a tela se
    // redesenha sozinha, mesmo que a promessa abaixo tenha ficado para trás.
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'notifications' })
        .then((p) => { p.onchange = () => atualizarStatusPush() })
        .catch(() => { /* navegador sem a API: o caminho normal segue */ })
    }

    try {
      const permissao = await Notification.requestPermission()
      clearTimeout(lembrete)
      if (permissao !== 'granted') {
        setAvisoPush({
          texto: permissao === 'denied'
            ? 'Permissão negada. Nada pode ser enviado para este aparelho.'
            : 'Você fechou o aviso sem responder. Clique em "Ligar avisos" de novo.',
          tom: 'erro',
        })
        await atualizarStatusPush()
        return
      }

      const reg = await navigator.serviceWorker.ready
      // `userVisibleOnly: true` é obrigatório nos navegadores que importam:
      // não existe push silencioso na web, e é bom que não exista.
      const nova = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytesDaChave(VAPID_PUBLICA),
      })

      const bruto = nova.toJSON()
      // Só afirma "ligado" depois que o banco confirmar. Assinatura que existe
      // no navegador e não existe no banco é aparelho que nunca vai receber
      // nada — e que jura que está ligado.
      await rpc('registrar_push_organizacao', {
        p_secret: lerSenha(),
        p_endpoint: bruto.endpoint,
        p_p256dh: bruto.keys.p256dh,
        p_auth: bruto.keys.auth,
        p_user_agent: navigator.userAgent.slice(0, 300),
      })

      await atualizarStatusPush()
      setAvisoPush({ texto: 'Avisos ligados neste aparelho.', tom: 'ok' })
    } catch (e) {
      clearTimeout(lembrete)
      setAvisoPush({ texto: 'Não consegui ligar: ' + e.message, tom: 'erro' })
    }
  }

  async function desligarAvisos() {
    setAvisoPush({ texto: 'Desligando…', tom: '' })
    try {
      const atual = await assinaturaDoAparelho()
      if (atual) {
        // Banco primeiro. Se `unsubscribe` viesse antes e a rede caísse, o
        // endpoint ficaria vivo no banco apontando pra uma assinatura morta.
        await rpc('remover_push_organizacao', { p_secret: lerSenha(), p_endpoint: atual.endpoint })
        await atual.unsubscribe()
      }
      await atualizarStatusPush()
      setAvisoPush({ texto: 'Avisos desligados neste aparelho.', tom: 'ok' })
    } catch (e) {
      setAvisoPush({ texto: 'Não consegui desligar: ' + e.message, tom: 'erro' })
    }
  }

  async function testarAviso() {
    setAvisoPush({ texto: 'Enviando…', tom: '' })
    try {
      const r = await chamarFuncao('enviar-push', {
        secret: lerSenha(), alvo: 'organizacao',
        titulo: 'Teste do painel',
        corpo: 'Se esta notificação apareceu, o canal está de pé.',
        url: '/organizacao/',
      })
      const enviados = Number(r.enviados || 0)
      setAvisoPush({
        texto: enviados
          ? 'Enviado para ' + enviados + (enviados === 1 ? ' aparelho.' : ' aparelhos.')
          : 'A função respondeu, mas nenhum aparelho recebeu.',
        tom: enviados ? 'ok' : 'erro',
      })
    } catch (e) {
      setAvisoPush({ texto: 'Falhou: ' + e.message, tom: 'erro' })
    }
  }

  const atual = config && config.edicao_atual
  const funcoes = (config && config.funcoes) || []
  const suportado = avisoSuportado()

  return (
    <section className="og-vista">
      <VistaCabeca acento="marrom" icone={ICONE.equipe} titulo="Equipe" nota="A edição aberta e as contas de quem trabalha aqui" />

      <section className="og-forms">
        <div className="og-forms__cabeca">
          <h2>A edição aberta</h2>
          <p>É ela que decide qual formulário a marca vê ao entrar. Sem edição aberta, conta nova entra e não tem o que preencher.</p>
        </div>
        {erro && <div className="og-estado" data-tom="erro"><h2>Não consegui ler a configuração</h2><p>{erro}</p></div>}
        {!erro && (
          <>
            <div className="og-item" style={{ cursor: 'default' }}>
              <span className="og-item__cor" style={{ background: atual ? '#01AFCC' : '#FF4810' }} aria-hidden="true" />
              <p className="og-item__nome">{atual || 'Nenhuma edição aberta'}</p>
              <p className="og-item__meta">
                {atual
                  ? 'Toda conta nova de marca já nasce com o formulário desta edição.'
                  : 'Contas novas de marca entram e não têm o que preencher até você abrir uma.'}
              </p>
            </div>
            <label className="og-campo" style={{ marginTop: 12 }}><span>Código da edição</span>
              <input type="text" placeholder="2027" value={codigoEdicao} onChange={(e) => setCodigoEdicao(e.target.value)} />
            </label>
            {avisoEdicao && <div className="og-aviso" data-tom={avisoEdicao.tom}>{avisoEdicao.texto}</div>}
            <button className="og-btn" type="button" disabled={salvandoEdicao} onClick={() => salvarEdicao(codigoEdicao.trim())}>
              Salvar edição
            </button>
            {/* Só aparece com edição aberta: fechar sem ter aberto não é um
                gesto que exista. */}
            {atual && (
              <button className="og-btn og-btn--vazado" type="button" disabled={salvandoEdicao} onClick={() => salvarEdicao('')}>
                Fechar a edição
              </button>
            )}
          </>
        )}
      </section>

      <section className="og-forms" style={{ marginTop: 22 }}>
        <div className="og-forms__cabeca og-forms__cabeca--com-acao">
          <div>
            <h2>Contas da organização</h2>
            <p>Quem entra por conta nominal, e o que cada função pode fazer.</p>
          </div>
          <button className="og-btn og-btn--mini" type="button" onClick={() => setFolha({ tipo: 'nova' })}>Criar conta</button>
        </div>
        {!erro && contas.length === 0 && (
          <div className="og-estado">
            <h2>Nenhuma conta nominal</h2>
            <p>Ou ninguém tem conta própria ainda, ou a sua função não gerencia contas. Criar conta é coisa de administrador.</p>
          </div>
        )}
        {!erro && contas.length > 0 && (
          <ul className="og-lista">
            {contas.map((c) => {
              const pendencias = [c.ativo ? '' : 'suspensa', c.deve_trocar_senha ? 'ainda não trocou a senha' : '']
                .filter(Boolean).join(' · ')
              return (
                <li key={c.user_id}>
                  <div className="og-item">
                    <span className="og-item__cor" style={{ background: c.ativo ? '#3D1308' : '#FF4810' }} aria-hidden="true" />
                    <p className="og-item__nome">{c.email || '(sem e-mail)'}</p>
                    <p className="og-item__meta">{(c.rotulo || c.funcao || 'sem função') + (pendencias ? ' · ' + pendencias : '')}</p>
                    <span className="og-item__dir">
                      <button className="og-btn og-btn--vazado og-btn--mini" type="button" onClick={() => setFolha({ tipo: 'mudar', conta: c })}>
                        Mudar
                      </button>
                      <span className="og-item__data">{dataCurta(c.criado_em)}</span>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Aviso é POR APARELHO, não por conta: a assinatura pertence a este
          navegador. Por isso este bloco não depende de `erro`/`config`. */}
      <section className="og-forms" style={{ marginTop: 22 }}>
        <div className="og-forms__cabeca">
          <h2>Avisos neste aparelho</h2>
          <p>Chega notificação quando uma marca responde ou envia cadastro, mesmo com o painel fechado.</p>
        </div>
        {!suportado && (
          <div className="og-estado">
            <h2>Este navegador não recebe avisos</h2>
            <p>
              No iPhone, instale o painel primeiro: botão de compartilhar do Safari → "Adicionar
              à Tela de Início". Depois abra pelo ícone e volte aqui.
            </p>
          </div>
        )}
        {suportado && (
          <>
            <div className="og-item" style={{ cursor: 'default' }}>
              <span className="og-item__cor" style={{ background: assinatura ? '#01AFCC' : (negado ? '#FF4810' : '#6A2C15') }} aria-hidden="true" />
              <p className="og-item__nome">
                {assinatura ? 'Ligados neste aparelho' : (negado ? 'Bloqueados no navegador' : 'Desligados neste aparelho')}
              </p>
              <p className="og-item__meta">
                {assinatura
                  ? 'Este aparelho recebe aviso mesmo com o painel fechado.'
                  : (negado
                    ? 'A permissão foi negada. Reabrir depende das configurações do navegador para este site. O painel não consegue pedir de novo.'
                    : 'Nada chega até você ligar aqui.')}
              </p>
            </div>
            {avisoPush && <div className="og-aviso" data-tom={avisoPush.tom}>{avisoPush.texto}</div>}
            {assinatura && (
              <>
                <button className="og-btn og-btn--vazado" type="button" onClick={desligarAvisos}>Desligar</button>{' '}
                <button className="og-btn og-btn--vazado" type="button" onClick={testarAviso}>Enviar um teste</button>
              </>
            )}
            {!assinatura && !negado && (
              <button className="og-btn" type="button" onClick={ligarAvisos}>Ligar avisos</button>
            )}
          </>
        )}
      </section>

      <FolhaNovaConta
        aberto={!!folha && folha.tipo === 'nova'}
        funcoes={funcoes}
        onFechar={() => setFolha(null)}
        onCriada={carregar}
      />
      <FolhaMudarConta
        aberto={!!folha && folha.tipo === 'mudar'}
        conta={folha && folha.tipo === 'mudar' ? folha.conta : null}
        funcoes={funcoes}
        onFechar={() => setFolha(null)}
        onSalvo={carregar}
      />
    </section>
  )
}
