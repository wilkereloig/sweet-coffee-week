import React from 'react'
import { rpc, chamarFuncao } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { textoAvisosSenha } from '../../lib/cadastro'
import { GRUPOS_ACAO, tempoRelativo } from '../../lib/central'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { USUARIO_VALIDO, loginDaConta, usuarioDaEquipe } from '../../../../src/lib/orgAccess'
import { Folha } from '../Folha'
import { Atividade } from '../Atividade'
import { AvisosAparelho } from '../AvisosAparelho'
import { Carregando, Vazio, Erro, Secao, traduzirErro, Selo, Botao } from '../ui'
import { confirmar } from '../Confirmar'
import { Avatar } from '../Avatar'
import { EditorFoto } from '../MeuPerfil'
import { useEquipe } from '../../lib/equipe'
import { AvisoMudancaExterna } from '../AvisoMudancaExterna'
import { useSincronizar, useGuarda } from '../../lib/sync/react'
import { DOMINIOS_VISTAS } from '../../lib/syncFichas'
import { useRascunhoOrg } from '../../lib/rascunhoOrg'

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
function SenhaUmaVez({ login, senha, avisos }) {
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
      {textoAvisosSenha(avisos) && <p className="ui-nota ui-nota--erro" role="alert">{textoAvisosSenha(avisos)}</p>}
    </div>
  )
}

