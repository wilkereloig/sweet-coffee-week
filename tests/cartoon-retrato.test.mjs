// Retrato local da edição Cartoon (E3, docs/cartoon-2026-2/10 §10.9 e §10.14).
//  - a ordem de leitura (demo > retrato > RPC) e a ausência do arquivo, com o publico.js REAL carregado pelo Vite;
//  - o formato do arquivo local, quando ele existe nesta máquina (está no .gitignore: em outra máquina estes testes pulam).
// O build de produção sem o retrato é conferido em tests/cartoon-rota.test.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createServer } from 'vite'
import { escolherFonte, diaMesDoRetrato } from '../src/edicao/dados/modelo.js'

const RAIZ = path.resolve('.')
const ARQUIVO = path.join(RAIZ, 'src/edicao/dados/retrato/cartoon.local.json')
const temArquivo = fs.existsSync(ARQUIVO)

// ------------------------------------------------------------- decisão pura
test('fonte dos dados: produção só lê a RPC; no DEV demo > retrato > RPC', () => {
  assert.equal(escolherFonte({ dev: false, demo: true, retrato: true }), 'rpc')
  assert.equal(escolherFonte({ dev: false }), 'rpc')
  assert.equal(escolherFonte({ dev: true, demo: true, retrato: true }), 'demo')
  assert.equal(escolherFonte({ dev: true, demo: false, retrato: true }), 'retrato')
  assert.equal(escolherFonte({ dev: true, demo: false, retrato: false }), 'rpc', 'sem o arquivo, cai na RPC')
  assert.equal(escolherFonte(), 'rpc')
})

test('dia/mês da leitura do retrato', () => {
  assert.equal(diaMesDoRetrato('2026-10-28T01:17:34'), '28/10')
  assert.equal(diaMesDoRetrato(''), '')
  assert.equal(diaMesDoRetrato(undefined), '')
  assert.equal(diaMesDoRetrato('lixo'), '')
})

test('o retrato e a pasta de imagens estão no .gitignore (repositório público)', () => {
  const linhas = fs.readFileSync(path.join(RAIZ, '.gitignore'), 'utf8').split(/\r?\n/).map((l) => l.trim())
  assert.ok(linhas.includes('src/edicao/dados/retrato/cartoon.local.json'))
  assert.ok(linhas.includes('public/retrato-local/'))
})

// ------------------------------------------------------------- publico.js real, com e sem o retrato
const ARQUIVOS_DO_MODULO = ['src/edicao/dados/publico.js', 'src/edicao/dados/modelo.js', 'src/edicao/dados/horarioFestival.js',
  'src/edicao/dados/demo/cartoon.js', 'src/lib/supabaseConfig.js']

/** Projeto mínimo em pasta temporária com o publico.js de verdade; `retrato` (objeto) vira o cartoon.local.json dele. */
async function carregarPublico (retrato) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scw-retrato-'))
  for (const rel of ARQUIVOS_DO_MODULO) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    fs.copyFileSync(path.join(RAIZ, rel), path.join(dir, rel))
  }
  if (retrato) {
    fs.mkdirSync(path.join(dir, 'src/edicao/dados/retrato'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'src/edicao/dados/retrato/cartoon.local.json'), JSON.stringify(retrato))
  }
  const servidor = await createServer({
    configFile: false, root: dir, logLevel: 'silent', appType: 'custom', clearScreen: false,
    server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] },
  })
  const modulo = await servidor.ssrLoadModule('/src/edicao/dados/publico.js')
  return { modulo, fechar: async () => { await servidor.close(); fs.rmSync(dir, { recursive: true, force: true }) } }
}

const FALSO = {
  retrato: { lido_em: '2026-10-28T01:17:34' },
  edicao: { codigo: '2026.2' }, fase: 'em_andamento', participantes_publicos: true, combos_publicos: true,
  participantes: [{ slug: 'casa-do-retrato', casa: { nome: 'Casa do Retrato' } }],
}

