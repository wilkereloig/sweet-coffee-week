process.env.TZ = 'America/Sao_Paulo'

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { montarAgendaGrade, nomeSeguro, isoDoCampo, HORARIOS_AGENDA } from '../painel-app/src/lib/producao.js'

test('montarAgendaGrade devolve 4 dias de 4 horários, tudo fechado sem sessão', () => {
  const grade = montarAgendaGrade([], new Date('2027-03-01T12:00:00-03:00'))
  assert.equal(grade.length, 4)
  grade.forEach((dia) => {
    assert.equal(dia.slots.length, HORARIOS_AGENDA.length)
    dia.slots.forEach((s) => assert.equal(s.estado, 'fechado'))
  })
})

test('montarAgendaGrade casa vaga aberta e sessão agendada pelo horário', () => {
  const hoje = new Date('2027-03-01T12:00:00-03:00')
  const abertaEm = new Date(hoje); abertaEm.setHours(9, 0, 0, 0)
  const reservadaEm = new Date(hoje); reservadaEm.setHours(14, 0, 0, 0)
  const sessoes = [
    { id: 'a1', status: 'aberto', data_hora: abertaEm.toISOString() },
    { id: 'b2', status: 'agendada', data_hora: reservadaEm.toISOString(), nome_marca: 'Bocaditos' },
  ]
  const [dia0] = montarAgendaGrade(sessoes, hoje)
  const nove = dia0.slots.find((s) => s.hhmm === '09:00')
  const catorze = dia0.slots.find((s) => s.hhmm === '14:00')
  const onze = dia0.slots.find((s) => s.hhmm === '11:00')
  assert.deepEqual({ estado: nove.estado, sessaoId: nove.sessaoId }, { estado: 'aberto', sessaoId: 'a1' })
  assert.deepEqual({ estado: catorze.estado, quem: catorze.quem }, { estado: 'reservado', quem: 'Bocaditos' })
  assert.equal(onze.estado, 'fechado')
})

test('nomeSeguro tira acento, espaço e caractere especial, preserva extensão', () => {
  assert.equal(nomeSeguro('Contrato Rótulo (v2) final.pdf'), 'Contrato-Rotulo-v2-final.pdf')
  assert.equal(nomeSeguro(''), 'arquivo')
  assert.equal(nomeSeguro(null), 'arquivo')
})

test('isoDoCampo lê datetime-local como hora local, não UTC', () => {
  assert.equal(isoDoCampo(''), null)
  assert.equal(isoDoCampo('data-invalida'), null)
  const iso = isoDoCampo('2027-03-04T14:30')
  assert.equal(new Date(iso).getHours(), 14)
  assert.equal(new Date(iso).getMinutes(), 30)
})
