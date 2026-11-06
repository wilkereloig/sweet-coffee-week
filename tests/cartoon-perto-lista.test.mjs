import { test } from 'node:test'
import assert from 'node:assert/strict'
import { casasMaisPerto, distanciaCurta, QUANTAS_PERTO } from '../src/edicao/caca/mapa/casasPerto.js'

const casa = (slug, unidades = 1) => ({ slug, casa: { nome: slug.toUpperCase() }, unidades: Array.from({ length: unidades }, (_, i) => ({ id: `${slug}-${i}`, nome: `Unid ${i}`, endereco: { bairro: 'Tirol' } })) })
const linha = (p, i, dist, conferir) => ({ p, u: { ...p.unidades[i], coordenada: dist == null ? null : { lat: -5.8, lng: -35.2, conferir } }, dist })

test('cinco casas, da mais perto para a mais longe, sem raio de corte', () => {
  const ps = 'abcdefgh'.split('').map((s) => casa(s))
  const r = casasMaisPerto(ps.map((p, i) => linha(p, 0, [9, 3, 7, 1, 20, 5, 70, 2][i])))
  assert.equal(QUANTAS_PERTO, 5)
  assert.deepEqual(r.itens.map((x) => x.p.slug), ['d', 'h', 'b', 'f', 'c'])
  assert.deepEqual(r.itens.map((x) => x.rank), [1, 2, 3, 4, 5])
})

test('casa com várias unidades entra uma vez, pela mais perto, e a unidade é identificada', () => {
  const m = casa('m', 3)
  const r = casasMaisPerto([linha(m, 0, 4), linha(m, 1, 1.2), linha(m, 2, 9), linha(casa('x'), 0, 2)])
  assert.equal(r.itens.length, 2)
  assert.equal(r.itens[0].u.id, 'm-1'); assert.equal(r.itens[0].unidade, 'Unid 1')
  assert.equal(r.itens[1].unidade, '') // casa de um endereço só: não precisa dizer a unidade
})

test('menos de cinco: só as disponíveis; sem coordenada não entra nem ganha distância', () => {
  const sem = casa('s'); const ok = casa('o')
  const r = casasMaisPerto([linha(sem, 0, null), linha(ok, 0, 0.4, true)])
  assert.equal(r.itens.length, 1); assert.equal(r.semCoordenada, 1); assert.equal(r.itens[0].aproximada, true)
  assert.deepEqual(casasMaisPerto([]).itens, [])
})

test('longe: a mais perto passa de 60 km (a lista continua trazendo as mais perto)', () => {
  const r = casasMaisPerto([linha(casa('a'), 0, 80), linha(casa('b'), 0, 95)])
  assert.equal(r.longe, true); assert.equal(r.itens.length, 2)
})

test('distância legível em metros ou quilômetros', () => {
  assert.equal(distanciaCurta(0.03), '50 m'); assert.equal(distanciaCurta(0.84), '850 m')
  assert.equal(distanciaCurta(1.24), '1,2 km'); assert.equal(distanciaCurta(NaN), '')
})
