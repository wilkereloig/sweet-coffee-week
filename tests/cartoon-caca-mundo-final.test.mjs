// Mundo da Doçura — ARTE FINAL do Illustrator (docs/cartoon-2026-2/15-caca-mapa-final.md; gerador scripts/edicao/mapa-mundo-final.py).
// Confere o que o gerador escreveu: arquivos e orçamento, posições, numeração da legenda, Sicredi fora da contagem das casas,
// proporção da imagem e unidades apontando para a casa.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { mundoEdicao } from '../src/data/imageLibrary.js'
import { agenciasSicredi, ehSicredi } from '../src/edicao/caca/mapa/sicredi.js'
import { completarUnidades } from '../src/edicao/rota/mundo.js'

const pub = fileURLToPath(new URL('../public/', import.meta.url))
const caminho = (src) => join(pub, src.replace(/^\//, ''))
const m = mundoEdicao()

/** Largura x altura de um WebP (VP8 com perdas, VP8L sem perdas ou VP8X estendido), lidas do cabeçalho. */
function dimensoesWebp (arquivo) {
  const b = readFileSync(arquivo)
  assert.equal(b.toString('ascii', 0, 4), 'RIFF')
  assert.equal(b.toString('ascii', 8, 12), 'WEBP')
  const tipo = b.toString('ascii', 12, 16)
  if (tipo === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]
  if (tipo === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]
  const bits = b.readUInt32LE(21) // VP8L
  return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)]
}
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

test('a arte final está aprovada com origem, data e aprovação registradas, e a base é a LIMPA (sem bandeiras)', () => {
  assert.equal(m.arteComBandeiras, false, 'o site desenha os marcadores por código: a base não traz bandeira')
  assert.equal(m.arte.semBandeiras, true)
  assert.equal(m.arte.arquivo, 'base-final-v1-limpa')
  assert.ok(m.arte.bandeirasRemovidas.length >= 3 && m.arte.bandeirasRemovidas.some((x) => /27 bandeiras de casa/.test(x)) && m.arte.bandeirasRemovidas.some((x) => /Sicredi/.test(x)))
  assert.equal(m.aprovada, true)
  assert.ok(m.arte.fonte && m.arte.salvoEm && m.arte.aprovacao && m.arte.geradoPor)
  assert.equal(m.arte.ilustrativa, true, 'a arte é ilustrativa: posições não são coordenadas reais')
  assert.deepEqual(m.bandeiras, [], 'nenhuma bandeira desenhada por código vem do arquivo antigo')
  assert.equal(m.bandeira(1), null)
})

test('a variante com bandeiras fica no disco como reserva (reverter = gerar com --com-bandeiras)', () => {
  for (const w of m.larguras) assert.ok(existsSync(caminho(`/images/marcas-edicoes/2026.2/mundo/base-final-v1-${w}.webp`)), `reserva ${w}`)
})

test('arquivos exportados existem, dentro do orçamento, e a proporção bate com o quadro', () => {
  const [qw, qh] = m.quadro
  assert.ok(Number.isInteger(qw) && Number.isInteger(qh) && qw > qh)
  const partes = m.base.srcSet.split(', ').map((p) => p.split(' '))
  assert.deepEqual(partes.map((p) => p[1]), m.larguras.map((w) => `${w}w`))
  assert.ok(m.larguras.every((w, i) => i === 0 || w > m.larguras[i - 1]), 'escada em ordem crescente')
  assert.equal(m.base.src, partes[0][0], 'src = primeira pintura = a menor da escada')
  for (const [src, desc] of partes) {
    const arq = caminho(src)
    assert.ok(existsSync(arq), src)
    const w = parseInt(desc, 10)
    const [lw, lh] = dimensoesWebp(arq)
    assert.equal(lw, w, `${src}: largura`)
    assert.ok(Math.abs(lh - (qh * w) / qw) <= 1, `${src}: ${lw}x${lh} não tem a proporção do quadro ${qw}x${qh}`)
    assert.ok(statSync(arq).size <= 5 * 1024 * 1024, `${src} passa de 5 MB`)
  }
  assert.ok(statSync(caminho(m.base.src)).size <= 350 * 1024, 'primeira pintura passa de 350 KB')
  assert.match(m.base.placeholder, /^data:image\/webp;base64,/)
  assert.ok(m.base.placeholder.length <= 20 * 1024, 'placeholder borrado passa de 20 KB')
})

