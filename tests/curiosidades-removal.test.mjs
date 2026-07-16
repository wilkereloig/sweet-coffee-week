import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8')

test('Curiosidades is retired without changing the Home page', () => {
  const app = read('src/App.jsx')
  const nav = read('src/components/nav.jsx')
  const home = read('src/pages/institutional/Home.jsx')

  assert.doesNotMatch(app, /CuriosidadesPage|route-curiosidades|case ['"]curiosidades['"]|FOOTER_ROUTES[^\n]*curiosidades/)
  assert.doesNotMatch(nav, /id:\s*['"]curiosidades['"]|href:\s*['"]#\/curiosidades['"]|label:\s*['"]Curiosidades['"]/) 
  assert.match(app, /RETIRED_PUBLIC_PATHS\s*=\s*\[['"]\/curiosidades['"]\]/)
  assert.match(app, /RETIRED_PUBLIC_PATHS[\s\S]*navigate\(['"]\/edicoes['"]\)/)
  assert.match(app, /path\.startsWith\(['"]\/curiosidades['"]\)\) return ['"]edicoes['"]/) 
  assert.ok(existsSync(new URL('src/pages/institutional/Curiosidades.jsx', root)) === false)
  assert.ok(existsSync(new URL('src/styles/curiosidades.css', root)) === false)
  // O trabalho paralelo da Home foi concluído: o CTA de Curiosidades virou Edições
  // (ver tests/home-refinements.test.mjs). A Home não referencia mais a rota aposentada.
  assert.ok(!home.includes('#/curiosidades'), 'Home no longer points to the retired Curiosidades route')
})

test('existing institutional CTAs no longer point to the retired page', () => {
  const awards = read('src/pages/institutional/HistoricoAwards.jsx')
  const editions = read('src/pages/institutional/Edicoes.jsx')
  const meta = read('src/lib/pageMeta.js')

  assert.doesNotMatch(awards, /href=['"]#\/curiosidades['"]|go\(['"]\/curiosidades['"]\)/)
  assert.doesNotMatch(editions, /href=['"]\/curiosidades['"]|go\(['"]\/curiosidades['"]\)/)
  assert.match(meta, /p\.startsWith\(['"]\/curiosidades['"]\)[\s\S]*Edições \|/)
})
