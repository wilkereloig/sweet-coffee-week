/*
 * Gerenciador de sincronização (19/10/2026): junta o transporte de tempo real, o
 * barramento e o estado da página numa coisa só por sessão aberta.
 *
 * Três mecanismos, separados de propósito:
 *   MESMA SESSÃO   gravação confirmada → anuncia na hora (rpc.js / marcaApi.js).
 *   OUTRAS SESSÕES sinal do servidor (Realtime privado) → anuncia 'remota'.
 *   RECONEXÃO      volta à aba, rede de volta, canal reentrando, conferência de
 *                  segurança → `reconciliar()` relê tudo o que está na tela.
 *
 * Modos (o que a tela pode dizer com honestidade):
 *   tempo_real  canais confirmados (phx_reply ok em todos) + conferência a cada 3 min
 *   periodico   sem canal confirmado (acesso compartilhado legado, canal negado,
 *               Realtime fora): relê a cada 45 s com a aba visível. NÃO é tempo real
 *               e não é apresentado como tal.
 *   parado      sem sessão.
 *
 * Situação mostrada ao usuário: atualizado | atualizando | sem_conexao | falha.
 * "Tempo real ativo" só existe depois da confirmação da assinatura.
 *
 * Troca de conta: `parar()` fecha canais, zera o barramento e muda a ÉPOCA —
 * resposta de carga iniciada antes não grava mais na tela (useGuarda). Em outra
 * aba, o evento `storage` da sessão guardada avisa quando a pessoa sai ou entra
 * como outra conta (`aoTrocaDeConta`).
 *
 * Não cria sessão concorrente: o token vem de `obterToken`, o mesmo caminho de
 * renovação do resto do painel (renovarCompartilhado).
 */
export const CONFERENCIA_MS = 180000
export const PERIODICO_MS = 45000
export const VOLTA_MINIMA_MS = 3000

/** `sub` do JWT, só para saber QUEM é (nomear canal, detectar troca de conta). */
export function usuarioDoToken(token) {
  try {
    const parte = String(token || '').split('.')[1]
    if (!parte) return null
    const base = parte.replace(/-/g, '+').replace(/_/g, '/')
    const json = typeof atob === 'function'
      ? decodeURIComponent(atob(base + '='.repeat((4 - (base.length % 4)) % 4)).split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''))
      : Buffer.from(base, 'base64').toString('utf8')
    const sub = JSON.parse(json).sub
    return typeof sub === 'string' ? sub : null
  } catch { return null }
}

