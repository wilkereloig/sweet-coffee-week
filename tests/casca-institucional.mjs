/**
 * casca-institucional.mjs — comportamentos da casca que nenhum teste estático vê.
 *
 * Roda contra o BUILD (`vite preview`), como responsive/motion: só o build tem
 * os chunks reais e a ordem final do CSS. Exige `dist/` pronto:
 *
 *   npm run build && npm run test:casca-institucional
 *
 * O que ele reprova:
 *  1. GATE — sem `?preview=1`, qualquer endereço mostra Participar, sem menu, e o
 *     navegador NÃO baixa o chunk de nenhuma outra página (nem o do Supabase).
 *  2. COOKIES — na primeira visita o aviso não cobre a ação principal do herói
 *     (360×800, 390×844, 1440×900), nem a navegação por ano de Edições, nem a barra de abas;
 *     aceitar some com ele e com a reserva `--scw-aviso-h`.
 *  3. ROTAS DIFERIDAS — navegando pelo menu entre páginas carregadas sob demanda,
 *     o motor de movimento liga na página real (não no fallback) e nenhum bloco
 *     fica invisível depois de rolar; o foco vai para o conteúdo.
 *  4. FOLHA "MAIS" — Escape fecha, o foco volta à aba e a rolagem é destravada.
 *  5. MOVIMENTO REDUZIDO E TIMERS — sem movimento: uma camada de foto, sem botão
 *     de pausa, motor desligado. Com movimento: pausar, aba oculta e sair da
 *     página não deixam o relógio do crossfade (6200ms) agendado.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5213
const BASE = `http://localhost:${PORT}`
const ROTAS = ['/', '/edicoes', '/sweet-awards', '/participar', '/apoiar', '/contato']
const OUTRAS_PAGINAS = /\/assets\/(Home|Edicoes|HistoricoAwards|Apoiar|Contato|EmBreve|Aguarde)-[\w-]+\.js/
const falhas = []
const falha = (msg) => { falhas.push(msg); console.log(`  ✗ ${msg}`) }
const ok = (msg) => console.log(`  ✓ ${msg}`)

async function exigirPortaLivre(porta) {
  try { await fetch(`http://localhost:${porta}/`, { signal: AbortSignal.timeout(2000) }) } catch { return }
  console.error(`\n✗ A porta ${porta} já está ocupada — este teste mediria o servidor de outro processo.\n`)
  process.exit(1)
}
function killTree(pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    else process.kill(-pid, 'SIGKILL')
  } catch { /* já morto */ }
}
async function waitForServer(url, timeoutMs = 30000) {
  const inicio = Date.now()
  while (Date.now() - inicio < timeoutMs) {
    try { if ((await fetch(url)).ok) return } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 350))
  }
  throw new Error(`preview não respondeu em ${timeoutMs}ms`)
}
async function rolarTudo(page) {
  await page.evaluate(async () => {
    const passo = Math.round(window.innerHeight * 0.7)
    for (let y = 0; y < document.body.scrollHeight + window.innerHeight; y += passo) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 110))
    }
    await new Promise((r) => setTimeout(r, 1800))
  })
}
const invisiveis = (page) => page.evaluate(() =>
  [...document.querySelectorAll('[data-mo]')].filter((el) => getComputedStyle(el).opacity === '0').length)

/* A ação principal do herói: a marcada com data-acao-principal, senão o primeiro
   botão do sistema dentro da primeira seção do conteúdo. Herói sem ação (Sweet
   Awards: quem leva adiante é o índice logo abaixo) → vale o título da página. */
const retanguloAcao = (page) => page.evaluate(() => {
  const main = document.querySelector('main')
  const el = main.querySelector('[data-acao-principal]') ||
    (main.querySelector('section') || main).querySelector('a.scw-btn, button.scw-btn') ||
    main.querySelector('h1')
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, texto: el.textContent.trim().slice(0, 40) }
})
const retanguloDe = (page, seletor) => page.evaluate((s) => {
  const el = [...document.querySelectorAll(s)].find((e) => e.getClientRects().length && getComputedStyle(e).display !== 'none')
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
}, seletor)
const cruza = (a, b) => a && b && a.bottom > b.top && a.top < b.bottom && a.right > b.left && a.left < b.right

