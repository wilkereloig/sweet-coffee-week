// Sistema visual da camada Cartoon (docs/cartoon-2026-2/10-sistema-visual-e-paginas.md, etapa 1).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const raiz = path.resolve(import.meta.dirname, '..')
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8')
const existe = (p) => fs.existsSync(path.join(raiz, p))
const cssDe = (dir) => fs.readdirSync(path.join(raiz, dir), { withFileTypes: true }).flatMap((e) => {
  const rel = path.join(dir, e.name)
  return e.isDirectory() ? cssDe(rel) : e.name.endsWith('.css') ? [rel] : []
})

test('Grandstander servida pelo projeto e declarada só na camada da edição', () => {
  assert.ok(existe('public/fonts/grandstander/grandstander-latin.woff2'), 'falta o woff2')
  assert.ok(existe('public/fonts/grandstander/OFL.txt'), 'falta a licença OFL')
  assert.match(ler('src/styles/scw-cartoon.css'), /@font-face\s*{[^}]*font-family:\s*'Grandstander'[^}]*font-weight:\s*100 900/)
  for (const f of cssDe('src').filter((f) => !f.endsWith('scw-cartoon.css'))) {
    assert.doesNotMatch(ler(f), /@font-face[^}]*Grandstander/, `${f} declara a fonte da edição`)
  }
})

const CSS = 'src/styles/scw-cartoon.css'
const tokens = () => Object.fromEntries([...ler(CSS).matchAll(/--ct-([a-z]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)].map(([, n, h]) => [n, h.toUpperCase()]))
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

test('paleta do manual v03, e nada da paleta antiga', () => {
  assert.deepEqual(tokens(), {
    creme: '#FDF0DE', amarelo: '#FDB901', chocolate: '#3A150F', preto: '#050505', vermelho: '#ED1C20',
    rosa: '#E8195A', branco: '#FCFCFC', azul: '#0184E4', turquesa: '#05BEBA', roxo: '#6424AB',
  })
  const css = ler(CSS)
  for (const velho of [/#FAC506/i, /#FDF2DF/i, /amarelo-heroi/, /var\(--scw-font/, /rgba\(\s*5\s*,\s*5\s*,\s*5\s*,/]) {
    assert.doesNotMatch(css, velho, `ainda usa ${velho}`)
  }
  assert.match(css, /--ct-font:\s*'Grandstander'/)
})

test('contraste medido a partir dos tokens', () => {
  const t = tokens()
  const LEITURA = [['chocolate', 'creme'], ['chocolate', 'amarelo'], ['chocolate', 'turquesa'], ['chocolate', 'branco'],
    ['creme', 'chocolate'], ['creme', 'roxo'], ['preto', 'azul']]
  const SO_GRANDE = [['creme', 'vermelho'], ['creme', 'rosa'], ['creme', 'azul']]
  const PROIBIDO = [['chocolate', 'roxo'], ['chocolate', 'azul']]
  for (const [tinta, fundo] of LEITURA) assert.ok(contraste(t[tinta], t[fundo]) >= 4.5, `${tinta} sobre ${fundo} < 4,5`)
  for (const [tinta, fundo] of SO_GRANDE) {
    const c = contraste(t[tinta], t[fundo])
    assert.ok(c >= 3 && c < 4.5, `${tinta} sobre ${fundo} = ${c.toFixed(2)}: a regra "só texto grande" mudou`)
  }
  for (const [tinta, fundo] of PROIBIDO) assert.ok(contraste(t[tinta], t[fundo]) < 4.5, `${tinta} sobre ${fundo} passou a ser legível: rever a regra`)
})

test('preto só no traço de desenho; texto e contorno de interface em chocolate', () => {
  const css = ler(CSS)
  const usos = css.split('\n').filter((l) => l.includes('var(--ct-preto)')).map((l) => l.trim())
  assert.deepEqual(usos, ['--ct-traco-desenho: 2.5px solid var(--ct-preto);'])
  assert.match(css, /--ct-traco:\s*2\.5px solid var\(--ct-chocolate\)/)
})

test('contador da Minha rota com contraste de texto pequeno', () => {
  const t = tokens()
  const regra = ler(CSS).match(/\.ct-contador\s*{([^}]*)}/)[1]
  const fundo = regra.match(/background:\s*var\(--ct-([a-z]+)\)/)[1]
  const tinta = regra.match(/(?:^|[\s;])color:\s*var\(--ct-([a-z]+)\)/)[1]
  assert.ok(contraste(t[tinta], t[fundo]) >= 4.5, `${tinta} sobre ${fundo} < 4,5 em texto de 13px`)
})
