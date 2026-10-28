import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ORDEM, PROXIMO, ANTERIOR, RETIRADO, jaSaiu, estaNaLista, sugestoesDaLista, filtrarLista, contarSituacao } from '../painel-app/src/lib/presskit.js'
import { STATUS } from '../painel-app/src/lib/status.js'

const L = [
  { id: 'a', nome: 'Zeca', atual: { status: 'selecionado' } },
  { id: 'b', nome: 'Ana', atual: { status: 'confirmado' } },
  { id: 'c', nome: 'Bia', atual: { status: 'confirmado' } },
  { id: 'd', nome: 'Caio', atual: { status: 'cancelado' } },
  { id: 'e', nome: 'Edu', atual: null, recebimentos: 2 },
  { id: 'f', nome: 'Fabi', atual: null, recebimentos: 0 },
  { id: 'g', nome: 'Gui', atual: null, recebimentos: 1, ativo: false },
]

test('a ordem e os rótulos cobrem exatamente os status do banco', () => {
  assert.deepEqual([...ORDEM].sort(), Object.keys(STATUS.presskit).sort())
})

test('retirar é o status cancelado e tira a pessoa da lista, não do registro', () => {
  assert.equal(RETIRADO, 'cancelado')
  assert.equal(estaNaLista(L[0]), true)
  assert.equal(estaNaLista(L[3]), false)
  assert.equal(estaNaLista(L[4]), false, 'sem registro nesta edição não está na lista')
})

test('"Na lista" esconde os retirados; "Retirado da lista" e "Todos" mostram', () => {
  assert.deepEqual(filtrarLista(L, 'ativos').map((c) => c.nome), ['Zeca', 'Ana', 'Bia'], 'selecionado vem antes de preparando; mesmo status, por nome')
  assert.deepEqual(filtrarLista(L, RETIRADO).map((c) => c.nome), ['Caio'])
  assert.deepEqual(filtrarLista(L, 'todos').map((c) => c.nome), ['Zeca', 'Ana', 'Bia', 'Caio'])
  assert.equal(contarSituacao(L, 'confirmado'), 2)
})

test('sugestão: recebeu antes, sem registro nesta edição, não arquivado; retirar a tira de lá', () => {
  assert.deepEqual(sugestoesDaLista(L).map((c) => c.nome), ['Edu'])
  const depois = L.map((c) => (c.id === 'e' ? { ...c, atual: { status: RETIRADO } } : c))
  assert.deepEqual(sugestoesDaLista(depois), [])
  assert.deepEqual(filtrarLista(depois, RETIRADO).map((c) => c.nome), ['Caio', 'Edu'])
})

test('voltar um passo só existe onde há o que corrigir, e nunca sai da cadeia', () => {
  for (const [de, para] of Object.entries(ANTERIOR)) {
    assert.ok(ORDEM.includes(de) && ORDEM.includes(para))
    assert.notEqual(de, para)
  }
  assert.equal(ANTERIOR.constou_na_lista, undefined)
  assert.equal(ANTERIOR.selecionado, undefined)
  assert.equal(ANTERIOR.cancelado, undefined)
  for (const [, [para]] of Object.entries(PROXIMO)) assert.ok(ORDEM.includes(para))
})

test('só o que já saiu para entrega pede confirmação ao retirar', () => {
  assert.deepEqual(ORDEM.filter(jaSaiu), ['enviado', 'entregue', 'nao_entregue'])
})

test('a tela oferece retirar e desfazer, e a ficha da pessoa também', () => {
  const lista = readFileSync(new URL('../painel-app/src/components/vistas/PressKit.jsx', import.meta.url), 'utf8')
  assert.match(lista, /Retirar da lista/)
  assert.match(lista, /Colocar de volta/)
  assert.match(lista, /Desfazer/)
  const ficha = readFileSync(new URL('../painel-app/src/components/vistas/Contatos.jsx', import.meta.url), 'utf8')
  assert.match(ficha, /Retirar da lista/)
  assert.match(ficha, /Colocar de volta na lista/)
  assert.equal(STATUS.presskit.cancelado.rotulo, 'Retirado da lista')
})
