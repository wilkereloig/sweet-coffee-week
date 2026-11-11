/**
 * cartoon-aviso-carimbo-navegador.mjs — o painel "Carimbe e avalie" da ficha (era o aviso flutuante "Carimbar") e o QR do display.
 *
 *   npm run build && npm run test:cartoon-aviso        (CARTOON_BUILD_DIR=<pasta> usa um build fora do projeto)
 *
 * A projeção pública é INTERCEPTADA (como em cartoon-navegador.mjs). A regra "QR d1-<casa> → /cartoon/combos/<casa>" é
 * testada sem navegador (qr-leituras.test.mjs); aqui o QR é a URL que ele devolve (com utm_*).
 * Redesenho de 11/11/2026 (auditoria da Página da casa): o aviso flutuante saiu; o convite à Caça é um painel no fluxo.
 * Reprova:
 *  1. QR DO DISPLAY — a URL do redirect abre a ficha da casa na capa, sem tela intermediária; painel presente.
 *  2. ENTRADAS — catálogo e link direto mostram o painel; ficha inexistente / retirada não.
 *  3. SEM FLUTUANTE — nada fixo cobrindo o pé da tela, nada gravado no aparelho.
 *  4. CARIMBAR — leva à tela do carimbo da casa e NÃO chama o banco para carimbar; casa com 2 unidades: um botão, sem escolha.
 *  5. ESTADOS — sem painel com a avaliação fechada, edição encerrada ou casa sem combo.
 *  6. LAYOUT — 390 e 1440: sem rolagem lateral, alvos ≥ 44 px, foco visível; barra de compra do celular escondida com as
 *     ações da capa à vista e sem cobrir a barra de abas. Capturas em tests/capturas-aviso-carimbo/.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { DEMO_EDICAO } from '../src/edicao/dados/demo/cartoon.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.CARTOON_AVISO_PORTA) || 5251
const BASE = `http://localhost:${PORT}`
const SAIDA = join(__dirname, 'capturas-aviso-carimbo')
mkdirSync(SAIDA, { recursive: true })
const falhas = []
const falha = (m) => { falhas.push(m); console.log(`  ✗ ${m}`) }
const ok = (m) => console.log(`  ✓ ${m}`)
const clone = (o) => JSON.parse(JSON.stringify(o))
const igual = (a, b, m) => (JSON.stringify(a) === JSON.stringify(b) ? ok(m) : falha(`${m} — veio ${JSON.stringify(a)}, esperava ${JSON.stringify(b)}`))
const verdade = (c, m) => (c ? ok(m) : falha(m))

function killTree (pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    else process.kill(-pid, 'SIGKILL')
  } catch { /* já morto */ }
}
async function waitForServer (url, ms = 30000) {
  const t = Date.now()
  while (Date.now() - t < ms) {
    try { if ((await fetch(url)).ok) return } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 350))
  }
  throw new Error('preview não respondeu')
}
try { await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1500) }); console.error(`✗ porta ${PORT} ocupada`); process.exit(1) } catch { /* livre */ }

// Aurora tem 2 unidades e combo; Quadro a Quadro é só marca (sem combo).
function edicao ({ avaliacao = true, fase = 'em_andamento' } = {}) {
  const d = clone(DEMO_EDICAO)
  d.avaliacao = { aberta: avaliacao, abre_em: null, fecha_em: null }
  d.fase = fase
  return d
}

