/*
 * Pedido de carimbo de visita anterior (central da Caça), no navegador de verdade: sem mapa, com mapa, formulário (casa, endereço,
 * data, observação), envio, recusa do servidor, prazo encerrado com pedidos já enviados e o estado de cada um. O servidor da Caça é
 * simulado na rede; o banco não é tocado. Precisa do vite dev na 5212.
 *   MAPA_E2E_REUSAR=1 reaproveita o servidor · MAPA_E2E_CAPTURAS=<pasta> grava as capturas.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'

const PORT = 5212
const BASE = `http://localhost:${PORT}`
const CAPTURAS = process.env.MAPA_E2E_CAPTURAS || join(tmpdir(), `visita-anterior-${Date.now().toString(36)}`)
mkdirSync(CAPTURAS, { recursive: true })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const falhas = []
const checar = (cond, msg) => { console.log(`  ${cond ? '✓' : '✗'} ${msg}`); if (!cond) falhas.push(msg) }
const responde = async () => { try { return (await fetch(`${BASE}/cartoon`, { signal: AbortSignal.timeout(1500) })).ok } catch { return false } }

let servidor = null
if (!(await responde())) {
  if (process.env.MAPA_E2E_REUSAR === '1') { console.error('✗ sem servidor na 5212'); process.exit(1) }
  servidor = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  for (let i = 0; i < 120 && !(await responde()); i++) await esperar(350)
}
const matar = () => { if (servidor?.pid) { try { process.platform === 'win32' ? execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' }) : process.kill(-servidor.pid, 'SIGKILL') } catch { /* já morto */ } } }

const CHAVE = 'V'.repeat(32)
const PRAZO_ABERTO = { aberto: true, ate: '2026-11-07T03:00:00Z', fuso: 'America/Fortaleza', agora: '2026-11-05T22:00:00Z' }
const PRAZO_FECHADO = { aberto: false, ate: '2026-11-07T03:00:00Z', fuso: 'America/Fortaleza', agora: '2026-11-06T03:00:01Z' }
const MAPA = {
  edicao: '2026.2', apelido: 'E2E', email: 'e2e@exemplo.com.br', whatsapp: null, no_ranking: true, principal: true, total_casas: 26, casas_validadas: 1, extras: 0, faltam: 25, posicao: 2, empatados: 1,
  casas: [{ slug: 'carcara', carimbos: 1, avaliou: true, estado: 'validada', extras: 0 }],
}
const json = (route, corpo) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corpo) })
const rpc = (nome) => `**/rest/v1/rpc/${nome}*`
const ehOpcoes = (route) => route.request().method() === 'OPTIONS'

async function abrir (nav, { w, h, toque = false, meuMapa = null, prazo = PRAZO_ABERTO, pedidos = [], pedir = { ok: true, id: 'x', estado: 'pendente', slug: 'x' } }) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque, deviceScaleFactor: toque ? 2 : 1 })
  await ctx.addInitScript(([k, c, comMapa]) => {
    try { localStorage.setItem('scw_privacidade', c); if (comMapa) localStorage.setItem('scw:edicao:2026.2:mapa', k) } catch { /* sem storage */ }
  }, [CHAVE, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 }), !!meuMapa])
  const enviados = []
  await ctx.route(rpc('mapa_ler_v2'), (r) => (ehOpcoes(r) ? r.fallback() : json(r, meuMapa)))
  await ctx.route(rpc('mapa_confirmar_email_status'), (r) => (ehOpcoes(r) ? r.fallback() : json(r, { confirmado: true, valido: true })))
  await ctx.route(rpc('caca_visita_anterior_prazo'), (r) => (ehOpcoes(r) ? r.fallback() : json(r, prazo)))
  await ctx.route(rpc('caca_excecao_minhas'), (r) => (ehOpcoes(r) ? r.fallback() : json(r, { ok: true, pedidos })))
  await ctx.route(rpc('caca_visita_anterior_pedir'), (r) => { if (ehOpcoes(r)) return r.fallback(); enviados.push(r.request().postDataJSON()); return json(r, pedir) })
  await ctx.route('**/challenges.cloudflare.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e.message || e).slice(0, 200)))
  await page.goto(`${BASE}/cartoon/caca?preview=1`, { waitUntil: 'networkidle', timeout: 120000 })
  return { ctx, page, erros, enviados }
}
const lateral = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const escolherCasaEEndereco = async (page, preferirVarias) => {
  const slugs = await page.evaluate(() => [...document.querySelectorAll('.ct-visita select option')].map((o) => o.value).filter(Boolean))
  for (const slug of slugs) {
    await page.locator('.ct-visita select').first().selectOption(slug)
    const varias = (await page.locator('.ct-visita select').count()) > 1
    if (varias === preferirVarias) return varias
  }
  return false
}