/** Roda `corpo` com fetch trocado por um espião e `window` simulado (a busca decide o ?demo=1). */
async function comAmbiente (busca, corpo) {
  const chamadas = []
  const fetchAntes = globalThis.fetch
  globalThis.fetch = async (url) => {
    chamadas.push(String(url))
    return { ok: true, json: async () => ({ edicao: { codigo: '2026.2' }, fase: 'preparacao', participantes: [] }) }
  }
  if (busca) globalThis.window = { location: { search: busca } }
  try { await corpo(chamadas) } finally {
    globalThis.fetch = fetchAntes
    delete globalThis.window
  }
}

test('DEV com o arquivo: a edição e a casa vêm do retrato, sem tocar na rede', async () => {
  const { modulo, fechar } = await carregarPublico(FALSO)
  try {
    await comAmbiente('', async (chamadas) => {
      const edicao = await modulo.carregarEdicao('2026.2')
      assert.equal(edicao.retrato.lido_em, FALSO.retrato.lido_em)
      assert.equal(edicao.participantes[0].slug, 'casa-do-retrato')
      assert.equal(edicao.desatualizado, false)
      const casa = await modulo.carregarParticipante('2026.2', 'casa-do-retrato')
      assert.equal(casa.estado, 'publicado')
      assert.equal(casa.fase, 'em_andamento')
      assert.equal(casa.retrato.lido_em, FALSO.retrato.lido_em)
      assert.equal((await modulo.carregarParticipante('2026.2', 'nao-existe')).estado, 'inexistente')
      assert.deepEqual(chamadas, [])
    })
  } finally { await fechar() }
})

test('DEV com o arquivo, mas ?demo=1: a demonstração vence o retrato', async () => {
  const { modulo, fechar } = await carregarPublico(FALSO)
  try {
    await comAmbiente('?demo=1', async (chamadas) => {
      const edicao = await modulo.carregarEdicao('2026.2')
      assert.equal(edicao.demo, true)
      assert.equal(edicao.retrato, undefined)
      assert.deepEqual(chamadas, [])
    })
  } finally { await fechar() }
})

test('o retrato de outra edição não responde por esta: cai na RPC', async () => {
  const { modulo, fechar } = await carregarPublico(FALSO)
  try {
    await comAmbiente('', async (chamadas) => {
      const edicao = await modulo.carregarEdicao('2026.1')
      assert.equal(edicao.retrato, undefined)
      assert.equal(chamadas.length, 1)
      assert.match(chamadas[0], /rpc\/edicao_publica$/)
    })
  } finally { await fechar() }
})

test('DEV sem o arquivo (outra máquina): cai na RPC e não quebra', async () => {
  const { modulo, fechar } = await carregarPublico(null)
  try {
    await comAmbiente('', async (chamadas) => {
      const edicao = await modulo.carregarEdicao('2026.2')
      assert.equal(edicao.retrato, undefined)
      assert.equal(edicao.fase, 'preparacao')
      assert.equal(chamadas.length, 1)
      assert.match(chamadas[0], /rpc\/edicao_publica$/)
    })
  } finally { await fechar() }
})

// ------------------------------------------------------------- o arquivo local, quando existe
const PRIVADO = /"(email|telefone|responsavel|cnpj|razao_social|custo_\w+|pagamento_\w+|combo_revisao_nota|user_id|senha)"\s*:/

/** Largura × altura de um WebP (VP8, VP8L ou VP8X), lidas do cabeçalho. */
function medidaWebp (arquivo) {
  const b = fs.readFileSync(arquivo)
  assert.equal(b.toString('ascii', 0, 4), 'RIFF')
  assert.equal(b.toString('ascii', 8, 12), 'WEBP')
  const tipo = b.toString('ascii', 12, 16)
  if (tipo === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]
  if (tipo === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1] }
  if (tipo === 'VP8X') return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1]
  throw new Error(`webp desconhecido: ${tipo}`)
}

