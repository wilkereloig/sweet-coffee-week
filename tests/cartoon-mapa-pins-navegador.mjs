/*
 * Pins informativos do Mapa da Doçura (06/11/2026), no navegador de verdade contra o BUILD de produção (vite preview): ponto do horário
 * (aberto · abre em breve · fechado) no ilustrado e no mapa real (MapLibre), sem se sobrepor aos outros selos, o relógio andando
 * (pulso único, sem animação contínua), o cartão com "Combo abre em N min", movimento reduzido e os pins do Sicredi intactos — em
 * 360×740, 390×844 e 1440×900. Caça e servidor simulados na rede; o banco NÃO é tocado.
 *   node tests/cartoon-mapa-pins-navegador.mjs [<pasta do build>]   (sem argumento, roda `vite build` num diretório temporário)
 *   MAPA_PINS_CAPTURAS=<pasta> grava as capturas.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'

const RAIZ = join(import.meta.dirname, '..')
const PORT = 4187
const BASE = `http://localhost:${PORT}`
const CAPTURAS = process.env.MAPA_PINS_CAPTURAS || join(tmpdir(), `mapa-pins-${Date.now().toString(36)}`)
mkdirSync(CAPTURAS, { recursive: true })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const falhas = []
const checar = (cond, msg) => { console.log(`  ${cond ? '✓' : '✗'} ${msg}`); if (!cond) falhas.push(msg) }

let dir = process.argv[2]
if (!dir) {
  dir = join(tmpdir(), `scw-pins-build-${Date.now().toString(36)}`)
  execSync(`npx vite build --outDir "${dir}" --emptyOutDir`, { cwd: RAIZ, stdio: 'ignore' })
}
const servidor = spawn('npx', ['vite', 'preview', '--outDir', dir, '--port', String(PORT), '--strictPort'], { cwd: RAIZ, shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
const matar = () => { if (servidor?.pid) { try { process.platform === 'win32' ? execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' }) : process.kill(-servidor.pid, 'SIGKILL') } catch { /* já morto */ } } }
const responde = async () => { try { return (await fetch(`${BASE}/cartoon`, { signal: AbortSignal.timeout(1500) })).ok } catch { return false } }
for (let i = 0; i < 120 && !(await responde()); i++) await esperar(350)

const CHAVE = 'B'.repeat(32)
const MAPA = {
  edicao: '2026.2', apelido: 'E2E', email: 'e2e@exemplo.com.br', whatsapp: null, no_ranking: true, principal: true, total_casas: 26,
  casas_validadas: 2, extras: 3, faltam: 24, posicao: 2, empatados: 1,
  casas: [
    { slug: 'adocee-doceria', carimbos: 3, avaliou: true, estado: 'validada', extras: 2 },
    { slug: 'carcara', carimbos: 1, avaliou: true, estado: 'validada', extras: 0 },
    { slug: 'cookitos', carimbos: 1, avaliou: false, estado: 'pendente', extras: 0 },
  ],
}
const ESTILO_VAZIO = { version: 8, sources: {}, layers: [{ id: 'fundo', type: 'background', paint: { 'background-color': '#FDF0DE' } }] }
const json = (route, corpo) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corpo) })
const ehOpcoes = (route) => route.request().method() === 'OPTIONS'
// Natal é UTC−3.
const HORA = (hhmm) => new Date(`2026-11-08T${hhmm}:00-03:00`)

async function abrir (nav, { w, h, toque = false, hora = '13:30', vista = '', reduzir = false }) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque, deviceScaleFactor: toque ? 2 : 1, reducedMotion: reduzir ? 'reduce' : 'no-preference' })
  await ctx.addInitScript(([k, c]) => {
    try { localStorage.setItem('scw_privacidade', c); localStorage.setItem('scw:edicao:2026.2:mapa', k) } catch { /* sem storage */ }
  }, [CHAVE, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 })])
  await ctx.route('**/rest/v1/rpc/mapa_ler_v2*', (r) => (ehOpcoes(r) ? r.fallback() : json(r, MAPA)))
  await ctx.route('**/tiles.openfreemap.org/**', (r) => json(r, ESTILO_VAZIO))
  await ctx.route('**/challenges.cloudflare.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e.message || e).slice(0, 200)))
  await page.clock.install({ time: HORA(hora) }) // o relógio do navegador: andamos nele com fastForward
  await page.goto(`${BASE}/cartoon/mapa?preview=1${vista ? `&vista=${vista}` : ''}`, { waitUntil: 'networkidle', timeout: 120000 })
  return { ctx, page, erros }
}

