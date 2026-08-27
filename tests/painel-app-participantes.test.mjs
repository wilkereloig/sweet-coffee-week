import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  slugPrevisto, resumoParticipante, montarRecado, linkWhatsApp, soDigitos,
} from '../painel-app/src/lib/participantes.js'

test('slugPrevisto normaliza acento, & e espaço, e casa com a Edge Function', () => {
  assert.equal(slugPrevisto("Mr. Cupcake & Café"), 'mr-cupcake-e-cafe')
  assert.equal(slugPrevisto('  Duart\'s  '), 'duart-s')
  assert.equal(slugPrevisto(''), '')
})

test('resumoParticipante conta contagens que chegam como STRING (bigint do Postgres)', () => {
  const linha = resumoParticipante({
    edicao_codigo: '2026.1', edicoes: '3', tema_combo: 'Lovers',
    itens_prontos: '2', unidades: '1', combo_preco: 18.5,
  })
  assert.equal(linha, 'edição 2026.1 · 3 edições · Lovers · 2 de 3 itens · 1 unidade · R$ 18,50')
})

test('resumoParticipante sem edição aberta e nada preenchido', () => {
  assert.equal(resumoParticipante({}), 'sem edição aberta · nada preenchido ainda')
})

test('soDigitos tira tudo que não é número', () => {
  assert.equal(soDigitos('(84) 90000-0000'), '84900000000')
  assert.equal(soDigitos(null), '')
})

test('linkWhatsApp antepõe 55 a telefone de até 11 dígitos, null sem telefone', () => {
  assert.equal(linkWhatsApp(null, 'oi'), null)
  const link = linkWhatsApp('84900000000', 'oi')
  assert.match(link, /^https:\/\/wa\.me\/5584900000000\?text=oi$/)
})

test('montarRecado é puro (origem injetada, sem `location`)', () => {
  const texto = montarRecado({ nomeMarca: 'Bocaditos', login: 'bocaditos', senha: 'abc123', origem: 'https://x.test' })
  assert.match(texto, /Endereço: https:\/\/x\.test\/marca\//)
  assert.match(texto, /Login: bocaditos/)
  assert.match(texto, /Senha: abc123/)
})
