import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  precoNumero, itemCompleto, unidadeTemEndereco, blocoCompleto,
  blocosPendentes, progresso, canaisParaObjeto, canaisParaArray,
} from '../painel-app/src/lib/cadastro.js'

test('precoNumero lê formato brasileiro (milhar por ponto, decimal por vírgula)', () => {
  assert.equal(precoNumero('1.234,56'), 1234.56)
  assert.equal(precoNumero('35,00'), 35)
  assert.equal(precoNumero(''), 0)
  assert.equal(precoNumero('abc'), 0)
})

test('itemCompleto exige nome, descrição e ingredientes preenchidos', () => {
  assert.equal(itemCompleto({ nome: 'Bolo', descricao: 'x', ingredientes: 'y' }), true)
  assert.equal(itemCompleto({ nome: '  ', descricao: 'x', ingredientes: 'y' }), false)
  assert.equal(itemCompleto(null), false)
})

test('unidadeTemEndereco ignora espaço em branco', () => {
  assert.equal(unidadeTemEndereco({ endereco: '  ' }), false)
  assert.equal(unidadeTemEndereco({ endereco: 'Rua X, 1' }), true)
})

const dadosCompletos = {
  marca: { nome_marca: 'Bolomania', responsavel: 'Ana', telefone: '84999999999' },
  tema: { tema_combo: 'Natal', tema_justificativa: 'porque sim' },
  itens: [
    { tipo: 'doce', nome: 'a', descricao: 'b', ingredientes: 'c' },
    { tipo: 'salgado', nome: 'a', descricao: 'b', ingredientes: 'c' },
    { tipo: 'bebida', nome: 'a', descricao: 'b', ingredientes: 'c' },
  ],
  unidades: [{ endereco: 'Rua X' }],
  precoStr: '35,00',
}

test('blocoCompleto cobre os 5 blocos e falha um por vez', () => {
  for (let n = 0; n < 5; n++) assert.equal(blocoCompleto(n, dadosCompletos), true, 'bloco ' + n)
  assert.equal(blocoCompleto(2, { ...dadosCompletos, itens: dadosCompletos.itens.slice(0, 2) }), false)
  assert.equal(blocoCompleto(3, { ...dadosCompletos, precoStr: '0,00' }), false)
  assert.equal(blocoCompleto(4, { ...dadosCompletos, unidades: [{ endereco: '' }] }), false)
})

test('blocosPendentes e progresso concordam sobre o que falta', () => {
  const parcial = { ...dadosCompletos, precoStr: '' }
  assert.deepEqual(blocosPendentes(parcial), ['Preço'])
  assert.equal(progresso(parcial), 4)
  assert.equal(progresso(dadosCompletos), 5)
  assert.deepEqual(blocosPendentes(dadosCompletos), [])
})

test('canaisParaObjeto/canaisParaArray fazem a volta sem perder nem inventar canal', () => {
  const obj = canaisParaObjeto([{ tipo: 'whatsapp', link: 'https://wa.me/55' }, { tipo: 'inexistente', link: 'x' }])
  assert.deepEqual(obj, { aplicativo: '', whatsapp: 'https://wa.me/55', site: '' })
  assert.deepEqual(canaisParaArray(obj), [{ tipo: 'whatsapp', link: 'https://wa.me/55' }])
  assert.deepEqual(canaisParaArray({}), [])
})
