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

// SCW_DIST aponta para um build feito FORA do projeto (CLAUDE.md §3.2); sem ele vale dist/.
const DIST = path.resolve(process.env.SCW_DIST || 'dist')
const TEXTO = /\.(js|mjs|css|html|json|webmanifest|txt|map)$/
const arquivosDeTexto = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const caminho = path.join(dir, e.name)
  if (e.isDirectory()) return arquivosDeTexto(caminho)
  return TEXTO.test(e.name) ? [caminho] : []
})
const RETRATO = path.resolve('src/edicao/dados/retrato/cartoon.local.json')

test('build de produção não carrega dado de demonstração', { skip: !fs.existsSync(path.join(DIST, 'assets')) && 'sem build (rode npm run build ou aponte SCW_DIST)' }, () => {
  const vaza = arquivosDeTexto(path.join(DIST, 'assets')).filter((f) => f.endsWith('.js') && /\[DEMO\]|demo-casa-aurora|DEMO_EDICAO/.test(fs.readFileSync(f, 'utf8')))
  assert.deepEqual(vaza, [])
})

test('build de produção não carrega o retrato local do painel', { skip: !fs.existsSync(path.join(DIST, 'assets')) && 'sem build (rode npm run build ou aponte SCW_DIST)' }, () => {
  // Marcadores que só o retrato tem; com o arquivo local presente entram também os ids públicos das unidades
  // (nome de casa não serve: várias já estão no acervo institucional, que é público).
  const marcas = ['retrato-local', 'cartoon.local', 'fase_do_recorte', 'sem_coordenada']
  if (fs.existsSync(RETRATO)) {
    const r = JSON.parse(fs.readFileSync(RETRATO, 'utf8'))
    for (const p of r.participantes) for (const u of p.unidades || []) marcas.push(`"${u.id}"`, `'${u.id}'`, `\`${u.id}\``)
  }
  const vaza = arquivosDeTexto(DIST).flatMap((f) => {
    const texto = fs.readFileSync(f, 'utf8')
    return marcas.filter((m) => texto.includes(m)).map((m) => `${path.relative(DIST, f)}: ${m}`)
  })
  assert.deepEqual(vaza, [])
  // O Vite copia public/ inteiro; vite.config.js (semRetratoLocal) tira public/retrato-local/ do resultado.
  assert.equal(fs.existsSync(path.join(DIST, 'retrato-local')), false, 'retrato-local/ foi parar no build')
})
