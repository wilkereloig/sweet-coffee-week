/*
 * "Perto de mim" como painel sobre o mapa (07/11/2026), no navegador (Playwright): as 5 casas mais perto em carrossel, nos dois mapas
 * (ilustrado e real), em tela cheia, no celular (retrato e paisagem) e no desktop; permissão concedida e negada; espera; seleção de
 * pin; fechar; arrastar e zoom do mapa por trás. Dados do retrato local (?preview=1), localização simulada, estilo do mapa real vazio.
 *
 *   node tests/cartoon-perto-painel-navegador.mjs        (sobe o vite na 5214; PERTO_PAINEL_REUSAR=1 reaproveita um servidor aberto)
 *   PERTO_PAINEL_CAPTURAS=<pasta>                         (onde salvar as capturas; padrão: pasta temporária)
 * NÃO cobre aparelho real (iPhone/Android): é Chromium com localização simulada.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'

const PORT = Number(process.env.PERTO_PAINEL_PORT || 5214)
const BASE = `http://localhost:${PORT}`
const CAPTURAS = process.env.PERTO_PAINEL_CAPTURAS || join(tmpdir(), `perto-painel-${Date.now().toString(36)}`)
mkdirSync(CAPTURAS, { recursive: true })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const falhas = []
const checar = (cond, msg) => { console.log(`  ${cond ? '✓' : '✗'} ${msg}`); if (!cond) falhas.push(msg) }
const responde = async () => { try { return (await fetch(`${BASE}/cartoon`, { signal: AbortSignal.timeout(30000) })).ok } catch { return false } }

let servidor = null
if (!(await responde())) {
  if (process.env.PERTO_PAINEL_REUSAR === '1') { console.error(`✗ sem servidor na ${PORT}`); process.exit(1) }
  servidor = spawn(`npx vite --port ${PORT} --strictPort`, { shell: true, stdio: 'ignore' })
  for (let i = 0; i < 160 && !(await responde()); i++) await esperar(350)
}
const matar = () => { if (servidor?.pid) { try { execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' }) } catch { /* já morto */ } } }

const AQUI = { latitude: -5.8123, longitude: -35.2085, accuracy: 30 } // Tirol/Petrópolis, Natal
const ESTILO_VAZIO = { version: 8, sources: {}, layers: [{ id: 'fundo', type: 'background', paint: { 'background-color': '#EAF3F6' } }] }
const PRIV = () => JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 })

async function abrir (nav, { w = 390, h = 844, mobile = true, permissao = 'granted', atraso = 0, vista = 'mundo', api = 'granted' } = {}) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, geolocation: AQUI, permissions: permissao === 'granted' ? ['geolocation'] : [] })
  await ctx.addInitScript(([priv, perm, ms, api]) => {
    try { localStorage.setItem('scw_privacidade', priv) } catch { /* sem storage */ }
    window.__geo = 0
    const g = navigator.geolocation
    const original = g.getCurrentPosition.bind(g)
    g.getCurrentPosition = (ok, erro, op) => {
      window.__geo += 1
      setTimeout(() => (perm === 'denied' ? erro?.({ code: 1, message: 'denied' }) : original(ok, erro, op)), ms)
    }
    const consulta = navigator.permissions.query.bind(navigator.permissions)
    navigator.permissions.query = (d) => (d?.name === 'geolocation' ? Promise.resolve({ state: api, addEventListener () {}, removeEventListener () {} }) : consulta(d))
  }, [PRIV(), permissao, atraso, api])
  await ctx.route('**/tiles.openfreemap.org/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(ESTILO_VAZIO) }))
  const page = await ctx.newPage()
  page.setDefaultNavigationTimeout(120000)
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e.message || e).slice(0, 200)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|tiles|favicon|40\d/.test(m.text())) erros.push(m.text().slice(0, 200)) })
  await page.goto(`${BASE}/cartoon/mapa?preview=1&vista=${vista}`, { waitUntil: 'networkidle' })
  const alvoMapa = { mundo: ['.ct-mundo__palco', '.ct-mundo__casa'], real: ['.ct-mapa__area', '.ct-marcador--pin'], lista: ['.ct-mapa__lista', '.ct-mapa__item'] }[vista]
  await page.locator(alvoMapa[0]).first().waitFor({ timeout: 40000 })
  await page.locator(alvoMapa[1]).first().waitFor({ state: 'attached', timeout: 40000 })
  await page.evaluate(() => document.querySelector('.ct-mapa__moldura').scrollIntoView({ block: 'start' }))
  await esperar(500)
  const cdp = mobile ? await ctx.newCDPSession(page) : null
  return { ctx, page, erros, cdp }
}
const foto = (c, nome) => c.page.screenshot({ path: join(CAPTURAS, `${nome}.png`) }).catch(() => null)
const caixa = (page, sel) => page.locator(sel).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom, r: r.right } })
const camera = (page) => page.evaluate(() => { const p = document.querySelector('.ct-mundo__palco'); return p ? { z: p.dataset.z, x: p.dataset.x, y: p.dataset.y } : null })
const sobraLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
const botaoPerto = (page) => page.locator('.ct-mapa__perto-botao').first()
const distancias = (page) => page.locator('.ct-perto__cartao').evaluateAll((l) => l.map((b) => { const t = b.querySelector('.ct-perto__texto b').textContent.replace('≈', '').trim(); const [n, u] = t.split(' '); return u === 'km' ? Number(n.replace(',', '.')) * 1000 : Number(n) }))
const ranks = (page) => page.locator('.ct-perto__cartao').evaluateAll((l) => l.map((b) => Number(b.dataset.pertoRank)))
const toque = (c, tipo, pts) => c.cdp.send('Input.dispatchTouchEvent', { type: tipo, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) })
async function arrastarToque (c, de, para, passos = 10) {
  await toque(c, 'touchStart', [de])
  for (let i = 1; i <= passos; i++) { await toque(c, 'touchMove', [[de[0] + ((para[0] - de[0]) * i) / passos, de[1] + ((para[1] - de[1]) * i) / passos]]); await esperar(12) }
  await esperar(160)
  await toque(c, 'touchEnd', [])
  await esperar(100)
}

