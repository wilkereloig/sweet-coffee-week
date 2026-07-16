import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/pages/institutional/Participar.jsx', import.meta.url), 'utf8')

test('pre-cadastro receives the wider desktop column', () => {
  assert.match(source, /\.participar-hero__grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*\.88fr\)\s+minmax\(360px,\s*1\.12fr\)/s)
  assert.match(source, /\.pcp-tool\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;/s)
})

test('destaque longo da hero pode quebrar linha sem invadir o pré-cadastro', () => {
  assert.match(source, /\.participar-hero__copy\s+\.pcp-hl\s*\{\s*white-space:\s*normal;/s)
})
