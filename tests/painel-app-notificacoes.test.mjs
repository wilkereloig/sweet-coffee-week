process.env.TZ = 'America/Sao_Paulo'

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { notificacoesOrg } from '../painel-app/src/lib/notificacoes.js'

test('sem dado nenhum, fila vazia', () => {
  assert.deepEqual(notificacoesOrg(), [])
  assert.deepEqual(notificacoesOrg({}), [])
})

test('candidaturas novas de quero_participar, singular e plural', () => {
  const umaFila = notificacoesOrg({ dados: { quero_participar: [{ status: 'novo' }] } })
  assert.equal(umaFila.length, 1)
  assert.equal(umaFila[0].vista, 'respostas')
  assert.match(umaFila[0].texto, /^1 candidatura nova /)

  const duasFila = notificacoesOrg({ dados: { quero_participar: [{ status: 'novo' }, { status: 'novo' }] } })
  assert.match(duasFila[0].texto, /^2 candidaturas novas /)
})

test('respostas novas de apoiar/contato somam numa linha só, fora de quero_participar', () => {
  const fila = notificacoesOrg({ dados: { apoiar: [{ status: 'novo' }], contato: [{ status: 'novo' }, { status: 'em_analise' }] } })
  assert.equal(fila.length, 1)
  assert.match(fila[0].texto, /^2 respostas novas /)
})

test('pedidos publicados com pendentes viram alerta de produção, um por pedido', () => {
  const fila = notificacoesOrg({ solicitacoes: [{ titulo: 'Fotos', publicada_em: '2026-01-01', pendentes: 3 }, { titulo: 'Sem publicar', pendentes: 5 }] })
  assert.equal(fila.length, 1)
  assert.equal(fila[0].tipo, 'alerta')
  assert.match(fila[0].texto, /"Fotos": 3 marcas ainda não responderam\.$/)
})

test('vaga aberta na agenda de fotos', () => {
  const fila = notificacoesOrg({ sessoes: [{ status: 'aberto' }] })
  assert.equal(fila.length, 1)
  assert.equal(fila[0].tipo, 'agenda')
  assert.match(fila[0].texto, /^1 vaga aberta /)
})

test('sessão agendada dentro de 7 dias entra, fora da janela e já passada não', () => {
  const dia = 864e5
  const sessoes = [
    { status: 'agendada', data_hora: new Date(Date.now() + 3 * dia).toISOString(), nome_marca: 'Bocaditos' },
    { status: 'agendada', data_hora: new Date(Date.now() + 30 * dia).toISOString(), nome_marca: 'Longe' },
    { status: 'agendada', data_hora: new Date(Date.now() - dia).toISOString(), nome_marca: 'Passada' },
  ]
  const fila = notificacoesOrg({ sessoes })
  assert.equal(fila.length, 1)
  assert.match(fila[0].texto, /^Sessão de fotos de Bocaditos: /)
})

test('marcas com cadastro completo geram aviso "ok" para participantes', () => {
  const fila = notificacoesOrg({ participantes: [{ status_cadastro: 'cadastro_completo' }, { status_cadastro: 'em_preenchimento' }] })
  assert.equal(fila.length, 1)
  assert.equal(fila[0].tipo, 'ok')
  assert.equal(fila[0].vista, 'participantes')
})
