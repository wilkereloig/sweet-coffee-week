import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CATEGORIAS_ARQUIVO, agruparPorCategoria, tamanhoLegivel, tipoLegivel, caminhoSubstituto } from '../painel-app/src/lib/arquivos.js'

test('as categorias da tela são exatamente as do CHECK do banco', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20260930_etapa4_arquivos.sql', import.meta.url), 'utf8')
  const m = sql.match(/check \(categoria in \(([^)]*)\)\)/)
  const doBanco = m[1].split(',').map((s) => s.trim().replace(/'/g, ''))
  assert.deepEqual(CATEGORIAS_ARQUIVO.map((c) => c.chave).sort(), doBanco.sort())
})

test('agrupa na ordem das categorias e some com grupo vazio', () => {
  const g = agruparPorCategoria([
    { id: 1, categoria: 'documento' }, { id: 2, categoria: 'combo' }, { id: 3, categoria: 'xpto' }, { id: 4, categoria: 'combo' },
  ])
  assert.deepEqual(g.map((x) => [x.chave, x.itens.map((i) => i.id)]), [['combo', [2, 4]], ['documento', [1]], ['outro', [3]]])
  assert.deepEqual(agruparPorCategoria(null), [])
})

test('tamanho legível', () => {
  assert.equal(tamanhoLegivel(0), '')
  assert.equal(tamanhoLegivel(null), '')
  assert.equal(tamanhoLegivel(512), '512 B')
  assert.equal(tamanhoLegivel(1536), '1,5 KB')
  assert.equal(tamanhoLegivel(20 * 1024 * 1024), '20 MB')
})

test('tipo legível pela extensão, com o mime de reserva', () => {
  assert.equal(tipoLegivel('application/octet-stream', 'geral/guia.pdf'), 'PDF')
  assert.equal(tipoLegivel('image/png', 'x/logo.png'), 'Imagem PNG')
  assert.equal(tipoLegivel('image/heic', 'x/foto'), 'Imagem')
  assert.equal(tipoLegivel(null, 'x/sem-extensao'), 'Arquivo')
})

test('o substituto fica na mesma pasta e dentro do limite de nome', () => {
  const p = caminhoSubstituto('abc-123/logo.png', 'logo-novo.png', 1000)
  assert.ok(p.startsWith('abc-123/'))
  assert.ok(p.endsWith('logo-novo.png'))
  assert.ok(p.split('/')[1].length <= 120)
  assert.match(p.split('/')[1], /^[A-Za-z0-9._-]+$/)
})
