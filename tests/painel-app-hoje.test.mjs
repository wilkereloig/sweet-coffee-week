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

test('cada bloco incompleto aparece na lista, na ordem A marca -> O tema -> Os três itens -> Custos -> Onde encontrar', () => {
  const faltam = blocosPendentes({
    participante: { nome_marca: '', responsavel: '', telefone: '' },
    participacao: { tema_combo: '', tema_justificativa: '', combo_para_viagem: true, custo_embalagem: null },
    itens: [],
    unidades: [],
  })
  assert.deepEqual(faltam, ['A marca', 'O tema', 'Os três itens', 'Custos e detalhes', 'Onde encontrar'])
})

test('item com campo vazio conta como incompleto mesmo com os três tipos presentes', () => {
  const itens = ITENS_OK.map((i, idx) => (idx === 1 ? { ...i, descricao: '  ' } : i))
  const faltam = blocosPendentes({ participante: PARTICIPANTE_OK, participacao: PARTICIPACAO_OK, itens, unidades: UNIDADES_OK })
  assert.ok(faltam.includes('Os três itens'))
})

// Valor do combo é da organização (02/10/2026): a marca responde só os custos
// que se aplicam. Delivery vem das unidades; zero vale.
test('custo de delivery só é pedido quando alguma unidade entrega', () => {
  const comDelivery = [{ endereco: 'Rua A', faz_delivery: true }]
  assert.ok(blocosPendentes({ participante: PARTICIPANTE_OK, participacao: PARTICIPACAO_OK, itens: ITENS_OK, unidades: comDelivery }).includes('Custos e detalhes'))
  assert.deepEqual(blocosPendentes({ participante: PARTICIPANTE_OK, participacao: { ...PARTICIPACAO_OK, custo_delivery: 0 }, itens: ITENS_OK, unidades: comDelivery }), [])
  assert.deepEqual(blocosPendentes({ participante: PARTICIPANTE_OK, participacao: PARTICIPACAO_OK, itens: ITENS_OK, unidades: UNIDADES_OK }), [])
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

import { proximosPassos } from '../painel-app/src/lib/hoje.js'

test('proximosPassos: sem participação, só espera (e mensagem, se houver)', () => {
  const r = proximosPassos({ semParticipacao: true, msgsNaoLidas: 1 })
  assert.deepEqual(r.passos.map((p) => p.chave), ['msg', 'espera'])
})

test('proximosPassos: urgente primeiro, e cadastro concluído vira feito', () => {
  const agora = new Date('2026-10-01T12:00:00').getTime()
  const r = proximosPassos({
    faltam: [], statusCadastro: 'cadastro_completo', pedidosPendentes: 2,
    prazoMaisProximo: '2026-10-02T23:59:00', vagasAbertas: 3, agora,
  })
  assert.equal(r.passos[0].tom, 'urgente')
  assert.ok(r.passos.some((p) => p.chave === 'vaga' && p.destino === 'cadastro/fotos'))
  assert.ok(r.feitos.some((f) => f.chave === 'cadastro'))
})

test('proximosPassos: tudo preenchido e não concluído pede para concluir', () => {
  const r = proximosPassos({ faltam: [], statusCadastro: 'em_preenchimento' })
  assert.equal(r.passos[0].chave, 'concluir')
})
