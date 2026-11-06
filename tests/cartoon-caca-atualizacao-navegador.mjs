/**
 * cartoon-caca-atualizacao-navegador.mjs — o app da Caça troca de versão sozinho (06/11/2026), com navegador de verdade.
 *
 *   node tests/cartoon-caca-atualizacao-navegador.mjs        (constrói A e B em pasta temporária e roda tudo; ~1 min)
 *   CACA_ATUAL_A=<pasta> CACA_ATUAL_B=<pasta> node tests/cartoon-caca-atualizacao-navegador.mjs   (usa dois builds já prontos)
 *
 * A = o build do código atual. B = o mesmo código com UM texto trocado (rodapé "Regulamento"), então a id muda de verdade (é a id
 * que o vite.config.js › versaoDoSite calcula, não uma id inventada). O servidor de teste imita a Vercel: HTML sem cache, /assets
 * imutável, /versao.json sem cache, rotas do app caindo no index.html. Ele troca de A para B no meio do teste, como um deploy.
 * Nada aqui fala com o Supabase: as chamadas são interceptadas.
 *
 * Reprova:
 *  1 A aberto, B publicado, app volta do segundo plano → carrega B sem reinstalar e o dado do aparelho continua
 *  2 abertura a frio (app fechado e aberto de novo, com service worker ativo) → já vem B
 *  3 formulário em andamento → NÃO recarrega, avisa, preserva o texto; ao terminar, troca
 *  4 sem conexão → diz "sem conexão" e não promete versão nova; volta a rede → carrega B
 *  5 HTML velho no edge (versão nova não está inteira) → não recarrega nem entra em laço
 *  6 depois da troca não há recarga extra (sem laço), e o endereço não fica com marca de recarga
 *  7 service worker da Caça segue só em /cartoon/caca, sem cache; painel e push intactos
 *
 * Chromium só (WebKit/iPhone e Android reais não rodam aqui): iPhone/Android são EMULADOS por tamanho e user agent; o comportamento de
 * retomar do segundo plano é simulado por `visibilitychange`/`pageshow`, que é o gatilho que os dois sistemas entregam ao voltar.
 */
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const falhas = []
const ok = (m) => console.log(`  ✓ ${m}`)
const falha = (m) => { falhas.push(m); console.log(`  ✗ ${m}`) }
const confere = (cond, m) => (cond ? ok(m) : falha(m))

/* ── os dois builds ─────────────────────────────────────────────────────── */
const tmp = mkdtempSync(join(tmpdir(), 'scw_atual_'))
function construir (nome, marcador) {
  const saida = join(tmp, nome)
  const textos = join(RAIZ, 'src/edicao/caca/textos.js')
  const original = readFileSync(textos, 'utf8')
  try {
    if (marcador) writeFileSync(textos, original.replace("rodape: { regulamento: 'Regulamento' }", `rodape: { regulamento: 'Regulamento ${marcador}' }`))
    execSync(`npx vite build --outDir "${saida}" --emptyOutDir`, { cwd: RAIZ, stdio: 'ignore' })
  } finally { writeFileSync(textos, original) } // o arquivo volta ao que era, aconteça o que acontecer
  return saida
}
const pastaA = process.env.CACA_ATUAL_A || construir('a', null)
const pastaB = process.env.CACA_ATUAL_B || construir('b', 'versao-B')
const idDe = (pasta) => JSON.parse(readFileSync(join(pasta, 'versao.json'), 'utf8')).id
const ID_A = idDe(pastaA)
const ID_B = idDe(pastaB)
console.log(`versão A ${ID_A} · versão B ${ID_B}`)
if (ID_A === ID_B) { console.log('✗ as duas versões têm a mesma id: o teste não prova nada'); process.exit(1) }

