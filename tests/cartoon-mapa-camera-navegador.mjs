/*
 * Mapa da Doçura · câmera no navegador (docs/cartoon-2026-2/14 §14.14): o desenho cobre a janela, explora-se por arraste e zoom,
 * os pins seguem alinhados e a tela cheia mantém o contexto. Playwright de verdade (toque por CDP, mouse, roda, rotação).
 *
 *   npm run test:mapa-camera          (sobe o vite dev na 5212, sem build, e derruba ao terminar)
 *   MAPA_E2E_REUSAR=1 npm run test:mapa-camera   (usa um servidor já aberto na 5212)
 *   MAPA_E2E_CAPTURAS=<pasta>         (onde salvar as capturas; padrão: pasta temporária do sistema)
 *
 * Não testa aparelho real (iPhone/Safari, Android, Fullscreen API do iOS): isso é conferência manual.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5212
const BASE = `http://localhost:${PORT}`
const CAPTURAS = process.env.MAPA_E2E_CAPTURAS || join(tmpdir(), `mapa-camera-${Date.now().toString(36)}`)
mkdirSync(CAPTURAS, { recursive: true })
const reusar = process.env.MAPA_E2E_REUSAR === '1'

const falhas = []
const falha = (m) => { falhas.push(m); console.log(`  ✗ ${m}`) }
const ok = (m) => console.log(`  ✓ ${m}`)
const checar = (c, m) => { if (!c) falha(m); return !!c }
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const CONSENTIMENTO = () => JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 })

function matar (pid) { if (!pid) return; try { process.platform === 'win32' ? execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }) : process.kill(-pid, 'SIGKILL') } catch { /* já morto */ } }
const responde = async () => { try { return (await fetch(`${BASE}/cartoon`, { signal: AbortSignal.timeout(1500) })).ok } catch { return false } }
if (!reusar && await responde()) { console.error(`✗ porta ${PORT} ocupada (use MAPA_E2E_REUSAR=1 para reaproveitar o servidor)`); process.exit(1) }
const servidor = reusar ? null : spawn(`npx vite --port ${PORT} --strictPort`, { cwd: join(__dirname, '..'), shell: true, stdio: 'ignore' })

// ---------------------------------------------------------------- leituras no navegador
const lerTudo = (page) => page.evaluate(() => {
  const j = document.querySelector('.ct-mundo__janela'); const p = document.querySelector('.ct-mundo__palco')
  const jr = j.getBoundingClientRect(); const pr = p.getBoundingClientRect()
  const jx = jr.left + j.clientLeft; const jy = jr.top + j.clientTop
  return {
    j: { x: jx, y: jy, w: j.clientWidth, h: j.clientHeight }, p: { x: pr.left, y: pr.top, w: pr.width, h: pr.height },
    z: Number(p.dataset.z), centro: { u: (jx + j.clientWidth / 2 - pr.left) / pr.width, v: (jy + j.clientHeight / 2 - pr.top) / pr.height },
    lateral: document.documentElement.scrollWidth - innerWidth, sy: scrollY,
  }
})
// folga de pin (camera.js): 32 px nos lados e 132 px em cima (no máximo 10% / 30% da janela); embaixo a arte sempre encosta
const fl = (s) => Math.min(32, s.j.w * 0.1)
const ft = (s) => Math.min(132, s.j.h * 0.3)
const cobre = (s) => s.p.x <= s.j.x + fl(s) + 1 && s.p.y <= s.j.y + ft(s) + 1 && s.p.x + s.p.w >= s.j.x + s.j.w - fl(s) - 1 && s.p.y + s.p.h >= s.j.y + s.j.h - 1
const proporcao = (s) => Math.abs(s.p.w / s.p.h - 5882 / 4146) < 0.01
const quase = (a, b, eps) => Math.abs(a - b) <= eps

