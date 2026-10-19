import { test } from 'node:test'
import assert from 'node:assert/strict'
import { montarCarga } from '../supabase/functions/enviar-push/carga.ts'

const ID = '11111111-2222-3333-4444-555555555555'

test('mensagem: o texto da conversa NUNCA vai para a tela de bloqueio', () => {
  const c = montarCarga({ tipo: 'mensagem', titulo: 'Doce Sol enviou uma mensagem', texto: 'Segue o contrato com o valor de R$ 12.000', link: 'marcas/abc/mensagens' }, ID)
  assert.equal(c.titulo, 'Doce Sol enviou uma mensagem')
  assert.equal(c.corpo, 'Abra o painel para ler.')
  assert.ok(!JSON.stringify(c).includes('R$'))
})

test('formulário do site: título genérico e sem nome, empresa nem assunto', () => {
  const c = montarCarga({ tipo: 'formulario', titulo: 'Novo contato: Maria da Silva', texto: 'Quero cancelar meu pedido do dia 12', link: 'respostas/contato/9' }, ID)
  assert.equal(c.titulo, 'Nova resposta em um formulário')
  assert.equal(c.corpo, 'Abra o painel para ver.')
  assert.ok(!/Maria|cancelar/.test(JSON.stringify(c)))
  assert.equal(c.url, '/painel/?ir=respostas%2Fcontato%2F9', 'o clique ainda leva ao item certo')
})

test('tipos operacionais mostram título e texto curto, cortados nos limites', () => {
  const c = montarCarga({ tipo: 'pedido', titulo: 'T'.repeat(200), texto: 'x'.repeat(500), link: 'pedidos/5' }, ID)
  assert.equal(c.titulo.length, 80)
  assert.equal(c.corpo.length, 240)
})

test('o mesmo aviso reenviado leva a mesma tag (substitui em vez de empilhar)', () => {
  assert.equal(montarCarga({ tipo: 'fotos', titulo: 'a' }, ID).tag, montarCarga({ tipo: 'fotos', titulo: 'a' }, ID).tag)
  assert.equal(montarCarga({ titulo: 'a' }, ID).tag, 'scw-' + ID)
})

test('sem link o clique abre o painel; link com caracteres perigosos vai codificado', () => {
  assert.equal(montarCarga({ tipo: 'redes', titulo: 'a' }, ID).url, '/painel/')
  const u = montarCarga({ tipo: 'redes', titulo: 'a', link: 'social/planejamento/x?y=1&z=//evil' }, ID).url
  assert.ok(!u.includes('&z='), 'o & é codificado, não vira parâmetro novo')
  assert.ok(u.startsWith('/painel/?ir='))
})

test('campos ausentes não quebram', () => {
  assert.deepEqual(montarCarga({}, ID), { titulo: '', corpo: '', url: '/painel/', tag: 'scw-' + ID })
})
