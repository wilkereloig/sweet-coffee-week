/**
 * cartoon-navegador.mjs — camada de edição, fase 1 (docs/cartoon-2026-2/), contra o BUILD.
 *
 *   npm run build && npm run test:cartoon-navegador
 *
 * Reprova:
 *  1. GATE — sem ?preview, /cartoon mostra a Home institucional, com a casca dela.
 *  2. LINK DIRETO E RECARREGAR — cada cena abre por caminho limpo e sobrevive ao reload.
 *  3. HASH ANTIGO — #/cartoon/... e #/edicoes viram caminho limpo, sem nova entrada no histórico.
 *  4. NAVEGAÇÃO — clicar no menu da edição troca o caminho; voltar/avançar funcionam.
 *  5. LOVERS — endereços impressos da Lovers caem na Home, nunca na edição.
 *  6. CASCA — sem cabeçalho/abas institucionais; legais e "Sobre o festival" pelo rodapé;
 *     um <h1>; sem rolagem horizontal em 360 e 1440; console limpo.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5217
const BASE = `http://localhost:${PORT}`
const falhas = []
const falha = (m) => { falhas.push(m); console.log(`  ✗ ${m}`) }
const ok = (m) => console.log(`  ✓ ${m}`)

function killTree(pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    else process.kill(-pid, 'SIGKILL')
  } catch { /* já morto */ }
}
async function waitForServer(url, ms = 30000) {
  const t = Date.now()
  while (Date.now() - t < ms) {
    try { if ((await fetch(url)).ok) return } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 350))
  }
  throw new Error('preview não respondeu')
}
try { await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1500) }); console.error(`✗ porta ${PORT} ocupada`); process.exit(1) } catch { /* livre */ }

const titulo = (page) => page.textContent('h1')
const caminho = (page) => { const u = new URL(page.url()); return u.pathname + (u.hash || '') }

