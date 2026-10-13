/*
 * Privacidade no navegador, contra o BUILD (vite preview) — 13/10/2026.
 *
 *   npm run build && npm run test:privacidade
 *
 * Confere pela REDE, não por comentário nem por cookie:
 *   1. primeira visita sem escolha → nenhuma requisição ao Google Analytics
 *      (googletagmanager.com, google-analytics.com), nenhum gtag/dataLayer,
 *      nenhum cookie _ga;
 *   2. recusa → idem, navegando entre páginas;
 *   3. aceite → gtag.js uma vez só, page_view da página atual uma vez, com
 *      endereço limpo; cookies _ga criados (duração registrada);
 *   4/5. revogação na mesma sessão pelo diálogo → _ga apagados, nenhum envio
 *      novo; preferência e sessionStorage do painel intactos;
 *   6. retorno com aceite salvo → carrega uma vez, sem duplicar page_view;
 *   diálogo: foco inicial, contenção, Escape sem salvar, retorno ao gatilho;
 *   documentos legais por link direto e por hash, sem aceitar nada;
 *   celular, zoom 200% e movimento reduzido; capturas finais.
 *
 * Os envios ao Google (`/g/collect`) são INTERCEPTADOS e respondidos aqui com
 * 204 — o teste observa a requisição sem sujar a propriedade real. O gtag.js
 * vem da rede de verdade (precisa de internet).
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5214
const BASE = `http://localhost:${PORT}`
const CAPTURAS = join(__dirname, 'capturas-privacidade')
const GA = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com/
const falhas = []
const falha = (m) => { falhas.push(m); console.log(`  ✗ ${m}`) }
const ok = (m) => console.log(`  ✓ ${m}`)
const info = (m) => console.log(`  · ${m}`)

function killTree (pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    else process.kill(-pid, 'SIGKILL')
  } catch { /* já morto */ }
}
async function esperar (url, ms = 30000) {
  const t = Date.now()
  while (Date.now() - t < ms) {
    try { if ((await fetch(url)).ok) return } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 350))
  }
  throw new Error('preview não respondeu')
}

/* Contexto com a rede anotada e o /g/collect interceptado. */
async function contexto (navegador, opcoes = {}) {
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, ...opcoes })
  const reqs = []
  const eventos = []   // cada evento do GA4, da URL e das linhas do corpo (envio em lote)
  ctx.on('request', (r) => {
    reqs.push(r.url())
    if (!/\/g\/collect/.test(r.url())) return
    const q = new URL(r.url()).searchParams
    const linhas = (r.postData() || '').split(/\r?\n/).filter(Boolean)
    const bruto = `${decodeURIComponent(r.url())} ${decodeURIComponent(r.postData() || '')}`
    for (const l of linhas.length ? linhas : ['']) {
      const e = new URLSearchParams(l)
      eventos.push({ en: e.get('en') || q.get('en'), dl: e.get('dl') || q.get('dl') || '', gcs: q.get('gcs'), bruto })
    }
  })
  await ctx.route(/\/g\/collect/, (r) => r.fulfill({ status: 204, body: '' }))
  return { ctx, reqs, eventos }
}
const doGA = (reqs) => reqs.filter((u) => GA.test(u))
const coletas = (reqs) => reqs.filter((u) => /\/g\/collect/.test(u))
const pageViews = (ev) => ev.filter((e) => e.en === 'page_view')
async function ate (cond, ms = 12000) {
  const t = Date.now()
  while (Date.now() - t < ms) { if (cond()) return true; await new Promise((r) => setTimeout(r, 250)) }
  return cond()
}
const scriptsGA = (reqs) => reqs.filter((u) => /googletagmanager\.com\/gtag\/js/.test(u))
const cookiesGA = async (ctx) => (await ctx.cookies()).filter((c) => /^_ga/.test(c.name))
const parada = (page, ms = 2500) => page.waitForTimeout(ms)

