/*
 * Privacidade no navegador, contra o BUILD (vite preview) — 13/10/2026.
 *
 *   npm run build && npm run test:privacidade
 *
 * Modelo: medição LIGADA por padrão (legítimo interesse), recusa a um clique.
 * Confere pela REDE, não por comentário nem por cookie:
 *   1. primeira visita → aviso curto; gtag.js uma vez, page_view uma vez, com
 *      endereço limpo; cookies _ga (duração registrada);
 *   2. "Recusar" no aviso → _ga apagados, nada das páginas seguintes enviado;
 *      preferência e sessionStorage do painel intactos; Global Privacy Control
 *      chega recusado;
 *   3. "Ok, entendi" → aviso some, medição continua sem duplicar;
 *   4/5. revogação pelas preferências → idem à recusa;
 *   6. retorno com escolha salva; escolha vencida faz o aviso voltar;
 *   diálogo: foco inicial, contenção, Escape sem salvar, retorno ao gatilho;
 *   documentos legais por link direto; celular, zoom, movimento reduzido.
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
  // O site não liga o Analytics em localhost; aqui ele precisa ligar (src/lib/analytics.js).
  await ctx.addInitScript(() => localStorage.setItem('scw_ga_local', '1'))
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
  console.log('\n1 · primeira visita (medição ligada) e 2 · recusa pelo aviso')
  const { ctx, reqs, eventos } = await contexto(nav)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/#/participar?email=ana@x.com&utm_source=teste`, { waitUntil: 'networkidle' })
  await ate(() => pageViews(eventos).length >= 1)
  await parada(page)
  if (!(await page.locator('.cookie-consent').isVisible())) falha('aviso não apareceu na primeira visita')
  if (scriptsGA(reqs).length !== 1) falha(`primeira visita: gtag.js ${scriptsGA(reqs).length}×, esperado 1`)
  const pv = pageViews(eventos)
  if (pv.length !== 1) falha(`primeira visita: ${pv.length} page_view, esperado 1`)
  else {
    ok(`primeira visita: gtag.js 1×, 1 page_view (${pv[0].dl}), aviso na tela`)
    // Endereço limpo desde 14/10/2026: a query do hash antigo vai para a busca, e o
    // enderecoLimpo mantém só utm_* — o e-mail nunca chega ao Analytics.
    if (!/\/participar(\?utm_source=teste)?$/.test(pv[0].dl) || /email|ana@/.test(pv[0].dl)) falha(`endereço do page_view não é a rota limpa: ${pv[0].dl}`)
    info(`consentimento declarado no envio: gcs=${pv[0].gcs}`)
  }
  const cs = await cookiesGA(ctx)
  if (!cs.length) falha('primeira visita não criou cookie _ga')
  for (const c of cs) info(`cookie ${c.name} · expira em ${Math.round((c.expires * 1000 - Date.now()) / 864e5)} dias`)
  const terceiros = [...new Set(reqs.map((u) => new URL(u).host).filter((h) => !h.startsWith('localhost') && !GA.test(h)))]
  info(`outros hosts (fora o Analytics): ${terceiros.join(', ') || 'nenhum'}`)

  // Recusar no aviso: corta na hora, apaga _ga, nada das páginas seguintes sai.
  await page.evaluate(() => sessionStorage.setItem('scw_org_conta', 'teste-nao-e-segredo'))
  await page.locator('.cookie-consent__btn--recusar').click()
  await parada(page, 800)
  if ((await cookiesGA(ctx)).length) falha('recusa não apagou os cookies _ga')
  for (const r of ['/#/contato', '/#/edicoes']) {
    await page.goto(`${BASE}${r}`)
    await parada(page, 1500)
  }
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await parada(page, 7000)   // tempo de sobra para qualquer lote pendente sair
  const depois = eventos.filter((e) => /\/(contato|edicoes)$/.test(e.dl))
  if (depois.length) falha(`depois de recusar saíram eventos: ${depois.map((e) => `${e.en}@${e.dl}`).join(', ')}`)
  else ok('recusa: _ga apagados e nenhum evento das páginas seguintes enviado')
  const resto = await page.evaluate(() => ({
    pref: JSON.parse(localStorage.getItem('scw_privacidade') || 'null'),
    sessao: sessionStorage.getItem('scw_org_conta'),
    aviso: !!document.querySelector('.cookie-consent'),
  }))
  if (!resto.pref || resto.pref.analise !== false || resto.pref.v !== 1) falha(`recusa não gravou direito: ${JSON.stringify(resto.pref)}`)
  if (resto.sessao !== 'teste-nao-e-segredo') falha('recusa mexeu no sessionStorage do painel')
  if (resto.aviso) falha('aviso continuou depois de recusar')
  const vazou = eventos.filter((e) => /ana@x\.com|email=/.test(e.bruto) || /#|\?(?!utm_)/.test(e.dl))
  if (vazou.length) falha(`dado da URL de entrada vazou: ${vazou[0].en}@${vazou[0].dl}`)
  else ok(`${eventos.length} evento(s) enviados, todos com endereço limpo e sem dado pessoal`)
  await ctx.close()

  // Retorno com a recusa salva: nada do Analytics.
  const volta = await contexto(nav)
  await volta.ctx.addInitScript(() => localStorage.setItem('scw_privacidade', JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 864e5 * 180 })))
  const p2 = await volta.ctx.newPage()
  await p2.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await parada(p2)
  if (doGA(volta.reqs).length) falha('retorno com recusa salva chamou o Analytics')
  else if (await p2.locator('.cookie-consent').count()) falha('retorno com recusa salva mostrou o aviso')
  else ok('retorno com recusa salva: zero requisições ao Analytics, sem aviso')
  await volta.ctx.close()

  // Global Privacy Control: chega recusado.
  const gpc = await contexto(nav)
  await gpc.ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true }))
  const p3 = await gpc.ctx.newPage()
  await p3.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await parada(p3)
  if (doGA(gpc.reqs).length) falha('navegador com Global Privacy Control chamou o Analytics')
  else ok('Global Privacy Control: zero requisições ao Analytics')
  await gpc.ctx.close()
}

async function okRevogacaoRetorno (nav) {
  console.log('\n3 · "Ok, entendi" · 4/5 · revogação pelas preferências · 6 · retorno')
  const { ctx, reqs, eventos } = await contexto(nav)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/#/participar`, { waitUntil: 'networkidle' })
  await ate(() => pageViews(eventos).length >= 1)
  await page.locator('.cookie-consent__btn--aceitar').click()
  await parada(page, 600)
  if (await page.locator('.cookie-consent').count()) falha('"Ok, entendi" não fechou o aviso')
  // Troca de página DENTRO do site (mesmo documento), como um clique no menu.
  await page.evaluate(() => { window.location.hash = '#/apoiar' })
  await ate(() => pageViews(eventos).length >= 2)
  await parada(page, 1500)
  const pv = pageViews(eventos)
  if (pv.length !== 2) falha(`depois de ir a Apoiar: ${pv.length} page_view, esperado 2`)
  else ok(`"Ok, entendi" fecha o aviso; troca de página: +1 page_view (${pv[1].dl}), sem duplicar`)
  if (scriptsGA(reqs).length !== 1) falha(`gtag.js pedido ${scriptsGA(reqs).length}×, esperado 1`)

  // Revogação: rodapé → preferências → desliga → Salvar.
  await page.locator('.scw-footer__legal button').click()
  await page.locator('.scw-pref[open]').waitFor()
  const chave = page.locator('.scw-pref__chave')
  // O diálogo abre e o estado chega no render seguinte: esperar, não ler na hora.
  const ligada = await page.waitForFunction(() => document.querySelector('.scw-pref__chave')?.getAttribute('aria-checked') === 'true', null, { timeout: 3000 }).then(() => true, () => false)
  if (!ligada) falha('preferências não mostram a análise ligada')
  await chave.click()
  await page.locator('.scw-pref__btn--salvar').click()
  await parada(page, 800)
  if ((await cookiesGA(ctx)).length) falha('revogação não apagou os cookies _ga')
  for (const r of ['/#/contato', '/#/edicoes']) { await page.goto(`${BASE}${r}`); await parada(page, 1500) }
  await parada(page, 7000)
  const depois = eventos.filter((e) => /\/(contato|edicoes)$/.test(e.dl))
  if (depois.length) falha(`depois de revogar saíram eventos: ${depois.map((e) => `${e.en}@${e.dl}`).join(', ')}`)
  else ok('revogação pelas preferências: _ga apagados e nenhum evento novo')
  await ctx.close()

  // Retorno com "ok" salvo: carrega uma vez, sem aviso.
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
  if (scriptsGA(volta.reqs).length !== 1 || pageViews(volta.eventos).length !== 1) falha(`retorno: gtag.js ${scriptsGA(volta.reqs).length}×, page_view ${pageViews(volta.eventos).length}×`)
  else if (await p2.locator('.cookie-consent').count()) falha('retorno com escolha salva mostrou o aviso')
  else ok('retorno com "ok" salvo: gtag.js 1×, page_view 1×, sem aviso')
  await volta.ctx.close()

  // Escolha vencida: o aviso volta.
  const vencido = await contexto(nav)
  await vencido.ctx.addInitScript(() => localStorage.setItem('scw_privacidade', JSON.stringify({ v: 1, analise: false, em: Date.now() - 864e5 * 200, ate: Date.now() - 864e5 })))
  const p3 = await vencido.ctx.newPage()
  await p3.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await parada(p3, 900)
  if (!(await p3.locator('.cookie-consent').isVisible())) falha('escolha vencida não fez o aviso voltar')
  else ok('escolha vencida: o aviso volta')
  await vencido.ctx.close()
}

async function dialogo (nav) {
  console.log('\n· diálogo de preferências: teclado, foco, Escape')
  const { ctx } = await contexto(nav)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/#/contato`, { waitUntil: 'networkidle' })
  const gatilho = page.locator('.scw-footer__legal button')
  await gatilho.focus()
  await page.keyboard.press('Enter')
  await page.locator('.scw-pref[open]').waitFor()
  const inicial = await page.evaluate(() => document.activeElement.id)
  if (inicial !== 'scw-pref-titulo') falha(`foco inicial em "${inicial}", esperado o título`)
  else ok('foco inicial no título do diálogo')
  let fora = 0
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab')
    if (!(await page.evaluate(() => !!document.activeElement.closest('.scw-pref')))) fora++
  }
  if (fora) falha(`Tab saiu do diálogo ${fora} vez(es)`)
  else ok('Tab fica dentro do diálogo')
  const chave = page.locator('.scw-pref__chave')
  await chave.focus()
  await page.keyboard.press('Space')
  const desligou = await page.waitForFunction(() => document.querySelector('.scw-pref__chave')?.getAttribute('aria-checked') === 'false', null, { timeout: 3000 }).then(() => true, () => false)
  if (!desligou) falha('interruptor não anunciou o estado desligado')
  await page.keyboard.press('Escape')
  await parada(page, 400)
  const depois = await page.evaluate(() => ({
    aberto: !!document.querySelector('.scw-pref[open]'),
    noGatilho: !!document.activeElement.closest('.scw-footer__legal'),
    pref: localStorage.getItem('scw_privacidade'),
  }))
  if (depois.aberto) falha('Escape não fechou o diálogo')
  if (!depois.noGatilho) falha('foco não voltou ao gatilho do rodapé')
  if (depois.pref !== null) falha('Escape salvou a preferência')
  if (!depois.aberto && depois.noGatilho && depois.pref === null) ok('Escape fecha sem salvar e devolve o foco ao rodapé')
  await ctx.close()
}

async function documentos (nav) {
  console.log('\n12 · documentos legais por link direto')
  for (const [url, titulo] of [
    ['/privacidade', 'Política de Privacidade'],
    ['/cookies', 'Política de Cookies'],
    ['/termos', 'Termos de Uso'],
    ['/uso-de-imagem', 'Uso de imagem'],
    ['/#/privacidade', 'Política de Privacidade'],
  ]) {
    const { ctx } = await contexto(nav)
    const page = await ctx.newPage()
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' })
    await page.reload({ waitUntil: 'networkidle' })
    const h1 = (await page.locator('h1').first().textContent() || '').trim()
    if (h1 !== titulo) falha(`${url}: h1 "${h1}", esperado "${titulo}"`)
    else ok(`${url} abre "${titulo}" depois de recarregar`)
    if ((await page.locator('.scw-footer__legal a').count()) !== 4) falha(`${url}: rodapé sem os 4 links legais`)
    await ctx.close()
  }
  const { ctx } = await contexto(nav)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/#/privacidade`, { waitUntil: 'networkidle' })
  const mail = await page.locator('a[href^="mailto:"]').first().getAttribute('href')
  if (mail !== 'mailto:contato@fabrica2.com.br?subject=Privacidade%20%E2%80%94%20Sweet%20%26%20Coffee%20Week') falha(`mailto errado: ${mail}`)
  else ok('canal de privacidade: mailto com o assunto "Privacidade — Sweet & Coffee Week"')
  await page.goto(`${BASE}/#/uso-de-imagem`, { waitUntil: 'networkidle' })
  const mailImg = await page.locator('a[href^="mailto:"]').first().getAttribute('href')
  if (!/subject=Retirada%20de%20imagem/.test(mailImg || '')) falha(`mailto de imagem errado: ${mailImg}`)
  else ok('uso de imagem: mailto com o assunto "Retirada de imagem — Sweet & Coffee Week"')
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
      const botoes = [...document.querySelectorAll('.cookie-consent button')].map((b) => Math.round(b.getBoundingClientRect().height))
      return { top: a.top, bottom: a.bottom, h: a.height, abas: t, fonte, botoes, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }
    })
    info(`${nome}: aviso ${Math.round(m.h)}px de altura (topo y=${Math.round(m.top)}), texto ${m.fonte}px, botões ${m.botoes.join('/')}px`)
    if (m.bottom > m.abas + 1) falha(`${nome}: aviso cobre a barra de abas`)
    if (m.sw > m.cw) falha(`${nome}: rolagem horizontal com o aviso`)
    if (Math.min(...m.botoes) < 44) falha(`${nome}: botão abaixo de 44px`)
    if (m.fonte < 14) falha(`${nome}: texto do aviso abaixo de 14px`)
    await page.screenshot({ path: join(CAPTURAS, `aviso-${nome}.png`) })
    await page.evaluate(() => document.querySelector('.scw-footer__legal button').click())
    await page.locator('.scw-pref[open]').waitFor()
    const anim = await page.evaluate(() => getComputedStyle(document.querySelector('.scw-pref')).animationName)
    if (anim !== 'none') falha(`${nome}: diálogo anima com movimento reduzido (${anim})`)
    await page.screenshot({ path: join(CAPTURAS, `dialogo-${nome}.png`) })
    await page.keyboard.press('Escape')
    for (const doc of ['privacidade', 'cookies', 'termos', 'uso-de-imagem']) {
      await page.goto(`${BASE}/#/${doc}`, { waitUntil: 'networkidle' })
      await page.locator('.cookie-consent__btn--aceitar').click().catch(() => {})
      await parada(page, 400)
      const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (sw > 0) falha(`${nome} /${doc}: rolagem horizontal de ${sw}px`)
      await page.screenshot({ path: join(CAPTURAS, `${doc}-${nome}.png`), fullPage: nome !== '1440' })
    }
    await ctx.close()
  }
  ok('capturas em tests/capturas-privacidade/')

  // Zoom 200% de uma tela 1280×720 = 640×360 CSS px.
  const z = await contexto(nav, { viewport: { width: 640, height: 360 } })
  const pz = await z.ctx.newPage()
  await pz.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await parada(pz, 900)
  const zz = await pz.evaluate(() => { const r = document.querySelector('.cookie-consent').getBoundingClientRect(); return { top: r.top } })
  if (zz.top < 0) falha(`zoom 200%: aviso sai pelo topo (y=${Math.round(zz.top)})`)
  else ok('zoom 200% (640×360): aviso dentro da tela')
  await pz.evaluate(() => document.querySelector('.scw-footer__legal button').click())
  const dz = await pz.evaluate(() => { const r = document.querySelector('.scw-pref').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, ih: innerHeight } })
  if (dz.top < 0 || dz.bottom > dz.ih + 1) falha('zoom 200%: diálogo sai da tela')
  else ok('zoom 200%: diálogo dentro da tela')
  await pz.screenshot({ path: join(CAPTURAS, 'dialogo-zoom200.png') })
  await z.ctx.close()

  // Pré-cadastro estático: sem Analytics, nota com link.
  const q = await contexto(nav, { viewport: { width: 390, height: 844 } })
  const pq = await q.ctx.newPage()
  await pq.goto(`${BASE}/quero-participar/`, { waitUntil: 'networkidle' })
  await parada(pq, 2500)
  if (doGA(q.reqs).length) falha('/quero-participar/ chamou o Analytics')
  if (!(await pq.locator('.pa-nota a[href="/#/privacidade"]').count())) falha('/quero-participar/: nota sem link para a Política de Privacidade')
  else ok('/quero-participar/: nota com link para a Política de Privacidade')
  info(`/quero-participar/ fala com: ${[...new Set(q.reqs.map((u) => new URL(u).host).filter((h) => !h.startsWith('localhost')))].join(', ') || 'nenhum host externo'}`)
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
  await okRevogacaoRetorno(nav)
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
