/*
 * Transporte do tempo real (19/10/2026): cliente MÍNIMO do protocolo Phoenix do
 * Supabase Realtime (vsn 1.0.0 — JSON em quadros de texto), só para o que o
 * painel usa: entrar em canais PRIVADOS e receber o broadcast "inv" que o banco
 * manda por gatilho. Sem supabase-js (mesma decisão de rpc.js: ~100 KB para
 * fazer o que cabe em 250 linhas) e sem postgres_changes — nada de registro
 * trafega por aqui.
 *
 * Protocolo conferido em https://supabase.com/docs/guides/realtime/protocol e no
 * @supabase/realtime-js 2.106 (RealtimeChannel.subscribe monta o mesmo join):
 *   URL    wss://<ref>.supabase.co/realtime/v1/websocket?apikey=<publicável>&vsn=1.0.0
 *   join   { topic:"realtime:<canal>", event:"phx_join", ref, join_ref,
 *            payload:{ config:{ broadcast:{ack:false,self:false},
 *                               presence:{key:"",enabled:false},
 *                               postgres_changes:[], private:true },
 *                      access_token } }
 *   beat   { topic:"phoenix", event:"heartbeat", payload:{}, ref }   (≤ 25 s)
 *   token  { topic, event:"access_token", payload:{access_token}, ref, join_ref }
 *   recebe { topic, event:"broadcast", payload:{ event:"inv", payload:{d,r,t,id} } }
 *
 * Regras que isto garante (e os testes exercitam com um servidor Phoenix falso):
 *   · "ativo" só depois do phx_reply ok de TODOS os canais — nunca antes;
 *   · um socket por vez: sinal, resposta e fechamento de socket antigo são
 *     ignorados (StrictMode, reconexão e troca de conta não duplicam ouvinte);
 *   · queda → reconecta com recuo (1, 2, 5, 10 s + folga) e, ao reentrar, avisa
 *     `aoReconectar` para a sessão reler o que pode ter se perdido;
 *   · o token vem de `obterToken` (o MESMO caminho de renovação do restante do
 *     painel); este módulo nunca faz login nem refresh por conta própria;
 *   · canal recusado por permissão ("Unauthorized") não é repetido em laço.
 */
const CODIGOS_NEGADOS = new Set([
  'Unauthorized', 'MalformedJWT', 'JwtSignatureError', 'TopicNameRequired', 'TenantNotFound',
  'RealtimeDisabledForTenant', 'RealtimeDisabledForConfiguration',
])

