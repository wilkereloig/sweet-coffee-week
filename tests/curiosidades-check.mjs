/**
 * Verificação E2E — página Curiosidades (redesign "dados que se movem").
 * Roda contra o BUILD de produção via `vite preview` (mesmo motivo de responsive.mjs:
 * em dev o DevViewportSwitcher embrulha o app num iframe).
 * Exige `dist/` já buildado: npm run build && npm run test:curiosidades
 *
 * Checa: 21 chips de marca no gráfico de homenagens; 6 na linha Sweet Trip; 5 marcos;
 * hall com 5+ linhas; card líder do Melhor Combo com o maior número; zero eyebrows;
 * sem overflow lateral em 390px; reduced-motion mostra estado final imediato.
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const PORT = 5181
const URL = `http://localhost:${PORT}/#/curiosidades`

let failures = 0
const fail = (msg) => { console.error('  ✗ ' + msg); failures++ }
const ok = (msg) => console.log('  ✓ ' + msg)

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  shell: true,
  stdio: 'pipe',
})
await new Promise((r) => setTimeout(r, 3500))

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  const units = await page.locator('.cx-unit').count()
  units === 21 ? ok('21 chips no gráfico de homenagens') : fail(`chips de homenagem: ${units} (esperava 21)`)

  const firstRow = await page.locator('.cx-waffle-row').first().locator('.cx-unit').count()
  firstRow === 6 ? ok('linha líder (Sweet Trip) com 6 marcas') : fail(`linha líder: ${firstRow} chips (esperava 6)`)

  const marcos = await page.locator('.cx-ms-item').count()
  marcos === 5 ? ok('5 marcos na linha do tempo') : fail(`marcos: ${marcos} (esperava 5)`)
  console.log('  anos dos marcos (conferir com ACERVO.md):', (await page.locator('.cx-ms-year').allTextContents()).join(' | '))

  const bars = await page.locator('.cx-bar-row').count()
  bars >= 5 ? ok(`hall dos premiados com ${bars} linhas`) : fail(`hall: só ${bars} linhas (esperava 5+)`)

  const leadTxt = await page.locator('.cx-combocard--lead .cx-combocard-n').textContent()
  const otherTxts = await page.locator('.cx-combocard:not(.cx-combocard--lead) .cx-combocard-n').allTextContents()
  const leadN = parseInt(leadTxt, 10)
  Number.isFinite(leadN) && otherTxts.every((t) => parseInt(t, 10) <= leadN)
    ? ok(`card líder do Melhor Combo com ${leadN} vitórias (maior de todos)`)
    : fail(`card líder do Melhor Combo inconsistente (líder=${leadTxt}, demais=${otherTxts.join(',')})`)

  const eyebrows = await page.locator('.cx-eyebrow, .eyebrow').count()
  eyebrows === 0 ? ok('zero eyebrows nas seções') : fail(`eyebrows na página: ${eyebrows} (esperava 0)`)

  const m = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await m.goto(URL, { waitUntil: 'networkidle' })
  await m.waitForTimeout(800)
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  overflow <= 0 ? ok('sem overflow lateral em 390px') : fail(`overflow lateral de ${overflow}px em 390px`)

  const rm = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  await rm.goto(URL, { waitUntil: 'networkidle' })
  await rm.waitForTimeout(400)
  const opacity = await rm.locator('.cx-unit').first().evaluate((el) => getComputedStyle(el).opacity)
  opacity === '1' ? ok('reduced-motion mostra estado final imediato') : fail(`reduced-motion: opacity ${opacity} (esperava 1)`)
} finally {
  await browser.close()
  server.kill('SIGTERM')
}

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTudo verde.')
