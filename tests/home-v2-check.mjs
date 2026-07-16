import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/pages/institutional/Home.jsx', import.meta.url), 'utf8')

test('Home revela a cobertura completa sem rolagem interna', () => {
  assert.match(source, /const \[showAllPress, setShowAllPress\] = React\.useState\(false\)/)
  assert.match(source, /PRESS\.slice\(1, showAllPress \? undefined : 5\)/)
  assert.match(source, /Mostrar mais matérias/)
  assert.doesNotMatch(source, /\.hmv2-press__feed \{[^}]*overflow-y:/)
})

test('Home direciona a memória cronológica para Edições', () => {
  assert.match(source, /href="#\/edicoes" onClick=\{go\('\/edicoes'\)\}>Conhecer as edições/)
})

test('Home reduz repetições nos caminhos de entrada', () => {
  assert.match(source, /title: 'Leve sua marca para o festival\.'/)
  assert.match(source, /O festival é uma <em className="hmv2-hl">experiência<\/em> com vários pontos de entrada\./)
  assert.match(source, /Escolha como quer fazer parte\./)
})
