// Câmera do Mundo da Doçura: a arte cobre a janela, nunca deixa faixa vazia e o zoom/pinça/redimensionar mantêm o ponto certo.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ZOOM_MAX, ZOOM_MIN, centrarEm, escalaDeCobrir, inicial, limitar, panar, pinca, pontoNoCentro, redimensionar, tamanhoDoPalco, zoomarEm } from '../src/edicao/cartoon/paginas/mapa/camera.js'

const arte = { w: 5882, h: 4146 }
const JANELAS = { 'celular em pé': { w: 390, h: 520 }, 'celular deitado': { w: 780, h: 330 }, desktop: { w: 1280, h: 700 }, 'janela quase quadrada': { w: 900, h: 880 }, 'faixa larga': { w: 1800, h: 300 } }
const quase = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`)

function semFaixa (c, j) {
  const p = tamanhoDoPalco(c, j, arte)
  assert.ok(c.x <= 1e-9 && c.y <= 1e-9, `canto fora: ${c.x},${c.y}`)
  assert.ok(c.x + p.w >= j.w - 1e-6, `faixa à direita: ${c.x + p.w} < ${j.w}`)
  assert.ok(c.y + p.h >= j.h - 1e-6, `faixa embaixo: ${c.y + p.h} < ${j.h}`)
}

test('zoom mínimo cobre a janela inteira, sem esticar, em qualquer proporção', () => {
  for (const [nome, j] of Object.entries(JANELAS)) {
    const c = inicial(j, arte)
    assert.equal(c.z, ZOOM_MIN, nome)
    semFaixa(c, j)
    const p = tamanhoDoPalco(c, j, arte)
    quase(p.w / p.h, arte.w / arte.h) // proporção da arte preservada
    assert.ok(Math.abs(p.w - j.w) < 1e-6 || Math.abs(p.h - j.h) < 1e-6, `${nome}: um dos eixos encosta exatamente`)
  }
})

test('celular em pé mostra um trecho ampliado: a arte é mais larga que a tela e se explora de lado', () => {
  const j = JANELAS['celular em pé']
  const p = tamanhoDoPalco(inicial(j, arte), j, arte)
  assert.equal(p.h, j.h)
  assert.ok(p.w > j.w * 1.3, 'sobra largura para explorar')
})

test('arrastar chega a todas as bordas e nunca passa delas', () => {
  for (const [nome, j] of Object.entries(JANELAS)) {
    for (const z of [1, 1.7, ZOOM_MAX]) {
      let c = zoomarEm(inicial(j, arte), z, j.w / 2, j.h / 2, j, arte)
      c = panar(c, 1e6, 1e6, j, arte); semFaixa(c, j); quase(c.x, 0); quase(c.y, 0) // canto superior esquerdo da arte
      c = panar(c, -1e6, -1e6, j, arte); semFaixa(c, j)
      const p = tamanhoDoPalco(c, j, arte)
      quase(c.x + p.w, j.w); quase(c.y + p.h, j.h) // canto inferior direito da arte
      assert.ok(true, nome)
    }
  }
})

test('zoom respeita mínimo e máximo', () => {
  const j = JANELAS.desktop
  const c0 = inicial(j, arte)
  assert.equal(zoomarEm(c0, 0.2, 100, 100, j, arte).z, ZOOM_MIN)
  assert.equal(zoomarEm(c0, 99, 100, 100, j, arte).z, ZOOM_MAX)
  assert.equal(limitar({ z: 50, x: 0, y: 0 }, j, arte).z, ZOOM_MAX)
})

test('zoom no ponto mantém o mesmo pedaço da arte debaixo do ponto', () => {
  const j = JANELAS.desktop
  const base = panar(zoomarEm(inicial(j, arte), 1.5, 400, 300, j, arte), -120, -40, j, arte)
  const [fx, fy] = [600, 350]
  const sob = (c) => { const p = tamanhoDoPalco(c, j, arte); return [(fx - c.x) / p.w, (fy - c.y) / p.h] }
  const [u0, v0] = sob(base)
  const mais = zoomarEm(base, 2.2, fx, fy, j, arte)
  const [u1, v1] = sob(mais)
  quase(u0, u1, 1e-9); quase(v0, v1, 1e-9)
})

test('pinça: aproximar os dedos afasta, abrir aproxima, e o ponto médio acompanha', () => {
  const j = JANELAS['celular em pé']
  const c0 = inicial(j, arte)
  const p0 = { d: 100, x: 200, y: 260 }
  const aberta = pinca(c0, p0, { d: 200, x: 200, y: 260 }, j, arte)
  quase(aberta.z, 2)
  const fechada = pinca(aberta, { d: 200, x: 200, y: 260 }, { d: 20, x: 200, y: 260 }, j, arte)
  assert.equal(fechada.z, ZOOM_MIN)
  semFaixa(fechada, j)
  // arrastar o ponto médio com a pinça também move a câmera
  const movida = pinca(aberta, { d: 100, x: 200, y: 260 }, { d: 100, x: 150, y: 260 }, j, arte)
  assert.ok(movida.x < aberta.x)
  semFaixa(movida, j)
})

test('redimensionar (rotação, tela cheia) mantém o ponto do centro e continua cobrindo', () => {
  const entrada = JANELAS['celular em pé']
  const saida = JANELAS['celular deitado']
  let c = zoomarEm(inicial(entrada, arte), 1.8, 100, 200, entrada, arte)
  c = panar(c, -150, -90, entrada, arte)
  const antes = pontoNoCentro(c, entrada, arte)
  const depois = redimensionar(c, entrada, saida, arte)
  semFaixa(depois, saida)
  const dep = pontoNoCentro(depois, saida, arte)
  // O centro só muda se o limite da nova janela o impedir; aqui é folgado.
  quase(antes.u, dep.u, 0.02); quase(antes.v, dep.v, 0.06)
  assert.equal(depois.z, c.z)
  // ida e volta sem salto grande
  const volta = redimensionar(depois, saida, entrada, arte)
  semFaixa(volta, entrada)
})

test('centrarEm leva o ponto da arte ao centro quando os limites deixam', () => {
  const j = JANELAS.desktop
  const c = zoomarEm(inicial(j, arte), 2.5, 0, 0, j, arte)
  const m = centrarEm(c, 0.5, 0.5, j, arte)
  const { u, v } = pontoNoCentro(m, j, arte)
  quase(u, 0.5, 1e-9); quase(v, 0.5, 1e-9)
  // perto da borda, o limite segura: o ponto fica o mais perto possível, sem faixa
  const canto = centrarEm(c, 0.01, 0.01, j, arte)
  semFaixa(canto, j)
})

test('escala de cobrir é a maior das duas (nunca a menor, que deixaria faixa)', () => {
  assert.equal(escalaDeCobrir({ w: 390, h: 520 }, arte), 520 / arte.h)
  assert.equal(escalaDeCobrir({ w: 1800, h: 300 }, arte), 1800 / arte.w)
})
