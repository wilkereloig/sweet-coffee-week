import { chromium } from 'playwright'
const BASE = 'http://localhost:5212'
const nav = await chromium.launch()
const vistas = [{ n: 'celular', w: 390, h: 844, t: true }, { n: 'desktop', w: 1440, h: 900 }]
for (const v of vistas) {
  const ctx = await nav.newContext({ viewport: { width: v.w, height: v.h }, hasTouch: !!v.t, isMobile: !!v.t, deviceScaleFactor: v.t ? 2 : 1 })
  await ctx.addInitScript((c) => { localStorage.setItem('scw_privacidade', c) }, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 }))
  await ctx.route('**/tiles.openfreemap.org/**', (r) => r.abort('failed'))
  const page = await ctx.newPage()
  await page.goto(`${BASE}/cartoon/mapa?preview=1`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.locator('.ct-mundo__palco').waitFor({ timeout: 30000 })
  await page.waitForTimeout(1500)
  await page.evaluate(() => document.querySelector('.ct-mapa__moldura').scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(800)
  const r = await page.evaluate(() => {
    const bs = [...document.querySelectorAll('.ct-mundo__casa, .ct-mundo__sicredi')]
    return { total: bs.length, agrupados: bs.filter((b) => b.classList.contains('is-agrupado')).length, afastados: bs.filter((b) => b.style.getPropertyValue('--dx') && b.style.getPropertyValue('--dx') !== '0.0px' || b.style.getPropertyValue('--dy') && b.style.getPropertyValue('--dy') !== '0.0px').length, selos: [...document.querySelectorAll('.ct-mundo__selo')].map((s) => s.textContent), fios: document.querySelectorAll('.ct-mundo__fio').length, z: document.querySelector('.ct-mundo__palco').dataset.z, d: getComputedStyle(document.querySelector('.ct-mundo__casa')).getPropertyValue('--d') }
  })
  console.log(v.n, JSON.stringify(r))
  await page.screenshot({ path: `tests/capturas-mapa-layout/ilustrado-${v.n}-z1.png` })
  await ctx.close()
}
await nav.close()
