/**
 * Central de Dúvidas e contato (Contato.jsx) — lógica PURA, offline. Roda com
 * `node tests/contact.test.mjs` (sem browser, sem rede, sem Supabase real: o RPC
 * é injetado). Cobre o que o brief exige: busca (com e sem resultado), cada
 * filtro, abertura/fechamento de acordeão, validação, e envio honesto (sucesso,
 * erro do rpc, exceção) sem nunca afirmar "enviado" quando a gravação falhar.
 */
import assert from 'node:assert/strict'
import { FAQ_ITEMS, FAQ_CATEGORIES, CONTACT_SUBJECTS } from '../src/data/contactFaq.js'
import {
  normalizeText,
  queryFaq,
  toggleAccordion,
  validateContact,
  buildContactPayload,
  submitContact,
} from '../src/lib/contactRequest.js'

let failures = 0
const test = async (name, fn) => {
  try { await fn(); console.log('  ✓ ' + name) }
  catch (err) { failures++; console.error('  ✗ ' + name + '\n      ' + (err && err.message || err)) }
}

const validForm = () => ({
  name: 'Ana Lima',
  email: 'ana@exemplo.com.br',
  whatsapp: '(84) 99999-1234',
  subject: 'Dúvida sobre a edição',
  message: 'Quando começa a próxima edição?',
})

console.log('contato')

// ── normalização ─────────────────────────────────────────────────────────────
await test('normalizeText tira acento e caixa', () => {
  assert.equal(normalizeText('Restrições ALIMENTARES'), 'restricoes alimentares')
})

// ── busca ────────────────────────────────────────────────────────────────────
await test('busca vazia devolve todos os itens', () => {
  assert.equal(queryFaq(FAQ_ITEMS, { category: 'todas', query: '' }).length, FAQ_ITEMS.length)
})

await test('busca acha por palavra na pergunta (case-insensitive)', () => {
  const r = queryFaq(FAQ_ITEMS, { category: 'todas', query: 'EMPATE' })
  assert.ok(r.some((i) => i.id === 'empate'))
})

await test('busca é insensível a acento (restricoes → restrições)', () => {
  const r = queryFaq(FAQ_ITEMS, { category: 'todas', query: 'restricoes' })
  assert.ok(r.some((i) => i.id === 'restricoes-acessibilidade'))
})

await test('busca acha por termo/sinônimo fora do texto (gluten)', () => {
  const r = queryFaq(FAQ_ITEMS, { category: 'todas', query: 'gluten' })
  assert.ok(r.some((i) => i.id === 'restricoes-acessibilidade'))
})

await test('busca casa pelo rótulo da categoria (só via label, não pelo texto)', () => {
  // "rota" só aparece no rótulo "Sweet Awards e rota" do item empate — não na
  // sua pergunta/resposta/termos. Se vier, a busca cobre a categoria.
  const r = queryFaq(FAQ_ITEMS, { category: 'todas', query: 'rota' })
  assert.ok(r.some((i) => i.id === 'empate'), 'busca deveria cobrir o rótulo da categoria')
})

await test('busca multi-termo exige todos os tokens', () => {
  const r = queryFaq(FAQ_ITEMS, { category: 'todas', query: 'sweet awards' })
  assert.ok(r.some((i) => i.id === 'o-que-e-awards'))
})

await test('busca sem correspondência devolve lista vazia', () => {
  assert.equal(queryFaq(FAQ_ITEMS, { category: 'todas', query: 'zxqwnadaexiste' }).length, 0)
})

// ── filtros ──────────────────────────────────────────────────────────────────
await test('cada filtro (menos "todas") devolve só a sua categoria e não vem vazio', () => {
  for (const c of FAQ_CATEGORIES.filter((c) => c.id !== 'todas')) {
    const r = queryFaq(FAQ_ITEMS, { category: c.id, query: '' })
    assert.ok(r.length > 0, `filtro "${c.id}" não pode vir vazio`)
    assert.ok(r.every((i) => i.category === c.id), `filtro "${c.id}" vazou outra categoria`)
  }
})

await test('filtro + busca combinam (awards + "empate")', () => {
  const r = queryFaq(FAQ_ITEMS, { category: 'awards', query: 'empate' })
  assert.equal(r.length, 1)
  assert.equal(r[0].id, 'empate')
})

await test('filtro + busca sem interseção devolve vazio', () => {
  const r = queryFaq(FAQ_ITEMS, { category: 'awards', query: 'gluten' })
  assert.equal(r.length, 0)
})

