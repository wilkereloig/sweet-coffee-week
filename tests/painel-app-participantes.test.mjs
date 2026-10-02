import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  slugPrevisto, resumoParticipante, montarRecado, linkWhatsApp, soDigitos,
  textoTodosAcessos, mascaraWhatsApp, validarWhatsApp, whatsappNormalizado,
} from '../painel-app/src/lib/participantes.js'

test('slugPrevisto normaliza acento, & e espaço, e casa com a Edge Function', () => {
  assert.equal(slugPrevisto("Mr. Cupcake & Café"), 'mrcupcakeecafe')
  assert.equal(slugPrevisto('  Duart\'s  '), 'duarts')
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

test('montarRecado é puro (origem injetada, sem `location`) e usa o texto do pedido', () => {
  const texto = montarRecado({ nomeMarca: 'Bocaditos', responsavel: 'Ana Souza', login: 'Bocaditos', senha: 'abc123', origem: 'https://x.test' })
  // /painel/ — o escopo do service worker (/marca/ só redireciona).
  assert.match(texto, /^Olá, Ana\./)
  assert.match(texto, /Acesse: https:\/\/x\.test\/painel\//)
  assert.match(texto, /Login: Bocaditos/)
  assert.match(texto, /Senha temporária: abc123/)
  assert.match(montarRecado({ nomeMarca: 'Bocaditos', login: 'b', senha: 's', origem: 'o' }), /^Olá, Bocaditos\./)
})

test('Copiar todos os acessos: um bloco por marca, separados, sem senha quando não há', () => {
  const t = textoTodosAcessos([
    { nomeMarca: 'A', responsavel: 'Ana', login: 'A', senha: 'S1' },
    { nomeMarca: 'B', login: 'B' },
  ], 'https://x.test')
  const [a, b] = t.split('\n\n---\n\n')
  assert.equal(a, 'Estabelecimento: A\nResponsável: Ana\nLogin: A\nSenha temporária: S1\nAcesso: https://x.test/painel/')
  assert.equal(b, 'Estabelecimento: B\nResponsável: —\nLogin: B\nAcesso: https://x.test/painel/')
})

test('WhatsApp: máscara brasileira, validação de DDD/dígitos e forma normalizada', () => {
  assert.equal(mascaraWhatsApp('84999998888'), '(84) 99999-8888')
  assert.equal(mascaraWhatsApp('8433334444'), '(84) 3333-4444')
  assert.equal(mascaraWhatsApp('5584999998888'), '(84) 99999-8888')
  assert.equal(mascaraWhatsApp('849'), '(84) 9')
  assert.equal(mascaraWhatsApp(''), '')
  assert.equal(validarWhatsApp('(84) 99999-8888'), '')
  assert.equal(validarWhatsApp(''), '')
  assert.match(validarWhatsApp('(20) 99999-8888'), /DDD 20/)
  assert.match(validarWhatsApp('84 9999'), /10 ou 11/)
  assert.match(validarWhatsApp('(84) 89999-8888'), /começa com 9/)
  assert.equal(whatsappNormalizado('(84) 99999-8888'), '5584999998888')
})
