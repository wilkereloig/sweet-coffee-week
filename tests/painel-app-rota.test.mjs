import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lerRota, montarRota, rotaDoLink, mesmaRota } from '../painel-app/src/lib/rota.js'

test('ida e volta: montar e ler devolvem a mesma rota', () => {
  const r = { vista: 'participantes', aba: 'lista', filtros: { item: 'abc', situacao: 'sem_acesso', q: 'café & cia' } }
  assert.deepEqual(lerRota(montarRota(r)), r)
})

test('montarRota ordena chaves e descarta vazios', () => {
  assert.equal(montarRota({ vista: 'contatos', aba: 'pessoas', filtros: { z: '1', a: '', b: null, c: 'x' } }), '#contatos/pessoas?c=x&z=1')
  assert.equal(montarRota({ vista: 'visao' }), '#visao')
  assert.ok(mesmaRota({ vista: 'a', filtros: { x: '1', y: '2' } }, { vista: 'a', filtros: { y: '2', x: '1' } }))
})

test('lerRota tolera vazio e lixo', () => {
  assert.deepEqual(lerRota(''), { vista: '', aba: '', filtros: {} })
  assert.deepEqual(lerRota('#'), { vista: '', aba: '', filtros: {} })
  assert.deepEqual(lerRota('#visao?'), { vista: 'visao', aba: '', filtros: {} })
})

test('links antigos gravados no banco caem no módulo novo', () => {
  assert.deepEqual(rotaDoLink('marcas/p1/mensagens'), { vista: 'participantes', aba: 'lista', filtros: { item: 'p1', sub: 'mensagens' } })
  assert.deepEqual(rotaDoLink('marcas/p1'), { vista: 'participantes', aba: 'lista', filtros: { item: 'p1' } })
  assert.deepEqual(rotaDoLink('producao/pedido/s1'), { vista: 'operacao', aba: 'pedidos', filtros: { item: 's1' } })
  assert.deepEqual(rotaDoLink('producao/fotos'), { vista: 'operacao', aba: 'fotos', filtros: {} })
  assert.deepEqual(rotaDoLink('respostas/quero_participar/q1'), { vista: 'participantes', aba: 'candidaturas', filtros: { origem: 'quero_participar', item: 'q1' } })
  assert.deepEqual(rotaDoLink('respostas/apoiar/a1'), { vista: 'contatos', aba: 'recebidos', filtros: { origem: 'apoiar', item: 'a1' } })
  assert.deepEqual(rotaDoLink('respostas/contato/c1'), { vista: 'contatos', aba: 'recebidos', filtros: { origem: 'contato', item: 'c1' } })
  assert.deepEqual(rotaDoLink('edicao/temas'), { vista: 'participantes', aba: 'temas', filtros: {} })
  assert.deepEqual(rotaDoLink('edicao/revisao'), { vista: 'admin', aba: 'revisao', filtros: {} })
  assert.deepEqual(rotaDoLink('mesa'), { vista: 'visao', aba: '', filtros: {} })
  assert.deepEqual(rotaDoLink('equipe'), { vista: 'admin', aba: 'equipe', filtros: {} })
})

test('links novos também funcionam', () => {
  assert.deepEqual(rotaDoLink('participantes/temas'), { vista: 'participantes', aba: 'temas', filtros: {} })
  assert.deepEqual(rotaDoLink('contatos/presskit'), { vista: 'contatos', aba: 'presskit', filtros: {} })
  assert.deepEqual(rotaDoLink('contatos/k1'), { vista: 'contatos', aba: 'pessoas', filtros: { item: 'k1' } })
  assert.deepEqual(rotaDoLink('arquivos'), { vista: 'arquivos', aba: 'gerais', filtros: {} })
  assert.equal(rotaDoLink(''), null)
  assert.equal(rotaDoLink(null), null)
})

test('linkDeAlvo traduz o irPara antigo', async () => {
  const { linkDeAlvo } = await import('../painel-app/src/lib/rota.js')
  assert.deepEqual(rotaDoLink(linkDeAlvo('participantes', { id: 'p1', sub: 'operacao' })), { vista: 'participantes', aba: 'lista', filtros: { item: 'p1', sub: 'operacao' } })
  assert.deepEqual(rotaDoLink(linkDeAlvo('edicao', { sub: 'revisao' })), { vista: 'admin', aba: 'revisao', filtros: {} })
  assert.deepEqual(rotaDoLink(linkDeAlvo('contatos', { id: 'k1' })), { vista: 'contatos', aba: 'pessoas', filtros: { item: 'k1' } })
  assert.deepEqual(rotaDoLink(linkDeAlvo('respostas')), { vista: 'participantes', aba: 'candidaturas', filtros: {} })
  assert.deepEqual(rotaDoLink(linkDeAlvo('producao')), { vista: 'operacao', aba: 'pedidos', filtros: {} })
})
