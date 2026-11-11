/**
 * cartoon-elenco-navegador.mjs — "Nosso elenco" da Entrada (casas abertas agora) e a logo nos cartões do catálogo.
 *
 *   npm run build && npm run test:cartoon-elenco        (CARTOON_BUILD_DIR=<pasta> usa um build fora do projeto)
 *
 * A projeção pública é INTERCEPTADA (como em cartoon-navegador.mjs) e o relógio do navegador é controlado (page.clock).
 * Reprova:
 *  1. ABERTA, FECHADA e SEM HORÁRIO — durante o festival só aparecem casas com o combo disponível agora (etiqueta "Aberta agora, até Xh");
 *     as que abrem ainda hoje vêm depois, com a hora; fechada e sem horário nunca aparecem como abertas.
 *  2. VÁRIAS UNIDADES — casa com uma unidade aberta e outra fechada aparece uma vez, como aberta.
 *  3. RELÓGIO AO VIVO — com a página aberta, o horário que passa muda a vitrine sem recarregar.
 *  4. NINGUÉM ABERTO e SEM HORÁRIO — aviso claro e os botões das listas completas continuam lá.
 *  5. FORA DO FESTIVAL — antes e depois: o elenco do dia, sem "agora" nem etiqueta.
 *  6. CATÁLOGO — logo oficial sobre a foto (Casas e Combos); sem logo = sem selo; logo que falha não deixa imagem quebrada;
 *     sem foto = a logo do quadro, sem selo duplicado; nome e tema preservados.
 *  7. LAYOUT — 390 e 1440: sem rolagem lateral, selo dentro do cartão, sem cobrir o nome. Capturas em tests/capturas-elenco/.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { DEMO_EDICAO } from '../src/edicao/dados/demo/cartoon.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.CARTOON_ELENCO_PORTA) || 5250
const BASE = `http://localhost:${PORT}`
const SAIDA = join(__dirname, 'capturas-elenco')
mkdirSync(SAIDA, { recursive: true })
const falhas = []
const falha = (m) => { falhas.push(m); console.log(`  ✗ ${m}`) }
const ok = (m) => console.log(`  ✓ ${m}`)
const clone = (o) => JSON.parse(JSON.stringify(o))
const igual = (a, b, m) => (JSON.stringify(a) === JSON.stringify(b) ? ok(m) : falha(`${m} — veio ${JSON.stringify(a)}, esperava ${JSON.stringify(b)}`))
const NATAL = (dia, h, m = 0) => new Date(Date.UTC(2026, 10, dia, h + 3, m)) // horário de Natal = UTC−3

function killTree (pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    else process.kill(-pid, 'SIGKILL')
  } catch { /* já morto */ }
}
async function waitForServer (url, ms = 30000) {
  const t = Date.now()
  while (Date.now() - t < ms) {
    try { if ((await fetch(url)).ok) return } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 350))
  }
  throw new Error('preview não respondeu')
}
try { await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1500) }); console.error(`✗ porta ${PORT} ocupada`); process.exit(1) } catch { /* livre */ }

// Quatro casas: Aurora (2 unidades, 14–20h e 16–22h), Bico (9–12h), Quadro (sem horário) e Lua (só abre às 18h) — todas com logo e foto.
const FOTO = { path: '/images/combos/adocee-doceria/main.jpg', largura: 1200, altura: 900, alt: '' }
const LOGO = (slug) => ({ path: `/logos/participants/${slug}.png` })
function edicao ({ aurora = [['14:00', '20:00'], ['16:00', '22:00']], bico = [['09:00', '12:00']], lua = [['18:00', '23:00']], semHorario = false, semLogo = [], semFoto = [], logoQuebrada = [] } = {}) {
  const d = clone(DEMO_EDICAO)
  const dias = d.participantes[0].unidades[0].combo.disponibilidade.map((x) => x.data)
  const faixas = (fx) => (semHorario ? [] : dias.flatMap((data) => fx.map(([abre, fecha]) => ({ data, abre, fecha }))))
  const [a, b, q] = d.participantes
  a.unidades[0].combo.disponibilidade = faixas([aurora[0]])
  a.unidades[1].combo.disponibilidade = faixas([aurora[1]])
  b.unidades[0].combo.disponibilidade = faixas(bico)
  q.unidades[0].combo = null
  const lua4 = {
    slug: 'demo-casa-lua', nivel: 'marca_e_combo', casa: { nome: '[DEMO] Casa Lua', tema: 'Noites de Natal' },
    unidades: [{ id: 'udemo5', nome: '[DEMO] Unidade Lua', endereco: { logradouro: '[DEMO] Rua L', bairro: 'Ponta Negra', cidade: 'Natal', uf: 'RN' }, combo: { modos: { local: 'sim' }, disponibilidade: faixas(lua) } }],
    combo: { nome: '[DEMO] Combo Lua', itens: [] },
  }
  d.participantes.push(lua4)
  const logos = { 'demo-casa-aurora': 'adocee-doceria', 'demo-casa-bico-de-pena': 'bolomania', 'demo-casa-quadro-a-quadro': 'caffe-basilicos', 'demo-casa-lua': 'canutos' }
  for (const p of d.participantes) {
    if (!semLogo.includes(p.slug)) p.casa.logo = logoQuebrada.includes(p.slug) ? { path: '/logos/participants/nao-existe.png' } : LOGO(logos[p.slug])
    if (p.combo && !semFoto.includes(p.slug)) p.combo.fotos = { principal: FOTO }
  }
  return d
}

