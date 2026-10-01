import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dataCurta, prazoTexto, minhasSolicitacoes, mapaRespondidas } from '../painel-app/src/lib/pedidosMarca.js'

test('dataCurta: dd/mm/aaaa, vazio para ausente ou inválido', () => {
  assert.equal(dataCurta(null), '')
  assert.equal(dataCurta('não é data'), '')
  assert.match(dataCurta('2027-03-04T12:00:00Z'), /^\d{2}\/\d{2}\/\d{4}$/)
})

test('prazoTexto: sem data devolve vazio', () => {
  assert.deepEqual(prazoTexto(null), { texto: '', classe: '' })
  assert.deepEqual(prazoTexto('não é data'), { texto: '', classe: '' })
})

test('prazoTexto: vencido, hoje, 1 dia (singular), poucos dias e distante', () => {
  // "Agora" fixo às 10h: o resultado não depende da hora em que o teste roda.
  const agora = new Date(2026, 8, 10, 10, 0).getTime()
  const em = (d, h = 23, m = 59) => new Date(2026, 8, 10 + d, h, m).toISOString()
  assert.equal(prazoTexto(em(-2), agora).classe, 'vencido')
  assert.match(prazoTexto(em(-2), agora).texto, /^venceu em /)

  // Prazo às 23h59 de HOJE: ainda é hoje, não "falta 1 dia".
  assert.deepEqual(prazoTexto(em(0), agora), { texto: 'vence hoje', classe: 'vencido' })

  assert.deepEqual(prazoTexto(em(1, 0, 30), agora), { texto: 'falta 1 dia', classe: 'andamento' })

  assert.deepEqual(prazoTexto(em(3), agora), { texto: 'faltam 3 dias', classe: 'andamento' })

  const distante = prazoTexto(em(30), agora)
  assert.equal(distante.classe, '')
  assert.match(distante.texto, /^até /)
})

test('minhasSolicitacoes: exclui aviso geral de OUTRA edição, mantém geral sem edição e as de escopo marca', () => {
  const lista = [
    { id: 1, escopo: 'geral', edicao_codigo: '2026.1' },
    { id: 2, escopo: 'geral', edicao_codigo: '2025' },
    { id: 3, escopo: 'geral', edicao_codigo: null },
    { id: 4, escopo: 'marca', participacao_id: 'pa-atual', edicao_codigo: '2025' },
  ]
  const minhas = minhasSolicitacoes(lista, { id: 'pa-atual', edicao_codigo: '2026.1' })
  assert.deepEqual(minhas.map((s) => s.id), [1, 3, 4])
})

test('minhasSolicitacoes: pedido individual de OUTRA participação da mesma marca não vaza', () => {
  const lista = [
    { id: 1, escopo: 'marca', participacao_id: 'pa-2025' },
    { id: 2, escopo: 'marca', participacao_id: 'pa-atual' },
  ]
  assert.deepEqual(minhasSolicitacoes(lista, { id: 'pa-atual', edicao_codigo: '2026.1' }).map((s) => s.id), [2])
  assert.deepEqual(minhasSolicitacoes(lista, null).map((s) => s.id), [])
})

test('minhasSolicitacoes: sem participação, só sobra o aviso geral sem edição', () => {
  const lista = [
    { id: 1, escopo: 'geral', edicao_codigo: '2026.1' },
    { id: 2, escopo: 'geral', edicao_codigo: null },
  ]
  assert.deepEqual(minhasSolicitacoes(lista, null).map((s) => s.id), [2])
})

test('mapaRespondidas: só marca quem tem estado "respondido"', () => {
  const mapa = mapaRespondidas([
    { solicitacao_id: 'a', estado: 'respondido' },
    { solicitacao_id: 'b', estado: 'pendente' },
  ])
  assert.deepEqual(mapa, { a: true })
})