// ── acordeão (uma resposta aberta por vez) ───────────────────────────────────
await test('abrir um item fechado o abre', () => {
  assert.equal(toggleAccordion(null, 'empate'), 'empate')
})

await test('clicar no item aberto o fecha', () => {
  assert.equal(toggleAccordion('empate', 'empate'), null)
})

await test('abrir outro troca o aberto (só um por vez)', () => {
  assert.equal(toggleAccordion('empate', 'o-que-e'), 'o-que-e')
})

// ── validação do formulário ──────────────────────────────────────────────────
await test('form completo é válido', () => {
  const { ok, errors } = validateContact(validForm())
  assert.equal(ok, true, JSON.stringify(errors))
})

await test('obrigatórios faltando geram erro por campo (nome, email, assunto, mensagem)', () => {
  const { ok, errors } = validateContact({ name: '', email: '', whatsapp: '', subject: '', message: '' })
  assert.equal(ok, false)
  for (const f of ['name', 'email', 'subject', 'message']) assert.ok(errors[f], `esperava erro em "${f}"`)
})

await test('whatsapp é opcional (ausência não invalida)', () => {
  const f = validForm(); f.whatsapp = ''
  assert.equal(validateContact(f).ok, true)
})

await test('e-mail malformado é rejeitado', () => {
  const f = validForm(); f.email = 'ana@sem-ponto'
  const { ok, errors } = validateContact(f)
  assert.equal(ok, false); assert.ok(errors.email)
})

await test('assunto fora da lista oficial é rejeitado', () => {
  const f = validForm(); f.subject = 'qualquer coisa'
  const { ok, errors } = validateContact(f)
  assert.equal(ok, false); assert.ok(errors.subject)
})

await test('todos os assuntos oficiais são aceitos', () => {
  for (const s of CONTACT_SUBJECTS) {
    const f = validForm(); f.subject = s
    assert.equal(validateContact(f).ok, true, `assunto recusado: ${s}`)
  }
})

// ── payload (só campos públicos) ─────────────────────────────────────────────
await test('buildContactPayload envia só campos públicos — nunca status/reviewed_at/internal_notes/source', () => {
  const keys = Object.keys(buildContactPayload(validForm()))
  for (const forbidden of ['status', 'source', 'reviewed_at', 'internal_notes',
    'p_status', 'p_source', 'p_reviewed_at', 'p_internal_notes']) {
    assert.ok(!keys.includes(forbidden), `payload não pode conter "${forbidden}"`)
  }
  assert.deepEqual(keys.sort(), ['p_email', 'p_message', 'p_name', 'p_subject', 'p_whatsapp'].sort())
})

await test('whatsapp vazio vira null no payload', () => {
  const f = validForm(); f.whatsapp = ''
  assert.equal(buildContactPayload(f).p_whatsapp, null)
})

await test('e-mail é normalizado (minúsculo) no payload', () => {
  const f = validForm(); f.email = 'ANA@Exemplo.com.BR'
  assert.equal(buildContactPayload(f).p_email, 'ana@exemplo.com.br')
})

// ── envio (rpc injetado) ─────────────────────────────────────────────────────
await test('submitContact bloqueia inválido e NÃO chama o rpc', async () => {
  let called = false
  const rpc = async () => { called = true; return { error: null } }
  const res = await submitContact({ name: '', email: '', whatsapp: '', subject: '', message: '' }, rpc)
  assert.equal(res.ok, false); assert.equal(res.status, 'invalid')
  assert.equal(called, false, 'não pode tentar gravar form inválido')
})

await test('submitContact chama o rpc certo com payload público', async () => {
  let seenName, seenPayload
  const rpc = async (name, payload) => { seenName = name; seenPayload = payload; return { error: null } }
  await submitContact(validForm(), rpc)
  assert.equal(seenName, 'submit_contact_request')
  assert.ok(!('status' in seenPayload))
})

await test('sucesso real quando o rpc grava (error null)', async () => {
  const res = await submitContact(validForm(), async () => ({ error: null }))
  assert.equal(res.ok, true); assert.equal(res.status, 'success')
})

await test('erro do rpc NÃO vira sucesso', async () => {
  const res = await submitContact(validForm(), async () => ({ error: { message: 'db down' } }))
  assert.equal(res.ok, false); assert.equal(res.status, 'error')
})

await test('rpc que lança exceção também é erro honesto', async () => {
  const res = await submitContact(validForm(), async () => { throw new Error('network') })
  assert.equal(res.ok, false); assert.equal(res.status, 'error')
})

if (failures > 0) {
  console.error(`\n${failures} teste(s) falharam.`)
  process.exit(1)
}
console.log('\nTudo verde.')
