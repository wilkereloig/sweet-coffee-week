/**
 * cartoon-aviso-carimbo-navegador.mjs — o aviso "Carimbar" da ficha e o QR do display que abre direto no combo.
 *
 *   npm run build && npm run test:cartoon-aviso        (CARTOON_BUILD_DIR=<pasta> usa um build fora do projeto)
 *
 * A projeção pública é INTERCEPTADA (como em cartoon-navegador.mjs). A regra "QR d1-<casa> → /cartoon/combos/<casa>" é
 * testada sem navegador (qr-leituras.test.mjs); aqui o QR é a URL que ele devolve (com utm_*).
 * Reprova:
 *  1. QR DO DISPLAY — a URL do redirect abre a ficha da casa no combo, sem tela intermediária; aviso presente.
 *  2. ENTRADAS — catálogo e link direto mostram o aviso; ficha inexistente / retirada não.
 *  3. FECHAR — botão e Escape fecham; ao reabrir a ficha (recarregar, voltar, outra casa) o aviso volta; nada fica gravado.
 *  4. CARIMBAR — leva à tela do carimbo da casa e NÃO chama o banco para carimbar; casa com 2 unidades: um botão, sem escolha.
 *  5. ESTADOS — sem aviso com a avaliação fechada, edição encerrada ou casa sem combo.
 *  6. LAYOUT — 390 e 1440, com aviso de cookies e barra de abas: dentro da tela, sem cobrir a barra nem o aviso de cookies,
 *     alvos ≥ 44 px, foco visível, teclado, movimento reduzido. Capturas em tests/capturas-aviso-carimbo/.
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
const aviso = (page) => page.locator('.ct-aviso-carimbo')
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

  console.log('\n1 · QR do display: direto na ficha, no combo, sem tela intermediária')
  {
    const { ctx, page, erros, bancoChamado } = await contexto(nav, edicao())
    await abrir(page, QR)
    verdade(new URL(page.url()).pathname === AURORA, 'o endereço fica /cartoon/combos/<casa> (nenhuma passagem por /carimbo)')
    igual(await page.locator('h1').first().textContent().then((t) => /Caça aos Carimbos/i.test(t)), false, 'o título não é o da tela do carimbo')
    verdade(await page.locator('#combo').count() === 1, 'a ficha tem o bloco do combo')
    const topoCombo = await page.locator('#combo').evaluate((e) => Math.round(e.getBoundingClientRect().top))
    verdade(topoCombo < 200, `a página abre com o combo em destaque (topo do combo a ${topoCombo}px)`)
    verdade(await aviso(page).isVisible(), 'o aviso de carimbo aparece')
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
    verdade(await aviso(page).isVisible(), 'abrindo a casa pelo catálogo: aviso presente')
    await abrir(page, '/cartoon/participantes/demo-casa-bico-de-pena')
    verdade(await aviso(page).isVisible(), 'link direto de outra casa: aviso presente')
    await abrir(page, '/cartoon/combos/nao-existe')
    igual(await aviso(page).count(), 0, 'casa inexistente: mensagem clara, sem aviso')
    await ctx.close()
  }

  console.log('\n3 · fechar não grava nada: volta na próxima visita')
  {
    const { ctx, page } = await contexto(nav, edicao())
    await abrir(page, AURORA)
    await page.getByRole('button', { name: 'Fechar o aviso' }).click()
    igual(await aviso(page).count(), 0, 'o botão fecha o aviso')
    const guardado = await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)).filter((k) => /aviso|carimbo|dispens/i.test(k)))
    igual(guardado, [], 'nenhuma dispensa gravada no aparelho')
    await abrir(page, AURORA)
    verdade(await aviso(page).isVisible(), 'recarregar a ficha: o aviso volta')
    await page.keyboard.press('Tab')
    await aviso(page).locator('.ct-aviso-carimbo__acao').focus()
    await page.keyboard.press('Escape')
    igual(await aviso(page).count(), 0, 'Escape, com o foco no aviso, fecha')
    await page.locator('.ct-topo__marca').first().click()
    await page.waitForLoadState('networkidle')
    await page.goBack()
    await page.waitForSelector('.ct-part')
    verdade(await aviso(page).isVisible(), 'sair e voltar à ficha (voltar do navegador): o aviso volta')
    await ctx.close()
  }

  console.log('\n4 · Carimbar leva à tela do carimbo e não carimba; casa com 2 unidades')
  {
    const { ctx, page, bancoChamado } = await contexto(nav, edicao())
    await abrir(page, AURORA)
    igual(await aviso(page).locator('a.ct-aviso-carimbo__acao').count(), 1, 'um só botão "Carimbar", mesmo com 2 unidades (o banco escolhe pela localização)')
    await aviso(page).getByRole('link', { name: 'Carimbar' }).click()
    await page.waitForSelector('.ct-carimbar')
    verdade(new URL(page.url()).pathname === '/cartoon/carimbo/demo-casa-aurora', 'abre a tela do carimbo da casa certa')
    igual(bancoChamado, [], 'tocar em Carimbar do aviso não registra carimbo')
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
      igual(await aviso(page).count(), 0, `${nome}: sem aviso`)
      await ctx.close()
    }
  }

  console.log('\n6 · layout: celular (com aviso de cookies e barra de abas) e desktop')
  for (const [rotulo, w, h] of [['celular', 390, 844], ['desktop', 1440, 900]]) {
    const { ctx, page } = await contexto(nav, edicao(), { w, h })
    await abrir(page, AURORA)
    await page.waitForTimeout(1200) // entrada do aviso (360ms + 600ms de espera)
    const a = await rect(aviso(page))
    verdade(a.x >= 0 && a.r <= w && a.y >= 0 && a.b <= h, `${rotulo}: aviso inteiro dentro da tela (${Math.round(a.w)}×${Math.round(a.h)})`)
    const cookies = page.locator('.cookie-consent')
    if (await cookies.count()) {
      const c = await rect(cookies)
      verdade(!cruza(a, c), `${rotulo}: não sobrepõe o aviso de cookies`)
    } else ok(`${rotulo}: (aviso de cookies não apareceu neste contexto)`)
    if (w < 900) {
      const abas = await rect(page.locator('.ct-abas'))
      verdade(!cruza(a, abas), 'celular: não cobre a barra de abas')
    }
    const foto = page.locator('.ct-cardapio__foto').first()
    if (await foto.count()) {
      const f = await rect(foto)
      verdade(f.y < a.y, `${rotulo}: o topo da foto do combo fica acima do aviso (foto a ${Math.round(f.y)}px, aviso a ${Math.round(a.y)}px)`)
    }
    for (const sel of ['.ct-aviso-carimbo__acao', '.ct-aviso-carimbo__fechar']) {
      const r = await rect(aviso(page).locator(sel))
      verdade(r.h >= 44 && r.w >= 44, `${rotulo}: ${sel.slice(1)} com alvo ≥ 44px (${Math.round(r.w)}×${Math.round(r.h)})`)
    }
    // Teclado: Tab alcança o botão e o X, com contorno visível.
    await aviso(page).locator('.ct-aviso-carimbo__acao').focus()
    const contorno = await aviso(page).locator('.ct-aviso-carimbo__acao').evaluate((e) => getComputedStyle(e).outlineStyle)
    verdade(contorno !== 'none', `${rotulo}: foco visível no botão`)
    await page.screenshot({ path: join(SAIDA, `aviso-${rotulo}.png`) })
    await ctx.close()
  }

  console.log('\n7 · movimento reduzido')
  {
    const { ctx, page } = await contexto(nav, edicao(), { reduzido: true })
    await abrir(page, AURORA)
    const anim = await aviso(page).evaluate((e) => getComputedStyle(e).animationName)
    igual(anim, 'none', 'sem animação de entrada com prefers-reduced-motion')
    await ctx.close()
  }
} finally {
  await nav?.close()
  killTree(preview.pid)
}

console.log(falhas.length ? `\n✗ ${falhas.length} falha(s)` : '\n✓ aviso de carimbo ok')
process.exit(falhas.length ? 1 : 0)
