import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rpc, chamarFuncao } from '../painel-app/src/lib/rpc.js'

// Reproduz uma gravação em uma tela enquanto outra leitura está montada.
// Nenhum token, conta ou banco real é usado neste teste.
test('gravação RPC confirmada avisa as outras leituras sem transmitir o corpo', async () => {
  const anterior = globalThis.window
  const janela = new EventTarget()
  globalThis.window = janela
  const eventos = []
  janela.addEventListener('scw:painel:alteracao', (e) => eventos.push(e.detail))
  try {
    await rpc('org_salvar_dados_publicos', { p_dados: { descricao: 'texto privado' } }, async () => ({ ok: true, text: async () => 'true' }))
    assert.equal(eventos.length, 1, 'salvar precisa avisar as outras telas da mesma sessão')
    assert.ok(eventos[0].dominios.includes('participantes'))
    assert.ok(!JSON.stringify(eventos).includes('texto privado'))
  } finally { globalThis.window = anterior }
})

test('leitura e gravação recusada não anunciam uma alteração', async () => {
  const anterior = globalThis.window
  const janela = new EventTarget()
  globalThis.window = janela
  let n = 0
  janela.addEventListener('scw:painel:alteracao', () => n++)
  try {
    await rpc('get_participantes', {}, async () => ({ ok: true, text: async () => '[]' }))
    await assert.rejects(rpc('org_salvar_dados_publicos', {}, async () => ({ ok: false, status: 403, json: async () => ({ message: 'nao_autorizado' }) })))
    assert.equal(n, 0)
  } finally { globalThis.window = anterior }
})

test('Edge Function confirmada também avisa as leituras dependentes', async () => {
  const anterior = globalThis.window
  const janela = new EventTarget()
  globalThis.window = janela
  let n = 0
  janela.addEventListener('scw:painel:alteracao', () => n++)
  try {
    await chamarFuncao('criar-acesso-marca', {}, async () => ({ ok: true, json: async () => ({ ok: true }) }))
    assert.equal(n, 1)
  } finally { globalThis.window = anterior }
})
