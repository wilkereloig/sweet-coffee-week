import { chromium } from 'playwright'
const BASE = 'http://localhost:5212'
const nav = await chromium.launch()
for (const v of [{ n: 'celular', w: 390, h: 844, t: true }, { n: 'desktop', w: 1440, h: 900 }]) {
  const ctx = await nav.newContext({ viewport: { width: v.w, height: v.h }, hasTouch: !!v.t, isMobile: !!v.t, deviceScaleFactor: v.t ? 2 : 1 })
  await ctx.addInitScript((c) => { localStorage.setItem('scw_privacidade', c) }, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 }))
  const page = await ctx.newPage()
  await page.goto(`${BASE}/cartoon/mapa?preview=1`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.getByRole('button', { name: /Mapa real/ }).first().click()
  await page.waitForTimeout(500)
  const ver = page.getByRole('button', { name: /no mapa/i }).first()
  if (await ver.count()) await ver.click().catch(() => {})
  await page.waitForTimeout(6000)
  await page.evaluate(() => document.querySelector('.ct-mapa__moldura')?.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(600)
  const leitura = () => page.evaluate(() => ({ marc: [...document.querySelectorAll('.ct-marcador')].filter((m) => !m.classList.contains('is-agrupado')).length, fios: [...document.querySelectorAll('.ct-fio')].filter((f) => !f.hidden).length, selos: [...document.querySelectorAll('.ct-selo-grupo')].map((s) => s.getAttribute('aria-label')) }))
  console.log(v.n, 'antes', JSON.stringify(await leitura()))
  for (let i = 0; i < 3; i++) {
    const selo = page.locator('.ct-selo-grupo').first()
    if (!(await selo.count())) break
    await selo.click({ force: true })
    await page.waitForTimeout(2500)
    console.log(v.n, 'depois do selo', i + 1, JSON.stringify(await leitura()))
    await page.screenshot({ path: `tests/capturas-mapa-layout/real-${v.n}-selo${i + 1}.png` })
  }
  await ctx.close()
}
await nav.close()
