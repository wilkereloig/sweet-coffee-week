/**
 * Teste do interesse em apoiar (Apoiar.jsx). Lógica PURA, offline —
 * roda com `node tests/support-interest.test.mjs` (sem browser, sem rede, sem
 * Supabase real: o RPC é injetado). Cobre: validação clara, regra "email OU
 * whatsapp", payload sem campos internos (status/notas/revisão), sucesso, erro
 * honesto (nunca afirmar "salvo" se a gravação falhar) e bloqueio de inválido.
 */
import assert from 'node:assert/strict'
import {
  SEGMENTOS,
  INTERESSES,
  EMPTY_SUPPORT,
  validateSupport,
  buildSupportPayload,
  submitSupport,
} from '../src/lib/supportInterest.js'

let failures = 0
const test = async (name, fn) => {
  try { await fn(); console.log('  ✓ ' + name) }
  catch (err) { failures++; console.error('  ✗ ' + name + '\n      ' + (err && err.message || err)) }
}

console.log('support-interest')

await test('EMPTY_SUPPORT começa vazio; SEGMENTOS e INTERESSES têm opções', () => {
  assert.equal(EMPTY_SUPPORT.nome, '')
  assert.ok(Array.isArray(SEGMENTOS) && SEGMENTOS.length >= 4)
  assert.ok(Array.isArray(INTERESSES) && INTERESSES.length >= 4)
})

await test('válido com nome + empresa + só e-mail', () => {
  const { ok, errors } = validateSupport({ ...EMPTY_SUPPORT, nome: 'Ana', empresa: 'Marca X', email: 'ana@marca.com.br' })
  assert.equal(ok, true, JSON.stringify(errors))
})

await test('válido com nome + empresa + só whatsapp', () => {
  const { ok, errors } = validateSupport({ ...EMPTY_SUPPORT, nome: 'Ana', empresa: 'Marca X', whatsapp: '(84) 99999-1234' })
  assert.equal(ok, true, JSON.stringify(errors))
})

await test('inválido sem NENHUM contato (email e whatsapp vazios) → erro "contato"', () => {
  const { ok, errors } = validateSupport({ ...EMPTY_SUPPORT, nome: 'Ana', empresa: 'Marca X' })
  assert.equal(ok, false)
  assert.ok(errors.contato, 'esperava erro na chave "contato"')
})

await test('nome e empresa faltando geram erro por campo', () => {
  const { ok, errors } = validateSupport({ ...EMPTY_SUPPORT, email: 'ana@marca.com' })
  assert.equal(ok, false)
  assert.ok(errors.nome)
  assert.ok(errors.empresa)
})

await test('e-mail malformado é rejeitado quando preenchido', () => {
  const { ok, errors } = validateSupport({ ...EMPTY_SUPPORT, nome: 'Ana', empresa: 'X', email: 'ana@sem-ponto' })
  assert.equal(ok, false)
  assert.ok(errors.email)
})

await test('whatsapp curto é rejeitado quando preenchido (e não conta como contato)', () => {
  const { ok, errors } = validateSupport({ ...EMPTY_SUPPORT, nome: 'Ana', empresa: 'X', whatsapp: '123' })
  assert.equal(ok, false)
  // 123 não atinge 10 dígitos → não vale como contato → falta contato
  assert.ok(errors.contato || errors.whatsapp)
})

await test('buildSupportPayload envia SÓ campos públicos — nunca status/reviewed_at/internal_notes', () => {
  const payload = buildSupportPayload({ nome: 'Ana', empresa: 'Marca X', email: 'ANA@MARCA.COM', whatsapp: '(84) 99999-1234', segmento: 'Varejo', interesse: 'Patrocínio', mensagem: 'Oi' })
  const keys = Object.keys(payload)
  for (const forbidden of ['status', 'reviewed_at', 'internal_notes', 'p_status', 'p_reviewed_at', 'p_internal_notes']) {
    assert.ok(!keys.includes(forbidden), `payload não pode conter "${forbidden}"`)
  }
  assert.deepEqual(keys.sort(), [
    'p_email', 'p_empresa', 'p_interesse', 'p_mensagem', 'p_nome', 'p_segmento', 'p_whatsapp',
  ].sort())
  assert.equal(payload.p_email, 'ana@marca.com', 'e-mail deve ir em minúsculas')
  assert.equal(payload.p_nome, 'Ana')
})

await test('opcionais vazios viram null no payload', () => {
  const payload = buildSupportPayload({ nome: 'Ana', empresa: 'X', whatsapp: '(84) 99999-1234' })
  assert.equal(payload.p_email, null)
  assert.equal(payload.p_segmento, null)
  assert.equal(payload.p_interesse, null)
  assert.equal(payload.p_mensagem, null)
})

await test('submitSupport bloqueia inválido e NÃO chama o rpc', async () => {
  let called = false
  const rpc = async () => { called = true; return { error: null } }
  const res = await submitSupport({ ...EMPTY_SUPPORT, nome: 'Ana' }, rpc)
  assert.equal(res.ok, false)
  assert.equal(res.status, 'invalid')
  assert.ok(res.errors && Object.keys(res.errors).length > 0)
  assert.equal(called, false, 'não pode tentar gravar um form inválido')
})

await test('submitSupport chama o rpc certo com o payload público', async () => {
  let seenName, seenPayload
  const rpc = async (name, payload) => { seenName = name; seenPayload = payload; return { error: null } }
  await submitSupport({ nome: 'Ana', empresa: 'Marca X', email: 'ana@marca.com.br' }, rpc)
  assert.equal(seenName, 'submit_support_interest')
  assert.equal(seenPayload.p_email, 'ana@marca.com.br')
  assert.ok(!('status' in seenPayload))
})

await test('sucesso real quando o rpc grava (error null)', async () => {
  const rpc = async () => ({ error: null })
  const res = await submitSupport({ nome: 'Ana', empresa: 'X', email: 'ana@marca.com' }, rpc)
  assert.equal(res.ok, true)
  assert.equal(res.status, 'success')
})

await test('erro do rpc NÃO vira sucesso (não afirmar que salvou)', async () => {
  const rpc = async () => ({ error: { message: 'db down' } })
  const res = await submitSupport({ nome: 'Ana', empresa: 'X', email: 'ana@marca.com' }, rpc)
  assert.equal(res.ok, false)
  assert.equal(res.status, 'error')
})

await test('rpc que lança exceção também é erro honesto', async () => {
  const rpc = async () => { throw new Error('network') }
  const res = await submitSupport({ nome: 'Ana', empresa: 'X', email: 'ana@marca.com' }, rpc)
  assert.equal(res.ok, false)
  assert.equal(res.status, 'error')
})

if (failures > 0) {
  console.error(`\n${failures} teste(s) falharam.`)
  process.exit(1)
}
console.log('\nTudo verde.')