export function criarSincronizacao({
  barramento,
  anunciar,                    // (dominios, {ref, origem}) → void
  criarTransporte,             // ({ aoSinal, aoReconectar }) → transporte
  ambiente,                    // { ouvir(evento, fn) → desligar, visivel(), online() }
  agendar = (f, ms) => setTimeout(f, ms),
  cancelar = (t) => clearTimeout(t),
  agora = () => Date.now(),
  conferenciaMs = CONFERENCIA_MS,
  periodicoMs = PERIODICO_MS,
  voltaMinimaMs = VOLTA_MINIMA_MS,
}) {
  let identidade = null          // { tipo: 'org' | 'marca' | 'legado', uid, aoTrocaDeConta, chaveStorage }
  let transporte = null
  let desligaTransporte = null
  let desligaAmbiente = []
  let tLaco = null
  let cargas = 0
  let falhaCarga = false
  let geracao = 0 // muda a cada iniciar/parar: carga de antes não mexe na contagem da sessão nova
  let ultimaEm = null
  let escondidoDesde = null
  const ouvintes = new Set()

  // ── estado público ─────────────────────────────────────────────────────────
  // `atual` é um instantâneo ESTÁVEL: só troca de identidade quando algo muda
  // (useSyncExternalStore exige isso; senão a tela re-renderiza em laço).
  function calcularEstado() {
    const t = transporte ? transporte.estado() : null
    const tempoRealAtivo = !!(t && t.ativo)
    let modo = 'parado'
    // canal negado: o que só ele traria não chega em tempo real → conferência curta (45 s)
    if (identidade) modo = identidade.tipo === 'legado' || !t || !tempoRealAtivo || t.negados.length ? 'periodico' : 'tempo_real'
    const transporteComProblema = !!(t && (t.negados.length > 0 || t.tentativas >= 3))
    let situacao = 'atualizado'
    if (!ambiente.online()) situacao = 'sem_conexao'
    else if (cargas > 0) situacao = 'atualizando'
    else if (falhaCarga || transporteComProblema) situacao = 'falha'
    return {
      modo,
      situacao,
      tempoRealAtivo,
      conectando: !!(t && (t.conexao === 'conectando' || t.conexao === 'aberto') && !tempoRealAtivo),
      ultimaEm,
      detalhe: transporteComProblema ? (t.negados.length ? 'canal_negado' : 'tempo_real_indisponivel') : (falhaCarga ? 'leitura_falhou' : null),
    }
  }
  let atual = null
  function estado() { if (atual === null) atual = calcularEstado(); return atual }
  const avisarEstado = () => {
    const novo = calcularEstado()
    if (atual !== null && JSON.stringify(novo) === JSON.stringify(atual)) return
    atual = novo
    for (const f of [...ouvintes]) { try { f(novo) } catch { /* ouvinte não derruba */ } }
  }
  function ouvirEstado(f) { ouvintes.add(f); return () => ouvintes.delete(f) }

  /** Registra uma carga em andamento (para "atualizando") e o desfecho dela. */
  function rastrear(promessa) {
    const g = geracao
    cargas += 1; avisarEstado()
    return Promise.resolve(promessa).then(
      (v) => { if (g !== geracao) return v; cargas -= 1; falhaCarga = false; ultimaEm = agora(); avisarEstado(); return v },
      (e) => {
        if (g !== geracao) throw e
        cargas -= 1
        // Sessão que morreu não é "falha de sincronização": o App já leva ao login.
        if (!e || e.message !== 'sessao_expirada') falhaCarga = true
        avisarEstado(); throw e
      },
    )
  }

  // ── laço de conferência ────────────────────────────────────────────────────
  function agendarLaco() {
    if (tLaco !== null) cancelar(tLaco)
    if (!identidade) { tLaco = null; return }
    const espera = calcularEstado().modo === 'tempo_real' ? conferenciaMs : periodicoMs
    tLaco = agendar(() => {
      tLaco = null
      if (!identidade) return
      if (ambiente.visivel() && ambiente.online()) barramento.reconciliar()
      agendarLaco()
    }, espera)
  }

  function reconciliar() {
    if (!identidade) return
    barramento.reconciliar()
  }

  /** O botão do indicador (falha / sem conexão): reconecta já e relê tudo. */
  function tentarDeNovo() {
    if (!identidade) return
    if (transporte) transporte.conectarAgora()
    reconciliar()
    avisarEstado()
  }

  // ── sinais do servidor ─────────────────────────────────────────────────────
  function aoSinal({ topico, dominio, ref }) {
    anunciar([dominio], { ref, origem: 'remota' })
    // Mudou o perfil/permissão DESTA pessoa: refaz a lista de canais que ela pode ouvir.
    if (dominio === 'perfis' && transporte && identidade && topico === 'scw:pessoa:' + identidade.uid) transporte.atualizarCanais()
  }

  function aoReconectar() {
    reconciliar()
    agendarLaco()
  }

  // ── ambiente: aba, rede, outra aba ─────────────────────────────────────────
  function ligarAmbiente() {
    desligaAmbiente = [
      ambiente.ouvir('visibilitychange', () => {
        if (!ambiente.visivel()) { escondidoDesde = agora(); return }
        const ficouFora = escondidoDesde === null ? Infinity : agora() - escondidoDesde
        escondidoDesde = null
        voltouAoApp(ficouFora)
      }),
      ambiente.ouvir('pageshow', (e) => { if (e && e.persisted) voltouAoApp(Infinity) }),
      ambiente.ouvir('online', () => {
        if (transporte) transporte.conectarAgora()
        reconciliar(); avisarEstado()
      }),
      ambiente.ouvir('offline', () => avisarEstado()),
      ambiente.ouvir('storage', (e) => aoStorage(e)),
    ]
  }
  function voltouAoApp(ficouForaMs) {
    if (!identidade) return
    if (transporte && transporte.estado().conexao !== 'aberto') transporte.conectarAgora() // socket aberto não se derruba
    if (ficouForaMs >= voltaMinimaMs) reconciliar()
    agendarLaco()
    avisarEstado()
  }

  // Outra aba mudou a sessão guardada: saiu ou entrou como outra pessoa.
  function aoStorage(e) {
    if (!identidade || !identidade.chaveStorage || !e || e.key !== identidade.chaveStorage) return
    if (e.newValue === null || e.newValue === undefined) return trocou('saiu_em_outra_aba')
    let uidNovo = null
    try { uidNovo = usuarioDoToken(JSON.parse(e.newValue).access_token) } catch { /* sessão ilegível */ }
    if (uidNovo && identidade.uid && uidNovo !== identidade.uid) trocou('outra_conta_em_outra_aba')
  }
  function trocou(motivo) {
    const quem = identidade
    parar()
    if (quem && quem.aoTrocaDeConta) { try { quem.aoTrocaDeConta(motivo) } catch { /* o App decide */ } }
  }

  // ── ciclo de vida ──────────────────────────────────────────────────────────
  /**
   * `quem`: { tipo:'org'|'marca'|'legado', uid?, chaveStorage?, aoTrocaDeConta? }.
   * Idempotente para a mesma pessoa (StrictMode monta duas vezes em desenvolvimento).
   */
  function iniciar(quem) {
    if (identidade && identidade.tipo === quem.tipo && identidade.uid === quem.uid) {
      identidade.aoTrocaDeConta = quem.aoTrocaDeConta        // callback sempre o mais novo
      return
    }
    if (identidade) parar()
    identidade = { ...quem }
    cargas = 0; falhaCarga = false; geracao++
    ligarAmbiente()
    if (quem.tipo !== 'legado') {
      transporte = criarTransporte({ aoSinal, aoReconectar })
      let modoAnterior = null
      desligaTransporte = transporte.ouvirEstado(() => {
        avisarEstado()
        const modo = estado().modo
        if (modo !== modoAnterior) { modoAnterior = modo; agendarLaco() }
      })
      transporte.iniciar()
    }
    agendarLaco()
    avisarEstado()
  }

  function parar() {
    if (!identidade && !transporte) return
    if (tLaco !== null) { cancelar(tLaco); tLaco = null }
    for (const d of desligaAmbiente) { try { d() } catch { /* já solto */ } }
    desligaAmbiente = []
    if (desligaTransporte) { desligaTransporte(); desligaTransporte = null }
    if (transporte) { transporte.parar(); transporte = null }
    identidade = null
    cargas = 0; falhaCarga = false; escondidoDesde = null; geracao++
    barramento.reiniciar()
    atual = null
    avisarEstado()
  }

  return { iniciar, parar, estado, ouvirEstado, rastrear, reconciliar, tentarDeNovo, usuarioDoToken }
}
