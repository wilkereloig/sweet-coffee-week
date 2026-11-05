/*
 * Pin único nos dois mapas (Mapa da Doçura): o ilustrado (Mundo) e o real (MapLibre) mostram O MESMO pin, sincronizado.
 * Sem carimbo na casa = logo desenhada P&B; com carimbo (pendente ou conquistado) = logo desenhada colorida.
 * Servidor do Caça simulado na rede do navegador (mapa_ler_v2); o banco não é tocado. Precisa do vite dev na porta 5212.
 *   MAPA_PIN_REUSAR=1 reaproveita o servidor já aberto · MAPA_PIN_CAPTURAS=<pasta> grava as capturas.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'

const PORT = 5212
const BASE = `http://localhost:${PORT}`
const CAPTURAS = process.env.MAPA_PIN_CAPTURAS || join(tmpdir(), `mapa-pin-${Date.now().toString(36)}`)
mkdirSync(CAPTURAS, { recursive: true })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const falhas = []
const checar = (cond, msg) => { console.log(`  ${cond ? '✓' : '✗'} ${msg}`); if (!cond) falhas.push(msg) }
const responde = async () => { try { return (await fetch(`${BASE}/cartoon`, { signal: AbortSignal.timeout(1500) })).ok } catch { return false } }

let servidor = null
if (!(await responde())) {
  if (process.env.MAPA_PIN_REUSAR === '1') { console.error('✗ sem servidor na 5212'); process.exit(1) }
  servidor = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  for (let i = 0; i < 120 && !(await responde()); i++) await esperar(350)
}
const matar = () => { if (servidor?.pid) { try { process.platform === 'win32' ? execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' }) : process.kill(-servidor.pid, 'SIGKILL') } catch { /* já morto */ } } }

const CHAVE = 'F'.repeat(32)
const MAPA = {
  edicao: '2026.2', apelido: 'E2E', email: 'e2e@exemplo.com.br', whatsapp: null, no_ranking: true, principal: true, total_casas: 26,
  casas_validadas: 2, extras: 0, faltam: 24, posicao: 2, empatados: 1,
  casas: [
    { slug: 'adocee-doceria', carimbos: 1, avaliou: true, estado: 'validada', extras: 0 },
    { slug: 'carcara', carimbos: 1, avaliou: true, estado: 'validada', extras: 0 },
    { slug: 'cookitos', carimbos: 1, avaliou: false, estado: 'pendente', extras: 0 },
  ],
}
const ESTILO_VAZIO = { version: 8, sources: {}, layers: [{ id: 'fundo', type: 'background', paint: { 'background-color': '#FDF0DE' } }] }
const json = (route, corpo) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corpo) })

