// Sistema visual da camada Cartoon (docs/cartoon-2026-2/10-sistema-visual-e-paginas.md, etapa 1).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { iconeEdicao, cenaEdicao, kitTemaEdicao, trofeuEdicao } from '../src/data/imageLibrary.js'

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
// O índice só tem a fonte, os tokens e os @import; as regras moram em src/styles/cartoon/ (03/11/2026).
const lerCss = () => [CSS, ...cssDe('src/styles/cartoon')].map(ler).join('\n')
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
  const css = lerCss()
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

test('anel de foco: chocolate nos fundos claros, amarelo só sobre chocolate (≥ 3:1)', () => {
  const t = tokens()
  for (const fundo of ['creme', 'amarelo', 'turquesa', 'rosa', 'branco']) {
    assert.ok(contraste(t.chocolate, t[fundo]) >= 3, `anel chocolate sobre ${fundo} < 3:1`)
  }
  assert.ok(contraste(t.amarelo, t.chocolate) >= 3, 'anel amarelo sobre chocolate < 3:1')
  const css = lerCss()
  assert.match(css, /:focus-visible\s*{\s*outline:\s*3px solid var\(--ct-chocolate\)/)
  assert.doesNotMatch(css, /outline[^;]*var\(--ct-azul\)/, 'sobrou anel azul')
})

test('preto só no traço de desenho; texto e contorno de interface em chocolate', () => {
  const css = lerCss()
  const usos = css.split('\n').filter((l) => l.includes('var(--ct-preto)')).map((l) => l.trim())
  assert.deepEqual(usos, ['--ct-tinta-desenho: var(--ct-preto); /* nanquim do desenho (olhinhos); o preto não sai daqui */'])
  assert.match(css, /--ct-traco:\s*3px solid var\(--ct-chocolate\)/) // traço de gibi, repaginação de 04/11
})

test('contador da Minha rota com contraste de texto pequeno', () => {
  const t = tokens()
  const regra = lerCss().match(/\.ct-contador\s*{([^}]*)}/)[1]
  const fundo = regra.match(/background:\s*var\(--ct-([a-z]+)\)/)[1]
  const tinta = regra.match(/(?:^|[\s;])color:\s*var\(--ct-([a-z]+)\)/)[1]
  assert.ok(contraste(t[tinta], t[fundo]) >= 4.5, `${tinta} sobre ${fundo} < 4,5 em texto de 13px`)
})

test('vitrine do sistema só existe no servidor de desenvolvimento', () => {
  const casca = ler('src/edicao/cartoon/index.jsx')
  assert.match(casca, /import\.meta\.env\.DEV\s*\?\s*React\.lazy\(\(\)\s*=>\s*import\('\.\/paginas\/Sistema\.jsx'\)\)\s*:\s*null/)
  assert.doesNotMatch(casca, /^import .*Sistema/m, 'import estático levaria a vitrine para o build')
  assert.match(ler('src/edicao/cartoon/paginas/Sistema.jsx'), /import '\.\/sistema\.css'/)
})

// ---- Elementos novos da edição (§10.15): todo caminho do imageLibrary existe e a medida declarada é a do arquivo.
const ICONES = ('inicio casas mapa rota avaliar premio no-local para-viagem delivery vegano sem-gluten sem-lactose sem-acucar '
  + 'endereco horario aberto-agora conversar como-chegar quero-ir ja-fui progresso compartilhar vazio erro').split(' ')

/** Largura × altura de um WebP lendo só o cabeçalho (VP8X, VP8L ou VP8). */
function medidaWebp (src) {
  const b = fs.readFileSync(path.join(raiz, 'public', src))
  assert.equal(b.toString('ascii', 8, 12), 'WEBP', `${src} não é WebP`)
  const tipo = b.toString('ascii', 12, 16)
  if (tipo === 'VP8X') return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1]
  if (tipo === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1] }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]
}

test('os 24 ícones da edição existem, em WebP quadrado de 192 px', () => {
  assert.equal(ICONES.length, 24)
  for (const nome of ICONES) {
    const i = iconeEdicao(nome)
    assert.ok(i, `iconeEdicao('${nome}') devolveu null`)
    assert.ok(existe(`public${i.src}`), `falta ${i.src}`)
    assert.deepEqual(medidaWebp(i.src), [192, 192], `${i.src} fora de 192×192`)
  }
  assert.equal(iconeEdicao('inexistente'), null)
  assert.equal(iconeEdicao(undefined), null)
})

test('cenas, kits de tema e troféu: arquivo existe e a medida declarada é a do arquivo', () => {
  const pecas = [
    ...['tv', 'natal'].map((c) => [`cenaEdicao('${c}')`, cenaEdicao(c)]),
    ['trofeuEdicao()', trofeuEdicao()],
    ...['casa-alice-doceria', 'boldfood-confeitaria-inclusiva'].flatMap((s) => {
      const k = kitTemaEdicao(s)
      assert.ok(k, `kitTemaEdicao('${s}') devolveu null`)
      return Object.entries(k).map(([parte, p]) => [`${s}.${parte}`, p])
    }),
  ]
  assert.equal(pecas.length, 2 + 1 + 6)
  for (const [nome, p] of pecas) {
    assert.ok(p, `${nome} devolveu null`)
    assert.ok(existe(`public${p.src}`), `falta ${p.src}`)
    assert.deepEqual([p.largura, p.altura], medidaWebp(p.src), `${nome}: largura/altura diferem do arquivo`)
  }
  assert.equal(cenaEdicao('inexistente'), null)
  assert.equal(kitTemaEdicao('casa-sem-kit'), null)
  assert.deepEqual(Object.keys(kitTemaEdicao('casa-alice-doceria')).sort(), ['cenario', 'objetoA', 'objetoB'])
})
