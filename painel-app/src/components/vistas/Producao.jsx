import React from 'react'
import { rpc, chamarFuncao } from '../../lib/rpc'
import { dataHoraCurta, prazoSelo } from '../../lib/painelFormat'
import { BLOCOS, ROTULO_SESSAO, montarAgendaGrade, nomeSeguro, isoDoCampo, campoDoIso } from '../../lib/producao'
import { marcasParaOpcoes } from '../../lib/participantes'
import { rotulo } from '../../lib/status'
import { CATEGORIAS_ARQUIVO } from '../../lib/arquivos'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Folha } from '../Folha'
import { Carregando, Erro, Vazio, Selo } from '../ui'

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
  return <Vazio titulo={titulo}>{texto}</Vazio>
}

function Prazo({ iso }) {
  const p = prazoSelo(iso)
  if (!p) return null
  // vencido/hoje = alerta (laranja); até 7 dias = revisar (amarelo). O texto diz o fato.
  const tom = p.tom === 'aguardando_cadastro' ? 'alerta' : p.tom === 'em_preenchimento' ? 'revisar' : undefined
  return <span className="og-selo" data-tom={tom}>{p.texto}</span>
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
  // A lista de marcas é uma leitura à parte e pode chegar DEPOIS de a folha
  // abrir: sem isto o <select> mostra a primeira marca e o estado fica vazio.
  React.useEffect(() => { if (aberto && !marca && marcaPadrao) setMarca(marcaPadrao) }, [aberto, marcaPadrao]) // eslint-disable-line react-hooks/exhaustive-deps

  async function criar() {
    if (!titulo.trim() || !texto.trim()) {
      setAviso({ texto: 'Título e texto são obrigatórios.', tom: 'erro' })
      return
    }
    if (escopo === 'marca' && !marca) {
      setAviso({ texto: 'Nenhuma marca com acesso ainda. Envie para todas ou crie o acesso da marca primeiro.', tom: 'erro' })
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
      <div className="og-bloco og-bloco--colado">
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
        <label className="og-campo"><span>Prazo <em>(opcional)</em></span>
          <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </label>
        {aviso && <div className="og-aviso" data-tom={aviso.tom}>{aviso.texto}</div>}
        <button
          className="og-btn" type="button"
          disabled={enviando || !podeGerir || (aviso && aviso.tom === 'ok')}
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
  async function marcar(participacaoId, respondido = true) {
    setMarcando(participacaoId)
    setErroAcao(null)
    try {
      await rpc('marcar_solicitacao', {
        p_secret: lerSenha(), p_solicitacao: solicitacao.id, p_participacao: participacaoId, p_respondido: respondido,
      })
      setLista((l) => l.map((x) => (x.participacao_id === participacaoId ? { ...x, estado: respondido ? 'respondido' : 'pendente', resposta: respondido ? x.resposta : null } : x)))
      await onRespondido()
    } catch (e) {
      setErroAcao(e.message)
    } finally {
      setMarcando(null)
    }
  }

  return (
    <Folha aberto={aberto} titulo={solicitacao ? solicitacao.titulo : 'Pedido'} sub="Quem já respondeu, e quem não" onFechar={onFechar}>
      <div className="og-bloco og-bloco--colado">
        {carregando && <Carregando linhas={3} texto="Carregando quem respondeu…" />}
        {!carregando && erro && <Erro texto={erro} />}
        {!carregando && !erro && lista.length === 0 && <Vazio titulo="Ninguém ainda">Este pedido ainda não alcançou nenhuma marca.</Vazio>}
        {!carregando && !erro && solicitacao && solicitacao.texto && <p className="ui-citacao">{solicitacao.texto}</p>}
        {!carregando && !erro && lista.length > 0 && (
          <ul className="ui-lista-simples">
            {lista.map((l) => (
              <li key={l.participacao_id}>
                <b>{(l.marca || '(marca)') + ' · ' + rotulo('pedido', l.estado === 'respondido' ? 'respondido' : 'pendente')}</b>
                {l.resposta && <span className="ui-citacao">{l.resposta}</span>}
                {l.estado === 'respondido' && l.respondido_em && (
                  <span className="ui-nota">{(l.respondido_por || '') + ' · ' + dataHoraCurta(l.respondido_em)}</span>
                )}
                <span className="ui-linha-acoes">
                  <button
                    className="og-btn og-btn--vazado og-btn--mini" type="button"
                    disabled={marcando === l.participacao_id || !podeGerir}
                    title={podeGerir ? undefined : SEM_PERMISSAO_PRODUCAO}
                    onClick={() => marcar(l.participacao_id, l.estado !== 'respondido')}
                  >
                    {l.estado === 'respondido' ? 'Reabrir' : 'Dar por respondido'}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {erroAcao && <div className="og-aviso" data-tom="erro">{erroAcao}</div>}
      </div>
    </Folha>
  )
}

/* ── Publicar arquivo ──────────────────────────────────────────────────── */
export function FolhaNovoArquivo({ aberto, opcoesMarcas, marcaPadrao, podeGerir, onFechar, onPublicado, categoriaInicial = 'documento', escopoInicial = 'geral' }) {
  const [file, setFile] = React.useState(null)
  const [nome, setNome] = React.useState('')
  const [escopo, setEscopo] = React.useState('geral')
  const [marca, setMarca] = React.useState(marcaPadrao)
  const [versao, setVersao] = React.useState('')
  const [descricao, setDescricao] = React.useState('')
  const [leitura, setLeitura] = React.useState(false)
  const [categoria, setCategoria] = React.useState(categoriaInicial)
  const [aviso, setAviso] = React.useState(null)
  const [enviando, setEnviando] = React.useState(false)

  React.useEffect(() => {
    if (!aberto) return
    setCategoria(categoriaInicial)
    setFile(null); setNome(''); setEscopo(escopoInicial); setMarca(marcaPadrao)
    setVersao(''); setDescricao(''); setLeitura(false); setAviso(null); setEnviando(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])
  // A lista de marcas é uma leitura à parte e pode chegar DEPOIS de a folha
  // abrir: sem isto o <select> mostra a primeira marca e o estado fica vazio.
  React.useEffect(() => { if (aberto && !marca && marcaPadrao) setMarca(marcaPadrao) }, [aberto, marcaPadrao]) // eslint-disable-line react-hooks/exhaustive-deps

  function escolher(f) {
    // O nome acompanha a troca de arquivo enquanto a pessoa não o reescreveu.
    if (f && (!nome.trim() || (file && nome === file.name))) setNome(f.name)
    setFile(f || null)
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
        p_categoria: categoria,
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
      <div className="og-bloco og-bloco--colado">
        <label className="og-campo"><span>Arquivo</span>
          <input type="file" onChange={(e) => escolher(e.target.files && e.target.files[0])} />
        </label>
        <label className="og-campo"><span>Nome que a marca vê</span>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="og-campo"><span>Categoria</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS_ARQUIVO.map((c) => <option key={c.chave} value={c.chave}>{c.rotuloOrg}</option>)}
          </select>
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
        <label className="og-campo"><span>Versão <em>(opcional)</em></span>
          <input type="text" placeholder="2" value={versao} onChange={(e) => setVersao(e.target.value)} />
        </label>
        <label className="og-campo"><span>Descrição <em>(opcional)</em></span>
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
          disabled={enviando || !podeGerir || (aviso && aviso.tom === 'ok')}
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
function FolhaNovaSessao({ aberto, quandoInicial = '', opcoesMarcas, marcaPadrao, podeGerir, onFechar, onCriada }) {
  const [marca, setMarca] = React.useState(marcaPadrao)
  const [quando, setQuando] = React.useState('')
  const [local, setLocal] = React.useState('')
  const [obs, setObs] = React.useState('')
  const [aviso, setAviso] = React.useState(null)
  const [enviando, setEnviando] = React.useState(false)

  React.useEffect(() => {
    if (!aberto) return
    setMarca(marcaPadrao); setQuando(quandoInicial ? campoDoIso(quandoInicial) : ''); setLocal(''); setObs(''); setAviso(null); setEnviando(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])
  // A lista de marcas é uma leitura à parte e pode chegar DEPOIS de a folha
  // abrir: sem isto o <select> mostra a primeira marca e o estado fica vazio.
  React.useEffect(() => { if (aberto && !marca && marcaPadrao) setMarca(marcaPadrao) }, [aberto, marcaPadrao]) // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="og-bloco og-bloco--colado">
        <label className="og-campo"><span>Marca</span>
          <select value={marca} onChange={(e) => setMarca(e.target.value)}>
            {opcoesMarcas.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="og-campo"><span>Data e hora</span>
          <input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} />
        </label>
        <label className="og-campo"><span>Local <em>(opcional)</em></span>
          <input type="text" value={local} onChange={(e) => setLocal(e.target.value)} />
        </label>
        <label className="og-campo"><span>Observações <em>(opcional)</em></span>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} />
        </label>
        {aviso && <div className="og-aviso" data-tom={aviso.tom}>{aviso.texto}</div>}
        <button
          className="og-btn" type="button"
          disabled={enviando || !podeGerir || (aviso && aviso.tom === 'ok')}
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
  const [obs, setObs] = React.useState('')
  const [aviso, setAviso] = React.useState(null)
  const [salvando, setSalvando] = React.useState(false)

  React.useEffect(() => {
    if (!sessao) return
    setStatus(sessao.status || '')
    setNova('')
    setLocal(sessao.local || '')
    setObs(sessao.observacoes || '')
    setAviso(null)
    setSalvando(false)
  }, [sessao])

  async function salvar() {
    setSalvando(true)
    try {
      // String vazia (não null) apaga: o SQL faz coalesce(p_x, x), e null
      // manteria o valor antigo sem a pessoa conseguir limpar o campo.
      await rpc('atualizar_sessao_fotos', {
        p_secret: lerSenha(), p_sessao_id: sessao.id,
        p_status: status, p_data_hora: isoDoCampo(nova), p_local: local.trim(), p_observacoes: obs.trim(),
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
        <div className="og-bloco og-bloco--colado">
          <label className="og-campo"><span>Situação</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(ROTULO_SESSAO).filter(([k]) => k !== 'aberto' || k === status).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="og-campo"><span>Nova data e hora <em>(deixe em branco para manter)</em></span>
            <input type="datetime-local" value={nova} onChange={(e) => setNova(e.target.value)} />
          </label>
          <label className="og-campo"><span>Local</span>
            <input type="text" value={local} onChange={(e) => setLocal(e.target.value)} />
          </label>
          <label className="og-campo"><span>Observações</span>
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} />
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
/*
 * `secao` (reestruturação 29/09/2026): a antiga Produção virou pedaços de
 * dois módulos — 'pedidos' e 'fotos' (Operação) e 'edicao' (Edição ›
 * Configuração). Arquivos ganharam vista própria (ArquivosOrg.jsx, etapa 4).
 * ponytail: a vista carrega pedidos e sessões mesmo mostrando um só — são
 * listas pequenas; separar a carga quando alguma crescer.
 */
export function Producao({ registrarAtualizar, reportarEstado, pode = () => true, rota, navegar, secao = 'pedidos' }) {
  const podeGerir = pode('producao.gerir')
  const [solicitacoes, setSolicitacoes] = React.useState(null) // null = carregando
  const [sessoes, setSessoes] = React.useState(null)
  // undefined = ainda não leu; null = leu e não há (ou não deu para ler).
  const [config, setConfig] = React.useState(undefined)
  const [participantes, setParticipantes] = React.useState([])
  const [erro, setErro] = React.useState(null)
  const [avisoGeral, setAvisoGeral] = React.useState(null) // {texto, tom}
  const [modoAgenda, setModoAgenda] = React.useState('abrir') // 'abrir' | 'marcar' — só UI, nunca gravado
  // Pedidos arquivados saem da lista (e do painel da marca); restaurar devolve.
  const [verArquivados, setVerArquivados] = React.useState(false)
  const [slotOcupado, setSlotOcupado] = React.useState(null)

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
  // | {tipo:'sessaoNova'} | {tipo:'sessaoEditar', sessao}

  const carregar = React.useCallback(async () => {
    setErro(null)
    const senha = lerSenha()
    try {
      const [valida, s, f] = await Promise.all([
        rpc('admin_ping', { p_secret: senha }),
        rpc('get_solicitacoes_admin', { p_secret: senha }),
        rpc('get_sessoes_fotos', { p_secret: senha }),
      ])
      if (valida !== true) {
        setErro('A senha desta sessão não vale mais. Saia e entre de novo.')
        return
      }
      const solicitacoesOk = s || []
      const sessoesOk = f || []
      setSolicitacoes(solicitacoesOk)
      setSessoes(sessoesOk)
      // Alimenta quem pedir o estado (o sino hoje lê a tabela de avisos; isto
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
  // Vaga aberta (sem marca) mora na agenda; na lista de sessões ela aparecia
  // como "(marca)" com botão "Mudar".
  const sessoesComMarca = sessoes && sessoes.filter((s) => s.status !== 'aberto')

  // Sincroniza só quando o VALOR do banco muda: recarregar a vista (abrir uma
  // vaga, publicar um pedido) não pode apagar o que está sendo digitado.
  React.useEffect(() => {
    setCodigoEdicao(edicaoAtual || '')
  }, [edicaoAtual])

  // Pedido pedido pelo endereço (aviso "X marcas ainda não responderam"):
  // abre "Quem falta" dele.
  const itemPedido = secao === 'pedidos' && rota ? rota.filtros.item : null
  React.useEffect(() => {
    if (!itemPedido || !solicitacoes) return
    const s = solicitacoes.find((x) => x.id === itemPedido)
    if (s) setFolha({ tipo: 'quemFalta', solicitacao: s })
  }, [itemPedido, solicitacoes])
  function fecharFolha() {
    if (folha && folha.tipo === 'quemFalta' && itemPedido && navegar) navegar({ filtros: {} }, { substituir: true })
    setFolha(null)
  }

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
    if (!podeGerir || slot.estado === 'reservado') return
    if (modoAgenda === 'marcar') {
      if (slot.estado === 'fechado') setFolha({ tipo: 'sessaoNova', quando: slot.quandoIso })
      return
    }
    // Clique duplo abria duas vagas no mesmo horário: uma operação por vez.
    if (slotOcupado) return
    setSlotOcupado(slot.quandoIso)
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
    } finally {
      setSlotOcupado(null)
    }
  }

  async function arquivarPedido(s, sim) {
    if (sim && !window.confirm('Arquivar o pedido "' + s.titulo + '"? Ele sai do painel da marca; dá para restaurar depois.')) return
    try {
      await rpc('atualizar_solicitacao', { p_secret: lerSenha(), p_id: s.id, p_arquivada: sim })
      await carregar()
    } catch (e) {
      setAvisoGeral({ texto: 'Não deu para ' + (sim ? 'arquivar' : 'restaurar') + ': ' + e.message, tom: 'erro' })
    }
  }

  async function publicarPedido(id) {
    if (!window.confirm('Publicar este pedido? A marca passa a ver e o prazo começa a valer. Não dá para despublicar.')) return
    try {
      const n = await rpc('publicar_solicitacao', { p_secret: lerSenha(), p_id: id })
      await carregar()
      setAvisoGeral({ texto: 'Publicado para ' + n + (n === 1 ? ' marca.' : ' marcas.'), tom: 'ok' })
    } catch (e) {
      setAvisoGeral({ texto: 'Não deu para publicar: ' + e.message, tom: 'erro' })
    }
  }

  return (
    <div className="og-embutida">

      {avisoGeral && <div className="og-aviso" data-tom={avisoGeral.tom}>{avisoGeral.texto}</div>}

      {erro && <Erro texto={erro} onTentar={carregar} />}
      {!erro && solicitacoes === null && <Carregando linhas={3} />}

      {/* Explicação VISÍVEL, não só `title` — botão desabilitado não recebe
          hover nem foco de teclado (`pointer-events:none` + `disabled` no
          CSS), então um `title` sozinho nunca é lido por ninguém. Achado de
          revisão adversarial: os `title` abaixo continuam existindo (não
          custam nada pra quem usa leitor de tela via outra rota), mas quem
          de fato explica é este parágrafo. */}
      {!erro && !podeGerir && (
        <p className="og-aviso">{SEM_PERMISSAO_PRODUCAO}. As ações desta página aparecem desabilitadas.</p>
      )}

      {!erro && (
        <>
          <div className={secao === 'fotos' ? 'ui-grade-duas' : 'ui-pilha'}>
          {secao === 'edicao' && <section className="og-forms">
            <div className="og-forms__cabeca">
              <h2>A edição aberta</h2>
              <p>É ela que decide qual formulário a marca vê ao entrar, e é o que a agenda logo abaixo precisa pra existir.</p>
            </div>
            <div className="og-item og-item--info">
              <span className="og-item__cor" data-tom={config === undefined ? undefined : edicaoAtual ? 'ok' : 'aviso'} aria-hidden="true" />
              <p className="og-item__nome">{config === undefined ? 'Carregando…' : (edicaoAtual || 'Nenhuma edição aberta')}</p>
              <p className="og-item__meta">
                {config === undefined
                  ? 'Lendo a configuração da edição.'
                  : edicaoAtual
                    ? 'Toda conta nova de marca já nasce com o formulário desta edição.'
                    : 'Contas novas de marca entram e não têm o que preencher até você abrir uma.'}
              </p>
            </div>
            <label className="og-campo og-campo--espaco"><span>Código da edição</span>
              <input
                type="text" placeholder="2027"
                value={codigoEdicao} onChange={(e) => setCodigoEdicao(e.target.value)}
                disabled={!podeGerir}
              />
            </label>
            {avisoEdicao && <div className="og-aviso" data-tom={avisoEdicao.tom}>{avisoEdicao.texto}</div>}
            <button
              className="og-btn" type="button"
              disabled={salvandoEdicao || !podeGerir || !codigoEdicao.trim() || codigoEdicao.trim() === edicaoAtual}
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
                onClick={() => { if (window.confirm('Fechar a edição? Contas novas de marca deixam de ganhar formulário até você abrir outra.')) salvarEdicao('') }}
              >
                Fechar a edição
              </button>
            )}
          </section>}

          {secao === 'fotos' && <section className="og-forms" id="agenda-fotos">
            <div className="og-agenda__topo">
              <div className="og-forms__cabeca">
                <h2>Agenda de fotos</h2>
                <p>
                  {modoAgenda === 'abrir'
                    ? 'Clique num horário para abrir a vaga. As marcas escolhem entre as vagas abertas.'
                    : 'Neste modo, clique num horário livre para agendar uma marca direto nele.'}
                </p>
              </div>
              <div className="og-agenda__modos">
                <button type="button" className={modoAgenda === 'abrir' ? 'is-ativo' : undefined} aria-pressed={modoAgenda === 'abrir'} onClick={() => setModoAgenda('abrir')}>
                  Abrir vagas
                </button>
                <button type="button" className={modoAgenda === 'marcar' ? 'is-ativo' : undefined} aria-pressed={modoAgenda === 'marcar'} onClick={() => setModoAgenda('marcar')}>
                  Marcar eu mesma
                </button>
              </div>
            </div>
            <div className="og-agenda__dias">
              {config === undefined ? (
                <Carregando linhas={2} texto="Carregando a agenda…" />
              ) : !edicaoAtual ? (
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
                        disabled={!podeGerir || slotOcupado === slot.quandoIso}
                        title={podeGerir ? undefined : SEM_PERMISSAO_PRODUCAO}
                        aria-label={dia.dataLabel + ', ' + slot.hhmm + ': ' + (slot.estado === 'fechado' ? 'fechado' : slot.quem)}
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
              <span><i className="is-aberta" />vaga aberta</span>
              <span><i className="is-reservada" />reservada</span>
              <span><i className="is-fechada" />fechada</span>
            </div>
          </section>}

          {secao === 'pedidos' && <section className="og-forms">
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
            {solicitacoes && solicitacoes.some((s) => s.arquivada) && (
              <div className="ui-filtros-mini" role="group" aria-label="Pedidos">
                <button type="button" className="ui-chip" aria-pressed={!verArquivados} onClick={() => setVerArquivados(false)}>Ativos</button>
                <button type="button" className="ui-chip" aria-pressed={verArquivados} onClick={() => setVerArquivados(true)}>Arquivados ({solicitacoes.filter((s) => s.arquivada).length})</button>
              </div>
            )}
            {solicitacoes && solicitacoes.length > 0 && (
              <ul className="og-lista">
                {solicitacoes.filter((s) => !!s.arquivada === verArquivados).map((s) => {
                  const rascunho = !s.publicada_em
                  const alvo = s.escopo === 'geral' ? 'todas as marcas' : (s.marca || 'uma marca')
                  const feitas = Number(s.respondidas || 0)
                  const faltam = Number(s.pendentes || 0)
                  const conta = rascunho ? 'ainda não foi publicado' : (feitas + ' de ' + (feitas + faltam) + ' responderam')
                  return (
                    <li key={s.id}>
                      <div className="og-item">
                        <span className="og-item__cor" data-tom={rascunho ? undefined : (faltam ? 'aviso' : 'ok')} aria-hidden="true" />
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
                          {podeGerir && (
                            <button className="og-btn og-btn--vazado og-btn--mini" type="button" onClick={() => arquivarPedido(s, !s.arquivada)}>
                              {s.arquivada ? 'Restaurar' : 'Arquivar'}
                            </button>
                          )}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>}

          {secao === 'fotos' && <section className="og-forms">
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
            {sessoesComMarca && sessoesComMarca.length === 0 && (
              <EstadoVazio titulo="Nenhuma sessão agendada" texto="A marca vê a data assim que você agenda. Ela não escolhe horário nem remarca por lá." />
            )}
            {sessoesComMarca && sessoesComMarca.length > 0 && (
              <ul className="og-lista">
                {sessoesComMarca.map((f) => (
                  <li key={f.id}>
                    <div className="og-item">
                      <span className="og-item__cor" data-chave="sessao" aria-hidden="true" />
                      <p className="og-item__nome">{f.nome_marca || '(marca)'}</p>
                      <p className="og-item__meta">
                        {dataHoraCurta(f.data_hora) + (f.local ? ' · ' + f.local : '') + (f.edicao_codigo ? ' · edição ' + f.edicao_codigo : '')}
                      </p>
                      <span className="og-item__dir">
                        <Selo dominio="sessao" valor={f.status} />
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
          </section>}
          </div>
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
        onFechar={fecharFolha}
        onRespondido={carregar}
      />
      <FolhaNovaSessao
        aberto={!!folha && folha.tipo === 'sessaoNova'}
        quandoInicial={folha && folha.tipo === 'sessaoNova' ? folha.quando || '' : ''}
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
    </div>
  )
}
