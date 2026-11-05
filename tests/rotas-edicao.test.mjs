// Camada de edição — fase 1 (docs/cartoon-2026-2/): rotas, interruptores e isolamento.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { resolverRota } from '../src/lib/rotas.js'
import { resolverCena, CENAS } from '../src/edicao/rotas.js'
import { EDICAO, CARTOON_PUBLICA, ENTRADA_PRINCIPAL, INICIO_INSTITUCIONAL } from '../src/edicao/config.js'

const raiz = path.resolve(import.meta.dirname, '..')
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8')

const FECHADA = {}
const PUBLICA = { edicaoPublica: true }
const ENTRADA = { edicaoPublica: true, entradaEdicao: true }

test('interruptores do domínio coerentes: Cartoon pública e na entrada do domínio', () => {
  assert.equal(CARTOON_PUBLICA, true)
  assert.equal(ENTRADA_PRINCIPAL, 'cartoon')
  assert.equal(INICIO_INSTITUCIONAL, '/festival')
  assert.ok(['institucional', 'cartoon'].includes(ENTRADA_PRINCIPAL))
  if (ENTRADA_PRINCIPAL === 'cartoon') assert.equal(CARTOON_PUBLICA, true, 'Cartoon na entrada exige a rota pública')
  assert.equal(EDICAO.codigo, '2026.2')
  assert.equal(EDICAO.caminho, '/cartoon')
})

test('/cartoon só vira a edição com a rota pública (ou preview)', () => {
  for (const p of ['/cartoon', '/cartoon/', '/cartoon/participantes', '/cartoon/participantes/casa-a', '/cartoon/mapa']) {
    assert.equal(resolverRota(p, FECHADA), 'home', p)
    assert.equal(resolverRota(p, PUBLICA), 'cartoon', p)
  }
  assert.equal(resolverRota('/cartoonx', PUBLICA), 'home')
})

test('/ só mostra a edição com entrada E rota pública; /festival é sempre a Home', () => {
  assert.equal(resolverRota('/', FECHADA), 'home')
  assert.equal(resolverRota('/', PUBLICA), 'home')
  assert.equal(resolverRota('/', { entradaEdicao: true }), 'home')
  assert.equal(resolverRota('/', ENTRADA), 'cartoon')
  for (const f of [FECHADA, PUBLICA, ENTRADA]) {
    assert.equal(resolverRota('/festival', f), 'home')
    assert.equal(resolverRota('/edicoes/2022', f), 'edicoes')
    assert.equal(resolverRota('/participar', f), 'participar')
  }
})

test('endereços Lovers nunca chegam à edição', () => {
  for (const p of ['/mapa', '/rota', '/participantes', '/lovers', '/lovers/combos/paneer-patisserie', '/lovers/awards', '/premiacao']) {
    for (const f of [FECHADA, PUBLICA, ENTRADA]) assert.notEqual(resolverRota(p, f), 'cartoon', p)
  }
})

test('documentos legais abrem em qualquer combinação', () => {
  for (const f of [FECHADA, PUBLICA, ENTRADA, { ...ENTRADA, comingSoon: true }, { ...ENTRADA, soParticipar: true }]) {
    for (const d of ['privacidade', 'cookies', 'termos', 'uso-de-imagem']) assert.equal(resolverRota(`/${d}`, f), 'legal')
  }
})

