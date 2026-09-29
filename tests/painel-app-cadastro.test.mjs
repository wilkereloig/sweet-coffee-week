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
  // Ponto como decimal (teclado do celular): não pode virar 2990.
  assert.equal(precoNumero('29.90'), 29.9)
  assert.equal(precoNumero('29.9'), 29.9)
  assert.equal(precoNumero('R$ 32,50'), 32.5)
  assert.equal(precoNumero('1.234'), 1234)
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

test('pendências campo a campo: cada uma diz o que falta e onde (etapa 7)', async () => {
  const { pendenciasCadastro, linkDaPendencia, blocosPendentes } = await import('../painel-app/src/lib/cadastro.js')
  const dados = {
    marca: { nome_marca: 'Casa', responsavel: '', telefone: '84 9' },
    tema: { tema_combo: 'Moana', tema_justificativa: '' },
    itens: [
      { tipo: 'doce', posicao: 1, nome: 'Bolo', descricao: 'x', ingredientes: 'y' },
      { tipo: 'salgado', posicao: 2, nome: 'Coxinha', descricao: '', ingredientes: '' },
      { tipo: 'bebida', posicao: 3, nome: 'Café', descricao: 'x', ingredientes: 'y' },
    ],
    unidades: [{ endereco: '' }],
    precoStr: '',
  }
  const p = pendenciasCadastro(dados)
  assert.deepEqual(p.map((x) => [x.bloco, x.campo]), [[0, 'responsavel'], [1, 'tema_justificativa'], [2, 'item-2-descricao'], [3, 'combo_preco'], [4, 'unidade-endereco']])
  assert.equal(p[2].texto, 'Completar o salgado: descrição, ingredientes')
  assert.equal(linkDaPendencia(p[2]), 'cadastro/2/item-2-descricao')
  // A regra é a mesma dos blocos: bloco com pendência = bloco pendente.
  assert.equal(new Set(p.map((x) => x.bloco)).size, blocosPendentes(dados).length)
  const completo = { ...dados, marca: { ...dados.marca, responsavel: 'Ana' }, tema: { ...dados.tema, tema_justificativa: 'j' }, itens: dados.itens.map((i) => ({ ...i, descricao: 'd', ingredientes: 'i' })), unidades: [{ endereco: 'Rua 1' }], precoStr: '29,90' }
  assert.deepEqual(pendenciasCadastro(completo), [])
})
