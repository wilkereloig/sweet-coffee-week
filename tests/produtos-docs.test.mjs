// Documentação dos produtos (docs/produtos/): todo caminho citado existe, todo produto está no índice e as consultas de saúde são só leitura.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const raiz = path.resolve(import.meta.dirname, '..')
const pasta = path.join(raiz, 'docs/produtos')
const arquivos = fs.readdirSync(pasta).filter((f) => f.endsWith('.md'))
const produtos = arquivos.filter((f) => f !== 'README.md')
const ler = (f) => fs.readFileSync(path.join(pasta, f), 'utf8')

test('índice existe e cita cada produto', () => {
  assert.ok(arquivos.includes('README.md'), 'docs/produtos/README.md é o índice')
  const indice = ler('README.md')
  for (const f of produtos) assert.ok(indice.includes(`(${f})`), `o índice precisa linkar ${f}`)
})

test('todo produto tem as seções fixas', () => {
  for (const f of produtos) {
    const t = ler(f)
    for (const s of ['## Para quê', '## Onde mora', '## Saúde: como medir', '## Limites conhecidos', '## Ideias para a próxima edição']) {
      assert.ok(t.includes(s), `${f} sem a seção "${s}"`)
    }
  }
})

test('todo caminho do repositório citado nos docs existe', () => {
  const faltando = []
  for (const f of arquivos) {
    const citados = ler(f).match(/`((?:docs|src|supabase|tests|api|painel-app|scripts)\/[^`\s]+)`/g) || []
    for (const c of citados) {
      const rel = c.slice(1, -1).replace(/[.,;:]$/, '')
      if (/[*<>{}]/.test(rel)) continue // padrão ou exemplo, não é caminho único
      if (!fs.existsSync(path.join(raiz, rel))) faltando.push(`${f}: ${rel}`)
    }
  }
  assert.deepEqual(faltando, [], 'caminho citado que não existe (arquivo renomeado ou doc errado)')
})

test('links relativos entre docs resolvem', () => {
  const quebrados = []
  for (const f of arquivos) {
    for (const m of ler(f).matchAll(/\]\(([^)#\s]+\.md)\)/g)) {
      if (/^https?:/.test(m[1])) continue
      if (!fs.existsSync(path.join(pasta, m[1]))) quebrados.push(`${f}: ${m[1]}`)
    }
  }
  assert.deepEqual(quebrados, [])
})

test('consultas de saúde são só leitura', () => {
  const dir = path.join(raiz, 'supabase/consultas')
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql'))) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\s*--.*$/gm, '')
    assert.doesNotMatch(sql, /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke)\b/i, `${f} não pode escrever no banco`)
  }
})