/* ── servidor que imita a Vercel e troca de versão como um deploy ───────── */
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff' }
const estado = { raiz: pastaA, raizHtml: null, contagem: { html: 0, versao: 0 } }
const servidor = createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  let caminho = decodeURIComponent(url.pathname)
  if (caminho === '/painel/') caminho = '/painel-app/index.html' // rewrite do vercel.json
  const arquivoReal = (raiz, p) => { const f = join(raiz, p); return existsSync(f) && statSync(f).isFile() ? f : null }
  let raiz = estado.raiz
  let arquivo = caminho === '/' ? null : arquivoReal(raiz, caminho)
  if (!arquivo && /\.[a-z0-9]{2,5}$/i.test(caminho) && !caminho.endsWith('.html')) { res.writeHead(404); res.end('nao'); return }
  const ehHtml = !arquivo
  if (ehHtml) { raiz = estado.raizHtml || estado.raiz; arquivo = join(raiz, 'index.html'); estado.contagem.html += 1 }
  if (caminho === '/versao.json') estado.contagem.versao += 1
  const cab = { 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream' }
  if (ehHtml || caminho === '/versao.json' || caminho === '/caca-sw.js') cab['Cache-Control'] = caminho === '/versao.json' || caminho === '/caca-sw.js' ? 'no-store, max-age=0' : 'public, max-age=0, must-revalidate'
  else if (caminho.startsWith('/assets/')) cab['Cache-Control'] = 'public, max-age=31536000, immutable'
  if (caminho === '/caca-sw.js') cab['Service-Worker-Allowed'] = '/cartoon/caca'
  res.writeHead(200, cab)
  res.end(readFileSync(arquivo))
})
await new Promise((r) => servidor.listen(0, '127.0.0.1', r))
const BASE = `http://127.0.0.1:${servidor.address().port}`

/* ── navegador ──────────────────────────────────────────────────────────── */
const browser = await chromium.launch()
const rodar = async (nome, f) => { console.log(`\n${nome}`); try { await f() } catch (e) { falha(`${nome}: ${e.message.split('\n')[0]}`) } }

async function novoContexto ({ mobile = true } = {}) {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36', hasTouch: true, isMobile: true, serviceWorkers: 'allow' }
    : { viewport: { width: 1280, height: 800 }, serviceWorkers: 'allow' })
  // nada vai ao Supabase nem a terceiros: respostas vazias e honestas
  await ctx.route(/supabase\.co|typekit|googletagmanager|google-analytics|maps\.googleapis|openfreemap|challenges\.cloudflare/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))
  return ctx
}
const idDaPagina = (page) => page.evaluate(() => document.querySelector('meta[name="scw-versao"]')?.getAttribute('content') || null)
// Espera a meta da versão E o evento `load` da página nova: sem isso a contagem de cargas corria contra o `load` (falha esporádica em máquina ocupada).
const esperarVersao = async (page, id, ms = 15000) => {
  await page.waitForFunction((v) => document.querySelector('meta[name="scw-versao"]')?.getAttribute('content') === v, id, { timeout: ms })
  await page.waitForLoadState('load', { timeout: ms })
}
const scriptDeEntrada = (page) => page.evaluate(() => document.querySelector('script[type="module"][src*="/assets/main-"]')?.getAttribute('src') || null)
async function abrir (ctx, caminho = '/cartoon/caca?origem=app') {
  const page = await ctx.newPage()
  page.contarCargas = 0
  page.on('load', () => { page.contarCargas += 1 })
  await page.goto(BASE + caminho)
  await esperarVersao(page, await idDaPagina(page) || ID_A)
  return page
}
/** O app volta do segundo plano: o sistema entrega `visibilitychange` (e, às vezes, `pageshow`). */
async function segundoPlanoEVolta (page, minutosAusente = 5) {
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await page.clock.fastForward(minutosAusente * 60 * 1000)
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
}

/* 1 ─ A aberto, B publicado, volta do segundo plano ───────────────────── */
await rodar('1 · A aberto; B publicado; app volta do segundo plano', async () => {
  estado.raiz = pastaA; estado.raizHtml = null
  const ctx = await novoContexto()
  const page = await ctx.newPage()
  await page.clock.install()
  page.contarCargas = 0
  page.on('load', () => { page.contarCargas += 1 })
  await page.goto(BASE + '/cartoon/caca?origem=app')
  await esperarVersao(page, ID_A)
  confere((await idDaPagina(page)) === ID_A, 'a aba abre na versão A')
  await page.evaluate(() => { localStorage.setItem('scw_teste_mapa', 'dado-do-aparelho'); localStorage.setItem('scw_caca_chave_teste', 'k') })
  estado.raiz = pastaB // deploy enquanto o app está em segundo plano
  const antes = page.contarCargas
  const scriptA = await scriptDeEntrada(page)
  await segundoPlanoEVolta(page)
  await esperarVersao(page, ID_B)
  confere((await idDaPagina(page)) === ID_B, 'ao voltar, o app já está na versão B, sem reinstalar')
  confere(page.contarCargas === antes + 1, `recarregou uma vez só (${page.contarCargas - antes})`)
  const scriptB = await scriptDeEntrada(page)
  confere(!!scriptA && !!scriptB && scriptA !== scriptB, `o código novo está rodando (entrada ${scriptA?.split('/').pop()} → ${scriptB?.split('/').pop()})`)
  const dado = await page.evaluate(() => [localStorage.getItem('scw_teste_mapa'), localStorage.getItem('scw_caca_chave_teste')])
  confere(dado[0] === 'dado-do-aparelho' && dado[1] === 'k', 'o dado guardado no aparelho (mapa, chave) continua intacto')
  confere(!page.url().includes('_v='), 'o endereço não fica com marca de recarga')
  await ctx.close()
})

