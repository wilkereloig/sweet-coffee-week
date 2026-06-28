/**
 * Validação responsiva — Sweet & Coffee Week
 * -------------------------------------------------------------
 * Sobe o dev server do Vite, abre a Home/O Festival em uma lista de
 * viewports oficiais e checa, em cada uma:
 *   - overflow horizontal (scrollWidth vs innerWidth)
 *   - header em uma única linha (não quebra)
 *   - logo alinhada à esquerda
 *   - botão de menu alinhado à direita, com área de toque confortável
 *   - elementos não colados nas bordas (respeitam o gutter)
 *   - menu mobile: abre, fecha por clique fora, por link e por Esc
 *
 * Gera screenshots em tests/screenshots/ para revisão visual.
 * Sai com código 1 se houver overflow horizontal ou falha dura.
 *
 * Roda contra o BUILD de produção via `vite preview` — NÃO contra o dev server.
 * Motivo: em DEV o DevViewportSwitcher embrulha o app num <iframe>, então o
 * header real não fica no documento de topo. O preview reflete o site publicado.
 *
 * Exige um `dist/` já buildado. Rode `npm run build` antes (a pasta dist fica no
 * Dropbox e o emptyDir do vite trava intermitentemente — por isso o build é uma
 * etapa separada, não acoplada ao teste).
 *
 * Uso:
 *   npm run build && npm run test:responsive   # todos os viewports
 *   npm run build && npm run test:mobile       # só telefones
 *
 * Doc da régua: src/design/SITE_DIRECTION.md (§ Validação mobile).
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SHOTS = join(__dirname, 'screenshots')

const PORT = 5179
const BASE = `http://localhost:${PORT}`

// Viewports oficiais (ver SITE_DIRECTION.md). phone => isMobile + toque.
const VIEWPORTS = [
  { w: 390,  h: 844,  label: 'iphone-12-390',  phone: true },
  { w: 414,  h: 896,  label: 'iphone-11-414',  phone: true },
  { w: 430,  h: 932,  label: 'iphone-15pm-430', phone: true },
  { w: 768,  h: 1024, label: 'ipad-768',       phone: false },
  { w: 1024, h: 768,  label: 'ipad-land-1024', phone: false },
  { w: 1366, h: 768,  label: 'laptop-1366',    phone: false },
]

// Abaixo deste breakpoint o header colapsa no menu hambúrguer (CSS: max-width:959px).
const MOBILE_NAV_BREAKPOINT = 960
const OVERFLOW_TOLERANCE = 1 // px — sub-pixel rounding
const MIN_TOUCH = 40         // px — área de toque mínima do botão de menu

const onlyMobile = process.argv.includes('--mobile')
const targets = onlyMobile ? VIEWPORTS.filter((v) => v.phone) : VIEWPORTS

function startPreviewServer() {
  const proc = spawn(
    'npm',
    ['run', 'preview', '--', '--port', String(PORT), '--strictPort'],
    { cwd: join(__dirname, '..'), shell: true, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  proc.stderr.on('data', (d) => {
    const s = d.toString()
    if (/error/i.test(s)) process.stderr.write(`[vite] ${s}`)
  })
  return proc
}

// No Windows o spawn com shell cria um cmd que abre o vite; matar só o cmd deixa
// o preview órfão (segura a porta e impede o node de sair). Mata a árvore pelo PID.
function killTree(pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    else process.kill(-pid, 'SIGKILL')
  } catch {
    /* já morto */
  }
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 350))
  }
  throw new Error(`Dev server não respondeu em ${timeoutMs}ms (${url})`)
}

/** Lê métricas de layout do header e do documento. */
function readLayout() {
  const de = document.documentElement
  const vw = window.innerWidth
  const rect = (el) => (el ? el.getBoundingClientRect() : null)
  const header = document.querySelector('.site-header')
  const brand = document.querySelector('.brand') || document.querySelector('.site-header .brand')
  const toggle = document.querySelector('.menu-toggle')
  const hb = rect(header)
  const bb = rect(brand)
  const tb = rect(toggle)
  const toggleVisible = toggle ? getComputedStyle(toggle).display !== 'none' : false
  return {
    vw,
    overflowX: de.scrollWidth - vw,
    headerHeight: hb ? Math.round(hb.height) : null,
    brand: bb ? { left: Math.round(bb.left), right: Math.round(bb.right), height: Math.round(bb.height) } : null,
    toggle: tb ? { left: Math.round(tb.left), right: Math.round(tb.right), width: Math.round(tb.width), height: Math.round(tb.height), visible: toggleVisible } : null,
  }
}

