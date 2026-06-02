// Gera PNGs nítidos do favicon a partir de public/favicon-sweet.svg.
// Uso: node scripts/gen-favicon.mjs
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(resolve(root, 'public/favicon-sweet.svg'), 'utf8')

const sizes = [512, 192, 180, 96, 48, 32]
const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })

for (const s of sizes) {
  const sized = svg.replace('<svg ', `<svg width="${s}" height="${s}" `)
  await page.setViewportSize({ width: s, height: s })
  await page.setContent(
    `<!doctype html><html><body style="margin:0;padding:0">${sized}</body></html>`,
    { waitUntil: 'networkidle' }
  )
  const el = await page.$('svg')
  await el.screenshot({ path: resolve(root, `public/favicon-${s}.png`), omitBackground: true })
  console.log(`ok favicon-${s}.png`)
}

await browser.close()