const nav = await chromium.launch()
try {
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(([k, c]) => { try { localStorage.setItem('scw:edicao:2026.2:mapa', k); localStorage.setItem('scw_privacidade', c) } catch { /* sem storage */ } },
    [CHAVE, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 })])
  await ctx.route('**/rest/v1/rpc/mapa_ler_v2*', (route) => (route.request().method() === 'OPTIONS' ? route.fallback() : json(route, MAPA)))
  await ctx.route('**/tiles.openfreemap.org/**', (route) => json(route, ESTILO_VAZIO))
  await ctx.route('**/challenges.cloudflare.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))

  // ---- ilustrado
  await page.goto(`${BASE}/cartoon/mapa?preview=1`, { waitUntil: 'networkidle' })
  await page.locator('.ct-mundo__casa').first().waitFor()
  await page.waitForFunction(() => document.querySelector('.ct-mundo__casa[data-estado="conquistada"]'), null, { timeout: 15000 }).catch(() => null)
  const lerMundo = () => page.evaluate(() => [...document.querySelectorAll('.ct-mundo__casa')].map((b) => ({
    slug: b.querySelector('img')?.getAttribute('src') || '', estado: b.dataset.estado || '', numero: b.querySelector('.ct-mundo__num')?.textContent || '',
  })))
  const mundo = await lerMundo()
  const desenhadas = mundo.filter((m) => /logos-desenhadas\//.test(m.slug))
  checar(desenhadas.length >= 20, `ilustrado: casas com logo desenhada (${desenhadas.length})`)
  const errada = desenhadas.filter((m) => (['pendente', 'conquistada'].includes(m.estado)) !== /-cor\.webp$/.test(m.slug))
  checar(errada.length === 0, 'ilustrado: com carimbo = colorida, sem carimbo = P&B')
  checar(mundo.some((m) => m.estado === 'conquistada' && /-cor\.webp$/.test(m.slug)), 'ilustrado: há casa conquistada colorida')
  checar(mundo.some((m) => m.estado === 'pendente' && /-cor\.webp$/.test(m.slug)), 'ilustrado: há casa pendente colorida')
  checar(mundo.some((m) => m.estado === 'nao-visitada' && /-pb\.webp$/.test(m.slug)), 'ilustrado: há casa sem carimbo em P&B')
  await page.screenshot({ path: join(CAPTURAS, 'ilustrado.png') })

  // ---- real
  await page.goto(`${BASE}/cartoon/mapa?preview=1&vista=real`, { waitUntil: 'networkidle' })
  await page.locator('.ct-marcador--pin .ct-pin').first().waitFor({ timeout: 20000 })
  const real = await page.evaluate(() => [...document.querySelectorAll('.ct-marcador--pin .ct-pin')].map((p) => ({
    slug: p.querySelector('.ct-mundo__disco img')?.getAttribute('src') || '', estado: p.dataset.estado || '', numero: p.querySelector('.ct-mundo__num')?.textContent || '',
    disco: !!p.querySelector('.ct-mundo__disco'), ponta: !!p.querySelector('.ct-mundo__ponta'),
  })))
  checar(real.length > 0 && real.every((r) => r.disco && r.ponta), `real: pin com disco e ponta, como no ilustrado (${real.length} pins)`)
  const chave = (m) => `${m.slug}|${m.estado}|${m.numero}`
  const noMundo = new Set(mundo.map(chave))
  const fora = real.filter((r) => r.numero !== '' && !noMundo.has(chave(r)))
  checar(fora.length === 0, `real = ilustrado: mesma logo, mesmo estado e mesmo número${fora.length ? ` (divergem: ${fora.slice(0, 3).map(chave).join('; ')})` : ''}`)
  checar(real.some((r) => /-cor\.webp$/.test(r.slug) && r.estado === 'conquistada'), 'real: casa conquistada com logo colorida')
  checar(real.some((r) => /-pb\.webp$/.test(r.slug) && r.estado === 'nao-visitada'), 'real: casa sem carimbo com logo P&B')
  const tamanho = await page.evaluate(() => { const d = document.querySelector('.ct-marcador--pin .ct-pin .ct-mundo__disco'); return [d.offsetWidth, d.offsetHeight] })
  checar(tamanho[0] >= 40 && tamanho[0] === tamanho[1], `real: disco redondo e legível (${tamanho.join('×')} px, sem a escala de "longe")`)
  await page.screenshot({ path: join(CAPTURAS, 'real.png') })
  // Escolher uma casa aproxima o mapa: o pin aparece em tamanho cheio, com o aro de escolhida.
  await page.locator('.ct-marcador--pin:has(.ct-pin[data-estado="conquistada"])').first().click()
  await page.waitForTimeout(1800)
  await page.screenshot({ path: join(CAPTURAS, 'real-perto.png') })
  checar(await page.locator('.ct-marcador--pin.is-sel').count() === 1, 'real: casa escolhida marcada')
  checar(erros.length === 0, `sem erro de script${erros.length ? `: ${erros[0]}` : ''}`)
  await ctx.close()
} finally {
  await nav.close()
  matar()
}
console.log(`capturas em ${CAPTURAS}`)
if (falhas.length) { console.log(`✗ ${falhas.length} falha(s)`); process.exit(1) }
console.log('✓ pin único ok')
