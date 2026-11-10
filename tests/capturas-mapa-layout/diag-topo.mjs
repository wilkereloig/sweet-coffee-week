import { chromium } from 'playwright'
const BASE = 'http://localhost:5212'
const nav = await chromium.launch()
for (const v of [{ n: 'celular', w: 390, h: 844, t: true }, { n: 'desktop', w: 1440, h: 900 }]) {
  const ctx = await nav.newContext({ viewport: { width: v.w, height: v.h }, hasTouch: !!v.t, isMobile: !!v.t, deviceScaleFactor: v.t ? 2 : 1 })
  await ctx.addInitScript((c) => { localStorage.setItem('scw_privacidade', c) }, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 }))
  await ctx.route('**/tiles.openfreemap.org/**', (r) => r.abort('failed'))
  const page = await ctx.newPage()
  await page.goto(`${BASE}/cartoon/mapa?preview=1`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.locator('.ct-mundo__palco').waitFor({ timeout: 30000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `tests/capturas-mapa-layout/topo-${v.n}.png`, fullPage: true })
  await ctx.close()
}
await nav.close()
