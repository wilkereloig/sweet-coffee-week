/*
 * Carimbo de delivery (visitante), no navegador de verdade contra o BUILD de produção (vite preview): formulário, pedido com código,
 * caminho da imagem (preparo no aparelho, URL assinada, PUT, anexar), falha de envio sem perder a imagem, estados (código vencido, em
 * análise, falta avaliar, validado, não aprovado) e a ficha da casa. O servidor é simulado na rede; o banco NÃO é tocado.
 * Precisa do retrato local (src/edicao/dados/retrato/cartoon.local.json, ignorado pelo git): sem ele o teste avisa e sai.
 *   node tests/cartoon-delivery-navegador.mjs [<pasta do build>]   (sem argumento, roda `vite build` num diretório temporário)
 *   MAPA_E2E_CAPTURAS=<pasta> grava as capturas.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { join } from 'node:path'
import { mkdirSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'

const RAIZ = join(import.meta.dirname, '..')
const RETRATO = join(RAIZ, 'src/edicao/dados/retrato/cartoon.local.json')
if (!existsSync(RETRATO)) { console.log('sem retrato local: teste pulado'); process.exit(0) }
const retrato = JSON.parse(readFileSync(RETRATO, 'utf8'))

const PORT = 4183
const BASE = `http://localhost:${PORT}`
const CAPTURAS = process.env.MAPA_E2E_CAPTURAS || join(tmpdir(), `delivery-${Date.now().toString(36)}`)
mkdirSync(CAPTURAS, { recursive: true })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const falhas = []
const checar = (cond, msg) => { console.log(`  ${cond ? '✓' : '✗'} ${msg}`); if (!cond) falhas.push(msg) }

const modo = (p) => (p.unidades || []).map((u) => u.combo?.modos?.delivery)
const comDelivery = retrato.participantes.find((p) => modo(p).includes('sim') && (p.unidades || []).length === 1)
const semDelivery = retrato.participantes.find((p) => modo(p).length && !modo(p).includes('sim'))
if (!comDelivery || !semDelivery) { console.log('retrato sem casa com e sem delivery: teste pulado'); process.exit(0) }

let dir = process.argv[2]
if (!dir) {
  dir = join(tmpdir(), `scw-dlv-build-${Date.now().toString(36)}`)
  execSync(`npx vite build --outDir "${dir}" --emptyOutDir`, { cwd: RAIZ, stdio: 'ignore' })
}
const servidor = spawn('npx', ['vite', 'preview', '--outDir', dir, '--port', String(PORT), '--strictPort'], { cwd: RAIZ, shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
const matar = () => { if (servidor?.pid) { try { process.platform === 'win32' ? execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' }) : process.kill(-servidor.pid, 'SIGKILL') } catch { /* já morto */ } } }
const responde = async () => { try { return (await fetch(`${BASE}/cartoon`, { signal: AbortSignal.timeout(1500) })).ok } catch { return false } }
for (let i = 0; i < 120 && !(await responde()); i++) await esperar(350)

const CHAVE = 'D'.repeat(32)
const PID = '8d0672dc-5f9a-471d-8495-84794062e723'
const CAMINHO_IMG = `2026.2/${PID}/${PID}.webp`
const MAPA = { edicao: '2026.2', apelido: 'E2E', email: 'e2e@exemplo.com.br', whatsapp: null, no_ranking: true, principal: true, total_casas: 26, casas_validadas: 0, extras: 0, faltam: 26, posicao: 2, empatados: 1,
  casas: [{ slug: comDelivery.slug, carimbos: 0, avaliou: false, estado: 'pendente', extras: 0 }] }
const json = (route, corpo) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corpo) })
const rpc = (nome) => `**/rest/v1/rpc/${nome}*`
const ehOpcoes = (route) => route.request().method() === 'OPTIONS'
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

