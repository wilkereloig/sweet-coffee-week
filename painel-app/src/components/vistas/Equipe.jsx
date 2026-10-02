import React from 'react'
import { rpc, chamarFuncao } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { GRUPOS_ACAO, tempoRelativo } from '../../lib/central'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { USUARIO_VALIDO, loginDaConta } from '../../../../src/lib/orgAccess'
import { Folha } from '../Folha'
import { Atividade } from '../Atividade'
import { AvisosAparelho } from '../AvisosAparelho'
import { Carregando, Vazio, Erro, Secao, traduzirErro, Selo, Botao } from '../ui'
import { confirmar } from '../Confirmar'

/*
 * Vista Equipe — "Configurações → Usuários da equipe": quem entra no painel da
 * organização, com que função, e o histórico de tudo que a equipe fez.
 *
 * Cada pessoa tem conta própria (usuário + senha, sem e-mail), e é o login dela que
 * assina cada ação no histórico — quem fez vem da sessão, no banco, nunca de
 * um nome mandado pela tela. Conta não se apaga: desativa. Assim os registros
 * antigos continuam com o nome de quem fez.
 */
const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

// A senha gerada aparece UMA vez: copiar é o único jeito de não perdê-la.
function SenhaUmaVez({ login, senha }) {
  const [copiado, setCopiado] = React.useState(false)
  async function copiar() {
    try { await navigator.clipboard.writeText('Login: ' + login + '\nSenha: ' + senha); setCopiado(true) } catch { setCopiado('manual') }
    setTimeout(() => setCopiado(false), 2400)
  }
  return (
    <div className="og-cred">
      <p className="og-cred__aviso">Anote ou envie agora. <b>Esta senha não aparece de novo.</b></p>
      <dl className="og-cred__par"><dt>Login</dt><dd>{login}</dd></dl>
      <dl className="og-cred__par"><dt>Senha</dt><dd>{senha}</dd></dl>
      <div className="og-cred__acoes">
        <button className="og-btn og-btn--mini" type="button" onClick={copiar}>{copiado === true ? 'Copiado' : copiado === 'manual' ? 'Selecione acima' : 'Copiar dados'}</button>
      </div>
      <p className="ui-nota">No primeiro acesso a pessoa é obrigada a trocar a senha.</p>
    </div>
  )
}

