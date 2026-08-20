// Gera src/data/focalPoints.js a partir do acervo real de fotos (edicoes +
// combos). Roda headless Chromium (playwright, ja instalado no projeto) pra
// desenhar cada imagem num canvas, amostrar uma grade pequena de pixels e
// estimar onde esta o "assunto" (a comida) por saliencia visual.
//
// HONESTIDADE SOBRE O HEURISTICO (nao e deteccao de objeto real):
//   Nao ha classificador nem deteccao de "comida" de fato — e um proxy de
//   processamento de sinal: pratos/mesas/embalagens tendem a ser mais neutros
//   (bege/branco/madeira) e menos texturizados que o alimento fotografado,
//   entao "cor viva + variacao local alta" tende a cair sobre o assunto. Em
//   fotos onde o fundo tambem e colorido (ex.: toalha estampada, letreiro),
//   o heuristico pode errar. Por isso o resultado e sempre clampado pra
//   [18, 82] — nunca produz crop extremo mesmo quando erra feio.
//
// Uso: node scripts/compute-focal-points.mjs
// Regenerar sempre que entrar foto nova em public/images/edicoes ou /combos.
import { chromium } from 'playwright'
import http from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { extname, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { EDITION_GALLERY } from '../src/data/editionGallery.js'
import { COMBO_PHOTOS } from '../src/data/comboPhotos.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = join(__dirname, '..', 'public')
const OUT_FILE = join(__dirname, '..', 'src', 'data', 'focalPoints.js')

const GRID = 40 // grade de amostragem (40x40 celulas) — suficiente pra saliencia grosseira
const EDGE_WEIGHT = 1.6 // peso relativo do termo de contraste/borda vs. colorfulness (calibrado manualmente)
// Contraste aplicado ao score bruto antes do centroide. Sem isso o centroide
// pondera TODAS as celulas (inclusive fundo pouco saliente) e regride quase
// sempre pra perto do centro geometrico (testado: std ~2-5 em 0-100, quase
// todo mundo 40-60). Elevar ao quadrado realca as celulas de pico (o
// provavel assunto) e deixa o fundo homogeneo pesar bem menos — calibrado
// olhando amostras reais (ver historico do dev): POWER=1 nao discriminava,
// POWER=2 produziu deslocamentos claros e plausiveis sem estourar pro clamp.
const SALIENCY_POWER = 2
const CLAMP_MIN = 18
const CLAMP_MAX = 82
const CONCURRENCY = 6

const MIME = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }

// --- 1. lista de imagens (edicoes + combos), deduplicada -------------------
function collectImagePaths() {
  const set = new Set()
  for (const list of Object.values(EDITION_GALLERY)) for (const p of list) set.add(p)
  for (const p of COMBO_PHOTOS) set.add(p)
  return [...set]
}

// --- 2. servidor estatico local (evita tainted-canvas de file://) ---------
function startStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    const reqPath = decodeURIComponent(req.url.split('?')[0])
    const filePath = join(rootDir, reqPath)
    if (!filePath.startsWith(rootDir)) { res.writeHead(403); res.end(); return }
    try {
      const stat = statSync(filePath)
      if (!stat.isFile()) { res.writeHead(404); res.end(); return }
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream' })
      createReadStream(filePath).pipe(res)
    } catch {
      res.writeHead(404); res.end()
    }
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}