async function abrir (nav, { w, h, toque = false, mapa = MAPA, pedidos = [], url = `/cartoon/caca/delivery?casa=${comDelivery.slug}&preview=1`, putStatus = 200 }) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque, deviceScaleFactor: toque ? 2 : 1 })
  await ctx.addInitScript(([k, c, comMapa]) => {
    try { localStorage.setItem('scw_privacidade', c); if (comMapa) localStorage.setItem('scw:edicao:2026.2:mapa', k) } catch { /* sem storage */ }
    window.__geo = 0
    try { const g = navigator.geolocation; if (g) { const o = g.getCurrentPosition.bind(g); g.getCurrentPosition = (...a) => { window.__geo++; return o(...a) }; g.watchPosition = (...a) => { window.__geo++; return 0 } } } catch { /* sem geolocation */ }
  }, [CHAVE, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 }), !!mapa])
  const estado = { pedidos: [...pedidos], rpcs: [], edge: [], puts: 0, anexos: [] }
  await ctx.route(rpc('edicao_publica'), (r) => (ehOpcoes(r) ? r.fallback() : json(r, retrato)))
  await ctx.route(rpc('mapa_ler_v2'), (r) => (ehOpcoes(r) ? r.fallback() : json(r, mapa)))
  await ctx.route(rpc('mapa_confirmar_email_status'), (r) => (ehOpcoes(r) ? r.fallback() : json(r, { confirmado: true, valido: true })))
  await ctx.route(rpc('caca_visita_anterior_prazo'), (r) => (ehOpcoes(r) ? r.fallback() : json(r, { aberto: false, ate: '2026-11-07T03:00:00Z' })))
  await ctx.route(rpc('caca_excecao_minhas'), (r) => (ehOpcoes(r) ? r.fallback() : json(r, { ok: true, pedidos: estado.pedidos })))
  await ctx.route(rpc('caca_delivery_pedir'), (r) => {
    if (ehOpcoes(r)) return r.fallback()
    const c = r.request().postDataJSON(); estado.rpcs.push(['pedir', c])
    const novo = { id: PID, slug: c.p_slug, estado: 'pendente', motivo: 'delivery', via: 'casa', pedido_data: c.p_data, pedido_ref: c.p_ref || undefined, codigo: 'ABC123', expira_em: new Date(Date.now() + 23 * 3600e3).toISOString(), expirado: false, tem_imagem: false, codigos_restantes: 2, criado_em: new Date().toISOString() }
    estado.pedidos = [novo, ...estado.pedidos]
    return json(r, { ok: true, id: PID, estado: 'pendente', via: 'casa', codigo: 'ABC123', slug: c.p_slug })
  })
  await ctx.route(rpc('caca_delivery_novo_codigo'), (r) => {
    if (ehOpcoes(r)) return r.fallback()
    estado.rpcs.push(['novo', r.request().postDataJSON()])
    estado.pedidos = estado.pedidos.map((p) => ({ ...p, expirado: false, codigo: 'XYZ234', codigos_restantes: 1 }))
    return json(r, { ok: true, id: PID, codigo: 'XYZ234' })
  })
  await ctx.route(rpc('caca_delivery_anexar'), (r) => {
    if (ehOpcoes(r)) return r.fallback()
    const c = r.request().postDataJSON(); estado.anexos.push(c)
    estado.pedidos = estado.pedidos.map((p) => ({ ...p, via: 'imagem', tem_imagem: true, codigo: undefined, expirado: undefined }))
    return json(r, { ok: true, id: PID, estado: 'pendente', via: 'imagem' })
  })
  await ctx.route('**/functions/v1/caca-delivery', (r) => {
    if (ehOpcoes(r)) return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' } })
    estado.edge.push(r.request().postDataJSON())
    return json(r, { ok: true, url: 'https://mock-storage.invalid/upload?token=t', path: CAMINHO_IMG })
  })
  await ctx.route('https://mock-storage.invalid/**', (r) => {
    if (ehOpcoes(r)) return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'PUT' } })
    estado.puts++
    return r.fulfill({ status: putStatus, headers: { 'access-control-allow-origin': '*' }, body: '{}' })
  })
  await ctx.route('**/challenges.cloudflare.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e.message || e).slice(0, 200)))
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 90000 })
  return { ctx, page, erros, estado }
}
const lateral = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

