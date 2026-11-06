/**
 * capturas-topo.mjs — capturas e medidas do cabeçalho da edição Cartoon (início da página e rolagem), celular e desktop.
 *
 *   node tests/capturas-topo.mjs <urlBase> <pastaSaida> [rotulo]      ex.: http://localhost:4181 ./capturas antes
 *
 * Contra um build servido por `vite preview` (o dev server do projeto é lento demais para captura). Sem escrita no banco.
 * Mede: onde começa a primeira seção (`.ct-conteudo > :first-child`) e o fundo dela em relação ao topo da janela — o alvo é 0.
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const [base = 'http://localhost:4181', saida = './capturas-topo', rotulo = 'depois'] = process.argv.slice(2)
fs.mkdirSync(saida, { recursive: true })

const TELAS = [['cel', 390, 844], ['desk', 1440, 900]]
const PAGINAS = [['entrada', '/cartoon'], ['participantes', '/cartoon/participantes'], ['mapa', '/cartoon/mapa'], ['caca', '/cartoon/caca'], ['avaliar', '/cartoon/avaliar']]

const browser = await chromium.launch()
const medidas = []
for (const [tela, w, h] of TELAS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: tela === 'cel' })
  const page = await ctx.newPage()
  const ir = async (nome, url) => {
    await page.goto(base + url, { waitUntil: 'load' })
    await page.waitForSelector('.ct-topo', { timeout: 20000 })
    await page.waitForTimeout(1200)
    const ok = page.getByRole('button', { name: 'Ok, entendi' })
    if (await ok.count()) await ok.click().catch(() => {})
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(250)
    const m = await page.evaluate(() => {
      const topo = document.querySelector('.ct-topo').getBoundingClientRect()
      const primeira = document.querySelector('.ct-conteudo > :first-child')
      const r = primeira?.getBoundingClientRect()
      const bg = primeira ? getComputedStyle(primeira).backgroundColor : null
      const marca = document.querySelector('.ct-topo__marca')?.getBoundingClientRect()
      return { topoAlt: Math.round(topo.height), primeiraTop: r ? Math.round(r.top) : null, primeiraBg: bg, marcaBaixo: marca ? Math.round(marca.bottom) : null, rolagemH: document.documentElement.scrollWidth - document.documentElement.clientWidth }
    })
    medidas.push({ tela, nome, ...m })
    await page.screenshot({ path: path.join(saida, `${rotulo}-${tela}-${nome}-topo.png`) })
    await page.evaluate(() => window.scrollTo(0, 700)); await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(saida, `${rotulo}-${tela}-${nome}-rolado.png`) })
  }
  for (const [nome, url] of PAGINAS) await ir(nome, url)
  // Ficha de participante: primeiro cartão da lista.
  await page.goto(base + '/cartoon/participantes', { waitUntil: 'load' }); await page.waitForSelector('a[href^="/cartoon/participantes/"]', { timeout: 20000 })
  const href = await page.locator('a[href^="/cartoon/participantes/"]').first().getAttribute('href')
  await ir('ficha', href)
  await ctx.close()
}
await browser.close()
console.table(medidas)
fs.writeFileSync(path.join(saida, `${rotulo}-medidas.json`), JSON.stringify(medidas, null, 1))