function FolhaNovaConta({ aberto, funcoes, onFechar }) {
  const [nome, setNome] = React.useState('')
  const [funcao, setFuncao] = React.useState('')
  const [erro, setErro] = React.useState(null)
  const [criando, setCriando] = React.useState(false)
  const [cred, setCred] = React.useState(null)

  React.useEffect(() => {
    if (!aberto) return
    setNome(''); setErro(null); setCriando(false); setCred(null)
    setFuncao((funcoes.find((f) => f.codigo === 'producao') || funcoes[0] || {}).codigo || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])
  // As funções chegaram depois de abrir (rede lenta): o select mostrava a 1ª opção, mas `funcao` ficava ''.
  React.useEffect(() => {
    if (aberto && funcoes.length) setFuncao((atual) => atual || (funcoes.find((f) => f.codigo === 'producao') || funcoes[0]).codigo)
  }, [aberto, funcoes])

  async function criar(ev) {
    ev.preventDefault()
    if (!nome.trim()) { setErro('Informe o nome: é ele que aparece no histórico.'); return }
    if (!funcao) { setErro('As funções ainda não carregaram. Feche e abra de novo em instantes.'); return }
    // Login padrão: nome e sobrenome + sigla da função (wilkereloi.adm), gerado, não digitado.
    const u = usuarioDaEquipe(nome, funcao)
    if (u.length < 3 || !USUARIO_VALIDO.test(u)) { setErro('O nome precisa ter letras para virar o login.'); return }
    setCriando(true)
    setErro(null)
    try {
      const r = await chamarFuncao('criar-conta-organizacao', { secret: lerSenha(), usuario: u, funcao, nome: nome.trim() })
      // Grava o nome também pela RPC: funciona mesmo antes de a Edge Function
      // nova (que já aceita `nome`) estar publicada. Se esta gravação falhar a conta JÁ existe (e a senha
      // aparece abaixo): o aviso diz exatamente o que faltou, em vez de fingir que tudo deu certo.
      let avisoNome = null
      if (r && r.user_id) {
        try { await rpc('atualizar_conta', { p_secret: lerSenha(), p_user: r.user_id, p_nome: nome.trim() }) }
        catch (e) { avisoNome = 'A conta foi criada, mas o nome não foi gravado (' + traduzirErro((e.dados && e.dados.erro) || e.message) + '). Abra a conta na lista e salve o nome.' }
      }
      setCred(r)
      if (avisoNome) setErro(avisoNome)
      // A lista da equipe se atualiza pelo domínio "perfis" que a criação anunciou.
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
        <label className="og-campo"><span>Função</span>
          <select value={funcao} onChange={(e) => setFuncao(e.target.value)} disabled={!!cred}>
            {funcoes.map((f) => <option key={f.codigo} value={f.codigo}>{f.rotulo}</option>)}
          </select>
        </label>
        <p className="ui-nota">Login: <b>{usuarioDaEquipe(nome, funcao) || 'nomesobrenome.sigla'}</b></p>
        <ul className="ui-nota ui-lista-funcoes">
          <li><b>Administrador</b>: tudo, inclusive contas da equipe.</li>
          <li><b>Curadoria</b>: triagem, mensagens e acesso de marcas.</li>
          <li><b>Produção</b>: pedidos, arquivos, fotos, triagem e mensagens.</li>
          <li><b>Comercial</b>: contatos, Press Kit, vouchers e mensagens.</li>
          <li><b>Consulta</b>: só lê.</li>
          <li><b>Social media</b>: planejamento do Instagram, biblioteca e textos do combo (nome, descrição, componentes). Não vê cadastro, contatos nem financeiro.</li>
        </ul>
        {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
        {cred && <SenhaUmaVez login={cred.login} senha={cred.senha} avisos={cred.avisos} />}
        {!cred && <button className="og-btn" type="submit" disabled={criando}>{criando ? 'Criando…' : 'Criar acesso'}</button>}
      </form>
    </Folha>
  )
}

function FolhaConta({ aberto, conta, funcoes, onFechar, onVerHistorico }) {
  const equipe = useEquipe()
  // Guarda a última conta não-nula: a folha ainda precisa de conteúdo para
  // animar a saída depois que `conta` vira null.
  const [c, setC] = React.useState(conta)
  const [aviso, setAviso] = React.useState(null)
  const [ocupado, setOcupado] = React.useState(null)
  const [cred, setCred] = React.useState(null)

  // A lista é relida em silêncio (outra pessoa mexeu na conta, reconexão) e entrega um objeto `conta`
  // novo da MESMA pessoa: isso atualiza a ficha, mas não pode apagar a senha recém-gerada, o "Salvo."
  // nem o que a pessoa digitou — o rascunho só recomeça quando a conta muda de pessoa.
  React.useEffect(() => { if (conta) setC(conta) }, [conta])
  const idConta = conta && conta.user_id
  const fonte = conta || c
  const servidor = React.useMemo(() => ({ nome: (fonte && fonte.nome) || '', funcao: (fonte && fonte.funcao) || '' }), [fonte && fonte.nome, fonte && fonte.funcao]) // eslint-disable-line react-hooks/exhaustive-deps
  const r = useRascunhoOrg(servidor, ['nome', 'funcao'], { chave: idConta, rotulo: 'Conta da equipe' })
  const nome = r.local.nome
  const funcao = r.local.funcao
  React.useEffect(() => {
    if (!conta) return
    setAviso(null); setCred(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idConta])

  async function acao(chave, fn, ok) {
    setOcupado(chave)
    setAviso(null)
    try {
      await fn()
      if (ok) setAviso({ tom: 'ok', texto: ok })
    } catch (e) {
      setAviso({ tom: 'erro', texto: traduzirErro((e.dados && e.dados.erro) || e.message) })
    } finally {
      setOcupado(null)
    }
  }

  const salvar = (ev) => {
    ev.preventDefault()
    if (Object.keys(r.conflitos).length) { setAviso({ tom: 'erro', texto: 'Estes campos mudaram enquanto você editava. Escolha qual versão vale, acima, antes de salvar.' }); return }
    const enviado = r.local
    const base = r.base
    acao('salvar', async () => {
      // Só manda o que a PESSOA mudou em relação ao que a tela viu confirmado: um nome alterado por outra
      // pessoa nunca é desfeito por um valor velho que ficou no formulário.
      if ((enviado.nome || '') !== (base.nome || '')) await rpc('atualizar_conta', { p_secret: lerSenha(), p_user: c.user_id, p_nome: enviado.nome })
      if (enviado.funcao && enviado.funcao !== (base.funcao || '')) await rpc('definir_funcao_conta', { p_secret: lerSenha(), p_user: c.user_id, p_funcao: enviado.funcao })
      r.salvou(enviado)
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
          <Secao titulo="Foto de perfil" nota="Aparece ao lado do nome nas atividades, avisos e comentários. Sem foto, iniciais.">
            <EditorFoto alvo={c.user_id} nome={c.nome || loginDaConta(c.email)}
              temFoto={!!(equipe.pessoas[c.user_id] || {}).avatar_path} onMudou={equipe.recarregar} />
          </Secao>
          <AvisoMudancaExterna registro={r} rotulos={{ nome: 'Nome', funcao: 'Função' }} />
          <form className="ui-form" onSubmit={salvar}>
            <label className="og-campo"><span>Nome (aparece no histórico)</span>
              <input type="text" value={nome} onChange={(e) => r.editar('nome', e.target.value)} maxLength={80} />
            </label>
            <label className="og-campo"><span>Função</span>
              <select value={funcao} onChange={(e) => r.editar('funcao', e.target.value)}>
                {!funcao && <option value="">Sem função — escolha uma</option>}
                {funcoes.map((f) => <option key={f.codigo} value={f.codigo}>{f.rotulo}</option>)}
              </select>
            </label>
            <button className="og-btn" type="submit" disabled={!!ocupado}>{ocupado === 'salvar' ? 'Salvando…' : 'Salvar'}</button>
          </form>
          {aviso && <p className={'ui-nota ' + (aviso.tom === 'erro' ? 'ui-nota--erro' : 'ui-nota--ok')} role={aviso.tom === 'erro' ? 'alert' : 'status'}>{aviso.texto}</p>}
          {cred && <SenhaUmaVez login={cred.login} senha={cred.senha} avisos={cred.avisos} />}
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
  const guarda = useGuarda()
  const [ator, setAtor] = React.useState((atorInicial && atorInicial.id) || '')
  const [acao, setAcao] = React.useState('')
  const [dias, setDias] = React.useState('30')
  const [marca, setMarca] = React.useState('')
  const [linhas, setLinhas] = React.useState(null)
  const [erro, setErro] = React.useState(null)

  // `atorInicial` é um pedido ({ id }), não o id solto: clicar "Ver o que
  // fez" duas vezes na mesma pessoa, depois de mexer no filtro, reaplica.
  React.useEffect(() => { if (atorInicial) setAtor(atorInicial.id) }, [atorInicial])

  // Mexer nos filtros troca a lista (esqueleto); a releitura por sinal NÃO: mantém as linhas e os filtros na
  // tela e, se falhar, o que estava lá continua. Só a última resposta vale (useGuarda). true = leu.
  const carregar = React.useCallback(async ({ silencioso = false } = {}) => {
    const vale = guarda()
    if (!silencioso) { setErro(null); setLinhas(null) }
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
      if (!vale()) return true
      setLinhas(l || [])
      setErro(null)
      return true
    } catch (e) {
      if (!vale()) return true
      if (!silencioso) setErro(e.message)
      return false
    }
  }, [ator, acao, dias, guarda])
  React.useEffect(() => { carregar() }, [carregar])
  useSincronizar(DOMINIOS_VISTAS.historicoEquipe, async () => { if (!(await carregar({ silencioso: true }))) throw new Error('historico') })
  const tentarDeNovo = React.useCallback(() => carregar(), [carregar])

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
      {erro && <Erro texto={erro} onTentar={tentarDeNovo} />}
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

// `secao`: 'equipe' (pessoas e avisos) ou 'historico'
// — duas abas de Administração (reestruturação 29/09/2026). O filtro de
// pessoa do histórico vem do endereço (`ator`), que é o que "Ver o que fez"
// preenche.
export function Equipe({ abrirLink, rota, navegar, secao = 'equipe' }) {
  const guarda = useGuarda()
  const [config, setConfig] = React.useState(null)
  const [contas, setContas] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [folha, setFolha] = React.useState(null) // null | {tipo:'nova'} | {tipo:'conta', conta}
  const ator = rota && rota.filtros.ator
  const atorHistorico = React.useMemo(() => (ator ? { id: ator } : null), [ator])

  // As duas leituras são independentes: uma que cai não apaga a outra. A releitura SILENCIOSA (outra pessoa
  // mexeu numa conta, reconexão) mantém a lista e a configuração na tela se falhar; só a primeira leitura e
  // "Tentar de novo" mostram o erro. Resposta velha e tela desmontada não gravam nada. true = leu as duas.
  const carregar = React.useCallback(async ({ silencioso = false } = {}) => {
    const vale = guarda()
    if (!silencioso) setErro(null)
    const senha = lerSenha()
    const [c, k] = await Promise.allSettled([
      rpc('get_config_admin', { p_secret: senha }),
      rpc('get_contas_organizacao', { p_secret: senha }),
    ])
    if (!vale()) return true
    let ok = true
    if (c.status === 'fulfilled') setConfig(c.value || null)
    else { ok = false; if (!silencioso) { setConfig(null); setErro(c.reason.message) } }
    if (k.status === 'fulfilled') setContas(k.value || [])
    else { ok = false; if (!silencioso) { setContas([]); setErro(k.reason.message) } }
    if (ok) setErro(null)
    return ok
  }, [guarda])

  React.useEffect(() => { carregar() }, [carregar])
  // Conta criada, renomeada, desativada ou com função nova (aqui ou em outra sessão): relê em silêncio.
  useSincronizar(DOMINIOS_VISTAS.equipe, async () => { if (!(await carregar({ silencioso: true }))) throw new Error('equipe') })
  const tentarDeNovo = React.useCallback(() => carregar(), [carregar])

  const funcoes = (config && config.funcoes) || []
  const lista = contas || []

  return (
    <div className="og-embutida">
      {erro && <Erro texto={erro} onTentar={tentarDeNovo} />}

      {secao === 'equipe' && <div className="ui-grade-duas">
        <Secao
          titulo="Usuários da equipe"
          nota="Cada pessoa assina o que faz."
          acoes={<Botao icone="mais" onClick={() => setFolha({ tipo: 'nova' })}>Adicionar pessoa</Botao>}
        >
          {!erro && contas === null && <Carregando linhas={3} />}
          {!erro && contas && lista.length === 0 && (
            <Vazio titulo="Ninguém com conta própria ainda">Comece por você, como administrador.</Vazio>
          )}
          {lista.length > 0 && (
            <ul className="og-lista og-lista--tabela">
              {lista.map((c) => (
                <li key={c.user_id}>
                  <button type="button" className="og-item og-item--avatar" onClick={() => setFolha({ tipo: 'conta', conta: c })}>
                    <Avatar id={c.user_id} rotulo={c.nome || loginDaConta(c.email)} tamanho={36} />
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

      <FolhaNovaConta aberto={!!folha && folha.tipo === 'nova'} funcoes={funcoes} onFechar={() => setFolha(null)} />
      <FolhaConta
        aberto={!!folha && folha.tipo === 'conta'}
        conta={folha && folha.tipo === 'conta' ? lista.find((x) => x.user_id === folha.conta.user_id) || folha.conta : null}
        funcoes={funcoes}
        onFechar={() => setFolha(null)}
        onVerHistorico={(id) => {
          setFolha(null)
          navegar({ vista: 'admin', aba: 'historico', filtros: { ator: id } })
        }}
      />
    </div>
  )
}
