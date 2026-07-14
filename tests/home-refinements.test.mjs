import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

// Refinamentos da Home (jul/2026): CTA de Edições no lugar de Curiosidades, ponte
// pro Sweet Awards, feed de imprensa compacto, hierarquia dos números e faixa de
// prova humana (Jolie/Carol Barreto). Contratos de CÓDIGO (fonte), não aparência —
// validação visual é do usuário. Padrão de tests/home-motion.test.mjs.

const home = await readFile(new URL('../src/pages/institutional/Home.jsx', import.meta.url), 'utf8')

test('Home não aponta mais para a página aposentada Curiosidades', () => {
  assert.doesNotMatch(home, /#\/curiosidades/)
  assert.doesNotMatch(home, /go\(['"]\/curiosidades['"]\)/)
  assert.doesNotMatch(home, /Ver curiosidades/)
})

test('CTA da imprensa leva às Edições', () => {
  assert.match(home, /href="#\/edicoes" onClick=\{go\('\/edicoes'\)\}>Ver as edições do festival/)
})

test('há uma ponte discreta para o Sweet Awards', () => {
  assert.match(home, /href="#\/sweet-awards" onClick=\{go\('\/sweet-awards'\)\}>Conhecer o Sweet Awards/)
})

test('feed de imprensa inicia compacto (4 matérias) e a matéria principal fica em destaque', () => {
  // Destaque = PRESS[0]; feed inicial = 4 linhas (slice de 1 até 5).
  assert.match(home, /PRESS\.slice\(1, showAllPress \? undefined : 5\)/)
  assert.match(home, /PRESS\[0\]\.href/)
})

test('botão de matérias mantém acessibilidade (aria-expanded/controls) e alternância', () => {
  assert.match(home, /aria-controls="press-feed"/)
  assert.match(home, /aria-expanded=\{showAllPress\}/)
  assert.match(home, /Mostrar menos matérias/)
  assert.match(home, /Mostrar mais matérias/)
})

test('faixa dos números: ledger editorial, 4 fatos com peso igual (IG não é mais "minor")', () => {
  // Reformulado (approach A, 2026-07-13): grid 2×2 de KPI -> ledger de linhas;
  // Instagram deixa de ser apoio apagado (magnitude nao batia com a enfase).
  assert.doesNotMatch(home, /hmv2-proof__minor/)
  assert.match(home, /\.hmv2-proof__facts \{ display: flex; flex-direction: column/)
  // Os 4 rotulos seguem presentes; IG usa dado real (nao inventar dado — §16).
  assert.match(home, /edições realizadas/)
  assert.match(home, /marcas participantes/)
  assert.match(home, /combos vendidos/)
  assert.match(home, /visualizações no Instagram/)
  assert.match(home, /festivalFacts\.igViews\.value/)
})

test('faixa de prova humana com depoimento real da Jolie (não inventar/não editar)', () => {
  assert.match(home, /divisor de águas/)
  assert.match(home, /person: 'Carol Barreto'/)
  assert.match(home, /brand: 'Jolie'/)
  assert.match(home, /logo: '\/logos\/participants\/jolie-cafe-patisserie\.png'/)
  assert.match(home, /hmv2-voice/)
  assert.match(home, /href="#\/participar" onClick=\{go\('\/participar'\)\}/)
})

test('faixa Jolie: coxinha real + bloco redondo da marca (sem retrato inventado)', () => {
  // Coxinha = foto real do acervo (main.jpg), alt adequado.
  assert.match(home, /combo: '\/images\/combos\/jolie-cafe-patisserie\/main\.jpg'/)
  assert.match(home, /className="hmv2-voice__combo"[\s\S]*?alt="Coxinha autoral da Jolie"/)
  // Bloco REDONDO da Jolie. Sem retrato autorizado no acervo → portrait null e o
  // círculo cai no logo real (não inventar pessoa). Trocar portrait = vira foto.
  assert.match(home, /portrait: null/)
  assert.match(home, /hmv2-voice__portrait/)
  assert.match(home, /border-radius: 50%/)
  assert.match(home, /src=\{VOICE\.portrait \|\| VOICE\.logo\}/)
  // Estática: nada de PhotoRotator/autoplay na faixa de prova humana.
  assert.doesNotMatch(home, /hmv2-voice[\s\S]*?PhotoRotator/)
})
