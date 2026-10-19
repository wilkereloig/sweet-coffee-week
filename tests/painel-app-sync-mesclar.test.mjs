import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mesclarExterno, adotarDeles, manterMeu } from '../painel-app/src/lib/sync/mesclar.js'

const base = { nome: 'Doce Sol', descricao: 'Bolo de cenoura', instagram: '@docesol' }

test('campo que eu não toquei acompanha o servidor (sem pedir nada)', () => {
  const r = mesclarExterno({ base, local: { ...base }, servidor: { ...base, descricao: 'Bolo de cenoura com calda' } })
  assert.equal(r.local.descricao, 'Bolo de cenoura com calda')
  assert.equal(r.base.descricao, 'Bolo de cenoura com calda')
  assert.deepEqual(r.adotados, ['descricao'])
  assert.deepEqual(r.conflitos, {})
  assert.equal(r.mudouExterno, true)
})

test('o que estou digitando NUNCA é substituído quando ninguém mexeu no campo', () => {
  const local = { ...base, descricao: 'Bolo de cenoura e chocolate (digitando…' }
  const r = mesclarExterno({ base, local, servidor: { ...base, instagram: '@docesol_oficial' } })
  assert.equal(r.local.descricao, local.descricao, 'texto digitado intacto')
  assert.equal(r.local.instagram, '@docesol_oficial', 'o campo que eu não toquei foi atualizado')
  assert.deepEqual(r.adotados, ['instagram'])
  assert.deepEqual(r.conflitos, {})
})

test('mesmo campo editado por mim e por outra pessoa vira CONFLITO e mantém o meu', () => {
  const local = { ...base, descricao: 'minha versão' }
  const r = mesclarExterno({ base, local, servidor: { ...base, descricao: 'versão deles' } })
  assert.equal(r.local.descricao, 'minha versão')
  assert.deepEqual(r.conflitos, { descricao: { meu: 'minha versão', deles: 'versão deles' } })
  assert.equal(r.base.descricao, base.descricao, 'a base não anda: o salvamento ainda enxerga a diferença')
  assert.deepEqual(r.adotados, [])
})

test('servidor igual ao que eu digitei: sem conflito, a base acompanha', () => {
  const r = mesclarExterno({ base, local: { ...base, nome: 'Doce Sol Café' }, servidor: { ...base, nome: 'Doce Sol Café' } })
  assert.deepEqual(r.conflitos, {})
  assert.equal(r.base.nome, 'Doce Sol Café')
  assert.equal(r.mudouExterno, true)
})

test('nada mudou fora: mudouExterno falso e nada é tocado', () => {
  const local = { ...base, nome: 'editando' }
  const r = mesclarExterno({ base, local, servidor: { ...base } })
  assert.equal(r.mudouExterno, false)
  assert.deepEqual(r.local, local)
  assert.deepEqual(r.base, base)
})

test('null e undefined contam como vazio; objetos comparam por conteúdo', () => {
  const b = { a: null, obj: { x: 1 } }
  assert.equal(mesclarExterno({ base: b, local: { a: undefined, obj: { x: 1 } }, servidor: { a: null, obj: { x: 1 } } }).mudouExterno, false)
  const r = mesclarExterno({ base: b, local: { ...b }, servidor: { a: null, obj: { x: 2 } } })
  assert.deepEqual(r.local.obj, { x: 2 })
})

test('resolução de conflito: usar o dos outros ou manter o meu', () => {
  const local = { ...base, descricao: 'minha versão' }
  const r = mesclarExterno({ base, local, servidor: { ...base, descricao: 'versão deles' } })
  const usar = adotarDeles(r, 'descricao')
  assert.equal(usar.local.descricao, 'versão deles')
  assert.equal(usar.base.descricao, 'versão deles')
  assert.deepEqual(usar.conflitos, {})
  const manter = manterMeu(r, 'descricao')
  assert.equal(manter.local.descricao, 'minha versão')
  assert.equal(manter.base.descricao, 'versão deles', 'o próximo salvamento vai por cima, de caso pensado')
  assert.deepEqual(manter.conflitos, {})
})

test('só os campos pedidos entram na comparação', () => {
  const r = mesclarExterno({ base, local: { ...base }, servidor: { ...base, nome: 'Outro', instagram: '@novo' }, campos: ['nome'] })
  assert.deepEqual(r.adotados, ['nome'])
  assert.equal(r.local.instagram, base.instagram)
})
