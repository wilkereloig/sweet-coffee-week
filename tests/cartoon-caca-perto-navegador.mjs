/*
 * Localização e sugestão da próxima casa no Mapa da Doçura (docs/cartoon-2026-2/16-perto-de-mim-sugestao.md), no navegador.
 * Dados de demonstração (?demo=1: uma casa com ponto, aberta das 14h às 20h), relógio fixo, localização simulada, servidor do Caça
 * simulado na rede. O banco não é tocado e nenhuma notificação real é enviada.
 *   node tests/cartoon-caca-perto-navegador.mjs   (PERTO_REUSAR=1 reaproveita o servidor da 5250)
 * NÃO cobre aparelho real (iPhone/Android): é Chromium com a API de localização simulada.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'

const PORT = 5250
const BASE = `http://localhost:${PORT}`
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const falhas = []
const checar = (cond, msg) => { console.log(`  ${cond ? '✓' : '✗'} ${msg}`); if (!cond) falhas.push(msg) }
const responde = async () => { try { return (await fetch(`${BASE}/cartoon`, { signal: AbortSignal.timeout(30000) })).ok } catch { return false } }

let servidor = null
if (!(await responde())) {
  if (process.env.PERTO_REUSAR === '1') { console.error(`✗ sem servidor na ${PORT}`); process.exit(1) }
  servidor = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  for (let i = 0; i < 120 && !(await responde()); i++) await esperar(350)
}
const matar = () => { if (servidor?.pid) { try { process.platform === 'win32' ? execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' }) : process.kill(-servidor.pid, 'SIGKILL') } catch { /* já morto */ } } }

const CHAVE_MAPA = 'E'.repeat(32)
const SABADO_15H = new Date('2026-11-07T15:00:00-03:00')
const SABADO_21H = new Date('2026-11-07T21:00:00-03:00')
const AQUI = { latitude: -5.7945, longitude: -35.2105 } // a ~55 m da casa de demonstração
const mapaComCasas = (casas) => ({ edicao: '2026.2', apelido: 'E2E', email: 'e2e@exemplo.com.br', whatsapp: null, no_ranking: true, principal: true, total_casas: 1, casas_validadas: casas.filter((c) => c.estado === 'validada').length, extras: 0, faltam: 1, posicao: 1, empatados: 0, casas })
const ESTILO_VAZIO = { version: 8, sources: {}, layers: [{ id: 'fundo', type: 'background', paint: { 'background-color': '#FDF0DE' } }] }
const json = (route, corpo) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corpo) })

/** Abre um contexto novo. permissao: 'prompt' | 'granted' | 'denied' (o que a Permissions API responde); relogio; mapa: lista de casas do servidor ou null; rota: ids "quero ir". */
async function abrir (nav, { viewport = { width: 390, height: 844 }, permissao = 'prompt', relogio = SABADO_15H, mapa = null, rota = [], mobile = true } = {}) {
  const ctx = await nav.newContext({ viewport, isMobile: mobile, hasTouch: mobile, geolocation: AQUI, permissions: permissao === 'denied' ? [] : ['geolocation'] })
  await ctx.addInitScript(([perm, chave, ids, priv]) => {
    try {
      localStorage.setItem('scw_privacidade', priv)
      if (chave) localStorage.setItem('scw:edicao:2026.2:mapa', chave)
      if (ids.length) localStorage.setItem('scw:edicao:2026.2:rota', JSON.stringify({ versao: 2, unidades: ids, visitadas: [], atualizado: Date.now() }))
    } catch { /* sem storage */ }
    window.__geo = 0
    const g = navigator.geolocation
    const original = g.getCurrentPosition.bind(g)
    g.getCurrentPosition = (ok, erro, opcoes) => {
      window.__geo += 1
      if (perm === 'denied') { erro?.({ code: 1, message: 'User denied Geolocation' }); return }
      original(ok, erro, opcoes)
    }
    const consulta = navigator.permissions.query.bind(navigator.permissions)
    navigator.permissions.query = (d) => (d?.name === 'geolocation' ? Promise.resolve({ state: perm, addEventListener () {}, removeEventListener () {} }) : consulta(d))
  }, [permissao, mapa ? CHAVE_MAPA : '', rota, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 })])
  await ctx.route('**/rest/v1/rpc/mapa_ler_v2*', (route) => (route.request().method() === 'OPTIONS' ? route.fallback() : json(route, mapaComCasas(mapa || []))))
  await ctx.route('**/tiles.openfreemap.org/**', (route) => json(route, ESTILO_VAZIO))
  await ctx.route('**/challenges.cloudflare.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  const page = await ctx.newPage()
  page.setDefaultNavigationTimeout(120000)
  await page.clock.install({ time: relogio })
  const erros = []
  const pedidos = []
  page.on('pageerror', (e) => erros.push(String(e)))
  page.on('request', (r) => pedidos.push({ url: r.url(), corpo: r.postData() || '' }))
  return { ctx, page, erros, pedidos }
}
const ir = async (page, vista = 'lista') => {
  await page.goto(`${BASE}/cartoon/mapa?preview=1&demo=1&vista=${vista}`, { waitUntil: 'domcontentloaded' })
  await page.locator('.ct-mapa').first().waitFor()
  await esperar(900)
}
const geoChamadas = (page) => page.evaluate(() => window.__geo)
const sobraLateral = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
const cartao = (page) => page.locator('.ct-perto-sugestao')
const convite = (page) => page.locator('.ct-perto-convite')

