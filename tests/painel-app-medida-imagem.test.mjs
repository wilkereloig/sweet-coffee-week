// Medida da imagem pelos primeiros bytes (painel-app/src/lib/medidaImagem.js), usada no "Analisar todas as fotos"
// dos Pedidos de presença (14/11/2026). As fixtures são imagens reais geradas nas medidas que chegam ao banco.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { medidaDosBytes, medirImagemPorUrl, emLotes } from '../painel-app/src/lib/medidaImagem.js'

const fx = (n) => new Uint8Array(fs.readFileSync(new URL('./fixtures/medida/' + n, import.meta.url)))
const primeiros = (b) => b.subarray(0, 65536)

test('lê largura e altura de JPEG, WebP (com e sem perdas) e PNG só pelo começo do arquivo', () => {
  assert.deepEqual(medidaDosBytes(primeiros(fx('tela.jpg'))), { largura: 738, altura: 1600 })
  assert.deepEqual(medidaDosBytes(primeiros(fx('camera.webp'))), { largura: 1200, altura: 1600 })
  assert.deepEqual(medidaDosBytes(primeiros(fx('deitada-lossless.webp'))), { largura: 1600, altura: 1200 })
  assert.deepEqual(medidaDosBytes(primeiros(fx('recorte.png'))), { largura: 1179, altura: 556 })
  assert.deepEqual(medidaDosBytes(primeiros(fx('com-exif.jpg'))), { largura: 1179, altura: 1551 }, 'pula o EXIF antes do SOF')
})

test('cabeçalho incompleto ou formato desconhecido → null (quem chama carrega a imagem inteira)', () => {
  assert.equal(medidaDosBytes(fx('com-exif.jpg').subarray(0, 4000)), null)
  assert.equal(medidaDosBytes(new TextEncoder().encode('isto não é uma imagem, só texto comprido o bastante')), null)
  assert.equal(medidaDosBytes(new Uint8Array(5)), null)
})

test('por URL: usa o pedaço do Range; se não der, cai para a imagem inteira', async () => {
  const pedaco = primeiros(fx('tela.jpg'))
  const vistos = []
  const fetchOk = async (url, opc) => { vistos.push(opc.headers.Range); return { ok: true, arrayBuffer: async () => pedaco.buffer.slice(pedaco.byteOffset, pedaco.byteOffset + pedaco.byteLength) } }
  assert.deepEqual(await medirImagemPorUrl('u', { fetchImpl: fetchOk }), { largura: 738, altura: 1600 })
  assert.deepEqual(vistos, ['bytes=0-65535'])
  class Img { set src (v) { this.naturalWidth = 1600; this.naturalHeight = 1200; setImmediate(() => this.onload()) } }
  const fetchFalha = async () => { throw new Error('cors') }
  assert.deepEqual(await medirImagemPorUrl('u', { fetchImpl: fetchFalha, ImageImpl: Img }), { largura: 1600, altura: 1200 })
})

test('em lotes: no máximo N por vez, avisa o andamento e uma falha não para as outras', async () => {
  let agora = 0; let pico = 0; const andamento = []
  const r = await emLotes([1, 2, 3, 4, 5, 6, 7], async (n) => {
    agora++; pico = Math.max(pico, agora); await new Promise((ok) => setTimeout(ok, 5)); agora--
    if (n === 3) throw new Error('falhou')
    return n * 10
  }, { simultaneas: 3, aoAvancar: (f, t) => andamento.push(f + '/' + t) })
  assert.ok(pico <= 3)
  assert.equal(andamento.at(-1), '7/7')
  assert.deepEqual(r.map((x) => x.ok), [true, true, false, true, true, true, true])
  assert.equal(r[6].valor, 70)
})

test('"Analisar todas as fotos": lista completa só com fotos (migration 20270204) e resumo por pessoa na tela', () => {
  const ler = (r) => fs.readFileSync(new URL('../' + r, import.meta.url), 'utf8')
  const sql = ler('supabase/migrations/20270204_caca_excecao_listar_so_fotos.sql')
  assert.match(sql, /p_so_fotos boolean default false/)
  assert.match(sql, /e\.motivo = 'visita_anterior' and e\.imagem_path is not null and e\.imagem_removida_em is null/)
  assert.match(sql, /grant execute on function public\.caca_excecao_listar\(text, text, text, uuid, boolean\)/)
  assert.match(ler('supabase/reverter/20270204_caca_excecao_listar_so_fotos.sql'), /drop function if exists public\.caca_excecao_listar\(text, text, text, uuid, boolean\)/)
  assert.match(ler('painel-app/src/lib/caca.js'), /p_so_fotos: true/)
  const tela = ler('painel-app/src/components/vistas/caca/Excecoes.jsx')
  assert.match(tela, /function AnaliseDasFotos/)
  assert.match(tela, /medirImagemPorUrl\(r\.url\)/)
  assert.match(tela, /simultaneas: 4/)
})
