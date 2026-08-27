import { test } from 'node:test'
import assert from 'node:assert/strict'
import { blocosPendentes, chaveDia, naoVazio } from '../painel-app/src/lib/hoje.js'

const PARTICIPANTE_OK = { nome_marca: 'Bocaditos', responsavel: 'Ana', telefone: '84999999999' }
const PARTICIPACAO_OK = { tema_combo: 'Natal', tema_justificativa: 'Combina com o tema', combo_preco: 29.9 }
const ITENS_OK = [
  { tipo: 'doce', nome: 'Bolo', descricao: 'Bolo de Natal', ingredientes: 'farinha' },
  { tipo: 'salgado', nome: 'Coxinha', descricao: 'Coxinha natalina', ingredientes: 'frango' },
  { tipo: 'bebida', nome: 'Suco', descricao: 'Suco especial', ingredientes: 'fruta' },
]
const UNIDADES_OK = [{ endereco: 'Rua A, 123' }]

test('cadastro completo não deixa nada pendente', () => {
  const faltam = blocosPendentes({ participante: PARTICIPANTE_OK, participacao: PARTICIPACAO_OK, itens: ITENS_OK, unidades: UNIDADES_OK })
  assert.deepEqual(faltam, [])
})

test('cada bloco incompleto aparece na lista, na ordem A marca -> O tema -> Os três itens -> Preço -> Onde encontrar', () => {
  const faltam = blocosPendentes({
    participante: { nome_marca: '', responsavel: '', telefone: '' },
    participacao: { tema_combo: '', tema_justificativa: '', combo_preco: null },
    itens: [],
    unidades: [],
  })
  assert.deepEqual(faltam, ['A marca', 'O tema', 'Os três itens', 'Preço', 'Onde encontrar'])
})

test('item com campo vazio conta como incompleto mesmo com os três tipos presentes', () => {
  const itens = ITENS_OK.map((i, idx) => (idx === 1 ? { ...i, descricao: '  ' } : i))
  const faltam = blocosPendentes({ participante: PARTICIPANTE_OK, participacao: PARTICIPACAO_OK, itens, unidades: UNIDADES_OK })
  assert.ok(faltam.includes('Os três itens'))
})

test('preço zero ou negativo continua pendente', () => {
  const faltam = blocosPendentes({ participante: PARTICIPANTE_OK, participacao: { ...PARTICIPACAO_OK, combo_preco: 0 }, itens: ITENS_OK, unidades: UNIDADES_OK })
  assert.ok(faltam.includes('Preço'))
})

test('unidade sem endereço não conta como "Onde encontrar" resolvido', () => {
  const faltam = blocosPendentes({ participante: PARTICIPANTE_OK, participacao: PARTICIPACAO_OK, itens: ITENS_OK, unidades: [{ endereco: '   ' }] })
  assert.ok(faltam.includes('Onde encontrar'))
})

test('naoVazio trata null, undefined e string só de espaço como vazios', () => {
  assert.equal(naoVazio(null), false)
  assert.equal(naoVazio(undefined), false)
  assert.equal(naoVazio('   '), false)
  assert.equal(naoVazio('x'), true)
})

test('chaveDia formata yyyy-mm-dd local, com zero à esquerda', () => {
  assert.equal(chaveDia(new Date(2026, 0, 5)), '2026-01-05')
  assert.equal(chaveDia(new Date(2026, 11, 31)), '2026-12-31')
})
