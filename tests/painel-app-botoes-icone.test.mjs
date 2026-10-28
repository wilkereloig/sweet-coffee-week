// Botões só com ícone (25/10/2026, pedido do Wilker: "só deixa o que realmente precisa do texto").
// O texto vira o nome lido (aria-label) e a dica do mouse/teclado (data-rotulo); nada de texto à vista.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { carregar, html } from './_renderizar.mjs'

const ui = carregar('painel-app/src/components/ui.jsx')
const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const semTags = (h) => h.replace(/<[^>]+>/g, '')

test('Botao soIcone: o texto vira nome e dica, e nada aparece escrito', () => {
  const h = html(ui.Botao, { icone: 'baixar', soIcone: true, variante: 'secundario', children: 'Baixar' })
  assert.match(h, /class="og-btn og-btn--mini og-btn--vazado og-btn--icone"/)
  assert.match(h, /aria-label="Baixar"/)
  assert.match(h, /data-rotulo="Baixar"/)
  assert.equal(semTags(h), '', 'nenhum texto fora das tags')
  // O nome mais longo de quem chama vale; a dica continua curta.
  const longo = html(ui.Botao, { icone: 'baixar', soIcone: true, children: 'Baixar', 'aria-label': 'Baixar a logo de Casa X' })
  assert.match(longo, /aria-label="Baixar a logo de Casa X"/)
  assert.match(longo, /data-rotulo="Baixar"/)
  // aria-label vazio de quem chama (ex.: `cond ? '…' : undefined`) não apaga o nome.
  assert.match(html(ui.Botao, { icone: 'baixar', soIcone: true, children: 'Baixar', 'aria-label': undefined }), /aria-label="Baixar"/)
  // Ocupado: o desenho vira "carregando", girando.
  assert.match(html(ui.Botao, { icone: 'baixar', soIcone: true, children: 'Preparando…', 'aria-busy': 'true' }), /scw-gira/)
})

test('Botao sem soIcone segue com ícone e texto', () => {
  const h = html(ui.Botao, { icone: 'feito', children: 'Salvar' })
  assert.match(h, /Salvar<\/button>$/)
  assert.doesNotMatch(h, /og-btn--icone|data-rotulo/)
})

test('LinkIcone e MaisAcoes: só o desenho, com nome e dica', () => {
  const l = html(ui.LinkIcone, { icone: 'baixar', rotulo: 'Baixar o guia (PDF)', href: '/guia.pdf', download: true })
  assert.match(l, /^<a class="og-btn og-btn--mini og-btn--vazado og-btn--icone"/)
  assert.match(l, /aria-label="Baixar o guia \(PDF\)"/)
  assert.match(l, /data-rotulo="Baixar o guia \(PDF\)"/)
  assert.equal(semTags(l), '')
  const m = html(ui.MaisAcoes, { itens: [{ rotulo: 'Duplicar', onClick: () => {} }], rotulo: 'Opções da pasta Posts' })
  assert.match(m, /<summary class="og-btn og-btn--mini og-btn--vazado og-btn--icone" data-rotulo="Opções da pasta Posts">/)
  assert.match(m, /<span class="ui-oculto">Opções da pasta Posts<\/span><\/summary>/, 'o leitor de tela lê o nome')
})

test('o círculo de 44 px segura a fileira que estica, e a dica só aparece no mouse ou no teclado', () => {
  const css = ler('painel-app/src/styles/painel.css')
  assert.match(css, /\.og-btn--icone\{[^}]*width:44px;min-width:44px;max-width:44px;height:44px;min-height:44px;padding:0/)
  assert.match(css, /\.og-btn--icone::after\{content:attr\(data-rotulo\)/)
  assert.match(css, /\.og-btn--icone:focus-visible::after\{display:block\}/)
  assert.match(css, /@media \(hover:hover\)\{ \.og-btn--icone:hover::after\{display:block\} \}/)
})

test('dica oculta sai do layout e a do botão sozinho cresce para a esquerda (sem rolagem lateral no celular)', () => {
  const css = ler('painel-app/src/styles/painel.css')
  // opacity:0 deixava a dica invisível mas ainda contando na rolagem da vista
  assert.match(css, /\.og-btn--icone::after\{[^}]*display:none/)
  assert.doesNotMatch(css, /\.og-btn--icone[^{]*::after\{[^}]*opacity/)
  // sozinho (first + last) ancora à direita, como o último da fileira
  assert.match(css, /\.og-btn--icone:first-child:not\(:last-child\)::after\{left:0/)
  assert.match(css, /\.og-btn--icone:last-child::after[^{]*\{left:auto;right:0/)
})

test('a prévia da Biblioteca (a da foto): baixar, compartilhar, mover e apagar só com ícone', () => {
  const bib = ler('painel-app/src/components/vistas/SocialBiblioteca.jsx')
  assert.match(bib, /icone="mover-pasta" soIcone onClick=\{onMover\}>Mover para…</)
  assert.match(bib, /icone="apagar" soIcone className="og-btn--perigo" onClick=\{onApagar\}>Apagar</)
  const ent = ler('painel-app/src/components/vistas/BaixarArquivo.jsx')
  assert.match(ent, /const um = n === 1/, 'um arquivo = ícones; vários = o texto diz ZIP e quantos')
  assert.match(ent, /icone="baixar" soIcone=\{um\}/)
  assert.match(ent, /icone=\{ICONE_COMPARTILHAR\} soIcone=\{um\}/)
})

test('compartilhar usa o desenho do aparelho: quadrado com seta no iPhone, três pontos no resto', () => {
  assert.match(ler('painel-app/src/components/Icone.jsx'), /export const ICONE_COMPARTILHAR = plataforma\(\)\.ios \? 'compartilhar-ios' : 'compartilhar'/)
})

test('nenhum Botao soIcone fica sem nome (o texto entre as tags é o nome)', () => {
  const pasta = new URL('../painel-app/src/components/', import.meta.url)
  let n = 0
  for (const a of readdirSync(pasta, { recursive: true }).map(String).filter((x) => x.endsWith('.jsx'))) {
    const txt = readFileSync(new URL(a.replace(/\\/g, '/'), pasta), 'utf8')
    for (const m of txt.matchAll(/<Botao\b[^>]*\bsoIcone\b[^>]*>/g)) {
      n++
      assert.doesNotMatch(m[0], /\/>$/, a + ': Botao soIcone fechado sem texto: ' + m[0].slice(0, 80))
    }
  }
  assert.ok(n >= 30, 'esperava os botões convertidos (' + n + ')')
})