async function contexto (nav, dados, { w = 1440, h = 900, agora = NATAL(9, 15) } = {}) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h } })
  await ctx.route('**/rest/v1/rpc/**', async (route) => {
    const fn = route.request().url().split('/rpc/')[1].split('?')[0]
    const json = (d) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) })
    if (fn === 'edicao_publica') return json(dados)
    if (fn === 'criterios_avaliacao') return json([])
    if (fn === 'resultados_publicos') return json(null)
    return route.fulfill({ status: 404, body: '{}' })
  })
  await ctx.route('**/challenges.cloudflare.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  await ctx.route('**/tiles.openfreemap.org/**', (route) => route.abort('failed'))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|openfreemap|maplibre|404/.test(m.text())) erros.push(m.text()) })
  await page.clock.install({ time: agora })
  return { ctx, page, erros }
}
const abrir = async (page, caminho = '/cartoon') => {
  await page.goto(`${BASE}${caminho}`, { waitUntil: 'networkidle' })
}
// Vitrine de venda (11/11/2026): TODOS os combos no cartão de compra; abertas primeiro, depois as que abrem hoje, depois o resto.
const vitrine = async (page) => page.locator('.ct-entrada__vitrine .ct-cartao__link').evaluateAll((els) => els.map((e) => ({
  casa: (e.querySelector('.ct-cartao__sub') || e.querySelector('.ct-cartao__nome'))?.textContent.trim(),
  etiqueta: e.querySelector('.ct-cartao__momento')?.textContent.trim() || null,
  tipo: e.querySelector('.ct-cartao__momento')?.className.match(/--(aberta|abre)/)?.[1] || null,
})))
const aviso = async (page) => (await page.locator('.ct-elenco-momento').count() ? (await page.locator('.ct-elenco-momento').textContent()).replace(/\s+/g, ' ').trim() : null)
const botoesDaLista = async (page) => page.locator('.ct-entrada__elenco .ct-acoes a').evaluateAll((els) => els.map((e) => e.getAttribute('href')))

const preview = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort', ...(process.env.CARTOON_BUILD_DIR ? ['--outDir', process.env.CARTOON_BUILD_DIR] : [])], {
  cwd: join(__dirname, '..'), shell: true, stdio: ['ignore', 'pipe', 'pipe'],
})
let nav
try {
  await waitForServer(BASE)
  nav = await chromium.launch()

  console.log('\n1 · aberta, fechada, abre depois, sem horário (09/11 às 15h, durante o festival)')
  {
    const { ctx, page, erros } = await contexto(nav, edicao())
    await abrir(page)
    const v = await vitrine(page)
    igual(v.filter((x) => x.tipo === 'aberta').map((x) => x.casa).sort(), ['[DEMO] Casa Aurora'], 'só a Aurora está aberta às 15h (Bico fechou às 12h)')
    igual(v.find((x) => x.casa === '[DEMO] Casa Aurora')?.etiqueta, 'Aberta agora, até 20h', 'a etiqueta traz a hora em que fecha a unidade que está aberta (a outra só abre às 16h)')
    igual(v.filter((x) => x.tipo === 'abre').map((x) => [x.casa, x.etiqueta]), [['[DEMO] Casa Lua', 'Abre às 18h']], 'quem abre ainda hoje vem depois, com a hora')
    // Venda (11/11): a casa fechada e a sem horário continuam à venda (delivery, outro dia), DEPOIS das abertas e sem etiqueta.
    const resto = v.filter((x) => !x.tipo)
    igual(v.map((x) => x.tipo || '-').join(','), 'aberta,abre,-,-', 'abertas primeiro, depois quem abre hoje, depois o resto')
    igual(resto.map((x) => x.casa).sort(), ['[DEMO] Casa Bico de Pena', '[DEMO] Casa Quadro a Quadro'], 'casa fechada e casa sem horário vêm depois, sem etiqueta')
    // Auditoria (11/11): com casa aberta, o chip "Abertas agora (N)" já conta — a faixa só aparece quando ninguém está aberto.
    igual(await aviso(page), null, 'com casa aberta, sem faixa repetindo o chip')
    igual(await page.locator('.ct-entrada__filtros .ct-chip:has-text("Abertas agora (1)")').count(), 1, 'o chip conta as abertas')
    igual((await botoesDaLista(page)).some((h) => h.endsWith('/combos')), true, 'o botão do catálogo com busca continua')
    if (erros.length) falha(`console: ${erros.join(' | ')}`); else ok('console limpo')
    await ctx.close()
  }

  console.log('\n2 · várias unidades: só uma aberta')
  {
    const { ctx, page } = await contexto(nav, edicao({ aurora: [['14:00', '16:00'], ['23:00', '23:30']] }), { agora: NATAL(9, 15) })
    await abrir(page)
    const v = await vitrine(page)
    igual(v.filter((x) => x.casa === '[DEMO] Casa Aurora').map((x) => x.etiqueta), ['Aberta agora, até 16h'], 'a casa aparece UMA vez, aberta pela unidade que atende')
    await ctx.close()
  }

  console.log('\n3 · o horário muda com a página aberta')
  {
    const { ctx, page } = await contexto(nav, edicao({ bico: [['09:00', '12:00']] }), { agora: NATAL(9, 13, 58) })
    await abrir(page)
    igual((await vitrine(page)).filter((x) => x.tipo === 'aberta').map((x) => x.casa), [], 'às 13h58 ninguém está aberto (Aurora abre às 14h)')
    igual((await vitrine(page)).find((x) => x.casa === '[DEMO] Casa Aurora')?.etiqueta, 'Abre às 14h', 'a Aurora aparece como "Abre às 14h"')
    await page.clock.fastForward(3 * 60 * 1000)
    await page.waitForFunction(() => document.querySelector('.ct-cartao__momento--aberta'), null, { timeout: 5000 }).catch(() => {})
    igual((await vitrine(page)).filter((x) => x.tipo === 'aberta').map((x) => x.casa), ['[DEMO] Casa Aurora'], 'três minutos depois, sem recarregar, a Aurora passa a "Aberta agora"')
    await ctx.close()
  }

  console.log('\n4 · ninguém aberto e sem horário')
  {
    const { ctx, page } = await contexto(nav, edicao({ aurora: [['08:00', '09:00'], ['08:00', '09:00']], bico: [['08:00', '09:00']], lua: [['08:00', '09:00']] }), { agora: NATAL(9, 22) })
    await abrir(page)
    igual((await vitrine(page)).every((x) => x.etiqueta === null) && (await vitrine(page)).length > 0, true, 'às 22h com todas encerradas, a vitrine mostra os combos sem etiqueta de "agora"')
    const t = await aviso(page)
    if (/Nenhuma casa está com o combo agora/.test(t || '') && /todas as casas/.test(t || '')) ok('aviso claro com o caminho para as casas'); else falha(`aviso: ${t}`)
    igual((await botoesDaLista(page)).some((h) => h.endsWith('/combos')), true, 'o botão do catálogo continua')
    await page.screenshot({ path: join(SAIDA, 'desktop-ninguem-aberto.png') })
    await ctx.close()
  }
  {
    const { ctx, page } = await contexto(nav, edicao({ semHorario: true }), { agora: NATAL(9, 15) })
    await abrir(page)
    igual((await vitrine(page)).some((x) => x.tipo === 'aberta'), false, 'sem nenhum horário cadastrado, ninguém aparece como aberto')
    const t = await aviso(page)
    if (/horários das casas ainda não estão disponíveis/.test(t || '')) ok('aviso diz que os horários não estão disponíveis (não "ninguém aberto")'); else falha(`aviso: ${t}`)
    await ctx.close()
  }

  console.log('\n5 · antes e depois do festival')
  for (const [rotulo, agora] of [['antes (03/11)', NATAL(3, 15)], ['depois (20/11)', NATAL(20, 15)]]) {
    const { ctx, page } = await contexto(nav, edicao(), { agora })
    await abrir(page)
    const v = await vitrine(page)
    igual([v.length > 0, v.every((x) => x.etiqueta === null), await aviso(page)], [true, true, null], `${rotulo}: o elenco aparece, sem etiqueta e sem faixa de "agora"`)
    await ctx.close()
  }

  console.log('\n6 · catálogo: logo sobre a foto')
  {
    const { ctx, page, erros } = await contexto(nav, edicao({ semLogo: ['demo-casa-bico-de-pena'], logoQuebrada: ['demo-casa-lua'], semFoto: [] }))
    for (const caminho of ['/cartoon/participantes', '/cartoon/combos']) {
      await abrir(page, caminho)
      await page.waitForSelector('.ct-cartao')
      await page.waitForTimeout(400) // o onError de uma logo que falha tira o selo logo depois do carregamento
      const cartoes = await page.locator('.ct-cartao').evaluateAll((els) => Object.fromEntries(els.map((e) => [
        e.querySelector('.ct-cartao__link').getAttribute('href').split('/').pop(),
        { selo: !!e.querySelector('.ct-selo-casa'), foto: !!e.querySelector('.ct-cartao__visual .ct-foto img'), reserva: !!e.querySelector('.ct-cartao__reserva'), nome: e.querySelector('.ct-cartao__nome')?.textContent.trim() },
      ])))
      igual(cartoes['demo-casa-aurora']?.selo, true, `${caminho}: foto + logo → selo da casa sobre a foto`)
      igual([cartoes['demo-casa-bico-de-pena']?.foto, cartoes['demo-casa-bico-de-pena']?.selo], [true, false], `${caminho}: casa sem logo mantém a foto e não ganha selo vazio`)
      igual([cartoes['demo-casa-lua']?.foto, cartoes['demo-casa-lua']?.selo], [true, false], `${caminho}: logo que não carrega some, sem imagem quebrada`)
      igual([cartoes['demo-casa-quadro-a-quadro']?.reserva, cartoes['demo-casa-quadro-a-quadro']?.selo], [true, false], `${caminho}: sem foto, a logo fica no quadro e o selo não duplica`)
      igual(Object.values(cartoes).every((c) => c.nome), true, `${caminho}: todos os cartões mantêm o nome`)
      const quebradas = await page.locator('.ct-selo-casa img').evaluateAll((imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).length)
      igual(quebradas, 0, `${caminho}: nenhuma imagem de selo quebrada na tela`)
    }
    if (erros.length) falha(`console: ${erros.join(' | ')}`); else ok('console limpo')
    await ctx.close()
  }

  console.log('\n7 · layout em 390 e 1440 (capturas em tests/capturas-elenco/)')
  for (const [nome, w, h] of [['celular', 390, 844], ['desktop', 1440, 900]]) {
    const { ctx, page } = await contexto(nav, edicao(), { w, h })
    await abrir(page, '/cartoon')
    await page.getByRole('button', { name: 'Ok, entendi' }).click({ timeout: 1500 }).catch(() => {})
    await page.locator('.ct-entrada__elenco').scrollIntoViewIfNeeded()
    await page.locator('.ct-entrada__elenco').screenshot({ path: join(SAIDA, `${nome}-entrada-elenco.png`) })
    for (const caminho of ['/cartoon/participantes', '/cartoon/combos']) {
      await abrir(page, caminho)
      await page.waitForSelector('.ct-cartao')
      const lateral = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      igual(lateral <= 0, true, `${nome} ${caminho}: sem rolagem lateral`)
      const fora = await page.locator('.ct-cartao__visual').evaluateAll((els) => els.filter((v) => {
        const s = v.querySelector('.ct-selo-casa'); if (!s) return false
        const a = v.getBoundingClientRect(); const b = s.getBoundingClientRect()
        return b.left < a.left - 0.5 || b.right > a.right + 0.5 || b.top < a.top - 0.5 || b.bottom > a.bottom + 0.5
      }).length)
      igual(fora, 0, `${nome} ${caminho}: o selo fica dentro da foto`)
      await page.getByRole('button', { name: 'Ok, entendi' }).click({ timeout: 1500 }).catch(() => {}) // o aviso de cookies cobre o pé da tela
      await page.locator('.ct-elenco').first().screenshot({ path: join(SAIDA, `${nome}-${caminho.split('/').pop()}.png`) })
    }
    await ctx.close()
  }
} finally {
  await nav?.close()
  killTree(preview.pid)
}
console.log(falhas.length ? `\n✗ ${falhas.length} falha(s)` : '\n✓ elenco e logos ok')
process.exit(falhas.length ? 1 : 0)