async function abrir (nav, { w, h, toque = false, reduzir = false }) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque, deviceScaleFactor: toque ? 2 : 1, reducedMotion: reduzir ? 'reduce' : 'no-preference' })
  await ctx.addInitScript((c) => { try { localStorage.setItem('scw_privacidade', c) } catch { /* sem storage */ } }, CONSENTIMENTO())
  await ctx.route('**/tiles.openfreemap.org/**', (r) => r.abort('failed'))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e.message || e).slice(0, 200)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|tiles|favicon|403|400|404/.test(m.text())) erros.push(m.text().slice(0, 200)) })
  await page.goto(`${BASE}/cartoon/mapa?preview=1`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.locator('.ct-mundo__palco').waitFor({ timeout: 30000 })
  await page.locator('.ct-mundo__casa:not(.is-agrupado)').first().waitFor({ timeout: 30000 })
  await page.evaluate(() => document.querySelector('.ct-mapa__moldura').scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(400)
  const cdp = toque ? await ctx.newCDPSession(page) : null
  return { ctx, page, erros, cdp }
}
const foto = (c, nome) => c.page.screenshot({ path: join(CAPTURAS, `${nome}.png`) }).catch(() => null)
const caixaDaJanela = async (c) => (await lerTudo(c.page)).j

// Pin visível dentro da janela (e fora dos botões de zoom/tela cheia), com o ponto onde tocar.
async function pinVisivel (page) {
  return page.evaluate(() => {
    const j = document.querySelector('.ct-mundo__janela'); const jr = j.getBoundingClientRect()
    const livres = ['.ct-mundo__zoom', '.ct-mapa__ampliar', '.ct-mapa__sair', '.ct-jogo', '.ct-folha-m'].map((q) => document.querySelector(q)?.getBoundingClientRect()).filter(Boolean)
    for (const b of document.querySelectorAll('.ct-mundo__casa')) {
      const r = b.getBoundingClientRect(); const x = r.left + r.width / 2; const y = r.top + r.height * 0.4
      if (x < jr.left + 30 || x > jr.right - 30 || y < jr.top + 30 || y > jr.bottom - 30) continue
      if (livres.some((l) => x > l.left - 6 && x < l.right + 6 && y > l.top - 6 && y < l.bottom + 6)) continue
      const topo = document.elementFromPoint(x, y)
      if (b.contains(topo)) return { x, y, id: b.dataset.casa, label: b.getAttribute('aria-label') }
    }
    return null
  })
}
// Os pins seguem o desenho: pé do pin (centro horizontal, base) = ponto left/top do botão dentro do palco.
const pinsAlinhados = (page) => page.evaluate(() => {
  const p = document.querySelector('.ct-mundo__palco'); const pr = p.getBoundingClientRect()
  let maior = 0; let n = 0
  for (const b of p.querySelectorAll('.ct-mundo__casa')) {
    const l = parseFloat(b.style.left) / 100; const t = parseFloat(b.style.top) / 100
    const r = b.getBoundingClientRect()
    if (r.width === 0) continue
    // translate(-50%, -100%) + sem escala: centro-x e base = ponto. Escala do hover/seleção alarga o retângulo, então mede o ponto médio horizontal.
    // Pin que cobria outro foi afastado (afastar.js): o ponto esperado é o do desenho MAIS o deslocamento (--dx/--dy), que fica em px.
    const ax = parseFloat(b.style.getPropertyValue('--dx')) || 0; const ay = parseFloat(b.style.getPropertyValue('--dy')) || 0
    const dx = Math.abs(r.left + r.width / 2 - (pr.left + l * pr.width + ax))
    const dy = Math.abs(r.bottom - (pr.top + t * pr.height + ay))
    const tolera = b.classList.contains('is-sel') ? 8 : 0
    if (dy > tolera + 4) maior = Math.max(maior, dy)
    maior = Math.max(maior, dx - tolera > 0 ? dx - tolera : 0)
    n++
  }
  return { n, maior: Math.round(maior * 10) / 10 }
})

// Toque real por CDP (gera pointer events de verdade).
const toque = (c, tipo, pts) => c.cdp.send('Input.dispatchTouchEvent', { type: tipo, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) })
async function arrastarToque (c, de, para, passos = 10) {
  await toque(c, 'touchStart', [de])
  for (let i = 1; i <= passos; i++) { await toque(c, 'touchMove', [[de[0] + ((para[0] - de[0]) * i) / passos, de[1] + ((para[1] - de[1]) * i) / passos]]); await esperar(12) }
  await esperar(160) // dedo parado antes de soltar: sem isto o Chrome sintético vê um "fling" e o toque seguinte só o cancela (vale até fora do mapa)
  await toque(c, 'touchEnd', [])
  await esperar(80)
}
// Toque curto de verdade (o dedo fica ~40 ms): o `touchscreen.tap` do Playwright (0 ms) não vira clique logo depois de um arraste.
async function tocar (c, x, y) { await toque(c, 'touchStart', [[x, y]]); await esperar(40); await toque(c, 'touchEnd', []); await esperar(60) }
async function pincaToque (c, centro, d0, d1, passos = 12) {
  const pts = (d) => [[centro[0] - d / 2, centro[1]], [centro[0] + d / 2, centro[1]]]
  await toque(c, 'touchStart', pts(d0))
  for (let i = 1; i <= passos; i++) { await toque(c, 'touchMove', pts(d0 + ((d1 - d0) * i) / passos)); await esperar(12) }
  await toque(c, 'touchEnd', [])
  await esperar(120)
}

