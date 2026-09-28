// Lógica pura da central de avisos, mensagens e histórico (painel-app/src/lib/central.js).
// Rodar: node --test tests/painel-app-central.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  interpretarLink, lerIrDaUrl, tempoRelativo, descreverAtividade,
  agruparPorDia, contarNaoLidas, rotuloStatus,
} from '../painel-app/src/lib/central.js'

const ID = '4f7c1051-a821-4454-ba40-68bb2b1db880'

test('interpretarLink leva cada aviso ao item, não só à vista', () => {
  assert.deepEqual(interpretarLink('marcas/' + ID + '/mensagens'), { vista: 'participantes', id: ID, sub: 'mensagens' })
  assert.deepEqual(interpretarLink('marcas/' + ID), { vista: 'participantes', id: ID, sub: undefined })
  assert.deepEqual(interpretarLink('respostas/contato/' + ID), { vista: 'respostas', origem: 'contato', id: ID })
  assert.deepEqual(interpretarLink('producao/pedido/' + ID), { vista: 'producao', sub: 'pedido', id: ID })
  assert.deepEqual(interpretarLink('producao/fotos'), { vista: 'producao', sub: 'fotos', id: undefined })
  assert.deepEqual(interpretarLink('pedidos/' + ID), { vista: 'pedidos', id: ID })
  assert.deepEqual(interpretarLink('cadastro/fotos'), { vista: 'cadastro', sub: 'fotos' })
  assert.deepEqual(interpretarLink('mensagens'), { vista: 'mensagens' })
  assert.equal(interpretarLink(''), null)
  assert.equal(interpretarLink(null), null)
})

test('lerIrDaUrl aceita só caminho curto do painel — nada de URL nem caractere solto', () => {
  assert.equal(lerIrDaUrl('?ir=' + encodeURIComponent('pedidos/' + ID)), 'pedidos/' + ID)
  assert.equal(lerIrDaUrl('?ir=mensagens'), 'mensagens')
  assert.equal(lerIrDaUrl('?ir=' + encodeURIComponent('https://mal.com')), null)
  assert.equal(lerIrDaUrl('?ir=' + encodeURIComponent('<script>')), null)
  assert.equal(lerIrDaUrl(''), null)
})

test('tempoRelativo fala como gente', () => {
  const agora = new Date('2026-09-28T15:00:00').getTime()
  assert.equal(tempoRelativo(new Date(agora - 20e3).toISOString(), agora), 'agora')
  assert.equal(tempoRelativo(new Date(agora - 5 * 60e3).toISOString(), agora), 'há 5 min')
  assert.equal(tempoRelativo(new Date(agora - 3 * 3600e3).toISOString(), agora), 'há 3 h')
  assert.match(tempoRelativo(new Date('2026-09-27T14:10:00').toISOString(), agora), /^ontem 14:10$/)
  assert.match(tempoRelativo(new Date('2026-09-20T09:05:00').toISOString(), agora), /^20\/09 09:05$/)
  assert.equal(tempoRelativo(null, agora), '')
})

test('descreverAtividade diz o que mudou, com antes e depois', () => {
  const st = descreverAtividade({ acao: 'candidatura.status', detalhe: { de: 'em_analise', para: 'aprovado', quem: 'Doce Lar' } })
  assert.equal(st, 'Status de Doce Lar mudou de "Em análise" para "Aprovado"')
  const obs = descreverAtividade({ acao: 'observacao', marca: 'Doce Lar', detalhe: { texto: 'Liga amanhã' } }, { comMarca: false })
  assert.equal(obs, 'Observação interna: Liga amanhã')
  const msg = descreverAtividade({ acao: 'mensagem.enviada', marca: 'X', detalhe: { de: 'organizacao', trecho: 'Oi' } })
  assert.equal(msg, 'Mensagem enviada à marca · X: "Oi"')
  const pub = descreverAtividade({ acao: 'publicar_solicitacao', detalhe: { alcancadas: 1 } }, { comMarca: false })
  assert.equal(pub, 'Pedido publicado para 1 marca')
  // Ação desconhecida não quebra a tela.
  assert.equal(descreverAtividade({ acao: 'algo.novo', detalhe: {} }), 'algo novo')
})

test('agruparPorDia separa hoje, ontem e datas', () => {
  const agora = new Date('2026-09-28T15:00:00').getTime()
  const g = agruparPorDia([
    { id: 1, criada_em: '2026-09-26T10:00:00' },
    { id: 2, criada_em: '2026-09-27T10:00:00' },
    { id: 3, criada_em: '2026-09-28T09:00:00' },
    { id: 4, criada_em: '2026-09-28T10:00:00' },
  ], agora)
  assert.deepEqual(g.map((x) => [x.rotulo, x.itens.length]).slice(1), [['Ontem', 1], ['Hoje', 2]])
})

test('contarNaoLidas entende os dois formatos (org: lida; marca: lida_em)', () => {
  assert.equal(contarNaoLidas([{ lida: false }, { lida: true }, { lida_em: null }, { lida_em: '2026-01-01' }]), 2)
  assert.equal(rotuloStatus('em_analise'), 'Em análise')
})