export function criarTempoReal({
  url,
  apikey,
  WebSocketImpl = globalThis.WebSocket,
  obterToken,
  obterCanais,
  aoSinal = () => {},
  aoReconectar = () => {},
  agendar = (f, ms) => setTimeout(f, ms),
  cancelar = (t) => clearTimeout(t),
  aleatorio = Math.random,
  heartbeatMs = 25000,
  recuoMs = [1000, 2000, 5000, 10000],
  tokenCadaMs = 30000,
  entradaMs = 10000,
  privado = true,                // só a sonda de diagnóstico usa false (canal público de teste)
} = {}) {
  let ligado = false
  let idSocket = 0               // muda a cada socket; tudo que vem de um id velho é ignorado
  let ws = null
  let conexao = 'parado'         // parado | conectando | aberto | caido | sem_sessao
  let erro = null
  let tentativas = 0
  let jaAtivouUmaVez = false
  let seq = 0
  let token = null
  const canais = new Map()       // tópico → { estado, joinRef, tentativas, prazo }
  const ouvintes = new Set()
  let tBeat = null, tToken = null, tReconexao = null
  let beatPendente = false

  const topicoWs = (t) => 'realtime:' + t
  const novoRef = () => String(++seq)

  function estado() {
    const lista = [...canais.entries()]
    // Canal NEGADO não volta sozinho: conta só os que podem ficar ativos (senão um negado
    // deixava `ativo` falso para sempre e cada volta ao app reconectava um socket saudável).
    const possiveis = lista.filter(([, c]) => c.estado !== 'negado')
    const todosAtivos = possiveis.length > 0 && possiveis.every(([, c]) => c.estado === 'ativo')
    return {
      conexao,
      erro,
      ativo: conexao === 'aberto' && todosAtivos,
      canais: Object.fromEntries(lista.map(([t, c]) => [t, c.estado])),
      negados: lista.filter(([, c]) => c.estado === 'negado').map(([t]) => t),
      tentativas,
    }
  }
  const mudou = () => { const e = estado(); for (const f of [...ouvintes]) { try { f(e) } catch { /* ouvinte não derruba o transporte */ } } }
  function ouvirEstado(f) { ouvintes.add(f); return () => ouvintes.delete(f) }

  function enviar(msg) {
    try {
      if (ws && ws.readyState === 1) { ws.send(JSON.stringify(msg)); return true }
    } catch { /* quadro perdido: o heartbeat acusa a queda */ }
    return false
  }

  function limparTimers() {
    for (const t of [tBeat, tToken, tReconexao]) if (t !== null) cancelar(t)
    tBeat = tToken = tReconexao = null
  }

  // ── conexão ────────────────────────────────────────────────────────────────
  function conectar() {
    if (!ligado) return
    if (tReconexao !== null) { cancelar(tReconexao); tReconexao = null }
    const meu = ++idSocket
    conexao = 'conectando'; erro = null; mudou()
    let s
    try {
      s = new WebSocketImpl(url + '?apikey=' + encodeURIComponent(apikey) + '&vsn=1.0.0')
    } catch (e) {
      erro = 'socket'; quedaDeConexao(meu); return
    }
    ws = s
    s.onopen = () => { if (meu === idSocket) aoAbrir(meu) }
    s.onmessage = (ev) => { if (meu === idSocket) aoMensagem(meu, ev && ev.data) }
    s.onclose = () => { if (meu === idSocket) quedaDeConexao(meu) }
    s.onerror = () => { if (meu === idSocket) erro = 'socket' }
  }

  async function aoAbrir(meu) {
    conexao = 'aberto'; mudou()
    agendarBeat(meu); agendarToken(meu)
    await entrarNosCanais(meu)
  }

  function agendarBeat(meu) {
    if (tBeat !== null) cancelar(tBeat)
    beatPendente = false
    const tique = () => {
      if (meu !== idSocket || !ligado) return
      if (beatPendente) { erro = 'heartbeat'; quedaDeConexao(meu); return }   // sem resposta ao anterior
      beatPendente = true
      enviar({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: novoRef() })
      tBeat = agendar(tique, heartbeatMs)
    }
    tBeat = agendar(tique, heartbeatMs)
  }

  function agendarToken(meu) {
    if (tToken !== null) cancelar(tToken)
    const tique = async () => {
      if (meu !== idSocket || !ligado) return
      let t = null
      try { t = await obterToken() } catch { t = token }   // falha passageira: mantém o atual
      if (meu !== idSocket || !ligado) return
      if (t === null) { parar('sessao_expirada'); return }
      if (t && t !== token) {
        token = t
        for (const [topico, c] of canais) {
          if (c.estado === 'ativo') enviar({ topic: topicoWs(topico), event: 'access_token', payload: { access_token: t }, ref: novoRef(), join_ref: c.joinRef })
        }
      }
      tToken = agendar(tique, tokenCadaMs)
    }
    tToken = agendar(tique, tokenCadaMs)
  }

  async function entrarNosCanais(meu) {
    let t, lista
    try {
      t = await obterToken()
      if (meu !== idSocket) return
      if (!t) { parar('sem_sessao'); return }
      token = t
      lista = await obterCanais()
    } catch (e) {
      if (meu !== idSocket) return
      erro = 'canais'; quedaDeConexao(meu); return
    }
    if (meu !== idSocket || !ligado) return
    // Canais que a conta não pode mais ouvir saem; os novos entram.
    for (const topico of [...canais.keys()]) {
      if (!lista.includes(topico)) sairDoCanal(topico)
    }
    for (const topico of lista) entrarNoCanal(meu, topico)
    mudou()
  }

  function entrarNoCanal(meu, topico) {
    const joinRef = novoRef()
    const c = canais.get(topico) || { tentativas: 0 }
    Object.assign(c, { estado: 'entrando', joinRef })
    canais.set(topico, c)
    const ok = enviar({
      topic: topicoWs(topico), event: 'phx_join', ref: joinRef, join_ref: joinRef,
      payload: {
        config: { broadcast: { ack: false, self: false }, presence: { key: '', enabled: false }, postgres_changes: [], private: privado },
        access_token: token,
      },
    })
    if (!ok) { quedaDeConexao(meu); return }
    // Sem resposta no prazo: conta como falha de entrada (nunca como "ativo").
    c.prazo = agendar(() => {
      if (meu !== idSocket || canais.get(topico) !== c || c.estado !== 'entrando') return
      c.estado = 'erro'; erro = 'entrada_demorou'; mudou()
      reentrar(meu, topico, c)
    }, entradaMs)
  }

  function sairDoCanal(topico) {
    const c = canais.get(topico)
    if (!c) return
    if (c.prazo) cancelar(c.prazo)
    enviar({ topic: topicoWs(topico), event: 'phx_leave', payload: {}, ref: novoRef(), join_ref: c.joinRef })
    canais.delete(topico)
  }

  function reentrar(meu, topico, c) {
    c.tentativas = (c.tentativas || 0) + 1
    const espera = recuoMs[Math.min(c.tentativas - 1, recuoMs.length - 1)] + Math.floor(aleatorio() * 250)
    agendar(() => {
      if (meu !== idSocket || !ligado || canais.get(topico) !== c) return
      entrarNoCanal(meu, topico)
    }, espera)
  }

  // ── mensagens ──────────────────────────────────────────────────────────────
  function aoMensagem(meu, dados) {
    if (typeof dados !== 'string') return
    let m
    try { m = JSON.parse(dados) } catch { return }
    if (!m || typeof m !== 'object') return
    const { topic, event, payload } = m

    if (topic === 'phoenix') { if (event === 'phx_reply') beatPendente = false; return }
    if (typeof topic !== 'string' || !topic.startsWith('realtime:')) return
    const topico = topic.slice('realtime:'.length)
    const c = canais.get(topico)

    if (event === 'broadcast') {
      const b = payload || {}
      if (!c || b.event !== 'inv') return
      const p = b.payload || {}
      if (typeof p.d !== 'string') return
      aoSinal({ topico, dominio: p.d, ref: typeof p.r === 'string' ? p.r : null, t: typeof p.t === 'number' ? p.t : null })
      return
    }
    if (!c) return

    if (event === 'phx_reply') {
      if (m.ref !== c.joinRef) return              // resposta de outra coisa (ex.: access_token) ou de join antigo
      if (c.prazo) cancelar(c.prazo)
      if (payload && payload.status === 'ok') {
        c.estado = 'ativo'; c.tentativas = 0; erro = null
        mudou()
        if (estado().ativo) {
          tentativas = 0                                  // conexão saudável: o recuo recomeça do 1 s
          const foiReconexao = jaAtivouUmaVez
          jaAtivouUmaVez = true
          if (foiReconexao) { try { aoReconectar() } catch { /* a sessão decide */ } }
        }
        return
      }
      const motivo = String((payload && payload.response && payload.response.reason) || '')
      const codigo = motivo.split(':')[0].trim()
      if (CODIGOS_NEGADOS.has(codigo)) { c.estado = 'negado'; erro = 'negado'; mudou(); return }
      c.estado = 'erro'; erro = codigo || 'entrada'; mudou()
      if (codigo === 'InvalidJWTExpiration') renovarEReentrar(meu, topico, c)
      else reentrar(meu, topico, c)
      return
    }
    if (event === 'phx_error' || event === 'phx_close') {
      if (c.estado === 'negado') return
      c.estado = 'erro'; mudou()
      reentrar(meu, topico, c)
      return
    }
    if (event === 'system' && payload && payload.status === 'error') {
      // Erro de canal vem seguido de phx_close; o recuo acontece lá. Token vencido
      // pede token novo antes.
      if (/expired/i.test(String(payload.message || ''))) renovarEReentrar(meu, topico, c)
    }
  }

  async function renovarEReentrar(meu, topico, c) {
    try {
      const t = await obterToken()
      if (meu !== idSocket) return
      if (!t) { parar('sessao_expirada'); return }
      token = t
    } catch { /* tenta com o recuo normal */ }
    reentrar(meu, topico, c)
  }

  // ── queda e retomada ───────────────────────────────────────────────────────
  function quedaDeConexao(meu) {
    if (meu !== idSocket || !ligado) return
    const velho = ws
    idSocket += 1                                     // o socket velho passa a ser ignorado
    ws = null
    try { if (velho) { velho.onopen = velho.onmessage = velho.onclose = velho.onerror = null; velho.close() } } catch { /* já fechado */ }
    limparTimers()
    for (const c of canais.values()) { if (c.prazo) cancelar(c.prazo); c.estado = 'erro' }
    conexao = 'caido'
    tentativas += 1
    mudou()
    const espera = recuoMs[Math.min(tentativas - 1, recuoMs.length - 1)] + Math.floor(aleatorio() * 250)
    tReconexao = agendar(conectar, espera)
  }

  function iniciar() {
    if (ligado) return
    ligado = true; tentativas = 0; jaAtivouUmaVez = false; erro = null
    conectar()
  }

  /** Reconecta já (volta ao app, voltou a rede) em vez de esperar o recuo. */
  function conectarAgora() {
    if (!ligado) return
    if (conexao === 'aberto' && estado().ativo) return
    if (conexao === 'conectando') return
    idSocket += 1
    const velho = ws; ws = null
    try { if (velho) { velho.onopen = velho.onmessage = velho.onclose = velho.onerror = null; velho.close() } } catch { /* já fechado */ }
    limparTimers()
    for (const c of canais.values()) { if (c.prazo) cancelar(c.prazo); c.estado = 'erro' }
    conectar()
  }

  /** Pede de novo a lista de canais permitidos (permissão mudou) e ajusta as entradas. */
  async function atualizarCanais() {
    if (!ligado || conexao !== 'aberto') return
    const meu = idSocket
    try {
      const lista = await obterCanais()
      if (meu !== idSocket) return
      for (const topico of [...canais.keys()]) if (!lista.includes(topico)) sairDoCanal(topico)
      for (const topico of lista) { const c = canais.get(topico); if (!c || c.estado === 'negado') entrarNoCanal(meu, topico) }
      mudou()
    } catch { /* mantém os canais atuais */ }
  }

  function parar(motivo = 'parado') {
    const estavaLigado = ligado
    ligado = false
    idSocket += 1
    const velho = ws; ws = null
    if (velho) {
      try {
        for (const [topico, c] of canais) if (velho.readyState === 1) velho.send(JSON.stringify({ topic: topicoWs(topico), event: 'phx_leave', payload: {}, ref: novoRef(), join_ref: c.joinRef }))
      } catch { /* melhor esforço */ }
      try { velho.onopen = velho.onmessage = velho.onclose = velho.onerror = null; velho.close(1000) } catch { /* já fechado */ }
    }
    limparTimers()
    for (const c of canais.values()) if (c.prazo) cancelar(c.prazo)
    canais.clear()
    token = null
    conexao = motivo === 'sessao_expirada' || motivo === 'sem_sessao' ? 'sem_sessao' : 'parado'
    erro = motivo === 'parado' ? null : motivo
    if (estavaLigado || conexao === 'sem_sessao') mudou()
  }

  return { iniciar, parar, conectarAgora, atualizarCanais, estado, ouvirEstado }
}
