import React from 'react'
import { rpc, chamarFuncao } from '../../lib/rpc'
import {
  ORIGENS, filtrados, dataCurta, camposDetalhe,
  ROTULO_STATUS, RECADO_APAGAR, RECADO_ACESSO,
} from '../../lib/respostas'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { VistaCabeca } from '../VistaCabeca'
import { Folha } from '../Folha'
import { Credenciais } from '../Credenciais'
import { ICONE } from '../PainelShell'

// Desarme automático do botão de apagar — dois toques, não `confirm()`: o
// diálogo nativo quebra a casca de app. 6s é o mesmo tempo da versão
// estática (public/organizacao/index.html, apagarRegistro).
const APAGAR_TIMEOUT = 6000

// A ficha de uma resposta: campos do formulário, triagem (status + nota),
// acesso da marca (só quero_participar) e apagar. Porta fiel do
// abrirDetalhe()/salvar()/apagarRegistro()/criarAcesso() da versão estática
// — CLAUDE.md §5.3, restaurado no corte para React (era perda real, não
// decisão de design).
function DetalheResposta({ origem, reg, onAtualizado, onApagado }) {
  const o = ORIGENS[origem]
  const [status, setStatus] = React.useState(reg.status)
  const [nota, setNota] = React.useState(reg.internal_notes || '')
  const [salvando, setSalvando] = React.useState(false)
  const [avisoSalvar, setAvisoSalvar] = React.useState(null) // { tom, texto }

  const [armado, setArmado] = React.useState(false)
  const [apagando, setApagando] = React.useState(false)
  const [avisoApagar, setAvisoApagar] = React.useState(null)
  const temporizador = React.useRef(null)

  const [criandoAcesso, setCriandoAcesso] = React.useState(false)
  const [avisoAcesso, setAvisoAcesso] = React.useState(null)
  const [credenciais, setCredenciais] = React.useState(null)

  React.useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current) }, [])

  function desarmarApagar() {
    if (temporizador.current) { clearTimeout(temporizador.current); temporizador.current = null }
    setArmado(false)
  }

  async function salvar() {
    setSalvando(true)
    setAvisoSalvar(null)
    const senha = sessionStorage.getItem(CHAVE_SESSAO) || ''
    try {
      const ok = await rpc('organizacao_atualizar_registro', {
        p_secret: senha, p_origem: origem, p_id: reg.id, p_status: status, p_nota: nota,
      })
      if (ok !== true) throw new Error('O servidor não confirmou a gravação.')
      onAtualizado({ ...reg, status, internal_notes: nota })
      setAvisoSalvar({ tom: 'ok', texto: 'Salvo.' })
    } catch (e) {
      // O que a pessoa escreveu continua na tela — erro de rede não apaga texto.
      setAvisoSalvar({ tom: 'erro', texto: 'Não salvou: ' + e.message + ' O texto continua aqui, tente de novo.' })
    } finally {
      setSalvando(false)
    }
  }

  async function apagar() {
    if (!armado) {
      setArmado(true)
      setAvisoApagar({ tom: 'erro', texto: 'Toque de novo para apagar de vez. Some sozinho em 6 segundos.' })
      temporizador.current = setTimeout(desarmarApagar, APAGAR_TIMEOUT)
      return
    }
    desarmarApagar()
    setApagando(true)
    const senha = sessionStorage.getItem(CHAVE_SESSAO) || ''
    try {
      const r = await rpc('organizacao_apagar_registro', { p_secret: senha, p_origem: origem, p_id: reg.id })
      // Mesma regra da gravação: nada é afirmado antes do servidor confirmar.
      if (!r || r.ok !== true) throw new Error(RECADO_APAGAR[r && r.erro] || 'O servidor não confirmou a exclusão.')
      setAvisoApagar({ tom: 'ok', texto: 'Apagado.' })
      // A ficha fecha depois da mensagem aparecer: sumir na hora deixa a
      // dúvida de se apagou mesmo ou se a tela só fechou.
      setTimeout(() => onApagado(reg.id), 700)
    } catch (e) {
      setAvisoApagar({ tom: 'erro', texto: e.message })
      setApagando(false)
    }
  }

  async function criarAcesso() {
    const alvo = reg.empresa || reg.nome || 'esta marca'
    // Confirmação porque a conta nasce agora e o login fica preso ao nome do
    // estabelecimento: trocar depois é apagar e refazer.
    if (!window.confirm('Criar a conta de ' + alvo + '?\n\nA senha aparece UMA VEZ SÓ, aqui na tela. Tenha o WhatsApp à mão.')) return
    setCriandoAcesso(true)
    setAvisoAcesso(null)
    const senha = sessionStorage.getItem(CHAVE_SESSAO) || ''
    try {
      const r = await chamarFuncao('criar-acesso-marca', { secret: senha, origem_id: reg.id })
      if (!r || !r.login || !r.senha) throw new Error('a função não devolveu as credenciais.')
      setAvisoAcesso({ tom: 'ok', texto: 'Acesso criado. Copie ou envie agora.' })
      setCredenciais({ login: r.login, senha: r.senha })
    } catch (e) {
      const codigo = e.dados && e.dados.erro
      setAvisoAcesso({ tom: 'erro', texto: RECADO_ACESSO[codigo] || ('Não criou: ' + e.message) })
    } finally {
      setCriandoAcesso(false)
    }
  }

  const naoAprovado = reg.status !== 'aprovado' && reg.status !== 'aguardando_cadastro'

  return (
    <>
      <dl className="og-campos">
        {camposDetalhe(origem, reg).map(([rot, val]) => (
          <div key={rot}><dt>{rot}</dt><dd>{val}</dd></div>
        ))}
      </dl>

      <div className="og-bloco" style={{ borderTop: 0, paddingTop: 0 }}>
        <h3>Triagem</h3>
        <label className="og-campo">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {o.status.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s] || s}</option>)}
          </select>
        </label>
        <label className="og-campo">
          <span>Nota interna</span>
          <textarea placeholder="Só a equipe vê." value={nota} onChange={(e) => setNota(e.target.value)} />
        </label>
        {avisoSalvar && <div className="og-aviso" data-tom={avisoSalvar.tom}>{avisoSalvar.texto}</div>}
        <button className="og-btn" type="button" disabled={salvando} onClick={salvar}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {origem === 'quero_participar' && (
        <div className="og-bloco">
          <h3>Acesso da marca</h3>
          {credenciais ? (
            <>
              {avisoAcesso && <div className="og-aviso" data-tom={avisoAcesso.tom}>{avisoAcesso.texto}</div>}
              <Credenciais nomeMarca={reg.empresa || reg.nome} telefone={reg.telefone} login={credenciais.login} senha={credenciais.senha} />
            </>
          ) : (
            <>
              <p className="og-forms__nota">Cria a conta de <b>{reg.empresa || reg.nome || 'esta marca'}</b>. O
                {' '}<b>login é o nome do estabelecimento</b> e a senha é gerada forte, na hora. Ela aparece
                {' '}<b>uma vez só</b> nesta tela: depois não há como ver de novo.</p>
              {naoAprovado && <p className="og-forms__nota">Marque o status como <b>Aprovado</b> antes de criar o acesso.</p>}
              {avisoAcesso && <div className="og-aviso" data-tom={avisoAcesso.tom}>{avisoAcesso.texto}</div>}
              <button className="og-btn" type="button" disabled={naoAprovado || criandoAcesso} onClick={criarAcesso}>
                {criandoAcesso ? 'Criando…' : 'Criar acesso'}
              </button>
            </>
          )}
        </div>
      )}

      <div className="og-bloco og-risco">
        <h3>Apagar</h3>
        <p className="og-forms__nota">Tira a resposta do banco de vez. <b>Não tem desfazer</b>: o histórico
          guarda que houve exclusão, não o que foi apagado.</p>
        {avisoApagar && <div className="og-aviso" data-tom={avisoApagar.tom}>{avisoApagar.texto}</div>}
        <div className="og-risco__acoes">
          <button className="og-btn og-btn--vazado" type="button" disabled={apagando} onClick={apagar}>
            {apagando ? 'Apagando…' : armado ? 'Confirmar exclusão' : 'Apagar este registro'}
          </button>
        </div>
      </div>
    </>
  )
}

