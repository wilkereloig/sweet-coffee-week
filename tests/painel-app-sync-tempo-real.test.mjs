import { test } from 'node:test'
import assert from 'node:assert/strict'
import { criarTempoReal } from '../painel-app/src/lib/sync/tempoReal.js'
import { criarServidorFalso, relogioFalso, fluxo } from './helpers/phoenix-falso.mjs'

const CANAIS = ['scw:org', 'scw:pessoa:u1']

function montar({ servidor = {}, canais = CANAIS, token = 'tok1', tokens = null } = {}) {
  const rel = relogioFalso()
  const srv = criarServidorFalso(servidor)
  const ctx = { rel, srv, token, canais: [...canais], sinais: [], reconectou: 0, estados: [] }
  const fila = tokens ? [...tokens] : null
  ctx.t = criarTempoReal({
    url: 'wss://projeto.supabase.co/realtime/v1/websocket',
    apikey: 'sb_publishable_teste',
    WebSocketImpl: srv.WebSocket,
    obterToken: async () => (fila && fila.length > 1 ? fila.shift() : fila ? fila[0] : ctx.token),
    obterCanais: async () => ctx.canais,
    aoSinal: (s) => ctx.sinais.push(s),
    aoReconectar: () => { ctx.reconectou += 1 },
    agendar: rel.agendar, cancelar: rel.cancelar, aleatorio: () => 0,
  })
  ctx.t.ouvirEstado((e) => ctx.estados.push(e))
  return ctx
}
async function iniciarAtivo(ctx) { ctx.t.iniciar(); await fluxo(10) }

test('abre com apikey publicável e vsn 1.0.0, entra em canais PRIVADOS com o token e sem postgres_changes', async () => {
  const c = montar()
  await iniciarAtivo(c)
  const url = c.srv.sockets[0].url
  assert.match(url, /^wss:\/\/projeto\.supabase\.co\/realtime\/v1\/websocket\?apikey=sb_publishable_teste&vsn=1\.0\.0$/)
  assert.deepEqual(c.srv.joins.map((j) => j.topico).sort(), [...CANAIS].sort())
  for (const j of c.srv.joins) {
    assert.equal(j.privado, true)
    assert.equal(j.token, 'tok1')
    assert.deepEqual(j.config.postgres_changes, [])
    assert.equal(j.config.broadcast.self, false)
    assert.equal(j.config.presence.enabled, false)
  }
  assert.equal(c.t.estado().ativo, true)
})

test('"ativo" só depois da confirmação de TODOS os canais — nunca antes', async () => {
  const c = montar({ servidor: { segurar: true } })
  c.t.iniciar(); await fluxo(10)
  assert.equal(c.srv.joins.length, 2, 'pediu a entrada')
  assert.equal(c.t.estado().ativo, false, 'sem phx_reply ainda')
  assert.deepEqual(Object.values(c.t.estado().canais), ['entrando', 'entrando'])
  const [primeiro, ...resto] = c.srv.retidos.splice(0)
  primeiro(); await fluxo()
  assert.equal(c.t.estado().ativo, false, 'um canal só não basta')
  resto.forEach((f) => f()); await fluxo()
  assert.equal(c.t.estado().ativo, true)
})

test('sinal válido chega a aoSinal só com domínio, id opaco e hora; lixo é ignorado', async () => {
  const c = montar()
  await iniciarAtivo(c)
  c.srv.transmitir('scw:org', { d: 'participantes', r: 'abc', t: 123, id: 'm1' })
  c.srv.transmitir('scw:org', { d: 'cadastro' })
  await fluxo()
  assert.deepEqual(c.sinais, [
    { topico: 'scw:org', dominio: 'participantes', ref: 'abc', t: 123 },
    { topico: 'scw:org', dominio: 'cadastro', ref: null, t: null },
  ])
  const antes = c.sinais.length
  c.srv.transmitir('scw:org', { r: 'sem-dominio' })
  c.srv.transmitir('scw:org', { d: 'avisos' }, 'outro_evento')
  c.srv.sockets[0]._receber({ topic: 'realtime:scw:marcas', event: 'broadcast', payload: { event: 'inv', payload: { d: 'fotos' } } })
  c.srv.sockets[0].onmessage({ data: 'isto não é json' })
  c.srv.sockets[0].onmessage({ data: new ArrayBuffer(4) })
  await fluxo()
  assert.equal(c.sinais.length, antes)
})

