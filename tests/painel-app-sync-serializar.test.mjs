import { test } from 'node:test'
import assert from 'node:assert/strict'
import { criarSerializador } from '../painel-app/src/lib/sync/serializar.js'

const esperar = () => new Promise((r) => setImmediate(r))
function controlavel() {
  const chamadas = []
  const s = criarSerializador((aviso) => new Promise((resolve, reject) => { chamadas.push({ aviso, resolve, reject }) }))
  return { s, chamadas }
}

test('nunca duas cargas ao mesmo tempo; o aviso do meio vira UMA releitura ao fim (com o mais recente)', async () => {
  const { s, chamadas } = controlavel()
  s.rodar({ n: 1 })
  s.rodar({ n: 2 }); s.rodar({ n: 3 }); s.rodar({ n: 4 })
  await esperar()
  assert.equal(chamadas.length, 1, 'só a primeira está em andamento')
  chamadas[0].resolve()
  await esperar()
  assert.equal(chamadas.length, 2, 'três avisos viraram uma releitura')
  assert.deepEqual(chamadas[1].aviso, { n: 4 }, 'com o aviso mais recente')
  chamadas[1].resolve()
  await esperar()
  assert.equal(chamadas.length, 2)
  assert.equal(s.ocupado(), false)
})

test('aviso sem carga em andamento roda na hora', async () => {
  const { s, chamadas } = controlavel()
  s.rodar({ n: 1 }); await esperar()
  chamadas[0].resolve(); await esperar()
  s.rodar({ n: 2 }); await esperar()
  assert.equal(chamadas.length, 2)
})

test('depois de encerrar (tela desmontada) nada mais roda, nem o aviso pendente', async () => {
  const { s, chamadas } = controlavel()
  s.rodar({ n: 1 }); s.rodar({ n: 2 }); await esperar()
  s.encerrar()
  chamadas[0].resolve(); await esperar()
  assert.equal(chamadas.length, 1)
  s.rodar({ n: 3 }); await esperar()
  assert.equal(chamadas.length, 1)
})

test('carga que falha é registrada e não impede a seguinte nem derruba o executor', async () => {
  const resultados = []
  const chamadas = []
  const s = criarSerializador((a) => new Promise((resolve, reject) => { chamadas.push({ a, resolve, reject }) }), (r) => resultados.push(r.ok))
  s.rodar({ n: 1 }); s.rodar({ n: 2 }); await esperar()
  chamadas[0].reject(new Error('HTTP 500')); await esperar()
  assert.equal(chamadas.length, 2, 'a releitura pendente roda mesmo depois da falha')
  chamadas[1].resolve(); await esperar()
  assert.deepEqual(resultados, [false, true])
  assert.equal(s.ocupado(), false)
})

test('executor síncrono que lança também é contido', async () => {
  const resultados = []
  const s = criarSerializador(() => { throw new Error('quebrou') }, (r) => resultados.push(r.ok))
  await s.rodar({ n: 1 })
  assert.deepEqual(resultados, [false])
  await s.rodar({ n: 2 })
  assert.deepEqual(resultados, [false, false])
})
