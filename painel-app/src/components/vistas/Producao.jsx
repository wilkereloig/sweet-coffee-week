import React from 'react'
import { rpc, chamarFuncao } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { dataHoraCurta, prazoSelo } from '../../lib/painelFormat'
import { BLOCOS, ROTULO_SESSAO, montarAgendaGrade, nomeSeguro, isoDoCampo } from '../../lib/producao'
import { marcasParaOpcoes } from '../../lib/participantes'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { VistaCabeca } from '../VistaCabeca'
import { Folha } from '../Folha'
import { ICONE } from '../PainelShell'

/*
 * Vista Produção — porta fiel de public/painel/index.html: agenda de fotos
 * (montarAgenda/ajustarModoAgenda/abrirVagaAgenda/fecharVagaAgenda,
 * ~2630-2698), pedidos (abrirNovoPedido/criarPedido/publicarPedido/
 * abrirQuemFalta/marcarRespondido, ~3568-3676), arquivos (abrirNovoArquivo/
 * publicarArquivoNovo/baixarArquivo, ~3691-3780) e sessões de fotos
 * (abrirNovaSessao/criarSessao/abrirMudarSessao/salvarSessao, ~3821-3898).
 *
 * ⚠️ `abrirEnvioFoto`/`enviarFotoItem` (foto de item, ~3786-3818) NÃO foram
 * portados aqui: o único chamador é o botão `data-foto-item` dentro da FICHA
 * de uma marca (renderFichaParticipacao), que é conteúdo da vista Marcas —
 * e `Marcas.jsx` deixou esse botão de fora de propósito, esperando esta
 * vista existir (ver o comentário de `FichaCorpo` lá). Portar a ação aqui,
 * sem nenhum botão que a chame, seria código morto; falta ligar o botão na
 * ficha da marca, que é tarefa de quem tocar `Marcas.jsx` a seguir.
 */

function lerSenha() {
  return sessionStorage.getItem(CHAVE_SESSAO) || ''
}

function EstadoVazio({ titulo, texto }) {
  return (
    <div className="og-estado">
      <h2>{titulo}</h2>
      <p>{texto}</p>
    </div>
  )
}

function Prazo({ iso }) {
  const p = prazoSelo(iso)
  if (!p) return null
  return <span className="og-selo" data-acesso={p.tom || undefined}>{p.texto}</span>
}

// Título explicativo, mesmo texto nas 5 folhas — uma ação só governa a
// vista inteira (producao.gerir), então não há por que variar a frase.
const SEM_PERMISSAO_PRODUCAO = 'Sua função não gerencia produção'