let nav
try {
  nav = await chromium.launch()
  for (const tela of [{ nome: 'celular', w: 390, h: 844, toque: true }, { nome: 'desktop', w: 1280, h: 900, toque: false }]) {
    console.log(`\n${tela.nome} · formulário e pedido com código`)
    let t = await abrir(nav, { ...tela })
    await t.page.locator('.ct-dlv h2').waitFor({ timeout: 30000 })
    checar((await t.page.locator('h1').count()) === 1, 'um <h1> só na página')
    checar((await t.page.locator('.ct-dlv__form select').first().inputValue()) === comDelivery.slug, 'a casa vem pré-selecionada pelo endereço (?casa=)')
    const opcoes = await t.page.locator('.ct-dlv__form select').first().locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean))
    checar(opcoes.includes(comDelivery.slug) && !opcoes.includes(semDelivery.slug), 'só casas com delivery declarado "sim" aparecem na lista')
    checar(/Não usamos a sua localização/i.test(await t.page.locator('.ct-dlv').innerText()), 'o texto diz que não usa localização')
    checar((await lateral(t.page)) <= 1, 'sem rolagem lateral no formulário')
    await t.page.screenshot({ path: join(CAPTURAS, `${tela.nome}-formulario.png`), fullPage: true })

    await t.page.locator('.ct-dlv__form input[type=text]').fill('REF-77')
    await t.page.getByRole('button', { name: 'Confirmar com a casa' }).click()
    await t.page.locator('.ct-dlv__codigo-valor').waitFor({ timeout: 20000 })
    checar((await t.page.locator('.ct-dlv__codigo-valor').innerText()).trim() === 'ABC-123', 'o código aparece legível (ABC-123)')
    const tx = await t.page.locator('.ct-dlv__pedido').first().innerText()
    checar(/Aguardando a casa/.test(tx) && /Ainda não conta nada/.test(tx), 'estado: aguardando a casa; ainda não conta nada')
    checar(/Nunca envie o link de acesso nem a chave/i.test(tx), 'avisa para nunca mandar o link nem a chave do mapa')
    const c = t.estado.rpcs[0][1]
    checar(!('p_lat' in c) && !('p_lng' in c) && c.p_ref === 'REF-77' && /^\d{4}-\d{2}-\d{2}$/.test(c.p_data), 'o pedido leva referência e data, sem posição')
    checar((await t.page.evaluate(() => window.__geo)) === 0, 'o navegador nunca pediu a localização')
    checar((await lateral(t.page)) <= 1, 'sem rolagem lateral com o código')
    await t.page.screenshot({ path: join(CAPTURAS, `${tela.nome}-codigo.png`), fullPage: true })

    console.log(`\n${tela.nome} · imagem: falha de envio mantém a imagem; segunda tentativa anexa`)
    await t.page.getByRole('button', { name: 'Enviar imagem para análise' }).last().click()
    await t.page.locator('.ct-dlv__imagem').waitFor({ timeout: 10000 })
    checar(/endereço de entrega/i.test(await t.page.locator('.ct-dlv__imagem').innerText()), 'orienta a esconder endereço, telefone e pagamento')
    await t.ctx.close()

    // falha no PUT
    t = await abrir(nav, { ...tela, putStatus: 500 })
    await t.page.locator('.ct-dlv h2').waitFor({ timeout: 30000 })
    await t.page.getByRole('button', { name: 'Confirmar com a casa' }).click()
    await t.page.locator('.ct-dlv__codigo-valor').waitFor({ timeout: 20000 })
    await t.page.getByRole('button', { name: 'Enviar imagem para análise' }).last().click()
    await t.page.locator('.ct-dlv__imagem input[type=file]').first().setInputFiles({ name: 'print.png', mimeType: 'image/png', buffer: PNG })
    await t.page.locator('.ct-dlv__previa').waitFor({ timeout: 15000 })
    await t.page.getByRole('button', { name: 'Enviar imagem', exact: true }).click()
    await t.page.locator('.ct-dlv__imagem [role=alert]').waitFor({ timeout: 15000 })
    checar(/envio da imagem falhou/i.test(await t.page.locator('.ct-dlv__imagem [role=alert]').innerText()), 'PUT que falha: mensagem clara')
    checar((await t.page.locator('.ct-dlv__previa').count()) === 1 && (await t.page.getByRole('button', { name: 'Tentar enviar de novo' }).count()) === 1, 'a imagem preparada continua e há "Tentar enviar de novo"')
    checar(t.estado.anexos.length === 0, 'upload que falhou nunca anexa ao pedido')
    await t.page.screenshot({ path: join(CAPTURAS, `${tela.nome}-falha-envio.png`), fullPage: true })
    await t.ctx.close()

    // sucesso
    t = await abrir(nav, { ...tela })
    await t.page.locator('.ct-dlv h2').waitFor({ timeout: 30000 })
    await t.page.getByRole('button', { name: 'Enviar imagem para análise' }).first().click() // do formulário: cria o pedido e abre o envio
    await t.page.locator('.ct-dlv__imagem input[type=file]').first().waitFor({ state: 'attached', timeout: 20000 })
    await t.page.locator('.ct-dlv__imagem input[type=file]').first().setInputFiles({ name: 'print.png', mimeType: 'image/png', buffer: PNG })
    await t.page.locator('.ct-dlv__previa').waitFor({ timeout: 15000 })
    await t.page.getByRole('button', { name: 'Enviar imagem', exact: true }).click()
    await t.page.locator('.ct-dlv__estado.is-analise').waitFor({ timeout: 20000 })
    checar(t.estado.edge.length === 1 && t.estado.edge[0].acao === 'subir' && ['webp', 'jpg'].includes(t.estado.edge[0].ext), 'pediu a URL assinada com a extensão do arquivo preparado')
    checar(t.estado.puts === 1 && t.estado.anexos.length === 1 && t.estado.anexos[0].p_path === CAMINHO_IMG, 'PUT direto no armazenamento e só então anexar o caminho reservado')
    checar(/Em análise/.test(await t.page.locator('.ct-dlv__pedido').first().innerText()), 'estado: em análise')
    checar((await t.page.locator('.ct-dlv__codigo-valor').count()) === 0, 'depois da imagem o código some da tela')
    await t.page.screenshot({ path: join(CAPTURAS, `${tela.nome}-em-analise.png`), fullPage: true })
    checar(t.erros.length === 0, `sem erro de JavaScript (${t.erros.join(' | ')})`)
    await t.ctx.close()
  }

  console.log('\nestados dos pedidos já existentes')
  const base = { id: PID, slug: comDelivery.slug, motivo: 'delivery', pedido_data: '2026-11-05', criado_em: '2026-11-05T20:00:00Z' }
  const casos = [
    ['expirado', { ...base, estado: 'pendente', via: 'casa', expirado: true, codigos_restantes: 2 }, /Código vencido/, 'Gerar novo código'],
    ['aprovado-avaliar', { ...base, estado: 'aprovado' }, /Carimbo registrado — falta avaliar/, 'Avaliar o combo'],
    ['aprovado-valido', { ...base, estado: 'aprovado' }, /Carimbo validado/, null],
    ['negado', { ...base, estado: 'negado' }, /Não aprovado/, null],
  ]
  for (const [nome, pedido, rotulo, botao] of casos) {
    const mapa = nome === 'aprovado-valido' ? { ...MAPA, casas_validadas: 1, casas: [{ slug: comDelivery.slug, carimbos: 1, avaliou: true, estado: 'validada', extras: 0 }] } : MAPA
    const t = await abrir(nav, { w: 390, h: 844, toque: true, pedidos: [pedido], mapa })
    await t.page.locator('.ct-dlv__pedido').first().waitFor({ timeout: 30000 })
    const tx = await t.page.locator('.ct-dlv__pedido').first().innerText()
    checar(rotulo.test(tx), `${nome}: rótulo certo`)
    checar(!/conquist|ganh/i.test(tx), `${nome}: nunca diz "conquistada"`)
    if (botao) checar((await t.page.getByRole('button', { name: botao }).count()) === 1, `${nome}: botão "${botao}"`)
    if (nome === 'expirado') {
      await t.page.getByRole('button', { name: 'Gerar novo código' }).click()
      await t.page.locator('.ct-dlv__codigo-valor').waitFor({ timeout: 15000 })
      checar((await t.page.locator('.ct-dlv__codigo-valor').innerText()).trim() === 'XYZ-234', 'expirado: o novo código aparece')
    }
    await t.page.screenshot({ path: join(CAPTURAS, `estado-${nome}.png`), fullPage: true })
    await t.ctx.close()
  }

  console.log('\nsem mapa')
  {
    const t = await abrir(nav, { w: 390, h: 844, toque: true, mapa: null })
    await t.page.waitForSelector('h1', { timeout: 30000 })
    checar((await t.page.locator('.ct-dlv__form').count()) === 0, 'sem mapa não há formulário: só o convite para criar o mapa')
    checar(/Crie seu mapa para pedir o carimbo de um delivery/i.test(await t.page.locator('main').innerText()), 'sem mapa: o convite diz o motivo')
    await t.ctx.close()
  }

  console.log('\nficha da casa')
  for (const [p, deve] of [[comDelivery, true], [semDelivery, false]]) {
    const t = await abrir(nav, { w: 390, h: 844, toque: true, url: `/cartoon/participantes/${p.slug}?preview=1` })
    await t.page.waitForSelector('h1', { timeout: 30000 })
    const n = await t.page.getByRole('link', { name: 'Pedi por delivery' }).count()
    checar(deve ? n === 1 : n === 0, `${p.slug}: ${deve ? 'tem' : 'não tem'} o botão "Pedi por delivery"`)
    if (deve && n === 1) {
      const href = await t.page.getByRole('link', { name: 'Pedi por delivery' }).getAttribute('href')
      checar(href === `/cartoon/caca/delivery?casa=${encodeURIComponent(p.slug)}`, 'o botão leva à tela com a casa escolhida')
      await t.page.getByRole('link', { name: 'Pedi por delivery' }).scrollIntoViewIfNeeded()
      await t.page.screenshot({ path: join(CAPTURAS, 'ficha-botao.png') })
    }
    await t.ctx.close()
  }
} finally {
  await nav?.close()
  matar()
}
console.log(`\ncapturas em ${CAPTURAS}`)
if (falhas.length) { console.error(`\n✗ ${falhas.length} falha(s)`); process.exit(1) }
console.log('\n✓ delivery (visitante) ok')
