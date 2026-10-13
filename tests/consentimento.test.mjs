/*
 * Preferência de cookies, limpeza do que vai ao Analytics e rota dos
 * documentos legais sob cada gate — lógica pura, sem navegador.
 * O comportamento de rede (nada ao Google antes do aceite) está em
 * tests/privacidade-navegador.mjs.
 *
 *   node --test tests/consentimento.test.mjs
 */
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

/* Janela mínima: EventTarget + localStorage trocável. */
class Armazem {
  constructor () { this.m = new Map(); this.quebrado = false }
  getItem (k) { if (this.quebrado) throw new Error('bloqueado'); return this.m.has(k) ? this.m.get(k) : null }
  setItem (k, v) { if (this.quebrado) throw new Error('bloqueado'); this.m.set(k, String(v)) }
  removeItem (k) { if (this.quebrado) throw new Error('bloqueado'); this.m.delete(k) }
}
globalThis.window = new EventTarget()
window.localStorage = new Armazem()

const C = await import('../src/lib/consentimento.js')
const A = await import('../src/lib/analytics.js')
const R = await import('../src/lib/rotas.js')

const DIA = 864e5
beforeEach(() => {
  window.localStorage = new Armazem()
  C._zerarMemoria()
})

test('1 · primeira visita: sem escolha, análise bloqueada', () => {
  assert.equal(C.lerPreferencia(), null)
  assert.equal(C.analisePermitida(), false)
})

test('2 · recusa grava versão, escolha, momento e validade', () => {
  const agora = 1_800_000_000_000
  C.salvarPreferencia(false, agora)
  const r = JSON.parse(window.localStorage.getItem(C.CHAVE))
  assert.deepEqual(r, { v: C.VERSAO_AVISO, analise: false, em: agora, ate: agora + C.VALIDADE_DIAS * DIA })
  assert.equal(C.analisePermitida(agora + 1), false)
  assert.notEqual(C.lerPreferencia(agora + 1), null, 'recusa é escolha válida: o aviso não volta')
})

test('3 · aceite libera a análise', () => {
  C.salvarPreferencia(true)
  assert.equal(C.analisePermitida(), true)
})

test('4 · alteração posterior vale na hora', () => {
  C.salvarPreferencia(true)
  C.salvarPreferencia(false)
  assert.equal(C.analisePermitida(), false)
})

test('5 · revogação avisa quem escuta (o Analytics desliga sem recarregar)', () => {
  const vistos = []
  const sair = C.aoMudar((p) => vistos.push(p && p.analise))
  C.salvarPreferencia(true)
  C.salvarPreferencia(false)
  sair()
  assert.deepEqual(vistos, [true, false])
})

test('6 · retorno com preferência salva (memória zerada = nova visita)', () => {
  C.salvarPreferencia(true)
  C._zerarMemoria()
  assert.equal(C.analisePermitida(), true)
})

test('7 · registro inválido, versão antiga, vencido ou chave antiga não autorizam', () => {
  const agora = Date.now()
  for (const bruto of [
    'lixo', '{}', 'null', '"granted"',
    JSON.stringify({ v: 0, analise: true, em: agora, ate: agora + DIA }),
    JSON.stringify({ v: C.VERSAO_AVISO, analise: 'sim', em: agora, ate: agora + DIA }),
    JSON.stringify({ v: C.VERSAO_AVISO, analise: true, em: agora - 2 * DIA, ate: agora - DIA }),
    JSON.stringify({ v: C.VERSAO_AVISO, analise: true, em: agora + 10 * DIA, ate: agora + 20 * DIA }),
  ]) {
    window.localStorage.setItem(C.CHAVE, bruto)
    assert.equal(C.lerPreferencia(agora), null, bruto)
    assert.equal(C.analisePermitida(agora), false, bruto)
  }
  window.localStorage = new Armazem()
  window.localStorage.setItem(C.CHAVE_ANTIGA, 'granted')
  assert.equal(C.analisePermitida(), false, '"granted" sem versão não autoriza nada')
  assert.equal(window.localStorage.getItem(C.CHAVE_ANTIGA), null, 'a chave antiga é apagada')
})