test('cenas da edição', () => {
  const c = (p) => resolverCena(p)
  assert.deepEqual(c('/'), { cena: 'entrada' })
  assert.deepEqual(c('/cartoon'), { cena: 'entrada' })
  assert.deepEqual(c('/cartoon/'), { cena: 'entrada' })
  assert.deepEqual(c('/cartoon/participantes'), { cena: 'participantes' })
  assert.deepEqual(c('/cartoon/participantes/paneer-patisserie'), { cena: 'participante', slug: 'paneer-patisserie' })
  assert.deepEqual(c('/cartoon/combos'), { cena: 'combos' })
  assert.deepEqual(c('/cartoon/combos/paneer-patisserie'), { cena: 'participante', slug: 'paneer-patisserie', foco: 'combo' })
  for (const s of ['mapa', 'avaliar', 'premiacao']) assert.deepEqual(c(`/cartoon/${s}`), { cena: s })
  // Mapa e Minha rota são uma página só: o endereço antigo da rota abre o MESMO mapa, com o painel da rota aberto.
  assert.deepEqual(c('/cartoon/minha-rota'), { cena: 'mapa', abrirRota: true })
  assert.deepEqual(c('/cartoon/minha-rota/'), { cena: 'mapa', abrirRota: true })
  assert.deepEqual(c('/cartoon/minha-rota/x'), { cena: 'inexistente' })
  assert.ok(!CENAS.includes('minha-rota'), 'Minha rota não é mais uma cena própria')
  assert.deepEqual(c('/cartoon/caca'), { cena: 'caca', secao: 'central' })
  assert.deepEqual(c('/cartoon/caca/ranking'), { cena: 'caca', secao: 'ranking' })
  assert.deepEqual(c('/cartoon/caca/xyz'), { cena: 'inexistente' })
  assert.deepEqual(c('/cartoon/sistema'), { cena: 'sistema' })
  assert.deepEqual(c('/cartoon/sistema/x'), { cena: 'inexistente' })
  assert.deepEqual(c('/cartoon/mapa?unidade=u7k2'), { cena: 'mapa' })
  for (const p of ['/cartoon/xyz', '/cartoon/participantes/Casa_A', '/cartoon/participantes/a/b', '/cartoon/mapa/x', '/outra']) {
    assert.deepEqual(c(p), { cena: 'inexistente' }, p)
  }
})

test('a Caça aos Carimbos segue o mesmo gate do mapa e não mexe nas flags', () => {
  const idx = ler('src/edicao/cartoon/index.jsx')
  assert.match(idx, /CENAS_DO_MAPA = \[[^\]]*'caca'/, 'sem MAPA_NO_AR a cena vira "em breve"')
  assert.match(idx, /MAPA_NO_AR \|\| !\['mapa', 'caca'\]/, 'o Mapa da Doçura e a Caça somem do menu juntos')
  assert.doesNotMatch(idx, /'minha-rota'/, 'sem item nem página própria para a rota')
  assert.match(ler('src/edicao/config.js'), /export const MAPA_PUBLICO = false/)
  assert.ok(CENAS.includes('caca'))
})

test('cada caminho limpo tem rewrite na Vercel', () => {
  const fontes = new Set(JSON.parse(ler('vercel.json')).rewrites.map((r) => r.source))
  for (const s of ['/festival', '/cartoon', '/cartoon/:path*', '/edicoes', '/edicoes/:path*', '/sweet-awards', '/sweet-awards/:path*',
    '/historico-sweet-awards', '/participar', '/apoiar', '/contato', '/privacidade', '/cookies', '/termos', '/uso-de-imagem', '/em-breve']) {
    assert.ok(fontes.has(s), `falta rewrite ${s}`)
  }
})

test('estilo da edição não vaza para o institucional nem para o painel', () => {
  const arquivos = []
  const varrer = (dir) => {
    for (const e of fs.readdirSync(path.join(raiz, dir), { withFileTypes: true })) {
      const rel = path.join(dir, e.name)
      if (e.isDirectory()) { if (!['edicao', '_arquivo', 'gerado'].includes(e.name)) varrer(rel) }
      else if (/\.(jsx?|css)$/.test(e.name)) arquivos.push(rel)
    }
  }
  varrer('src'); varrer('painel-app/src')
  const vaza = arquivos.filter((f) => !f.endsWith('scw-cartoon.css') && !/styles[\\/]cartoon[\\/]/.test(f) && /--ct-|\bct-(edicao|topo|cena|rodape|botao)\b/.test(ler(f)))
  assert.deepEqual(vaza, [])
  assert.match(ler('src/edicao/cartoon/index.jsx'), /scw-cartoon\.css/)
  assert.doesNotMatch(ler('src/main.jsx'), /scw-cartoon/)
})
