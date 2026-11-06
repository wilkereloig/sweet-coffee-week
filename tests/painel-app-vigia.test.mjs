import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { telaMorta, descrever, gravarRegistro, lerRegistro, limparRegistro } from '../painel-app/src/lib/vigia.js'

const falso = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v }, removeItem: (k) => { delete m[k] } } }

test('tela morta: 3 toques sem clique no mesmo ponto em 8 s; espalhados ou antigos não contam', () => {
  const t = (ms, x, y) => ({ t: ms, x, y })
  assert.equal(telaMorta([t(0, 100, 100), t(2000, 105, 98), t(4000, 102, 101)], 4500), true)
  assert.equal(telaMorta([t(0, 100, 100), t(2000, 105, 98)], 4500), false, 'dois só')
  assert.equal(telaMorta([t(0, 100, 100), t(2000, 300, 400), t(4000, 100, 101)], 4500), false, 'pontos diferentes = rolagem')
  assert.equal(telaMorta([t(0, 100, 100), t(2000, 100, 100), t(9000, 100, 100)], 9500), false, 'o primeiro saiu da janela')
})

test('registro: guarda no máximo 30, lê de volta, limpa e sobrevive a armazenamento quebrado', () => {
  const a = falso()
  for (let i = 0; i < 35; i++) gravarRegistro({ i }, a)
  const l = lerRegistro(a)
  assert.equal(l.length, 30)
  assert.equal(l[0].i, 5)
  limparRegistro(a)
  assert.deepEqual(lerRegistro(a), [])
  const quebrado = { getItem() { throw new Error('x') }, setItem() { throw new Error('x') }, removeItem() { throw new Error('x') } }
  assert.deepEqual(lerRegistro(quebrado), [])
  assert.doesNotThrow(() => gravarRegistro({ a: 1 }, quebrado))
  assert.deepEqual(lerRegistro(null), [])
})

test('descrever: só tag, id e duas classes, nunca conteúdo', () => {
  assert.equal(descrever({ tagName: 'DIV', id: 'x', className: 'a b c' }), 'div#x.a.b')
  assert.equal(descrever({ tagName: 'BUTTON', id: '', className: '' }), 'button')
  assert.equal(descrever(null), '—')
})

test('o vigia só observa: não fecha dialog nem remove nada da tela, e o aviso vai dentro do dialog aberto', () => {
  const src = readFileSync(new URL('../painel-app/src/lib/vigia.js', import.meta.url), 'utf8')
  assert.doesNotMatch(src, /\.close\(|\.remove\(|removeChild|fetch\(|sendBeacon/, 'nada fecha, apaga ou envia')
  assert.match(src, /dialog\[open\]'\)\]\.pop\(\)/, 'aviso dentro do dialog modal')
  assert.match(readFileSync(new URL('../painel-app/src/main.jsx', import.meta.url), 'utf8'), /ligarVigia\(\)/)
})
