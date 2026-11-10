import { chromium } from 'playwright'
const BASE = 'http://localhost:5212'
const nav = await chromium.launch()
for (const v of [{ n: 'celular', w: 390, h: 844, t: true }, { n: 'desktop', w: 1440, h: 900 }]) {
  const ctx = await nav.newContext({ viewport: { width: v.w, height: v.h }, hasTouch: !!v.t, isMobile: !!v.t, deviceScaleFactor: v.t ? 2 : 1 })
  await ctx.addInitScript((c) => { localStorage.setItem('scw_privacidade', c) }, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 }))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 160)))
  await page.goto(`${BASE}/cartoon/mapa?preview=1`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.getByRole('button', { name: /Mapa real/ }).first().click()
  await page.waitForTimeout(500)
  const ver = page.getByRole('button', { name: /Ver .* no mapa|Ver o mapa|no mapa/i }).first()
  if (await ver.count()) await ver.click().catch(() => {})
  await page.waitForTimeout(6000)
  await page.evaluate(() => document.querySelector('.ct-mapa__moldura')?.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(800)
  const info = await page.evaluate(() => ({ marc: document.querySelectorAll('.ct-marcador').length, sic: document.querySelectorAll('.ct-sicredi-marcador').length, fios: [...document.querySelectorAll('.ct-fio')].filter((f) => !f.hidden).length, selos: document.querySelectorAll('.ct-selo-grupo').length, agrup: document.querySelectorAll('.is-agrupado').length, provedor: !!document.querySelector('.gm-style') ? 'google' : document.querySelector('.maplibregl-map') ? 'maplibre' : '?' }))
  console.log(v.n, JSON.stringify(info), erros.join('|'))
  await page.screenshot({ path: `tests/capturas-mapa-layout/real-${v.n}.png` })
  await ctx.close()
}
await nav.close()