/* Publicação do institucional completo (13/10/2026, PARTICIPAR_ONLY_PUBLICATION
   = false): sem ?preview=1 cada endereço abre a PRÓPRIA página, com menu, e
   baixa só o chunk dela — nada de Supabase na carga. */
const PUBLICADAS = [
  ['/', 'home', 'Home'],
  ['/#/participar', 'participar', 'Participar'],
  ['/#/contato', 'contato', 'Contato'],
  ['/#/sweet-awards', 'historico-awards', 'HistoricoAwards'],
]
async function gate(navegador) {
  console.log('\n1 · domínio publicado (sem ?preview=1)')
  const CHUNK = /\/assets\/(Home|Edicoes|HistoricoAwards|Participar|Apoiar|Contato|EmBreve|Aguarde|Legal)-[\w-]+\.js/
  for (const [caminho, rota, chunk] of PUBLICADAS) {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const js = []
    page.on('request', (r) => { if (r.url().includes('/assets/') && r.url().endsWith('.js')) js.push(r.url()) })
    await page.goto(`${BASE}${caminho}`, { waitUntil: 'networkidle' })
    const corpo = await page.evaluate(() => document.body.className)
    if (!corpo.split(/\s+/).includes(`route-${rota}`)) falha(`${caminho}: deveria abrir ${rota} (body: ${corpo})`)
    if (!(await page.locator('.scw-nav').count())) falha(`${caminho}: publicado sem menu (.scw-nav ausente)`)
    const paginas = js.filter((u) => CHUNK.test(u)).map((u) => u.match(CHUNK)[1])
    const intrusos = paginas.filter((n) => n !== chunk)
    if (intrusos.length) falha(`${caminho}: baixou chunk de outra página: ${intrusos.join(', ')}`)
    if (js.some((u) => /supabase-/.test(u))) falha(`${caminho}: baixou o cliente do Supabase na carga`)
    if (!paginas.includes(chunk)) falha(`${caminho}: o chunk de ${chunk} não foi pedido`)
    if (!falhas.some((f) => f.startsWith(caminho))) ok(`${caminho} → ${rota}, com menu, só o chunk dela`)
    await ctx.close()
  }
}

