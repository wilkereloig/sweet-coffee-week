// Entrada do app instalado da Caça (~1 s): quando aparece, quando não. Lógica pura de src/edicao/caca/pwa/entrada.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { ENTRADA, emAppInstalado, deveMostrarEntrada } from '../src/edicao/caca/pwa/entrada.js'

const janela = ({ standalone = false, ios = false, reduzido = false, storage = {} , quebrado = false } = {}) => ({
  matchMedia: (q) => ({ matches: q.includes('standalone') ? standalone : q.includes('reduce') ? reduzido : false }),
  navigator: { standalone: ios },
  sessionStorage: quebrado
    ? { getItem () { throw new Error('x') }, setItem () { throw new Error('x') } }
    : { getItem: (k) => storage[k] ?? null, setItem: (k, v) => { storage[k] = v } },
})

test('dura cerca de 1 s e usa o selo oficial da edição que existe no disco', () => {
  assert.equal(ENTRADA.duracaoMs, 1000)
  assert.ok(fs.existsSync(new URL('../public' + ENTRADA.logo, import.meta.url)))
})
test('só no app instalado (Android/desktop e iPhone); navegador comum não vê', () => {
  assert.equal(emAppInstalado(janela({ standalone: true })), true)
  assert.equal(emAppInstalado(janela({ ios: true })), true)
  assert.equal(deveMostrarEntrada(janela()), false)
})
test('uma vez por abertura do app, e nunca com movimento reduzido', () => {
  const s = {}
  assert.equal(deveMostrarEntrada(janela({ standalone: true, storage: s })), true)
  assert.equal(deveMostrarEntrada(janela({ standalone: true, storage: s })), false, 'navegar entre páginas não repete')
  assert.equal(deveMostrarEntrada(janela({ standalone: true, reduzido: true })), false)
})
test('storage quebrado não derruba o app; sem janela não faz nada', () => {
  assert.equal(deveMostrarEntrada(janela({ standalone: true, quebrado: true })), true)
  assert.equal(deveMostrarEntrada(undefined), false)
})
test('a entrada não bloqueia toque nem some com tela branca', () => {
  const css = fs.readFileSync(new URL('../src/styles/cartoon/17-caca-entrada.css', import.meta.url), 'utf8')
  assert.match(css, /pointer-events:\s*none/); assert.match(css, /#FDF0DE/); assert.match(css, /prefers-reduced-motion:\s*reduce/)
})
