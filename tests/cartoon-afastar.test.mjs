// Afastar pins que se cobrem (src/edicao/componentes/mapa/afastar.js): ninguém cobre ninguém, nenhum corpo cobre o ponto
// verdadeiro de outro, o desenho é estável (não depende da ordem da lista) e grupo grande vira selo, sem esconder ninguém para sempre.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { afastarPins, projetar, LIMITE_GRUPO } from '../src/edicao/componentes/mapa/afastar.js'

const PIN = { w: 60, h: 72 }
const pin = (id, x, y, extra = {}) => ({ id, x, y, ...PIN, ...extra })
const corpo = (i, d = { dx: 0, dy: 0 }) => {
  const e = i.x + d.dx - (i.ax ?? 0.5) * i.w
  return { e, d: e + i.w, t: i.y + d.dy - i.h, b: i.y + d.dy }
}
const sobrepoe = (a, b) => a.e < b.d && b.e < a.d && a.t < b.b && b.t < a.b

function conferir (itens, r) {
  const cx = (i) => corpo(i, r.desloc.get(i.id))
  const visiveis = itens.filter((i) => !r.grupos.some((g) => g.ids.includes(i.id)))
  for (const a of visiveis) {
    for (const b of visiveis) {
      if (a.id >= b.id) continue
      assert.equal(sobrepoe(cx(a), cx(b)), false, `${a.id} cobre ${b.id}`)
    }
  }
  for (const a of visiveis) { // o ponto verdadeiro de cada pin afastado fica à vista (o fio termina nele)
    if (!r.desloc.has(a.id)) continue
    for (const b of visiveis) {
      if (a.id === b.id) continue
      const c = cx(b)
      assert.ok(!(a.x > c.e && a.x < c.d && a.y > c.t && a.y < c.b), `${b.id} esconde o ponto de ${a.id}`)
    }
  }
}

test('pins longe um do outro não se mexem', () => {
  const r = afastarPins([pin('a', 100, 200), pin('b', 400, 200), pin('c', 100, 600)])
  assert.equal(r.desloc.size, 0)
  assert.deepEqual(r.grupos, [])
})

test('dois pins no mesmo ponto vão para os lados, lado a lado', () => {
  const itens = [pin('a', 300, 300), pin('b', 300, 300)]
  const r = afastarPins(itens)
  assert.equal(r.desloc.size, 2)
  conferir(itens, r)
  const [da, db] = [r.desloc.get('a'), r.desloc.get('b')]
  assert.equal(da.dy, 0)
  assert.equal(db.dy, 0)
  assert.equal(da.dx, -db.dx)
})

test('de 3 a 6 pins no mesmo ponto: nenhum cobre outro nem o ponto do outro', () => {
  for (let k = 3; k <= LIMITE_GRUPO; k++) {
    const itens = Array.from({ length: k }, (_, i) => pin(`p${i}`, 500, 400))
    const r = afastarPins(itens)
    assert.equal(r.desloc.size, k, `k=${k}`)
    assert.deepEqual(r.grupos, [])
    conferir(itens, r)
  }
})

test('pins vizinhos que se tocam (não no mesmo ponto) também se separam', () => {
  const itens = [pin('a', 300, 300), pin('b', 320, 310), pin('c', 340, 290), pin('sicredi', 330, 330, { w: 84, h: 60 })]
  const r = afastarPins(itens)
  conferir(itens, r)
  assert.ok(r.desloc.size >= 3)
})

test('âncora fora do centro (Sicredi na borda do desenho) respeita a caixa de verdade', () => {
  const itens = [pin('casa', 960, 300), pin('s', 965, 300, { w: 90, h: 50, ax: 0.85 })]
  conferir(itens, afastarPins(itens))
})

test('estável: a ordem da lista não muda o desenho, e repetir dá o mesmo resultado', () => {
  const itens = [pin('c', 300, 300), pin('a', 305, 302), pin('b', 298, 296), pin('d', 310, 300)]
  const um = afastarPins(itens)
  const dois = afastarPins([...itens].reverse())
  const tres = afastarPins(itens)
  const plano = (r) => JSON.stringify([...r.desloc].sort((x, y) => (x[0] < y[0] ? -1 : 1)))
  assert.equal(plano(um), plano(dois))
  assert.equal(plano(um), plano(tres))
})

test('o pin vai para o lado do seu ponto: o fio não cruza o do vizinho', () => {
  const itens = [pin('esq', 280, 300), pin('dir', 330, 300)]
  const r = afastarPins(itens)
  assert.ok(r.desloc.get('esq').dx < r.desloc.get('dir').dx, 'o da esquerda continua à esquerda')
})

test('grupo grande demais (zoom longe) vira selo e ninguém é afastado; sem limite, todo mundo é', () => {
  const itens = Array.from({ length: 9 }, (_, i) => pin(`p${i}`, 500 + (i % 3), 400 + Math.floor(i / 3)))
  const longe = afastarPins(itens)
  assert.equal(longe.desloc.size, 0)
  assert.equal(longe.grupos.length, 1)
  assert.equal(longe.grupos[0].ids.length, 9)
  const perto = afastarPins(itens, { limite: Infinity })
  assert.equal(perto.desloc.size, 9)
  assert.deepEqual(perto.grupos, [])
  conferir(itens, perto)
})

test('afastar pode esbarrar num pin de fora: os grupos se juntam e ninguém fica por cima', () => {
  const itens = [pin('a', 300, 300), pin('b', 300, 300), pin('c', 300 + 74, 300)]
  const r = afastarPins(itens)
  conferir(itens, r)
})

test('coordenadas inválidas são ignoradas, sem derrubar o cálculo', () => {
  const r = afastarPins([pin('a', NaN, 3), pin('b', 100, 100)])
  assert.equal(r.desloc.size, 0)
})

test('projeção Web Mercator: um grau de longitude cresce com o zoom e o MapLibre (512) é o dobro do Google (256)', () => {
  const a = projetar(-5.81, -35.21, 12); const b = projetar(-5.81, -35.20, 12)
  const c = projetar(-5.81, -35.21, 13); const d = projetar(-5.81, -35.20, 13)
  assert.ok(Math.abs((d.x - c.x) / (b.x - a.x) - 2) < 1e-9)
  const m = projetar(-5.81, -35.20, 12, 512); const n = projetar(-5.81, -35.21, 12, 512)
  assert.ok(Math.abs((m.x - n.x) / (b.x - a.x) - 2) < 1e-9)
  assert.ok(b.x > a.x && projetar(-5.80, -35.2, 12).y < projetar(-5.82, -35.2, 12).y, 'norte fica em cima (y menor)')
})
