import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resumoPorMarca, resumoPorContato, vouchersPorEdicao, normalizarCodigo } from '../painel-app/src/lib/vouchers.js'
import { STATUS } from '../painel-app/src/lib/status.js'

const V = [
  { id: 1, participacao_id: 'A', status: 'disponivel' },
  { id: 2, participacao_id: 'A', status: 'destinado', contato_id: 'k1', contato: 'Bia', marca: 'Alfa' },
  { id: 3, participacao_id: 'A', status: 'utilizado', contato_id: 'k1', contato: 'Bia', marca: 'Alfa' },
  { id: 4, participacao_id: 'A', status: 'cancelado', contato_id: 'k2', contato: 'Caio', marca: 'Alfa' },
  { id: 5, participacao_id: 'B', status: 'enviado', contato_id: 'k2', contato: 'Caio', marca: 'Beta' },
]

test('resumo por marca: restantes, distribuídos e o que falta gerar até a cota', () => {
  const [a, b, c] = resumoPorMarca(V, [{ participacao_id: 'A', marca: 'Alfa' }, { participacao_id: 'B', marca: 'Beta' }, { participacao_id: 'C', marca: 'Gama' }], 7)
  assert.deepEqual([a.gerados, a.disponiveis, a.destinados, a.utilizados, a.distribuidos, a.faltaGerar], [3, 1, 1, 1, 2, 4])
  assert.deepEqual([b.enviados, b.distribuidos, b.faltaGerar], [1, 1, 6])
  assert.deepEqual([c.gerados, c.faltaGerar], [0, 7], 'marca sem voucher ainda aparece')
})

test('resumo por pessoa ignora cancelado e junta as marcas', () => {
  const r = resumoPorContato(V)
  assert.deepEqual(r.map((x) => [x.contato, x.total, x.enviados, x.utilizados, x.marcas.join(',')]), [['Bia', 2, 1, 1, 'Alfa'], ['Caio', 1, 1, 0, 'Beta']])
})

test('histórico por edição', () => {
  const g = vouchersPorEdicao([{ edicao_codigo: '2026.2', status: 'utilizado' }, { edicao_codigo: '2026.2', status: 'enviado' }, { edicao_codigo: '2025', status: 'utilizado' }])
  assert.deepEqual(g.map((x) => [x.edicao, x.itens.length, x.utilizados]), [['2026.2', 2, 1], ['2025', 1, 1]])
})

test('código digitado de qualquer jeito vira o formato do banco', () => {
  assert.equal(normalizarCodigo(' scw-7k3pq '), 'SCW-7K3PQ')
  assert.equal(normalizarCodigo('scw 7k3pq'), 'SCW-7K3PQ')
  assert.equal(normalizarCodigo('7k3pq'), 'SCW-7K3PQ')
  assert.equal(normalizarCodigo(''), '')
})

test('os status de voucher do banco têm rótulo', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20260930_etapa5e6_contatos_presskit_vouchers.sql', import.meta.url), 'utf8')
  const m = sql.match(/check \(status in \(([^)]*)\)\)/)
  for (const s of m[1].split(',').map((x) => x.trim().replace(/'/g, ''))) assert.ok(STATUS.voucher[s], 'sem rótulo: ' + s)
})
