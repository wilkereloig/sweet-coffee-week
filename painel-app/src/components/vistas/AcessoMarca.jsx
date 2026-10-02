import React from 'react'
import { rpc, chamarFuncao } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { RECADO_MANUAL, textoAcesso, textoTodosAcessos, linkWhatsApp, montarRecado, validarWhatsApp } from '../../lib/participantes'
import { dataHoraCurta } from '../../lib/painelFormat'
import { Folha } from '../Folha'
import { Credenciais } from '../Credenciais'
import { Atividade } from '../Atividade'
import { Secao, traduzirErro, Selo, BotaoIcone, Botao } from '../ui'
import { confirmar, pedirTexto } from '../Confirmar'

/*
 * Acesso das marcas ao painel (29/09/2026, spec acessos-e-guia-da-marca).
 *
 * - Ficha › Acesso: status, envio, datas, histórico e todas as ações.
 * - Lote: gerar acessos / gerar senhas novas para várias marcas e a tela de
 *   resultado com "Copiar todos os acessos", WhatsApp e marcar enviado.
 *
 * A senha temporária só existe na tela onde nasceu. A definitiva, a marca
 * escolhe e ninguém vê (hash no Supabase Auth). Controlar a conta é
 * redefinir, bloquear, encerrar sessões — nunca "descobrir a senha".
 */
const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

export const registrarEnvio = (ids, canal) => rpc('registrar_envio_acesso', { p_secret: lerSenha(), p_participantes: ids, p_canal: canal })
export const gerirAcesso = (ids, acao, motivo = null) => rpc('gerir_acesso_marca', { p_secret: lerSenha(), p_participantes: ids, p_acao: acao, p_motivo: motivo })
export const lerAcessos = async () => Object.fromEntries(((await rpc('get_acessos_marcas', { p_secret: lerSenha() })) || []).map((a) => [a.participante_id, a]))

const ACOES_DO_HISTORICO = /^(acesso\.|criar_acesso_marca|regerar_senha_conta|senha\.trocada)/


/* ── Criar / regerar, uma marca por vez (a função cria usuário no Auth) ──── */
export async function emitirCredenciais(marcas, modo, aoAvancar) {
  const feitos = []
  for (const p of marcas) {
    try {
      const r = modo === 'gerar'
        ? await chamarFuncao('criar-acesso-marca', { secret: lerSenha(), participante_id: p.id })
        : await chamarFuncao('regerar-senha-conta', { secret: lerSenha(), participante_id: p.id })
      if (!r || !r.senha) throw new Error('a função não devolveu as credenciais.')
      // O login real é o que a função devolve (o slug): "nome-2" não se alcança digitando o nome.
      feitos.push({ p, login: r.login || p.slug || p.nome_marca, senha: r.senha })
    } catch (e) {
      const c = e.dados && e.dados.erro
      feitos.push({ p, erro: c === 'conta_ja_existe' ? 'Já tem acesso: use "Gerar novas senhas".' : RECADO_MANUAL[c] || traduzirErro(c || e.message) })
    }
    if (aoAvancar) aoAvancar([...feitos])
  }
  return feitos
}