/* 2 ─ abertura a frio, com service worker ativo ───────────────────────── */
await rodar('2 · abertura a frio (app fechado e aberto de novo, com service worker ativo)', async () => {
  estado.raiz = pastaA; estado.raizHtml = null
  const ctx = await novoContexto()
  let page = await abrir(ctx)
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload(); await esperarVersao(page, ID_A) // agora a página é controlada pelo SW
  confere(await page.evaluate(() => !!navigator.serviceWorker.controller), 'o service worker da Caça controla a página (cenário do app instalado)')
  await page.close()
  estado.raiz = pastaB
  page = await abrir(ctx)
  confere((await idDaPagina(page)) === ID_B, 'o app fechado e aberto depois do deploy já vem na versão B')
  confere(page.contarCargas === 1, 'sem recarga extra')
  await ctx.close()
})

/* 3 ─ formulário em andamento ─────────────────────────────────────────── */
await rodar('3 · formulário em andamento: não recarrega, avisa, preserva o texto; ao terminar, troca', async () => {
  estado.raiz = pastaA; estado.raizHtml = null
  const ctx = await novoContexto()
  const page = await ctx.newPage()
  await page.clock.install()
  page.contarCargas = 0
  page.on('load', () => { page.contarCargas += 1 })
  await page.goto(BASE + '/cartoon/caca?origem=app')
  await esperarVersao(page, ID_A)
  const campo = page.locator('input[type="text"], input:not([type])').first()
  await campo.waitFor({ timeout: 10000 })
  await campo.fill('Apelido digitado')
  estado.raiz = pastaB
  const antes = page.contarCargas
  await segundoPlanoEVolta(page, 3)
  await page.waitForTimeout(600)
  confere((await idDaPagina(page)) === ID_A && page.contarCargas === antes, 'com texto digitado, o app NÃO recarrega')
  confere((await campo.inputValue()) === 'Apelido digitado', 'o texto digitado continua no campo')
  confere(await page.getByText('Há uma versão nova da Caça', { exact: false }).isVisible(), 'avisa que há versão nova e que vai atualizar depois')
  await page.clock.fastForward(30000)
  await page.waitForTimeout(400)
  confere((await idDaPagina(page)) === ID_A, 'continua esperando enquanto o campo está preenchido e com foco')
  await campo.fill('')
  await campo.evaluate((el) => el.blur())
  await page.clock.fastForward(10000) // passa o intervalo em que o app reavalia o momento seguro
  await esperarVersao(page, ID_B)
  confere((await idDaPagina(page)) === ID_B, 'terminado o formulário, a troca acontece')
  await ctx.close()
})

/* 4 ─ sem conexão ─────────────────────────────────────────────────────── */
await rodar('4 · sem conexão: avisa, não promete versão nova; volta a rede → carrega B', async () => {
  estado.raiz = pastaA; estado.raizHtml = null
  const ctx = await novoContexto()
  const page = await ctx.newPage()
  await page.clock.install()
  page.contarCargas = 0
  page.on('load', () => { page.contarCargas += 1 })
  await page.goto(BASE + '/cartoon/caca?origem=app')
  await esperarVersao(page, ID_A)
  await ctx.setOffline(true)
  await segundoPlanoEVolta(page, 1)
  await page.waitForTimeout(500)
  confere(await page.getByText('Sem conexão', { exact: false }).first().isVisible(), 'sem rede: diz "Sem conexão"')
  const textoOffline = await page.locator('.ct-aviso').first().innerText()
  confere(!/nova versão está|já atualizou|atualizado/i.test(textoOffline), 'não afirma versão nova nem "atualizado" estando offline')
  confere((await idDaPagina(page)) === ID_A, 'continua na versão em que estava (nada quebra)')
  estado.raiz = pastaB // o deploy aconteceu enquanto estava sem rede
  await ctx.setOffline(false)
  await esperarVersao(page, ID_B)
  confere((await idDaPagina(page)) === ID_B, 'a rede volta e o app confere e carrega a B')
  await ctx.close()
})

