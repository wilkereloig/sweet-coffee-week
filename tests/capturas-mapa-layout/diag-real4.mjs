import { chromium } from 'playwright'
const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript((c) => { localStorage.setItem('scw_privacidade', c) }, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 }))
const page = await ctx.newPage()
page.on('console', (m) => console.log('console', m.type(), m.text().slice(0, 300)))
await page.goto('http://localhost:5212/cartoon/mapa?preview=1', { waitUntil: 'networkidle', timeout: 120000 })
await page.getByRole('button', { name: /Mapa real/ }).first().click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: /no mapa/i }).first().click().catch(() => {})
await page.waitForTimeout(6000)
await page.evaluate(async () => {
  const g = window.google.maps
  const orig = g.Map.prototype.fitBounds
  g.Map.prototype.fitBounds = function (b, p) { const j = b.toJSON(); console.log('fitBounds', JSON.stringify(j), p, 'zoom antes', this.getZoom()); const r = orig.call(this, b, p); setTimeout(() => console.log('zoom depois', this.getZoom()), 1500); return r }
  document.querySelector('.ct-selo-grupo').click()
})
await page.waitForTimeout(3000)
await nav.close()