function FolhaNovaConta({ aberto, funcoes, onFechar, onCriada }) {
  const [usuario, setUsuario] = React.useState('')
  const [nome, setNome] = React.useState('')
  const [funcao, setFuncao] = React.useState('')
  const [erro, setErro] = React.useState(null)
  const [criando, setCriando] = React.useState(false)
  const [cred, setCred] = React.useState(null)

  React.useEffect(() => {
    if (!aberto) return
    setUsuario(''); setNome(''); setErro(null); setCriando(false); setCred(null)
    setFuncao((funcoes.find((f) => f.codigo === 'producao') || funcoes[0] || {}).codigo || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  async function criar(ev) {
    ev.preventDefault()
    if (!nome.trim()) { setErro('Informe o nome: é ele que aparece no histórico.'); return }
    const u = usuario.trim().toLowerCase()
    if (u.length < 3 || u.length > 30 || !USUARIO_VALIDO.test(u)) { setErro('Usuário: de 3 a 30 caracteres, só letras minúsculas sem acento, números e . _ - entre eles (ex.: ana.producao).'); return }
    setCriando(true)
    setErro(null)
    try {
      const r = await chamarFuncao('criar-conta-organizacao', { secret: lerSenha(), usuario: u, funcao, nome: nome.trim() })
      // Grava o nome também pela RPC: funciona mesmo antes de a Edge Function
      // nova (que já aceita `nome`) estar publicada.
      if (r && r.user_id) await rpc('atualizar_conta', { p_secret: lerSenha(), p_user: r.user_id, p_nome: nome.trim() }).catch(() => {})
      setCred(r)
      await onCriada()
    } catch (e) {
      setErro(traduzirErro((e.dados && e.dados.erro) || e.message))
    } finally {
      setCriando(false)
    }
  }

  return (
    <Folha aberto={aberto} titulo="Nova pessoa na equipe" sub="Cada pessoa com o próprio acesso" onFechar={onFechar}>
      <form className="ui-form" onSubmit={criar} noValidate>
        <p className="ui-nota">A senha inicial aparece uma vez, para você entregar, e vale para um login só: no primeiro acesso a pessoa cria a dela.</p>
        <label className="og-campo"><span>Nome <abbr title="obrigatório">*</abbr></span>
          <input type="text" autoComplete="off" required value={nome} onChange={(e) => setNome(e.target.value)} disabled={!!cred} />
        </label>
        <label className="og-campo"><span>Usuário para entrar <abbr title="obrigatório">*</abbr></span>
          <input type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={30} placeholder="ana.producao" value={usuario} onChange={(e) => setUsuario(e.target.value.toLowerCase())} disabled={!!cred} />
        </label>
        <label className="og-campo"><span>Função</span>
          <select value={funcao} onChange={(e) => setFuncao(e.target.value)} disabled={!!cred}>
            {funcoes.map((f) => <option key={f.codigo} value={f.codigo}>{f.rotulo}</option>)}
          </select>
        </label>
        <ul className="ui-nota ui-lista-funcoes">
          <li><b>Administrador</b>: tudo, inclusive contas da equipe.</li>
          <li><b>Curadoria</b>: triagem, mensagens e acesso de marcas.</li>
          <li><b>Produção</b>: pedidos, arquivos, fotos, triagem e mensagens.</li>
          <li><b>Comercial</b>: contatos, Press Kit, vouchers e mensagens.</li>
          <li><b>Consulta</b>: só lê.</li>
        </ul>
        {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
        {cred && <SenhaUmaVez login={cred.login} senha={cred.senha} />}
        {!cred && <button className="og-btn" type="submit" disabled={criando}>{criando ? 'Criando…' : 'Criar acesso'}</button>}
      </form>
    </Folha>
  )
}

function FolhaConta({ aberto, conta, funcoes, onFechar, onSalvo, onVerHistorico }) {
  // Guarda a última conta não-nula: a folha ainda precisa de conteúdo para
  // animar a saída depois que `conta` vira null.
  const [c, setC] = React.useState(conta)
  const [nome, setNome] = React.useState('')
  const [funcao, setFuncao] = React.useState('')
  const [aviso, setAviso] = React.useState(null)
  const [ocupado, setOcupado] = React.useState(null)
  const [cred, setCred] = React.useState(null)

  // Recarregar a lista depois de salvar entrega um objeto `conta` novo da
  // MESMA pessoa: isso atualiza a ficha, mas não pode apagar a senha recém-
  // gerada nem o "Salvo." — o formulário só zera quando a pessoa muda.
  React.useEffect(() => { if (conta) setC(conta) }, [conta])
  const idConta = conta && conta.user_id
  React.useEffect(() => {
    if (!conta) return
    setNome(conta.nome || ''); setFuncao(conta.funcao || ''); setAviso(null); setCred(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idConta])

  async function acao(chave, fn, ok) {
    setOcupado(chave)
    setAviso(null)
    try {
      await fn()
      if (ok) setAviso({ tom: 'ok', texto: ok })
      await onSalvo()
    } catch (e) {
      setAviso({ tom: 'erro', texto: traduzirErro((e.dados && e.dados.erro) || e.message) })
    } finally {
      setOcupado(null)
    }
  }

  const salvar = (ev) => {
    ev.preventDefault()
    acao('salvar', async () => {
      if ((nome || '') !== (c.nome || '')) await rpc('atualizar_conta', { p_secret: lerSenha(), p_user: c.user_id, p_nome: nome })
      if (funcao && funcao !== (c.funcao || '')) await rpc('definir_funcao_conta', { p_secret: lerSenha(), p_user: c.user_id, p_funcao: funcao })
    }, 'Salvo.')
  }
  const alternar = async () => {
    if (c.ativo && !await confirmar('Desativar ' + (c.nome || loginDaConta(c.email)) + '? A pessoa deixa de entrar agora. O histórico continua com o nome dela.')) return
    acao('ativo', () => rpc('suspender_conta', { p_secret: lerSenha(), p_user: c.user_id, p_ativo: !c.ativo }), c.ativo ? 'Conta desativada.' : 'Conta reativada.')
  }
  const novaSenha = async () => {
    if (!await confirmar('Gerar uma senha nova para ' + (c.nome || loginDaConta(c.email)) + '? A atual deixa de valer agora.')) return
    acao('senha', async () => {
      const r = await chamarFuncao('regerar-senha-conta', { secret: lerSenha(), user_id: c.user_id })
      setCred(r)
    })
  }

  return (
    <Folha aberto={aberto} titulo={(c && (c.nome || loginDaConta(c.email))) || 'Conta'} sub={c ? loginDaConta(c.email) + ' · ' + (c.rotulo || c.funcao || 'sem função') : ''} onFechar={onFechar}>
      {c && (
        <div className="ui-pilha">
          <dl className="ui-dados">
            <div className="ui-dado"><dt>Situação</dt><dd>{c.ativo ? 'Ativa' : 'Desativada'}{c.deve_trocar_senha ? ' · ainda não trocou a senha inicial' : ''}</dd></div>
            <div className="ui-dado"><dt>Criada em</dt><dd>{dataCurta(c.criado_em)}</dd></div>
            <div className="ui-dado"><dt>Último acesso</dt><dd>{c.ultimo_acesso ? tempoRelativo(c.ultimo_acesso) : 'nunca entrou'}</dd></div>
          </dl>
          <form className="ui-form" onSubmit={salvar}>
            <label className="og-campo"><span>Nome (aparece no histórico)</span>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} />
            </label>
            <label className="og-campo"><span>Função</span>
              <select value={funcao} onChange={(e) => setFuncao(e.target.value)}>
                {!funcao && <option value="">Sem função — escolha uma</option>}
                {funcoes.map((f) => <option key={f.codigo} value={f.codigo}>{f.rotulo}</option>)}
              </select>
            </label>
            <button className="og-btn" type="submit" disabled={!!ocupado}>{ocupado === 'salvar' ? 'Salvando…' : 'Salvar'}</button>
          </form>
          {aviso && <p className={'ui-nota ' + (aviso.tom === 'erro' ? 'ui-nota--erro' : 'ui-nota--ok')} role={aviso.tom === 'erro' ? 'alert' : 'status'}>{aviso.texto}</p>}
          {cred && <SenhaUmaVez login={cred.login} senha={cred.senha} />}
          <Secao titulo="Acesso">
            <div className="ui-linha-acoes">
              <Botao icone="chave" variante="secundario" disabled={!!ocupado} onClick={novaSenha}>Gerar senha nova</Botao>
              <button className="og-btn og-btn--vazado og-btn--mini" type="button" disabled={!!ocupado} onClick={alternar}>{c.ativo ? 'Desativar' : 'Reativar'}</button>
              <button className="og-btn og-btn--vazado og-btn--mini" type="button" onClick={() => onVerHistorico(c.user_id)}>Ver o que fez</button>
            </div>
            <p className="ui-nota">Contas não são apagadas: desativar tira o acesso e mantém o nome em tudo o que a pessoa registrou. O banco recusa desativar o último administrador.</p>
          </Secao>
        </div>
      )}
    </Folha>
  )
}

/* ── Histórico geral, com filtros ──────────────────────────────────────── */
const PERIODOS = { '': 'Sempre', '1': 'Hoje', '7': 'Últimos 7 dias', '30': 'Últimos 30 dias', '90': 'Últimos 90 dias' }

function Historico({ contas, atorInicial, abrirLink }) {
  const [ator, setAtor] = React.useState((atorInicial && atorInicial.id) || '')
  const [acao, setAcao] = React.useState('')
  const [dias, setDias] = React.useState('30')
  const [marca, setMarca] = React.useState('')
  const [linhas, setLinhas] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const pedido = React.useRef(0)

  // `atorInicial` é um pedido ({ id }), não o id solto: clicar "Ver o que
  // fez" duas vezes na mesma pessoa, depois de mexer no filtro, reaplica.
  React.useEffect(() => { if (atorInicial) setAtor(atorInicial.id) }, [atorInicial])

  const carregar = React.useCallback(async () => {
    setErro(null)
    setLinhas(null)
    const meu = ++pedido.current // mexer nos filtros rápido: só a última resposta vale
    try {
      const de = dias ? new Date(Date.now() - (dias === '1' ? 0 : Number(dias)) * 864e5) : null
      if (de && dias === '1') de.setHours(0, 0, 0, 0)
      const l = await rpc('get_atividade', {
        p_secret: lerSenha(),
        p_ator: ator && ator !== 'compartilhado' ? ator : null,
        p_acao: acao || null,
        p_de: de ? de.toISOString() : null,
        p_limite: 500,
      })
      if (meu === pedido.current) setLinhas(l || [])
    } catch (e) {
      if (meu === pedido.current) setErro(e.message)
    }
  }, [ator, acao, dias])
  React.useEffect(() => { carregar() }, [carregar])

  const t = marca.trim().toLowerCase()
  const visiveis = (linhas || [])
    .filter((a) => ator !== 'compartilhado' || !a.ator_user_id)
    .filter((a) => !t || (a.marca || '').toLowerCase().includes(t))

  return (
    <>
      <div className="og-filtros">
        <label className="og-campo"><span>Quem</span>
          <select value={ator} onChange={(e) => setAtor(e.target.value)}>
            <option value="">Todas as pessoas</option>
            <option value="compartilhado">Acesso compartilhado</option>
            {contas.map((c) => <option key={c.user_id} value={c.user_id}>{c.nome || loginDaConta(c.email)}</option>)}
          </select>
        </label>
        <label className="og-campo"><span>Ação</span>
          <select value={acao} onChange={(e) => setAcao(e.target.value)}>
            {GRUPOS_ACAO.map((g) => <option key={g.valor} value={g.valor}>{g.rotulo}</option>)}
          </select>
        </label>
        <label className="og-campo"><span>Período</span>
          <select value={dias} onChange={(e) => setDias(e.target.value)}>
            {Object.entries(PERIODOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </label>
        <label className="og-campo og-campo--busca"><span>Marca</span>
          <input type="search" placeholder="filtrar pelo nome da marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
        </label>
      </div>
      {erro && <Erro texto={erro} onTentar={carregar} />}
      {!erro && linhas === null && <Carregando linhas={4} />}
      {!erro && linhas && visiveis.length === 0 && <Vazio titulo="Nada registrado com esses filtros" />}
      {!erro && linhas && visiveis.length > 0 && (
        <>
          <p className="ui-contagem">{visiveis.length} {visiveis.length === 1 ? 'registro' : 'registros'}{linhas.length === 500 ? ' (mostrando os 500 mais recentes)' : ''}</p>
          <Atividade linhas={visiveis} onAbrirMarca={(id) => abrirLink('marcas/' + id + '/historico')} />
        </>
      )}
    </>
  )
}

// `secao`: 'equipe' (pessoas, acesso compartilhado, avisos) ou 'historico'
// — duas abas de Administração (reestruturação 29/09/2026). O filtro de
// pessoa do histórico vem do endereço (`ator`), que é o que "Ver o que fez"
// preenche.
export function Equipe({ registrarAtualizar, abrirLink, rota, navegar, secao = 'equipe' }) {
  const [config, setConfig] = React.useState(null)
  const [contas, setContas] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [folha, setFolha] = React.useState(null) // null | {tipo:'nova'} | {tipo:'conta', conta}
  const ator = rota && rota.filtros.ator
  const atorHistorico = React.useMemo(() => (ator ? { id: ator } : null), [ator])
  const [avisoCompartilhado, setAvisoCompartilhado] = React.useState(null)

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

  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])

  const funcoes = (config && config.funcoes) || []
  const lista = contas || []
  const admsAtivos = lista.filter((c) => c.ativo && c.funcao === 'administrador').length

  async function alternarCompartilhado() {
    const ligar = !(config && config.senha_unica_ativa)
    if (!ligar && !await confirmar('Desligar o acesso compartilhado (senha única)?\n\nDepois disso só entra quem tem conta própria. Confira antes que você mesmo entra com a sua conta.')) return
    setAvisoCompartilhado(null)
    try {
      await rpc('senha_unica_definir', { p_secret: lerSenha(), p_ativa: ligar })
      await carregar()
      setAvisoCompartilhado({ tom: 'ok', texto: ligar ? 'Acesso compartilhado ligado.' : 'Acesso compartilhado desligado. Só contas pessoais entram.' })
    } catch (e) {
      setAvisoCompartilhado({ tom: 'erro', texto: /sem_administrador_nominal/.test(e.message) ? 'Crie e ative pelo menos um administrador com conta própria antes de desligar.' : traduzirErro(e.message) })
    }
  }

  return (
    <div className="og-embutida">
      {erro && <Erro texto={erro} onTentar={carregar} />}

      {secao === 'equipe' && <div className="ui-grade-duas">
        <Secao
          titulo="Usuários da equipe"
          nota="Cada pessoa com o próprio acesso. É o nome dela que assina o que faz no painel."
          acoes={<Botao icone="mais" onClick={() => setFolha({ tipo: 'nova' })}>Adicionar pessoa</Botao>}
        >
          {!erro && contas === null && <Carregando linhas={3} />}
          {!erro && contas && lista.length === 0 && (
            <Vazio titulo="Ninguém com conta própria ainda">Hoje todo mundo entra pelo acesso compartilhado, e o histórico não consegue dizer quem fez cada coisa. Adicione cada pessoa da equipe — começando por você, como administrador.</Vazio>
          )}
          {lista.length > 0 && (
            <ul className="og-lista og-lista--tabela">
              {lista.map((c) => (
                <li key={c.user_id}>
                  <button type="button" className="og-item" onClick={() => setFolha({ tipo: 'conta', conta: c })}>
                    <span className="og-item__cor" data-tom={c.ativo ? 'ok' : 'alerta'} aria-hidden="true" />
                    <span className="og-item__nome">{c.nome || loginDaConta(c.email)}</span>
                    <span className="og-item__meta">{(c.nome ? loginDaConta(c.email) + ' · ' : '') + (c.rotulo || c.funcao || 'sem função')}{c.deve_trocar_senha ? ' · ainda não trocou a senha' : ''}</span>
                    <span className="og-item__dir">
                      <Selo tom={c.ativo ? 'ok' : 'atencao'}>{c.ativo ? 'ativa' : 'desativada'}</Selo>
                      <span className="og-item__data">{c.ultimo_acesso ? 'entrou ' + tempoRelativo(c.ultimo_acesso) : 'nunca entrou'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <div className="ui-pilha">
          <Secao titulo="Acesso compartilhado" nota="A senha única da organização. Ações feitas por ela aparecem no histórico como “Acesso compartilhado”, sem nome.">
            <p className="ui-estado-linha">
              <span className="ui-ponto" data-tom={config && config.senha_unica_ativa ? 'neutro' : 'ok'} aria-hidden="true" />
              <b>{config ? (config.senha_unica_ativa ? 'Ligado' : 'Desligado — só contas pessoais entram') : 'Verificando…'}</b>
            </p>
            {config && config.senha_unica_ativa && admsAtivos === 0 && <p className="ui-nota">Para desligar, primeiro crie pelo menos um administrador com conta própria.</p>}
            {config && (
              <button className="og-btn og-btn--vazado og-btn--mini" type="button" onClick={alternarCompartilhado} disabled={config.senha_unica_ativa && admsAtivos === 0}>
                {config.senha_unica_ativa ? 'Desligar acesso compartilhado' : 'Religar acesso compartilhado'}
              </button>
            )}
            {avisoCompartilhado && <p className={'ui-nota ' + (avisoCompartilhado.tom === 'erro' ? 'ui-nota--erro' : 'ui-nota--ok')} role={avisoCompartilhado.tom === 'erro' ? 'alert' : 'status'}>{avisoCompartilhado.texto}</p>}
          </Secao>

          <Secao titulo="Avisos neste aparelho" nota="Aviso é por aparelho, não por conta.">
            <AvisosAparelho
              explicacao="Ligue para saber na hora quando uma marca escreve, responde um pedido, conclui o cadastro ou reserva vaga de fotos — mesmo com o painel fechado."
              registrar={(a) => rpc('registrar_push_organizacao', { p_secret: lerSenha(), p_endpoint: a.endpoint, p_p256dh: a.p256dh, p_auth: a.auth, p_user_agent: a.userAgent })}
              remover={(endpoint) => rpc('remover_push_organizacao', { p_secret: lerSenha(), p_endpoint: endpoint })}
              testar={async () => {
                const r = await chamarFuncao('enviar-push', {
                  secret: lerSenha(), alvo: 'organizacao', titulo: 'Teste do painel',
                  corpo: 'Se esta notificação apareceu, o canal está de pé.', url: '/painel/',
                })
                return Number(r.enviados || 0)
              }}
            />
          </Secao>
        </div>
      </div>}

      {secao === 'historico' && <Secao titulo="Histórico da equipe" nota="Tudo o que foi feito no painel: quem, o quê, quando e em qual marca." id="historico-equipe">
        <Historico contas={lista} atorInicial={atorHistorico} abrirLink={abrirLink} />
      </Secao>}

      <FolhaNovaConta aberto={!!folha && folha.tipo === 'nova'} funcoes={funcoes} onFechar={() => setFolha(null)} onCriada={carregar} />
      <FolhaConta
        aberto={!!folha && folha.tipo === 'conta'}
        conta={folha && folha.tipo === 'conta' ? lista.find((x) => x.user_id === folha.conta.user_id) || folha.conta : null}
        funcoes={funcoes}
        onFechar={() => setFolha(null)}
        onSalvo={carregar}
        onVerHistorico={(id) => {
          setFolha(null)
          navegar({ vista: 'admin', aba: 'historico', filtros: { ator: id } })
        }}
      />
    </div>
  )
}