test('retrato local: envelope, casas e privacidade', { skip: !temArquivo && 'sem src/edicao/dados/retrato/cartoon.local.json (arquivo local)' }, () => {
  const r = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'))
  assert.equal(r.edicao.codigo, '2026.2')
  assert.equal(r.fase, 'em_andamento')
  assert.equal(r.participantes_publicos, true)
  assert.equal(r.combos_publicos, true)
  assert.equal(r.resultados_publicos, false)
  assert.match(r.retrato.lido_em, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
  assert.ok(diaMesDoRetrato(r.retrato.lido_em))
  assert.equal(r.participantes.length, r.retrato.casas)
  assert.ok(r.participantes.length > 0)

  const slugs = r.participantes.map((p) => p.slug)
  assert.equal(new Set(slugs).size, slugs.length, 'slug repetido')
  for (const p of r.participantes) {
    assert.ok(p.casa?.nome, `${p.slug} sem nome`)
    assert.match(p.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/)
    if (p.slug_provisorio) assert.equal(p.slug_provisorio, true)
  }
  assert.doesNotMatch(JSON.stringify(r), PRIVADO, 'campo privado no retrato')

  // O valor do combo é da organização e vale para todas as casas.
  const precos = new Set(r.participantes.map((p) => p.combo?.preco).filter((v) => v != null))
  assert.ok(precos.size <= 1, `preço diferente entre casas: ${[...precos]}`)
})

test('retrato local: coordenadas dentro da Grande Natal e as geocodificadas marcadas a conferir', { skip: !temArquivo && 'sem retrato local' }, () => {
  const r = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'))
  const ids = new Set()
  for (const p of r.participantes) for (const u of p.unidades || []) {
    assert.ok(!ids.has(u.id), `unidade repetida: ${u.id}`)
    ids.add(u.id)
    if (!u.coordenada) continue
    assert.ok(u.coordenada.lat < -5.5 && u.coordenada.lat > -6.1, `${u.id}: lat fora de Natal`)
    assert.ok(u.coordenada.lng < -35.0 && u.coordenada.lng > -35.5, `${u.id}: lng fora de Natal`)
    if (u.coordenada.fonte) {
      assert.equal(u.coordenada.conferir, true, `${u.id}: coordenada geocodificada sem "conferir"`)
      assert.equal(u.coordenada.fonte, 'osm-nominatim')
    }
  }
  const sem = (r.retrato.sem_coordenada || []).map((x) => x.unidade)
  if (r.retrato.geocodificado_em) {
    const semDeFato = [...ids].filter((id) => !r.participantes.some((p) => (p.unidades || []).some((u) => u.id === id && u.coordenada)))
    assert.deepEqual([...sem].sort(), semDeFato.sort(), 'sem_coordenada diverge das unidades sem coordenada')
  }
})

test('retrato local: logos desenhadas existem e as duas versões têm exatamente a mesma medida', { skip: !temArquivo && 'sem retrato local' }, () => {
  const r = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'))
  const com = r.participantes.filter((p) => p.casa.logo_desenhada)
  if (!com.length) return // as logos desenhadas são um passo à parte (scripts/edicao/logos-desenhadas.py)
  for (const p of com) {
    const l = p.casa.logo_desenhada
    for (const v of ['pb', 'cor']) {
      assert.match(l[v], new RegExp(`^/retrato-local/logos-desenhadas/${p.slug}-${v}\\.webp$`))
      assert.ok(fs.existsSync(path.join(RAIZ, 'public', l[v])), `arquivo ausente: ${l[v]}`)
    }
    const a = medidaWebp(path.join(RAIZ, 'public', l.pb))
    const b = medidaWebp(path.join(RAIZ, 'public', l.cor))
    assert.deepEqual(a, b, `${p.slug}: pb e cor com medida diferente`)
    assert.deepEqual([l.largura, l.altura], a, `${p.slug}: largura/altura do JSON não bate com o arquivo`)
  }
})
