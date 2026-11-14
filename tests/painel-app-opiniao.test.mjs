import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TEMAS_MELHORAR, opiniaoVazia, opiniaoDoBanco, opiniaoParaSalvar, opiniaoTemConteudo } from '../painel-app/src/lib/opiniaoCasa.js'
import { ordemDoInicio } from '../painel-app/src/lib/inicioMarca.js'

/*
 * Sua opinião (14/11/2026): a casa conta como foi a edição; a organização lê na ficha.
 */
test('marcadores da tela = marcadores aceitos pelo banco', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20270208_feedback_casa.sql', import.meta.url), 'utf8')
  const banco = sql.match(/select array\[([^\]]+)\]/)[1].split(',').map((s) => s.trim().replace(/'/g, ''))
  assert.deepEqual(TEMAS_MELHORAR.map(([t]) => t), banco)
})

test('sem resposta no banco vira formulário vazio; resposta volta como estava', () => {
  assert.deepEqual(opiniaoDoBanco(null), opiniaoVazia)
  const f = opiniaoDoBanco({ recomendacao: 0, funcionou: 'x', melhorar_temas: ['painel', 'inventado'], interesse: 'talvez' })
  assert.equal(f.recomendacao, 0, 'zero é nota, não "sem nota"')
  assert.deepEqual(f.melhorar_temas, ['painel'])
  assert.equal(f.livre, '')
})

test('o que vai para o banco: nota 0–10 ou nada, texto aparado, só marcadores válidos', () => {
  const p = opiniaoParaSalvar({ ...opiniaoVazia, recomendacao: 10, funcionou: '  ok  ', melhorar_temas: ['vouchers', 'x'], interesse: 'nao' })
  assert.equal(p.recomendacao, 10)
  assert.equal(p.funcionou, 'ok')
  assert.deepEqual(p.melhorar_temas, ['vouchers'])
  assert.equal(p.interesse, 'nao')
  assert.equal(opiniaoParaSalvar(opiniaoVazia).recomendacao, null)
  assert.equal(opiniaoParaSalvar({ ...opiniaoVazia, recomendacao: 11 }).recomendacao, null)
  assert.equal(opiniaoParaSalvar({ ...opiniaoVazia, interesse: 'quem sabe' }).interesse, null)
})

test('ficha só mostra resposta com conteúdo (nota 0 conta)', () => {
  assert.equal(opiniaoTemConteudo(null), false)
  assert.equal(opiniaoTemConteudo({ ...opiniaoVazia }), false)
  assert.equal(opiniaoTemConteudo({ ...opiniaoVazia, recomendacao: 0 }), true)
  assert.equal(opiniaoTemConteudo({ ...opiniaoVazia, livre: 'oi' }), true)
})

test('convite no Início só depois do festival, logo abaixo do "agora"', () => {
  const depois = ordemDoInicio('depois')
  assert.equal(depois.indexOf('opiniao'), depois.indexOf('agora') + 1)
  for (const m of ['antes', 'durante', 'indefinido']) assert.ok(!ordemDoInicio(m).includes('opiniao'), m)
})
