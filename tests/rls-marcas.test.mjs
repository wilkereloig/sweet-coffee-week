/* Teste de RLS entre contas de marca — docs/INSTRUCAO-painel-fase2.md §4.
 *
 * Diferente de tests/marca.test.mjs e tests/organizacao.test.mjs, que só leem o
 * script inline de forma estática: este RODA CONTRA O BANCO DE VERDADE. Ele cria
 * duas contas, tenta atravessar de uma para a outra, e apaga tudo no final.
 *
 * Por isso ele não entra no `npm test` comum — precisa de credencial:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role do dashboard>"
 *   node --test tests/rls-marcas.test.mjs
 * Sem a variável, os casos são pulados em vez de falhar.
 *
 * ⚠️ A chave service_role NUNCA entra em arquivo — só ambiente (CLAUDE.md A5).
 */
import { test, before, after, describe } from 'node:test'
import assert from 'node:assert/strict'

const URL_BASE = process.env.SUPABASE_URL || 'https://dgfmoibynftadsyjcclg.supabase.co'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
// Pública por design, igual ao bundle do site (src/lib/supabase.js).
const PUBLICA = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_E6G4mwt0xFzz_Ob0dULd9g_NhlJpH2R'

const SENHA = 'Rls-Teste-' + Math.random().toString(36).slice(2, 10) + '!9'
const carimbo = Date.now()
const contas = { a: null, b: null }

async function req (caminho, { token = SERVICE, apikey = SERVICE, ...init } = {}) {
  const r = await fetch(`${URL_BASE}${caminho}`, {
    ...init,
    headers: {
      apikey, Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json', ...(init.headers || {})
    }
  })
  const texto = await r.text()
  let corpo = null
  try { corpo = texto ? JSON.parse(texto) : null } catch { corpo = texto }
  return { status: r.status, ok: r.ok, corpo }
}

async function criarConta (rotulo) {
  // Mesmo domínio interno que a Edge Function usa: endereço determinístico que
  // não recebe mensagem (CLAUDE.md §10.4-b).
  const email = `rls-${rotulo}-${carimbo}@marcas.sweetcoffeeweek.com.br`
  const u = await req('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password: SENHA, email_confirm: true })
  })
  assert.ok(u.ok, `criar usuário ${rotulo}: ${JSON.stringify(u.corpo)}`)

  const v = await req('/rest/v1/rpc/vincular_marca_manual', {
    method: 'POST',
    body: JSON.stringify({ p_user: u.corpo.id, p_nome: `RLS ${rotulo.toUpperCase()} ${carimbo}` })
  })
  assert.ok(v.ok, `vincular ${rotulo}: ${JSON.stringify(v.corpo)}`)

  const s = await req('/auth/v1/token?grant_type=password', {
    token: PUBLICA, apikey: PUBLICA,
    method: 'POST', body: JSON.stringify({ email, password: SENHA })
  })
  assert.ok(s.ok, `login ${rotulo}: ${JSON.stringify(s.corpo)}`)

  return { userId: u.corpo.id, participanteId: v.corpo, token: s.corpo.access_token }
}

// Toda leitura/escrita do ponto de vista de uma marca logada: token dela,
// apikey pública — exatamente o que /marca/ manda do navegador.
const comoMarca = (conta, caminho, init) =>
  req(caminho, { token: conta.token, apikey: PUBLICA, ...init })

describe('RLS entre contas de marca', { skip: SERVICE ? false : 'sem SUPABASE_SERVICE_ROLE_KEY' }, () => {
  before(async () => {
    contas.a = await criarConta('a')
    contas.b = await criarConta('b')
  })

  after(async () => {
    // Limpeza na ordem das chaves estrangeiras. Roda mesmo se um caso falhar —
    // teste que suja o banco de produção é pior que teste nenhum.
    for (const c of [contas.a, contas.b]) {
      if (!c) continue
      await req(`/rest/v1/participantes_operacao?participante_id=eq.${c.participanteId}`, { method: 'DELETE' })
      await req(`/rest/v1/participantes?id=eq.${c.participanteId}`, { method: 'DELETE' })
      await req(`/rest/v1/perfis?user_id=eq.${c.userId}`, { method: 'DELETE' })
      await req(`/auth/v1/admin/users/${c.userId}`, { method: 'DELETE' })
    }
  })

  test('A enxerga a própria linha em participantes', async () => {
    const r = await comoMarca(contas.a, '/rest/v1/participantes?select=id')
    assert.equal(r.status, 200)
    assert.deepEqual(r.corpo.map(x => x.id), [contas.a.participanteId])
  })

  test('A não lê a linha de B', async () => {
    const r = await comoMarca(contas.a, `/rest/v1/participantes?select=id&id=eq.${contas.b.participanteId}`)
    assert.deepEqual(r.corpo, [])
  })

  test('A não edita a linha de B', async () => {
    const r = await comoMarca(contas.a, `/rest/v1/participantes?id=eq.${contas.b.participanteId}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ nome_marca: 'INVADIDO' })
    })
    assert.deepEqual(r.corpo, [], 'a policy de UPDATE deixou passar')
  })

  test('A não lê a operação de B', async () => {
    const r = await comoMarca(contas.a, `/rest/v1/participantes_operacao?select=participante_id&participante_id=eq.${contas.b.participanteId}`)
    assert.deepEqual(r.corpo, [])
  })

  test('A não edita a operação de B', async () => {
    const r = await comoMarca(contas.a, `/rest/v1/participantes_operacao?participante_id=eq.${contas.b.participanteId}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ combo_preco: 1 })
    })
    assert.deepEqual(r.corpo, [])
  })

  test('A não lê o perfil de B', async () => {
    const r = await comoMarca(contas.a, `/rest/v1/perfis?select=user_id&user_id=eq.${contas.b.userId}`)
    assert.deepEqual(r.corpo, [])
  })

  test('A não cria participante novo', async () => {
    const r = await comoMarca(contas.a, '/rest/v1/participantes', {
      method: 'POST',
      body: JSON.stringify({ user_id: contas.a.userId, nome_marca: 'FORJADA', status_cadastro: 'aguardando_cadastro' })
    })
    assert.ok(!r.ok, 'INSERT não tem policy — tinha que ser recusado')
  })

  test('A não se promove a organizacao em perfis', async () => {
    const r = await comoMarca(contas.a, `/rest/v1/perfis?user_id=eq.${contas.a.userId}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ papel: 'organizacao' })
    })
    // perfis só tem policy de SELECT: o UPDATE é recusado, não silenciosamente ignorado.
    assert.ok(!r.ok || (Array.isArray(r.corpo) && r.corpo.length === 0), 'perfis aceitou UPDATE')
  })
})
