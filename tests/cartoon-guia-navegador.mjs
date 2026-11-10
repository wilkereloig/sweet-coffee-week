/*
 * Guia "Como carimbar" no navegador (09/11/2026): introdução do primeiro acesso (dispensa lembrada), atalho permanente no hub, no mapa e na
 * tela do carimbo, folha acessível (foco, Escape, foco de volta) e sem rolagem lateral em 360 e 1280. Sem mapa no aparelho: nenhuma chamada
 * ao servidor da Caça é necessária e o banco não é tocado. Reaproveita a porta 5213 (a mesma do layout do mapa; rodar um de cada vez).
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'

const PORT = 5213
const BASE = `http://localhost:${PORT}`
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const falhas = []
const checar = (cond, msg) => { console.log(`  ${cond ? '✓' : '✗'} ${msg}`); if (!cond) falhas.push(msg) }
const responde = async () => { try { return (await fetch(`${BASE}/cartoon`, { signal: AbortSignal.timeout(30000) })).ok } catch { return false } }

let servidor = null
if (!(await responde())) {
  servidor = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  for (let i = 0; i < 120 && !(await responde()); i++) await esperar(350)
}
const matar = () => { if (servidor?.pid) { try { process.platform === 'win32' ? execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' }) : process.kill(-servidor.pid, 'SIGKILL') } catch { /* já morto */ } } }

const navegador = await chromium.launch()
try {
  for (const [nome, viewport] of [['celular', { width: 360, height: 740 }], ['desktop', { width: 1280, height: 900 }]]) {
    const ctx = await navegador.newContext({ viewport })
    const page = await ctx.newPage()
    const erros = []
    page.on('pageerror', (e) => erros.push(String(e)))
    const semRolagem = async (onde) => checar(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${nome} · ${onde}: sem rolagem lateral`)
    const abreEFecha = async (onde) => {
      const botao = page.locator('[data-como-carimbar]:visible').first()
      await botao.click()
      const folha = page.getByRole('dialog', { name: 'Como carimbar' })
      checar(await folha.isVisible(), `${nome} · ${onde}: "Como carimbar?" abre o guia`)
      checar(await folha.locator('.ct-guia__passos li').count() === 5, `${nome} · ${onde}: cinco passos`)
      checar(await folha.evaluate((el) => el.contains(document.activeElement)), `${nome} · ${onde}: o foco entra na folha`)
      await semRolagem(`${onde} com o guia aberto`)
      await page.keyboard.press('Escape')
      checar(await folha.count() === 0, `${nome} · ${onde}: Escape fecha`)
      checar(await botao.evaluate((el) => el === document.activeElement), `${nome} · ${onde}: o foco volta ao botão`)
    }

    // Hub, primeira visita: a introdução aparece na tela (não é janela), abre o guia e não volta depois.
    const pronto = () => page.locator('[data-como-carimbar]').first().waitFor({ state: 'attached', timeout: 45000 }) // a página consulta dados de tempos em tempos: a rede nunca fica ociosa
    await page.goto(`${BASE}/cartoon/caca`, { waitUntil: 'domcontentloaded' }); await pronto()
    const intro = page.locator('.ct-guia__intro')
    checar(await intro.isVisible(), `${nome} · hub: introdução do primeiro acesso à vista`)
    checar(await page.getByRole('dialog').count() === 0, `${nome} · hub: nada abre por cima sozinho`)
    await semRolagem('hub')
    await page.locator('[data-guia-depois]').click()
    checar(await intro.count() === 0, `${nome} · hub: "Agora não" dispensa`)
    await page.reload({ waitUntil: 'domcontentloaded' }); await pronto()
    checar(await page.locator('.ct-guia__intro').count() === 0, `${nome} · hub: a dispensa fica lembrada`)
    await abreEFecha('hub')

    // Mapa: o atalho mora na faixa do jogo, fora da tela cheia.
    await page.goto(`${BASE}/cartoon/mapa`, { waitUntil: 'domcontentloaded' }); await pronto()
    checar(await page.locator('.ct-jogo-faixa [data-como-carimbar]').isVisible(), `${nome} · mapa: "Como carimbar?" na faixa do jogo`)
    checar(await page.locator('[data-faixa-jogo="rota"]').isVisible() === (viewport.width >= 900), `${nome} · mapa: Rota na faixa só no computador`)
    await semRolagem('mapa')
    await abreEFecha('mapa')
    for (const chave of ['premios', 'ranking']) {
      await page.locator(`[data-faixa-jogo="${chave}"]`).click()
      checar(await page.getByRole('dialog').isVisible(), `${nome} · mapa: ${chave} abre sem tela cheia`)
      await page.keyboard.press('Escape')
    }

    // Tela do carimbo (QR do display de uma casa): a ajuda está onde a pessoa tenta carimbar.
    const slug = await page.evaluate(async () => (await import('/src/edicao/dados/retrato/cartoon.local.json')).default?.participantes?.[0]?.slug).catch(() => null)
    if (slug) {
      await page.goto(`${BASE}/cartoon/carimbo/${slug}`, { waitUntil: 'domcontentloaded' }); await pronto()
      checar(await page.locator('[data-como-carimbar]').first().isVisible(), `${nome} · carimbo: "Como carimbar?" na tela do carimbo`)
      await semRolagem('carimbo')
      await abreEFecha('carimbo')
    } else console.log('  · carimbo: sem retrato local, cenário pulado')
    checar(erros.length === 0, `${nome}: sem erro de script${erros.length ? ` (${erros[0]})` : ''}`)
    if (process.env.GUIA_CAPTURAS) { await page.goto(`${BASE}/cartoon/caca`); await pronto(); await page.locator('[data-como-carimbar]:visible').first().click(); await esperar(700); await page.screenshot({ path: `${process.env.GUIA_CAPTURAS}/guia-${nome}.png` }) }
    await ctx.close()
  }
} finally { await navegador.close(); matar() }
if (falhas.length) { console.error(`\n✗ ${falhas.length} falha(s)`); process.exit(1) }
console.log('\n✓ guia de como carimbar ok')
