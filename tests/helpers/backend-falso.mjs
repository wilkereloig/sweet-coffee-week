/*
 * Backend FALSO para os testes de navegador do painel (19/10/2026): intercepta TODA
 * chamada ao Supabase (REST, Auth, Functions, Storage) e o WebSocket do Realtime
 * (protocolo Phoenix vsn 1.0.0). Nada chega ao projeto de verdade — pedido fora do
 * esperado é recusado e registrado em `vazados`.
 *
 * Controles: `rpcs[nome] = (corpo) => valor`, `tabelas[nome] = (url, metodo, corpo) => valor`,
 * `atrasos[nome] = [ms,…]` (o 1º pedido que chegar espera o 1º atraso), `falhas[nome] = n`
 * (próximas n respostas são 500). `empurrar(topico, payload)` manda um sinal "inv" a quem entrou no canal.
 */
export const SUPA = 'https://dgfmoibynftadsyjcclg.supabase.co'
export const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

export function jwt(sub, exp = Math.floor(Date.now() / 1000) + 3600) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub, role: 'authenticated', exp })}.assinatura`
}
export const sessaoGuardada = (sub, email, extra = {}) => JSON.stringify({
  access_token: jwt(sub), refresh_token: 'r-' + sub, expira_em: Date.now() + 3600e3, email, ...extra,
})

export function criarBackend() {
  const b = {
    chamadas: {}, ordemChamadas: [], vazados: [], logouts: [], tokens: [],
    rpcs: {}, tabelas: {}, atrasos: {}, falhas: {},
    refresh: () => ({ status: 200, corpo: null }),   // trocável: simula sessão expirada (400)
    total: (nome) => b.chamadas[nome] || 0,
  }
  b.instalar = async (context) => {
    await context.route((url) => url.hostname === 'use.typekit.net' || /fonts\.(googleapis|gstatic)\.com|googletagmanager|google-analytics/.test(url.hostname), (r) => r.abort())
    await context.route((url) => url.href.startsWith(SUPA), async (route) => {
      const req = route.request()
      const url = new URL(req.url())
      const p = url.pathname
      const json = (status, corpo) => route.fulfill({ status, contentType: 'application/json', body: corpo === undefined || corpo === null ? '' : JSON.stringify(corpo) })
      if (p.startsWith('/auth/v1/logout')) { b.logouts.push(req.headers().authorization || ''); return route.fulfill({ status: 204, body: '' }) }
      if (p.startsWith('/auth/v1/token')) {
        const r = b.refresh(req.postDataJSON())
        if (r.status !== 200) return json(r.status, r.corpo || { error: 'invalid_grant' })
        return json(200, r.corpo || { access_token: jwt('renovado'), refresh_token: 'novo', expires_in: 3600, user: { email: 'x@y' } })
      }
      const rpc = p.match(/^\/rest\/v1\/rpc\/(.+)$/)
      const nome = rpc ? rpc[1] : p.startsWith('/rest/v1/') ? p.slice('/rest/v1/'.length) : p
      b.chamadas[nome] = (b.chamadas[nome] || 0) + 1
      b.ordemChamadas.push(nome)
      if (b.falhas[nome] > 0) { b.falhas[nome] -= 1; return json(500, { message: 'erro simulado do servidor' }) }
      const corpo = req.postData() ? (() => { try { return JSON.parse(req.postData()) } catch { return null } })() : null
      let atraso = 0
      if (b.atrasos[nome] && b.atrasos[nome].length) atraso = b.atrasos[nome].shift()
      let valor
      if (rpc) {
        const h = b.rpcs[nome]
        valor = h ? h(corpo, req) : (/^get_/.test(nome) ? [] : null)
      } else if (p.startsWith('/rest/v1/')) {
        const h = b.tabelas[nome]
        valor = h ? h(url, req.method(), corpo) : []
      } else if (p.startsWith('/functions/v1/') || p.startsWith('/storage/')) {
        valor = {}
      } else {
        b.vazados.push(req.method() + ' ' + p)
        return json(404, { message: 'não mockado' })
      }
      const resposta = valor === undefined ? null : JSON.parse(JSON.stringify(valor === null ? null : valor))   // instantâneo NO MOMENTO do pedido
      if (atraso) await dormir(atraso)
      if (resposta === null) return route.fulfill({ status: 204, body: '' })
      return json(200, resposta)
    })
  }
  return b
}

/* Servidor Realtime (Phoenix) falso. `politica(topico, token)` → {ok} | {ok:false, motivo}. */
export function criarRealtime() {
  const s = { conexoes: [], joins: [], leaves: [], tokens: [], politica: () => ({ ok: true }) }
  s.abertas = () => s.conexoes.filter((c) => c.aberta)
  s.instalar = async (context) => {
    await context.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => {
      const c = { ws, aberta: true, topicos: new Map(), url: ws.url() }
      s.conexoes.push(c)
      ws.onClose(() => { c.aberta = false })
      ws.onMessage((raw) => {
        let m
        try { m = JSON.parse(String(raw)) } catch { return }
        if (m.topic === 'phoenix') { ws.send(JSON.stringify({ topic: 'phoenix', event: 'phx_reply', ref: m.ref, payload: { status: 'ok', response: {} } })); return }
        const topico = String(m.topic).replace(/^realtime:/, '')
        if (m.event === 'phx_join') {
          const cfg = (m.payload && m.payload.config) || {}
          s.joins.push({ topico, token: m.payload && m.payload.access_token, privado: cfg.private === true, postgres_changes: cfg.postgres_changes, conexao: c })
          const r = s.politica(topico, m.payload && m.payload.access_token)
          if (r.ok) { c.topicos.set(topico, m.join_ref); ws.send(JSON.stringify({ topic: m.topic, event: 'phx_reply', ref: m.ref, join_ref: m.join_ref, payload: { status: 'ok', response: { postgres_changes: [] } } })) }
          else ws.send(JSON.stringify({ topic: m.topic, event: 'phx_reply', ref: m.ref, join_ref: m.join_ref, payload: { status: 'error', response: { reason: r.motivo || 'Unauthorized: sem permissão' } } }))
          return
        }
        if (m.event === 'access_token') { s.tokens.push({ topico, token: m.payload && m.payload.access_token }); return }
        if (m.event === 'phx_leave') { s.leaves.push(topico); c.topicos.delete(topico) }
      })
    })
  }
  s.empurrar = (topico, payload) => {
    for (const c of s.conexoes) {
      if (!c.aberta || !c.topicos.has(topico)) continue
      c.ws.send(JSON.stringify({ topic: 'realtime:' + topico, event: 'broadcast', payload: { event: 'inv', type: 'broadcast', payload } }))
    }
  }
  s.derrubar = () => { for (const c of s.conexoes) if (c.aberta) c.ws.close({ code: 1006, reason: 'queda simulada' }) }
  return s
}
