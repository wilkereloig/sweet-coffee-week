// Reconstrução visual do painel (29/09/2026) — invariantes que não podem
// voltar atrás sem ninguém notar: caixa-alta, ícones, tons, logos.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { SCW_ICONS } from '../src/components/scw-icons/scw-icons-v2.js'
import { TONS, STATUS, rotulo } from '../painel-app/src/lib/status.js'
import {
  validarLogo, validarVetor, caminhoLogo, urlLogo, iniciais, mimeDe, ESTADOS_LOGO, LADO_MINIMO,
} from '../painel-app/src/lib/logos.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const CSS = ler('painel-app/src/styles/painel.css')
const ICONE = ler('painel-app/src/components/Icone.jsx')

test('caixa-alta só no rótulo da macroseção (diretriz de tipografia)', () => {
  const regras = [...CSS.matchAll(/([^{}]+)\{[^{}]*text-transform:\s*uppercase[^{}]*\}/g)].map((m) => m[1].trim())
  assert.deepEqual(regras, ['.ui-macro__rotulo'])
})

test('título de card e h3 em Nexa; Slab fica com h1/h2', () => {
  assert.match(CSS, /h1,h2\{font-family:var\(--f-titulo\)/)
  assert.match(CSS, /h3,h4\{font-family:var\(--f-ui\)/)
  assert.match(CSS, /\.ui-modulo__titulo\{[^}]*var\(--f-ui\)/)
})

test('camadas vêm da paleta (sem hex novo) e o fundo da aplicação é a camada 0', () => {
  const raiz = CSS.slice(CSS.indexOf(':root{'), CSS.indexOf('}', CSS.indexOf(':root{')))
  assert.match(raiz, /--sup-0:color-mix\(in srgb,var\(--scw-bege\)/)
  assert.match(CSS, /background:var\(--sup-0\);color:var\(--scw-choco\)/)
})

// Nomes do registro do painel = os `def(grade, 'a b c', …)` de Icone.jsx.
const LOCAIS = new Set([...ICONE.matchAll(/def\((?:24|32), '([^']+)'/g)].flatMap((m) => m[1].split(' ')))
const existe = (n) => LOCAIS.has(n) || !!SCW_ICONS[n]

test('todo ícone do mapa de assuntos existe (registro do painel ou sistema do site)', () => {
  const bloco = ICONE.slice(ICONE.indexOf('export const MODULO_ICONE'), ICONE.indexOf('}', ICONE.indexOf('export const MODULO_ICONE')))
  const nomes = [...bloco.matchAll(/:\s*'([^']+)'/g)].map((m) => m[1])
  assert.ok(nomes.length >= 20)
  for (const n of nomes) assert.ok(existe(n), 'ícone inexistente: ' + n)
})

test('todo tom de status tem ícone (estado nunca só por cor)', () => {
  const bloco = ICONE.slice(ICONE.indexOf('export const ICONE_TOM'))
  for (const t of TONS) {
    const m = new RegExp(t + ":\\s*'([^']+)'").exec(bloco)
    assert.ok(m, 'tom sem ícone: ' + t)
    assert.ok(existe(m[1]), 'ícone do tom não existe: ' + m[1])
  }
})

test('as vistas usam só nomes de ícone que existem', () => {
  const arquivos = ['PainelShell.jsx', 'PainelMarcaShell.jsx', 'Central.jsx', 'Folha.jsx', 'AbasCelular.jsx', 'LogoEditor.jsx', 'ui.jsx',
    'vistas/Mesa.jsx', 'vistas/Marcas.jsx', 'vistas-marca/Hoje.jsx', 'vistas-marca/Cadastro.jsx']
  for (const a of arquivos) {
    const txt = ler('painel-app/src/components/' + a)
    for (const m of txt.matchAll(/(?:nome|icone)="([a-z0-9/-]+)"/g)) assert.ok(existe(m[1]), a + ': ícone inexistente "' + m[1] + '"')
  }
})

test('estado da logo tem rótulo e tom no dicionário único', () => {
  for (const e of ESTADOS_LOGO) {
    assert.ok(STATUS.logo[e], 'sem entrada: ' + e)
    assert.notEqual(rotulo('logo', e), e)
  }
})

test('logo: aceita alta resolução e recusa print, formato errado e SVG com código', () => {
  assert.equal(validarLogo({ nome: 'logo.png', tamanho: 200000, largura: 1200, altura: 400 }), null)
  assert.equal(validarLogo({ nome: 'logo.svg', tamanho: 3000, textoSvg: '<svg><path d="M0 0"/></svg>' }), null)
  assert.match(validarLogo({ nome: 'print.jpg', tamanho: 50000, largura: 320, altura: 320 }), /pequena demais/)
  assert.match(validarLogo({ nome: 'logo.gif', tamanho: 5000 }), /Formato não aceito/)
  assert.match(validarLogo({ nome: 'logo.svg', tamanho: 5000, textoSvg: '<svg onload="x()"></svg>' }), /código/)
  // Os caminhos que a regex antiga deixava passar.
  for (const t of ['<svg><foreignObject><div/></foreignObject></svg>', '<svg><a href="&#106;avascript:x"/></svg>',
    '<svg><image href="https://x.test/a.png"/></svg>', '<svg><iframe/></svg>', '<!DOCTYPE s [<!ENTITY x "y">]><svg/>'])
    assert.ok(validarLogo({ nome: 'logo.svg', tamanho: 10, textoSvg: t }), t)
  // Referência interna e imagem embutida seguem valendo.
  assert.equal(validarLogo({ nome: 'logo.svg', tamanho: 10, textoSvg: '<svg><use href="#a"/><image href="data:image/png;base64,AA"/></svg>' }), null)
  assert.match(validarLogo({ nome: 'logo.png', tamanho: 11 * 1024 * 1024, largura: 2000 }), /10 MB/)
  assert.equal(validarLogo({ nome: 'logo.png', tamanho: 100, largura: LADO_MINIMO, altura: 100 }), null)
  assert.equal(validarVetor({ nome: 'marca.pdf', tamanho: 1000 }), null)
  assert.match(validarVetor({ nome: 'marca.png', tamanho: 1000 }), /vetorial/)
})

test('logo: caminho sempre na pasta do participante, nunca por cima de outro', () => {
  const a = caminhoLogo('p1', 'Logo Final.SVG', 'logo', 1000)
  const b = caminhoLogo('p1', 'Logo Final.SVG', 'logo', 2000)
  assert.match(a, /^p1\/[a-z0-9]+-logo\.svg$/)
  assert.notEqual(a, b)
  assert.equal(mimeDe('x.eps', true), 'application/postscript')
  assert.equal(mimeDe('x.jpeg'), 'image/jpeg')
})

test('logo: URL do acervo é do site; a enviada é do bucket público', () => {
  assert.equal(urlLogo('/logos/participants/bolomania.png'), '/logos/participants/bolomania.png')
  assert.match(urlLogo('abc/1-logo.png'), /\/storage\/v1\/object\/public\/logos\/abc\/1-logo\.png$/)
  assert.equal(urlLogo(null), null)
})

test('sem logo: iniciais das palavras que contam, nunca imagem genérica', () => {
  assert.equal(iniciais('Caroli Douces'), 'CD')
  assert.equal(iniciais('Casa de Taipa Tapiocaria'), 'CT')
  assert.equal(iniciais('Just Food&Coffee'), 'JF')
  assert.equal(iniciais(''), '?')
})

test('a migration das logos mantém o 17º campo em campos_cadastro e protege as funções internas', () => {
  const sql = ler('supabase/migrations/20260930_logos_marca.sql')
  assert.match(sql, /select 17,/)
  assert.match(sql, /when pa\.logo_id is null then 1/)
  for (const f of ['logo_info(uuid, boolean)', 'registrar_logo(uuid, jsonb, text)', 'aplicar_logo(uuid, uuid, text)'])
    assert.ok(sql.includes('revoke execute on function public.' + f + ' from public, anon, authenticated'), 'interna exposta: ' + f)
  assert.match(sql, /\(storage\.foldername\(name\)\)\[1\] = public\.meu_participante\(\)::text/)
})

// Redesenho 01/10/2026: raio e sombra de card só pelos tokens (--r-1..3,
// --sombra-1..3). Literal permitido: pílula, círculo, traço fino e o balão
// da conversa — o que não é card.
test('raio só por token, pílula, círculo ou traço fino', () => {
  const corpo = CSS.slice(CSS.indexOf('}', CSS.indexOf(':root{')))
  const PERMITIDOS = new Set(['999px', '50%', '2px', '3px', '4px', '6px', '16px 16px 16px 4px', '16px 16px 4px 16px', '0 0 3px 3px', '0', 'inherit'])
  for (const m of corpo.matchAll(/border-radius:([^;}]+)/g)) {
    const v = m[1].trim()
    if (v.startsWith('var(--r-') || v.startsWith('calc(var(--logo-t)')) continue
    if (/^var\(--r-\d\) var\(--r-\d\) 0 0$/.test(v)) continue
    assert.ok(PERMITIDOS.has(v), 'raio solto: ' + v)
  }
})

test('nenhuma caixa nativa do navegador nem fileira de botões de escolha', () => {
  const dir = new URL('../painel-app/src/components/', import.meta.url)
  const arquivos = readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith('.jsx') && !String(f).endsWith('Confirmar.jsx'))
  for (const f of arquivos) {
    const txt = readFileSync(new URL(String(f).split(String.fromCharCode(92)).join('/'), dir), 'utf8')
    assert.doesNotMatch(txt, /window\.(confirm|prompt|alert)\(/, f + ' abre caixa nativa')
    assert.doesNotMatch(txt, /ui-filtros-mini|className="ui-chip"/, f + ': escolha entre opções é <Escolha> (caixa de seleção), não fileira de botões')
  }
  assert.match(ler('painel-app/src/App.jsx'), /<Confirmacoes \/>/, 'App não monta <Confirmacoes />')
})