async function primeiraVisitaERecusa (nav) {
  console.log('\n1 · primeira visita sem escolha e 2 · recusa')
  const { ctx, reqs } = await contexto(nav)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await parada(page)
  const estado = await page.evaluate(() => ({ gtag: typeof window.gtag, dl: typeof window.dataLayer }))
  if (doGA(reqs).length) falha(`antes da escolha houve ${doGA(reqs).length} requisição(ões) ao Analytics: ${doGA(reqs)[0]}`)
  else ok('antes da escolha: zero requisições ao Analytics')
  if (estado.gtag !== 'undefined' || estado.dl !== 'undefined') falha(`antes da escolha: gtag=${estado.gtag} dataLayer=${estado.dl}`)
  if ((await cookiesGA(ctx)).length) falha('antes da escolha: cookie _ga existe')
  const terceiros = [...new Set(reqs.map((u) => new URL(u).host).filter((h) => !h.startsWith('localhost')))]
  info(`outros hosts na primeira visita (sem relação com Analytics): ${terceiros.join(', ') || 'nenhum'}`)
  if (!(await page.locator('.cookie-consent').isVisible())) falha('aviso não apareceu na primeira visita')

  await page.locator('.cookie-consent__btn--recusar').click()
  for (const r of ['/#/contato', '/#/apoiar', '/#/edicoes', '/#/privacidade']) {
    await page.goto(`${BASE}${r}`, { waitUntil: 'networkidle' })
    await parada(page, 1200)
  }
  const salvo = await page.evaluate(() => JSON.parse(localStorage.getItem('scw_privacidade') || 'null'))
  if (doGA(reqs).length) falha(`depois de recusar houve requisição ao Analytics: ${doGA(reqs)[0]}`)
  else ok('depois de recusar, navegando por 4 páginas: zero requisições ao Analytics')
  if (!salvo || salvo.analise !== false || salvo.v !== 1) falha(`recusa não gravou direito: ${JSON.stringify(salvo)}`)
  if (await page.locator('.cookie-consent').count()) falha('aviso continuou depois de recusar')
  await ctx.close()
}

