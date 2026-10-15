// Minha rota (src/edicao/rota/minhaRota.js) e o build sem dado de demonstração.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import * as R from '../src/edicao/rota/minhaRota.js'
import { DEMO_EDICAO } from '../src/edicao/dados/demo/cartoon.js'

const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) } }

test('adicionar não duplica; remover e mover respeitam a ordem do visitante', () => {
  let ids = R.adicionar([], 'u000001')
  ids = R.adicionar(ids, 'u000002')
  assert.deepEqual(R.adicionar(ids, 'u000001'), ['u000001', 'u000002'])
  assert.deepEqual(R.mover(ids, 'u000002', -1), ['u000002', 'u000001'])
  assert.deepEqual(R.mover(ids, 'u000001', -1), ids)
  assert.deepEqual(R.remover(ids, 'u000001'), ['u000002'])
})

test('persistência por edição e armazenamento quebrado', () => {
  const s = memoria()
  R.gravarRota('2026.2', ['u000001'], s)
  assert.deepEqual(R.lerRota('2026.2', s), ['u000001'])
  assert.deepEqual(R.lerRota('2027.1', s), [])
  s.setItem(R.chaveRota('2026.2'), '{quebrado')
  assert.deepEqual(R.lerRota('2026.2', s), [])
  const explode = { getItem () { throw new Error('bloqueado') }, setItem () { throw new Error('bloqueado') } }
  assert.deepEqual(R.lerRota('2026.2', explode), [])
  assert.doesNotThrow(() => R.gravarRota('2026.2', ['x'], explode))
  assert.equal(R.chaveRota('2026.2').includes('sweet-lovers'), false)
})

test('unidade que saiu da edição volta sinalizada, nunca some', () => {
  const paradas = R.resolverParadas(['udemo1', 'u999999'], DEMO_EDICAO.participantes)
  assert.equal(paradas[0].ativa, true)
  assert.equal(paradas[0].participante.slug, 'demo-casa-aurora')
  assert.deepEqual(paradas[1], { id: 'u999999', ativa: false })
})

test('rota externa em trechos de até 9 paradas, na ordem escolhida', () => {
  const p = DEMO_EDICAO.participantes
  const ids = Array.from({ length: 11 }, (_, i) => ['udemo1', 'udemo2', 'udemo3'][i % 3])
  const links = R.linksDeRota(R.resolverParadas(ids, p))
  assert.equal(links.length, 2)
  const u = new URL(links[0])
  assert.equal(u.searchParams.get('destination'), 'Rua Exemplo B, 5, Ponta Negra, Natal'.replace(/^/, '[DEMO] '))
  assert.equal(u.searchParams.get('waypoints').split('|')[0], '-5.7945,-35.211')
  assert.deepEqual(R.linksDeRota([{ ativa: false }]), [])
})

test('rota compartilhada aceita só ids públicos', () => {
  assert.deepEqual(R.idsDaBusca('?u=u1a2b3c,lixo,u1a2b3c,<script>'), ['u1a2b3c'])
})

test('build de produção não carrega dado de demonstração', { skip: !fs.existsSync('dist/assets') && 'sem dist/ (rode npm run build)' }, () => {
  const assets = path.resolve('dist/assets')
  const nomes = fs.readdirSync(assets).filter((n) => n.endsWith('.js'))
  const vaza = nomes.filter((n) => /\[DEMO\]|demo-casa-aurora|DEMO_EDICAO/.test(fs.readFileSync(path.join(assets, n), 'utf8')))
  assert.deepEqual(vaza, [])
})