/* 5 ─ HTML velho no edge ──────────────────────────────────────────────── */
await rodar('5 · versão nova ainda não está inteira (HTML velho no edge): não recarrega nem entra em laço', async () => {
  estado.raiz = pastaA; estado.raizHtml = null
  const ctx = await novoContexto()
  const page = await ctx.newPage()
  await page.clock.install()
  page.contarCargas = 0
  page.on('load', () => { page.contarCargas += 1 })
  await page.goto(BASE + '/cartoon/caca?origem=app')
  await esperarVersao(page, ID_A)
  estado.raiz = pastaB; estado.raizHtml = pastaA // /versao.json já diz B, mas o HTML servido ainda é o A
  const antes = page.contarCargas
  await segundoPlanoEVolta(page)
  for (let i = 0; i < 4; i++) { await page.clock.fastForward(9000); await page.waitForTimeout(200) }
  confere((await idDaPagina(page)) === ID_A && page.contarCargas === antes, 'sem a versão inteira no servidor, o app não recarrega (nem em laço)')
  estado.raizHtml = null // o edge alcançou
  await page.clock.fastForward(9000)
  await esperarVersao(page, ID_B)
  confere((await idDaPagina(page)) === ID_B, 'quando o HTML novo chega, troca')
  await ctx.close()
})

/* 6 ─ sem laço depois da troca ────────────────────────────────────────── */
await rodar('6 · depois da troca não há recarga extra', async () => {
  estado.raiz = pastaA; estado.raizHtml = null
  const ctx = await novoContexto()
  const page = await ctx.newPage()
  await page.clock.install()
  page.contarCargas = 0
  page.on('load', () => { page.contarCargas += 1 })
  await page.goto(BASE + '/cartoon/caca?origem=app')
  await esperarVersao(page, ID_A)
  estado.raiz = pastaB
  await segundoPlanoEVolta(page)
  await esperarVersao(page, ID_B)
  const cargas = page.contarCargas
  for (let i = 0; i < 3; i++) { await segundoPlanoEVolta(page, 20); await page.waitForTimeout(300) }
  confere(page.contarCargas === cargas, 'voltar do segundo plano várias vezes na B não recarrega')
  confere(await page.evaluate(() => sessionStorage.getItem('scw_caca_atualizacao') === null), 'o registro da recarga foi limpo (a versão esperada chegou)')
  await ctx.close()
})

/* 7 ─ service worker, painel, push ────────────────────────────────────── */
await rodar('7 · service worker só na Caça, sem cache; painel e arquivos de push intactos', async () => {
  estado.raiz = pastaA; estado.raizHtml = null
  const ctx = await novoContexto()
  const page = await abrir(ctx)
  const reg = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return { escopo: new URL(r.scope).pathname } })
  confere(reg.escopo === '/cartoon/caca', `service worker registrado só em ${reg.escopo}`)
  const caches = await page.evaluate(async () => (await globalThis.caches.keys()).length)
  confere(caches === 0, 'nenhum cache do navegador criado pela Caça')
  const painel = await page.goto(BASE + '/painel/')
  confere(painel.status() === 200, '/painel/ continua abrindo')
  const idPainel = JSON.parse(readFileSync(join(pastaA, 'painel/versao.json'), 'utf8')).id
  await esperarVersao(page, idPainel)
  confere(true, 'o painel carrega com a versão própria dele (a meta do painel, não a do site)')
  const painelVersao = await (await fetch(BASE + '/painel/versao.json')).json()
  confere(painelVersao.app === 'painel-scw', '/painel/versao.json continua sendo do painel')
  const vSite = await (await fetch(BASE + '/versao.json')).json()
  confere(vSite.app === 'site-scw' && !/@|chave|token|senha/i.test(JSON.stringify(vSite)), '/versao.json é do site e não carrega dado de pessoa')
  confere(existsSync(join(pastaA, 'caca-sw.js')) && /addEventListener\('push'/.test(readFileSync(join(pastaA, 'caca-sw.js'), 'utf8')), 'o service worker publicado ainda recebe push')
  await ctx.close()
})

await browser.close()
servidor.close()
if (!process.env.CACA_ATUAL_A) rmSync(tmp, { recursive: true, force: true })
console.log(falhas.length ? `\n✗ ${falhas.length} falha(s):\n - ${falhas.join('\n - ')}` : '\n✓ tudo certo')
process.exit(falhas.length ? 1 : 0)