async function aceiteRevogacaoRetorno (nav) {
  console.log('\n3 · aceite · 4/5 · revogação na mesma sessão · 6 · retorno')
  const { ctx, reqs, eventos } = await contexto(nav)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/#/participar?email=ana@x.com&utm_source=teste`, { waitUntil: 'networkidle' })
  await parada(page, 1500)
  if (doGA(reqs).length) falha('requisição ao Analytics antes do aceite')
  await page.locator('.cookie-consent__btn--aceitar').click()
  await ate(() => pageViews(eventos).length >= 1)
  await parada(page)
  const pv = pageViews(eventos)
  if (scriptsGA(reqs).length !== 1) falha(`gtag.js pedido ${scriptsGA(reqs).length} vez(es), esperado 1`)
  else ok('aceite: gtag.js carregado uma vez')
  if (pv.length !== 1) falha(`page_view após o aceite: ${pv.length}, esperado 1`)
  else {
    const dl = pv[0].dl
    ok(`aceite: 1 page_view, dl=${dl}`)
    if (!/\/participar$/.test(dl)) falha(`endereço do page_view não é a rota limpa: ${dl}`)
    info(`consentimento declarado no envio: gcs=${pv[0].gcs}`)
  }
  const cs = await cookiesGA(ctx)
  if (!cs.length) falha('aceite não criou cookie _ga')
  for (const c of cs) {
    const dias = c.expires > 0 ? Math.round((c.expires * 1000 - Date.now()) / 864e5) : 'sessão'
    info(`cookie ${c.name} · domínio ${c.domain} · expira em ${dias} dias`)
  }

  // Navegação depois do aceite: um page_view por troca, nenhum duplicado.
  await page.goto(`${BASE}/#/apoiar`)
  // O GA4 manda em lote: o segundo page_view pode levar alguns segundos.
  await ate(() => pageViews(eventos).length >= 2)
  await parada(page, 1500)
  const pv2 = pageViews(eventos)
  if (pv2.length !== 2) falha(`depois de ir a Apoiar: ${pv2.length} page_view, esperado 2`)
  else ok(`troca de página: +1 page_view (${pv2[1].dl}), sem duplicar`)
  if (scriptsGA(reqs).length !== 1) falha('gtag.js pedido de novo na troca de página')

  // Sessão do painel: fica intacta na revogação.
  await page.evaluate(() => sessionStorage.setItem('scw_org_conta', 'teste-nao-e-segredo'))

  // Revogação pelo rodapé → diálogo → Recusar opcionais.
  await page.locator('.scw-footer__legal button').click()
  await page.locator('.scw-pref[open]').waitFor()
  await page.locator('.scw-pref__btn', { hasText: 'Recusar opcionais' }).click()
  await parada(page, 800)
  if ((await cookiesGA(ctx)).length) falha('revogação não apagou os cookies _ga')
  else ok('revogação: cookies _ga apagados')
  await page.goto(`${BASE}/#/contato`)
  await parada(page)
  await page.goto(`${BASE}/#/edicoes`)
  await parada(page)
  // Sinal de saída de página também não pode sair.
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await parada(page, 1000)
  await parada(page, 7000)   // tempo de sobra para qualquer lote pendente sair
  const depois = eventos.filter((e) => /\/(contato|edicoes)$/.test(e.dl))
  if (depois.length) falha(`depois de revogar saíram eventos de páginas visitadas depois: ${depois.map((e) => `${e.en}@${e.dl}`).join(', ')}`)
  else ok('depois de revogar, navegando por 2 páginas: nenhum evento delas foi enviado')
  // Nenhum envio, em momento algum, levou o e-mail da URL de entrada nem endereço cru.
  const vazou = eventos.filter((e) => /ana@x\.com|email=|[?#&]email/.test(e.bruto) || /#|\?(?!utm_)/.test(e.dl))
  if (vazou.length) falha(`dado da URL de entrada vazou para o Analytics: ${vazou[0].en}@${vazou[0].dl}`)
  else ok(`${eventos.length} evento(s) enviados, todos com endereço limpo e sem dado pessoal (${[...new Set(eventos.map((e) => e.en))].join(', ')})`)
  const resto = await page.evaluate(() => ({
    pref: JSON.parse(localStorage.getItem('scw_privacidade') || 'null'),
    sessao: sessionStorage.getItem('scw_org_conta'),
  }))
  if (!resto.pref || resto.pref.analise !== false) falha('revogação não gravou a preferência')
  if (resto.sessao !== 'teste-nao-e-segredo') falha('revogação mexeu no sessionStorage do painel')
  else ok('revogação preserva a preferência e a sessão do painel')
  await ctx.close()

  // Retorno com aceite salvo.
  const volta = await contexto(nav)
  await volta.ctx.addInitScript(() => {
    if (!localStorage.getItem('scw_privacidade')) {
      localStorage.setItem('scw_privacidade', JSON.stringify({ v: 1, analise: true, em: Date.now(), ate: Date.now() + 864e5 * 180 }))
    }
  })
  const p2 = await volta.ctx.newPage()
  await p2.goto(`${BASE}/#/contato`, { waitUntil: 'networkidle' })
  await ate(() => pageViews(volta.eventos).length >= 1)
  await parada(p2, 3000)
  const pvVolta = pageViews(volta.eventos)
  if (scriptsGA(volta.reqs).length !== 1 || pvVolta.length !== 1) falha(`retorno: gtag.js ${scriptsGA(volta.reqs).length}×, page_view ${pvVolta.length}×`)
  else ok('retorno com aceite salvo: gtag.js 1×, page_view 1×, sem aviso')
  if (await p2.locator('.cookie-consent').count()) falha('retorno com aceite salvo mostrou o aviso')
  await volta.ctx.close()

  // Registro vencido: aviso volta e nada é carregado.
  const vencido = await contexto(nav)
  await vencido.ctx.addInitScript(() => localStorage.setItem('scw_privacidade', JSON.stringify({ v: 1, analise: true, em: Date.now() - 864e5 * 200, ate: Date.now() - 864e5 })))
  const p3 = await vencido.ctx.newPage()
  await p3.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await parada(p3)
  if (doGA(vencido.reqs).length) falha('aceite vencido ainda carregou o Analytics')
  else if (!(await p3.locator('.cookie-consent').isVisible())) falha('aceite vencido não fez o aviso voltar')
  else ok('aceite vencido: aviso volta, Analytics não carrega')
  await vencido.ctx.close()
}

async function dialogo (nav) {
  console.log('\n· diálogo de preferências: teclado, foco, Escape')
  const { ctx } = await contexto(nav)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/#/contato`, { waitUntil: 'networkidle' })
  await page.locator('.cookie-consent__btn--configurar').focus()
  await page.keyboard.press('Enter')
  await page.locator('.scw-pref[open]').waitFor()
  const inicial = await page.evaluate(() => document.activeElement.id)
  if (inicial !== 'scw-pref-titulo') falha(`foco inicial em "${inicial}", esperado o título`)
  else ok('foco inicial no título do diálogo')
  let fora = 0
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab')
    if (!(await page.evaluate(() => !!document.activeElement.closest('.scw-pref')))) fora++
  }
  if (fora) falha(`Tab saiu do diálogo ${fora} vez(es)`)
  else ok('Tab fica dentro do diálogo')
  const chave = page.locator('.scw-pref__chave')
  await chave.focus()
  await page.keyboard.press('Space')
  if ((await chave.getAttribute('aria-checked')) !== 'true') falha('interruptor não anunciou o estado ligado')
  await page.keyboard.press('Escape')
  await parada(page, 400)
  const depois = await page.evaluate(() => ({
    aberto: !!document.querySelector('.scw-pref[open]'),
    foco: document.activeElement.className,
    pref: localStorage.getItem('scw_privacidade'),
  }))
  if (depois.aberto) falha('Escape não fechou o diálogo')
  if (!/cookie-consent__btn--configurar/.test(depois.foco)) falha(`foco não voltou ao gatilho (está em "${depois.foco}")`)
  if (depois.pref !== null) falha('Escape salvou a preferência')
  if (!depois.aberto && depois.pref === null && /configurar/.test(depois.foco)) ok('Escape fecha sem salvar e devolve o foco ao "Configurar"')
  await ctx.close()
}

async function documentos (nav) {
  console.log('\n12 · documentos legais por link direto, sem aceitar nada')
  for (const [url, titulo] of [
    ['/privacidade', 'Política de Privacidade'],
    ['/cookies', 'Política de Cookies'],
    ['/termos', 'Termos de Uso'],
    ['/#/privacidade', 'Política de Privacidade'],
  ]) {
    const { ctx, reqs } = await contexto(nav)
    const page = await ctx.newPage()
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' })
    await page.reload({ waitUntil: 'networkidle' })
    const h1 = (await page.locator('h1').first().textContent() || '').trim()
    if (h1 !== titulo) falha(`${url}: h1 "${h1}", esperado "${titulo}"`)
    else if (doGA(reqs).length) falha(`${url}: chamou o Analytics`)
    else ok(`${url} abre "${titulo}" depois de recarregar, sem Analytics`)
    if ((await page.locator('.scw-footer__legal a').count()) !== 3) falha(`${url}: rodapé sem os 3 links legais`)
    await ctx.close()
  }
  // Link de privacidade com assunto certo.
  const { ctx } = await contexto(nav)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/#/privacidade`, { waitUntil: 'networkidle' })
  const mail = await page.locator('a[href^="mailto:"]').first().getAttribute('href')
  if (mail !== 'mailto:contato@fabrica2.com.br?subject=Privacidade%20%E2%80%94%20Sweet%20%26%20Coffee%20Week') falha(`mailto errado: ${mail}`)
  else ok('canal de privacidade: mailto com o assunto "Privacidade — Sweet & Coffee Week"')
  await page.goto(`${BASE}/#/cookies`, { waitUntil: 'networkidle' })
  await page.locator('.lg-pref').first().click()
  if (!(await page.locator('.scw-pref[open]').count())) falha('botão da Política de Cookies não abriu as preferências')
  else ok('Política de Cookies abre as preferências')
  await ctx.close()
}

async function telas (nav) {
  console.log('\n· celular, zoom, movimento reduzido, pré-cadastro e capturas')
  mkdirSync(CAPTURAS, { recursive: true })
  for (const [nome, vp] of [['1440', { width: 1440, height: 900 }], ['390', { width: 390, height: 844 }], ['360', { width: 360, height: 800 }]]) {
    const { ctx } = await contexto(nav, { viewport: vp, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    await parada(page, 900)
    const m = await page.evaluate(() => {
      const a = document.querySelector('.cookie-consent').getBoundingClientRect()
      const abas = document.querySelector('.scw-abas')
      const t = abas && getComputedStyle(abas).display !== 'none' ? abas.getBoundingClientRect().top : innerHeight
      const fonte = parseFloat(getComputedStyle(document.querySelector('.cookie-consent__text')).fontSize)
      const botoes = [...document.querySelectorAll('.cookie-consent button, .cookie-consent a')].map((b) => Math.round(b.getBoundingClientRect().height))
      return { top: a.top, bottom: a.bottom, h: a.height, abas: t, fonte, botoes, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }
    })
    info(`${nome}: aviso ${Math.round(m.h)}px de altura (topo y=${Math.round(m.top)}), texto ${m.fonte}px, alvos ${m.botoes.join('/')}px`)
    if (m.bottom > m.abas + 1) falha(`${nome}: aviso cobre a barra de abas`)
    if (m.sw > m.cw) falha(`${nome}: rolagem horizontal com o aviso`)
    if (Math.min(...m.botoes) < 44) falha(`${nome}: alvo de toque abaixo de 44px`)
    if (m.fonte < 14) falha(`${nome}: texto do aviso abaixo de 14px`)
    await page.screenshot({ path: join(CAPTURAS, `aviso-${nome}.png`) })
    await page.locator('.cookie-consent__btn--configurar').click()
    await page.locator('.scw-pref[open]').waitFor()
    const anim = await page.evaluate(() => getComputedStyle(document.querySelector('.scw-pref')).animationName)
    if (anim !== 'none') falha(`${nome}: diálogo anima com movimento reduzido (${anim})`)
    await page.screenshot({ path: join(CAPTURAS, `dialogo-${nome}.png`) })
    await page.keyboard.press('Escape')
    for (const doc of ['privacidade', 'cookies', 'termos']) {
      await page.goto(`${BASE}/#/${doc}`, { waitUntil: 'networkidle' })
      await page.locator('.cookie-consent__btn--recusar').click().catch(() => {})
      await parada(page, 400)
      const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (sw > 0) falha(`${nome} /${doc}: rolagem horizontal de ${sw}px`)
      await page.screenshot({ path: join(CAPTURAS, `${doc}-${nome}.png`), fullPage: nome !== '1440' })
    }
    await ctx.close()
  }
  ok('capturas em tests/capturas-privacidade/')

  // Zoom 200% de uma tela 1280×720 = 640×360 CSS px: o aviso cabe ou rola por dentro.
  const z = await contexto(nav, { viewport: { width: 640, height: 360 } })
  const pz = await z.ctx.newPage()
  await pz.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await parada(pz, 900)
  const zz = await pz.evaluate(() => {
    const el = document.querySelector('.cookie-consent'); const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, rola: el.scrollHeight > el.clientHeight, ih: innerHeight }
  })
  if (zz.top < 0) falha(`zoom 200%: aviso sai pelo topo (y=${Math.round(zz.top)})`)
  else ok(`zoom 200% (640×360): aviso dentro da tela${zz.rola ? ', rolando por dentro' : ''}`)
  await pz.locator('.cookie-consent__btn--configurar').click()
  const dz = await pz.evaluate(() => { const r = document.querySelector('.scw-pref').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, ih: innerHeight } })
  if (dz.top < 0 || dz.bottom > dz.ih + 1) falha('zoom 200%: diálogo sai da tela')
  else ok('zoom 200%: diálogo dentro da tela, com rolagem interna')
  await pz.screenshot({ path: join(CAPTURAS, 'dialogo-zoom200.png') })
  await z.ctx.close()

  // Pré-cadastro estático: sem Analytics, nota com link, o que carrega de fora.
  const q = await contexto(nav, { viewport: { width: 390, height: 844 } })
  const pq = await q.ctx.newPage()
  await pq.goto(`${BASE}/quero-participar/`, { waitUntil: 'networkidle' })
  await parada(pq, 2500)
  if (doGA(q.reqs).length) falha('/quero-participar/ chamou o Analytics')
  const link = await pq.locator('.pa-nota a[href="/#/privacidade"]').count()
  if (!link) falha('/quero-participar/: nota sem link para a Política de Privacidade')
  else ok('/quero-participar/: nota com link para a Política de Privacidade, sem Analytics')
  const hosts = [...new Set(q.reqs.map((u) => new URL(u).host).filter((h) => !h.startsWith('localhost')))]
  info(`/quero-participar/ fala com: ${hosts.join(', ') || 'nenhum host externo'}`)
  info(`cookies no pré-cadastro: ${(await q.ctx.cookies()).map((c) => `${c.name}@${c.domain}`).join(', ') || 'nenhum'}`)
  await q.ctx.close()
}

const preview = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  cwd: join(__dirname, '..'), shell: true, stdio: ['ignore', 'pipe', 'pipe'],
})
let nav
try {
  await esperar(`${BASE}/`)
  nav = await chromium.launch()
  await primeiraVisitaERecusa(nav)
  await aceiteRevogacaoRetorno(nav)
  await dialogo(nav)
  await documentos(nav)
  await telas(nav)
} catch (e) {
  falha(`erro: ${e.message}`)
} finally {
  if (nav) await nav.close()
  killTree(preview.pid)
}
console.log(falhas.length ? `\n✗ ${falhas.length} falha(s)` : '\n✓ privacidade ok')
process.exit(falhas.length ? 1 : 0)
