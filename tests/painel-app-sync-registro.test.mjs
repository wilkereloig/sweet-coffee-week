import { test } from 'node:test'
import assert from 'node:assert/strict'
import { iniciarRegistro, reduzirRegistro, registroSujo } from '../painel-app/src/lib/sync/mesclar.js'

const servidor0 = { nome: 'Doce Sol', descricao: 'Bolo de cenoura', instagram: '@docesol' }
const CAMPOS = ['nome', 'descricao', 'instagram']
const aplicar = (e, ...acoes) => acoes.reduce(reduzirRegistro, e)

test('registro novo: local = base = servidor, nada sujo', () => {
  const e = iniciarRegistro(servidor0, CAMPOS)
  assert.deepEqual(e.local, servidor0)
  assert.equal(registroSujo(e), false)
})

test('digitar deixa sujo; salvar (servidor confirma) limpa e a base acompanha', () => {
  let e = aplicar(iniciarRegistro(servidor0, CAMPOS), { tipo: 'editar', campo: 'nome', valor: 'Doce Sol Café' })
  assert.equal(registroSujo(e), true)
  e = aplicar(e, { tipo: 'salvou', servidor: { ...servidor0, nome: 'Doce Sol Café' } })
  assert.equal(registroSujo(e), false)
  assert.equal(e.base.nome, 'Doce Sol Café')
})

test('alteração externa num campo que NÃO editei: acompanha e avisa quais campos mudaram', () => {
  const e = aplicar(iniciarRegistro(servidor0, CAMPOS), { tipo: 'servidor', servidor: { ...servidor0, instagram: '@docesol_oficial' } })
  assert.equal(e.local.instagram, '@docesol_oficial')
  assert.deepEqual(e.adotados, ['instagram'])
  assert.equal(e.mudouExterno, true)
  assert.equal(registroSujo(e), false, 'adotar o dos outros não deixa o registro "sujo"')
})

test('o texto que estou digitando sobrevive a QUALQUER releitura sem conflito', () => {
  let e = aplicar(iniciarRegistro(servidor0, CAMPOS), { tipo: 'editar', campo: 'descricao', valor: 'Bolo de cenoura com calda de choc' })
  e = aplicar(e, { tipo: 'servidor', servidor: { ...servidor0, nome: 'Doce Sol 2' } })
  e = aplicar(e, { tipo: 'servidor', servidor: { ...servidor0, nome: 'Doce Sol 2' } })   // evento repetido
  assert.equal(e.local.descricao, 'Bolo de cenoura com calda de choc')
  assert.equal(e.local.nome, 'Doce Sol 2')
  assert.deepEqual(e.adotados, ['nome'], 'repetição não duplica o aviso')
})

test('mesmo campo dos dois lados: conflito; a escolha da pessoa resolve', () => {
  let e = aplicar(iniciarRegistro(servidor0, CAMPOS), { tipo: 'editar', campo: 'descricao', valor: 'minha' })
  e = aplicar(e, { tipo: 'servidor', servidor: { ...servidor0, descricao: 'deles' } })
  assert.deepEqual(e.conflitos, { descricao: { meu: 'minha', deles: 'deles' } })
  assert.equal(e.local.descricao, 'minha')
  const usar = aplicar(e, { tipo: 'adotar', campo: 'descricao' })
  assert.equal(usar.local.descricao, 'deles')
  assert.equal(registroSujo(usar), false)
  const manter = aplicar(e, { tipo: 'manter', campo: 'descricao' })
  assert.equal(manter.local.descricao, 'minha')
  assert.equal(registroSujo(manter), true, 'o salvamento seguinte vai por cima, de caso pensado')
  const todos = aplicar(e, { tipo: 'adotarTodos' })
  assert.deepEqual(todos.conflitos, {})
})

test('o servidor volta ao valor da base: o conflito some sozinho', () => {
  let e = aplicar(iniciarRegistro(servidor0, CAMPOS), { tipo: 'editar', campo: 'descricao', valor: 'minha' })
  e = aplicar(e, { tipo: 'servidor', servidor: { ...servidor0, descricao: 'deles' } })
  assert.ok(e.conflitos.descricao)
  e = aplicar(e, { tipo: 'servidor', servidor: { ...servidor0 } })
  assert.deepEqual(e.conflitos, {})
})

test('digitar durante o salvamento não se perde e não vira conflito falso', () => {
  let e = aplicar(iniciarRegistro(servidor0, CAMPOS), { tipo: 'editar', campo: 'nome', valor: 'A' })
  e = aplicar(e, { tipo: 'editar', campo: 'nome', valor: 'AB' })                         // continuou digitando
  e = aplicar(e, { tipo: 'salvou', servidor: { ...servidor0, nome: 'A' } })               // o servidor confirmou só o "A"
  assert.equal(e.local.nome, 'AB')
  assert.equal(e.base.nome, 'A')
  assert.equal(registroSujo(e), true)
  assert.deepEqual(e.conflitos, {})
})

test('dispensar fecha o aviso de campos atualizados; reiniciar não herda rascunho de outro registro', () => {
  let e = aplicar(iniciarRegistro(servidor0, CAMPOS), { tipo: 'servidor', servidor: { ...servidor0, nome: 'Novo' } })
  assert.deepEqual(e.adotados, ['nome'])
  e = aplicar(e, { tipo: 'dispensar' })
  assert.deepEqual(e.adotados, [])
  assert.equal(e.mudouExterno, false)
  e = aplicar(e, { tipo: 'editar', campo: 'nome', valor: 'rascunho do registro A' })
  const outro = aplicar(e, { tipo: 'reiniciar', servidor: { nome: 'Outra Marca', descricao: 'x', instagram: '@y' } })
  assert.equal(outro.local.nome, 'Outra Marca')
  assert.equal(registroSujo(outro), false)
})