async function contexto (nav, dados, { w = 1440, h = 900, reduzido = false } = {}) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, reducedMotion: reduzido ? 'reduce' : 'no-preference' })
  const bancoChamado = []
  await ctx.route('**/rest/v1/rpc/**', async (route) => {
    const fn = route.request().url().split('/rpc/')[1].split('?')[0]
    const corpo = JSON.parse(route.request().postData() || '{}')
    const json = (d) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) })
    if (/^mapa_carimbar/.test(fn)) bancoChamado.push(fn)
    if (fn === 'edicao_publica') return json(dados)
    if (fn === 'participante_publico') {
      const p = dados.participantes.find((x) => x.slug === corpo.p_slug)
      return json(p ? { estado: 'publicado', fase: dados.fase, participante: p } : { estado: 'inexistente' })
    }
    if (fn === 'criterios_avaliacao') return json([])
    if (fn === 'resultados_publicos') return json(null)
    return route.fulfill({ status: 404, body: '{}' })
  })
  await ctx.route('**/challenges.cloudflare.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  await ctx.route('**/tiles.openfreemap.org/**', (route) => route.abort('failed'))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|openfreemap|maplibre|404/.test(m.text())) erros.push(m.text()) })
  return { ctx, page, erros, bancoChamado }
}
const abrir = (page, caminho) => page.goto(`${BASE}${caminho}`, { waitUntil: 'networkidle' })
const painel = (page) => page.locator('#carimbe .ct-ficha__carimbe')
const rect = (loc) => loc.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right } })
const cruza = (a, b) => a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b
const AURORA = '/cartoon/combos/demo-casa-aurora'
// A URL que o QR impresso devolve depois do redirect de api/q.js.
const QR = `${AURORA}?utm_source=qr&utm_medium=impresso&utm_campaign=cartoon&utm_content=d1-demo-casa-aurora`

const preview = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort', ...(process.env.CARTOON_BUILD_DIR ? ['--outDir', process.env.CARTOON_BUILD_DIR] : [])], {
  cwd: join(__dirname, '..'), shell: true, stdio: ['ignore', 'pipe', 'pipe'],
})
let nav
try {
  await waitForServer(BASE)
  nav = await chromium.launch()

  console.log('\n1 · QR do display: direto na ficha, sem tela intermediária; capa do combo no topo e painel "Carimbe e avalie"')
  {
    const { ctx, page, erros, bancoChamado } = await contexto(nav, edicao())
    await abrir(page, QR)
    verdade(new URL(page.url()).pathname === AURORA, 'o endereço fica /cartoon/combos/<casa> (nenhuma passagem por /carimbo)')
    igual(await page.locator('h1').first().textContent().then((t) => /Caça aos Carimbos/i.test(t)), false, 'o título não é o da tela do carimbo')
    verdade(await page.locator('#combo').count() === 1, 'a ficha tem o bloco do combo')
    const topoNome = await page.locator('#casa-nome').evaluate((e) => Math.round(e.getBoundingClientRect().top))
    verdade(topoNome >= 0 && topoNome < 400, `a página abre na capa da casa (nome a ${topoNome}px)`)
    verdade(await painel(page).count() === 1, 'o painel "Carimbe e avalie" está na ficha')
    igual(bancoChamado, [], 'nada foi carimbado ao abrir')
    if (erros.length) falha(`console: ${erros.join(' | ')}`); else ok('console limpo')
    await ctx.close()
  }

  console.log('\n2 · entradas: catálogo, link direto; ficha inexistente')
  {
    const { ctx, page } = await contexto(nav, edicao())
    await abrir(page, '/cartoon/participantes')
    await page.locator('a[href$="/participantes/demo-casa-aurora"]').first().click()
    await page.waitForSelector('.ct-part')
    igual(await painel(page).count(), 1, 'abrindo a casa pelo catálogo: painel presente')
    await abrir(page, '/cartoon/participantes/demo-casa-bico-de-pena')
    igual(await painel(page).count(), 1, 'link direto de outra casa: painel presente')
    await abrir(page, '/cartoon/combos/nao-existe')
    igual(await painel(page).count(), 0, 'casa inexistente: mensagem clara, sem painel')
    await ctx.close()
  }

  console.log('\n3 · nada flutuante: o convite à Caça é um painel no fluxo da página (o aviso que cobria o pé da tela saiu)')
  {
    const { ctx, page } = await contexto(nav, edicao())
    await abrir(page, AURORA)
    igual(await page.locator('.ct-aviso-carimbo').count(), 0, 'sem aviso flutuante')
    const pos = await painel(page).evaluate((e) => getComputedStyle(e).position)
    verdade(pos !== 'fixed' && pos !== 'sticky', `o painel não é fixo (position: ${pos})`)
    const guardado = await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)).filter((k) => /aviso|carimbo|dispens/i.test(k)))
    igual(guardado, [], 'nada gravado no aparelho')
    await ctx.close()
  }

  console.log('\n4 · Carimbar leva à tela do carimbo e não carimba; casa com 2 unidades')
  {
    const { ctx, page, bancoChamado } = await contexto(nav, edicao())
    await abrir(page, AURORA)
    igual(await painel(page).locator('a[href$="/carimbo/demo-casa-aurora"]').count(), 1, 'um só botão "Carimbar", mesmo com 2 unidades (o banco escolhe pela localização)')
    await painel(page).getByRole('link', { name: 'Carimbar esta casa' }).click()
    await page.waitForSelector('.ct-carimbar')
    verdade(new URL(page.url()).pathname === '/cartoon/carimbo/demo-casa-aurora', 'abre a tela do carimbo da casa certa')
    igual(bancoChamado, [], 'tocar em Carimbar não registra carimbo')
    verdade(await page.locator('.ct-carimbar__principal, .ct-carimbar .ct-botao').first().isVisible(), 'a tela do carimbo pede o toque seguinte (botão ou criação do mapa)')
    await ctx.close()
  }

  console.log('\n5 · estados em que a Caça não está disponível')
  {
    for (const [nome, dados, caminho] of [
      ['avaliação fechada', edicao({ avaliacao: false }), AURORA],
      ['edição encerrada', edicao({ fase: 'encerrada' }), AURORA],
      ['casa sem combo', edicao(), '/cartoon/participantes/demo-casa-quadro-a-quadro'],
    ]) {
      const { ctx, page } = await contexto(nav, dados)
      await abrir(page, caminho)
      await page.waitForSelector('.ct-part')
      igual(await painel(page).count(), 0, `${nome}: sem painel`)
      await ctx.close()
    }
  }

  console.log('\n6 · layout: celular e desktop (sem rolagem lateral, alvos ≥ 44 px, foco visível); barra de compra do celular')
  for (const [rotulo, w, h] of [['celular', 390, 844], ['desktop', 1440, 900]]) {
    const { ctx, page } = await contexto(nav, edicao(), { w, h })
    await abrir(page, AURORA)
    await painel(page).scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    const a = await rect(painel(page))
    verdade(a.x >= 0 && a.r <= w, `${rotulo}: painel dentro da largura (${Math.round(a.w)}×${Math.round(a.h)})`)
    igual(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${rotulo}: sem rolagem lateral`)
    for (const link of await painel(page).locator('a.ct-botao').all()) {
      const r = await rect(link)
      verdade(r.h >= 44, `${rotulo}: botão do painel com alvo ≥ 44px (${Math.round(r.w)}×${Math.round(r.h)})`)
    }
    const primeiro = painel(page).locator('a.ct-botao').first()
    await primeiro.focus()
    verdade((await primeiro.evaluate((e) => getComputedStyle(e).outlineStyle)) !== 'none', `${rotulo}: foco visível no botão`)
    await page.screenshot({ path: join(SAIDA, `painel-${rotulo}.png`) })
    if (w < 900) {
      // Barra de compra: escondida enquanto as ações da capa aparecem; entra depois que elas saem da tela, sem cobrir a barra de abas.
      await page.locator('.ct-capa__compra').scrollIntoViewIfNeeded()
      await page.evaluate(() => scrollBy(0, -200))
      await page.waitForTimeout(600)
      igual(await page.locator('.ct-ficha__compra').isVisible(), false, 'celular: barra de compra escondida com as ações da capa à vista')
      await page.evaluate(() => scrollTo(0, 1400))
      await page.waitForTimeout(600)
      verdade(await page.locator('.ct-ficha__compra').isVisible(), 'celular: barra de compra aparece depois que as ações da capa saem da tela')
      const barra = await rect(page.locator('.ct-ficha__compra'))
      const abas = await rect(page.locator('.ct-abas'))
      verdade(!cruza(barra, abas), 'celular: a barra de compra não cobre a barra de abas')
    }
    await ctx.close()
  }
} finally {
  await nav?.close()
  killTree(preview.pid)
}

console.log(falhas.length ? `\n✗ ${falhas.length} falha(s)` : '\n✓ painel de carimbo ok')
process.exit(falhas.length ? 1 : 0)