test('8 · armazenamento indisponível: vale só nesta sessão, depois volta bloqueado', () => {
  window.localStorage.quebrado = true
  assert.equal(C.lerPreferencia(), null)
  C.salvarPreferencia(true)
  assert.equal(C.analisePermitida(), true, 'a escolha vale enquanto a aba estiver aberta')
  C._zerarMemoria()
  assert.equal(C.analisePermitida(), false, 'nova visita sem storage: bloqueado')
})

test('9 · outra aba mudou a escolha: o evento storage chega aos ouvintes', () => {
  const vistos = []
  const sair = C.aoMudar((p) => vistos.push(p ? p.analise : null))
  const agora = Date.now()
  window.localStorage.setItem(C.CHAVE, JSON.stringify({ v: C.VERSAO_AVISO, analise: true, em: agora, ate: agora + DIA }))
  const e = new Event('storage'); Object.defineProperty(e, 'key', { value: C.CHAVE })
  window.dispatchEvent(e)
  window.localStorage.m.clear()
  const limpo = new Event('storage'); Object.defineProperty(limpo, 'key', { value: null })
  window.dispatchEvent(limpo)
  sair()
  assert.deepEqual(vistos, [true, null])
})

test('11 · o que vai ao Analytics: só rota conhecida e utm_* limpos', () => {
  assert.equal(A.rotaLimpa('#/contato?email=ana@x.com&tel=84999990000'), '/contato')
  assert.equal(A.rotaLimpa('#/ana@x.com'), '/')
  assert.equal(A.rotaLimpa('', '/privacidade'), '/privacidade')
  assert.equal(A.rotaLimpa('#/edicoes/2019'), '/edicoes')
  assert.equal(A.rotaLimpa('#/participar#token=abc'), '/participar')
  const url = A.enderecoLimpo('https://x.br', '/apoiar', '?utm_source=instagram&utm_medium=story&email=a@b.com&nome=Ana&token=abc&utm_term=ana@b.com')
  assert.equal(url, 'https://x.br/apoiar?utm_source=instagram&utm_medium=story')
  assert.doesNotMatch(url, /@|nome|token|email/)
})

test('12 · documentos legais abrem sob qualquer gate; o resto continua protegido', () => {
  const gates = [
    { soParticipar: true },
    { awardsOnly: true },
    { comingSoon: true },
    { aguarde: true },
    {},
  ]
  for (const f of gates) {
    for (const doc of ['privacidade', 'cookies', 'termos']) {
      assert.equal(R.resolverRota(`/${doc}`, f), 'legal', `${doc} com ${JSON.stringify(f)}`)
      assert.equal(R.documentoLegal(`/${doc}`), doc)
    }
  }
  // Nada além dos três escapa do gate.
  assert.equal(R.resolverRota('/apoiar', { soParticipar: true }), 'participar')
  assert.equal(R.resolverRota('/', { soParticipar: true }), 'participar')
  assert.equal(R.resolverRota('/privacidade-falsa', { soParticipar: true }), 'participar')
  assert.equal(R.resolverRota('/termos/../apoiar', { soParticipar: true }), 'participar')
  assert.equal(R.resolverRota('/edicoes', { awardsOnly: true }), 'historico-awards')
  assert.equal(R.resolverRota('/contato', { comingSoon: true }), 'em-breve')
  assert.equal(R.resolverRota('/edicoes', { aguarde: true }), 'aguarde')
  // Sem gate, a tabela de sempre.
  assert.equal(R.resolverRota('/apoiar', {}), 'apoiar')
  assert.equal(R.resolverRota('/', {}), 'home')
})
