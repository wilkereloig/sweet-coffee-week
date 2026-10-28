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
