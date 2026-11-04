// Mundo da Doçura — mapa desenhado (src/edicao/rota/mundo.js, src/data/mundoEdicao.js; docs/cartoon-2026-2/14 §14.13).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { casasNoMundo, ordemDoCaminho, pontosDaRota, tracado } from '../src/edicao/rota/mundo.js'
import { mundoEdicao } from '../src/data/imageLibrary.js'

const U = {
  ua: { x: 0.1, y: 0.2, numero: 2, slug: 'a' },
  ub: { x: 0.5, y: 0.5, numero: 1, slug: 'b' },
  uc: { x: 0.9, y: 0.8, numero: 2, slug: 'a' },
}

test('ordem do caminho: numeração da casa, depois de cima para baixo; sem lugar na arte vai para o fim, como estava', () => {
  assert.deepEqual(ordemDoCaminho(['zz', 'uc', 'ua', 'yy', 'ub'], U), ['ub', 'ua', 'uc', 'zz', 'yy'])
  assert.deepEqual(ordemDoCaminho([], U), [])
})

test('casas no mundo: só quem tem lugar na arte, na ordem do caminho, com x/y/número', () => {
  const linhas = [{ u: { id: 'uc' } }, { u: { id: 'fora' } }, { u: { id: 'ub' } }, { u: { id: 'ua' } }]
  const casas = casasNoMundo(U, linhas)
  assert.deepEqual(casas.map((c) => c.u.id), ['ub', 'ua', 'uc'])
  assert.equal(casas[0].numero, 1)
  assert.equal(casas[1].x, 0.1)
})

test('rota desenhada: na ordem do visitante, passando por todas as paradas', () => {
  assert.deepEqual(pontosDaRota(['uc', 'fora', 'ua'], U), [{ x: 0.9, y: 0.8 }, { x: 0.1, y: 0.2 }])
  assert.equal(tracado([{ x: 0.5, y: 0.5 }], [1000, 1500]), '', 'uma parada não tem caminho')
  const d = tracado(pontosDaRota(['ua', 'ub', 'uc'], U), [1024, 1536])
  assert.match(d, /^M100 300 C/)
  // Catmull-Rom: cada cúbica termina exatamente na parada seguinte (viewBox 1000 × 1500).
  assert.deepEqual(d.split(' C').slice(1).map((c) => c.split(' ').slice(-2).join(' ')), ['500 750', '900 1200'])
})

test('dados gerados: toda posição dentro da arte, toda imagem no disco, toda unidade do retrato no mundo', () => {
  const m = mundoEdicao()
  const pub = fileURLToPath(new URL('../public/', import.meta.url))
  const noDisco = (src) => existsSync(join(pub, src.replace(/^\//, '')))
  assert.ok(m.quadro.every((n) => Number.isInteger(n) && n > 0), 'quadro da arte (retrato na v1, paisagem girada na v2)')
  assert.ok(noDisco(m.base.src), m.base.src)
  for (const parte of m.base.srcSet.split(', ')) assert.ok(noDisco(parte.split(' ')[0]), parte)
  assert.ok(noDisco(m.sicrediBandeira))
  for (const n of m.bandeiras) assert.ok(noDisco(m.bandeira(n)), `bandeira ${n}`)
  assert.equal(m.bandeira(999), null)
  for (const s of m.docerias) assert.ok(noDisco(m.doceria(s)), s)
  for (const s of m.logos) assert.ok(noDisco(m.logo(s)), s)
  assert.equal(m.doceria('casa-que-nao-existe'), null)
  for (const [id, u] of Object.entries(m.unidades)) {
    assert.match(id, /^u[0-9a-f]{6}$/)
    assert.ok(u.x >= 0 && u.x <= 1 && u.y >= 0 && u.y <= 1, `${id} fora da arte`)
    assert.ok(Number.isInteger(u.numero) && u.numero >= 1, `${id} sem número`)
  }
  for (const p of [...m.marcos, ...m.sicredi]) assert.ok(p.nome && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1, p.nome)
  // O retrato é local (fora do git, repositório público): num clone limpo essa conferência não roda.
  const arquivo = new URL('../src/edicao/dados/retrato/cartoon.local.json', import.meta.url)
  if (!existsSync(arquivo)) return
  const retrato = JSON.parse(readFileSync(arquivo, 'utf8'))
  const ids = (retrato.participantes || retrato).flatMap((p) => (p.unidades || []).map((u) => u.id))
  assert.deepEqual(ids.filter((id) => !m.unidades[id]), [], 'unidade sem lugar no mundo: rodar scripts/edicao/mapa-mundo.py')
})
