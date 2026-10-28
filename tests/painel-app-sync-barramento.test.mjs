import { test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBarramento, JANELA_MS, MAXIMO_MS, TEMPESTADE_ENTREGAS, TEMPESTADE_PAUSA_MS } from '../painel-app/src/lib/sync/barramento.js'
import { relogioFalso } from './helpers/phoenix-falso.mjs'

function novo(extra = {}) {
  const rel = relogioFalso()
  const b = criarBarramento({ agora: rel.agora, agendar: rel.agendar, cancelar: rel.cancelar, ...extra })
  return { rel, b }
}

test('rajada de avisos próximos vira UMA entrega com a união dos domínios e ids', async () => {
  const { rel, b } = novo()
  const recebidos = []
  b.ouvir(['participantes', 'cadastro'], (a) => recebidos.push(a))
  b.anunciar(['participantes'], { ref: 'p1' })
  await rel.avancar(50)
  b.anunciar(['cadastro'], { ref: 'p1' })
  b.anunciar(['participantes'], { ref: 'p2' })
  assert.equal(recebidos.length, 0, 'ainda dentro da janela')
  await rel.avancar(JANELA_MS)
  assert.equal(recebidos.length, 1)
  assert.deepEqual([...recebidos[0].dominios].sort(), ['cadastro', 'participantes'])
  assert.deepEqual([...recebidos[0].refs].sort(), ['p1', 'p2'])
})

test('avisos repetidos (mesmo domínio, id e origem) não se multiplicam', async () => {
  const { rel, b } = novo()
  const recebidos = []
  b.ouvir(['avisos'], (a) => recebidos.push(a))
  for (let i = 0; i < 20; i++) b.anunciar(['avisos'], { origem: 'remota' })
  await rel.avancar(JANELA_MS + 1)
  assert.equal(recebidos.length, 1)
  assert.deepEqual(recebidos[0].origens, ['remota'])
})

test('cada ouvinte só recebe os domínios que declarou; "*" recebe todos', async () => {
  const { rel, b } = novo()
  const so = [], tudo = []
  b.ouvir(['redes'], (a) => so.push(a.dominios))
  b.ouvir('*', (a) => tudo.push(a.dominios))
  b.anunciar(['participantes'])
  b.anunciar(['redes'])
  await rel.avancar(JANELA_MS + 1)
  assert.deepEqual(so, [['redes']])
  assert.deepEqual(tudo[0].sort(), ['participantes', 'redes'])
})

test('domínio desconhecido é descartado (nem servidor nem gravação inventam domínio)', async () => {
  const { rel, b } = novo()
  const recebidos = []
  b.ouvir('*', (a) => recebidos.push(a))
  b.anunciar(['nao_existe', '__proto__', 'x y'])
  await rel.avancar(2000)
  assert.equal(recebidos.length, 0)
})

test('avisos contínuos não adiam a entrega para sempre (teto de 1 s)', async () => {
  const { rel, b } = novo()
  const instantes = []
  b.ouvir(['mensagens'], () => instantes.push(rel.agora()))
  for (let i = 0; i < 15; i++) { b.anunciar(['mensagens'], { ref: 'r' + i }); await rel.avancar(100) }
  assert.ok(instantes.length >= 1, 'entregou durante a rajada')
  assert.ok(instantes[0] <= MAXIMO_MS + 5, 'primeira entrega no máximo em ~1 s: ' + instantes[0])
})

test('domínio que dispara de mais é segurado e solto UMA vez ao fim da pausa (laço não vira tempestade)', async () => {
  const { rel, b } = novo()
  const entregas = []
  b.ouvir(['vendas'], (a) => entregas.push(rel.agora()))
  for (let i = 0; i < TEMPESTADE_ENTREGAS; i++) { b.anunciar(['vendas']); await rel.avancar(300) }   // 12 entregas em ~3,6 s
  const antes = entregas.length
  assert.equal(antes, TEMPESTADE_ENTREGAS)
  for (let i = 0; i < 5; i++) { b.anunciar(['vendas'], { ref: 'x' + i }); await rel.avancar(300) }
  assert.equal(entregas.length, antes, 'segurado durante a pausa')
  assert.deepEqual(b.segurados(), ['vendas'])
  await rel.avancar(TEMPESTADE_PAUSA_MS)
  assert.equal(entregas.length, antes + 1, 'solto uma vez só')
  assert.deepEqual(b.segurados(), [])
})

test('reconciliação relê só o que está sendo ouvido e não conta como tempestade', async () => {
  const { rel, b } = novo()
  const a1 = [], a2 = []
  b.ouvir(['arquivos'], (a) => a1.push(a))
  b.ouvir(['pedidos', 'fotos'], (a) => a2.push(a))
  for (let i = 0; i < 30; i++) { b.reconciliar(); await rel.avancar(200) }
  assert.equal(a1.length, 30)
  assert.equal(a2.length, 30)
  assert.deepEqual(a1[0].origens, ['reconciliacao'])
  assert.deepEqual(b.segurados(), [], 'reconciliação nunca entra em pausa')
  assert.deepEqual([...a2[0].dominios].sort(), ['fotos', 'pedidos'])
})

test('reiniciar (sair/trocar de conta) descarta o pendente e muda a época', async () => {
  const { rel, b } = novo()
  const recebidos = []
  b.ouvir(['participantes'], (a) => recebidos.push(a))
  const epoca = b.epoca()
  b.anunciar(['participantes'])
  b.reiniciar()
  await rel.avancar(2000)
  assert.equal(recebidos.length, 0)
  assert.equal(b.epoca(), epoca + 1)
})

test('um ouvinte que lança erro não impede os outros nem o barramento', async () => {
  const erros = []
  const { rel, b } = novo({ aoErro: (e) => erros.push(e.message) })
  const bons = []
  b.ouvir(['edicao'], () => { throw new Error('quebrou') })
  b.ouvir(['edicao'], (a) => bons.push(a))
  b.anunciar(['edicao'])
  await rel.avancar(JANELA_MS + 1)
  assert.equal(bons.length, 1)
  assert.deepEqual(erros, ['quebrou'])
  b.anunciar(['edicao'], { ref: 'outra' })
  await rel.avancar(JANELA_MS + 1)
  assert.equal(bons.length, 2, 'continua funcionando depois do erro')
})

test('desinscrever para de entregar (tela desmontada)', async () => {
  const { rel, b } = novo()
  const recebidos = []
  const desligar = b.ouvir(['logos'], (a) => recebidos.push(a))
  desligar()
  b.anunciar(['logos'])
  await rel.avancar(JANELA_MS + 1)
  assert.equal(recebidos.length, 0)
  assert.equal(b.ouvintes(), 0)
})