const preview = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  cwd: join(__dirname, '..'), shell: true, stdio: ['ignore', 'pipe', 'pipe'],
})
let navegador
try {
  await waitForServer(BASE)
  navegador = await chromium.launch()

  console.log('\n1 · gate')
  {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/cartoon`, { waitUntil: 'networkidle' })
    if (await page.locator('.ct-edicao').count()) falha('sem preview, /cartoon mostrou a edição')
    else ok('sem preview, /cartoon cai na Home institucional')
    if (!(await page.locator('.scw-header').count())) falha('sem preview, a casca institucional sumiu')
    await ctx.close()
  }

  console.log('\n2 · link direto e recarregar (preview)')
  const CENAS = [
    ['/cartoon', 'Sweet & Coffee Week Cartoon'],
    ['/cartoon/participantes', 'Participantes'],
    ['/cartoon/participantes/casa-exemplo', 'Participante'],
    ['/cartoon/combos', 'Combos'],
    ['/cartoon/combos/casa-exemplo', 'Participante'],
    ['/cartoon/mapa', 'Mapa'],
    ['/cartoon/minha-rota', 'Minha rota'],
    ['/cartoon/avaliar', 'Avaliar'],
    ['/cartoon/premiacao', 'Premiação'],
    ['/cartoon/nao-existe', 'Não encontramos essa página da Cartoon'],
  ]
  {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const erros = []
    page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()) })
    page.on('pageerror', (e) => erros.push(String(e)))
    for (const [p, h] of CENAS) {
      await page.goto(`${BASE}${p}?preview=1`, { waitUntil: 'networkidle' })
      if ((await titulo(page))?.trim() !== h) falha(`${p}: h1 "${await titulo(page)}" ≠ "${h}"`)
      await page.reload({ waitUntil: 'networkidle' })
      if ((await titulo(page))?.trim() !== h) falha(`${p}: recarregar perdeu a cena`)
      if ((await page.locator('h1').count()) !== 1) falha(`${p}: mais de um <h1>`)
    }
    if (erros.length) falha(`console com erro: ${erros.slice(0, 3).join(' | ')}`)
    if (falhas.length === 0) ok(`${CENAS.length} cenas abrem por link direto e sobrevivem ao recarregar`)

    console.log('\n3 · hash antigo vira caminho limpo')
    await page.goto(`${BASE}/?preview=1#/cartoon/mapa`, { waitUntil: 'networkidle' })
    if (caminho(page) !== '/cartoon/mapa' || (await titulo(page))?.trim() !== 'Mapa') falha(`#/cartoon/mapa → ${caminho(page)}`)
    await page.goto(`${BASE}/?preview=1#/edicoes`, { waitUntil: 'networkidle' })
    if (caminho(page) !== '/edicoes') falha(`#/edicoes → ${caminho(page)}`)
    else ok('#/cartoon/mapa e #/edicoes viram /cartoon/mapa e /edicoes')

    console.log('\n4 · navegação, voltar e avançar')
    await page.goto(`${BASE}/cartoon?preview=1`, { waitUntil: 'networkidle' })
    await page.click('.ct-topo__nav >> text=Mapa')
    await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Mapa')
    if (caminho(page) !== '/cartoon/mapa') falha(`menu → ${caminho(page)}`)
    if (!new URL(page.url()).searchParams.has('preview')) falha('navegar perdeu o ?preview')
    await page.goBack()
    await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Sweet & Coffee Week Cartoon')
    await page.goForward()
    await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Mapa')
    await page.click('.ct-rodape >> text=Política de Privacidade')
    await page.waitForFunction(() => location.pathname === '/privacidade')
    await page.goBack()
    await page.click('.ct-topo__nav >> text=Sobre o festival')
    await page.waitForFunction(() => location.pathname === '/' && !!document.querySelector('.scw-header'))
    ok('menu, rodapé, legais, voltar e avançar com caminho limpo')

    console.log('\n5 · endereços Lovers')
    for (const p of ['/lovers/combos/paneer-patisserie', '/mapa', '/participantes', '/rota']) {
      await page.goto(`${BASE}${p}?preview=1`, { waitUntil: 'networkidle' })
      await page.waitForFunction(() => location.pathname === '/', null, { timeout: 5000 }).catch(() => {})
      if (new URL(page.url()).pathname !== '/' || (await page.locator('.ct-edicao').count())) falha(`${p} não caiu na Home institucional`)
    }
    for (const h of ['#/lovers/combos/paneer-patisserie', '#/lovers/awards']) {
      await page.goto(`${BASE}/?preview=1${h}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      if (new URL(page.url()).pathname !== '/' || (await page.locator('.ct-edicao').count())) falha(`${h} não caiu na Home`)
    }
    if (!falhas.some((f) => /Home/.test(f))) ok('QR e links Lovers seguem na Home, nunca na edição')
    await ctx.close()
  }

  console.log('\n6 · casca e larguras')
  for (const [w, h] of [[360, 800], [1440, 900]]) {
    const ctx = await navegador.newContext({ viewport: { width: w, height: h } })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/cartoon?preview=1`, { waitUntil: 'networkidle' })
    const m = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      header: !!document.querySelector('.scw-header'),
      abas: !!document.querySelector('.scw-abas, .scw-tabbar, [class*="tab-bar"]'),
      rodapeInst: !!document.querySelector('.scw-footer'),
      alvos: [...document.querySelectorAll('.ct-edicao a, .ct-edicao button')].filter((e) => e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim()),
    }))
    if (m.overflow > 1) falha(`@${w}: rolagem horizontal (${m.overflow}px)`)
    if (m.header || m.rodapeInst || m.abas) falha(`@${w}: casca institucional dentro da edição`)
    if (m.alvos.length) falha(`@${w}: alvos abaixo de 44px: ${m.alvos.join(', ')}`)
    await ctx.close()
  }
  if (!falhas.some((f) => /^@/.test(f))) ok('360 e 1440: sem rolagem lateral, casca própria, alvos ≥ 44px')
} finally {
  if (navegador) await navegador.close()
  killTree(preview.pid)
}

console.log(falhas.length ? `\n✗ ${falhas.length} falha(s)` : '\n✓ cartoon ok')
process.exit(falhas.length ? 1 : 0)
