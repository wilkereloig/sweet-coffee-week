import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renovar, auth } from '../painel-app/src/lib/marcaApi.js'

test('renovar devolve a mesma sessão quando o token ainda tem mais de 60s de validade', async () => {
  const sessao = { access_token: 'a1', refresh_token: 'r1', expira_em: Date.now() + 5 * 60 * 1000, email: 'x@y.z' }
  let chamouFetch = false
  const r = await renovar(sessao, async () => { chamouFetch = true })
  assert.equal(chamouFetch, false)
  assert.equal(r, sessao)
})

test('renovar troca o token quando expirado e o refresh dá certo', async () => {
  const sessao = { access_token: 'velho', refresh_token: 'r1', expira_em: Date.now() - 1000, email: 'x@y.z' }
  const fetchFalso = async (url, opcoes) => {
    assert.equal(url, 'https://dgfmoibynftadsyjcclg.supabase.co/auth/v1/token?grant_type=refresh_token')
    assert.equal(JSON.parse(opcoes.body).refresh_token, 'r1')
    return { ok: true, json: async () => ({ access_token: 'novo', refresh_token: 'r2', expires_in: 3600, user: { email: 'x@y.z' } }) }
  }
  const r = await renovar(sessao, fetchFalso)
  assert.equal(r.access_token, 'novo')
  assert.equal(r.refresh_token, 'r2')
  assert.ok(r.expira_em > Date.now())
})

test('renovar devolve null quando o refresh falha', async () => {
  const sessao = { access_token: 'velho', refresh_token: 'r1', expira_em: Date.now() - 1000, email: 'x@y.z' }
  const fetchFalso = async () => ({ ok: false, status: 401, json: async () => ({ msg: 'refresh inválido' }) })
  const r = await renovar(sessao, fetchFalso)
  assert.equal(r, null)
})

test('renovar devolve null sem sessão nenhuma, sem chamar fetch', async () => {
  let chamouFetch = false
  const r = await renovar(null, async () => { chamouFetch = true })
  assert.equal(r, null)
  assert.equal(chamouFetch, false)
})

test('auth lê o corpo como JSON e reporta ok/status', async () => {
  const fetchFalso = async (url, opcoes) => {
    assert.equal(url, 'https://dgfmoibynftadsyjcclg.supabase.co/auth/v1/token?grant_type=password')
    assert.equal(opcoes.method, 'POST')
    assert.equal(JSON.parse(opcoes.body).email, 'bocaditos@marcas.sweetcoffeeweek.com.br')
    return { ok: false, status: 400, json: async () => ({ error: 'invalid_grant' }) }
  }
  const r = await auth('token?grant_type=password', { email: 'bocaditos@marcas.sweetcoffeeweek.com.br', password: 'x' }, 'POST', undefined, fetchFalso)
  assert.equal(r.ok, false)
  assert.equal(r.status, 400)
  assert.deepEqual(r.dados, { error: 'invalid_grant' })
})
