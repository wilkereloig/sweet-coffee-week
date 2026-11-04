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

// ---- Voucher virtual (04/11/2026, docs/cartoon-2026-2/15-voucher-virtual.md) ----------------------------------------
import { canalDe, linkDoVoucherVirtual, mensagemVoucherVirtual, codigoDaUrl, codigoDoQr } from '../painel-app/src/lib/vouchers.js'
import { capturarVoucherDaUrl, voucherPendente, limparVoucherPendente } from '../painel-app/src/lib/voucherPendente.js'
import { linkDoVoucher } from '../src/edicao/rota/voucherVirtual.js'

const MISTOS = [
  { id: 1, participacao_id: 'A', status: 'disponivel', canal: 'fisico' },
  { id: 2, participacao_id: 'A', status: 'destinado', canal: 'fisico' },
  { id: 3, participacao_id: 'A', status: 'disponivel', canal: 'virtual', link_token: 'abcdefgh2345' },
  { id: 4, participacao_id: 'A', status: 'enviado', canal: 'virtual', link_token: 'abcdefgh2346' },
  { id: 5, participacao_id: 'A', status: 'cancelado', canal: 'virtual', link_token: 'abcdefgh2347' },
  { id: 6, participacao_id: 'B', status: 'disponivel' }, // banco antigo, sem a coluna: é impresso
]
const MARCAS = [{ participacao_id: 'A', marca: 'Alfa' }, { participacao_id: 'B', marca: 'Beta' }]

test('virtual: o resumo por marca separa os canais e a cota de cada um', () => {
  const [af, bf] = resumoPorMarca(MISTOS, MARCAS, 7)
  assert.deepEqual([af.gerados, af.disponiveis, af.faltaGerar], [2, 1, 5], 'impressos não contam os virtuais')
  assert.deepEqual([bf.gerados, bf.faltaGerar], [1, 6], 'linha sem canal é impresso')
  const [av, bv] = resumoPorMarca(MISTOS, MARCAS, 2, 'virtual')
  assert.deepEqual([av.gerados, av.disponiveis, av.enviados, av.faltaGerar], [2, 1, 1, 0], 'cancelado não conta')
  assert.deepEqual([bv.gerados, bv.faltaGerar], [0, 2])
  assert.equal(canalDe({ canal: 'virtual' }), 'virtual')
  assert.equal(canalDe({}), 'fisico')
  assert.equal(canalDe(null), 'fisico')
})

test('virtual: o link e a mensagem saem do mesmo endereço que a página do site abre', () => {
  const o = 'https://www.sweetcoffeeweek.com.br'
  assert.equal(linkDoVoucherVirtual(o, 'abcdefgh2345'), linkDoVoucher(o, 'abcdefgh2345'), 'painel e site não podem divergir')
  const m = mensagemVoucherVirtual({ marca: 'Adocee Doceria', link: o + '/x', nome: 'Bia Souza' })
  assert.match(m, /^Oi, Bia! /)
  assert.match(m, /Adocee Doceria/)
  assert.ok(m.endsWith(o + '/x'), 'o link fecha a mensagem')
  assert.doesNotMatch(m, /\bSweet\b(?! (Lovers?|Awards|&))/, 'sem "Sweet" sozinho')
  assert.match(mensagemVoucherVirtual({ link: 'l' }), /^Oi! .*a casa participante/)
})

test('virtual: o código do QR vem do endereço ou do texto puro, e lixo não vira código', () => {
  assert.equal(codigoDaUrl('?voucher=scw-7k3pq'), 'SCW-7K3PQ')
  assert.equal(codigoDaUrl('?a=1&voucher=SCW%207K3PQ&b=2'), 'SCW-7K3PQ')
  assert.equal(codigoDaUrl('?voucher=SCW-7K3P'), '', 'curto')
  assert.equal(codigoDaUrl('?voucher=SCW-7K3P0'), '', 'sem 0 e 1')
  assert.equal(codigoDaUrl('?voucher=%E0%A4%A'), '', 'escape quebrado não derruba')
  assert.equal(codigoDaUrl(''), '')
  assert.equal(codigoDoQr('https://www.sweetcoffeeweek.com.br/painel/?voucher=SCW-7K3PQ'), 'SCW-7K3PQ')
  assert.equal(codigoDoQr('SCW-7K3PQ'), 'SCW-7K3PQ')
  assert.equal(codigoDoQr('https://exemplo.com/qualquer'), '')
  assert.equal(codigoDoQr(null), '')
})

test('virtual: o código do QR fica guardado até a marca registrar, e sem armazenamento não quebra', () => {
  const mem = new Map()
  const arm = { setItem: (k, v) => mem.set(k, v), getItem: (k) => (mem.has(k) ? mem.get(k) : null), removeItem: (k) => mem.delete(k) }
  assert.equal(capturarVoucherDaUrl('?voucher=scw-7k3pq', arm), 'SCW-7K3PQ')
  assert.equal(voucherPendente(arm), 'SCW-7K3PQ')
  assert.equal(capturarVoucherDaUrl('?outra=coisa', arm), '', 'sem o parâmetro não apaga nem troca')
  assert.equal(voucherPendente(arm), 'SCW-7K3PQ')
  limparVoucherPendente(arm)
  assert.equal(voucherPendente(arm), '')
  const quebrado = { setItem() { throw new Error('cheio') }, getItem() { throw new Error('x') }, removeItem() { throw new Error('x') } }
  assert.equal(capturarVoucherDaUrl('?voucher=SCW-7K3PQ', quebrado), 'SCW-7K3PQ')
  assert.equal(voucherPendente(quebrado), '')
  limparVoucherPendente(quebrado)
})

test('virtual: as escritas novas avisam a tela (sincronização) e o painel não monta endereço pela barra', () => {
  const dom = readFileSync(new URL('../painel-app/src/lib/sync/dominios.js', import.meta.url), 'utf8')
  for (const f of ['gerar_vouchers_virtuais', 'destinar_vouchers_virtuais']) assert.ok(dom.includes(f + ": ['vouchers']"), f)
  const tela = readFileSync(new URL('../painel-app/src/components/vistas/Vouchers.jsx', import.meta.url), 'utf8')
  assert.match(tela, /ORIGEM_PUBLICA/)
  assert.doesNotMatch(tela, /location\.origin/, 'o link vai para o cliente: sempre o domínio oficial')
  const sql = readFileSync(new URL('../supabase/migrations/20261201_voucher_virtual.sql', import.meta.url), 'utf8')
  for (const f of ['gerar_vouchers_virtuais', 'destinar_vouchers_virtuais']) assert.ok(sql.includes('function public.' + f), f)
})
