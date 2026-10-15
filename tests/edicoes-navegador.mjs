/*
 * Edições no navegador — os contratos da visão geral e do detalhe, contra o
 * BUILD de produção (vite preview). A lógica pura (ordem, anos, contagens,
 * vizinhas, rota) está em tests/edicoes.test.mjs.
 *
 *   npm run build && npm run test:edicoes-navegador
 *
 * 1. visão geral (1440×900, 390×844, 360×800): um h1, as 16 edições na ordem,
 *    casca do site (cabeçalho, rodapé com documentos legais), só capas
 *    carregadas, sem rolagem horizontal; navegação por ano presa abaixo do
 *    cabeçalho (desktop) ou no topo (celular), sem cobrir abas nem aviso;
 * 2. as 16 edições por link direto: título, período, marcas, foto da galeria
 *    carregada, sem erro e sem rolagem horizontal;
 * 3. percurso: cartão → detalhe → voltar do navegador (a coleção volta ao
 *    cartão, com foco) → avançar → anterior/próxima → recarregar;
 * 4. galeria: setas, miniaturas, teclado só com o foco nela, ampliar (foco,
 *    Tab preso, Esc, foco de volta); a página não troca nada por tecla;
 * 5. marcas recolhidas e expandidas; premiação só onde houve;
 * 6. movimento reduzido; documentos legais e preferências pelo rodapé;
 * 7. capturas em tests/capturas-edicoes/ (não versionadas).
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5216
const BASE = `http://localhost:${PORT}`
const CAPTURAS = join(__dirname, 'capturas-edicoes')
const falhas = []
const falha = (m) => { falhas.push(m); console.log(`  ✗ ${m}`) }
const ok = (m) => console.log(`  ✓ ${m}`)

const { EDICOES, anos, detalhe } = await import('../src/pages/edicoes/acervo.js')
const ORDEM = anos().flatMap((g) => g.edicoes.map((e) => e.code))
const CAPAS = new Set(EDICOES.map((e) => e.capa.src))
const { fotosAbertura } = await import('../src/pages/edicoes/acervo.js')
fotosAbertura().forEach((f) => CAPAS.add(f.src))

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
async function exigirPortaLivre () {
  try { await fetch(BASE, { signal: AbortSignal.timeout(1500) }) } catch { return }
  console.error(`✗ a porta ${PORT} já está ocupada — o teste mediria o servidor de outro processo`)
  process.exit(1)
}

const ESCOLHA = () => localStorage.setItem('scw_privacidade', JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 864e5 * 180 }))

async function contexto (navegador, w, h, { aviso = false, reduzido = false } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: w, height: h }, reducedMotion: reduzido ? 'reduce' : 'no-preference' })
  if (!aviso) await ctx.addInitScript(ESCOLHA)
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()) })
  return { ctx, page, erros }
}
const retangulo = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return r.width && r.height ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right } : null
}, sel)
const cruza = (a, b) => a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
const rolagemH = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
async function rolarTudo (page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(innerHeight * 0.7)) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 90))
    }
  })
  await page.waitForTimeout(400)
}
const basePath = (u) => new URL(u).pathname.replace(/-(480|960)\.webp$/, '.webp')

async function visaoGeral (navegador) {
  console.log('\n1 · visão geral')
  for (const [w, h] of [[1440, 900], [390, 844], [360, 800]]) {
    const rot = `@${w}×${h}`
    const { ctx, page, erros } = await contexto(navegador, w, h)
    const fotos = []
    page.on('request', (r) => { if (r.url().includes('/images/edicoes/')) fotos.push(basePath(r.url())) })
    await page.goto(`${BASE}/#/edicoes`, { waitUntil: 'networkidle' })
    const est = await page.evaluate(() => ({
      h1: document.querySelectorAll('main h1').length,
      cartoes: [...document.querySelectorAll('[data-edicao]')].map((a) => a.dataset.edicao),
      anos: document.querySelectorAll('.edx-ano').length,
      header: !!document.querySelector('.scw-header'),
      legais: [...document.querySelectorAll('.scw-footer a')].map((a) => a.getAttribute('href')).filter((x) => /privacidade|cookies|termos|uso-de-imagem/.test(x)).length,
      pref: [...document.querySelectorAll('.scw-footer button')].some((b) => /Preferências de cookies/.test(b.textContent)),
      slides: !!document.querySelector('[aria-roledescription="apresentação"], .scw-edx, .scw-edx-mob__regua'),
    }))
    if (est.h1 !== 1) falha(`${rot}: ${est.h1} h1`)
    if (est.cartoes.join() !== ORDEM.join()) falha(`${rot}: ordem da coleção ${est.cartoes.join(' ')}`)
    if (est.anos !== 11) falha(`${rot}: ${est.anos} grupos de ano (esperado 11)`)
    if (!est.header) falha(`${rot}: sem cabeçalho do site`)
    if (est.legais !== 4 || !est.pref) falha(`${rot}: rodapé sem os 4 documentos legais e as preferências`)
    if (est.slides) falha(`${rot}: sobrou peça da apresentação de slides`)
    if (await rolagemH(page) > 1) falha(`${rot}: rolagem horizontal`)
    await rolarTudo(page)
    const intrusas = [...new Set(fotos)].filter((f) => !CAPAS.has(f))
    if (intrusas.length) falha(`${rot}: a visão geral baixou foto de galeria: ${intrusas.slice(0, 3).join(', ')}`)
    const quebradas = await page.evaluate(() => [...document.querySelectorAll('.edx img')].filter((i) => i.getAttribute('src') && i.complete && !i.naturalWidth).length)
    if (quebradas) falha(`${rot}: ${quebradas} imagem(ns) quebrada(s)`)

    // ano: o clique leva ao grupo, marca o ano e não fica sob o cabeçalho
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.locator('.edx-anos__ano', { hasText: '2019' }).click()
    await page.waitForTimeout(900)
    const pos = await page.evaluate(() => {
      const g = document.getElementById('edx-ano-2019').getBoundingClientRect()
      const linha = document.querySelector('.scw-header__linha').getBoundingClientRect()
      const hdr = getComputedStyle(document.querySelector('.scw-header')).opacity
      const nav = document.querySelector('.edx-anos').getBoundingClientRect()
      return { g: g.top, linha: linha.bottom, hdr: Number(hdr), nav: { top: nav.top, bottom: nav.bottom, left: nav.left, right: nav.right }, atual: document.querySelector('.edx-anos__ano[aria-current="true"]')?.textContent, foco: document.activeElement?.textContent }
    })
    if (pos.atual !== '2019') falha(`${rot}: ano marcado depois do clique: ${pos.atual}`)
    if (pos.foco !== '2019') falha(`${rot}: o foco não foi para o numeral do ano`)
    if (pos.g < 0 || pos.g > h * 0.5) falha(`${rot}: o grupo de 2019 não chegou ao topo (y=${Math.round(pos.g)})`)
    if (w > 900) {
      if (pos.nav.top < pos.linha) falha(`${rot}: a navegação por ano entra sob o cabeçalho (${Math.round(pos.nav.top)} < ${Math.round(pos.linha)})`)
      if (pos.g < pos.linha) falha(`${rot}: o grupo do ano ficou sob o cabeçalho`)
    } else {
      if (pos.hdr > 0.05 && pos.nav.top < 88) falha(`${rot}: a faixa de anos colide com o cabeçalho visível`)
      const abas = await retangulo(page, '.scw-abas')
      if (cruza(pos.nav, abas)) falha(`${rot}: a faixa de anos cobre a barra de abas`)
    }
    if (erros.length) falha(`${rot}: erro — ${erros[0]}`)
    await ctx.close()

    // primeira visita, com o aviso de cookies: não cobre a navegação por ano
    const v = await contexto(navegador, w, h, { aviso: true })
    await v.page.goto(`${BASE}/#/edicoes`, { waitUntil: 'networkidle' })
    await v.page.waitForTimeout(700)
    const aviso = await retangulo(v.page, '.cookie-consent')
    const navA = await retangulo(v.page, '.edx-anos')
    if (!aviso) falha(`${rot}: aviso de cookies não apareceu`)
    // No celular a faixa de anos vem logo abaixo do herói compartilhado (§6.9,
    // 14/10/2026) e pode começar sob o aviso: lá vale o título (casca-institucional).
    else if (w > 1000 && navA && navA.top < h && cruza(aviso, navA)) falha(`${rot}: o aviso cobre a navegação por ano`)
    await v.ctx.close()
  }
  if (!falhas.length) ok('ordem, casca, só capas, anos presos sem sobrepor cabeçalho, abas e aviso')
}

async function todasAsEdicoes (navegador) {
  console.log('\n2 · as 16 edições por link direto')
  const antes = falhas.length
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { ctx, page, erros } = await contexto(navegador, w, h)
    for (const e of EDICOES) {
      const d = detalhe(e.code)
      const rot = `${e.code} @${w}`
      await page.goto(`${BASE}/#/edicoes/${e.code}`, { waitUntil: 'networkidle' })
      await page.waitForFunction(() => { const i = document.querySelector('.edx-gal__foto'); return i && i.complete }, null, { timeout: 8000 }).catch(() => {})
      const est = await page.evaluate(() => ({
        h1: [...document.querySelectorAll('main h1')].map((x) => x.textContent),
        texto: document.querySelector('.edx-det__topo')?.textContent || '',
        marcas: document.querySelector('#edx-marcas-titulo')?.textContent || '',
        foto: (() => { const i = document.querySelector('.edx-gal__foto'); return i ? i.naturalWidth : 0 })(),
        minis: document.querySelectorAll('.edx-gal__mini').length,
        premio: !!document.querySelector('.edx-premio'),
        ant: document.querySelector('.edx-seq__item--ant')?.getAttribute('href') || null,
        prox: document.querySelector('.edx-seq__item--prox')?.getAttribute('href') || null,
        titulo: document.title,
        foco: document.activeElement?.id,
      }))
      if (est.h1.length !== 1 || est.h1[0] !== d.tema) falha(`${rot}: h1 ${JSON.stringify(est.h1)}`)
      if (!est.texto.includes(d.periodo)) falha(`${rot}: período ausente`)
      if (!est.texto.includes(d.identificacao)) falha(`${rot}: identificação "${d.identificacao}" ausente`)
      if (!est.marcas.startsWith(`${d.n} marca`)) falha(`${rot}: contagem de marcas "${est.marcas}"`)
      if (!est.foto) falha(`${rot}: foto principal não carregou`)
      if (est.minis !== d.fotos.length) falha(`${rot}: ${est.minis} miniaturas de ${d.fotos.length}`)
      if (est.premio !== d.premiacao.teve) falha(`${rot}: seção do Sweet Awards ${est.premio ? 'sobrando' : 'faltando'}`)
      if (est.ant !== (d.anterior && d.anterior.href)) falha(`${rot}: anterior ${est.ant}`)
      if (est.prox !== (d.proxima && d.proxima.href)) falha(`${rot}: próxima ${est.prox}`)
      if (!est.titulo.startsWith(d.tema)) falha(`${rot}: título da aba "${est.titulo}"`)
      if (est.foco !== 'edx-det-titulo') falha(`${rot}: foco inicial em "${est.foco}"`)
      if (await rolagemH(page) > 1) falha(`${rot}: rolagem horizontal`)
    }
    if (erros.length) falha(`@${w}: erro — ${erros[0]}`)
    await ctx.close()
  }
  if (falhas.length === antes) ok('16 × 2 telas: título, período, identificação, marcas, foto, premiação, vizinhas, foco')
}

async function percurso (navegador) {
  console.log('\n3 · percurso, voltar/avançar, recarregar')
  const antes = falhas.length
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const rot = `@${w}`
    const { ctx, page } = await contexto(navegador, w, h)
    await page.goto(`${BASE}/#/edicoes`, { waitUntil: 'networkidle' })
    const cartao = page.locator('[data-edicao="2018.2"]')
    await cartao.scrollIntoViewIfNeeded()
    await cartao.click()
    await page.waitForSelector('#edx-det-titulo')
    // Endereço limpo desde 14/10/2026 (D-14): o link #/ antigo vira /edicoes/<código>.
    if (new URL(page.url()).pathname !== '/edicoes/2018.2' || page.url().includes('#')) falha(`${rot}: o cartão não abriu o detalhe (${page.url()})`)
    const topo = await page.evaluate(() => window.scrollY)
    if (topo > 4) falha(`${rot}: o detalhe abriu rolado (y=${topo})`)

    await page.goBack()
    await page.waitForSelector('[data-edicao="2018.2"]')
    await page.waitForTimeout(500)
    const volta = await page.evaluate(() => {
      const a = document.querySelector('[data-edicao="2018.2"]')
      const r = a.getBoundingClientRect()
      return { dentro: r.top >= 0 && r.bottom <= innerHeight + 1, foco: document.activeElement === a, y: scrollY }
    })
    if (!volta.dentro) falha(`${rot}: voltar não devolveu a coleção ao cartão (y=${volta.y})`)
    if (!volta.foco) falha(`${rot}: voltar não devolveu o foco ao cartão`)

    await page.goForward()
    await page.waitForSelector('#edx-det-titulo')
    if ((await page.textContent('#edx-det-titulo')) !== 'Sabores da Infância') falha(`${rot}: avançar não reabriu a edição`)

    await page.click('.edx-seq__item--prox')
    await page.waitForFunction(() => document.querySelector('#edx-det-titulo')?.textContent === 'Pâtisserie Francesa')
    await page.reload({ waitUntil: 'networkidle' })
    if ((await page.textContent('#edx-det-titulo')) !== 'Pâtisserie Francesa') falha(`${rot}: recarregar perdeu a edição`)
    await page.click('.edx-voltar')
    await page.waitForSelector('[data-edicao="2019.1"]')
    await page.waitForTimeout(500)
    const foco = await page.evaluate(() => document.activeElement?.dataset?.edicao)
    if (foco !== '2019.1') falha(`${rot}: "Todas as edições" não voltou ao cartão da edição vista (${foco})`)

    await page.goto(`${BASE}/#/edicoes/1999`, { waitUntil: 'networkidle' })
    if (!(await page.locator('[data-edicao]').count())) falha(`${rot}: código inexistente deveria mostrar a coleção`)
    await ctx.close()
  }
  if (falhas.length === antes) ok('cartão → detalhe → voltar (cartão e foco) → avançar → próxima → recarregar → todas')
}

async function galeria (navegador) {
  console.log('\n4 · galeria, teclado e foto ampliada')
  const antes = falhas.length
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const rot = `@${w}`
    const { ctx, page } = await contexto(navegador, w, h)
    await page.goto(`${BASE}/#/edicoes/2019.2`, { waitUntil: 'networkidle' })
    const src = () => page.evaluate(() => document.querySelector('.edx-gal__foto')?.getAttribute('src'))
    const contador = () => page.evaluate(() => document.querySelector('.edx-gal__contador')?.textContent.replace(/\s/g, ''))
    // Um combo por marca: o total é o da galeria (34 na 2019.2), não fixo.
    const total = String(await page.locator('.edx-gal__mini').count()).padStart(2, '0')

    // tecla com o foco FORA da galeria: nada muda
    const s0 = await src()
    await page.focus('#edx-det-titulo')
    await page.keyboard.press('ArrowRight')
    if ((await src()) !== s0 || !page.url().endsWith('2019.2')) falha(`${rot}: seta fora da galeria trocou foto ou edição`)

    await page.click('[data-galeria] button[aria-label="Próxima foto"]')
    if ((await contador()) !== `02/${total}`) falha(`${rot}: "Próxima foto" → ${await contador()}`)
    if ((await src()) === s0) falha(`${rot}: a foto principal não trocou`)
    await page.click('.edx-gal__mini >> nth=6')
    if ((await contador()) !== `07/${total}`) falha(`${rot}: miniatura 7 → ${await contador()}`)
    const atual = await page.evaluate(() => [...document.querySelectorAll('.edx-gal__mini')].findIndex((b) => b.getAttribute('aria-current') === 'true'))
    if (atual !== 6) falha(`${rot}: aria-current na miniatura ${atual}`)
    await page.keyboard.press('ArrowRight')
    if ((await contador()) !== `08/${total}`) falha(`${rot}: → com foco na galeria → ${await contador()}`)
    await page.keyboard.press('End')
    if ((await contador()) !== `${total}/${total}`) falha(`${rot}: End → ${await contador()}`)
    await page.keyboard.press('ArrowRight')
    if ((await contador()) !== `01/${total}`) falha(`${rot}: a sequência não dá a volta`)

    // ampliar
    await page.click('.edx-gal__ampliar')
    await page.waitForTimeout(250)
    const dlg = await page.evaluate(() => ({ aberto: document.querySelector('.edx-ampliada').open, foco: document.activeElement?.className }))
    if (!dlg.aberto) falha(`${rot}: Ampliar não abriu a foto`)
    if (!/edx-ampliada__fechar/.test(dlg.foco || '')) falha(`${rot}: foco ao ampliar em "${dlg.foco}"`)
    await page.waitForFunction(() => { const i = document.querySelector('.edx-ampliada__foto'); return i && i.complete && i.naturalWidth }, null, { timeout: 8000 }).catch(() => falha(`${rot}: a foto ampliada não carregou`))
    await page.keyboard.press('ArrowRight')
    if (!/^02/.test(await page.textContent('.edx-ampliada__contador'))) falha(`${rot}: → na foto ampliada não trocou`)
    for (let k = 0; k < 5; k++) await page.keyboard.press('Tab')
    const preso = await page.evaluate(() => !!document.activeElement.closest('.edx-ampliada'))
    if (!preso) falha(`${rot}: Tab escapou da foto ampliada`)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(250)
    const fim = await page.evaluate(() => ({ aberto: document.querySelector('.edx-ampliada').open, foco: document.activeElement?.className }))
    if (fim.aberto) falha(`${rot}: Esc não fechou`)
    if (!/edx-gal__visor/.test(fim.foco || '')) falha(`${rot}: o foco não voltou à foto (${fim.foco})`)
    await ctx.close()
  }
  if (falhas.length === antes) ok('setas, miniaturas, teclado só dentro, ampliar com foco, Tab preso, Esc e retorno')
}

async function marcasEPremiacao (navegador) {
  console.log('\n5 · marcas e premiação')
  const antes = falhas.length
  const { ctx, page } = await contexto(navegador, 1440, 900)
  await page.goto(`${BASE}/#/edicoes/2022`, { waitUntil: 'networkidle' })
  const n0 = await page.locator('#edx-marcas-lista li').count()
  await page.click('.edx-marcas__mais')
  const n1 = await page.locator('#edx-marcas-lista li').count()
  const exp = await page.getAttribute('.edx-marcas__mais', 'aria-expanded')
  if (n0 !== 18 || n1 !== 34 || exp !== 'true') falha(`Movies: lista ${n0} → ${n1} (aria-expanded=${exp})`)
  if (!(await page.locator('.edx-premio a[href="#/sweet-awards"]').count())) falha('Movies: sem o caminho para o Sweet Awards')

  await page.goto(`${BASE}/#/edicoes/2017.1`, { waitUntil: 'networkidle' })
  if (await page.locator('.edx-premio').count()) falha('Páscoa: seção do Sweet Awards numa edição sem premiação')
  if (!/Sem premiação nesta edição/.test(await page.textContent('.edx-ficha'))) falha('Páscoa: a ficha não diz que não houve premiação')
  if (await page.locator('.edx-marcas__mais').count()) falha('Páscoa: 17 marcas não precisam de "mostrar todas"')

  await page.goto(`${BASE}/#/edicoes/2026.1`, { waitUntil: 'networkidle' })
  if (!(await page.locator('.edx-marcas__lista--logos img').count())) falha('Lovers: logos confirmadas não apareceram')
  await page.goto(`${BASE}/#/edicoes/2019.1`, { waitUntil: 'networkidle' })
  if (await page.locator('.edx-marcas__lista--logos, .edx-marcas__logo').count()) falha('Pâtisserie: logo em edição sem vínculo confirmado')
  await ctx.close()
  if (falhas.length === antes) ok('expansão com contagem certa, premiação só onde houve, logos só na Lovers')
}

async function reduzidoELegais (navegador) {
  console.log('\n6 · movimento reduzido e documentos legais')
  const antes = falhas.length
  const { ctx, page, erros } = await contexto(navegador, 1440, 900, { reduzido: true })
  await page.goto(`${BASE}/#/edicoes/2016`, { waitUntil: 'networkidle' })
  const dur = await page.evaluate(() => getComputedStyle(document.querySelector('.edx-gal__foto')).animationDuration)
  if (parseFloat(dur) > 0.01) falha(`reduzido: a foto ainda anima (${dur})`)
  await page.goto(`${BASE}/#/edicoes`, { waitUntil: 'networkidle' })
  await page.locator('.edx-anos__ano', { hasText: '2016' }).click()
  await page.waitForTimeout(150)
  const g = await page.evaluate(() => document.getElementById('edx-ano-2016').getBoundingClientRect().top)
  if (g > 450) falha(`reduzido: o salto por ano deveria ser imediato (y=${Math.round(g)})`)

  await page.click('.scw-footer a[href*="privacidade"]')
  await page.waitForFunction(() => document.body.classList.contains('route-legal'))
  await page.goto(`${BASE}/#/edicoes/2021.1`, { waitUntil: 'networkidle' })
  await page.locator('.scw-footer button', { hasText: 'Preferências de cookies' }).click()
  await page.waitForTimeout(200)
  if (!(await page.evaluate(() => document.querySelector('dialog.scw-pref')?.open))) falha('preferências de cookies não abriram a partir do detalhe')
  if (erros.length) falha(`erro — ${erros[0]}`)
  await ctx.close()
  if (falhas.length === antes) ok('sem animação, salto imediato, Política de Privacidade e preferências pelo rodapé')
}

async function capturas (navegador) {
  console.log('\n7 · capturas')
  mkdirSync(CAPTURAS, { recursive: true })
  for (const [nome, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const { ctx, page } = await contexto(navegador, w, h)
    for (const [arq, rota] of [['1-visao-geral', '/edicoes'], ['2-detalhe', '/edicoes/2019.2']]) {
      await page.goto(`${BASE}/#${rota}`, { waitUntil: 'networkidle' })
      await rolarTudo(page)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(400)
      // a primeira tela como ela é (com abas e cabeçalho fixos)…
      await page.screenshot({ path: join(CAPTURAS, `${arq}-${nome}-tela.png`) })
      // …e a página inteira, sem as peças fixas, que numa captura longa
      // apareceriam paradas no meio do conteúdo.
      const css = await page.addStyleTag({ content: '.scw-abas, .scw-header { visibility: hidden !important; }' })
      await page.screenshot({ path: join(CAPTURAS, `${arq}-${nome}.png`), fullPage: true })
      await css.evaluate((n) => n.remove())
    }
    await ctx.close()
  }
  ok(`tests/capturas-edicoes/ (visão geral e detalhe, desktop e celular)`)
}

if (!existsSync(join(__dirname, '..', 'dist', 'index.html'))) {
  console.error('✗ dist/ ausente. Rode `npm run build` antes.')
  process.exit(1)
}
await exigirPortaLivre()
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: join(__dirname, '..'), shell: true, stdio: ['ignore', 'pipe', 'pipe'],
})
let navegador
try {
  await esperar(BASE)
  navegador = await chromium.launch()
  await visaoGeral(navegador)
  await todasAsEdicoes(navegador)
  await percurso(navegador)
  await galeria(navegador)
  await marcasEPremiacao(navegador)
  await reduzidoELegais(navegador)
  await capturas(navegador)
} catch (e) {
  falha(`erro inesperado: ${e.message}`)
} finally {
  if (navegador) await navegador.close()
  killTree(preview.pid)
}
console.log(falhas.length ? `\n✗ ${falhas.length} falha(s)` : '\n✓ edições ok')
process.exit(falhas.length ? 1 : 0)