// ---------------------------------------------------------------- cenários
async function preenche (nav, nome, cfg) {
  const c = await abrir(nav, cfg)
  const s0 = await lerTudo(c.page)
  checar(cobre(s0) && proporcao(s0), `${nome}: ao abrir, o desenho cobre a janela sem faixa e sem esticar (janela ${s0.j.w}×${s0.j.h}, desenho ${Math.round(s0.p.w)}×${Math.round(s0.p.h)})`)
  checar(s0.lateral <= 1, `${nome}: sem rolagem lateral da página (${s0.lateral}px)`)
  checar(Math.abs(s0.z - 1) < 0.01, `${nome}: abre no zoom mínimo (${s0.z})`)
  const al = await pinsAlinhados(c.page)
  checar(al.n > 10 && al.maior <= 1.5, `${nome}: ${al.n} pins alinhados aos pontos da arte (desvio ${al.maior}px)`)
  await foto(c, `${nome}-abertura`)
  await c.ctx.close()
  return s0
}

async function celularEmPe (nav) {
  const nome = 'celular-em-pe'
  console.log(`\n${nome} 390×844`)
  const c = await abrir(nav, { w: 390, h: 844, toque: true })
  const s0 = await lerTudo(c.page)
  checar(cobre(s0) && proporcao(s0) && s0.lateral <= 1, `${nome}: tela preenchida ao abrir, sem faixa, sem esticar e sem transbordo`)
  checar(s0.p.w > s0.j.w * 1.25, `${nome}: trecho ampliado — a arte (${Math.round(s0.p.w)}px) é mais larga que a tela (${s0.j.w}px)`)
  await foto(c, `${nome}-1-abertura`)

  // exploração de toda a largura: arrasta para a esquerda e para a direita até as bordas
  const j = s0.j; const meio = [j.x + j.w / 2, j.y + j.h * 0.55]
  for (let i = 0; i < 3; i++) await arrastarToque(c, [meio[0] + 150, meio[1]], [meio[0] - 150, meio[1]])
  let s = await lerTudo(c.page)
  checar(cobre(s) && quase(s.p.x + s.p.w, s.j.x + s.j.w - fl(s), 1.5), `${nome}: chega à borda direita da arte e para nela, sem faixa (${Math.round(s.p.x + s.p.w - s.j.x - s.j.w)}px de folga)`)
  await foto(c, `${nome}-2-borda-direita`)
  for (let i = 0; i < 6; i++) await arrastarToque(c, [meio[0] - 150, meio[1]], [meio[0] + 150, meio[1]])
  s = await lerTudo(c.page)
  checar(cobre(s) && quase(s.p.x, s.j.x + fl(s), 1.5), `${nome}: chega à borda esquerda da arte e para nela`)
  await arrastarToque(c, [meio[0], meio[1] - 100], [meio[0], meio[1] + 400])
  s = await lerTudo(c.page)
  checar(cobre(s), `${nome}: arrastar na vertical não revela faixa`)
  checar(s.sy === s0.sy, `${nome}: arrastar o mapa não rola a página (${s0.sy} → ${s.sy})`)

  // pinça
  await arrastarToque(c, [meio[0] - 150, meio[1]], [meio[0] + 150, meio[1]], 6)
  const antes = await lerTudo(c.page)
  const alvoPinca = [j.x + j.w * 0.62, j.y + j.h * 0.4]
  const u0 = (alvoPinca[0] - antes.p.x) / antes.p.w; const v0 = (alvoPinca[1] - antes.p.y) / antes.p.h
  await pincaToque(c, alvoPinca, 60, 180)
  s = await lerTudo(c.page)
  const u1 = (alvoPinca[0] - s.p.x) / s.p.w; const v1 = (alvoPinca[1] - s.p.y) / s.p.h
  checar(s.z > antes.z * 1.8 && cobre(s), `${nome}: pinça aproxima (${antes.z} → ${s.z}) e continua cobrindo`)
  checar(quase(u0, u1, 0.02) && quase(v0, v1, 0.03), `${nome}: a pinça mantém o ponto sob os dedos (Δ ${Math.abs(u0 - u1).toFixed(3)}, ${Math.abs(v0 - v1).toFixed(3)})`)
  await foto(c, `${nome}-3-pinca-aproximada`)
  await pincaToque(c, alvoPinca, 200, 20)
  await pincaToque(c, alvoPinca, 200, 20)
  s = await lerTudo(c.page)
  checar(Math.abs(s.z - 1) < 0.02 && cobre(s), `${nome}: pinça para dentro volta ao zoom mínimo e nunca abaixo (${s.z})`)
  await pincaToque(c, alvoPinca, 40, 400)
  await pincaToque(c, alvoPinca, 40, 400)
  s = await lerTudo(c.page)
  checar(quase(s.z, 3, 0.02) && cobre(s), `${nome}: pinça para fora para no zoom máximo (${s.z})`)

  // botões
  const mais = c.page.getByRole('button', { name: 'Aproximar', exact: true }); const menos = c.page.getByRole('button', { name: 'Afastar', exact: true })
  checar(await mais.isDisabled() && await menos.isEnabled(), `${nome}: no máximo, "Aproximar" desliga e "Afastar" segue ativo`)
  const caixaMais = await mais.boundingBox()
  checar(caixaMais.width >= 43.5 && caixaMais.height >= 43.5 && caixaMais.x + caixaMais.width <= 390 && caixaMais.y >= 0, `${nome}: botões de zoom ≥ 44px e dentro da tela`)
  for (let i = 0; i < 5; i++) { if (await menos.isEnabled()) { await menos.click(); await c.page.waitForTimeout(300) } }
  s = await lerTudo(c.page)
  checar(Math.abs(s.z - 1) < 0.01 && await menos.isDisabled() && await mais.isEnabled(), `${nome}: "Afastar" leva ao mínimo e desliga`)
  await mais.click(); await c.page.waitForTimeout(350)
  checar((await lerTudo(c.page)).z > 1.4, `${nome}: "Aproximar" aproxima`)

  // seleção de casa depois de mover e ampliar; arrastar a partir de um pin não o aciona
  await menos.click(); await c.page.waitForTimeout(350)
  let pin = await pinVisivel(c.page)
  if (checar(!!pin, `${nome}: há pin visível para tocar`)) {
    await arrastarToque(c, [pin.x, pin.y], [pin.x - 120, pin.y + 40])
    checar(await c.page.locator('.ct-mapa__cartao').count() === 0 && await c.page.locator('.ct-mundo__casa.is-sel').count() === 0, `${nome}: arrastar a partir de um pin NÃO escolhe a casa`)
    pin = await pinVisivel(c.page)
    await tocar(c, pin.x, pin.y)
    await c.page.locator('.ct-mapa__cartao').waitFor({ timeout: 5000 }).catch(() => null)
    checar(await c.page.locator('.ct-mundo__casa.is-sel').count() === 1 && await c.page.locator('.ct-mapa__cartao').count() === 1, `${nome}: tocar no pin (depois de mover o mapa) escolhe a casa`)
    await foto(c, `${nome}-4-casa-escolhida`)
    await c.page.locator('.ct-mapa__cartao .ct-mapa__fechar').click().catch(() => null)
    await c.page.waitForTimeout(250)
  }
  const al = await pinsAlinhados(c.page)
  checar(al.maior <= 1.5, `${nome}: pins alinhados depois de mover e ampliar (${al.maior}px)`)

  // tela cheia: entra e sai sem perder contexto
  await mais.click(); await c.page.waitForTimeout(350)
  const antesCheia = await lerTudo(c.page)
  await c.page.locator('[data-abrir-cheia]').click()
  await c.page.waitForSelector('.ct-mapa__explorar.is-cheia'); await c.page.waitForTimeout(500)
  const cheia = await lerTudo(c.page)
  const caixa = await c.page.locator('.ct-mapa__explorar.is-cheia').boundingBox()
  checar(Math.abs(caixa.width - 390) <= 1 && Math.abs(caixa.height - 844) <= 1, `${nome}: tela cheia ocupa o aparelho todo`)
  checar(cobre(cheia) && proporcao(cheia) && cheia.lateral <= 1, `${nome}: tela cheia sem faixa vazia, sem distorção e sem transbordo`)
  checar(quase(cheia.z, antesCheia.z, 0.01) && quase(cheia.centro.u, antesCheia.centro.u, 0.04) && quase(cheia.centro.v, antesCheia.centro.v, 0.06), `${nome}: ao entrar na tela cheia o zoom e o ponto do centro se mantêm`)
  const barra = await c.page.locator('.ct-mapa__barra').boundingBox()
  checar(Math.abs(cheia.j.y - (barra.y + barra.height)) < 6 || cheia.j.y >= barra.y + barra.height - 6, `${nome}: o mapa começa logo abaixo da barra, sem sobrar faixa`)
  checar(Math.abs((cheia.j.y + cheia.j.h) - 844) <= 2, `${nome}: o mapa vai até a borda de baixo`)
  await foto(c, `${nome}-5-tela-cheia`)
  await c.page.locator('[data-fechar-cheia]').click(); await c.page.waitForTimeout(500)
  const fora = await lerTudo(c.page)
  checar(quase(fora.z, antesCheia.z, 0.01) && quase(fora.centro.u, antesCheia.centro.u, 0.04) && quase(fora.centro.v, antesCheia.centro.v, 0.06) && cobre(fora), `${nome}: ao sair da tela cheia tudo volta como estava`)

  // rotação: em pé → deitado → em pé
  await menos.click(); await c.page.waitForTimeout(350)
  const pre = await lerTudo(c.page)
  await c.page.setViewportSize({ width: 844, height: 390 }); await c.page.waitForTimeout(500)
  const deitado = await lerTudo(c.page)
  checar(cobre(deitado) && proporcao(deitado) && deitado.lateral <= 1, `${nome}: na rotação para deitado o desenho segue preenchendo (${deitado.j.w}×${deitado.j.h})`)
  await foto(c, 'celular-deitado-1-rotacao')
  await c.page.setViewportSize({ width: 390, height: 844 }); await c.page.waitForTimeout(500)
  const volta = await lerTudo(c.page)
  checar(cobre(volta) && quase(volta.z, pre.z, 0.01), `${nome}: voltando para em pé, cobre e mantém o zoom`)
  checar(!c.erros.length, `${nome}: sem erro de console (${c.erros[0] || ''})`)
  await c.ctx.close()
}

