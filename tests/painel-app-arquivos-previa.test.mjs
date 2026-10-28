// Prévia de imagem em Arquivos (27/10/2026): lib/arquivosPrevia.js + migration 20261116_arquivos_previa.sql.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ehImagemRaster, caminhoDaMiniatura, caminhoPrevia, medidaPrevia, semPrevia, ORIGINAL_COMO_PREVIA_MAX, GERAR_ENTRADA_MAX, LADO_PREVIA } from '../painel-app/src/lib/arquivosPrevia.js'

const MB = 1024 * 1024
test('só imagem raster tem prévia (SVG, PDF e vídeo não)', () => {
  assert.ok(ehImagemRaster({ mime: 'image/png' }))
  assert.ok(ehImagemRaster({ path: 'geral/logo.JPG' }))
  assert.ok(!ehImagemRaster({ mime: 'image/svg+xml', path: 'geral/x.png' }), 'o mime vale mais que a extensão')
  assert.ok(!ehImagemRaster({ mime: 'application/pdf' }))
  assert.ok(!ehImagemRaster(null))
})

test('miniatura: a prévia; sem ela, o original só se for pequeno — a logo de 16 MB não', () => {
  const grande = { mime: 'image/png', path: 'geral/a.png', tamanho: 16 * MB }
  assert.equal(caminhoDaMiniatura(grande), null)
  assert.equal(caminhoDaMiniatura({ ...grande, previa_path: 'geral/u.previa.webp' }), 'geral/u.previa.webp')
  assert.equal(caminhoDaMiniatura({ ...grande, tamanho: ORIGINAL_COMO_PREVIA_MAX }), 'geral/a.png')
  assert.equal(caminhoDaMiniatura({ mime: 'application/pdf', path: 'geral/r.pdf', previa_path: 'geral/u.previa.webp' }), null)
})

test('prévia na mesma pasta, .webp, no formato que o banco aceita; nunca aumenta', () => {
  const p = caminhoPrevia('3f2b8f2e-1111-4222-8333-444455556666/logo.png', 'abcd-1234')
  assert.equal(p, '3f2b8f2e-1111-4222-8333-444455556666/abcd-1234.previa.webp')
  assert.match(p, /^[^/]+\/[A-Za-z0-9._-]+\.webp$/)
  assert.deepEqual(medidaPrevia(7681, 7592), { w: LADO_PREVIA, h: 949 })
  assert.deepEqual(medidaPrevia(400, 300), { w: 400, h: 300 })
  assert.equal(medidaPrevia(0, 10), null)
})

test('fila de geração: imagens sem prévia, não arquivadas, até o teto', () => {
  const l = [
    { id: 1, mime: 'image/png', path: 'geral/a.png', tamanho: 2 * MB },
    { id: 2, mime: 'image/png', path: 'geral/b.png', previa_path: 'geral/b.previa.webp' },
    { id: 3, mime: 'image/png', path: 'geral/c.png', arquivado: true },
    { id: 4, mime: 'application/pdf', path: 'geral/d.pdf' },
    { id: 5, mime: 'image/png', path: 'geral/e.png', tamanho: GERAR_ENTRADA_MAX + 1 },
  ]
  assert.deepEqual(semPrevia(l).map((a) => a.id), [1])
})

test('banco: CHECK, gatilho da troca, permissões e a policy da marca', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261116_arquivos_previa.sql', import.meta.url), 'utf8')
  assert.ok(sql.includes("previa_path ~ '^[^/]+/[A-Za-z0-9._-]+\\.webp$'"))
  assert.match(sql, /split_part\(previa_path, '\/', 1\) = split_part\(path, '\/', 1\)/)
  assert.match(sql, /new\.path is distinct from old\.path/)
  assert.match(sql, /arquivo_definir_previa[\s\S]*pode\(p_secret, 'producao\.gerir'\)/)
  assert.match(sql, /a\.path = objects\.name or a\.previa_path = objects\.name/)
})

test('telas ligadas: marca e equipe, publicar e substituir geram a prévia', () => {
  const ler = (f) => readFileSync(new URL('../painel-app/src/' + f, import.meta.url), 'utf8')
  assert.match(ler('components/vistas-marca/arquivos/ItemArquivo.jsx'), /<PreviaArquivo /)
  assert.match(ler('components/vistas-marca/Arquivos.jsx'), /<AmpliarPrevia /)
  assert.match(ler('components/vistas/ArquivosOrg.jsx'), /useGerarPreviasFaltando/)
  assert.match(ler('components/vistas/ArquivosOrg.jsx'), /enviarPrevia\(\{ id: a\.id, path \}, file\)/)
  assert.match(ler('components/vistas/Producao.jsx'), /enviarPrevia\(\{ id: idNovo, path \}, file\)/)
  assert.match(ler('lib/sync/dominios.js'), /'arquivo_definir_previa'/)
})