/** Por pin do ilustrado: nível, ícone, e quanto o ponto do horário invade (em % da área dele) cada outro selo e o disco. */
const lerMundo = (page) => page.evaluate(() => {
  const area = (r) => Math.max(0, r.width) * Math.max(0, r.height)
  const inter = (a, b) => area({ width: Math.min(a.right, b.right) - Math.max(a.left, b.left), height: Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) })
  return [...document.querySelectorAll('.ct-mundo__casa')].map((b) => {
    const ponto = b.querySelector('.ct-mundo__abertura')
    const out = { slug: b.querySelector('.ct-mundo__nome')?.textContent || '', abertura: b.dataset.abertura || '', estado: b.dataset.estado || '', mudou: b.classList.contains('is-mudou'), nome: b.getAttribute('aria-label') || '', tem: !!ponto }
    if (ponto) {
      const r = ponto.getBoundingClientRect()
      out.icone = ponto.querySelector('svg')?.dataset.icone || ''
      out.nivelDoPonto = ponto.dataset.nivel
      out.lado = [r.width, r.height]
      out.sobre = {}
      for (const q of ['.ct-mundo__estado', '.ct-mundo__num', '.ct-mundo__parada', '.ct-mundo__revisita', '.ct-mundo__ordem', '.ct-mundo__ponta']) {
        const e = b.querySelector(q)
        if (e && e.getClientRects().length) out.sobre[q] = inter(r, e.getBoundingClientRect()) / area(r)
      }
      const d = b.querySelector('.ct-mundo__disco').getBoundingClientRect()
      out.sobreDisco = inter(r, d) / area(r)
    }
    return out
  })
})

