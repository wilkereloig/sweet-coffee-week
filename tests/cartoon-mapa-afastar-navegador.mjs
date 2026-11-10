/*
 * Mapa da Doçura · pins que se cobrem (afastar.js): no mapa ILUSTRADO, em celular e desktop e em vários zooms, nenhum pin
 * visível cobre outro, cada pin afastado tem seu fio (que nasce no ponto verdadeiro e termina na ponta do pin), grupo grande
 * vira selo com nome acessível e o selo aproxima; nenhum pin some sem um selo no lugar. Playwright de verdade.
 *
 *   npm run test:mapa-afastar          (sobe o vite dev na 5212, sem build, e derruba ao terminar)
 *   MAPA_E2E_REUSAR=1 npm run test:mapa-afastar   (usa um servidor já aberto na 5212)
 *   MAPA_E2E_CAPTURAS=<pasta>          (onde salvar as capturas; padrão: pasta temporária do sistema)
 *
 * O mapa REAL (Google/MapLibre) depende de tiles e de chave externos: o desenho e a aritmética dele são os mesmos
 * (tests/cartoon-afastar.test.mjs); a conferência no provedor é visual.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5212
const BASE = `http://localhost:${PORT}`
const CAPTURAS = process.env.MAPA_E2E_CAPTURAS || join(tmpdir(), `mapa-afastar-${Date.now().toString(36)}`)
mkdirSync(CAPTURAS, { recursive: true })
const reusar = process.env.MAPA_E2E_REUSAR === '1'
const falhas = []
const ok = (m) => console.log(`  ✓ ${m}`)
const checar = (c, m) => { if (c) ok(m); else { falhas.push(m); console.log(`  ✗ ${m}`) } return !!c }
const CONSENTIMENTO = () => JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 })

function matar (pid) { if (!pid) return; try { process.platform === 'win32' ? execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }) : process.kill(-pid, 'SIGKILL') } catch { /* já morto */ } }
const responde = async () => { try { return (await fetch(`${BASE}/cartoon`, { signal: AbortSignal.timeout(1500) })).ok } catch { return false } }
if (!reusar && await responde()) { console.error(`✗ porta ${PORT} ocupada (use MAPA_E2E_REUSAR=1 para reaproveitar o servidor)`); process.exit(1) }
const servidor = reusar ? null : spawn(`npx vite --port ${PORT} --strictPort`, { cwd: join(__dirname, '..'), shell: true, stdio: 'ignore' })

// Lê o desenho: os pins que estão à vista (fora de selo), os selos, os fios e o que se cobre.
const ler = (page) => page.evaluate(() => {
  const todos = [...document.querySelectorAll('.ct-mundo__casa, .ct-mundo__sicredi')]
  const vistos = todos.filter((b) => !b.classList.contains('is-agrupado'))
  const caixa = (b) => { const r = b.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom } }
  const cobre = []
  for (let i = 0; i < vistos.length; i++) {
    for (let j = i + 1; j < vistos.length; j++) {
      const a = caixa(vistos[i]); const c = caixa(vistos[j])
      const dx = Math.min(a.r, c.r) - Math.max(a.l, c.l); const dy = Math.min(a.b, c.b) - Math.max(a.t, c.t)
      // o botão é maior que o desenho (alvo de 44 px, selos no aro): só conta cobertura clara, de mais de 8 px nos dois eixos
      if (dx > 8 && dy > 8) cobre.push(`${vistos[i].getAttribute('aria-label')?.slice(0, 24)} × ${vistos[j].getAttribute('aria-label')?.slice(0, 24)} (${Math.round(dx)}×${Math.round(dy)})`)
    }
  }
  const fios = [...document.querySelectorAll('.ct-mundo__fio')].map((f) => {
    const l = f.querySelector('.ct-fio__linha')
    return { left: f.style.left, top: f.style.top, x2: Number(l.getAttribute('x2')), y2: Number(l.getAttribute('y2')) }
  })
  const afastados = vistos.filter((b) => (parseFloat(b.style.getPropertyValue('--dx')) || 0) !== 0 || (parseFloat(b.style.getPropertyValue('--dy')) || 0) !== 0)
  const semFio = afastados.filter((b) => !fios.some((f) => f.left === b.style.left && f.top === b.style.top
    && Math.abs(f.x2 - parseFloat(b.style.getPropertyValue('--dx'))) < 0.6 && Math.abs(f.y2 - parseFloat(b.style.getPropertyValue('--dy'))) < 0.6)).map((b) => b.getAttribute('aria-label')?.slice(0, 30))
  const selos = [...document.querySelectorAll('.ct-mundo__selo')].map((s) => ({ nome: s.getAttribute('aria-label'), n: Number(s.textContent) }))
  return {
    total: todos.length, vistos: vistos.length, agrupados: todos.length - vistos.length, afastados: afastados.length, fios: fios.length,
    semFio, selos, cobre, z: Number(document.querySelector('.ct-mundo__palco').dataset.z),
  }
})