let nav
try {
  nav = await chromium.launch()
  for (const tela of [{ nome: 'celular', w: 390, h: 844, toque: true }, { nome: 'desktop', w: 1280, h: 900, toque: false }]) {
    console.log(`\n${tela.nome} · sem mapa`)
    let t = await abrir(nav, { ...tela })
    await t.page.locator('.ct-visita').first().waitFor({ timeout: 20000 })
    let tx = await t.page.locator('.ct-visita').innerText()
    checar(/6 de novembro de 2026, 23h59:59/.test(tx), 'sem mapa: o convite diz o prazo (data e hora) vindo do servidor')
    checar(/horário de Natal/.test(tx), 'sem mapa: diz o fuso')
    checar((await t.page.locator('.ct-visita button').count()) === 0, 'sem mapa: não há formulário para enviar')
    checar((await lateral(t.page)) <= 1, 'sem mapa: sem rolagem lateral')
    await t.page.screenshot({ path: join(CAPTURAS, `${tela.nome}-sem-mapa.png`), fullPage: true })
    await t.ctx.close()

    console.log(`\n${tela.nome} · com mapa, prazo aberto`)
    t = await abrir(nav, { ...tela, meuMapa: MAPA })
    await t.page.locator('.ct-visita h2').waitFor({ timeout: 20000 })
    tx = await t.page.locator('.ct-visita').innerText()
    checar(/Visitei uma casa antes de conhecer a Caça/i.test(tx), 'com mapa: o cartão aparece')
    checar(/Pedidos aceitos só até 6 de novembro de 2026, 23h59:59/i.test(tx), 'com mapa: o prazo está à vista')
    checar(/não é aprova/i.test(tx) && /nada é contado/i.test(tx), 'com mapa: diz que enviar não é aprovação')
    await t.page.getByRole('button', { name: /Pedir carimbo de visita anterior/i }).click()
    const opcoes = await t.page.locator('.ct-visita select').first().locator('option').allInnerTexts()
    checar(opcoes.length > 5, `formulário: lista as casas (${opcoes.length - 1})`)
    checar(!opcoes.some((o) => /^carcar[aá]$/i.test(o.trim())), 'formulário: a casa que a pessoa já tem carimbada não aparece')
    await t.page.getByRole('button', { name: /Enviar pedido/i }).click()
    checar((await t.page.locator('.ct-visita [role=alert]').count()) === 1, 'formulário: enviar sem casa mostra aviso')
    checar(t.enviados.length === 0, 'formulário: nada saiu do aparelho sem casa')
    const achouVarias = await escolherCasaEEndereco(t.page, true)
    checar(achouVarias, 'formulário: casa com mais de um endereço pede o endereço')
    if (achouVarias) {
      await t.page.getByRole('button', { name: /Enviar pedido/i }).click()
      checar(/mais de um endereço/i.test(await t.page.locator('.ct-visita [role=alert]').innerText()), 'formulário: sem endereço não envia')
      await t.page.locator('.ct-visita select').nth(1).selectOption({ index: 1 })
    }
    await t.page.locator('.ct-visita textarea').fill('Fui cedo')
    await t.page.screenshot({ path: join(CAPTURAS, `${tela.nome}-formulario.png`), fullPage: true })
    await t.page.getByRole('button', { name: /Enviar pedido/i }).click()
    await t.page.locator('.ct-visita__ok').waitFor({ timeout: 10000 })
    checar(t.enviados.length === 1 && t.enviados[0].p_nota === 'Fui cedo' && /^\d{4}-\d{2}-\d{2}$/.test(t.enviados[0].p_data), 'envio: manda casa, data e nota ao servidor')
    const ok = await t.page.locator('.ct-visita__ok').innerText()
    checar(/em análise/i.test(ok) && /Nada foi carimbado/i.test(ok), 'envio: diz "em análise" e que nada foi carimbado')
    checar(!/conquist|ganhou/i.test(await t.page.locator('.ct-visita').innerText()), 'envio: nunca diz conquistado')
    await t.page.screenshot({ path: join(CAPTURAS, `${tela.nome}-enviado.png`), fullPage: true })
    checar((await lateral(t.page)) <= 1, 'com mapa: sem rolagem lateral')
    checar(t.erros.length === 0, `sem erro de script ${t.erros.join(' | ')}`)
    await t.ctx.close()

    console.log(`\n${tela.nome} · mais de uma casa, com horário`)
    t = await abrir(nav, { ...tela, meuMapa: MAPA })
    await t.page.getByRole('button', { name: /Pedir carimbo de visita anterior/i }).click()
    const slugs2 = await t.page.evaluate(() => [...document.querySelectorAll('.ct-visita select option')].map((o) => o.value).filter(Boolean))
    const unicas = []
    for (const sl of slugs2) { await t.page.locator('.ct-visita fieldset').first().locator('select').first().selectOption(sl); if ((await t.page.locator('.ct-visita fieldset').first().locator('select').count()) === 1) { unicas.push(sl); break } }
    checar(unicas.length === 1, 'várias: acha uma casa de um endereço só para o primeiro pedido')
    await t.page.locator('.ct-visita fieldset').first().locator('input[type=time]').fill('14:30')
    await t.page.getByRole('button', { name: /Adicionar outra casa/i }).click()
    checar((await t.page.locator('.ct-visita fieldset').count()) === 2, 'várias: "Adicionar outra casa" cria um segundo bloco')
    const opcoes2 = await t.page.locator('.ct-visita fieldset').nth(1).locator('select').first().locator('option').evaluateAll((os) => os.map((o) => o.value))
    checar(!opcoes2.includes(unicas[0]), 'várias: a casa já escolhida não se repete no segundo bloco')
    let outra = null
    for (const sl of opcoes2.filter(Boolean)) { await t.page.locator('.ct-visita fieldset').nth(1).locator('select').first().selectOption(sl); if ((await t.page.locator('.ct-visita fieldset').nth(1).locator('select').count()) === 1) { outra = sl; break } }
    checar(!!outra, 'várias: escolhe a segunda casa')
    await t.page.getByRole('button', { name: /Enviar 2 pedidos/i }).click()
    await t.page.locator('.ct-visita__ok').waitFor({ timeout: 10000 })
    checar(t.enviados.length === 2, 'várias: manda um pedido por casa')
    checar(/^Horário aproximado: 14:30\./.test(t.enviados[0].p_nota || ''), 'várias: o horário aproximado vai na observação')
    checar(/os seus pedidos/i.test(await t.page.locator('.ct-visita__ok').innerText()), 'várias: o aviso fala dos pedidos, no plural')
    await t.page.screenshot({ path: join(CAPTURAS, `${tela.nome}-varias.png`), fullPage: true })
    await t.ctx.close()

    console.log(`\n${tela.nome} · recusa do servidor`)
    t = await abrir(nav, { ...tela, meuMapa: MAPA, pedir: { ok: false, motivo: 'prazo_encerrado' } })
    await t.page.getByRole('button', { name: /Pedir carimbo de visita anterior/i }).click()
    await escolherCasaEEndereco(t.page, false)
    if ((await t.page.locator('.ct-visita select').count()) > 1) await t.page.locator('.ct-visita select').nth(1).selectOption({ index: 1 })
    await t.page.getByRole('button', { name: /Enviar pedido/i }).click()
    await t.page.locator('.ct-visita [role=alert]').waitFor()
    checar(/prazo para novos pedidos terminou/i.test(await t.page.locator('.ct-visita [role=alert]').innerText()), 'recusa: prazo_encerrado vira texto claro')
    await t.ctx.close()

    console.log(`\n${tela.nome} · prazo encerrado, pedidos já enviados`)
    const pedidos = [
      { slug: 'carcara', estado: 'pendente', motivo: 'visita_anterior', visita_data: '2026-11-05', criado_em: '2026-11-05T15:00:00Z' },
      { slug: 'cookitos', estado: 'aprovado', motivo: 'visita_anterior', visita_data: '2026-11-05', criado_em: '2026-11-05T14:00:00Z' },
      { slug: 'mangai', estado: 'negado', motivo: 'visita_anterior', visita_data: '2026-11-05', criado_em: '2026-11-05T13:00:00Z' },
      { slug: 'jolie-cafe-patisserie', estado: 'pendente', motivo: 'longe', criado_em: '2026-11-05T12:00:00Z' },
    ]
    const mapa2 = { ...MAPA, casas: [{ slug: 'cookitos', carimbos: 1, avaliou: false, estado: 'pendente', extras: 0 }] }
    t = await abrir(nav, { ...tela, meuMapa: mapa2, prazo: PRAZO_FECHADO, pedidos })
    await t.page.locator('.ct-visita__pedido').first().waitFor()
    tx = await t.page.locator('.ct-visita').innerText()
    checar(/prazo para novos pedidos terminou/i.test(tx), 'encerrado: diz que o prazo terminou')
    checar((await t.page.getByRole('button', { name: /Pedir carimbo/i }).count()) === 0, 'encerrado: não há botão para pedir')
    checar((await t.page.locator('.ct-visita__pedido').count()) === 3, 'encerrado: os 3 pedidos de visita seguem consultáveis (o de GPS fica de fora)')
    checar(/Em análise/i.test(tx) && /Ainda não conta nada/i.test(tx), 'encerrado: em análise não conta nada')
    checar(/Aprovado · falta avaliar/i.test(tx) && /avaliar o combo/i.test(tx), 'encerrado: aprovado sem avaliação pede a avaliação')
    checar((await t.page.locator('.ct-visita').getByRole('button', { name: /Avaliar o combo/i }).count()) === 1, 'encerrado: há a ação de avaliar')
    checar(/Não aprovado/i.test(tx) && /Falar com a organização/i.test(tx), 'encerrado: negado respeitoso com o canal de contato')
    await t.page.screenshot({ path: join(CAPTURAS, `${tela.nome}-encerrado.png`), fullPage: true })
    await t.ctx.close()

    console.log(`\n${tela.nome} · prazo encerrado e nenhum pedido`)
    t = await abrir(nav, { ...tela, meuMapa: MAPA, prazo: PRAZO_FECHADO })
    await esperar(1500)
    checar((await t.page.locator('.ct-visita').count()) === 0, 'encerrado sem pedidos: o cartão some')
    await t.ctx.close()
  }
  console.log(`\ncapturas em ${CAPTURAS}`)
} finally {
  if (nav) await nav.close()
  matar()
}
if (falhas.length) { console.error(`\n✗ ${falhas.length} falha(s)`); process.exit(1) }
console.log('\n✓ pedido de visita anterior ok')