async function run() {
  if (!existsSync(join(__dirname, '..', 'dist', 'index.html'))) {
    console.error('✗ dist/ ausente. Rode `npm run build` antes de validar.')
    process.exit(1)
  }
  // Limpeza best-effort: a pasta fica no Dropbox e pode estar travada (EBUSY).
  // Se não der pra apagar, seguimos — os screenshots são sobrescritos por nome.
  await rm(SHOTS, { recursive: true, force: true }).catch(() => {})
  await mkdir(SHOTS, { recursive: true }).catch(() => {})

  console.log('▶ subindo preview server (build de produção)…')
  const server = startPreviewServer()
  let browser
  const results = []

  try {
    await waitForServer(BASE)
    console.log(`▶ preview pronto em ${BASE}\n`)
    browser = await chromium.launch()

    for (const vp of targets) {
      const isMobileNav = vp.w < MOBILE_NAV_BREAKPOINT
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        isMobile: vp.phone,
        hasTouch: vp.phone,
        deviceScaleFactor: vp.phone ? 3 : 1,
      })
      const page = await context.newPage()
      page.setDefaultTimeout(4000)
      const issues = []

      await page.goto(`${BASE}/#/`, { waitUntil: 'load', timeout: 15000 })
      await page.waitForTimeout(600) // assenta fontes/animações de entrada

      const L = await page.evaluate(readLayout)

      // 1. overflow horizontal
      if (L.overflowX > OVERFLOW_TOLERANCE) issues.push(`overflow-x: +${L.overflowX}px`)

      // 2. header não quebra (uma linha — altura sã)
      if (L.headerHeight && L.headerHeight > vp.h * 0.45) issues.push(`header alto demais: ${L.headerHeight}px`)

      // 3. logo à esquerda, alinhada ao gutter da Home: --hm-gutter =
      //    clamp(28px, 11.5vw, 150px). A borda esquerda da .brand deve bater nele.
      const expectedGutter = Math.min(Math.max(28, 0.115 * vp.w), 150)
      if (L.brand && Math.abs(L.brand.left - expectedGutter) > 12) {
        issues.push(`logo fora do gutter (left=${L.brand.left}, esperado≈${Math.round(expectedGutter)})`)
      }

      // 4. logo não estoura a borda
      if (L.brand && L.brand.right > vp.w) issues.push(`logo estoura à direita (right=${L.brand.right})`)

      // 5. botão de menu (só quando o nav mobile está ativo)
      if (isMobileNav) {
        if (!L.toggle || !L.toggle.visible) {
          issues.push('menu-toggle invisível no mobile')
        } else {
          if (L.toggle.right < vp.w * 0.6) issues.push(`menu-toggle não está à direita (right=${L.toggle.right})`)
          if (L.toggle.right > vp.w + OVERFLOW_TOLERANCE) issues.push(`menu-toggle estoura à direita (right=${L.toggle.right})`)
          if (L.toggle.width < MIN_TOUCH || L.toggle.height < MIN_TOUCH) {
            issues.push(`área de toque pequena: ${L.toggle.width}x${L.toggle.height}`)
          }
        }
      }

      // screenshot da página
      await page.screenshot({ path: join(SHOTS, `${vp.label}.png`), fullPage: true })

      // 6. fluxo do menu mobile — cada passo é tolerante a falha (registra
      //    o problema e se recupera, fechando à força antes de reabrir).
      if (isMobileNav && L.toggle && L.toggle.visible) {
        const menu = page.locator('.mobile-menu')
        const overlay = page.locator('.mobile-overlay')

        const isOpen = () => menu.isVisible().catch(() => false)
        const open = async () => {
          await page.locator('.menu-toggle').click({ force: true }).catch(() => {})
          await menu.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {})
          await page.waitForTimeout(340) // deixa o slideInRight terminar (painel entra pela direita)
        }
        // fecha à força via botão .close (sempre funciona) p/ recuperar entre passos
        const forceClose = async () => {
          if (await isOpen()) {
            await page.locator('.mobile-menu .close').click({ force: true }).catch(() => {})
            await menu.waitFor({ state: 'hidden', timeout: 1500 }).catch(() => {})
          }
        }
        const closedWithin = (ms = 1500) =>
          menu.waitFor({ state: 'hidden', timeout: ms }).then(() => true).catch(() => false)

        try {
          // abre
          await open()
          if (!(await isOpen())) issues.push('menu não abriu')
          await page.waitForTimeout(250)
          await page.screenshot({ path: join(SHOTS, `${vp.label}--menu.png`) })

          // overflow com menu aberto
          const menuOverflow = await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          )
          if (menuOverflow > OVERFLOW_TOLERANCE) issues.push(`menu aberto gera overflow: +${menuOverflow}px`)

          // links presentes (7 institucionais)
          const linkCount = await page.locator('.mobile-menu a').count()
          if (linkCount < 7) issues.push(`menu com poucos links: ${linkCount} (esperado ≥7)`)

          // fecha com Esc
          await page.keyboard.press('Escape')
          if (!(await closedWithin())) issues.push('menu não fechou com Esc')
          await forceClose()

          // fecha por clique fora (canto do overlay, longe do painel)
          await open()
          await overlay.click({ position: { x: 6, y: 6 }, force: true }).catch(() => {})
          if (!(await closedWithin())) issues.push('menu não fechou ao clicar fora')
          await forceClose()

          // fecha ao clicar em um link (clique real — valida que o link é tocável)
          await open()
          const link = page.locator('.mobile-menu a').nth(1)
          await link.scrollIntoViewIfNeeded().catch(() => {})
          await link.click().catch((e) => issues.push(`clique no link falhou: ${e.message?.split('\n')[0]}`))
          if (!(await closedWithin())) issues.push('menu não fechou ao clicar em link')
          await forceClose()
        } catch (e) {
          issues.push(`erro no fluxo do menu: ${e.message?.split('\n')[0]}`)
          await forceClose()
        }

        // volta pra Home p/ a próxima iteração começar limpa
        await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      }

      results.push({ vp, L, issues })
      await context.close()

      const tag = issues.length ? `✗ ${issues.length}` : '✓'
      console.log(`${tag.padEnd(4)} ${vp.label.padEnd(18)} ${vp.w}x${vp.h}  overflow=${L.overflowX}px`)
      for (const i of issues) console.log(`       · ${i}`)
    }
  } finally {
    if (browser) await browser.close()
    killTree(server.pid)
  }

  const failed = results.filter((r) => r.issues.length > 0)
  console.log(`\n${'─'.repeat(48)}`)
  console.log(`screenshots → tests/screenshots/`)
  if (failed.length) {
    console.log(`✗ ${failed.length}/${results.length} viewports com problemas`)
    process.exit(1)
  }
  console.log(`✓ ${results.length}/${results.length} viewports OK`)
  process.exit(0) // o filho do preview pode manter o event loop vivo
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
