/*
 * Cor da pasta da Biblioteca (21/10/2026): a paleta da tela é a do banco, o ícone sobre cada cor tem contraste
 * de ícone (≥ 3:1, WCAG 1.4.11) e a tela liga o seletor às RPCs. Navegador: painel-biblioteca-arrastar-navegador.mjs.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CORES_PASTA, corValida, rotuloCor, estiloPasta } from '../painel-app/src/lib/pastas.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const CSS = ler('painel-app/src/styles/painel.css')
const hex = (nome) => {
  const m = CSS.match(new RegExp('--scw-' + nome + ':\\s*(#[0-9A-Fa-f]{6})'))
  assert.ok(m, 'token --scw-' + nome + ' existe no painel.css')
  return m[1]
}
const lum = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

test('a paleta da pasta é a do banco (social_pastas_cor_check) e só usa cores da marca', () => {
  const SQL = ler('supabase/migrations/20261025_social_pastas_cor.sql')
  const doBanco = [...SQL.match(/cor in \(([^)]*)\)\);/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort()
  assert.deepEqual(CORES_PASTA.map((c) => c.chave).sort(), doBanco, 'tela e banco têm as mesmas chaves')
  for (const f of ['social_pasta_criar', 'social_pasta_editar']) {
    const corpo = SQL.slice(SQL.indexOf('function public.' + f + '('), SQL.indexOf('end $$;', SQL.indexOf('function public.' + f + '(')))
    assert.match(corpo, /redes_exigir\(p_secret, 'redes\.gerir'\)/, f + ': redes.gerir')
    assert.match(corpo, /raise exception 'cor_invalida'/, f + ': recusa cor fora da paleta')
  }
  assert.match(SQL, /'cor', p\.cor/, 'a listagem devolve a cor')
  assert.doesNotMatch(SQL, /drop |delete from/i, 'só acrescenta')
  for (const c of CORES_PASTA) hex(c.chave) // todas existem como token da marca
})

test('o ícone sobre cada cor tem contraste de ícone (≥ 3:1)', () => {
  for (const c of CORES_PASTA) {
    const r = contraste(hex(c.chave), hex(c.tinta))
    assert.ok(r >= 3, c.chave + ': ' + c.tinta + ' sobre a cor dá ' + r.toFixed(2) + ':1')
  }
})

test('ajudantes: cor desconhecida é ignorada (padrão), estilo só com cor válida', () => {
  assert.equal(corValida('roxo'), true)
  assert.equal(corValida('rosa-choque'), false)
  assert.equal(corValida(null), false)
  assert.equal(corValida('toString'), false, 'chave herdada do objeto não vale')
  assert.equal(rotuloCor('cyan'), 'Ciano')
  assert.equal(rotuloCor(null), 'Padrão')
  assert.equal(estiloPasta(null), undefined)
  assert.equal(estiloPasta('verde')['--pasta-cor'], 'var(--scw-verde)')
  assert.equal(estiloPasta('roxo')['--pasta-tinta'], 'var(--scw-creme)')
})

test('tela: seletor com a paleta, RPC de editar, disco/ponto coloridos, padrão sem cor', () => {
  const BIB = ler('painel-app/src/components/vistas/SocialBiblioteca.jsx')
  assert.match(BIB, /function CorDaPasta\(/)
  assert.match(BIB, /role="radiogroup"/)
  assert.match(BIB, /P\.CORES_PASTA\.map/)
  assert.match(BIB, /rpc\('social_pasta_editar', \{ p_secret: lerSenha\(\), p_id: p\.id, p_dados: \{ cor: cor \|\| '' \} \}\)/)
  assert.match(BIB, /rotulo: 'Cor da pasta…'/)
  assert.match(BIB, /className="bb-pasta__icone" style=\{P\.estiloPasta\(p\.cor\)\}/)
  assert.match(BIB, /cor_invalida:/)
  assert.match(CSS, /\.bb-pasta__icone\{[^}]*var\(--pasta-cor,var\(--pn-acento/, 'sem cor cai no acento do módulo')
})