// --- 3. heuristico de saliencia (roda dentro da pagina) -------------------
// ponytail: sem deteccao de objeto real — saturacao + contraste local (Sobel-lite),
// upgrade pra um modelo de subject-detection real fica pra quando/se houver ML no pipeline.
function focalScript({ grid, edgeWeight, power }) {
  const img = document.querySelector('img')
  if (!img || !img.naturalWidth) return null
  const canvas = document.createElement('canvas')
  canvas.width = grid
  canvas.height = grid
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, grid, grid)
  let data
  try {
    data = ctx.getImageData(0, 0, grid, grid).data
  } catch {
    return null
  }
  const lum = new Float32Array(grid * grid)
  const weight = new Float32Array(grid * grid)
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const i = (y * grid + x) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2]
      lum[y * grid + x] = 0.299 * r + 0.587 * g + 0.114 * b
      weight[y * grid + x] = Math.max(r, g, b) - Math.min(r, g, b) // colorfulness
    }
  }
  let sumW = 0, sumX = 0, sumY = 0
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const idx = y * grid + x
      const right = x + 1 < grid ? Math.abs(lum[idx] - lum[idx + 1]) : 0
      const down = y + 1 < grid ? Math.abs(lum[idx] - lum[idx + grid]) : 0
      const raw = weight[idx] + edgeWeight * (right + down)
      const w = Math.pow(raw, power)
      sumW += w
      sumX += w * (x + 0.5)
      sumY += w * (y + 0.5)
    }
  }
  if (sumW <= 0) return { x: 50, y: 50 }
  return {
    x: Math.round((sumX / sumW / grid) * 100),
    y: Math.round((sumY / sumW / grid) * 100),
  }
}

function clamp(n) { return Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, n)) }

// --- 4. pool de paginas com concorrencia limitada -------------------------
async function processAll(browser, baseUrl, paths) {
  const results = {}
  const failed = []
  let cursor = 0
  const context = await browser.newContext()

  async function worker() {
    const page = await context.newPage()
    while (cursor < paths.length) {
      const idx = cursor++
      const path = paths[idx]
      try {
        await page.goto(baseUrl + path, { waitUntil: 'load', timeout: 15000 })
        const point = await page.evaluate(focalScript, { grid: GRID, edgeWeight: EDGE_WEIGHT, power: SALIENCY_POWER })
        if (!point) { failed.push(path); continue }
        results[path] = { x: clamp(point.x), y: clamp(point.y) }
      } catch (err) {
        failed.push(path)
      }
    }
    await page.close()
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, paths.length) }, () => worker())
  await Promise.all(workers)
  await context.close()
  return { results, failed }
}

// --- 5. main ---------------------------------------------------------------
async function main() {
  const paths = collectImagePaths()
  console.log(`Imagens unicas encontradas: ${paths.length}`)

  const { server, port } = await startStaticServer(PUBLIC_DIR)
  const baseUrl = `http://127.0.0.1:${port}`
  const browser = await chromium.launch()

  const t0 = Date.now()
  const { results, failed } = await processAll(browser, baseUrl, paths)
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  await browser.close()
  server.close()

  const entries = Object.entries(results)
  const xs = entries.map(([, p]) => p.x)
  const ys = entries.map(([, p]) => p.y)
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
  const std = (arr) => { const m = avg(arr); return Math.sqrt(avg(arr.map((v) => (v - m) ** 2))) }

  console.log(`Processadas: ${entries.length}/${paths.length} em ${elapsed}s`)
  console.log(`x: min=${Math.min(...xs)} max=${Math.max(...xs)} avg=${avg(xs).toFixed(1)} std=${std(xs).toFixed(1)}`)
  console.log(`y: min=${Math.min(...ys)} max=${Math.max(...ys)} avg=${avg(ys).toFixed(1)} std=${std(ys).toFixed(1)}`)
  if (failed.length) console.log(`Falharam (omitidas, fallback 50/50 via focalPosition): ${failed.join(', ')}`)

  const lines = entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, p]) => `  ${JSON.stringify(path)}: { x: ${p.x}, y: ${p.y} },`)

  const out = `// GERADO por scripts/compute-focal-points.mjs — NAO editar a mao.
// Ponto focal por imagem (object-position para object-fit:cover), derivado de
// um heuristico de saliencia (saturacao + contraste local), nao de deteccao
// de objeto real — ausencia de match = fallback 50/50 (centro).
// Regenerar: node scripts/compute-focal-points.mjs
export const FOCAL_POINTS = {
${lines.join('\n')}
}

export function focalPosition(src) {
  const p = FOCAL_POINTS[src]
  return p ? \`\${p.x}% \${p.y}%\` : '50% 50%'
}
`
  await writeFile(OUT_FILE, out, 'utf8')
  console.log(`Escrito: ${OUT_FILE}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
