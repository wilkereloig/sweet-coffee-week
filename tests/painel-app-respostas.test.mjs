import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ORIGENS, todos, filtrados, escapar, dataCurta } from '../painel-app/src/lib/respostas.js'

test('ORIGENS tem as três origens vivas, participar não voltou', () => {
  assert.deepEqual(Object.keys(ORIGENS).sort(), ['apoiar', 'contato', 'quero_participar'])
})

test('todos junta as origens e ordena por data, mais recente primeiro', () => {
  const dados = {
    quero_participar: [{ id: 1, created_at: '2026-01-01T00:00:00Z' }],
    apoiar: [{ id: 2, created_at: '2026-06-01T00:00:00Z' }],
    contato: [],
  }
  const r = todos(dados)
  assert.deepEqual(r.map((x) => x.reg.id), [2, 1])
  assert.equal(r[0].origem, 'apoiar')
})

test('filtrados por aba específica só devolve aquela origem', () => {
  const dados = {
    quero_participar: [{ id: 1, created_at: '2026-01-01T00:00:00Z', status: 'novo' }],
    apoiar: [{ id: 2, created_at: '2026-01-01T00:00:00Z', status: 'novo' }],
    contato: [],
  }
  const r = filtrados(dados, { aba: 'apoiar', status: '', dias: null, termo: '' })
  assert.equal(r.length, 1)
  assert.equal(r[0].origem, 'apoiar')
})

test('filtrados por termo de busca casa nome, empresa e e-mail', () => {
  const dados = {
    quero_participar: [{ id: 1, created_at: '2026-01-01T00:00:00Z', status: 'novo', empresa: 'Bolomania' }],
    apoiar: [], contato: [],
  }
  const achou = filtrados(dados, { aba: 'tudo', status: '', dias: null, termo: 'bolo' })
  const naoAchou = filtrados(dados, { aba: 'tudo', status: '', dias: null, termo: 'zzz' })
  assert.equal(achou.length, 1)
  assert.equal(naoAchou.length, 0)
})

test('escapar neutraliza os cinco caracteres perigosos de HTML', () => {
  assert.equal(escapar(`<b>"'&`), '&lt;b&gt;&quot;&#39;&amp;')
})

test('dataCurta formata no padrão dd/mm/aa', () => {
  assert.equal(dataCurta('2026-03-05T00:00:00Z'), '05/03/26')
})