async function abrir (nav, { w, h, toque = false }) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque, deviceScaleFactor: toque ? 2 : 1 })
  await ctx.addInitScript((c) => { try { localStorage.setItem('scw_privacidade', c) } catch { /* sem storage */ } }, CONSENTIMENTO())
  await ctx.route('**/tiles.openfreemap.org/**', (r) => r.abort('failed'))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e.message || e).slice(0, 200)))
  await page.goto(`${BASE}/cartoon/mapa?tela=normal&preview=1`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.locator('.ct-mundo__palco').waitFor({ timeout: 30000 })
  await page.locator('.ct-mundo__casa').first().waitFor({ state: 'attached', timeout: 30000 })
  await page.evaluate(() => document.querySelector('.ct-mapa__moldura').scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(900) // a câmera assenta (160 ms) e o afastamento desliza (180 ms)
  return { ctx, page, erros }
}

async function cenario (nav, nome, cfg) {
  console.log(`\n${nome}`)
  const c = await abrir(nav, cfg)
  const mais = c.page.getByRole('button', { name: /aproximar/i }).first()
  for (let passo = 0; passo < 4; passo++) {
    const s = await ler(c.page)
    const rot = `${nome} · zoom ${s.z.toFixed(2)}`
    checar(s.cobre.length === 0, `${rot}: nenhum pin visível cobre outro${s.cobre.length ? ` — ${s.cobre.slice(0, 3).join('; ')}` : ''}`)
    checar(s.semFio.length === 0, `${rot}: todo pin afastado (${s.afastados}) tem o fio ligado ao seu ponto${s.semFio.length ? ` — sem fio: ${s.semFio.join(', ')}` : ''}`)
    checar(s.fios >= s.afastados, `${rot}: ${s.fios} fios para ${s.afastados} pins afastados`)
    checar(s.agrupados === 0 || s.selos.length > 0, `${rot}: pin só some quando há um selo no lugar (${s.agrupados} em ${s.selos.length} selos)`)
    checar(s.selos.every((x) => /muito próximos/.test(x.nome) && x.n >= 2), `${rot}: selos com contagem e nome acessível`)
    await c.page.screenshot({ path: join(CAPTURAS, `${nome.replace(/\W+/g, '-')}-zoom${s.z.toFixed(1)}.png`) }).catch(() => null)
    if (s.selos.length) {
      // o selo aproxima: depois do toque o zoom é maior e o grupo se abre
      await c.page.locator('.ct-mundo__selo').first().click({ force: true })
      await c.page.waitForTimeout(1100)
      const d = await ler(c.page)
      checar(d.z > s.z + 0.2, `${rot}: tocar no selo aproxima (${s.z.toFixed(2)} → ${d.z.toFixed(2)})`)
      checar(d.selos.length < s.selos.length || d.agrupados < s.agrupados, `${rot}: depois do toque o grupo se abre (${s.agrupados} → ${d.agrupados} escondidos)`)
    }
    if (await mais.isDisabled()) break
    await mais.click(); await c.page.waitForTimeout(900)
  }
  checar(c.erros.length === 0, `${nome}: sem erro de página${c.erros.length ? ` — ${c.erros[0]}` : ''}`)
  await c.ctx.close()
}

let nav
try {
  nav = await chromium.launch()
  await cenario(nav, 'celular 390×844', { w: 390, h: 844, toque: true })
  await cenario(nav, 'desktop 1440×900', { w: 1440, h: 900 })
  await cenario(nav, 'tablet 820×1180', { w: 820, h: 1180, toque: true })
} catch (e) { falhas.push(`erro fatal: ${String(e.message || e).split('\n')[0]}`); console.log(`✗ erro fatal: ${e.message}`) } finally {
  await nav?.close().catch(() => null)
  matar(servidor?.pid)
}
console.log(`\ncapturas em ${CAPTURAS}`)
if (falhas.length) { console.log(`\n✗ ${falhas.length} falha(s)`); process.exit(1) }
console.log('\n✓ mapa: afastamento de pins ok')
