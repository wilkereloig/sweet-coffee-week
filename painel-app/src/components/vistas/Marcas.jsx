import React from 'react'
import { rpc, chamarFuncao } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { RECADO_MANUAL, slugPrevisto, resumoParticipante, textoTodosAcessos, mascaraWhatsApp, validarWhatsApp } from '../../lib/participantes'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Folha } from '../Folha'
import { Credenciais } from '../Credenciais'
import { Carregando, Vazio, Erro, Selo, LogoMarca, traduzirErro, Botao } from '../ui'
import { FolhaResultadoAcessos, registrarEnvio, gerirAcesso } from './AcessoMarca'
import { FichaMarcaPagina, pendenciasDe, pctCadastro } from './FichaMarcaPagina'
import { urlLogo } from '../../lib/logos'
import { confirmar, pedirTexto } from '../Confirmar'

// Compara nomes sem acento, caixa ou pontuação (mesma regra do banco).
const compacto = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '').replace(/&/g, 'e').replace(/[^a-z0-9]+/g, '')

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

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
    if (!telefone.trim()) { setAviso('O WhatsApp é como você entrega o acesso.'); return }
    if (validarWhatsApp(telefone)) { setAviso(validarWhatsApp(telefone)); return }
    setCriando(true)
    setAviso(null)
    try {
      const r = await chamarFuncao('criar-acesso-marca', {
        secret: lerSenha(),
        marca: { nome: nome.trim(), telefone: telefone.trim(), responsavel: responsavel.trim(), email: email.trim() },
      })
      if (!r || !r.login || !r.senha) throw new Error('a função não devolveu as credenciais.')
      setCred({ login: r.login || nome.trim(), senha: r.senha, participanteId: r.participante_id })
      await onCriada()
    } catch (e) {
      const codigo = e.dados && e.dados.erro
      let recado = RECADO_MANUAL[codigo] || ('Não criou: ' + traduzirErro(e.message))
      if (codigo === 'existe_candidatura') recado += ' Abra a ficha dela em Participantes › Candidaturas e use Criar acesso: assim a candidatura fica ligada à conta.'
      setAviso(recado)
    } finally {
      setCriando(false)
    }
  }

  return (
    <Folha aberto={aberto} titulo="Cadastrar marca" sub="Para quem você convidou sem passar pelo formulário" onFechar={onFechar}>
      <form className="ui-form" onSubmit={criarMarcaManual} noValidate>
        <p className="ui-nota">Nome vira o login; WhatsApp é obrigatório.</p>
        <label className="og-campo"><span>Nome do estabelecimento <abbr title="obrigatório">*</abbr></span>
          <input type="text" autoComplete="off" required disabled={!!cred} value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <p className="ui-nota">O login vai ser: <b>{slugPrevisto(nome) || '…'}</b></p>
        {jaExiste && <p className="ui-nota ui-nota--erro" role="alert">“{jaExiste.nome_marca}” já está cadastrada{jaExiste.user_id ? ' e tem acesso' : ''}. Abra a ficha dela para criar ou regerar o acesso.</p>}
        <label className="og-campo"><span>WhatsApp <abbr title="obrigatório">*</abbr></span>
          <input type="tel" inputMode="tel" autoComplete="off" required disabled={!!cred} placeholder="(84) 99999-9999" value={telefone} onChange={(e) => setTelefone(mascaraWhatsApp(e.target.value))} />
        </label>
        <label className="og-campo"><span>Responsável <em>(opcional)</em></span>
          <input type="text" autoComplete="off" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
        </label>
        <label className="og-campo"><span>E-mail <em>(opcional)</em></span>
          <input type="email" autoComplete="off" placeholder="contato@marca.com.br" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {aviso && <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>}
        {cred && <Credenciais nomeMarca={nome} responsavel={responsavel} telefone={telefone} login={cred.login} senha={cred.senha}
          onRegistrar={cred.participanteId ? (c) => registrarEnvio([cred.participanteId], c) : undefined} />}
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
  const [logos, setLogos] = React.useState({})
  const [erro, setErro] = React.useState(null)
  const [termo, setTermo] = React.useState('')
  const [cadastroAberto, setCadastroAberto] = React.useState(false)
  // Seleção para ações em lote (29/09/2026) e o lote que está rodando.
  const [sel, setSel] = React.useState(() => new Set())
  const [lote, setLote] = React.useState(null) // { modo: 'gerar'|'regerar', marcas }
  const [loteAviso, setLoteAviso] = React.useState(null)
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
  const setFicha = (x) => mudar(x ? { item: x.id, sub: x.aba && x.aba !== 'resumo' ? x.aba : '' } : { item: '', sub: '' }, false)

  const pedido = React.useRef(0)
  const carregar = React.useCallback(async () => {
    setErro(null)
    const senha = lerSenha()
    const meu = ++pedido.current // trocar Arquivadas rápido: só a última resposta vale
    try {
      // admin_ping junto: RPC de leitura não dá erro com senha inválida, só
      // devolve vazio — sem isso, sessão vencida pareceria "nenhuma marca".
      const [valida, lista] = await Promise.all([
        rpc('admin_ping', { p_secret: senha }),
        rpc('get_participantes', { p_secret: senha, p_arquivados: arquivadas }),
      ])
      if (meu !== pedido.current) return
      if (valida !== true) { setErro('A senha desta sessão não vale mais. Saia e entre de novo.'); return }
      setParticipantes(lista || [])
    } catch (e) {
      if (meu === pedido.current) setErro(e.message)
    }
    // Leitura à parte: conversas não podem derrubar a lista (§10.4-b).
    try { setConversas((await rpc('get_conversas', { p_secret: senha })) || []) } catch { setConversas([]) }
    try { setLogos(Object.fromEntries(((await rpc('get_logos', { p_secret: senha })) || []).map((l) => [l.participante_id, l]))) } catch { setLogos({}) }
  }, [arquivadas])

  // Trocou entre ativas e arquivadas: a lista anterior sai da tela (e da
  // seleção) enquanto a outra carrega — senão o lote agiria sobre a errada.
  React.useEffect(() => { setParticipantes(null); setSel(new Set()) }, [arquivadas])
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
        : status.startsWith('acesso_') ? p.status_acesso === status.slice(7)
        : status === 'sem_pendencias' ? !!p.participacao_id && pendenciasDe(p) === 0
        : status === 'com_pendencias' ? pendenciasDe(p) > 0
        : status === 'incompleto' ? Number(p.campos_faltando) > 0
        : status === 'aguardando_aprovacao' ? p.combo_status === 'em_analise'
        : status === 'alteracao' ? p.combo_status === 'correcao_solicitada' || Number(p.correcoes_abertas) > 0
        : status === 'sem_atividade' ? !!p.participacao_id && (!p.ultima_atividade || Date.now() - new Date(p.ultima_atividade) > 7 * 864e5)
        : status === 'sem_conta' ? !p.user_id
        : status === 'com_conta' ? !!p.user_id
        : status === 'possivel' ? p.historico_status === 'possivel_correspondencia'
        : p.status_cadastro === status))
      .sort(ORDENS[ordem])
  }, [participantes, porMarca, termo, status, ordem, f.edicao])

  // Lote: marcas com participação aberta e sem conta (arquivadas ficam de fora).
  const semAcesso = arquivadas ? [] : (participantes || []).filter((p) => !p.user_id && p.participacao_id)
  // Só o que está selecionado E visível: marca escondida por busca ou filtro
  // não entra no lote (nem na contagem que a confirmação mostra).
  const selecionadas = lista.filter((p) => sel.has(p.id))
  const selSemConta = selecionadas.filter((p) => !p.user_id)
  const selComConta = selecionadas.filter((p) => p.user_id)
  const alternar = (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const todasVisiveis = lista.length > 0 && lista.every((p) => sel.has(p.id))

  // Ações em lote. Toda ação que muda conta pede confirmação.
  async function emLote(acao) {
    setLoteAviso(null)
    const ids = selComConta.map((p) => p.id)
    const n = ids.length
    const nome = n === 1 ? '1 marca' : n + ' marcas'
    try {
      if (acao === 'gerar') {
        if (!selSemConta.length) { setLoteAviso('Nenhuma das selecionadas está sem acesso. Para quem já tem, use "Gerar novas senhas".'); return }
        setLote({ modo: 'gerar', marcas: selSemConta }); return
      }
      if (!n) { setLoteAviso('Nenhuma das selecionadas tem acesso ainda. Use "Gerar acessos".'); return }
      if (acao === 'regerar') {
        const ativas = selComConta.filter((p) => p.status_acesso === 'ativo').length
        const pre = ativas ? ativas + (ativas === 1 ? ' marca já tem acesso ativo. ' : ' marcas já têm acesso ativo. ') : ''
        if (!await confirmar(pre + 'Gerar nova senha temporária para ' + nome + '?\n\nA senha atual deixa de valer e as sessões abertas caem.')) return
        setLote({ modo: 'regerar', marcas: selComConta }); return
      }
      if (acao === 'copiar') {
        const texto = textoTodosAcessos(selComConta.map((p) => ({ nomeMarca: p.nome_marca, responsavel: p.responsavel, login: p.slug || p.nome_marca })), window.location.origin)
        await navigator.clipboard.writeText(texto)
        setLoteAviso('Acessos de ' + nome + ' copiados, sem senha. Para mandar senha, gere senhas novas.'); return
      }
      if (acao === 'enviado') {
        if (!await confirmar('Marcar as credenciais de ' + nome + ' como enviadas?')) return
        await registrarEnvio(ids, 'enviado_manual')
      } else {
        const pergunta = {
          bloquear: 'Bloquear o acesso de ' + nome + '? Elas saem do painel agora.',
          desbloquear: 'Desbloquear o acesso de ' + nome + '?',
          forcar_troca: 'Exigir troca de senha no próximo acesso de ' + nome + '?',
        }[acao]
        let motivo = null
        if (acao === 'bloquear') { motivo = await pedirTexto(pergunta, { rotulo: 'Motivo (opcional, fica no histórico)' }); if (motivo === null) return }
        else if (!await confirmar(pergunta)) return
        await gerirAcesso(ids, acao, motivo)
      }
      setLoteAviso('Feito para ' + nome + '.')
      carregar()
    } catch (e) {
      setLoteAviso(traduzirErro(e.message))
    }
  }
  const participanteFicha = ficha && (participantes || []).find((p) => p.id === ficha.id)
  const totalNaoLidas = conversas.reduce((s, c) => s + Number(c.nao_lidas || 0), 0)

  const folhas = (
    <>
      <FolhaResultadoAcessos aberto={!!lote} modo={lote ? lote.modo : 'gerar'} marcas={lote ? lote.marcas : []}
        onFechar={() => { setLote(null); setSel(new Set()) }} onMudou={carregar}
        onGerenciar={(m) => { setLote(null); setFicha({ id: m.id, aba: 'acesso' }) }} />
      <FolhaCadastroManual aberto={cadastroAberto} pode={pode} existentes={participantes || []} onFechar={() => setCadastroAberto(false)} onCriada={carregar} />
    </>
  )
  if (ficha) {
    return (
      <div className="og-embutida">
        {erro && <Erro texto={erro} onTentar={carregar} />}
        {!erro && participantes && !participanteFicha && <Vazio titulo="Marca não encontrada">Ela pode ter sido arquivada. <button type="button" className="ui-link" onClick={() => setFicha(null)}>Voltar às marcas</button></Vazio>}
        {!erro && (!participantes || participanteFicha) && (
          <FichaMarcaPagina
            participante={participanteFicha && { ...participanteFicha, _naoLidas: Number((porMarca[participanteFicha.id] || {}).nao_lidas || 0) }}
            logo={participanteFicha && logos[participanteFicha.id]}
            aba={ficha.aba}
            onAba={(a) => mudar({ sub: a === 'resumo' ? '' : a })}
            onVoltar={() => setFicha(null)}
            pode={pode}
            naoLidas={participanteFicha ? Number((porMarca[participanteFicha.id] || {}).nao_lidas || 0) : 0}
            onLidas={() => rpc('get_conversas', { p_secret: lerSenha() }).then((c) => setConversas(c || [])).catch(() => {})}
            onMudou={carregar}
          />
        )}
        {folhas}
      </div>
    )
  }

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
              <option value="com_pendencias">Com pendências</option>
              <option value="sem_pendencias">Sem pendências</option>
              <option value="incompleto">Cadastro incompleto</option>
              <option value="aguardando_aprovacao">Aguardando aprovação</option>
              <option value="alteracao">Alteração solicitada</option>
              <option value="sem_atividade">Sem atividade há 7 dias</option>
              <option value="com_conta">Com acesso ao painel</option>
              <option value="sem_conta">Sem acesso ao painel</option>
              <option value="acesso_aguardando_envio">Acesso: aguardando envio</option>
              <option value="acesso_aguardando_primeiro_acesso">Acesso: aguardando primeiro acesso</option>
              <option value="acesso_ativo">Acesso: ativo</option>
              <option value="acesso_bloqueado">Acesso: bloqueado</option>
              <option value="acesso_desativado">Acesso: desativado</option>
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
        {semAcesso.length > 0 && (
          <Botao icone="chave" variante="secundario" mini={false} disabled={!pode('marca.liberar')} onClick={() => setLote({ modo: 'gerar', marcas: semAcesso })}>Gerar acessos ({semAcesso.length})</Botao>
        )}
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
          <p>Há dois caminhos: aprovar uma candidatura do "Quero participar" e usar <b>Criar acesso</b> na ficha dela, em Participantes › Candidaturas, ou cadastrar a marca direto aqui, em <b>Cadastrar marca</b>.</p>
          <p>Nos dois casos o login é o nome do estabelecimento e a senha aparece uma vez, para você entregar.</p>
        </Vazio>
      )}
      {!erro && participantes && participantes.length > 0 && lista.length === 0 && <Vazio titulo="Nenhuma marca com esses filtros" />}
      {!erro && lista.length > 0 && (
        <>
          <div className="ac-selecao">
            <label className="ac-marcar">
              <input type="checkbox" checked={todasVisiveis} onChange={() => setSel(todasVisiveis ? new Set() : new Set(lista.map((p) => p.id)))} />
              <span>{lista.length} {lista.length === 1 ? 'marca' : 'marcas'}{selecionadas.length ? ' · ' + selecionadas.length + (selecionadas.length === 1 ? ' selecionada' : ' selecionadas') : ' · selecionar todas'}</span>
            </label>
          </div>
          {selecionadas.length > 0 && pode('marca.liberar') && (
            <div className="ac-barra-lote" role="toolbar" aria-label="Ações nas marcas selecionadas">
              <button className="og-btn og-btn--mini" type="button" onClick={() => emLote('gerar')}>Gerar acessos{selSemConta.length ? ' (' + selSemConta.length + ')' : ''}</button>
              <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => emLote('regerar')}>Gerar novas senhas{selComConta.length ? ' (' + selComConta.length + ')' : ''}</button>
              <Botao icone="copiar" variante="secundario" onClick={() => emLote('copiar')}>Copiar acessos</Botao>
              <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => emLote('enviado')}>Marcar como enviados</button>
              <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => emLote('bloquear')}>Bloquear</button>
              <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => emLote('desbloquear')}>Desbloquear</button>
              <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => emLote('forcar_troca')}>Forçar troca de senha</button>
              <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => setSel(new Set())}>Limpar seleção</button>
            </div>
          )}
          {loteAviso && <p className="ui-nota" role="status">{loteAviso}</p>}
          <ul className="og-lista">
            <li className="ac-item ac-cabeca" aria-hidden="true">
              <span />
              <div className="og-lista__cabeca"><span>Participante</span><span>Situação</span><span>Pendências</span><span>Atualização</span><span>Acesso</span></div>
            </li>
            {lista.map((p) => {
              const pct = pctCadastro(p)
              const n = pendenciasDe(p)
              const l = logos[p.id]
              return (
                <li key={p.id} className="ac-item">
                  <label className="ac-item__sel"><input type="checkbox" checked={sel.has(p.id)} onChange={() => alternar(p.id)} /><span className="ui-oculto">Selecionar {p.nome_marca}</span></label>
                  <button type="button" className="og-item og-item--marca" onClick={() => setFicha({ id: p.id, aba: p._naoLidas ? 'mensagens' : 'resumo' })}>
                    <LogoMarca url={urlLogo(l && l.path)} nome={p.nome_marca} tamanho={40} />
                    <span className="og-item__nome-bloco">
                      <span className="og-item__nome">{p.nome_marca || '(sem nome)'}{p._naoLidas > 0 && <span className="og-item__novas" title={p._naoLidas + (p._naoLidas === 1 ? ' mensagem nova' : ' mensagens novas')}>{p._naoLidas}</span>}</span>
                      <span className="og-item__meta">{[pct != null && 'Cadastro ' + pct + '%', p.tema_combo, p.edicao_codigo && 'edição ' + p.edicao_codigo].filter(Boolean).join(' · ') || resumoParticipante(p)}</span>
                    </span>
                    <span className="og-item__col">
                      <Selo dominio="cadastro" valor={p.status_cadastro} />
                      {p.historico_status === 'possivel_correspondencia' && <Selo tom="atencao">Já participou?</Selo>}
                      {Number(p.pendencias) > 0 && <Selo tom="atencao">{p.pendencias} para revisar</Selo>}
                    </span>
                    <span className="og-item__col"><span className="og-item__pend" data-n={n}>{p.participacao_id ? (n ? n + (n === 1 ? ' pendência' : ' pendências') : 'Nenhuma') : '—'}</span></span>
                    <span className="og-item__col"><span className="og-item__data">{p.ultima_atividade ? dataCurta(p.ultima_atividade) : dataCurta(p.created_at)}</span></span>
                    <span className="og-item__col">{p.status_acesso && <Selo dominio="acesso" valor={p.status_acesso} />}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {folhas}
    </div>
  )
}