async function cookies(navegador) {
  console.log('\n2 · aviso de cookies na primeira visita')
  for (const [w, h] of [[360, 800], [390, 844], [1440, 900]]) {
    for (const rota of ROTAS) {
      const ctx = await navegador.newContext({ viewport: { width: w, height: h } })
      const page = await ctx.newPage()
      await page.goto(`${BASE}/?preview=1#${rota}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(900)
      const aviso = await retanguloDe(page, '.cookie-consent')
      const rot = `${rota} @${w}×${h}`
      if (!aviso) { falha(`${rot}: aviso não apareceu na primeira visita`); await ctx.close(); continue }
      if (rota === '/edicoes' && w > 1000) {
        // Edições não tem ação no herói: no desktop, o que não pode ficar sob o
        // aviso é a navegação por ano, que abre a coleção. No celular (14/10/2026)
        // o herói é o compartilhado (§6.9) e a faixa de anos começa logo abaixo
        // dele — vale o título, como em todo herói sem ação (retanguloAcao).
        const anos = await retanguloDe(page, '.edx-anos')
        if (!anos) falha(`${rot}: navegação por ano não encontrada`)
        // no desktop é uma coluna de 11 anos: basta o primeiro estar na dobra
        else if (anos.top + 44 > h) falha(`${rot}: navegação por ano abaixo da dobra (y=${Math.round(anos.top)})`)
        else if (cruza(aviso, anos)) falha(`${rot}: o aviso cobre a navegação por ano`)
      } else {
        const acao = await retanguloAcao(page)
        if (!acao) falha(`${rot}: ação principal do herói não encontrada`)
        else if (acao.bottom > h) falha(`${rot}: ação principal "${acao.texto}" abaixo da dobra (y=${Math.round(acao.bottom)})`)
        else if (cruza(aviso, acao)) falha(`${rot}: o aviso cobre a ação principal "${acao.texto}"`)
      }
      if (w <= 900) {
        const abas = await retanguloDe(page, '.scw-abas')
        if (cruza(aviso, abas)) falha(`${rot}: o aviso cobre a barra de abas`)
      }
      const reserva = await page.evaluate(() => document.body.style.getPropertyValue('--scw-aviso-h'))
      if (!reserva) falha(`${rot}: --scw-aviso-h não foi escrito`)
      await page.locator('.cookie-consent__btn--recusar').click()
      const sobrou = await page.evaluate(() => [!!document.querySelector('.cookie-consent'), document.body.style.getPropertyValue('--scw-aviso-h')])
      if (sobrou[0] || sobrou[1]) falha(`${rot}: recusar deveria remover o aviso e a reserva`)
      await ctx.close()
    }
  }
  if (!falhas.some((f) => f.includes('aviso'))) ok('aviso não cobre ação, anos de Edições nem abas; recusar limpa a reserva')
}

async function rotasDiferidas(navegador) {
  console.log('\n3 · rotas diferidas, reveal e foco')
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await navegador.newContext({ viewport: { width: w, height: h } })
    await ctx.addInitScript(() => localStorage.setItem('scw_privacidade', JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 864e5 * 180 })))
    const page = await ctx.newPage()
    const erros = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.goto(`${BASE}/?preview=1#/`, { waitUntil: 'networkidle' })
    for (const rota of ['/sweet-awards', '/participar', '/apoiar', '/contato', '/edicoes', '/']) {
      await page.evaluate((r) => { window.location.hash = `#${r}` }, rota)
      await page.waitForFunction(() => !document.querySelector('.scw-carregando'), null, { timeout: 15000 })
      await page.waitForTimeout(500)
      const rot = `${rota} @${w}`
      if (rota !== '/edicoes') {
        const ligado = await page.evaluate(() => document.documentElement.classList.contains('scw-mo-on') && document.querySelectorAll('[data-mo]').length)
        if (!ligado) falha(`${rot}: o motor de movimento não ligou na página carregada sob demanda`)
      }
      const foco = await page.evaluate(() => document.activeElement && document.activeElement.id)
      if (foco !== 'conteudo') falha(`${rot}: depois de navegar o foco deveria estar no conteúdo (está em "${foco}")`)
      await rolarTudo(page)
      const n = await invisiveis(page)
      if (n) falha(`${rot}: ${n} bloco(s) invisível(is) depois de rolar`)
    }
    if (erros.length) falha(`@${w}: erro de página — ${erros[0]}`)
    await ctx.close()
  }
  if (!falhas.some((f) => /motor|foco|invisív|erro de página/.test(f))) ok('motor liga após a montagem, nada preso invisível, foco no conteúdo')
}

async function folhaMais(navegador) {
  console.log('\n4 · folha "mais" no celular')
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(() => localStorage.setItem('scw_privacidade', JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 864e5 * 180 })))
  const page = await ctx.newPage()
  await page.goto(`${BASE}/?preview=1#/participar`, { waitUntil: 'networkidle' })
  const mais = page.locator('.scw-abas button[aria-haspopup="dialog"]')
  await mais.focus()
  await page.keyboard.press('Enter')
  await page.waitForSelector('.scw-folha[role="dialog"]')
  const travou = await page.evaluate(() => document.body.style.overflow)
  if (travou !== 'hidden') falha('folha aberta não travou a rolagem do fundo')
  await page.keyboard.press('Escape')
  await page.waitForSelector('.scw-folha', { state: 'detached', timeout: 3000 }).catch(() => falha('Escape não fechou a folha'))
  const depois = await page.evaluate(() => [document.body.style.overflow, document.activeElement && document.activeElement.getAttribute('aria-haspopup')])
  if (depois[0] === 'hidden') falha('rolagem continuou travada depois de fechar')
  if (depois[1] !== 'dialog') falha('o foco não voltou para a aba "mais"')
  if (!falhas.some((f) => /folha|rolagem|aba "mais"/.test(f))) ok('Escape fecha, foco volta, rolagem destrava')
  await ctx.close()
}