async function celularDeitado (nav) {
  const nome = 'celular-deitado'
  console.log(`\n${nome} 844×390`)
  const c = await abrir(nav, { w: 844, h: 390, toque: true })
  const s0 = await lerTudo(c.page)
  checar(cobre(s0) && proporcao(s0) && s0.lateral <= 1, `${nome}: preenche a janela sem faixa (${s0.j.w}×${s0.j.h})`)
  const j = s0.j
  await arrastarToque(c, [j.x + j.w * 0.3, j.y + j.h * 0.6], [j.x + j.w * 0.7, j.y + j.h * 0.2])
  await arrastarToque(c, [j.x + j.w * 0.3, j.y + j.h * 0.6], [j.x + j.w * 0.9, j.y + j.h * 0.2])
  let s = await lerTudo(c.page)
  checar(cobre(s), `${nome}: arrastar não revela faixa`)
  await c.page.getByRole('button', { name: 'Aproximar', exact: true }).click(); await c.page.waitForTimeout(350)
  await c.page.getByRole('button', { name: 'Aproximar', exact: true }).click(); await c.page.waitForTimeout(350)
  for (let i = 0; i < 8; i++) await arrastarToque(c, [j.x + 60, j.y + 60], [j.x + j.w - 60, j.y + j.h - 60], 6)
  s = await lerTudo(c.page)
  checar(cobre(s) && quase(s.p.x, s.j.x + fl(s), 1.5) && quase(s.p.y, s.j.y + ft(s), 1.5), `${nome}: alcança o canto superior esquerdo da arte`)
  for (let i = 0; i < 8; i++) await arrastarToque(c, [j.x + j.w - 60, j.y + j.h - 60], [j.x + 60, j.y + 60], 6)
  s = await lerTudo(c.page)
  checar(cobre(s) && quase(s.p.x + s.p.w, s.j.x + s.j.w - fl(s), 1.5) && quase(s.p.y + s.p.h, s.j.y + s.j.h, 1.5), `${nome}: alcança o canto inferior direito da arte`)
  await foto(c, `${nome}-1-zoom-no-canto`)
  checar(!c.erros.length, `${nome}: sem erro de console (${c.erros[0] || ''})`)
  await c.ctx.close()
}

