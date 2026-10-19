/*
 * Servidor Phoenix/Realtime FALSO + relógio manual, para exercitar o transporte
 * (painel-app/src/lib/sync/tempoReal.js) de ponta a ponta sem rede nem banco.
 * Fala o protocolo vsn 1.0.0: phx_join → phx_reply, heartbeat → phx_reply,
 * access_token (sem resposta), phx_leave, e empurra `broadcast`.
 */
export const fluxo = async (n = 4) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)) }

export function relogioFalso() {
  let t = 0
  let id = 0
  const fila = new Map()
  return {
    agora: () => t,
    agendar: (f, ms) => { const k = ++id; fila.set(k, { quando: t + ms, f, k }); return k },
    cancelar: (k) => { fila.delete(k) },
    pendentes: () => fila.size,
    async avancar(ms) {
      const alvo = t + ms
      for (;;) {
        const proximo = [...fila.values()].filter((v) => v.quando <= alvo).sort((a, b) => a.quando - b.quando || a.k - b.k)[0]
        if (!proximo) break
        fila.delete(proximo.k)
        t = proximo.quando
        await proximo.f()
        await fluxo()
      }
      t = alvo
      await fluxo()
    },
  }
}

export function criarServidorFalso({ aceitar = () => ({ ok: true }), ...opcoes } = {}) {
  const sockets = []
  const servidor = {
    sockets,
    autoAbrir: true,
    mudo: false,                 // true = não responde heartbeat
    semResposta: false,          // true = não responde phx_join
    segurar: false,              // true = guarda as respostas de join até liberar()
    retidos: [],
    liberar() { const r = servidor.retidos.splice(0); for (const f of r) f() },
    aceitar,
    joins: [],                   // tudo que foi pedido: { topico, token, private, socket }
    tokensEnviados: [],          // access_token em quadros 'access_token'
    leaves: [],
    abertos: () => sockets.filter((s) => s.readyState === 1),
    ultimo: () => sockets[sockets.length - 1],
    transmitir(topico, payload, evento = 'inv') {
      for (const s of sockets) {
        if (s.readyState === 1 && s.entrou.has(topico)) {
          s._receber({ topic: 'realtime:' + topico, event: 'broadcast', payload: { event: evento, type: 'broadcast', payload } })
        }
      }
    },
    derrubar(i = sockets.length - 1) { const s = sockets[i]; if (s && s.readyState === 1) s._fechar() },
    erroDeCanal(topico) {
      for (const s of sockets) if (s.readyState === 1 && s.entrou.has(topico)) s._receber({ topic: 'realtime:' + topico, event: 'phx_error', payload: {}, ref: null })
    },
  }
  class FakeWS {
    constructor(url) {
      this.url = url; this.readyState = 0; this.enviados = []; this.entrou = new Map()
      sockets.push(this)
      if (servidor.autoAbrir) setImmediate(() => this._abrir())
    }
    _abrir() { if (this.readyState !== 0) return; this.readyState = 1; if (this.onopen) this.onopen({}) }
    _fechar() { if (this.readyState === 3) return; this.readyState = 3; if (this.onclose) this.onclose({ code: 1006 }) }
    close() { this.readyState = 3 }                 // fechamento pelo cliente: não dispara onclose (ele já limpou os handlers)
    _receber(obj) { if (this.onmessage) this.onmessage({ data: JSON.stringify(obj) }) }
    send(texto) {
      const m = JSON.parse(texto)
      this.enviados.push(m)
      if (m.topic === 'phoenix' && m.event === 'heartbeat') {
        if (!servidor.mudo) setImmediate(() => this._receber({ topic: 'phoenix', event: 'phx_reply', ref: m.ref, payload: { status: 'ok', response: {} } }))
        return
      }
      const topico = String(m.topic || '').replace(/^realtime:/, '')
      if (m.event === 'phx_join') {
        const cfg = (m.payload && m.payload.config) || {}
        servidor.joins.push({ topico, token: m.payload && m.payload.access_token, privado: cfg.private === true, config: cfg, socket: this })
        if (servidor.semResposta) return
        const r = servidor.aceitar(topico, m.payload && m.payload.access_token)
        const agendarResposta = servidor.segurar ? (f) => servidor.retidos.push(f) : (f) => setImmediate(f)
        agendarResposta(() => {
          if (this.readyState !== 1) return
          if (r.ok) { this.entrou.set(topico, m.join_ref); this._receber({ topic: m.topic, event: 'phx_reply', ref: m.ref, join_ref: m.join_ref, payload: { status: 'ok', response: { postgres_changes: [] } } }) }
          else this._receber({ topic: m.topic, event: 'phx_reply', ref: m.ref, join_ref: m.join_ref, payload: { status: 'error', response: { reason: r.motivo || 'Unauthorized: sem permissão' } } })
        })
        return
      }
      if (m.event === 'access_token') { servidor.tokensEnviados.push({ topico, token: m.payload && m.payload.access_token }); return }
      if (m.event === 'phx_leave') { servidor.leaves.push(topico); this.entrou.delete(topico) }
    }
  }
  Object.assign(servidor, opcoes)           // autoAbrir, mudo, semResposta, segurar…
  servidor.WebSocket = FakeWS
  return servidor
}