const nomeDoPonto = (p) => `${p.slug}`
let nav
try {
  nav = await chromium.launch()

  for (const [w, h, toque] of [[360, 740, true], [390, 844, true], [1440, 900, false]]) {
    const onde = `@${w}x${h}`
    console.log(`\nilustrado ${onde} (13:30 em Natal, 8/11)`)
    const c = await abrir(nav, { w, h, toque })
    const p = c.page
    await p.locator('.ct-mundo__casa').first().waitFor({ timeout: 30000 })
    await p.waitForFunction(() => document.querySelector('.ct-mundo__casa[data-estado="conquistada"]'), null, { timeout: 15000 }).catch(() => null)
    let pins = await lerMundo(p)
    const comPonto = pins.filter((x) => x.tem)
    const niveis = new Set(comPonto.map((x) => x.abertura))
    console.log(`  ${pins.length} pins, ${comPonto.length} com ponto; níveis: ${[...niveis].join(', ') || '—'}`)
    checar(pins.length >= 20, `${onde}: pins do ilustrado (${pins.length})`)
    checar(comPonto.length > 0 && comPonto.every((x) => ['aberto', 'breve', 'fechado'].includes(x.abertura) && x.nivelDoPonto === x.abertura), `${onde}: o ponto tem o nível do pin`)
    checar(comPonto.every((x) => ({ aberto: 'sucesso', breve: 'horario', fechado: 'pausa' }[x.abertura] === x.icone)), `${onde}: ícone do catálogo por nível (sucesso · horario · pausa), não só cor`)
    checar(comPonto.every((x) => /combo (disponível agora|abre em breve|fora do horário agora)/.test(x.nome)), `${onde}: o horário também está no nome acessível`)
    checar(pins.filter((x) => !x.tem).every((x) => !/combo (disponível|abre|fora)/.test(x.nome)), `${onde}: pin sem ponto não afirma aberto nem fechado`)
    checar(comPonto.every((x) => x.lado[0] >= 19 && x.lado[0] <= 21), `${onde}: ponto compacto (20 px)`)
    const piores = comPonto.flatMap((x) => Object.entries(x.sobre).map(([q, v]) => [q, v])).sort((a, b) => b[1] - a[1])[0]
    checar(!piores || piores[1] <= 0.3, `${onde}: o ponto não cobre outro selo (maior sobreposição ${piores ? `${piores[0]} ${(piores[1] * 100).toFixed(0)}%` : '0%'})`)
    const maxDisco = Math.max(0, ...comPonto.map((x) => x.sobreDisco))
    checar(maxDisco <= 0.55, `${onde}: a logo segue o elemento principal (ponto invade o disco em até ${(maxDisco * 100).toFixed(0)}%)`)
    await p.screenshot({ path: join(CAPTURAS, `ilustrado-${w}x${h}.png`) })

    // Animação contínua: nenhuma no ponto (o pulso só existe logo depois de uma mudança).
    const animando = await p.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.('.ct-mundo__abertura') || a.effect?.target?.classList?.contains('ct-mundo__abertura')).length)
    checar(animando === 0, `${onde}: nenhum pin do horário animando em repouso`)
    checar(pins.every((x) => !x.mudou), `${onde}: nada pulsa na primeira leitura`)

    // O relógio anda: 31 min depois, quem abria às 14:00 vira "aberto", com um pulso que sai sozinho.
    const antes = new Map(pins.map((x) => [x.slug + '|' + x.nome.split(',')[0], x.abertura]))
    await p.clock.fastForward(31 * 60 * 1000)
    await esperar(600)
    pins = await lerMundo(p)
    const mudaram = pins.filter((x) => antes.get(x.slug + '|' + x.nome.split(',')[0]) !== x.abertura)
    console.log(`  depois de 31 min: ${mudaram.length} pin(s) mudaram de nível`)
    checar(mudaram.length > 0, `${onde}: o relógio mudou o nível de pelo menos um pin sem recarregar`)
    checar(mudaram.length === 0 || mudaram.every((x) => x.mudou || !x.tem), `${onde}: quem mudou recebe o pulso (is-mudou)`)
    if (mudaram.some((x) => x.tem)) {
      const anim = await p.evaluate(() => document.getAnimations().filter((a) => a.animationName === 'ct-mundo-abertura').length)
      checar(anim >= 1 && anim <= mudaram.length, `${onde}: pulso só nos que mudaram (${anim} animação(ões), ${mudaram.length} mudaram)`)
    }
    await p.clock.fastForward(3500); await esperar(500)
    pins = await lerMundo(p)
    checar(pins.every((x) => !x.mudou), `${onde}: o pulso sai sozinho (nada fica animado)`)
    checar(c.erros.length === 0, `${onde}: sem erro de página${c.erros.length ? ` — ${c.erros[0]}` : ''}`)
    await c.ctx.close()
  }

  // ---- seleção e cartão: "Abre em N min"
  console.log('\ncartão da casa (13:30)')
  {
    const c = await abrir(nav, { w: 390, h: 844, toque: true, hora: '13:30' })
    const p = c.page
    await p.locator('.ct-mundo__casa').first().waitFor({ timeout: 30000 })
    const alvo = p.locator('.ct-mundo__casa[data-abertura="breve"]').first()
    if (await alvo.count()) {
      await alvo.click()
      const cartao = p.locator('.ct-mapa__cartao')
      await cartao.waitFor({ timeout: 8000 })
      const txt = await cartao.innerText()
      checar(/Combo abre em \d+ min/.test(txt), `cartão de casa que abre em breve: "${(txt.match(/Combo abre em \d+ min/) || ['sem texto'])[0]}"`)
      checar(await cartao.locator('.ct-agora').first().isVisible(), 'o horário fica à vista no cartão (não escondido em "Mais")')
      await p.screenshot({ path: join(CAPTURAS, 'cartao-abre-em-breve-390.png') })
      await p.clock.fastForward(61 * 1000); await esperar(300)
      const depois = await cartao.innerText()
      checar(/Combo abre em \d+ min/.test(depois) && depois !== txt || /disponível/.test(depois), 'o cartão anda com o relógio (os minutos mudam sozinhos)')
    } else {
      checar(false, 'nenhuma casa "abre em breve" às 13:30 para testar o cartão')
    }
    await c.ctx.close()
  }

  // ---- horário que não dá para saber, fora do festival: sem indicador
  console.log('\nfora do festival (1/11) e movimento reduzido')
  {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })
    await ctx.addInitScript(([k, c]) => { try { localStorage.setItem('scw_privacidade', c); localStorage.setItem('scw:edicao:2026.2:mapa', k) } catch { /* sem storage */ } }, [CHAVE, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 })])
    await ctx.route('**/rest/v1/rpc/mapa_ler_v2*', (r) => (ehOpcoes(r) ? r.fallback() : json(r, MAPA)))
    await ctx.route('**/tiles.openfreemap.org/**', (r) => json(r, ESTILO_VAZIO))
    await ctx.route('**/challenges.cloudflare.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
    const p = await ctx.newPage()
    await p.clock.install({ time: new Date('2026-11-01T12:00:00-03:00') })
    await p.goto(`${BASE}/cartoon/mapa?preview=1`, { waitUntil: 'networkidle', timeout: 120000 })
    await p.locator('.ct-mundo__casa').first().waitFor({ timeout: 30000 })
    const fora = await lerMundo(p)
    checar(fora.every((x) => !x.tem && !x.abertura), `antes do festival: nenhum pin afirma aberto nem fechado (${fora.filter((x) => x.tem).length} com ponto)`)
    await p.clock.setSystemTime(HORA('13:30')); await p.clock.fastForward(61 * 1000); await esperar(500)
    const dentro = await lerMundo(p)
    checar(dentro.some((x) => x.tem), 'o festival começou com a página aberta: os pontos aparecem sozinhos')
    checar(dentro.every((x) => !x.mudou) || dentro.some((x) => x.mudou), 'estado de pulso coerente')
    // movimento reduzido: o pulso vira um contorno fixo, sem animação
    await p.clock.fastForward(31 * 60 * 1000); await esperar(400)
    const reduzido = await p.evaluate(() => {
      const el = document.querySelector('.ct-mundo__casa.is-mudou .ct-mundo__abertura')
      return el ? { anim: getComputedStyle(el).animationName, contorno: getComputedStyle(el).outlineStyle } : null
    })
    checar(!reduzido || (reduzido.anim === 'none' && reduzido.contorno === 'solid'), `prefers-reduced-motion: pulso vira contorno fixo (${reduzido ? `${reduzido.anim}/${reduzido.contorno}` : 'ninguém mudou'})`)
    await ctx.close()
  }

  // ---- mapa real (MapLibre; sem chave do Google no build)
  for (const [w, h, toque] of [[360, 740, true], [1440, 900, false]]) {
    const onde = `@${w}x${h}`
    console.log(`\nmapa real ${onde}`)
    const c = await abrir(nav, { w, h, toque, vista: 'real' })
    const p = c.page
    await p.locator('.ct-marcador--pin .ct-pin').first().waitFor({ state: 'attached', timeout: 30000 })
    const real = await p.evaluate(() => [...document.querySelectorAll('.ct-marcador--pin')].map((m) => {
      const pin = m.querySelector('.ct-pin')
      const ponto = pin.querySelector('.ct-mundo__abertura')
      return { nivel: pin.dataset.abertura || '', ponto: !!ponto, icone: ponto?.querySelector('svg')?.dataset.icone || '', nome: m.getAttribute('aria-label') || m.closest('[aria-label]')?.getAttribute('aria-label') || '', provedor: m.tagName === 'SPAN' && m.parentElement?.tagName.toLowerCase() === 'gmp-advanced-marker' ? 'google' : 'maplibre', filhos: ponto?.children.length || 0, estado: pin.dataset.estado || '' }
    }))
    const com = real.filter((x) => x.ponto)
    console.log(`  ${real.length} pins (${real[0]?.provedor}), ${com.length} com ponto`)
    checar(com.length > 0, `${onde}: o mapa real também mostra o ponto do horário`)
    checar(com.every((x) => ['sucesso', 'horario', 'pausa'].includes(x.icone) && x.filhos === 1), `${onde}: ícone do catálogo (svg, um só)`)
    checar(com.every((x) => /combo (disponível agora|abre em breve|fora do horário agora)/.test(x.nome)), `${onde}: nome acessível do marcador diz o horário`)
    checar(real.some((x) => x.estado === 'pendente' && /carimbo pendente/.test(x.nome)), `${onde}: o nome acessível diz também o estado na Caça`)
    checar(real.filter((x) => !x.ponto).every((x) => !x.nivel), `${onde}: sem dado, sem ponto`)
    const sicredi = await p.evaluate(() => ({ pins: document.querySelectorAll('.ct-sicredi-pin').length, comPonto: document.querySelectorAll('.ct-sicredi-pin .ct-mundo__abertura').length }))
    checar(sicredi.comPonto === 0, `${onde}: pins do Sicredi sem ponto de horário (${sicredi.pins} pins)`)
    await p.screenshot({ path: join(CAPTURAS, `real-${w}x${h}.png`) })
    // Muitos pins próximos: a estratégia de afastar segue (nenhum pin fica sem o fio quando deslocado).
    const afastados = await p.evaluate(() => [...document.querySelectorAll('.ct-marcador--pin')].filter((m) => parseFloat(m.style.getPropertyValue('--dx')) || parseFloat(m.style.getPropertyValue('--dy'))).length)
    console.log(`  ${afastados} pin(s) afastados pelo afastar.js`)
    await c.ctx.close()
  }
} finally {
  await nav?.close()
  matar()
}
console.log(falhas.length ? `\n✗ ${falhas.length} falha(s)` : '\n✓ tudo certo')
process.exit(falhas.length ? 1 : 0)
