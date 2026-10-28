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
  const participantes = [{ origem_id: 1, user_id: 'u1', participacao_id: 9, nome_marca: 'Bocaditos', status_cadastro: 'em_preenchimento' }]
  const colunas = colunasMesa({ candidaturas, participantes })
  assert.equal(acha(colunas, 'aprovadas').itens.length, 0)
  assert.equal(acha(colunas, 'acesso').itens.length, 1)
})

test('participante com cadastro completo ou encerrado cai em completas, o resto em acesso', () => {
  const participantes = [
    { participacao_id: 1, nome_marca: 'A', status_cadastro: 'cadastro_completo' },
    { participacao_id: 2, nome_marca: 'B', status_cadastro: 'encerrado' },
    { participacao_id: 3, user_id: 'u3', nome_marca: 'C', status_cadastro: 'em_preenchimento' },
  ]
  const colunas = colunasMesa({ candidaturas: [], participantes })
  assert.equal(acha(colunas, 'completas').itens.length, 2)
  assert.equal(acha(colunas, 'acesso').itens.length, 1)
})

test('marca sem conta (importada) fica em aprovadas, não em "com acesso"', () => {
  const participantes = [{ participacao_id: 4, nome_marca: 'D', status_cadastro: 'em_preenchimento', edicao_codigo: '2026.2' }]
  const colunas = colunasMesa({ candidaturas: [], participantes })
  assert.equal(acha(colunas, 'acesso').itens.length, 0)
  assert.equal(acha(colunas, 'aprovadas').itens.length, 1)
  assert.match(acha(colunas, 'aprovadas').itens[0].meta, /sem acesso ainda/)
})

test('itensProntos vem como string do banco (bigint) e vira Number', () => {
  const participantes = [{ participacao_id: 1, user_id: 'u1', nome_marca: 'A', status_cadastro: 'em_preenchimento', itens_prontos: '2' }]
  const colunas = colunasMesa({ candidaturas: [], participantes })
  assert.equal(acha(colunas, 'acesso').itens[0].itensProntos, 2)
})

test('Visão geral: as encerradas da edição são contadas à parte (a lista da edição as mostra, os números não)', async () => {
  const { encerradasNaEdicao, resumoDaEdicao } = await import('../painel-app/src/lib/mesa.js')
  const marcas = [
    { id: 'a', edicao_codigo: '2026.2', status_cadastro: 'em_preenchimento' },
    { id: 'b', edicao_codigo: '2026.2', status_cadastro: 'encerrado' },
    { id: 'c', edicao_codigo: '2026.1', status_cadastro: 'encerrado' }, // outra edição
  ]
  assert.deepEqual(encerradasNaEdicao(marcas, '2026.2').map((p) => p.id), ['b'])
  // total que a lista filtrada por edição abre = os que contam + as encerradas
  assert.equal(marcas.filter((p) => p.edicao_codigo === '2026.2').length, resumoDaEdicao(marcas, '2026.2').naEdicao.length + encerradasNaEdicao(marcas, '2026.2').length)
  assert.deepEqual(encerradasNaEdicao(marcas, undefined), [], 'sem edição atual não afirma nada')
  assert.deepEqual(encerradasNaEdicao(undefined, '2026.2'), [])
})

test('Visão geral: marca encerrada não entra no total, no acesso nem nos completos', async () => {
  const { resumoDaEdicao, participaDaEdicao } = await import('../painel-app/src/lib/mesa.js')
  const marcas = [
    { edicao_codigo: '2026.2', status_cadastro: 'aguardando_cadastro', user_id: 'u1' },
    { edicao_codigo: '2026.2', status_cadastro: 'em_preenchimento', user_id: null },
    { edicao_codigo: '2026.2', status_cadastro: 'cadastro_completo', user_id: 'u2' },
    { edicao_codigo: '2026.2', status_cadastro: 'encerrado', user_id: 'u3' },     // desistiu, tem conta
    { edicao_codigo: '2026.2', status_cadastro: 'encerrado', user_id: null },     // desistiu, sem conta
    { edicao_codigo: '2026.1', status_cadastro: 'aguardando_cadastro', user_id: 'u4' }, // outra edição
  ]
  const r = resumoDaEdicao(marcas, '2026.2')
  assert.equal(r.naEdicao.length, 3)
  assert.equal(r.comAcesso, 2)
  assert.equal(r.semAcesso, 1)
  assert.equal(r.completos, 1)
  assert.equal(participaDaEdicao({ status_cadastro: 'encerrado' }), false)
  assert.equal(participaDaEdicao({ status_cadastro: 'sem_participacao' }), true)
  assert.deepEqual(resumoDaEdicao(marcas, undefined).naEdicao, [], 'sem edição atual não conta ninguém')
})