async function desktop (nav, w, h) {
  const nome = `desktop-${w}x${h}`
  console.log(`\n${nome}`)
  const c = await abrir(nav, { w, h })
  const s0 = await lerTudo(c.page)
  checar(cobre(s0) && proporcao(s0) && s0.lateral <= 1, `${nome}: preenche a janela (${s0.j.w}×${s0.j.h}) sem faixa, sem esticar, sem transbordo`)
  await foto(c, `${nome}-1-abertura`)
  const j = s0.j
  // arraste com o mouse
  const centro = [j.x + j.w / 2, j.y + j.h / 2]
  await c.page.mouse.move(centro[0], centro[1]); await c.page.mouse.down(); await c.page.mouse.move(centro[0] - 200, centro[1] - 100, { steps: 8 }); await c.page.mouse.up()
  let s = await lerTudo(c.page)
  checar(cobre(s), `${nome}: arrasto com o mouse não revela faixa`)
  // Ctrl + roda: zoom no cursor
  const antes = await lerTudo(c.page)
  const alvo = [j.x + j.w * 0.6, j.y + j.h * 0.5]
  const u0 = (alvo[0] - antes.p.x) / antes.p.w; const v0 = (alvo[1] - antes.p.y) / antes.p.h
  await c.page.mouse.move(alvo[0], alvo[1])
  await c.page.keyboard.down('Control')
  for (let i = 0; i < 4; i++) { await c.page.mouse.wheel(0, -100); await c.page.waitForTimeout(40) }
  await c.page.keyboard.up('Control')
  s = await lerTudo(c.page)
  const u1 = (alvo[0] - s.p.x) / s.p.w; const v1 = (alvo[1] - s.p.y) / s.p.h
  checar(s.z > antes.z * 1.3 && cobre(s), `${nome}: Ctrl+roda aproxima (${antes.z} → ${s.z})`)
  checar(quase(u0, u1, 0.01) && quase(v0, v1, 0.01), `${nome}: o zoom da roda mantém o ponto sob o cursor`)
  // roda comum NÃO é do mapa na página: rola a página (sem prender)
  const z1 = s.z
  const preso = await c.page.evaluate(({ x, y }) => { const e = new WheelEvent('wheel', { deltaY: 400, clientX: x, clientY: y, bubbles: true, cancelable: true }); document.elementFromPoint(x, y).dispatchEvent(e); return e.defaultPrevented }, { x: alvo[0], y: alvo[1] })
  const depois = await lerTudo(c.page)
  checar(!preso && depois.z === z1, `${nome}: a roda comum não é do mapa na página (evento livre para rolar a página, zoom ${z1} → ${depois.z})`)
  // botões e limites
  const mais = c.page.getByRole('button', { name: 'Aproximar', exact: true }); const menos = c.page.getByRole('button', { name: 'Afastar', exact: true })
  for (let i = 0; i < 8; i++) { if (await mais.isEnabled()) { await mais.click(); await c.page.waitForTimeout(280) } }
  s = await lerTudo(c.page)
  checar(quase(s.z, 3, 0.02) && await mais.isDisabled() && cobre(s), `${nome}: zoom máximo (3×) desliga "Aproximar"`)
  for (let i = 0; i < 8; i++) { if (await menos.isEnabled()) { await menos.click(); await c.page.waitForTimeout(280) } }
  s = await lerTudo(c.page)
  checar(Math.abs(s.z - 1) < 0.01 && await menos.isDisabled() && cobre(s), `${nome}: zoom mínimo cobre a janela e desliga "Afastar"`)
  // teclado
  await c.page.locator('.ct-mundo__janela').focus()
  await c.page.keyboard.press('+'); await c.page.waitForTimeout(350)
  const k1 = await lerTudo(c.page)
  await c.page.keyboard.press('ArrowRight'); await c.page.keyboard.press('ArrowDown'); await c.page.waitForTimeout(300)
  const k2 = await lerTudo(c.page)
  checar(k1.z > 1.4 && (k2.p.x !== k1.p.x || k2.p.y !== k1.p.y) && cobre(k2), `${nome}: teclado: + aproxima e as setas movem sem sair da arte`)
  await c.page.keyboard.press('0'); await c.page.waitForTimeout(350)
  checar(Math.abs((await lerTudo(c.page)).z - 1) < 0.01, `${nome}: teclado: 0 volta à vista de abertura`)
  // duplo clique aproxima no ponto (num ponto sem pin nem botão)
  const livre = await c.page.evaluate(({ x0, y0, w, h }) => { for (let dy = 0; dy < h; dy += 24) for (let dx = 0; dx < w; dx += 24) { const x = x0 + dx; const y = y0 + dy; const e = document.elementFromPoint(x, y); if (e && !e.closest('button') && e.closest('.ct-mundo__janela')) return [x, y] } return null }, { x0: j.x + j.w * 0.4, y0: j.y + j.h * 0.3, w: j.w * 0.3, h: j.h * 0.4 })
  await c.page.mouse.dblclick(livre[0], livre[1]); await c.page.waitForTimeout(400)
  checar((await lerTudo(c.page)).z > 1.8, `${nome}: duplo clique aproxima`)
  await c.page.mouse.dblclick(livre[0], livre[1]); await c.page.waitForTimeout(400)
  await c.page.mouse.dblclick(livre[0], livre[1]); await c.page.waitForTimeout(400)
  checar(Math.abs((await lerTudo(c.page)).z - 1) < 0.02, `${nome}: de novo no máximo, o duplo clique volta ao início`)
  // seleção depois de mover e ampliar; arrasto a partir do pin não escolhe
  await mais.click(); await c.page.waitForTimeout(350)
  let pin = await pinVisivel(c.page)
  if (checar(!!pin, `${nome}: há pin visível para clicar`)) {
    await c.page.mouse.move(pin.x, pin.y); await c.page.mouse.down(); await c.page.mouse.move(pin.x - 90, pin.y + 30, { steps: 8 }); await c.page.mouse.up()
    await c.page.waitForTimeout(100)
    checar(await c.page.locator('.ct-mundo__casa.is-sel').count() === 0, `${nome}: arrastar a partir de um pin NÃO escolhe a casa`)
    pin = await pinVisivel(c.page)
    await c.page.mouse.click(pin.x, pin.y)
    await c.page.locator('.ct-mundo__casa.is-sel').waitFor({ timeout: 5000 }).catch(() => null)
    checar(await c.page.locator('.ct-mundo__casa.is-sel').count() === 1, `${nome}: clicar no pin (depois de mover e ampliar) escolhe a casa`)
  }
  await c.page.waitForTimeout(600) // o afastamento recalcula quando a câmera assenta (160 ms) e o pin desliza (180 ms)
  const al = await pinsAlinhados(c.page)
  checar(al.maior <= 1.5, `${nome}: pins alinhados com zoom e arraste (${al.maior}px)`)
  await foto(c, `${nome}-2-zoom-e-casa`)

  // tela cheia no desktop
  const pre = await lerTudo(c.page)
  await c.page.locator('[data-abrir-cheia]').click()
  await c.page.waitForSelector('.ct-mapa__explorar.is-cheia'); await c.page.waitForTimeout(500)
  const cheia = await lerTudo(c.page)
  checar(cobre(cheia) && proporcao(cheia) && cheia.lateral <= 1 && quase(cheia.z, pre.z, 0.01), `${nome}: tela cheia cobre, sem distorção e mantém o zoom`)
  const alC = await pinsAlinhados(c.page)
  checar(alC.maior <= 1.5, `${nome}: pins alinhados na tela cheia (${alC.maior}px)`)
  // roda do mouse na tela cheia = zoom
  const zc = cheia.z
  await c.page.mouse.move(cheia.j.x + cheia.j.w / 2, cheia.j.y + cheia.j.h / 2)
  await c.page.mouse.wheel(0, -120); await c.page.waitForTimeout(120)
  checar((await lerTudo(c.page)).z !== zc, `${nome}: na tela cheia a roda do mouse dá zoom`)
  await foto(c, `${nome}-3-tela-cheia`)
  await c.page.keyboard.press('Escape'); await c.page.waitForTimeout(500)
  const fora = await lerTudo(c.page)
  checar(cobre(fora) && await c.page.locator('.ct-mapa__explorar.is-cheia').count() === 0, `${nome}: Escape sai da tela cheia e o mapa continua cobrindo`)
  checar(!c.erros.length, `${nome}: sem erro de console (${c.erros[0] || ''})`)
  await c.ctx.close()
}

