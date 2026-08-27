import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rpc, chamarFuncao } from '../painel-app/src/lib/rpc.js'

test('rpc devolve o corpo já convertido em JSON', async () => {
  const fetchFalso = async (url, opcoes) => {
    assert.equal(url, 'https://dgfmoibynftadsyjcclg.supabase.co/rest/v1/rpc/admin_ping')
    assert.equal(opcoes.method, 'POST')
    assert.equal(JSON.parse(opcoes.body).p_secret, 'abc')
    return { ok: true, text: async () => 'true' }
  }
  const r = await rpc('admin_ping', { p_secret: 'abc' }, fetchFalso)
  assert.equal(r, true)
})

test('rpc trata resposta 204 sem corpo como null, não como erro', async () => {
  // ⚠️ Bug real já documentado no CLAUDE.md do projeto: RPC `returns void`
  // responde 204 sem corpo, e `r.json()` em cima do vazio estoura. Este
  // teste existe pra essa classe de bug nunca voltar aqui.
  const fetchFalso = async () => ({ ok: true, text: async () => '' })
  const r = await rpc('registrar_algo', {}, fetchFalso)
  assert.equal(r, null)
})

test('rpc lança erro com a mensagem do banco quando a resposta não é ok', async () => {
  const fetchFalso = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ message: 'senha errada' }),
  })
  await assert.rejects(() => rpc('admin_ping', { p_secret: 'x' }, fetchFalso), /senha errada/)
})

test('chamarFuncao devolve o corpo em JSON quando ok', async () => {
  const fetchFalso = async (url, opcoes) => {
    assert.equal(url, 'https://dgfmoibynftadsyjcclg.supabase.co/functions/v1/criar-acesso-marca')
    assert.equal(opcoes.method, 'POST')
    return { ok: true, json: async () => ({ senha_gerada: 'abc123' }) }
  }
  const r = await chamarFuncao('criar-acesso-marca', { slug: 'bocaditos' }, fetchFalso)
  assert.deepEqual(r, { senha_gerada: 'abc123' })
})

test('chamarFuncao lança erro com detalhe/erro do corpo e anexa dados quando não-ok', async () => {
  const fetchFalso = async () => ({
    ok: false,
    status: 409,
    json: async () => ({ erro: 'já existe', candidatura_id: 'xyz' }),
  })
  await assert.rejects(
    () => chamarFuncao('criar-acesso-marca', {}, fetchFalso),
    (e) => {
      assert.match(e.message, /já existe/)
      assert.deepEqual(e.dados, { erro: 'já existe', candidatura_id: 'xyz' })
      return true
    },
  )
})

test('chamarFuncao sem JSON no erro cai no HTTP status', async () => {
  const fetchFalso = async () => ({
    ok: false,
    status: 500,
    json: async () => { throw new Error('corpo vazio') },
  })
  await assert.rejects(() => chamarFuncao('x', {}, fetchFalso), /HTTP 500/)
})
