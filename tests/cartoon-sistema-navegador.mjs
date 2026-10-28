/**
 * cartoon-sistema-navegador.mjs — vitrine do sistema visual da Cartoon no SERVIDOR DE DESENVOLVIMENTO.
 *
 *   npm run test:cartoon-sistema
 *
 * A vitrine (/cartoon/sistema) só existe no DEV (docs/cartoon-2026-2/10 §10.12),
 * então este teste sobe o `vite`, não o build. Reprova, em 360, 768 e 1440:
 *  1. mais de um <h1>; erro no console;
 *  2. Grandstander não carregada ou não aplicada ao texto;
 *  3. rolagem lateral;
 *  4. botão ou link da vitrine com menos de 44px de altura.
 * Guarda capturas em tests/capturas-sistema/ para a conferência visual do Wilker.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5218
const BASE = `http://localhost:${PORT}`
const CAPTURAS = join(__dirname, 'capturas-sistema')
const TELAS = [[360, 780], [768, 1024], [1440, 900]]
const falhas = []
const falha = (m) => { falhas.push(m); console.log(`  ✗ ${m}`) }
const ok = (m) => console.log(`  ✓ ${m}`)

function killTree (pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    else process.kill(-pid, 'SIGKILL')
  } catch { /* já morto */ }
}

async function waitForServer (url, ms = 30000) {
  const t = Date.now()
  while (Date.now() - t < ms) {
    try { if ((await fetch(url)).ok) return } catch { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`servidor não respondeu em ${ms}ms`)
}

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: join(__dirname, '..'), shell: true, stdio: 'ignore', detached: process.platform !== 'win32',
})
let browser
try {
  await waitForServer(`${BASE}/`)
  mkdirSync(CAPTURAS, { recursive: true })
  browser = await chromium.launch()
  for (const [w, h] of TELAS) {
    console.log(`\n${w}×${h}`)
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    const erros = []
    // Falha de rede da RPC da edição não é da vitrine (ela não usa dado); o resto é.
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erros.push(m.text()) })
    page.on('pageerror', (e) => erros.push(e.message))
    // Vite recém-subido transforma os módulos sob demanda: a 1ª tela leva ~30s no Windows.
    await page.goto(`${BASE}/cartoon/sistema`, { waitUntil: 'networkidle', timeout: 120000 })
    await page.waitForSelector('.ct-vitrine', { timeout: 20000 })
    await page.evaluate(() => document.fonts.ready)
    const r = await page.evaluate(() => {
      const corpo = document.querySelector('.ct-vitrine .ct-bloco > p:not([class])')
      const alvos = [...document.querySelectorAll('.ct-vitrine a, .ct-vitrine button')]
        .filter((e) => e.offsetParent !== null)
        .map((e) => ({ texto: e.textContent.trim(), altura: Math.round(e.getBoundingClientRect().height) }))
      return {
        h1: document.querySelectorAll('h1').length,
        carregada: document.fonts.check('500 18px Grandstander'),
        familia: getComputedStyle(corpo).fontFamily,
        lateral: document.documentElement.scrollWidth - window.innerWidth,
        baixos: alvos.filter((a) => a.altura < 44),
      }
    })
    if (r.h1 === 1) ok('um <h1>'); else falha(`${w}: ${r.h1} <h1>`)
    if (r.carregada && /Grandstander/.test(r.familia)) ok('Grandstander aplicada'); else falha(`${w}: fonte "${r.familia}", carregada=${r.carregada}`)
    if (r.lateral <= 0) ok('sem rolagem lateral'); else falha(`${w}: rolagem lateral de ${r.lateral}px`)
    if (r.baixos.length === 0) ok('alvos ≥ 44px'); else falha(`${w}: alvos baixos ${JSON.stringify(r.baixos)}`)
    if (erros.length === 0) ok('console limpo'); else falha(`${w}: console — ${erros.join(' | ')}`)
    await page.screenshot({ path: join(CAPTURAS, `sistema-${w}.png`), fullPage: true })
    await page.close()
  }
} finally {
  await browser?.close()
  killTree(vite.pid)
}
if (falhas.length) { console.log(`\n${falhas.length} falha(s)`); process.exit(1) }
console.log('\nvitrine ok')