async function movimentoETimers(navegador) {
  console.log('\n5 · movimento reduzido e timers do crossfade')
  const reduzido = await navegador.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  await reduzido.addInitScript(() => localStorage.setItem('scw_privacidade', JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 864e5 * 180 })))
  let page = await reduzido.newPage()
  await page.goto(`${BASE}/?preview=1#/participar`, { waitUntil: 'networkidle' })
  const r = await page.evaluate(() => ({
    camadas: document.querySelectorAll('.scw-hero-banda__foto').length,
    pausa: document.querySelectorAll('.scw-pausa-fotos').length,
    motor: document.documentElement.classList.contains('scw-mo-on'),
  }))
  if (r.camadas !== 1) falha(`sem movimento: ${r.camadas} camadas de foto (esperado 1)`)
  if (r.pausa) falha('sem movimento: botão de pausa não deveria existir')
  if (r.motor) falha('sem movimento: o motor de movimento não deveria ligar')
  await reduzido.close()

  const normal = await navegador.newContext({ viewport: { width: 1440, height: 900 } })
  await normal.addInitScript(() => {
    localStorage.setItem('scw_privacidade', JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 864e5 * 180 }))
    const pendentes = new Map()
    const st = window.setTimeout.bind(window)
    const ct = window.clearTimeout.bind(window)
    window.setTimeout = (fn, ms, ...a) => {
      const id = st(() => { pendentes.delete(id); typeof fn === 'function' && fn(...a) }, ms)
      pendentes.set(id, ms)
      return id
    }
    window.clearTimeout = (id) => { pendentes.delete(id); ct(id) }
    window.__relogiosHeroi = () => [...pendentes.values()].filter((ms) => ms === 6200).length
  })
  page = await normal.newPage()
  await page.goto(`${BASE}/?preview=1#/participar`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const conta = () => page.evaluate(() => window.__relogiosHeroi())
  if ((await conta()) < 1) falha('com movimento: o crossfade do herói não agendou a troca')
  const pausa = page.locator('.scw-pausa-fotos:visible').first()
  if (!(await pausa.count())) falha('com movimento: botão de pausa ausente')
  else {
    await pausa.click()
    if ((await pausa.getAttribute('aria-pressed')) !== 'true') falha('pausa: aria-pressed não virou true')
    await page.waitForTimeout(100)
    if (await conta()) falha('pausa: o relógio continuou agendado')
    await pausa.click()
    await page.waitForTimeout(100)
    if ((await conta()) < 1) falha('retomar: o relógio não voltou')
  }
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(100)
  if (await conta()) falha('aba oculta: o relógio continuou agendado')
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
    // Página SEM herói em crossfade (Edições ganhou o seu em 14/10/2026): o que
    // se mede é o relógio da página anterior parar.
    window.location.hash = '#/privacidade'
  })
  await page.waitForTimeout(1200)
  if (await conta()) falha('saiu da página: o relógio do herói anterior ficou agendado')
  await normal.close()
  if (!falhas.some((f) => /movimento|pausa|relógio|retomar/.test(f))) ok('reduzido: 1 foto, sem pausa, sem motor; relógio some ao pausar, ocultar e sair')
}

await exigirPortaLivre(PORT)
const preview = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  cwd: join(__dirname, '..'), shell: true, stdio: ['ignore', 'pipe', 'pipe'],
})
let navegador
try {
  await waitForServer(BASE)
  navegador = await chromium.launch()
  await gate(navegador)
  await cookies(navegador)
  await rotasDiferidas(navegador)
  await folhaMais(navegador)
  await movimentoETimers(navegador)
} catch (e) {
  falha(`erro inesperado: ${e.message}`)
} finally {
  if (navegador) await navegador.close()
  killTree(preview.pid)
}
console.log(falhas.length ? `\n✗ ${falhas.length} falha(s)` : '\n✓ casca institucional ok')
process.exit(falhas.length ? 1 : 0)
