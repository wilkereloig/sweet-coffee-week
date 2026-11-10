import { chromium } from 'playwright'
const nav = await chromium.launch()
for (const v of [{ n: 'desktop', w: 1280, h: 900 }]) {
  const ctx = await nav.newContext({ viewport: { width: v.w, height: v.h }, hasTouch: !!v.t, isMobile: !!v.t })
  await ctx.addInitScript((c) => { localStorage.setItem('scw_privacidade', c) }, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 }))
  await ctx.route('**/tiles.openfreemap.org/**', (r) => r.abort('failed'))
  const page = await ctx.newPage()
  await page.goto('http://localhost:5212/cartoon/mapa?preview=1', { waitUntil: 'networkidle', timeout: 120000 })
  await page.locator('.ct-mundo__casa').first().waitFor({ state: 'attached' })
  await page.locator('.ct-mapa__ampliar').first().click()
  await page.waitForTimeout(1200)
  console.log(v.n, JSON.stringify(await page.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top), h: Math.round(b.height), l: Math.round(b.left), w: Math.round(b.width), bg: getComputedStyle(e).backgroundColor, pe: getComputedStyle(e).pointerEvents } }
    const p12 = [...document.querySelectorAll('.ct-mundo__casa')].find((b) => /^12\./.test(b.getAttribute('aria-label'))); const rb = p12.getBoundingClientRect(); const jt = document.querySelector('.ct-mundo__janela').getBoundingClientRect().top; const sonda = [jt + 4, jt + 12, jt + 20].map((y) => { const t = document.elementFromPoint(rb.left + rb.width / 2, y); return Math.round(y) + ':' + (p12.contains(t) ? 'PIN' : (t?.className || t?.tagName)) }); const sob = [...document.querySelectorAll('.ct-mundo__casa:not(.is-agrupado)')].filter((b) => { const x = b.getBoundingClientRect(); const cx = x.left + x.width / 2; const cy = x.top + x.height / 2; const t = document.elementFromPoint(cx, cy); return cy > 0 && cy < 80 && !b.contains(t) }).map((b) => b.getAttribute('aria-label').slice(0, 20) + ' ← ' + document.elementFromPoint(b.getBoundingClientRect().left + b.getBoundingClientRect().width / 2, b.getBoundingClientRect().top + b.getBoundingClientRect().height / 2)?.className)
    return { sonda, pin12: { top: Math.round(rb.top), bottom: Math.round(rb.bottom) }, barra: r('.ct-mapa__barra'), janela: r('.ct-mundo__janela'), sobAbarra: sob }
  })))
  await page.screenshot({ path: `tests/capturas-mapa-layout/barra-${v.n}.png` })
  await ctx.close()
}
await nav.close()