test('canal negado por permissão não é repetido em laço e não vira "ativo"', async () => {
  const c = montar({ servidor: { aceitar: (t) => (t === 'scw:org' ? { ok: false, motivo: 'Unauthorized: You do not have permissions to read from this Topic' } : { ok: true }) } })
  await iniciarAtivo(c)
  assert.equal(c.t.estado().canais['scw:org'], 'negado')
  assert.deepEqual(c.t.estado().negados, ['scw:org'])
  assert.equal(c.t.estado().ativo, false)
  const joinsAntes = c.srv.joins.length
  await c.rel.avancar(120000)
  assert.equal(c.srv.joins.length, joinsAntes, 'não tenta de novo')
})

test('heartbeat a cada 25 s; sem resposta ao anterior derruba, reconecta e AVISA para reler', async () => {
  const c = montar()
  await iniciarAtivo(c)
  assert.equal(c.reconectou, 0, 'primeira entrada não é reconexão')
  const beats = () => c.srv.sockets[0].enviados.filter((m) => m.event === 'heartbeat').length
  await c.rel.avancar(25000)
  assert.equal(beats(), 1)
  await c.rel.avancar(25000)
  assert.equal(beats(), 2, 'respondido: segue')
  c.srv.mudo = true
  await c.rel.avancar(25000)            // 3º heartbeat sai e ninguém responde
  await c.rel.avancar(25000)            // 4º tique: o anterior continua sem resposta → derruba
  c.srv.mudo = false
  await c.rel.avancar(3000)
  await fluxo(10)
  assert.ok(c.srv.sockets.length >= 2, 'abriu outro socket')
  assert.equal(c.t.estado().ativo, true)
  assert.equal(c.reconectou, 1, 'reconciliação pedida uma vez ao reentrar')
})

test('queda do socket: reconecta com recuo, fica "caido" enquanto isso e reentra nos canais', async () => {
  const c = montar()
  await iniciarAtivo(c)
  c.srv.derrubar()
  await fluxo()
  assert.equal(c.t.estado().conexao, 'caido')
  assert.equal(c.t.estado().ativo, false)
  assert.equal(c.srv.sockets.length, 1, 'ainda no recuo')
  await c.rel.avancar(1000)
  await fluxo(10)
  assert.equal(c.srv.sockets.length, 2)
  assert.equal(c.t.estado().ativo, true)
  assert.equal(c.reconectou, 1)
  assert.equal(c.t.estado().tentativas, 0, 'conexão saudável zera o recuo')
})

test('recuo cresce (1, 2, 5, 10 s) enquanto o servidor não volta', async () => {
  const c = montar()
  await iniciarAtivo(c)
  c.srv.autoAbrir = false                 // sockets novos nunca abrem
  c.srv.derrubar()
  await fluxo()
  const tentativasEm = []
  for (const esperado of [1000, 2000, 5000, 10000, 10000]) {
    const antes = c.srv.sockets.length
    await c.rel.avancar(esperado - 1)
    assert.equal(c.srv.sockets.length, antes, 'ainda não passou ' + esperado)
    await c.rel.avancar(1)
    assert.equal(c.srv.sockets.length, antes + 1, 'tentou em ' + esperado)
    c.srv.sockets[c.srv.sockets.length - 1]._fechar()
    await fluxo()
    tentativasEm.push(c.t.estado().tentativas)
  }
  assert.deepEqual(tentativasEm, [2, 3, 4, 5, 6])
})

test('token renovado vai aos canais ativos pelo quadro access_token; o mesmo token não é reenviado', async () => {
  const c = montar()
  await iniciarAtivo(c)
  await c.rel.avancar(30000)
  assert.equal(c.srv.tokensEnviados.length, 0, 'token igual: nada a enviar')
  c.token = 'tok2'
  await c.rel.avancar(30000)
  assert.deepEqual(c.srv.tokensEnviados.map((x) => x.token), ['tok2', 'tok2'])
  const envio = c.srv.sockets[0].enviados.filter((m) => m.event === 'access_token')
  for (const m of envio) { assert.ok(m.join_ref); assert.ok(m.ref) }
  await c.rel.avancar(30000)
  assert.equal(c.srv.tokensEnviados.length, 2)
})

test('sessão que morreu (token nulo) para tudo: sem reconexão em laço', async () => {
  const c = montar()
  await iniciarAtivo(c)
  c.token = null
  await c.rel.avancar(30000)
  assert.equal(c.t.estado().conexao, 'sem_sessao')
  assert.equal(c.t.estado().ativo, false)
  const abertos = c.srv.sockets.length
  await c.rel.avancar(120000)
  assert.equal(c.srv.sockets.length, abertos)
  assert.equal(c.rel.pendentes(), 0, 'nenhum timer sobrando')
})

