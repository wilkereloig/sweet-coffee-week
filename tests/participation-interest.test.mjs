/**
 * Teste do pré-cadastro de participação (Participar.jsx). Lógica PURA, offline —
 * roda com `node tests/participation-interest.test.mjs` (sem browser, sem rede,
 * sem Supabase real: o RPC é injetado). Cobre o que o brief exige: validação
 * clara, payload sem campos internos (status/notas/revisão), sucesso, erro
 * honesto (nunca afirmar "salvo" se a gravação falhar) e bloqueio de inválido.
 */
import assert from 'node:assert/strict'
import {
  NEGOCIOS,
  DEFAULT_CIDADE,
  EMPTY_INTEREST,
  validateInterest,
  buildInterestPayload,
  submitInterest,
} from '../src/lib/participationInterest.js'

let failures = 0
const test = async (name, fn) => {
  try { await fn(); console.log('  ✓ ' + name) }
  catch (err) { failures++; console.error('  ✗ ' + name + '\n      ' + (err && err.message || err)) }
}

// marca válida completa (todos os obrigatórios preenchidos)
const validForm = () => ({
  marca: 'Doce Ateliê',
  tipo: 'Confeitaria',
  bairro: 'Petrópolis',
  cidade: 'Natal/RN',
  responsavel: 'Ana Lima',
  email: 'ana@doceatelie.com.br',
  whatsapp: '(84) 99999-1234',
  instagram: '@doceatelie',
  apresentacao: 'Confeitaria autoral de Natal.',
})

console.log('participation-interest')

await test('EMPTY_INTEREST já traz a cidade padrão Natal/RN, editável', () => {
  assert.equal(EMPTY_INTEREST.cidade, DEFAULT_CIDADE)
  assert.equal(DEFAULT_CIDADE, 'Natal/RN')
})

await test('NEGOCIOS lista tipos de estabelecimento (não pede CNPJ/documento)', () => {
  assert.ok(Array.isArray(NEGOCIOS) && NEGOCIOS.length >= 4)
  assert.ok(NEGOCIOS.includes('Confeitaria'))
})

await test('form completo é válido', () => {
  const { ok, errors } = validateInterest(validForm())
  assert.equal(ok, true)
  assert.deepEqual(errors, {})
})

await test('obrigatórios faltando geram erro por campo (marca, tipo, bairro, cidade, responsável, e-mail, whatsapp)', () => {
  const { ok, errors } = validateInterest({ ...EMPTY_INTEREST, cidade: '' })
  assert.equal(ok, false)
  for (const f of ['marca', 'tipo', 'bairro', 'cidade', 'responsavel', 'email', 'whatsapp']) {
    assert.ok(errors[f], `esperava erro em "${f}"`)
  }
})

await test('instagram e apresentação são opcionais (ausência não invalida)', () => {
  const f = validForm(); f.instagram = ''; f.apresentacao = ''
  const { ok, errors } = validateInterest(f)
  assert.equal(ok, true, JSON.stringify(errors))
})

await test('e-mail malformado é rejeitado', () => {
  const f = validForm(); f.email = 'ana@sem-ponto'
  const { ok, errors } = validateInterest(f)
  assert.equal(ok, false)
  assert.ok(errors.email)
})

await test('whatsapp sem dígitos suficientes é rejeitado', () => {
  const f = validForm(); f.whatsapp = '123'
  const { ok, errors } = validateInterest(f)
  assert.equal(ok, false)
  assert.ok(errors.whatsapp)
})

await test('validação por etapa: etapa 1 ignora campos da etapa 2', () => {
  const step1Only = { ...EMPTY_INTEREST, marca: 'X', tipo: 'Doceria', bairro: 'Centro', cidade: 'Natal/RN' }
  const { ok } = validateInterest(step1Only, { step: 1 })
  assert.equal(ok, true)
})

await test('buildInterestPayload envia SÓ campos públicos — nunca status/reviewed_at/internal_notes', () => {
  const payload = buildInterestPayload(validForm())
  const keys = Object.keys(payload)
  // nenhum campo interno gerenciado pelo servidor
  for (const forbidden of ['status', 'reviewed_at', 'internal_notes', 'p_status', 'p_reviewed_at', 'p_internal_notes']) {
    assert.ok(!keys.includes(forbidden), `payload não pode conter "${forbidden}"`)
  }
  // exatamente os campos do formulário público
  assert.deepEqual(keys.sort(), [
    'p_apresentacao', 'p_bairro', 'p_cidade', 'p_email', 'p_instagram',
    'p_marca', 'p_responsavel', 'p_tipo', 'p_whatsapp',
  ].sort())
  assert.equal(payload.p_marca, 'Doce Ateliê')
})

await test('submitInterest bloqueia inválido e NÃO chama o rpc', async () => {
  let called = false
  const rpc = async () => { called = true; return { error: null } }
  const res = await submitInterest({ ...EMPTY_INTEREST, cidade: '' }, rpc)
  assert.equal(res.ok, false)
  assert.equal(res.status, 'invalid')
  assert.ok(res.errors && Object.keys(res.errors).length > 0)
  assert.equal(called, false, 'não pode tentar gravar um form inválido')
})

await test('submitInterest chama o rpc certo com o payload público', async () => {
  let seenName, seenPayload
  const rpc = async (name, payload) => { seenName = name; seenPayload = payload; return { error: null } }
  await submitInterest(validForm(), rpc)
  assert.equal(seenName, 'submit_participation_interest')
  assert.equal(seenPayload.p_email, 'ana@doceatelie.com.br')
  assert.ok(!('status' in seenPayload))
})

await test('sucesso real quando o rpc grava (error null)', async () => {
  const rpc = async () => ({ error: null })
  const res = await submitInterest(validForm(), rpc)
  assert.equal(res.ok, true)
  assert.equal(res.status, 'success')
})

await test('erro do rpc NÃO vira sucesso (não afirmar que salvou)', async () => {
  const rpc = async () => ({ error: { message: 'db down' } })
  const res = await submitInterest(validForm(), rpc)
  assert.equal(res.ok, false)
  assert.equal(res.status, 'error')
})

await test('rpc que lança exceção também é erro honesto', async () => {
  const rpc = async () => { throw new Error('network') }
  const res = await submitInterest(validForm(), rpc)
  assert.equal(res.ok, false)
  assert.equal(res.status, 'error')
})

if (failures > 0) {
  console.error(`\n${failures} teste(s) falharam.`)
  process.exit(1)
}
console.log('\nTudo verde.')
