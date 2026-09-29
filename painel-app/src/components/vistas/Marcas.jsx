import React from 'react'
import { rpc, chamarFuncao } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { dataHoraCurta, preco, prazoSelo } from '../../lib/painelFormat'
import { COR_CADASTRO, ROTULO_SESSAO, RECADO_MANUAL, slugPrevisto, resumoParticipante } from '../../lib/participantes'
import { rotuloStatus, tempoRelativo } from '../../lib/central'
import { rotulo } from '../../lib/status'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Folha } from '../Folha'
import { Credenciais } from '../Credenciais'
import { Conversa } from '../Conversa'
import { Atividade } from '../Atividade'
import { Carregando, Vazio, Erro, Secao, Abas, traduzirErro } from '../ui'
import { AbaOperacao, AbaTrajetoria } from './FichaOperacao'
import { AbaCadastro } from './FichaCadastro'
import { ROTULO_HISTORICO } from '../../lib/operacao'

// Compara nomes sem acento, caixa ou pontuação (mesma regra do banco).
const compacto = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '').replace(/&/g, 'e').replace(/[^a-z0-9]+/g, '')

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

function Linha({ rotulo, valor }) {
  if (!valor) return null
  return <div className="ui-dado"><dt>{rotulo}</dt><dd>{valor}</dd></div>
}

function restricoes(i) {
  return [i.vegano ? 'vegano' : '', i.sem_gluten ? 'sem glúten' : '', i.sem_lactose ? 'sem lactose' : ''].filter(Boolean).join(' · ')
}