const nav = await chromium.launch()
try {
  // ---- 1 · primeira entrada: explica, não pergunta sozinha, pergunta no toque, sugere sem marcar nada
  console.log('\n1 · primeira entrada (permissão por perguntar)')
  {
    const { ctx, page, erros, pedidos } = await abrir(nav)
    await ir(page)
    checar(await convite(page).count() === 1, 'o convite aparece ao entrar no mapa')
    const texto = (await convite(page).innerText()).toLowerCase()
    checar(/localiza/.test(texto) && /perto/.test(texto) && /carimbo/.test(texto), 'o convite explica para que serve (casas e combos perto, carimbo na casa)')
    checar(/s[óo] neste aparelho/.test(texto), 'o convite diz que a posição fica só no aparelho')
    checar(await geoChamadas(page) === 0, 'o navegador NÃO é consultado sozinho (nenhum pedido de posição antes do toque)')
    checar(await cartao(page).count() === 0, 'sem posição, nenhuma sugestão')
    checar(!(await sobraLateral(page)), 'sem rolagem lateral com o convite')
    await page.getByRole('button', { name: 'Usar minha localização' }).click()
    await cartao(page).waitFor()
    checar(await geoChamadas(page) >= 1, 'o toque no botão é que pede a posição')
    const c = cartao(page)
    const t = await c.innerText()
    checar(/Casa Aurora/.test(t), 'a sugestão mostra o nome da casa')
    checar(/Tirol/.test(t), 'a sugestão mostra o bairro')
    checar(/\d+ m em linha reta|km em linha reta/.test(t), 'a sugestão mostra a distância em linha reta')
    checar(/Combo Tra[çc]o Doce|Combo/.test(t), 'a sugestão mostra o nome do combo')
    checar(/Combo dispon[ií]vel agora, at[ée] 20h/i.test(t), 'a casa aberta às 15h diz "disponível agora, até 20h"')
    checar(/n[ãa]o marca visita nem cria carimbo/i.test(t), 'a sugestão diz que não marca visita nem cria carimbo')
    checar(await c.getByRole('link', { name: 'Ver combo' }).count() === 1, 'tem "Ver combo"')
    const como = c.getByRole('link', { name: /Como chegar/ })
    checar(await como.count() === 1 && /google\.com\/maps\/dir/.test((await como.getAttribute('href')) || ''), 'tem "Como chegar" para o Google Maps')
    checar(await convite(page).count() === 0, 'com a posição lida o convite some')
    // nada de coordenada sai do aparelho nem fica guardada
    const digitos = /5\.79|35\.21/
    checar(!pedidos.some((p) => digitos.test(p.url) || digitos.test(p.corpo)), 'nenhuma requisição leva a posição')
    const guardado = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }))
    checar(!digitos.test(guardado), 'nada guardado no aparelho contém a posição')
    checar(!(await sobraLateral(page)), 'sem rolagem lateral com a sugestão')
    checar(erros.length === 0, `sem erro de página${erros.length ? ` — ${erros[0]}` : ''}`)
    await ctx.close()
  }

  // ---- 2 · adiar: não insiste
  console.log('\n2 · "Agora não" no convite')
  {
    const { ctx, page } = await abrir(nav)
    await ir(page)
    await convite(page).getByRole('button', { name: 'Agora não' }).click()
    checar(await convite(page).count() === 0, 'o convite some')
    await ir(page)
    checar(await convite(page).count() === 0, 'ao recarregar o convite NÃO volta (adiado por 7 dias)')
    checar(await geoChamadas(page) === 0, 'em nenhum momento o navegador foi consultado')
    checar(await page.locator('.ct-mapa__lista, .ct-mapa__moldura').first().isVisible(), 'o mapa segue exploravel sem a localização')
    await ctx.close()
  }

  // ---- 3 · negada: segue usando, sem insistir, com o caminho para tentar de novo
  console.log('\n3 · permissão negada')
  {
    const { ctx, page } = await abrir(nav, { permissao: 'denied' })
    await ir(page)
    checar(await geoChamadas(page) === 0, 'nada pede a posição sozinho')
    await page.getByRole('button', { name: 'Perto de mim' }).first().click()
    await page.locator('.ct-mapa__perto-aviso').waitFor()
    const aviso = await page.locator('.ct-mapa__perto-aviso').innerText()
    checar(/libere a localiza/i.test(aviso), 'o aviso explica como liberar nas configurações')
    checar(/tentar de novo/i.test(aviso), 'o aviso oferece tentar de novo')
    checar(await cartao(page).count() === 0, 'sem posição, nenhuma sugestão')
    checar(await page.locator('.ct-mapa__item, .ct-mapa__moldura').first().isVisible(), 'a lista de casas segue disponível para escolher à mão')
    await ctx.close()
  }

  // ---- 4 · permissão já concedida: sugere sem perguntar nada
  console.log('\n4 · permissão já concedida')
  {
    const { ctx, page } = await abrir(nav, { permissao: 'granted' })
    await ir(page)
    await cartao(page).waitFor()
    checar(await convite(page).count() === 0, 'sem convite quando já está liberada')
    checar(await cartao(page).count() === 1, 'a sugestão aparece ao abrir o mapa')
    await ctx.close()
  }

  // ---- 5 · "Agora não" para a casa: some no dia, não repete
  console.log('\n5 · dispensar a casa')
  {
    const { ctx, page } = await abrir(nav, { permissao: 'granted' })
    await ir(page)
    await cartao(page).waitFor()
    await cartao(page).getByRole('button', { name: /Agora não/ }).click()
    checar(await cartao(page).count() === 0, 'a sugestão some')
    await ir(page)
    await esperar(600)
    checar(await cartao(page).count() === 0, 'no mesmo dia ela NÃO volta (sem aviso repetido)')
    await ctx.close()
  }

  // ---- 6 · desligar e religar
  console.log('\n6 · desligar e religar as sugestões')
  {
    const { ctx, page } = await abrir(nav, { permissao: 'granted' })
    await ir(page)
    await cartao(page).waitFor()
    await cartao(page).getByRole('button', { name: /Desligar as sugest/ }).click()
    checar(await cartao(page).count() === 0, 'desligar tira a sugestão')
    await ir(page)
    await esperar(600)
    checar(await cartao(page).count() === 0 && await convite(page).count() === 0, 'recarregando: nem sugestão nem convite')
    checar(await geoChamadas(page) === 0, 'desligado, o mapa não lê a posição sozinho')
    await page.getByRole('button', { name: /^Filtros/ }).click()
    const caixa = page.getByLabel('Sugerir casas perto de mim')
    checar(await caixa.isVisible() && !(await caixa.isChecked()), 'nos Filtros o interruptor aparece desmarcado')
    await caixa.check()
    await cartao(page).waitFor({ timeout: 8000 })
    checar(await cartao(page).count() === 1, 'religar traz a sugestão de volta')
    await ctx.close()
  }

  // ---- 7 · casa já validada e rota preenchida
  console.log('\n7 · casa já validada · rota preenchida')
  {
    const a = await abrir(nav, { permissao: 'granted', mapa: [{ slug: 'demo-casa-aurora', carimbos: 1, avaliou: true, estado: 'validada', extras: 0 }] })
    await ir(a.page)
    await esperar(800)
    checar(await cartao(a.page).count() === 0, 'casa já validada não é sugerida como descoberta')
    await a.ctx.close()
    const b = await abrir(nav, { permissao: 'granted', rota: ['udemo1'] })
    await ir(b.page)
    await esperar(800)
    checar(await cartao(b.page).count() === 0, 'casa que já está na rota não é sugerida de novo')
    const rota = await b.page.evaluate(() => localStorage.getItem('scw:edicao:2026.2:rota'))
    checar(JSON.parse(rota).unidades.join() === 'udemo1', 'a rota da pessoa não foi alterada')
    await b.ctx.close()
  }

  // ---- 8 · horário
  console.log('\n8 · combo encerrado')
  {
    const { ctx, page } = await abrir(nav, { permissao: 'granted', relogio: SABADO_21H })
    await ir(page)
    await esperar(800)
    checar(await cartao(page).count() === 0, 'às 21h (combo encerrado às 20h) a casa não é sugerida como disponível')
    await page.getByRole('button', { name: 'Perto de mim' }).first().click()
    await esperar(800)
    const tudo = await page.locator('.ct-mapa__explorar').innerText()
    checar(/n[ãa]o est[ãa]o com o combo hoje/i.test(tudo), 'a tela explica por que não há sugestão em vez de ficar muda')
    await ctx.close()
  }

  // ---- 9 · vistas, tela cheia e telas pequena e grande
  console.log('\n9 · mapa ilustrado, mapa real, lista, tela cheia · 360 e 1280')
  for (const tela of [{ nome: '360', viewport: { width: 360, height: 740 }, mobile: true }, { nome: '1280', viewport: { width: 1280, height: 900 }, mobile: false }]) {
    for (const vista of ['mundo', 'real', 'lista']) {
      const { ctx, page, erros } = await abrir(nav, { permissao: 'granted', viewport: tela.viewport, mobile: tela.mobile })
      await ir(page, vista)
      await cartao(page).waitFor().catch(() => null)
      checar(await cartao(page).count() === 1, `${tela.nome} · ${vista}: a sugestão aparece`)
      checar(!(await sobraLateral(page)), `${tela.nome} · ${vista}: sem rolagem lateral`)
      const botoes = await cartao(page).locator('a, button').evaluateAll((els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && (r.height < 43.5 || r.width < 43.5) }).map((e) => e.textContent.trim()))
      checar(botoes.length === 0, `${tela.nome} · ${vista}: alvos de toque de pelo menos 44 px${botoes.length ? ` — ${botoes.join(' | ')}` : ''}`)
      if (vista !== 'lista' && await page.locator('[data-abrir-cheia]').count()) {
        await page.locator('[data-abrir-cheia]').click()
        await esperar(500)
        checar(await convite(page).count() === 0, `${tela.nome} · ${vista}: na tela cheia não há convite`)
        await page.keyboard.press('Escape')
      }
      checar(erros.length === 0, `${tela.nome} · ${vista}: sem erro de página${erros.length ? ` — ${erros[0]}` : ''}`)
      await ctx.close()
    }
  }
  {
    const { ctx, page } = await abrir(nav, { permissao: 'prompt', viewport: { width: 1280, height: 900 }, mobile: false })
    await ir(page, 'lista')
    checar(await convite(page).count() === 1, '1280: o convite também aparece no desktop')
    checar(!(await sobraLateral(page)), '1280: sem rolagem lateral com o convite')
    await ctx.close()
  }
} finally {
  await nav.close()
  matar()
}

if (falhas.length) { console.error(`\n✗ ${falhas.length} falha(s)`); process.exit(1) }
console.log('\n✓ localização e sugestão: tudo certo no navegador (simulado; aparelho real não testado)')