export function Respostas({ registrarAtualizar, reportarEstado }) {
  const [dados, setDados] = React.useState(null) // null = carregando
  const [erro, setErro] = React.useState(null)
  const [aba, setAba] = React.useState('tudo')
  const [status, setStatus] = React.useState('')
  const [dias, setDias] = React.useState('')
  const [termo, setTermo] = React.useState('')
  const [selecionado, setSelecionado] = React.useState(null) // { origem, reg }

  const carregar = React.useCallback(async () => {
    setErro(null)
    const senha = sessionStorage.getItem(CHAVE_SESSAO) || ''
    const chaves = Object.keys(ORIGENS)
    try {
      const [valida, ...listas] = await Promise.all([
        rpc('admin_ping', { p_secret: senha }),
        ...chaves.map((k) => rpc(ORIGENS[k].rpc, { p_secret: senha })),
      ])
      if (valida !== true) {
        setErro('A senha desta sessão não vale mais. Saia e entre de novo.')
        return
      }
      const novo = {}
      chaves.forEach((k, i) => { novo[k] = listas[i] || [] })
      setDados(novo)
      // Alimenta o sino de notificações do cabeçalho (NotificacoesOrg vive no
      // PainelShell, que não tem como ler o estado interno desta vista).
      if (reportarEstado) reportarEstado({ dados: novo })
    } catch (e) {
      setErro(e.message)
    }
  }, [reportarEstado])

  React.useEffect(() => { carregar() }, [carregar])
  // Registra esta vista como dona do botão "atualizar" do cabeçalho
  // (PainelShell §Task 6) — sem isso o botão existiria e não faria nada.
  React.useEffect(() => {
    if (registrarAtualizar) registrarAtualizar(carregar)
  }, [registrarAtualizar, carregar])

  const vocabStatus = aba === 'tudo'
    ? [...new Set(Object.values(ORIGENS).flatMap((o) => o.status))]
    : ORIGENS[aba].status

  const itens = dados ? filtrados(dados, { aba, status, dias, termo }) : []
  const contagem = { tudo: 0 }
  Object.keys(ORIGENS).forEach((o) => { contagem[o] = (dados && dados[o] || []).length; contagem.tudo += contagem[o] })

  return (
    <section className="og-vista">
      <VistaCabeca
        acento="cyan"
        icone={ICONE.respostas}
        titulo="Respostas"
        nota="Os três formulários do site, num lugar só"
      />
      <ul className="og-abas" role="tablist">
        {[['tudo', 'Tudo', null], ...Object.entries(ORIGENS).map(([k, o]) => [k, o.rotulo, o.cor])].map(([chave, rotulo, cor]) => (
          <li key={chave}>
            <button
              type="button" role="tab" className="og-aba"
              aria-selected={aba === chave}
              onClick={() => { setAba(chave); setStatus('') }}
            >
              {cor && <span className="og-aba__ponto" style={{ background: cor }} />}
              {rotulo} <span className="og-aba__n">{contagem[chave] ?? 0}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="og-filtros">
        <label className="og-campo og-campo--busca">
          <span>Buscar</span>
          <input type="search" placeholder="nome, empresa ou e-mail" value={termo} onChange={(e) => setTermo(e.target.value)} />
        </label>
        <label className="og-campo">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {vocabStatus.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="og-campo">
          <span>Período</span>
          <select value={dias} onChange={(e) => setDias(e.target.value)}>
            <option value="">Sempre</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
        </label>
      </div>

      <div>
        {erro && (
          <div className="og-estado" data-tom="erro">
            <h2>Não consegui carregar</h2>
            <p>{erro}</p>
          </div>
        )}
        {!erro && dados && itens.length === 0 && (
          <div className="og-estado">
            <h2>Nenhuma resposta aqui</h2>
            <p>{contagem.tudo === 0 ? 'Ainda não chegou nenhuma resposta.' : 'Nada com esses filtros.'}</p>
          </div>
        )}
        {!erro && dados && itens.length > 0 && (
          <ul className="og-lista">
            {itens.map(({ origem, reg }) => {
              const o = ORIGENS[origem]
              return (
                <li key={origem + ':' + reg.id}>
                  <button type="button" className="og-item" onClick={() => setSelecionado({ origem, reg })}>
                    <span className="og-item__cor" style={{ background: o.cor }} />
                    {/* Sem escapar(): JSX já escapa texto interpolado sozinho —
                        aplicar escapar() aqui mostraria "Duart&#39;s" na tela em
                        vez de "Duart's" (escapar() existe pra innerHTML, que
                        nenhum componente React usa). */}
                    <p className="og-item__nome">{o.titulo(reg) || '(sem nome)'}</p>
                    <p className="og-item__meta">{o.rotulo + (o.meta(reg) ? ' · ' + o.meta(reg) : '')}</p>
                    <span className="og-item__dir">
                      <span className="og-selo" data-novo={reg.status === 'novo' ? '1' : '0'}>{reg.status}</span>
                      <span className="og-item__data">{dataCurta(reg.created_at)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Folha
        aberto={!!selecionado}
        titulo={selecionado ? (ORIGENS[selecionado.origem].titulo(selecionado.reg) || '(sem nome)') : ''}
        sub={selecionado ? ORIGENS[selecionado.origem].rotulo + ' · recebido em ' + new Date(selecionado.reg.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}
        onFechar={() => setSelecionado(null)}
      >
        {selecionado && (
          <DetalheResposta
            origem={selecionado.origem}
            reg={selecionado.reg}
            onAtualizado={(regNovo) => {
              setDados((d) => ({ ...d, [selecionado.origem]: d[selecionado.origem].map((r) => (r.id === regNovo.id ? regNovo : r)) }))
              setSelecionado((s) => (s ? { ...s, reg: regNovo } : s))
            }}
            onApagado={(id) => {
              setDados((d) => ({ ...d, [selecionado.origem]: d[selecionado.origem].filter((r) => r.id !== id) }))
              setSelecionado(null)
            }}
          />
        )}
      </Folha>
    </section>
  )
}