/* ── Aba "Mensagens": conversa com a marca ───────────────────────────────── */
function AbaMensagens({ participante, pode, onLidas }) {
  const [msgs, setMsgs] = React.useState([])
  const [carregando, setCarregando] = React.useState(true)
  const [erro, setErro] = React.useState(null)
  // Ref: o pai recria a função a cada render, e ela não pode reiniciar a busca.
  const lidasRef = React.useRef(onLidas)
  lidasRef.current = onLidas

  const carregar = React.useCallback(async () => {
    try {
      const l = await rpc('get_mensagens', { p_secret: lerSenha(), p_participante: participante.id })
      setMsgs(l || [])
      setErro(null)
      // Abrir a conversa é ler: marca as mensagens da marca como lidas.
      if ((l || []).some((m) => m.de === 'marca' && !m.lida_em)) {
        await rpc('ler_mensagens_org', { p_secret: lerSenha(), p_participante: participante.id })
        if (lidasRef.current) lidasRef.current()
      }
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [participante.id])

  React.useEffect(() => {
    carregar()
    const t = setInterval(() => { if (document.visibilityState === 'visible') carregar() }, 20000)
    return () => clearInterval(t)
  }, [carregar])

  async function enviar(corpo) {
    await rpc('enviar_mensagem', { p_secret: lerSenha(), p_participante: participante.id, p_corpo: corpo })
    await carregar()
  }

  return (
    <Conversa
      mensagens={msgs} lado="organizacao" rotuloOutro={participante.nome_marca}
      carregando={carregando} erro={erro} onTentar={carregar}
      onEnviar={enviar}
      podeEnviar={pode('mensagem.enviar') && !!participante.user_id}
      semPermissao={!participante.user_id ? 'A marca ainda não tem acesso ao painel: crie o acesso para poder conversar por aqui.' : 'Sua função só lê as mensagens.'}
    />
  )
}

/* ── Aba "Histórico": quem fez o quê + observações internas ──────────────── */
function AbaHistorico({ participante, pode }) {
  const [linhas, setLinhas] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [texto, setTexto] = React.useState('')
  const [salvando, setSalvando] = React.useState(false)
  const [avisoObs, setAvisoObs] = React.useState(null)
  const [filtro, setFiltro] = React.useState('')

  const carregar = React.useCallback(async () => {
    setErro(null)
    try {
      setLinhas((await rpc('get_atividade', { p_secret: lerSenha(), p_participante: participante.id, p_limite: 300 })) || [])
    } catch (e) {
      setErro(e.message)
    }
  }, [participante.id])
  React.useEffect(() => { carregar() }, [carregar])

  async function salvarObs(ev) {
    ev.preventDefault()
    if (!texto.trim()) return
    setSalvando(true)
    setAvisoObs(null)
    try {
      await rpc('adicionar_observacao', { p_secret: lerSenha(), p_participante: participante.id, p_texto: texto.trim() })
      setTexto('')
      await carregar()
    } catch (e) {
      setAvisoObs(traduzirErro(e.message))
    } finally {
      setSalvando(false)
    }
  }

  const visiveis = (linhas || []).filter((a) => !filtro || (filtro === 'observacao' ? a.acao === 'observacao' : a.acao !== 'observacao'))

  return (
    <div className="ui-pilha">
      {pode('triagem.editar') ? (
        <form className="ui-form-linha" onSubmit={salvarObs}>
          <label className="og-campo">
            <span>Observação interna</span>
            <textarea rows={2} placeholder="Ex.: informou por telefone que envia a foto nova amanhã. Só a equipe vê." value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} />
          </label>
          <button className="og-btn og-btn--mini" type="submit" disabled={salvando || !texto.trim()}>{salvando ? 'Salvando…' : 'Registrar observação'}</button>
          {avisoObs && <p className="ui-nota ui-nota--erro" role="alert">{avisoObs}</p>}
        </form>
      ) : <p className="ui-nota">Sua função lê o histórico, mas não registra observação.</p>}

      <div className="ui-filtros-mini" role="group" aria-label="Filtrar histórico">
        {[['', 'Tudo'], ['observacao', 'Só observações'], ['acoes', 'Só ações']].map(([v, r]) => (
          <button key={v} type="button" className="ui-chip" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>{r}</button>
        ))}
      </div>

      {erro && <Erro texto={erro} onTentar={carregar} />}
      {!erro && linhas === null && <Carregando linhas={4} />}
      {!erro && linhas && visiveis.length === 0 && <Vazio titulo="Nada registrado ainda">As mudanças de status, mensagens, pedidos e observações desta marca aparecem aqui, com quem fez e quando.</Vazio>}
      {!erro && linhas && visiveis.length > 0 && <Atividade linhas={visiveis} comMarca={false} />}
    </div>
  )
}

/* ── Aba "Acesso": gerar senha nova para a marca ─────────────────────────── */
function AbaAcesso({ participante, pode, onMudou, onFechar }) {
  const [gerando, setGerando] = React.useState(false)
  const [erro, setErro] = React.useState(null)
  const [cred, setCred] = React.useState(null)

  // Estabelecimento que já existe (ex.: importado da planilha da edição): a
  // conta se liga A ELE, em vez de nascer uma marca nova com o mesmo nome.
  async function criarParaExistente() {
    if (!window.confirm('Criar o acesso de ' + participante.nome_marca + '?\n\nO login vai ser o nome do estabelecimento e a senha aparece UMA VEZ, aqui.')) return
    setGerando(true)
    setErro(null)
    try {
      const r = await chamarFuncao('criar-acesso-marca', { secret: lerSenha(), participante_id: participante.id })
      if (!r || !r.senha) throw new Error('a função não devolveu as credenciais.')
      setCred({ login: r.login, senha: r.senha })
      onMudou && onMudou()
    } catch (e) {
      const c = e.dados && e.dados.erro
      setErro(['origem_obrigatoria', 'entrada_ambigua'].includes(c)
        ? 'A função de criar acesso ainda não foi atualizada no servidor para marcas importadas. Publique a Edge Function criar-acesso-marca.'
        : RECADO_MANUAL[c] || traduzirErro(c || e.message))
    } finally {
      setGerando(false)
    }
  }

  async function gerar() {
    if (!window.confirm('Gerar uma senha nova para ' + participante.nome_marca + '?\n\nA senha atual deixa de valer agora. A nova aparece UMA VEZ, aqui na tela.')) return
    setGerando(true)
    setErro(null)
    try {
      const r = await chamarFuncao('regerar-senha-conta', { secret: lerSenha(), participante_id: participante.id })
      if (!r || !r.senha) throw new Error('a função não devolveu a senha.')
      setCred({ login: r.login, senha: r.senha })
    } catch (e) {
      const c = e.dados && e.dados.erro
      setErro(c === 'user_id_ausente'
        ? 'A função de senha ainda não foi atualizada no servidor para contas de marca. Publique a Edge Function regerar-senha-conta.'
        : traduzirErro(c || e.message))
    } finally {
      setGerando(false)
    }
  }

  const arquivar = pode('cadastro.editar') && (
    <Secao titulo={participante.arquivado_em ? 'Marca arquivada' : 'Arquivar marca'}
      nota={participante.arquivado_em ? 'Fora das listas desde ' + dataCurta(participante.arquivado_em) + '. Restaurar devolve tudo como estava.' : 'Tira a marca das listas sem apagar nada: cadastro, fotos e histórico ficam guardados.'}>
      <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={gerando} onClick={async () => {
        const vai = !participante.arquivado_em
        if (vai && !window.confirm('Arquivar ' + participante.nome_marca + '? Ela sai das listas; dá para restaurar depois.')) return
        setErro(null)
        // A marca sai da lista em que está: a ficha fecha (e o endereço perde o item).
        try { await rpc('org_arquivar_participante', { p_secret: lerSenha(), p_participante: participante.id, p_arquivar: vai }); onFechar && onFechar(); onMudou && onMudou() }
        catch (e) { setErro(traduzirErro(e.message)) }
      }}>{participante.arquivado_em ? 'Restaurar marca' : 'Arquivar marca'}</button>
    </Secao>
  )

  if (!participante.user_id) {
    return (
      <div className="ui-pilha">
      <Secao titulo="Sem acesso criado" nota="A marca ainda não entra no painel. Ao criar, o login é o nome do estabelecimento e a senha aparece uma vez, para você entregar por WhatsApp.">
        {cred
          ? <Credenciais nomeMarca={participante.nome_marca} telefone={participante.telefone} login={cred.login} senha={cred.senha} />
          : <button className="og-btn og-btn--mini" type="button" disabled={gerando || !pode('marca.liberar')} onClick={criarParaExistente}>{gerando ? 'Criando…' : 'Criar acesso para esta marca'}</button>}
        {!pode('marca.liberar') && <p className="ui-nota">Sua função não libera acesso de marca.</p>}
        {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
      </Secao>
      {arquivar}
      </div>
    )
  }
  return (
    <div className="ui-pilha">
      <Secao titulo="Login" nota="A marca entra pelo nome do estabelecimento.">
        <dl className="ui-dados"><Linha rotulo="Login" valor={participante.nome_marca} /></dl>
      </Secao>
      <Secao titulo="Esqueceu a senha?" nota="O login da marca não recebe e-mail. Gere uma senha nova e entregue por WhatsApp: no primeiro acesso ela é obrigada a trocar.">
        {cred
          ? <Credenciais nomeMarca={participante.nome_marca} telefone={participante.telefone} login={cred.login} senha={cred.senha} />
          : <button className="og-btn og-btn--mini" type="button" disabled={gerando || !pode('marca.liberar')} onClick={gerar}>{gerando ? 'Gerando…' : 'Gerar senha nova'}</button>}
        {!pode('marca.liberar') && <p className="ui-nota">Sua função não libera acesso de marca.</p>}
        {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
      </Secao>
      {arquivar}
    </div>
  )
}

/* ── A ficha (folha larga com abas) ──────────────────────────────────────── */
const ABAS_FICHA = ['cadastro', 'operacao', 'mensagens', 'trajetoria', 'historico', 'acesso']

// A aba da ficha mora no endereço (`sub`): o link de um aviso abre direto nela.
function FichaMarca({ participante, aba: abaPedida, onAba, pode, onFechar, naoLidas, onLidas, onMudou }) {
  const aba = ABAS_FICHA.includes(abaPedida) ? abaPedida : 'cadastro'
  const setAba = onAba
  const p = participante
  return (
    <Folha
      aberto={!!p}
      larga
      titulo={p ? p.nome_marca || '(sem nome)' : ''}
      sub={p ? [p.edicao_codigo && 'Edição ' + p.edicao_codigo, rotuloStatus(p.status_cadastro), ROTULO_HISTORICO[p.historico_status]].filter(Boolean).join(' · ') : ''}
      onFechar={onFechar}
    >
      {p && (
        <>
          <Abas
            rotulo="Seções da ficha"
            ativa={aba}
            onMudar={setAba}
            abas={[
              { chave: 'cadastro', rotulo: 'Cadastro' },
              { chave: 'operacao', rotulo: 'Operação', n: Number(p.pendencias || 0) },
              { chave: 'mensagens', rotulo: 'Mensagens', n: naoLidas },
              { chave: 'trajetoria', rotulo: 'Trajetória' },
              { chave: 'historico', rotulo: 'Histórico' },
              { chave: 'acesso', rotulo: 'Acesso' },
            ]}
          />
          <div role="tabpanel" className="ui-painel-aba">
            {aba === 'cadastro' && <AbaCadastro participante={p} pode={pode} onMudou={onMudou} />}
            {aba === 'operacao' && <AbaOperacao participante={p} pode={pode} />}
            {aba === 'trajetoria' && <AbaTrajetoria participante={p} pode={pode} onMudou={onMudou} />}
            {aba === 'mensagens' && <AbaMensagens participante={p} pode={pode} onLidas={onLidas} />}
            {aba === 'historico' && <AbaHistorico participante={p} pode={pode} />}
            {aba === 'acesso' && <AbaAcesso participante={p} pode={pode} onMudou={onMudou} onFechar={onFechar} />}
          </div>
        </>
      )}
    </Folha>
  )
}

/* ── Cadastro manual ─────────────────────────────────────────────────────── */
function FolhaCadastroManual({ aberto, pode, onFechar, onCriada, existentes = [] }) {
  const [nome, setNome] = React.useState('')
  const [telefone, setTelefone] = React.useState('')
  const [responsavel, setResponsavel] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [aviso, setAviso] = React.useState(null)
  const [criando, setCriando] = React.useState(false)
  const [cred, setCred] = React.useState(null)

  React.useEffect(() => {
    if (!aberto) return
    setNome(''); setTelefone(''); setResponsavel(''); setEmail(''); setAviso(null); setCriando(false); setCred(null)
  }, [aberto])

  // Marca com esse nome já cadastrada (ex.: importada da planilha): o certo é
  // criar o acesso NELA, pela ficha — senão nasce um segundo estabelecimento.
  // Depois de criar, a própria marca nova entra em `existentes`: sem o `!cred`
  // a tela acusaria "já cadastrada" ao lado das credenciais que acabou de dar.
  const jaExiste = !cred && nome.trim().length > 2 && existentes.find((p) => compacto(p.nome_marca) === compacto(nome))

  async function criarMarcaManual(ev) {
    ev.preventDefault()
    if (!nome.trim()) { setAviso('Escreva o nome do estabelecimento.'); return }
    if (jaExiste) { setAviso('Já existe uma marca com esse nome. Abra a ficha dela em Marcas e use Acesso → Criar acesso.'); return }
    if (!telefone.trim()) { setAviso('O telefone é como você entrega o acesso.'); return }
    setCriando(true)
    setAviso(null)
    try {
      const r = await chamarFuncao('criar-acesso-marca', {
        secret: lerSenha(),
        marca: { nome: nome.trim(), telefone: telefone.trim(), responsavel: responsavel.trim(), email: email.trim() },
      })
      if (!r || !r.login || !r.senha) throw new Error('a função não devolveu as credenciais.')
      setCred({ login: r.login, senha: r.senha })
      await onCriada()
    } catch (e) {
      const codigo = e.dados && e.dados.erro
      let recado = RECADO_MANUAL[codigo] || ('Não criou: ' + traduzirErro(e.message))
      if (codigo === 'existe_candidatura') recado += ' Abra a ficha dela em "Respostas" e use Criar acesso: assim a candidatura fica ligada à conta.'
      setAviso(recado)
    } finally {
      setCriando(false)
    }
  }

  return (
    <Folha aberto={aberto} titulo="Cadastrar marca" sub="Para quem você convidou sem passar pelo formulário" onFechar={onFechar}>
      <form className="ui-form" onSubmit={criarMarcaManual} noValidate>
        <p className="ui-nota">A conta nasce agora, com login e senha. Nome e telefone são obrigatórios: um vira o login, o outro é o botão do WhatsApp.</p>
        <label className="og-campo"><span>Nome do estabelecimento <abbr title="obrigatório">*</abbr></span>
          <input type="text" autoComplete="off" required disabled={!!cred} value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <p className="ui-nota">O login vai ser: <b>{slugPrevisto(nome) || '…'}</b></p>
        {jaExiste && <p className="ui-nota ui-nota--erro" role="alert">“{jaExiste.nome_marca}” já está cadastrada{jaExiste.user_id ? ' e tem acesso' : ''}. Abra a ficha dela para criar ou regerar o acesso.</p>}
        <label className="og-campo"><span>Telefone (WhatsApp) <abbr title="obrigatório">*</abbr></span>
          <input type="tel" inputMode="tel" autoComplete="off" required disabled={!!cred} placeholder="(84) 90000-0000" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </label>
        <label className="og-campo"><span>Responsável <em>(opcional)</em></span>
          <input type="text" autoComplete="off" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
        </label>
        <label className="og-campo"><span>E-mail <em>(opcional)</em></span>
          <input type="email" autoComplete="off" placeholder="contato@marca.com.br" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {aviso && <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>}
        {cred && <Credenciais nomeMarca={nome} telefone={telefone} login={cred.login} senha={cred.senha} />}
        {!cred && (
          <button className="og-btn" type="submit" disabled={criando || !pode('marca.liberar') || !!jaExiste}>
            {criando ? 'Criando…' : 'Criar marca e acesso'}
          </button>
        )}
      </form>
    </Folha>
  )
}

/* ── A vista ─────────────────────────────────────────────────────────────── */
const ORDENS = {
  recentes: (a, b) => new Date(b.created_at) - new Date(a.created_at),
  nome: (a, b) => (a.nome_marca || '').localeCompare(b.nome_marca || '', 'pt-BR'),
  mensagens: (a, b) => (b._naoLidas || 0) - (a._naoLidas || 0) || new Date(b._ultimaMsg || 0) - new Date(a._ultimaMsg || 0),
}

export function Marcas({ registrarAtualizar, pode = () => true, rota, navegar }) {
  const [participantes, setParticipantes] = React.useState(null)
  const [conversas, setConversas] = React.useState([])
  const [erro, setErro] = React.useState(null)
  const [termo, setTermo] = React.useState('')
  const [cadastroAberto, setCadastroAberto] = React.useState(false)
  // Filtros e ficha aberta moram no endereço (reestruturação 29/09/2026):
  // um contador da Visão geral chega aqui já filtrado, e Voltar fecha a ficha.
  const f = rota.filtros
  const status = f.situacao || ''
  const ordem = f.ordem || 'recentes'
  const ficha = f.item ? { id: f.item, aba: f.sub } : null
  const mudar = (novos, substituir = true) => navegar({ filtros: { ...f, ...novos } }, { substituir })
  const setStatus = (v) => mudar({ situacao: v })
  const setOrdem = (v) => mudar({ ordem: v === 'recentes' ? '' : v })
  // Arquivadas é outra leitura (o banco só devolve arquivadas quando pedidas).
  const arquivadas = status === 'arquivadas'
  const setFicha = (x) => mudar(x ? { item: x.id, sub: x.aba && x.aba !== 'cadastro' ? x.aba : '' } : { item: '', sub: '' }, false)

  const carregar = React.useCallback(async () => {
    setErro(null)
    const senha = lerSenha()
    try {
      // admin_ping junto: RPC de leitura não dá erro com senha inválida, só
      // devolve vazio — sem isso, sessão vencida pareceria "nenhuma marca".
      const [valida, lista] = await Promise.all([
        rpc('admin_ping', { p_secret: senha }),
        rpc('get_participantes', { p_secret: senha, p_arquivados: arquivadas }),
      ])
      if (valida !== true) { setErro('A senha desta sessão não vale mais. Saia e entre de novo.'); return }
      setParticipantes(lista || [])
    } catch (e) {
      setErro(e.message)
    }
    // Leitura à parte: conversas não podem derrubar a lista (§10.4-b).
    try { setConversas((await rpc('get_conversas', { p_secret: senha })) || []) } catch { setConversas([]) }
  }, [arquivadas])

  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])

  const porMarca = React.useMemo(() => Object.fromEntries(conversas.map((c) => [c.participante_id, c])), [conversas])
  const lista = React.useMemo(() => {
    const t = termo.trim().toLowerCase()
    return (participantes || [])
      .map((p) => ({ ...p, _naoLidas: Number((porMarca[p.id] || {}).nao_lidas || 0), _ultimaMsg: (porMarca[p.id] || {}).ultima_em }))
      .filter((p) => !t || [p.nome_marca, p.responsavel, p.email, p.telefone].filter(Boolean).join(' ').toLowerCase().includes(t))
      .filter((p) => !f.edicao || p.edicao_codigo === f.edicao)
      .filter((p) => !status || status === 'arquivadas' || (status === 'mensagens' ? p._naoLidas > 0
        : status === 'pendencias' ? Number(p.pendencias) > 0
        : status === 'sem_conta' ? !p.user_id
        : status === 'com_conta' ? !!p.user_id
        : status === 'possivel' ? p.historico_status === 'possivel_correspondencia'
        : p.status_cadastro === status))
      .sort(ORDENS[ordem])
  }, [participantes, porMarca, termo, status, ordem, f.edicao])

  const participanteFicha = ficha && (participantes || []).find((p) => p.id === ficha.id)
  const totalNaoLidas = conversas.reduce((s, c) => s + Number(c.nao_lidas || 0), 0)

  return (
    <div className="og-embutida">

      <div className="ui-barra">
        <div className="og-filtros">
          <label className="og-campo og-campo--busca"><span>Buscar</span>
            <input type="search" placeholder="marca, responsável, e-mail ou telefone" value={termo} onChange={(e) => setTermo(e.target.value)} />
          </label>
          <label className="og-campo"><span>Situação</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todas</option>
              <option value="mensagens">Com mensagem não lida{totalNaoLidas ? ' (' + totalNaoLidas + ')' : ''}</option>
              <option value="pendencias">Com dado para revisar</option>
              <option value="possivel">Possível participação anterior</option>
              <option value="com_conta">Com acesso ao painel</option>
              <option value="sem_conta">Sem acesso ao painel</option>
              <option value="aguardando_cadastro">Aguardando cadastro</option>
              <option value="em_preenchimento">Em preenchimento</option>
              <option value="cadastro_completo">Cadastro completo</option>
              <option value="sem_participacao">Sem edição aberta</option>
              <option value="arquivadas">Arquivadas</option>
            </select>
          </label>
          <label className="og-campo"><span>Ordenar</span>
            <select value={ordem} onChange={(e) => setOrdem(e.target.value)}>
              <option value="recentes">Mais recentes</option>
              <option value="nome">Nome (A–Z)</option>
              <option value="mensagens">Mensagens</option>
            </select>
          </label>
        </div>
        <button className="og-btn" type="button" disabled={!pode('marca.liberar')} onClick={() => setCadastroAberto(true)}>Cadastrar marca</button>
      </div>
      {f.edicao && (
        <p className="ui-filtro-ativo">Só a edição {f.edicao} <button type="button" className="og-btn og-btn--mini og-btn--vazado" onClick={() => mudar({ edicao: '' })}>Ver todas</button></p>
      )}
      {!pode('marca.liberar') && <p className="ui-nota">Sua função não cadastra marca.</p>}

      {erro && <Erro texto={erro} onTentar={carregar} />}
      {!erro && participantes === null && <Carregando />}
      {!erro && participantes && participantes.length === 0 && (
        <Vazio titulo="Nenhuma marca ainda">
          <p>Há dois caminhos: aprovar uma candidatura do "Quero participar" e usar <b>Criar acesso</b> na ficha dela, em Respostas, ou cadastrar a marca direto aqui, em <b>Cadastrar marca</b>.</p>
          <p>Nos dois casos o login é o nome do estabelecimento e a senha aparece uma vez, para você entregar.</p>
        </Vazio>
      )}
      {!erro && participantes && participantes.length > 0 && lista.length === 0 && <Vazio titulo="Nenhuma marca com esses filtros" />}
      {!erro && lista.length > 0 && (
        <>
          <p className="ui-contagem">{lista.length} {lista.length === 1 ? 'marca' : 'marcas'}</p>
          <ul className="og-lista og-lista--tabela">
            {lista.map((p) => (
              <li key={p.id}>
                <button type="button" className="og-item" onClick={() => setFicha({ id: p.id, aba: p._naoLidas ? 'mensagens' : 'cadastro' })}>
                  <span className="og-item__cor" style={{ background: COR_CADASTRO[p.status_cadastro] || 'var(--scw-marrom)' }} aria-hidden="true" />
                  <span className="og-item__nome">{p.nome_marca || '(sem nome)'}</span>
                  <span className="og-item__meta">{resumoParticipante(p)}</span>
                  <span className="og-item__dir">
                    {p._naoLidas > 0 && <span className="og-selo" data-tom="alerta">{p._naoLidas} {p._naoLidas === 1 ? 'mensagem nova' : 'mensagens novas'}</span>}
                    {Number(p.pendencias) > 0 && <span className="og-selo" data-tom="revisar">{p.pendencias} para revisar</span>}
                    {p.historico_status === 'recorrente_confirmado' && <span className="og-selo" data-tom="recorrente">recorrente</span>}
                    {p.historico_status === 'possivel_correspondencia' && <span className="og-selo" data-tom="revisar">já participou?</span>}
                    {!p.user_id && <span className="og-selo" data-tom="neutro">sem acesso</span>}
                    <span className="og-selo" data-acesso={p.status_cadastro}>{rotuloStatus(p.status_cadastro)}</span>
                    <span className="og-item__data">{dataCurta(p.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <FichaMarca
        participante={participanteFicha}
        aba={ficha && ficha.aba}
        onAba={(a) => mudar({ sub: a === 'cadastro' ? '' : a })}
        pode={pode}
        naoLidas={participanteFicha ? Number((porMarca[participanteFicha.id] || {}).nao_lidas || 0) : 0}
        onLidas={() => rpc('get_conversas', { p_secret: lerSenha() }).then((c) => setConversas(c || [])).catch(() => {})}
        onFechar={() => setFicha(null)}
        onMudou={carregar}
      />
      <FolhaCadastroManual aberto={cadastroAberto} pode={pode} existentes={participantes || []} onFechar={() => setCadastroAberto(false)} onCriada={carregar} />
    </div>
  )
}
