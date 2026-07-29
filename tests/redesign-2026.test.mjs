import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/*
 * Guarda do redesign 2026 do site institucional.
 * Substitui os testes que travavam o sistema anterior (home-v2-check,
 * home-motion, participar-form-width, participar-curadoria-icons) — aqueles
 * afirmavam classes e strings que a nova direção removeu.
 *
 * Aqui só entram contratos que valem a pena quebrar o build: paleta fechada,
 * cor da página por rota, movimento reduzido e as flags de publicação.
 * Aparência é conferência do usuário, não de teste.
 */

const ler = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')

const SISTEMA = 'src/styles/scw-2026.css'

const PAGINAS = [
  ['src/pages/institutional/Home.jsx', 'src/styles/scw-home.css'],
  ['src/pages/institutional/Edicoes.jsx', 'src/styles/scw-edicoes.css'],
  ['src/pages/institutional/HistoricoAwards.jsx', 'src/styles/scw-awards.css'],
  ['src/pages/institutional/Participar.jsx', 'src/styles/scw-participar-apoiar.css'],
  ['src/pages/institutional/Apoiar.jsx', 'src/styles/scw-participar-apoiar.css'],
  ['src/pages/institutional/Contato.jsx', 'src/styles/scw-contato.css'],
]

const CASCA = [
  'src/components/nav.jsx',
  'src/components/SiteFooter.jsx',
  'src/components/MobileTabBar.jsx',
  'src/components/MobileMenu.jsx',
  'src/components/AccessDialog.jsx',
]

/** Paleta fechada do handoff + neutros que o CSS usa em rgba/sombra. */
const PALETA = new Set([
  '#FEF0DD', '#F8E4C1', '#FFF7E9', '#EBD6B4', '#3D1308', '#6A2C15',
  '#FDBB1A', '#01AFCC', '#4D257E', '#F10767', '#D0055B', '#B3213B',
  '#D19100', '#D9BE95', '#C99A7E',
  '#FFF', '#FFFFFF', '#000', '#000000',
])

/** Hex fora de comentário. Comentar "#E52C4B não existe aqui" é permitido. */
function hexEmCodigo(fonte) {
  const semComentario = fonte
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
  return [...semComentario.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)].map((m) => m[0].toUpperCase())
}

const ARQUIVOS = [SISTEMA, ...new Set(PAGINAS.flat()), ...CASCA]

test('nenhuma cor fora da paleta do handoff', () => {
  for (const arquivo of ARQUIVOS) {
    for (const hex of hexEmCodigo(ler(arquivo))) {
      assert.ok(PALETA.has(hex), `cor fora da paleta em ${arquivo}: ${hex}`)
    }
  }
})

test('#E52C4B foi removida — nunca como valor', () => {
  for (const arquivo of ARQUIVOS) {
    assert.ok(!hexEmCodigo(ler(arquivo)).includes('#E52C4B'), `#E52C4B voltou em ${arquivo}`)
  }
})

test('cada página do redesign importa o próprio CSS', () => {
  for (const [pagina, css] of PAGINAS) {
    const base = css.split('/').pop()
    assert.match(ler(pagina), new RegExp(base.replace('.', '\\.')), `${pagina} não importa ${base}`)
  }
})

test('as 6 rotas definem a cor da página', () => {
  const sistema = ler(SISTEMA)
  for (const rota of ['home', 'edicoes', 'historico-awards', 'participar', 'apoiar', 'contato']) {
    assert.match(sistema, new RegExp(`body\\.route-${rota}\\b`), `rota sem cor definida: ${rota}`)
  }
  // Os três pontos onde a cor aparece: pill do menu, barra de 5px e selo do herói.
  assert.match(sistema, /--scw-pagina:/)
  assert.match(sistema, /--scw-pagina-tinta:/)
  assert.match(sistema, /--scw-pagina-menu:/)
})

test('trilho único de 1360px é o da casca e o das seções', () => {
  const sistema = ler(SISTEMA)
  assert.match(sistema, /--scw-trilho:\s*max\(clamp\(24px,\s*5vw,\s*72px\),\s*calc\(\(100% - 1360px\) \/ 2\)\)/)
  assert.match(sistema, /\.scw-secao\s*\{[^}]*padding:[^}]*var\(--scw-trilho\)/s)
  assert.match(sistema, /\.scw-header__linha\s*\{[^}]*var\(--scw-trilho\)/s)
})

test('prefers-reduced-motion zera animação e transição', () => {
  const sistema = ler(SISTEMA)
  assert.match(sistema, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(sistema, /prefers-reduced-motion: reduce\)\s*\{[\s\S]*?animation-duration:\s*\.001ms\s*!important/)
  assert.match(sistema, /prefers-reduced-motion: reduce\)\s*\{[\s\S]*?transition-duration:\s*\.001ms\s*!important/)
})

test('Sweet Awards não vaza o KV da edição Lovers', () => {
  for (const arquivo of ['src/pages/institutional/HistoricoAwards.jsx', 'src/styles/scw-awards.css']) {
    const fonte = ler(arquivo).replace(/\/\*[\s\S]*?\*\//g, ' ')
    assert.ok(!/--lovers-|kv-lovers|sofia-pro/.test(fonte), `identidade Lovers vazou em ${arquivo}`)
  }
})

test('flags de publicação seguem intactas', () => {
  const app = ler('src/App.jsx')
  assert.match(app, /AWARDS_ONLY_PUBLICATION\s*=\s*false/)
  assert.match(app, /COMING_SOON_PUBLICATION\s*=\s*true/)
})

test('rotas dos QR Codes da Lovers continuam congeladas', () => {
  const app = ler('src/App.jsx')
  assert.match(app, /\/lovers\/combos\//)
  assert.match(app, /\/lovers\/awards/)
})