/* ── Novo pedido ───────────────────────────────────────────────────────── */
function FolhaNovoPedido({ aberto, opcoesMarcas, marcaPadrao, edicaoAtual, podeGerir, onFechar, onCriado }) {
  const [titulo, setTitulo] = React.useState('')
  const [texto, setTexto] = React.useState('')
  const [escopo, setEscopo] = React.useState('geral')
  const [marca, setMarca] = React.useState(marcaPadrao)
  const [bloco, setBloco] = React.useState('livre')
  const [prazo, setPrazo] = React.useState('')
  const [aviso, setAviso] = React.useState(null)
  const [enviando, setEnviando] = React.useState(false)

  React.useEffect(() => {
    if (!aberto) return
    setTitulo(''); setTexto(''); setEscopo('geral'); setMarca(marcaPadrao)
    setBloco('livre'); setPrazo(''); setAviso(null); setEnviando(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  async function criar() {
    if (!titulo.trim() || !texto.trim()) {
      setAviso({ texto: 'Título e texto são obrigatórios.', tom: 'erro' })
      return
    }
    setEnviando(true)
    setAviso(null)
    try {
      await rpc('criar_solicitacao', {
        p_secret: lerSenha(),
        p_titulo: titulo.trim(), p_texto: texto.trim(), p_escopo: escopo,
        p_participacao: escopo === 'marca' ? marca : null,
        p_edicao: edicaoAtual || null,
        p_bloco: bloco,
        p_prazo: isoDoCampo(prazo),
      })
      // Nunca afirma antes do servidor confirmar: a linha acima ou gravou ou
      // lançou. Só depois dela a tela diz que existe.
      setAviso({ texto: 'Rascunho criado. Publique na lista para a marca ver.', tom: 'ok' })
      await onCriado()
    } catch (e) {
      setAviso({ texto: e.message, tom: 'erro' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Folha aberto={aberto} titulo="Novo pedido" sub="Aparece no painel da marca, com prazo" onFechar={onFechar}>
      <div className="og-bloco" style={{ borderTop: 0, paddingTop: 0 }}>
        <p className="og-forms__nota">
          Ele nasce como rascunho. Só ao publicar é que a marca passa a ver, e é aí que o
          prazo começa a valer para ela.
        </p>
        <label className="og-campo"><span>Título</span>
          <input type="text" autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </label>
        <label className="og-campo"><span>Texto</span>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
        <label className="og-campo"><span>Para quem</span>
          <select value={escopo} onChange={(e) => setEscopo(e.target.value)}>
            <option value="geral">Todas as marcas</option>
            <option value="marca">Uma marca só</option>
          </select>
        </label>
        {escopo === 'marca' && (
          <label className="og-campo"><span>Qual marca</span>
            <select value={marca} onChange={(e) => setMarca(e.target.value)}>
              {opcoesMarcas.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        )}
        <label className="og-campo"><span>Bloco do formulário</span>
          <select value={bloco} onChange={(e) => setBloco(e.target.value)}>
            {Object.entries(BLOCOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="og-campo"><span>Prazo <span className="og-forms__nota">(opcional)</span></span>
          <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </label>
        {aviso && <div className="og-aviso" data-tom={aviso.tom}>{aviso.texto}</div>}
        <button
          className="og-btn" type="button"
          disabled={enviando || !podeGerir}
          title={podeGerir ? undefined : SEM_PERMISSAO_PRODUCAO}
          onClick={criar}
        >
          Criar rascunho
        </button>
      </div>
    </Folha>
  )
}

/* ── Quem falta responder a um pedido ─────────────────────────────────── */
function FolhaQuemFalta({ aberto, solicitacao, podeGerir, onFechar, onRespondido }) {
  const [carregando, setCarregando] = React.useState(true)
  const [erro, setErro] = React.useState(null)
  const [lista, setLista] = React.useState([])
  const [erroAcao, setErroAcao] = React.useState(null)
  const [marcando, setMarcando] = React.useState(null)

  React.useEffect(() => {
    if (!solicitacao) return
    let ativo = true
    setCarregando(true); setErro(null); setLista([]); setErroAcao(null)
    rpc('get_pendentes_solicitacao', { p_secret: lerSenha(), p_id: solicitacao.id })
      .then((linhas) => { if (ativo) { setLista(linhas || []); setCarregando(false) } })
      .catch((e) => { if (ativo) { setErro(e.message); setCarregando(false) } })
    return () => { ativo = false }
  }, [solicitacao])

  // Quem dá por respondido é a organização, de propósito: um pedido pode ser
  // resolvido por telefone. O estado é o que a PRODUÇÃO considera entregue,
  // não o que a marca declarou.
  async function marcar(participacaoId) {
    setMarcando(participacaoId)
    setErroAcao(null)
    try {
      await rpc('marcar_solicitacao', {
        p_secret: lerSenha(), p_solicitacao: solicitacao.id, p_participacao: participacaoId, p_respondido: true,
      })
      setLista((l) => l.map((x) => (x.participacao_id === participacaoId ? { ...x, estado: 'respondido' } : x)))
      await onRespondido()
    } catch (e) {
      setErroAcao(e.message)
    } finally {
      setMarcando(null)
    }
  }

  return (
    <Folha aberto={aberto} titulo={solicitacao ? solicitacao.titulo : 'Pedido'} sub="Quem já respondeu, e quem não" onFechar={onFechar}>
      <div className="og-bloco" style={{ borderTop: 0, paddingTop: 0 }}>
        {carregando && <p>Carregando.</p>}
        {!carregando && erro && <p>{erro}</p>}
        {!carregando && !erro && lista.length === 0 && <p>Este pedido ainda não alcançou nenhuma marca.</p>}
        {!carregando && !erro && lista.map((l) => (
          <p className="og-par" key={l.participacao_id}>
            <b>{l.marca || '(marca)'}</b> · {l.estado === 'respondido' ? 'respondido' : 'pendente'}
            {l.estado !== 'respondido' && (
              <>
                {' '}
                <button
                  className="og-btn og-btn--vazado og-btn--mini" type="button"
                  disabled={marcando === l.participacao_id || !podeGerir}
                  title={podeGerir ? undefined : SEM_PERMISSAO_PRODUCAO}
                  onClick={() => marcar(l.participacao_id)}
                >
                  Dar por respondido
                </button>
              </>
            )}
          </p>
        ))}
        {erroAcao && <div className="og-aviso" data-tom="erro">{erroAcao}</div>}
      </div>
    </Folha>
  )
}

/* ── Publicar arquivo ──────────────────────────────────────────────────── */
function FolhaNovoArquivo({ aberto, opcoesMarcas, marcaPadrao, podeGerir, onFechar, onPublicado }) {
  const [file, setFile] = React.useState(null)
  const [nome, setNome] = React.useState('')
  const [escopo, setEscopo] = React.useState('geral')
  const [marca, setMarca] = React.useState(marcaPadrao)
  const [versao, setVersao] = React.useState('')
  const [descricao, setDescricao] = React.useState('')
  const [leitura, setLeitura] = React.useState(false)
  const [aviso, setAviso] = React.useState(null)
  const [enviando, setEnviando] = React.useState(false)

  React.useEffect(() => {
    if (!aberto) return
    setFile(null); setNome(''); setEscopo('geral'); setMarca(marcaPadrao)
    setVersao(''); setDescricao(''); setLeitura(false); setAviso(null); setEnviando(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  function escolher(f) {
    setFile(f || null)
    if (f && !nome.trim()) setNome(f.name)
  }

  async function publicar() {
    if (!file) { setAviso({ texto: 'Escolha um arquivo.', tom: 'erro' }); return }
    if (escopo === 'marca' && !marca) { setAviso({ texto: 'Escolha a marca.', tom: 'erro' }); return }
    const pasta = escopo === 'geral' ? 'geral' : marca
    const path = pasta + '/' + nomeSeguro(file.name)
    setEnviando(true)
    setAviso({ texto: 'Enviando…' })
    try {
      // Os bytes NÃO passam pela Edge Function: ela assina, o navegador sobe
      // direto para o Storage. Um PDF de 20 MB atravessando o isolate
      // esbarraria em limite de corpo, de memória e de tempo.
      const assinatura = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'subir', bucket: 'arquivos', path })
      const envio = await fetch(assinatura.url, { method: 'PUT', body: file })
      if (!envio.ok) throw new Error('o envio para o armazenamento falhou (HTTP ' + envio.status + ')')
      // Só DEPOIS do arquivo estar lá é que a linha nasce. Ao contrário, a
      // marca veria um download que dá 404.
      await rpc('publicar_arquivo', {
        p_secret: lerSenha(),
        p_nome: nome.trim() || file.name,
        p_path: path,
        p_escopo: escopo,
        p_participacao: escopo === 'marca' ? marca : null,
        p_descricao: descricao.trim() || null,
        p_versao: versao.trim() || null,
        p_mime: file.type || null,
        p_tamanho: file.size,
        p_exige_leitura: leitura,
      })
      setAviso({ texto: 'Publicado.', tom: 'ok' })
      await onPublicado()
    } catch (e) {
      setAviso({ texto: e.message, tom: 'erro' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Folha aberto={aberto} titulo="Publicar arquivo" sub="Aparece para download no painel da marca" onFechar={onFechar}>
      <div className="og-bloco" style={{ borderTop: 0, paddingTop: 0 }}>
        <label className="og-campo"><span>Arquivo</span>
          <input type="file" onChange={(e) => escolher(e.target.files && e.target.files[0])} />
        </label>
        <label className="og-campo"><span>Nome que a marca vê</span>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="og-campo"><span>Para quem</span>
          <select value={escopo} onChange={(e) => setEscopo(e.target.value)}>
            <option value="geral">Todas as marcas</option>
            <option value="marca">Uma marca só</option>
          </select>
        </label>
        {escopo === 'marca' && (
          <label className="og-campo"><span>Qual marca</span>
            <select value={marca} onChange={(e) => setMarca(e.target.value)}>
              {opcoesMarcas.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        )}
        <label className="og-campo"><span>Versão <span className="og-forms__nota">(opcional)</span></span>
          <input type="text" placeholder="2" value={versao} onChange={(e) => setVersao(e.target.value)} />
        </label>
        <label className="og-campo"><span>Descrição <span className="og-forms__nota">(opcional)</span></span>
          <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </label>
        {/* A capacidade existe e o padrão vem DESLIGADO — ligar para
            contrato e regulamento é configuração, não código novo. */}
        <label className="og-campo og-campo--linha">
          <input type="checkbox" checked={leitura} onChange={(e) => setLeitura(e.target.checked)} />
          <span>Pedir confirmação de leitura</span>
        </label>
        {aviso && <div className="og-aviso" data-tom={aviso.tom}>{aviso.texto}</div>}
        <button
          className="og-btn" type="button"
          disabled={enviando || !podeGerir}
          title={podeGerir ? undefined : SEM_PERMISSAO_PRODUCAO}
          onClick={publicar}
        >
          Publicar
        </button>
      </div>
    </Folha>
  )
}

/* ── Agendar sessão ────────────────────────────────────────────────────── */
function FolhaNovaSessao({ aberto, opcoesMarcas, marcaPadrao, podeGerir, onFechar, onCriada }) {
  const [marca, setMarca] = React.useState(marcaPadrao)
  const [quando, setQuando] = React.useState('')
  const [local, setLocal] = React.useState('')
  const [obs, setObs] = React.useState('')
  const [aviso, setAviso] = React.useState(null)
  const [enviando, setEnviando] = React.useState(false)

  React.useEffect(() => {
    if (!aberto) return
    setMarca(marcaPadrao); setQuando(''); setLocal(''); setObs(''); setAviso(null); setEnviando(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  async function criar() {
    if (!marca) {
      setAviso({ texto: 'Escolha a marca. Só marca com edição aberta pode ser fotografada.', tom: 'erro' })
      return
    }
    const iso = isoDoCampo(quando)
    if (!iso) { setAviso({ texto: 'Informe data e hora.', tom: 'erro' }); return }
    setEnviando(true)
    try {
      await rpc('agendar_sessao_fotos', {
        p_secret: lerSenha(), p_participacao: marca, p_data_hora: iso,
        p_local: local.trim() || null, p_observacoes: obs.trim() || null,
      })
      setAviso({ texto: 'Agendada.', tom: 'ok' })
      await onCriada()
    } catch (e) {
      setAviso({ texto: e.message, tom: 'erro' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Folha aberto={aberto} titulo="Agendar sessão" sub="A marca vê a data; ela não escolhe nem remarca por lá" onFechar={onFechar}>
      <div className="og-bloco" style={{ borderTop: 0, paddingTop: 0 }}>
        <label className="og-campo"><span>Marca</span>
          <select value={marca} onChange={(e) => setMarca(e.target.value)}>
            {opcoesMarcas.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="og-campo"><span>Data e hora</span>
          <input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} />
        </label>
        <label className="og-campo"><span>Local <span className="og-forms__nota">(opcional)</span></span>
          <input type="text" value={local} onChange={(e) => setLocal(e.target.value)} />
        </label>
        <label className="og-campo"><span>Observações <span className="og-forms__nota">(opcional)</span></span>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} />
        </label>
        {aviso && <div className="og-aviso" data-tom={aviso.tom}>{aviso.texto}</div>}
        <button
          className="og-btn" type="button"
          disabled={enviando || !podeGerir}
          title={podeGerir ? undefined : SEM_PERMISSAO_PRODUCAO}
          onClick={criar}
        >
          Agendar
        </button>
      </div>
    </Folha>
  )
}

/* ── Mudar uma sessão já agendada ──────────────────────────────────────── */
function FolhaEditarSessao({ aberto, sessao, podeGerir, onFechar, onSalva }) {
  const [status, setStatus] = React.useState('')
  const [nova, setNova] = React.useState('')
  const [local, setLocal] = React.useState('')
  const [aviso, setAviso] = React.useState(null)
  const [salvando, setSalvando] = React.useState(false)

  React.useEffect(() => {
    if (!sessao) return
    setStatus(sessao.status || '')
    setNova('')
    setLocal(sessao.local || '')
    setAviso(null)
    setSalvando(false)
  }, [sessao])

  async function salvar() {
    setSalvando(true)
    try {
      await rpc('atualizar_sessao_fotos', {
        p_secret: lerSenha(), p_sessao_id: sessao.id,
        p_status: status, p_data_hora: isoDoCampo(nova), p_local: local.trim() || null, p_observacoes: null,
      })
      setAviso({ texto: 'Salvo.', tom: 'ok' })
      await onSalva()
    } catch (e) {
      setAviso({ texto: e.message, tom: 'erro' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Folha aberto={aberto} titulo={(sessao && sessao.nome_marca) || 'Sessão'} sub={sessao ? dataHoraCurta(sessao.data_hora) : ''} onFechar={onFechar}>
      {sessao && (
        <div className="og-bloco" style={{ borderTop: 0, paddingTop: 0 }}>
          <label className="og-campo"><span>Situação</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(ROTULO_SESSAO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="og-campo"><span>Nova data e hora <span className="og-forms__nota">(deixe em branco para manter)</span></span>
            <input type="datetime-local" value={nova} onChange={(e) => setNova(e.target.value)} />
          </label>
          <label className="og-campo"><span>Local</span>
            <input type="text" value={local} onChange={(e) => setLocal(e.target.value)} />
          </label>
          {aviso && <div className="og-aviso" data-tom={aviso.tom}>{aviso.texto}</div>}
          <button
            className="og-btn" type="button"
            disabled={salvando || !podeGerir}
            title={podeGerir ? undefined : SEM_PERMISSAO_PRODUCAO}
            onClick={salvar}
          >
            Salvar
          </button>
        </div>
      )}
    </Folha>
  )
}

/* ── A vista ───────────────────────────────────────────────────────────── */
export function Producao({ registrarAtualizar, reportarEstado, pode = () => true }) {
  const podeGerir = pode('producao.gerir')
  const [solicitacoes, setSolicitacoes] = React.useState(null) // null = carregando
  const [arquivos, setArquivos] = React.useState(null)
  const [sessoes, setSessoes] = React.useState(null)
  const [config, setConfig] = React.useState(null)
  const [participantes, setParticipantes] = React.useState([])
  const [erro, setErro] = React.useState(null)
  const [avisoGeral, setAvisoGeral] = React.useState(null) // {texto, tom}
  const [modoAgenda, setModoAgenda] = React.useState('abrir') // 'abrir' | 'marcar' — só UI, nunca gravado

  // A edição aberta — movida de Equipe.jsx na Fase 3 do plano de funções
  // (27/08/2026, achado de revisão adversarial): ela é governada por
  // producao.gerir, e Equipe inteira só aparece pra quem tem acesso.gerir.
  // Uma conta de função "produção" tinha producao.gerir e nunca via Equipe —
  // ficava sem como abrir a edição que a própria agenda desta vista exige.
  const [codigoEdicao, setCodigoEdicao] = React.useState('')
  const [avisoEdicao, setAvisoEdicao] = React.useState(null)
  const [salvandoEdicao, setSalvandoEdicao] = React.useState(false)

  // Uma folha por vez: qual está aberta, e o dado que ela precisa.
  const [folha, setFolha] = React.useState(null)
  // null | {tipo:'pedido'} | {tipo:'quemFalta', solicitacao}
  // | {tipo:'arquivo'} | {tipo:'sessaoNova'} | {tipo:'sessaoEditar', sessao}

  const carregar = React.useCallback(async () => {
    setErro(null)
    const senha = lerSenha()
    try {
      const [valida, s, a, f] = await Promise.all([
        rpc('admin_ping', { p_secret: senha }),
        rpc('get_solicitacoes_admin', { p_secret: senha }),
        rpc('get_arquivos_admin', { p_secret: senha }),
        rpc('get_sessoes_fotos', { p_secret: senha }),
      ])
      if (valida !== true) {
        setErro('A senha desta sessão não vale mais. Saia e entre de novo.')
        return
      }
      const solicitacoesOk = s || []
      const sessoesOk = f || []
      setSolicitacoes(solicitacoesOk)
      setArquivos(a || [])
      setSessoes(sessoesOk)
      // Alimenta o sino de notificações do cabeçalho (NotificacoesOrg vive no
      // PainelShell, que não sabe como esta vista busca os próprios dados).
      if (reportarEstado) reportarEstado({ solicitacoes: solicitacoesOk, sessoes: sessoesOk })
    } catch (e) {
      setErro(e.message)
    }
    // Config e marcas: leituras À PARTE, cada uma com o próprio catch — uma
    // função sem permissão ou uma migration ainda não aplicada não pode
    // derrubar pedidos/arquivos/sessões, que já funcionam (CLAUDE.md §10.4-b,
    // mesma regra aplicada em Mesa.jsx e Marcas.jsx para get_participantes).
    try {
      setConfig((await rpc('get_config_admin', { p_secret: senha })) || null)
    } catch {
      setConfig(null)
    }
    try {
      setParticipantes((await rpc('get_participantes', { p_secret: senha })) || [])
    } catch {
      setParticipantes([])
    }
  }, [reportarEstado])

  React.useEffect(() => { carregar() }, [carregar])
  // Registra esta vista como dona do botão "atualizar" do cabeçalho.
  React.useEffect(() => {
    if (registrarAtualizar) registrarAtualizar(carregar)
  }, [registrarAtualizar, carregar])

  const opcoesMarcas = marcasParaOpcoes(participantes)
  const marcaPadrao = opcoesMarcas.length ? opcoesMarcas[0].value : ''
  const edicaoAtual = config && config.edicao_atual
  const grade = React.useMemo(() => montarAgendaGrade(sessoes || []), [sessoes])

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

  async function clicarSlot(slot) {
    if (!podeGerir || modoAgenda !== 'abrir' || slot.estado === 'reservado') return
    try {
      if (slot.estado === 'aberto') {
        await rpc('fechar_vaga_fotos', { p_secret: lerSenha(), p_sessao_id: slot.sessaoId })
      } else {
        await rpc('abrir_vaga_fotos', {
          p_secret: lerSenha(), p_edicao: edicaoAtual, p_data_hora: slot.quandoIso, p_local: null,
        })
      }
      await carregar()
    } catch (e) {
      setAvisoGeral({
        texto: 'Não deu para ' + (slot.estado === 'aberto' ? 'fechar' : 'abrir') + ' a vaga: ' + e.message,
        tom: 'erro',
      })
    }
  }

  async function publicarPedido(id) {
    try {
      const n = await rpc('publicar_solicitacao', { p_secret: lerSenha(), p_id: id })
      await carregar()
      setAvisoGeral({ texto: 'Publicado para ' + n + (n === 1 ? ' marca.' : ' marcas.'), tom: 'ok' })
    } catch (e) {
      setAvisoGeral({ texto: 'Não deu para publicar: ' + e.message, tom: 'erro' })
    }
  }

  async function baixarArquivo(path) {
    try {
      const r = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'baixar', bucket: 'arquivos', path })
      window.open(r.url, '_blank', 'noopener')
    } catch (e) {
      setAvisoGeral({ texto: 'Não deu para abrir o arquivo: ' + e.message, tom: 'erro' })
    }
  }

  return (
    <section className="og-vista">
      <VistaCabeca acento="laranja" icone={ICONE.producao} titulo="Produção" nota="O que a organização manda pra marca: agenda, pedidos e arquivos" />

      {avisoGeral && <div className="og-aviso" data-tom={avisoGeral.tom}>{avisoGeral.texto}</div>}

      {erro && (
        <div className="og-estado" data-tom="erro">
          <h2>Não consegui carregar</h2>
          <p>{erro}</p>
        </div>
      )}

      {/* Explicação VISÍVEL, não só `title` — botão desabilitado não recebe
          hover nem foco de teclado (`pointer-events:none` + `disabled` no
          CSS), então um `title` sozinho nunca é lido por ninguém. Achado de
          revisão adversarial: os `title` abaixo continuam existindo (não
          custam nada pra quem usa leitor de tela via outra rota), mas quem
          de fato explica é este parágrafo. */}
      {!erro && !podeGerir && (
        <p className="og-forms__nota" style={{ marginBottom: 14 }}>{SEM_PERMISSAO_PRODUCAO}. As ações desta página aparecem desabilitadas.</p>
      )}

      {!erro && (
        <>
          <section className="og-forms" style={{ marginBottom: 22 }}>
            <div className="og-forms__cabeca">
              <h2>A edição aberta</h2>
              <p>É ela que decide qual formulário a marca vê ao entrar, e é o que a agenda logo abaixo precisa pra existir.</p>
            </div>
            <div className="og-item" style={{ cursor: 'default' }}>
              <span className="og-item__cor" style={{ background: edicaoAtual ? '#01AFCC' : '#FF4810' }} aria-hidden="true" />
              <p className="og-item__nome">{edicaoAtual || 'Nenhuma edição aberta'}</p>
              <p className="og-item__meta">
                {edicaoAtual
                  ? 'Toda conta nova de marca já nasce com o formulário desta edição.'
                  : 'Contas novas de marca entram e não têm o que preencher até você abrir uma.'}
              </p>
            </div>
            <label className="og-campo" style={{ marginTop: 12 }}><span>Código da edição</span>
              <input
                type="text" placeholder="2027"
                value={codigoEdicao} onChange={(e) => setCodigoEdicao(e.target.value)}
                disabled={!podeGerir}
              />
            </label>
            {avisoEdicao && <div className="og-aviso" data-tom={avisoEdicao.tom}>{avisoEdicao.texto}</div>}
            <button
              className="og-btn" type="button"
              disabled={salvandoEdicao || !podeGerir}
              title={podeGerir ? undefined : SEM_PERMISSAO_PRODUCAO}
              onClick={() => salvarEdicao(codigoEdicao.trim())}
            >
              Salvar edição
            </button>
            {/* Só aparece com edição aberta: fechar sem ter aberto não é um
                gesto que exista. */}
            {edicaoAtual && (
              <button
                className="og-btn og-btn--vazado" type="button"
                disabled={salvandoEdicao || !podeGerir}
                title={podeGerir ? undefined : SEM_PERMISSAO_PRODUCAO}
                onClick={() => salvarEdicao('')}
              >
                Fechar a edição
              </button>
            )}
          </section>

          <section className="og-forms" style={{ marginBottom: 22 }}>
            <div className="og-agenda__topo">
              <div>
                <h2 style={{ margin: 0 }}>Agenda de fotos</h2>
                <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: 'var(--scw-marrom)' }}>
                  {modoAgenda === 'abrir'
                    ? 'Clique num horário para abrir a vaga. As marcas escolhem entre as vagas abertas.'
                    : 'Este modo usa o botão "Agendar sessão", logo abaixo: ele já marca a marca diretamente no horário escolhido.'}
                </p>
              </div>
              <div className="og-agenda__modos">
                <button type="button" className={modoAgenda === 'abrir' ? 'is-ativo' : undefined} onClick={() => setModoAgenda('abrir')}>
                  Abrir vagas
                </button>
                <button type="button" className={modoAgenda === 'marcar' ? 'is-ativo' : undefined} onClick={() => setModoAgenda('marcar')}>
                  Marcar eu mesma
                </button>
              </div>
            </div>
            <div className="og-agenda__dias">
              {!edicaoAtual ? (
                <p className="og-forms__nota">Abra uma edição acima antes de montar a agenda.</p>
              ) : (
                grade.map((dia, i) => (
                  <div className="og-agenda__col" key={i}>
                    <p className="og-agenda__coldata">{dia.dataLabel}</p>
                    {dia.slots.map((slot) => (
                      <button
                        key={slot.hhmm}
                        type="button"
                        className={'og-slot og-slot--' + slot.estado}
                        disabled={!podeGerir}
                        title={podeGerir ? undefined : SEM_PERMISSAO_PRODUCAO}
                        onClick={() => clicarSlot(slot)}
                      >
                        <span className="og-slot__hora">{slot.hhmm}</span>
                        {slot.quem && <span className="og-slot__quem">{slot.quem}</span>}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
            <div className="og-agenda__legenda">
              <span><i style={{ background: 'var(--scw-cyan)' }} />vaga aberta</span>
              <span><i style={{ background: 'var(--scw-choco)' }} />reservada</span>
              <span><i style={{ background: '#fff', boxShadow: 'inset 0 0 0 1.5px var(--scw-borda-campo)' }} />fechada</span>
            </div>
          </section>

          <section className="og-forms">
            <div className="og-forms__cabeca og-forms__cabeca--com-acao">
              <div>
                <h2>Pedidos e prazos</h2>
                <p>O que a organização pediu, para quem, até quando, e quem já respondeu.</p>
              </div>
              <button
                className="og-btn og-btn--mini" type="button"
                disabled={!podeGerir}
                title={podeGerir ? undefined : SEM_PERMISSAO_PRODUCAO}
                onClick={() => setFolha({ tipo: 'pedido' })}
              >
                Novo pedido
              </button>
            </div>
            {solicitacoes && solicitacoes.length === 0 && (
              <EstadoVazio
                titulo="Nenhum pedido ainda"
                texto="Um pedido é o que aparece no painel da marca com prazo. Aviso para todas ou cobrança de uma só."
              />
            )}
            {solicitacoes && solicitacoes.length > 0 && (
              <ul className="og-lista">
                {solicitacoes.map((s) => {
                  const rascunho = !s.publicada_em
                  const alvo = s.escopo === 'geral' ? 'todas as marcas' : (s.marca || 'uma marca')
                  const feitas = Number(s.respondidas || 0)
                  const faltam = Number(s.pendentes || 0)
                  const conta = rascunho ? 'ainda não foi publicado' : (feitas + ' de ' + (feitas + faltam) + ' responderam')
                  return (
                    <li key={s.id}>
                      <div className="og-item">
                        <span className="og-item__cor" style={{ background: rascunho ? '#6A2C15' : (faltam ? '#FF4810' : '#01AFCC') }} aria-hidden="true" />
                        <p className="og-item__nome">{s.titulo}</p>
                        <p className="og-item__meta">{alvo + ' · ' + (BLOCOS[s.bloco] || s.bloco) + ' · ' + conta}</p>
                        <span className="og-item__dir">
                          <Prazo iso={s.prazo_em} />
                          {rascunho
                            ? <button
                                className="og-btn og-btn--mini" type="button"
                                disabled={!podeGerir}
                                title={podeGerir ? undefined : SEM_PERMISSAO_PRODUCAO}
                                onClick={() => publicarPedido(s.id)}
                              >
                                Publicar
                              </button>
                            : <button className="og-btn og-btn--vazado og-btn--mini" type="button" onClick={() => setFolha({ tipo: 'quemFalta', solicitacao: s })}>Quem falta</button>}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="og-forms" style={{ marginTop: 22 }}>
            <div className="og-forms__cabeca og-forms__cabeca--com-acao">
              <div>
                <h2>Arquivos</h2>
                <p>Documentos para download. Gerais, ou de uma marca só.</p>
              </div>
              <button
                className="og-btn og-btn--mini" type="button"
                disabled={!podeGerir}
                title={podeGerir ? undefined : SEM_PERMISSAO_PRODUCAO}
                onClick={() => setFolha({ tipo: 'arquivo' })}
              >
                Publicar arquivo
              </button>
            </div>
            {arquivos && arquivos.length === 0 && (
              <EstadoVazio titulo="Nenhum arquivo publicado" texto="O que você publicar aqui aparece para download no painel da marca." />
            )}
            {arquivos && arquivos.length > 0 && (
              <ul className="og-lista">
                {arquivos.map((a) => {
                  const detalhe = [
                    a.escopo === 'geral' ? 'para todas' : (a.marca || 'uma marca'),
                    a.versao ? 'versão ' + a.versao : '',
                    a.exige_leitura ? Number(a.leituras || 0) + ' confirmaram leitura' : '',
                  ].filter(Boolean).join(' · ')
                  return (
                    <li key={a.id}>
                      <div className="og-item">
                        <span className="og-item__cor" style={{ background: '#4D257E' }} aria-hidden="true" />
                        <p className="og-item__nome">{a.nome}</p>
                        <p className="og-item__meta">{detalhe}</p>
                        <span className="og-item__dir">
                          <button className="og-btn og-btn--vazado og-btn--mini" type="button" onClick={() => baixarArquivo(a.path)}>Baixar</button>
                          <span className="og-item__data">{dataCurta(a.publicado_em)}</span>
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="og-forms" style={{ marginTop: 22 }}>
            <div className="og-forms__cabeca og-forms__cabeca--com-acao">
              <div>
                <h2>Sessões de fotos</h2>
                <p>Quem fotografa é a organização. A marca só vê a data.</p>
              </div>
              <button
                className="og-btn og-btn--mini" type="button"
                disabled={!podeGerir}
                title={podeGerir ? undefined : SEM_PERMISSAO_PRODUCAO}
                onClick={() => setFolha({ tipo: 'sessaoNova' })}
              >
                Agendar sessão
              </button>
            </div>
            {sessoes && sessoes.length === 0 && (
              <EstadoVazio titulo="Nenhuma sessão agendada" texto="A marca vê a data assim que você agenda. Ela não escolhe horário nem remarca por lá." />
            )}
            {sessoes && sessoes.length > 0 && (
              <ul className="og-lista">
                {sessoes.map((f) => (
                  <li key={f.id}>
                    <div className="og-item">
                      <span className="og-item__cor" style={{ background: '#FDBB1A' }} aria-hidden="true" />
                      <p className="og-item__nome">{f.nome_marca || '(marca)'}</p>
                      <p className="og-item__meta">
                        {dataHoraCurta(f.data_hora) + (f.local ? ' · ' + f.local : '') + (f.edicao_codigo ? ' · edição ' + f.edicao_codigo : '')}
                      </p>
                      <span className="og-item__dir">
                        <span className="og-selo">{ROTULO_SESSAO[f.status] || f.status}</span>
                        <button
                          className="og-btn og-btn--vazado og-btn--mini" type="button"
                          disabled={!podeGerir}
                          title={podeGerir ? undefined : SEM_PERMISSAO_PRODUCAO}
                          onClick={() => setFolha({ tipo: 'sessaoEditar', sessao: f })}
                        >
                          Mudar
                        </button>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <FolhaNovoPedido
        aberto={!!folha && folha.tipo === 'pedido'}
        opcoesMarcas={opcoesMarcas}
        marcaPadrao={marcaPadrao}
        edicaoAtual={edicaoAtual}
        podeGerir={podeGerir}
        onFechar={() => setFolha(null)}
        onCriado={carregar}
      />
      <FolhaQuemFalta
        aberto={!!folha && folha.tipo === 'quemFalta'}
        solicitacao={folha && folha.tipo === 'quemFalta' ? folha.solicitacao : null}
        podeGerir={podeGerir}
        onFechar={() => setFolha(null)}
        onRespondido={carregar}
      />
      <FolhaNovoArquivo
        aberto={!!folha && folha.tipo === 'arquivo'}
        opcoesMarcas={opcoesMarcas}
        marcaPadrao={marcaPadrao}
        podeGerir={podeGerir}
        onFechar={() => setFolha(null)}
        onPublicado={carregar}
      />
      <FolhaNovaSessao
        aberto={!!folha && folha.tipo === 'sessaoNova'}
        opcoesMarcas={opcoesMarcas}
        marcaPadrao={marcaPadrao}
        podeGerir={podeGerir}
        onFechar={() => setFolha(null)}
        onCriada={carregar}
      />
      <FolhaEditarSessao
        aberto={!!folha && folha.tipo === 'sessaoEditar'}
        sessao={folha && folha.tipo === 'sessaoEditar' ? folha.sessao : null}
        podeGerir={podeGerir}
        onFechar={() => setFolha(null)}
        onSalva={carregar}
      />
    </section>
  )
}