const nav = await chromium.launch()
try {
  // ---------------------------------------------------------------- 1 · celular em pé, mapa ilustrado
  console.log('\n1 · celular em pé · mapa ilustrado · permissão concedida')
  {
    const c = await abrir(nav)
    const { page } = c
    const folga = async () => (await caixa(page, '.ct-mundo__janela')).y - (await caixa(page, '.ct-mapa__resumo')).b
    const antes = await caixa(page, '.ct-mundo__janela'); const f0 = await folga()
    await botaoPerto(page).click()
    await page.locator('.ct-perto__cartao').first().waitFor({ timeout: 20000 })
    await esperar(1200)
    const depois = await caixa(page, '.ct-mundo__janela')
    checar(Math.abs(f0 - (await folga())) < 2 && Math.abs(antes.h - depois.h) < 2, 'o mapa NÃO foi empurrado nem encolhido pelo resultado (nada entra entre o resumo e o mapa)')
    checar(depois.b <= 844 - 70, `a página rolou: o mapa inteiro (e o painel) ficam acima da barra de abas (base do mapa em ${Math.round(depois.b)} px)`)
    checar(await page.locator('.ct-mapa__perto-aviso').count() === 0, 'a caixa antiga acima do mapa não existe mais')
    const n = await page.locator('.ct-perto__cartao').count()
    checar(n === 5, `cinco casas no painel (achei ${n})`)
    const r = await ranks(page); const d = await distancias(page)
    checar(JSON.stringify(r) === '[1,2,3,4,5]', 'a ordem 1 a 5 está marcada')
    checar(d.every((x, i) => i === 0 || x >= d[i - 1]), `distâncias crescentes (${d.join(', ')} m)`)
    const p = await caixa(page, '.ct-perto')
    checar(p.y >= depois.y && p.b <= depois.b + 1 && p.x >= depois.x && p.r <= depois.x + depois.w + 1, 'o painel está DENTRO da janela do mapa, sobre a base')
    checar(p.h < depois.h * 0.34, `painel compacto (${Math.round(p.h)} px de ${Math.round(depois.h)})`)
    const textoPainel = await page.locator('.ct-perto').innerText()
    checar(/Mais perto de voc/.test(textoPainel) && /1ª é a mais perto/.test(textoPainel), 'o painel diz que a 1ª é a mais perto')
    checar(/mais longe/.test(await page.locator('.ct-perto__trilho').getAttribute('aria-label')), 'a lista diz, para leitor de tela, da mais perto para a mais longe')
    checar(/ilustrativos/.test(textoPainel), 'nota curta de que os pontos do desenho são ilustrativos')
    checar(/\d+ m|\d,\d km/.test(textoPainel) && !/trajeto|de carro/i.test(textoPainel), 'distâncias em m/km, sem falar em trajeto')
    const destaques = await page.locator('.ct-mundo__casa.is-perto .ct-mundo__ordem').allInnerTexts()
    checar(destaques.length === 5 && destaques.slice().sort().join() === '1,2,3,4,5', 'cinco pins destacados no desenho com o número de ordem')
    checar(await page.locator('.ct-marcador--voce').count() === 0, 'a posição da pessoa NÃO é desenhada no mapa ilustrado')
    checar(!(await sobraLateral(page)), 'sem rolagem lateral')
    await foto(c, 'celular-mundo-1-painel')

    // carrossel rola de lado sem mexer no mapa
    const cam0 = await camera(page)
    const sc0 = await page.locator('.ct-perto__trilho').evaluate((e) => e.scrollLeft)
    const t = await caixa(page, '.ct-perto__trilho')
    await arrastarToque(c, [t.x + t.w - 30, t.y + 30], [t.x + 20, t.y + 30])
    const sc1 = await page.locator('.ct-perto__trilho').evaluate((e) => e.scrollLeft)
    checar(sc1 > sc0 + 40, `o carrossel desliza para o lado (${Math.round(sc0)} → ${Math.round(sc1)})`)
    const cam1 = await camera(page)
    checar(JSON.stringify(cam0) === JSON.stringify(cam1), 'deslizar o carrossel não move o mapa')
    await foto(c, 'celular-mundo-2-carrossel')

    // o mapa por trás continua arrastável e com zoom
    const j = await caixa(page, '.ct-mundo__janela')
    await arrastarToque(c, [j.x + j.w * 0.6, j.y + 120], [j.x + j.w * 0.3, j.y + 160])
    const cam2 = await camera(page)
    checar(cam2.x !== cam1.x || cam2.y !== cam1.y, 'arrastar o mapa acima do painel continua funcionando')
    await page.getByRole('button', { name: 'Aproximar', exact: true }).click(); await esperar(400)
    checar((await camera(page)).z !== cam2.z, 'o zoom continua funcionando')

    // escolher uma casa: pin destacado + detalhes (ver combo, como chegar); o painel espera
    await page.locator('.ct-perto__trilho').evaluate((e) => { e.scrollLeft = 0 }); await esperar(200)
    const primeiro = page.locator('.ct-perto__cartao').first()
    const nome = (await primeiro.getAttribute('aria-label'))
    await primeiro.click(); await esperar(700)
    const cartao = page.locator('.ct-mapa__cartao').first()
    await cartao.waitFor({ timeout: 8000 })
    const tc = await cartao.innerText()
    checar(/Como chegar|Ver combo|Ver o combo/i.test(tc), 'os detalhes da casa abrem com as ações já existentes')
    checar(await page.locator('.ct-mundo__casa.is-sel').count() === 1, 'o pin da casa escolhida fica selecionado no mapa')
    checar(await page.locator('.ct-perto').count() === 0, 'no celular o painel dá lugar à folha da casa (não se cobrem)')
    await foto(c, 'celular-mundo-3-casa')
    await page.keyboard.press('Escape'); await esperar(500)
    if (await page.locator('.ct-mapa__cartao').count()) await page.locator('.ct-mapa__cartao button[aria-label*="Fechar"], .ct-mapa__cartao .ct-mapa__fechar').first().click().catch(() => {})
    await esperar(500)
    checar(await page.locator('.ct-perto__cartao').count() === 5, `fechada a casa, o painel volta (${nome ? 'ordem mantida' : ''})`)

    // fechar
    await page.getByRole('button', { name: 'Fechar as casas perto de mim' }).click(); await esperar(300)
    checar(await page.locator('.ct-perto').count() === 0 && await page.locator('.ct-mundo__casa.is-perto').count() === 0, 'fechar remove o painel e os destaques; o mapa segue')
    checar(await page.locator('.ct-mundo__palco').isVisible(), 'o mapa segue visível e utilizável')
    checar(c.erros.length === 0, `sem erro de página${c.erros.length ? ` — ${c.erros[0]}` : ''}`)
    await c.ctx.close()
  }

  // ---------------------------------------------------------------- 2 · celular, troca para o mapa real
  console.log('\n2 · celular · troca para o mapa real mantém o painel')
  {
    const c = await abrir(nav)
    const { page } = c
    await botaoPerto(page).click()
    await page.locator('.ct-perto__cartao').first().waitFor({ timeout: 20000 })
    const antes = JSON.stringify(await ranks(page))
    await page.locator('.ct-mapa__vistas button', { hasText: /real/i }).first().click()
    await page.locator('.ct-marcador--pin').first().waitFor({ timeout: 40000 })
    await esperar(1500)
    checar(await page.locator('.ct-mapa__area > .ct-perto').count() === 1, 'o painel passa a morar sobre o mapa real')
    await esperar(1200)
    checar((await caixa(page, '.ct-perto')).b <= 844 - 70, 'no mapa real o painel também fica acima da barra de abas')
    checar(JSON.stringify(await ranks(page)) === antes, 'a MESMA lista e a mesma ordem nos dois mapas')
    const marcados = await page.locator('.ct-marcador--perto').evaluateAll((l) => l.map((e) => e.dataset.perto).sort())
    checar(marcados.join() === '1,2,3,4,5', 'cinco pins destacados no mapa real com o número de ordem')
    checar(await page.locator('.ct-marcador--voce').count() === 1, 'marcador distinto da pessoa no mapa real')
    const a = await caixa(page, '.ct-mapa__area'); const p = await caixa(page, '.ct-perto')
    checar(p.y >= a.y && p.b <= a.b && p.h < a.h * 0.35, 'painel compacto dentro do mapa real')
    checar(!/ilustrativos/.test(await page.locator('.ct-perto').innerText()), 'a nota de "ilustrativo" é só do desenho')
    await foto(c, 'celular-real-1-painel')
    // toque num cartão: pin selecionado no mapa real
    await page.locator('.ct-perto__cartao').nth(1).click(); await esperar(900)
    checar(await page.locator('.ct-marcador--pin.is-sel').count() === 1, 'escolher a casa destaca o pin dela no mapa real')
    await foto(c, 'celular-real-2-casa')
    await page.locator('.ct-mapa__vistas button', { hasText: /ilustrado|desenho|mapa$/i }).first().click().catch(() => {})
    checar(c.erros.length === 0, `sem erro de página${c.erros.length ? ` — ${c.erros[0]}` : ''}`)
    await c.ctx.close()
  }

  // ---------------------------------------------------------------- 3 · tela cheia (celular), os dois mapas
  console.log('\n3 · celular · tela cheia')
  for (const vista of ['mundo', 'real']) {
    const c = await abrir(nav, { vista })
    const { page } = c
    await botaoPerto(page).click()
    await page.locator('.ct-perto__cartao').first().waitFor({ timeout: 20000 })
    await page.locator('.ct-mapa__ampliar').click(); await esperar(900)
    const cheia = page.locator('.ct-mapa__explorar.is-cheia')
    checar(await cheia.count() === 1, `${vista}: entrou em tela cheia`)
    checar(await page.locator('.is-cheia .ct-perto__cartao').count() === 5, `${vista}: o painel está na tela cheia com as 5 casas`)
    const e = await caixa(page, '.ct-mapa__explorar.is-cheia'); const p = await caixa(page, '.is-cheia .ct-perto')
    checar(p.b <= e.b && p.x >= e.x && p.r <= e.r, `${vista}: o painel respeita as bordas da tela`)
    const barra = await caixa(page, '.is-cheia .ct-mapa__barra')
    checar(p.y > barra.b, `${vista}: o painel não cobre a barra de controles`)
    await foto(c, `celular-${vista}-cheia-painel`)
    await page.locator('.is-cheia .ct-perto__cartao').first().click(); await esperar(800)
    checar(await page.locator('.is-cheia .ct-perto').count() === 0 && await page.locator('.ct-mapa__cartao').count() === 1, `${vista}: escolher a casa abre os detalhes (o painel espera)`)
    await foto(c, `celular-${vista}-cheia-casa`)
    await page.keyboard.press('Escape'); await esperar(400)
    await c.ctx.close()
  }

  // ---------------------------------------------------------------- 4 · celular deitado
  console.log('\n4 · celular deitado (844×390)')
  {
    const c = await abrir(nav, { w: 844, h: 390 })
    const { page } = c
    await botaoPerto(page).click()
    await page.locator('.ct-perto__cartao').first().waitFor({ timeout: 20000 })
    const j = await caixa(page, '.ct-mundo__janela'); const p = await caixa(page, '.ct-perto')
    checar(p.h < j.h * 0.6 && p.b <= j.b + 1, `painel cabe e segue dentro do mapa (${Math.round(p.h)} de ${Math.round(j.h)} px)`)
    checar(!(await sobraLateral(page)), 'sem rolagem lateral')
    await foto(c, 'celular-deitado-painel')
    await c.ctx.close()
  }

  // ---------------------------------------------------------------- 5 · desktop
  console.log('\n5 · desktop 1440×900 (mouse)')
  for (const vista of ['mundo', 'real']) {
    const c = await abrir(nav, { w: 1440, h: 900, mobile: false, vista })
    const { page } = c
    await botaoPerto(page).click()
    await page.locator('.ct-perto__cartao').first().waitFor({ timeout: 20000 })
    await esperar(600)
    const p = await caixa(page, '.ct-perto')
    checar(p.w <= 780 && await page.locator('.ct-perto__cartao').count() === 5, `${vista}: painel compacto (${Math.round(p.w)} px de largura) com 5 casas`)
    await foto(c, `desktop-${vista}-painel`)
    await page.locator('.ct-perto__cartao').nth(2).click(); await esperar(800)
    checar(await page.locator('.ct-perto__cartao.is-sel').count() === 1, `${vista}: o cartão da casa escolhida fica marcado no painel`)
    checar(await page.locator('.ct-mapa__cartao').count() === 1, `${vista}: os detalhes abrem ao lado, o painel continua`)
    await foto(c, `desktop-${vista}-casa`)
    checar(c.erros.length === 0, `${vista}: sem erro de página${c.erros.length ? ` — ${c.erros[0]}` : ''}`)
    await c.ctx.close()
  }

  // ---------------------------------------------------------------- 6 · permissão negada e espera
  console.log('\n6 · permissão negada e espera')
  {
    const c = await abrir(nav, { permissao: 'denied', api: 'prompt' })
    const { page } = c
    checar(await page.evaluate(() => window.__geo) === 0, 'abrir o mapa não pede a localização')
    await botaoPerto(page).click()
    await page.locator('.ct-perto [role="alert"]').waitFor({ timeout: 10000 })
    const t = await page.locator('.ct-perto').innerText()
    checar(/libere a localiza/i.test(t) && /tentar de novo/i.test(t), 'negada: explica o problema e oferece tentar de novo')
    checar(await page.locator('.ct-mundo__palco').isVisible(), 'o mapa segue utilizável')
    await foto(c, 'celular-negada')
    const g0 = await page.evaluate(() => window.__geo)
    await page.getByRole('button', { name: 'Tentar de novo' }).click(); await esperar(600)
    checar(await page.evaluate(() => window.__geo) > g0, 'tentar de novo pede a localização outra vez')
    await page.getByRole('button', { name: 'Fechar as casas perto de mim' }).click()
    checar(await page.locator('.ct-perto').count() === 0, 'dá para fechar o aviso')
    await c.ctx.close()
  }
  {
    const c = await abrir(nav, { atraso: 2500, api: 'prompt' })
    const { page } = c
    await botaoPerto(page).click(); await esperar(500)
    checar(await page.locator('.ct-perto [role="status"]').count() === 1 && /Procurando/.test(await page.locator('.ct-perto').innerText()), 'estado de carregamento enquanto busca a localização')
    await foto(c, 'celular-carregando')
    await page.locator('.ct-perto__cartao').first().waitFor({ timeout: 20000 })
    checar(await page.locator('.ct-perto__cartao').count() === 5, 'depois da espera aparecem as 5 casas')
    await c.ctx.close()
  }
  // ---------------------------------------------------------------- 7 · vista Lista
  console.log('\n7 · vista Lista: o mesmo painel, no fluxo, e a lista ordenada por distância')
  {
    const c = await abrir(nav, { vista: 'lista' })
    const { page } = c
    await botaoPerto(page).click()
    await page.locator('.ct-perto-fluxo .ct-perto__cartao').first().waitFor({ timeout: 20000 })
    checar(await page.locator('.ct-perto-fluxo .ct-perto__cartao').count() === 5, 'lista: as 5 casas mais perto no painel')
    const primeira = await page.locator('.ct-mapa__item').first().innerText()
    checar(/em linha reta/.test(primeira), 'lista: a primeira linha traz a distância em linha reta')
    await foto(c, 'celular-lista')
    await c.ctx.close()
  }
  console.log(falhas.length ? `\n✗ ${falhas.length} falha(s)\n${falhas.map((f) => ' - ' + f).join('\n')}` : '\n✓ perto: painel ok')
  console.log(`capturas em ${CAPTURAS}`)
} finally {
  await nav.close()
  matar()
}
process.exit(falhas.length ? 1 : 0)