/* ── Resultado do lote ───────────────────────────────────────────────────── */
export function FolhaResultadoAcessos({ aberto, modo, marcas, onFechar, onMudou, onGerenciar }) {
  const [resultados, setResultados] = React.useState([])
  const [rodando, setRodando] = React.useState(false)
  const [envios, setEnvios] = React.useState({})
  const [copiado, setCopiado] = React.useState(false)
  const [erroEnvio, setErroEnvio] = React.useState(null)
  const iniciou = React.useRef(false)

  React.useEffect(() => {
    if (!aberto) { iniciou.current = false; return }
    if (iniciou.current) return
    iniciou.current = true
    setResultados([]); setEnvios({}); setCopiado(false); setErroEnvio(null); setRodando(true)
    emitirCredenciais(marcas, modo, setResultados).then(() => { setRodando(false); onMudou && onMudou() })
  }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps

  const criados = resultados.filter((r) => r.senha)
  // O selo de envio só muda depois de o servidor gravar; falha aparece.
  const registrar = async (ids, canal) => {
    setErroEnvio(null)
    try {
      await registrarEnvio(ids, canal)
      setEnvios((e) => ({ ...e, ...Object.fromEntries(ids.map((id) => [id, canal])) }))
    } catch (e) {
      setErroEnvio('Não registrou o envio: ' + traduzirErro(e.message))
    }
  }
  async function copiarTodos() {
    const origem = window.location.origin
    const texto = textoTodosAcessos(criados.map((r) => ({ nomeMarca: r.p.nome_marca, responsavel: r.p.responsavel, login: r.login, senha: r.senha })), origem)
    try { await navigator.clipboard.writeText(texto); setCopiado(true); registrar(criados.map((r) => r.p.id), 'copiado') } catch { setCopiado('manual') }
  }
  async function copiarUm(r) {
    try {
      await navigator.clipboard.writeText(textoAcesso({ nomeMarca: r.p.nome_marca, responsavel: r.p.responsavel, login: r.login, senha: r.senha, origem: window.location.origin }))
      registrar([r.p.id], 'copiado')
    } catch { /* os dados estão na tela */ }
  }
  // Sair da tela por qualquer caminho (Fechar ou Gerenciar) descarta as senhas.
  const podeSair = async () => !rodando && (!criados.length || await confirmar('Sair desta tela? As senhas geradas não aparecem de novo.'))
  async function fechar() { if (await podeSair()) onFechar() }

  const titulo = modo === 'gerar' ? 'Gerar acessos' : 'Gerar novas senhas temporárias'
  return (
    <Folha aberto={aberto} larga titulo={titulo} sub={rodando ? 'Gerando ' + resultados.length + ' de ' + marcas.length + '…' : criados.length + (modo === 'gerar' ? ' acessos criados' : ' senhas novas')} onFechar={fechar}>
      <div className="ui-pilha">
        <div className="ui-linha-acoes">
          <button className="og-btn" type="button" disabled={rodando || !criados.length} onClick={copiarTodos}>
            {copiado === true ? 'Copiado' : copiado === 'manual' ? 'Sem área de transferência: copie da lista' : 'Copiar todos os acessos'}
          </button>
          <button className="og-btn og-btn--vazado" type="button" disabled={rodando || !criados.length}
            onClick={async () => { if (await confirmar('Marcar os ' + criados.length + ' acessos como enviados?')) registrar(criados.map((r) => r.p.id), 'enviado_manual') }}>
            Marcar todos como enviados
          </button>
        </div>
        {erroEnvio && <p className="ui-nota ui-nota--erro" role="alert">{erroEnvio}</p>}
        <p className="og-cred__aviso">Anote ou envie agora. <b>As senhas não aparecem de novo.</b> Abrir o WhatsApp não conta como enviado.</p>
        <ul className="ac-lista">
          {resultados.map((r) => {
            const wa = r.senha && linkWhatsApp(r.p.telefone, montarRecado({ nomeMarca: r.p.nome_marca, responsavel: r.p.responsavel, login: r.login, senha: r.senha, origem: window.location.origin }))
            const envio = envios[r.p.id] || 'nao_enviado'
            return (
              <li key={r.p.id} className="ac-linha">
                <div className="ac-linha__quem">
                  <b>{r.p.nome_marca}</b>
                  <span>{r.p.responsavel || 'sem responsável'}{r.p.telefone ? ' · ' + r.p.telefone : ' · sem WhatsApp'}</span>
                </div>
                {r.senha ? (
                  <>
                    <dl className="ac-linha__cred"><dt>Login</dt><dd>{r.login}</dd><dt>Senha temporária</dt><dd>{r.senha}</dd></dl>
                    <div className="ac-linha__estado">
                      <Selo dominio="acesso" valor={envio === 'nao_enviado' ? 'aguardando_envio' : 'aguardando_primeiro_acesso'} />
                      <Selo dominio="envio" valor={envio} />
                    </div>
                    <div className="ac-linha__acoes">
                      <BotaoIcone icone="copiar" rotulo="Copiar acesso" alvo={r.p && r.p.nome_marca} onClick={() => copiarUm(r)} />
                      {wa
                        ? <a className="og-btn og-btn--mini og-btn--vazado" href={wa} target="_blank" rel="noopener noreferrer" onClick={() => registrar([r.p.id], 'whatsapp_aberto')}>WhatsApp</a>
                        : <span className="ui-nota">Sem WhatsApp</span>}
                      <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={envio === 'enviado_manual'} onClick={() => registrar([r.p.id], 'enviado_manual')}>{envio === 'enviado_manual' ? 'Enviado' : 'Marcar enviado'}</button>
                      {onGerenciar && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={async () => { if (await podeSair()) onGerenciar(r.p) }}>Gerenciar</button>}
                    </div>
                  </>
                ) : <p className="ui-nota ui-nota--erro" role="alert">{r.erro}</p>}
              </li>
            )
          })}
        </ul>
      </div>
    </Folha>
  )
}

/* ── Ficha › Acesso: a central da conta de uma marca ─────────────────────── */
export function AbaAcesso({ participante, pode, onMudou, onFechar }) {
  const [acesso, setAcesso] = React.useState(null)
  const [historico, setHistorico] = React.useState(null)
  const [cred, setCred] = React.useState(null)
  const [ocupado, setOcupado] = React.useState(false)
  const [erro, setErro] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const podeGerir = pode('marca.liberar')

  const carregar = React.useCallback(async () => {
    try { setAcesso((await lerAcessos())[participante.id] || null) } catch (e) { setErro(traduzirErro(e.message)) }
    try {
      const l = (await rpc('get_atividade', { p_secret: lerSenha(), p_participante: participante.id, p_limite: 300 })) || []
      setHistorico(l.filter((a) => ACOES_DO_HISTORICO.test(a.acao || '')))
    } catch { setHistorico([]) }
  }, [participante.id])
  React.useEffect(() => { carregar() }, [carregar])

  async function executar(fn, ok) {
    setOcupado(true); setErro(null); setAviso(null)
    try { await fn(); if (ok) setAviso(ok); await carregar(); onMudou && onMudou() }
    catch (e) { const c = e.dados && e.dados.erro; setErro(RECADO_MANUAL[c] || traduzirErro(c || e.message)) }
    finally { setOcupado(false) }
  }

  const criar = async () => {
    if (!await confirmar('Criar o acesso de ' + participante.nome_marca + '?\n\nO login vai ser o nome do estabelecimento e a senha temporária aparece UMA VEZ, aqui.')) return
    executar(async () => {
      const [r] = await emitirCredenciais([participante], 'gerar')
      if (r.erro) throw new Error(r.erro)
      setCred({ login: r.login, senha: r.senha })
    })
  }
  const regerar = async () => {
    // Nunca troca a senha de conta ativa sem avisar (spec §15).
    const msg = acesso && acesso.status === 'ativo'
      ? participante.nome_marca + ' já tem um acesso ativo. Gerar nova senha temporária?\n\nA senha atual deixa de valer e as sessões abertas caem.'
      : 'Gerar uma nova senha temporária para ' + participante.nome_marca + '?\n\nA anterior deixa de valer.'
    if (!await confirmar(msg)) return
    executar(async () => {
      const [r] = await emitirCredenciais([participante], 'regerar')
      if (r.erro) throw new Error(r.erro)
      setCred({ login: r.login, senha: r.senha })
    })
  }
  const acao = async (a, pergunta, ok, comMotivo = false) => {
    let motivo = null
    if (comMotivo) { motivo = await pedirTexto(pergunta, { rotulo: 'Motivo (opcional, fica no histórico)' }); if (motivo === null) return }
    else if (!await confirmar(pergunta)) return
    executar(() => gerirAcesso([participante.id], a, motivo), ok)
  }
  const alterarLogin = async () => {
    const novo = await pedirTexto('Trocar o login da marca', { rotulo: 'Novo nome do estabelecimento (é o login da marca)', valor: participante.nome_marca }, { titulo: 'Trocar o login da marca', acao: 'Continuar', perigo: false })
    if (!novo || novo.trim() === participante.nome_marca) return
    if (!await confirmar('Trocar o login de "' + participante.nome_marca + '" para "' + novo.trim() + '"?\n\nA marca passa a entrar com o nome novo. A senha continua a mesma.')) return
    executar(async () => {
      const r = await chamarFuncao('criar-acesso-marca', { secret: lerSenha(), participante_id: participante.id, novo_nome: novo.trim() })
      setAviso('Login alterado para "' + (r && r.login) + '". Avise a marca.')
    })
  }
  async function copiarAcesso() {
    const texto = textoAcesso({ nomeMarca: participante.nome_marca, responsavel: participante.responsavel, login: participante.slug || participante.nome_marca, origem: window.location.origin })
    try { await navigator.clipboard.writeText(texto); setAviso('Acesso copiado (sem senha: a definitiva só a marca conhece).') } catch { setAviso('Sem área de transferência neste navegador.') }
  }

  // Arquivar/restaurar a marca mora aqui desde a etapa 3 (excluir = arquivar).
  const arquivar = pode('cadastro.editar') && (
    <Secao titulo={participante.arquivado_em ? 'Marca arquivada' : 'Arquivar marca'}
      nota={participante.arquivado_em ? 'Fora das listas desde ' + dataHoraCurta(participante.arquivado_em) + '. Restaurar devolve tudo como estava.' : 'Tira a marca das listas sem apagar nada: cadastro, fotos e histórico ficam guardados.'}>
      <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={ocupado} onClick={async () => {
        const vai = !participante.arquivado_em
        if (vai && !await confirmar('Arquivar ' + participante.nome_marca + '? Ela sai das listas; dá para restaurar depois.')) return
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
        <Secao titulo="Sem acesso criado" nota="Sem acesso. A senha temporária aparece uma vez só.">
          {cred
            ? <Credenciais nomeMarca={participante.nome_marca} responsavel={participante.responsavel} telefone={participante.telefone} login={cred.login} senha={cred.senha} onRegistrar={(c) => registrarEnvio([participante.id], c).then(carregar)} />
            : <button className="og-btn og-btn--mini" type="button" disabled={ocupado || !podeGerir} onClick={criar}>{ocupado ? 'Criando…' : 'Criar acesso para esta marca'}</button>}
          {!podeGerir && <p className="ui-nota">Sua função não libera acesso de marca.</p>}
          {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
        </Secao>
        {arquivar}
      </div>
    )
  }

  const a = acesso || {}
  const bloqueado = a.status === 'bloqueado'
  const desativado = a.status === 'desativado'
  const erroWhats = validarWhatsApp(participante.telefone)
  return (
    <div className="ui-pilha">
      <Secao titulo="Acesso ao painel">
        <dl className="ui-dados">
          <div className="ui-dado"><dt>Login</dt><dd>{participante.nome_marca}</dd></div>
          <div className="ui-dado"><dt>WhatsApp</dt><dd>{participante.telefone || '—'}{erroWhats ? ' · ' + erroWhats : ''}</dd></div>
          <div className="ui-dado"><dt>Status da conta</dt><dd>{a.status ? <Selo dominio="acesso" valor={a.status} /> : '…'}{a.troca_obrigatoria && a.status === 'ativo' ? ' · troca de senha pendente' : ''}</dd></div>
          <div className="ui-dado"><dt>Envio das credenciais</dt><dd>{a.envio ? <Selo dominio="envio" valor={a.envio} /> : '…'}{a.envio_em ? ' · ' + dataHoraCurta(a.envio_em) : ''}</dd></div>
          <div className="ui-dado"><dt>Criado</dt><dd>{a.criado_em ? dataHoraCurta(a.criado_em) : '—'}{a.criado_por ? ' · por ' + a.criado_por : ''}</dd></div>
          <div className="ui-dado"><dt>Último acesso</dt><dd>{a.ultimo_acesso ? dataHoraCurta(a.ultimo_acesso) : 'nunca entrou'}</dd></div>
          <div className="ui-dado"><dt>Senha temporária</dt><dd>{a.senha_emitida_em ? 'emitida ' + dataHoraCurta(a.senha_emitida_em) : '—'}{a.senha_trocada_em && a.senha_trocada_em > (a.senha_emitida_em || '') ? ' · já trocada pela marca' : ' · ainda vale'}</dd></div>
          <div className="ui-dado"><dt>Senha alterada pela marca</dt><dd>{a.senha_trocada_em ? dataHoraCurta(a.senha_trocada_em) : 'ainda não'}</dd></div>
          {bloqueado && <div className="ui-dado"><dt>Motivo do bloqueio</dt><dd>{a.bloqueado_motivo || '—'}</dd></div>}
        </dl>
        {cred && <Credenciais nomeMarca={participante.nome_marca} responsavel={participante.responsavel} telefone={participante.telefone} login={cred.login} senha={cred.senha} onRegistrar={(c) => registrarEnvio([participante.id], c).then(carregar)} />}
      </Secao>

      <Secao titulo="Ações" nota={podeGerir ? 'A senha que a marca escolheu ninguém vê. Para devolver o acesso, gere uma senha temporária nova.' : 'Sua função só consulta o acesso.'}>
        <div className="ac-acoes">
          <Botao icone="chave" disabled={ocupado || !podeGerir} onClick={regerar}>Gerar nova senha temporária</Botao>
          <Botao icone="copiar" variante="secundario" disabled={ocupado} onClick={copiarAcesso}>Copiar acesso</Botao>
          <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={ocupado || !podeGerir || a.envio === 'enviado_manual'} onClick={() => executar(() => registrarEnvio([participante.id], 'enviado_manual'), 'Marcado como enviado.')}>Marcar credenciais como enviadas</button>
          <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={ocupado || !podeGerir} onClick={alterarLogin}>Alterar login</button>
          {bloqueado
            ? <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={ocupado || !podeGerir} onClick={() => acao('desbloquear', 'Desbloquear o acesso de ' + participante.nome_marca + '?', 'Acesso desbloqueado.')}>Desbloquear acesso</button>
            : <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={ocupado || !podeGerir || desativado} onClick={() => acao('bloquear', 'Bloquear o acesso de ' + participante.nome_marca + '? A marca sai do painel agora e não entra até ser desbloqueada.', 'Acesso bloqueado.', true)}>Bloquear acesso</button>}
          <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={ocupado || !podeGerir} onClick={() => acao('encerrar_sessoes', 'Encerrar as sessões abertas de ' + participante.nome_marca + '? Quem estiver dentro precisa entrar de novo (em até 1 hora, quando o acesso atual vence).', 'Sessões encerradas.')}>Encerrar sessões</button>
          <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={ocupado || !podeGerir} onClick={() => acao('forcar_troca', 'Exigir que ' + participante.nome_marca + ' troque a senha no próximo acesso?', 'Troca de senha exigida.')}>Forçar troca de senha</button>
          {desativado
            ? <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={ocupado || !podeGerir} onClick={() => acao('reativar', 'Reativar a conta de ' + participante.nome_marca + '?', 'Conta reativada.')}>Reativar conta</button>
            : <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={ocupado || !podeGerir} onClick={() => acao('desativar', 'Desativar a conta de ' + participante.nome_marca + '? Ela deixa de entrar no painel. Nada é apagado e dá para reativar.', 'Conta desativada.')}>Desativar conta</button>}
        </div>
        {aviso && <p className="ui-nota" role="status">{aviso}</p>}
        {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
      </Secao>

      <Secao titulo="Histórico do acesso" nota="Só ações. Nenhuma senha aparece aqui.">
        {historico === null ? <p className="ui-nota">Carregando…</p>
          : historico.length === 0 ? <p className="ui-nota">Nada registrado ainda.</p>
          : <Atividade linhas={historico} comMarca={false} />}
      </Secao>
      {arquivar}
    </div>
  )
}
