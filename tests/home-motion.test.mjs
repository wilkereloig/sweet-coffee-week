import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

// Testes técnicos da CAMADA DE MOTION da Home (jul/2026). Verificam contratos de
// código (fonte), não aparência — a validação visual é do usuário. Espelham o
// padrão de tests/home-v2-check.mjs (node:test + asserts sobre a fonte).

const home = await readFile(new URL('../src/pages/institutional/Home.jsx', import.meta.url), 'utf8')

test('respeita prefers-reduced-motion (desliga transições e animações)', () => {
  assert.match(home, /@media \(prefers-reduced-motion: reduce\)/)
  // No bloco reduzido, transições E animações são zeradas.
  assert.match(home, /prefers-reduced-motion: reduce\)\s*\{[\s\S]*?transition: none !important;[\s\S]*?animation: none !important;/)
  // Valores finais forçados p/ o texto revelado (título, palavra colorida, ciclo).
  assert.match(home, /\.hmv2-hero__copy h1 em[\s\S]*?opacity: 1 !important; transform: none !important/)
  // clip-path da cidade some (foto visível) em reduced motion.
  assert.match(home, /\.hmv2-city__photos \{ -webkit-clip-path: none !important; clip-path: none !important; \}/)
})

test('estados de motion da Home existem (idle, reveal, ambiente)', () => {
  assert.match(home, /@keyframes hmv2HeroBreathe/)
  assert.match(home, /@keyframes hmv2RouteBreathe/)
  assert.match(home, /@keyframes hmv2CityBreathe/)
  assert.match(home, /@keyframes hmv2HeartBreathe/)
  assert.match(home, /@keyframes hmv2ScrollFloat/)
  // Idle roda só na foto ativa (1 loop por rotator, não em todas — perf §13).
  assert.match(home, /\.hmv2-hero__photos \.photo-rotator__img\.is-active \{ animation: hmv2HeroBreathe/)
  // Reveal por clip-path na cidade preservando a máscara do selo.
  assert.match(home, /\.hmv2-city__visual\.is-in \.hmv2-city__photos \{ -webkit-clip-path: inset\(0 0 0 0\)/)
})

test('sem transition: all e sem animar propriedades de layout', () => {
  assert.doesNotMatch(home, /transition:\s*all/)
  // Nenhuma transition mira width/height/margin/padding/top/left (causariam reflow).
  assert.doesNotMatch(home, /transition:[^;{]*\b(?:width|height|margin|padding|top|left)\b/)
  // Idle e reveals usam só transform/opacity/scale/translate/clip-path/box-shadow.
  assert.doesNotMatch(home, /@keyframes hmv2[^}]*\b(?:width|height|margin|padding|top|left)\s*:/)
})

test('classes de reveal e estados de hover continuam presentes', () => {
  assert.match(home, /motion-stagger/)
  assert.match(home, /motion-reveal-up/)
  // Hover/tilt só com ponteiro fino; press feedback vale no toque.
  assert.match(home, /@media \(hover: hover\) and \(pointer: fine\)/)
  assert.match(home, /\.hmv2-route:hover \{ --lift: -6px;/)
  assert.match(home, /\.hmv2-btn:active \{ scale: \.96; \}/)
  assert.match(home, /\.hmv2-route:active \{ scale: \.992; \}/)
  // Tilt reduzido p/ 3.5deg (era 5) — dentro da faixa 2–4deg pedida.
  assert.match(home, /'--ry', \(x \* 3\.5\)/)
  assert.match(home, /'--rx', \(-y \* 3\.5\)/)
})

test('rotas e textos editoriais preservados', () => {
  // Título da hero (agora com span p/ reveal, mas texto idêntico).
  assert.match(home, /<span className="hmv2-hero__t">O festival que faz Natal <\/span><em>sair para provar\.<\/em>/)
  // Rotas intactas.
  assert.match(home, /route: '\/participar'/)
  assert.match(home, /route: '\/edicoes'/)
  assert.match(home, /route: '\/apoiar'/)
  assert.match(home, /href="#\/edicoes" onClick=\{go\('\/edicoes'\)\}>Conhecer as edições/)
})

test('sem overflow horizontal introduzido pela camada de motion', () => {
  assert.match(home, /\.hmv2 \{ overflow-x: clip;/)
  // A camada de motion não introduz scroll horizontal.
  assert.doesNotMatch(home, /overflow-x:\s*(?:scroll|auto)/)
})

test('CountUp: uma vez, tabular-nums, rAF com limpeza e observer único', () => {
  assert.match(home, /function CountUp\(/)
  assert.match(home, /font-variant-numeric: tabular-nums/)
  assert.match(home, /requestAnimationFrame\(tick\)/)
  assert.match(home, /cancelAnimationFrame\(raf\)/)
  // Reduced motion mostra o valor final direto.
  assert.match(home, /if \(reduce\) \{ setVal\(to\); return \}/)
  // Um único IntersectionObserver dispara os 4 números (não um por número).
  const observerCount = (home.match(/new IntersectionObserver/g) || []).length
  assert.equal(observerCount, 1, 'Home deve ter só o observer dos números (reveal usa o hook)')
  assert.match(home, /setFactsIn\(true\); io\.disconnect\(\)/)
})

test('listeners de ponteiro/scroll são removidos no unmount (sem duplicar)', () => {
  // Camada de cursor: cada wire devolve cleanup e o efeito remove todos.
  assert.match(home, /return \(\) => cleanups\.forEach\(\(fn\) => fn\(\)\)/)
  assert.match(home, /el\.removeEventListener\('pointermove', move\); el\.removeEventListener\('pointerleave', onLeave\)/)
  // Camada de scroll: remove listeners e cancela rAF pendente.
  assert.match(home, /window\.removeEventListener\('scroll', onScroll\)/)
  assert.match(home, /if \(id\) cancelAnimationFrame\(id\)/)
})