async function movimentoReduzido (nav) {
  const nome = 'movimento-reduzido'
  console.log(`\n${nome}`)
  const c = await abrir(nav, { w: 1280, h: 800, reduzir: true })
  await c.page.getByRole('button', { name: 'Aproximar', exact: true }).click()
  await c.page.waitForTimeout(30)
  checar((await lerTudo(c.page)).z > 1.4, `${nome}: o zoom por botão é instantâneo (sem animação)`)
  await c.ctx.close()
}

// ---------------------------------------------------------------- orquestra
let saida = 0
let nav
try {
  if (!reusar) { const t = Date.now(); while (Date.now() - t < 40000 && !(await responde())) await esperar(400) }
  nav = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
  {
    const quente = await nav.newContext({ viewport: { width: 390, height: 800 } })
    const pg = await quente.newPage()
    await pg.goto(`${BASE}/cartoon/mapa?preview=1`, { waitUntil: 'networkidle', timeout: 120000 }).catch(() => null)
    await quente.close()
  }
  await celularEmPe(nav)
  await celularDeitado(nav)
  await desktop(nav, 1440, 900)
  await desktop(nav, 1100, 1000)
  console.log('\nproporções de janela (só geometria)')
  for (const [w, h] of [[1920, 700], [1024, 1366], [820, 1180], [360, 640]]) await preenche(nav, `janela-${w}x${h}`, { w, h })
  await movimentoReduzido(nav)
} catch (e) {
  console.error('✗ erro fatal:', e)
  saida = 1
} finally {
  await nav?.close().catch(() => {})
  if (servidor) matar(servidor.pid)
}
console.log(`\ncapturas em ${CAPTURAS}`)
if (falhas.length || saida) { console.log(`\n✗ ${falhas.length} falha(s)`); process.exit(1) }
console.log('\n✓ mapa: câmera ok')