test('parar() sai dos canais, fecha o socket, não deixa timer e ignora o que chega depois', async () => {
  const c = montar()
  await iniciarAtivo(c)
  const velho = c.srv.sockets[0]
  const onmsg = velho.onmessage
  c.t.parar()
  assert.equal(velho.readyState, 3)
  assert.deepEqual(velho.enviados.filter((m) => m.event === 'phx_leave').map((m) => m.topic).sort(), ['realtime:scw:org', 'realtime:scw:pessoa:u1'])
  assert.equal(c.rel.pendentes(), 0)
  assert.equal(velho.onmessage, null, 'handlers soltos')
  onmsg?.({ data: JSON.stringify({ topic: 'realtime:scw:org', event: 'broadcast', payload: { event: 'inv', payload: { d: 'avisos' } } }) })
  assert.equal(c.sinais.length, 0, 'mesmo com a referência antiga na mão, o id velho barra')
  assert.equal(c.t.estado().conexao, 'parado')
})

test('StrictMode: iniciar→parar→iniciar deixa UM socket vivo e um join por canal', async () => {
  const c = montar()
  c.t.iniciar(); c.t.parar(); c.t.iniciar()
  c.t.iniciar()                                   // segunda chamada é ignorada
  await fluxo(10)
  const vivos = c.srv.sockets.filter((s) => s.readyState === 1)
  assert.equal(vivos.length, 1)
  const joinsDoVivo = c.srv.joins.filter((j) => j.socket === vivos[0])
  assert.equal(joinsDoVivo.length, 2, 'um join por canal, sem duplicar ouvinte')
  c.srv.transmitir('scw:org', { d: 'edicao' })
  await fluxo()
  assert.equal(c.sinais.length, 1, 'um sinal → uma entrega')
})

test('mensagem do socket antigo depois da reconexão não conta', async () => {
  const c = montar()
  await iniciarAtivo(c)
  const onmsg = c.srv.sockets[0].onmessage
  c.srv.derrubar()
  await c.rel.avancar(1000); await fluxo(10)
  assert.equal(c.t.estado().ativo, true)
  const antes = c.sinais.length
  onmsg?.({ data: JSON.stringify({ topic: 'realtime:scw:org', event: 'broadcast', payload: { event: 'inv', payload: { d: 'avisos' } } }) })
  assert.equal(c.sinais.length, antes)
})

test('atualizarCanais: o que a conta não pode mais ouvir sai, o que ganhou entra', async () => {
  const c = montar()
  await iniciarAtivo(c)
  c.canais = ['scw:pessoa:u1', 'scw:social']
  await c.t.atualizarCanais(); await fluxo(10)
  assert.ok(c.srv.leaves.includes('scw:org'))
  assert.deepEqual(Object.keys(c.t.estado().canais).sort(), ['scw:pessoa:u1', 'scw:social'])
  assert.equal(c.t.estado().ativo, true)
})

test('phx_error de um canal: reentra e a sessão é avisada para reler', async () => {
  const c = montar()
  await iniciarAtivo(c)
  c.srv.erroDeCanal('scw:org')
  await fluxo()
  assert.equal(c.t.estado().ativo, false)
  await c.rel.avancar(1000); await fluxo(10)
  assert.equal(c.t.estado().ativo, true)
  assert.equal(c.reconectou, 1)
})

test('entrada sem resposta no prazo não fica "ativa" e tenta de novo', async () => {
  const c = montar({ servidor: { semResposta: true } })
  await iniciarAtivo(c)
  assert.equal(c.t.estado().ativo, false)
  c.srv.semResposta = false
  await c.rel.avancar(10000)
  await c.rel.avancar(1000)
  await fluxo(10)
  assert.equal(c.t.estado().ativo, true)
})

test('token vencido na entrada: renova e reentra com o token novo', async () => {
  const c = montar({ servidor: { aceitar: (_t, tk) => (tk === 'velho' ? { ok: false, motivo: 'InvalidJWTExpiration: Token has expired 5 seconds ago' } : { ok: true }) }, tokens: ['velho', 'novo'] })
  c.t.iniciar(); await fluxo(10)
  assert.equal(c.t.estado().ativo, false)
  await c.rel.avancar(1000); await fluxo(10)
  assert.equal(c.t.estado().ativo, true)
  assert.ok(c.srv.joins.some((j) => j.token === 'novo'))
})
