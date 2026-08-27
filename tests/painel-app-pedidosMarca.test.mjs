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
  const dia = 864e5
  assert.equal(prazoTexto(new Date(Date.now() - 2 * dia).toISOString()).classe, 'vencido')
  assert.match(prazoTexto(new Date(Date.now() - 2 * dia).toISOString()).texto, /^venceu em /)

  assert.deepEqual(prazoTexto(new Date(Date.now() - 1000).toISOString()), { texto: 'vence hoje', classe: 'vencido' })

  assert.deepEqual(prazoTexto(new Date(Date.now() + dia * 0.5).toISOString()), { texto: 'falta 1 dia', classe: 'andamento' })

  assert.deepEqual(prazoTexto(new Date(Date.now() + 3 * dia).toISOString()), { texto: 'faltam 3 dias', classe: 'andamento' })

  const distante = prazoTexto(new Date(Date.now() + 30 * dia).toISOString())
  assert.equal(distante.classe, '')
  assert.match(distante.texto, /^até /)
})

test('minhasSolicitacoes: exclui aviso geral de OUTRA edição, mantém geral sem edição e as de escopo marca', () => {
  const lista = [
    { id: 1, escopo: 'geral', edicao_codigo: '2026.1' },
    { id: 2, escopo: 'geral', edicao_codigo: '2025' },
    { id: 3, escopo: 'geral', edicao_codigo: null },
    { id: 4, escopo: 'marca', edicao_codigo: '2025' },
  ]
  const minhas = minhasSolicitacoes(lista, { edicao_codigo: '2026.1' })
  assert.deepEqual(minhas.map((s) => s.id), [1, 3, 4])
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
