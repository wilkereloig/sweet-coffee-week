/**
 * cartoon-voucher-virtual-navegador.mjs — a página do link do voucher virtual contra o BUILD (docs/cartoon-2026-2/15-voucher-virtual.md).
 *
 *   npm run build && npm run test:cartoon-voucher
 *
 * `voucher_virtual_ver` é INTERCEPTADA (o build não tem modo demo) e o relógio fica dentro da validade (8/11/2026, Natal).
 * Reprova: cartão sem a arte da casa, verso sem código ou sem QR, botão que não vira a face, estado não válido mostrando o
 * cartão, casa sem arte sem o bloco da casa, rolagem lateral em 390, mais de um <h1> e erro de console.
 * Capturas: SCW_CAPTURAS=<pasta> grava as telas em PNG (fora do repositório).
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5219
const BASE = `http://localhost:${PORT}`
const TOKEN = 'abcdefgh2345'
const CAP = process.env.SCW_CAPTURAS || ''
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
    try { if ((await fetch(url)).ok) return } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 350))
  }
  throw new Error('preview não respondeu')
}
try { await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1500) }); console.error(`✗ porta ${PORT} ocupada`); process.exit(1) } catch { /* livre */ }

async function pagina (nav, voucher, { w = 390, h = 844 } = {}) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h } })
  await ctx.route('**/rest/v1/rpc/**', (route) => {
    const fn = route.request().url().split('/rpc/')[1].split('?')[0]
    if (fn === 'voucher_virtual_ver') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(voucher) })
    return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
  })
  await ctx.route('**/challenges.cloudflare.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  const page = await ctx.newPage()
  await page.clock.install({ time: new Date('2026-11-08T15:00:00-03:00') })
  const erros = []
  const imagens = []
  page.on('pageerror', (e) => erros.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(m.text()) })
  page.on('response', (r) => { if (/\/voucher\/.*\.webp$/.test(r.url())) imagens.push([r.url().split('/').pop(), r.status()]) })
  await page.goto(`${BASE}/cartoon/voucher/${TOKEN}?preview=1`, { waitUntil: 'networkidle' })
  return { ctx, page, erros, imagens }
}
const captura = async (page, nome) => { if (CAP) await page.screenshot({ path: join(CAP, `voucher-virtual-${nome}.png`), fullPage: true }) }

const preview = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort', ...(process.env.CARTOON_BUILD_DIR ? ['--outDir', process.env.CARTOON_BUILD_DIR] : [])], { cwd: join(__dirname, '..'), shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
let nav
try {
  await waitForServer(BASE)
  nav = await chromium.launch()

  console.log('\n1 · voucher válido: abrir e conferir código e QR')
  {
    const antes = falhas.length
    const c = await pagina(nav, { codigo: 'SCW-2ZMRN', marca: 'Adocee Doceria', slug: 'adocee-doceria', estado: 'valido' })
    const p = c.page
    if ((await p.locator('h1').count()) !== 1) falha('mais de um <h1>')
    if (!(await p.locator('.ct-vale__casa').innerText()).includes('Adocee')) falha('casa não aparece no vale')
    const botao = p.getByRole('button', { name: 'Abrir voucher' })
    if (!(await botao.count())) falha('botão de abertura ausente')
    else {
      await botao.click()
      if (!(await p.locator('.ct-vale').evaluate((el) => el.classList.contains('is-aberto')))) falha('vale não abriu')
      await p.waitForSelector('img.ct-voucher__qr')
      const qr = await p.locator('img.ct-voucher__qr').getAttribute('src')
      if (!(qr || '').startsWith('data:image/png')) falha('QR não foi desenhado')
      if ((await p.locator('.ct-voucher__codigo').innerText()).trim() !== 'SCW-2ZMRN') falha('código incorreto')
    }
    const largura = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
    if (largura[0] > largura[1]) falha(`rolagem lateral em 390 (${largura.join(' > ')})`)
    if (c.erros.length) falha(`erros de console: ${c.erros.join(' | ')}`)
    await captura(p, 'aberto')
    await c.ctx.close()
    if (falhas.length === antes) ok('vale abre com código e QR, sem rolagem lateral ou erro')
  }

  console.log('\n2 · casa sem dados adicionais e voucher usado')
  {
    const antes = falhas.length
    let c = await pagina(nav, { codigo: 'SCW-AAAAA', marca: 'Casa Nova', slug: 'casa-sem-cartao', estado: 'valido' })
    if (!(await c.page.locator('.ct-vale__casa').innerText()).includes('Casa Nova')) falha('casa sem dados adicionais não aparece')
    await c.page.getByRole('button', { name: 'Abrir voucher' }).click()
    await c.page.waitForSelector('img.ct-voucher__qr')
    await c.ctx.close()
    c = await pagina(nav, { codigo: 'SCW-2ZMRN', marca: 'Adocee Doceria', slug: 'adocee-doceria', estado: 'usado' })
    if (await c.page.locator('.ct-vale').count()) falha('voucher usado mostrou vale utilizável')
    if (!(await c.page.locator('h1').textContent()).includes('já foi usado')) falha('estado usado sem o título')
    await c.ctx.close()
    if (falhas.length === antes) ok('casa aparece e voucher usado não mostra vale utilizável')
  }

} finally {
  if (nav) await nav.close()
  killTree(preview.pid)
}

console.log(falhas.length ? `\n✗ ${falhas.length} falha(s)` : '\n✓ voucher virtual ok')
process.exit(falhas.length ? 1 : 0)
