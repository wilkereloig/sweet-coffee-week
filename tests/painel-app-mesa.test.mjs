import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ETAPAS, colunasMesa } from '../painel-app/src/lib/mesa.js'

function acha(colunas, chave) {
  return colunas.find((c) => c.chave === chave)
}

test('ETAPAS tem as seis colunas, na ordem', () => {
  assert.deepEqual(ETAPAS.map((e) => e.chave), ['novas', 'analise', 'contatadas', 'aprovadas', 'acesso', 'completas'])
})

test('candidatura sem conta cai na etapa pelo status', () => {
  const candidaturas = [{ id: 1, status: 'em_analise', empresa: 'Bolomania', created_at: '2020-01-01T00:00:00Z' }]
  const colunas = colunasMesa({ candidaturas, participantes: [] })
  assert.equal(acha(colunas, 'analise').itens.length, 1)
  assert.equal(acha(colunas, 'analise').itens[0].nome, 'Bolomania')
  assert.equal(acha(colunas, 'novas').itens.length, 0)
})

test('nao_selecionado fica fora de todas as colunas', () => {
  const candidaturas = [{ id: 1, status: 'nao_selecionado', empresa: 'X', created_at: '2020-01-01T00:00:00Z' }]
  const colunas = colunasMesa({ candidaturas, participantes: [] })
  const total = colunas.reduce((n, c) => n + c.itens.length, 0)
  assert.equal(total, 0)
})

test('candidatura já vinculada a uma conta sai das quatro primeiras colunas', () => {
  const candidaturas = [{ id: 1, status: 'aprovado', empresa: 'Bocaditos', created_at: '2020-01-01T00:00:00Z' }]
  const participantes = [{ origem_id: 1, participacao_id: 9, nome_marca: 'Bocaditos', status_cadastro: 'em_preenchimento' }]
  const colunas = colunasMesa({ candidaturas, participantes })
  assert.equal(acha(colunas, 'aprovadas').itens.length, 0)
  assert.equal(acha(colunas, 'acesso').itens.length, 1)
})

test('participante com cadastro completo ou encerrado cai em completas, o resto em acesso', () => {
  const participantes = [
    { participacao_id: 1, nome_marca: 'A', status_cadastro: 'cadastro_completo' },
    { participacao_id: 2, nome_marca: 'B', status_cadastro: 'encerrado' },
    { participacao_id: 3, nome_marca: 'C', status_cadastro: 'em_preenchimento' },
  ]
  const colunas = colunasMesa({ candidaturas: [], participantes })
  assert.equal(acha(colunas, 'completas').itens.length, 2)
  assert.equal(acha(colunas, 'acesso').itens.length, 1)
})

test('itensProntos vem como string do banco (bigint) e vira Number', () => {
  const participantes = [{ participacao_id: 1, nome_marca: 'A', status_cadastro: 'em_preenchimento', itens_prontos: '2' }]
  const colunas = colunasMesa({ candidaturas: [], participantes })
  assert.equal(acha(colunas, 'acesso').itens[0].itensProntos, 2)
})