test('toda casa tem posição dentro da arte, números únicos e contíguos na ordem alfabética da legenda', () => {
  const casas = Object.entries(m.casas)
  assert.equal(casas.length, 27)
  const numeros = casas.map(([, c]) => c.numero).sort((a, b) => a - b)
  assert.deepEqual(numeros, Array.from({ length: 27 }, (_, i) => i + 1), 'números 1..27 uma vez cada')
  const dentro = (p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1
  for (const [slug, c] of casas) {
    assert.ok(c.nome && c.tema, slug)
    for (const k of ['ponto', 'centro', 'selo']) assert.ok(dentro(c[k]), `${slug}.${k} fora da arte`)
    const b = c.bandeira
    assert.ok(b.x0 >= 0 && b.y0 >= 0 && b.x1 <= 1 && b.y1 <= 1 && b.x0 < b.x1 && b.y0 < b.y1, `${slug}: caixa da bandeira`)
    assert.ok(c.centro.x > b.x0 && c.centro.x < b.x1 && c.centro.y > b.y0 && c.centro.y < b.y1, `${slug}: centro fora da caixa`)
    assert.ok(c.ponto.x >= b.x0 && c.ponto.x <= b.x1 && c.ponto.y >= b.y0 && c.ponto.y <= b.y1 + 1e-4, `${slug}: pé do mastro fora da caixa`)
    assert.ok(c.raio >= 0.012 && c.raio <= 0.04 && c.raio <= Math.max(0.012, c.vizinha / 2) + 1e-4, `${slug}: raio de acerto`)
  }
  // Numeração = ordem alfabética das casas (Wilker, 04/11: "A legenda é em ordem alfabética").
  const porNumero = casas.sort((a, b) => a[1].numero - b[1].numero).map(([, c]) => semAcento(c.nome))
  assert.deepEqual(porNumero, [...porNumero].sort(), 'a legenda deixou de ser alfabética')
})

test('bandeiras desenhadas: só a 22 (Paneer) e a Sicredi Natal se tocam na arte; as demais são alvos próprios', () => {
  const todas = [...Object.entries(m.casas).map(([, c]) => [String(c.numero), c.bandeira]), ...m.sicredi.map((s) => [s.nome, s.bandeira])]
  const tocam = []
  for (let i = 0; i < todas.length; i++) {
    for (let j = i + 1; j < todas.length; j++) {
      const a = todas[i][1]; const b = todas[j][1]
      if (!(a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0)) tocam.push([todas[i][0], todas[j][0]])
    }
  }
  // Pendência registrada em 15-caca-mapa-final.md: o canto da bandeira 22 encosta na bandeira da Sicredi Natal (desenho do Illustrator).
  assert.deepEqual(tocam, [['22', 'Sicredi Natal (sede)']], 'mudou quem se sobrepõe na arte: rever os alvos de toque')
})

test('unidades apontam para a casa que existe e para o ponto da bandeira dela', () => {
  const ids = Object.keys(m.unidades)
  assert.equal(ids.length, 41)
  for (const [id, u] of Object.entries(m.unidades)) {
    assert.match(id, /^u[0-9a-f]{6}$/)
    const c = m.casas[u.slug]
    assert.ok(c, `${id}: casa ${u.slug} não existe`)
    assert.equal(u.numero, c.numero)
    assert.deepEqual([u.x, u.y], [c.ponto.x, c.ponto.y], `${id} não aponta para o ponto da bandeira da casa`)
  }
  for (const slug of Object.keys(m.casas)) assert.ok(ids.some((id) => m.unidades[id].slug === slug), `${slug} sem unidade`)
  // O retrato é local (fora do git): num clone limpo a conferência com ele não roda.
  const arquivo = new URL('../src/edicao/dados/retrato/cartoon.local.json', import.meta.url)
  if (!existsSync(arquivo)) return
  const retrato = JSON.parse(readFileSync(arquivo, 'utf8'))
  const partes = retrato.participantes || retrato
  // Unidade cadastrada depois da arte herda o ponto da casa (completarUnidades, 10/11/2026); só casa sem bandeira fica sem lugar.
  const completo = completarUnidades(m, partes)
  assert.deepEqual(partes.flatMap((p) => (p.unidades || []).map((u) => u.id)).filter((id) => !completo.unidades[id]), [], 'unidade sem lugar na arte')
  for (const p of partes) assert.ok(m.casas[p.slug], `${p.slug} sem bandeira na arte`)
})

test('Sicredi é patrocinadora: três marcadores próprios, fora das casas, das unidades e da contagem', () => {
  assert.equal(m.sicredi.length, 3)
  assert.equal(new Set(m.sicredi.map((s) => s.nome)).size, 3)
  for (const s of m.sicredi) {
    assert.ok(s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1 && s.bandeira && s.raio, s.nome)
    assert.equal(s.numero, undefined, 'agência não tem número de casa')
    assert.ok(!Object.keys(m.casas).includes(s.nome))
  }
  assert.equal(Object.keys(m.casas).length, 27, 'a contagem de casas não inclui as agências')
  assert.ok(!Object.values(m.unidades).some((u) => /sicredi/i.test(u.slug)))
  const ag = agenciasSicredi(m.sicredi)
  assert.equal(ag.length, 3, 'cada marcador casa com uma agência oficial, sem sobra')
  assert.ok(ag.every((a) => ehSicredi(a.id) && a.x !== null && a.y !== null), 'toda agência tem lugar na arte')
})

test('o mundo continua entregando o formato que o Mundo e a rota consomem', () => {
  for (const k of ['quadro', 'larguras', 'unidades', 'marcos', 'sicredi', 'bandeiras', 'docerias', 'logos', 'aprovada']) assert.ok(k in m, k)
  assert.ok(m.marcos.every((x) => x.nome && x.x >= 0 && x.x <= 1 && x.y >= 0 && x.y <= 1))
  assert.ok(existsSync(caminho(m.sicrediBandeira)), 'a bandeira provisória da Sicredi segue no disco (compatibilidade)')
  for (const s of m.logos) assert.ok(existsSync(caminho(m.logo(s))), s)
})
