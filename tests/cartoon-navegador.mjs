/**
 * cartoon-navegador.mjs — camada de edição contra o BUILD (docs/cartoon-2026-2/).
 *
 *   npm run build && npm run test:cartoon-navegador
 *
 * A projeção pública (RPC edicao_publica / participante_publico / criterios /
 * resultados) é INTERCEPTADA com os dados de demonstração: o build de produção
 * não tem modo demo, então o teste injeta a resposta na rede, que é o mesmo
 * caminho que o site usa de verdade.
 *
 * Reprova:
 *  1. GATE — sem ?preview, /cartoon mostra a Home institucional.
 *  2. CENAS — link direto e recarregar em todas; um <h1>; console limpo.
 *  3. HASH ANTIGO e LOVERS — #/... vira caminho limpo; endereços Lovers nunca na edição.
 *  4. PARTICIPANTE — preço, composição, alergênicos e modos sem abas; "não informado"
 *     visível; delivery só onde a unidade declarou para o combo; combo abre no bloco B.
 *  5. ESTADOS — casa inexistente, sem elenco divulgado, falha de rede (nunca demo), encerrada.
 *  6. CATÁLOGO — filtro na URL, voltar preserva filtro e posição.
 *  7. MINHA ROTA — adicionar, contador, persistir no recarregar, remover.
 *  8. AVALIAÇÃO — formulário só aberto; sucesso só com resposta ok; erro preserva as notas.
 *  9. CASCA — sem casca institucional, sem rolagem lateral em 360 e 1440, alvos ≥ 44px.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { DEMO_EDICAO } from '../src/edicao/dados/demo/cartoon.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5217
const BASE = `http://localhost:${PORT}`
const falhas = []
const falha = (m) => { falhas.push(m); console.log(`  ✗ ${m}`) }
const ok = (m) => console.log(`  ✓ ${m}`)
const clone = (o) => JSON.parse(JSON.stringify(o))

function killTree(pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    else process.kill(-pid, 'SIGKILL')
  } catch { /* já morto */ }
}
async function waitForServer(url, ms = 30000) {
  const t = Date.now()
  while (Date.now() - t < ms) {
    try { if ((await fetch(url)).ok) return } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 350))
  }
  throw new Error('preview não respondeu')
}
try { await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1500) }); console.error(`✗ porta ${PORT} ocupada`); process.exit(1) } catch { /* livre */ }

/** Contexto com a projeção interceptada. `edicao` = resposta de edicao_publica (ou 'falha'). */
async function contexto (nav, { w = 1440, h = 900, edicao = DEMO_EDICAO, envio = 'ok' } = {}) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h } })
  await ctx.route('**/rest/v1/rpc/**', async (route) => {
    const fn = route.request().url().split('/rpc/')[1].split('?')[0]
    const corpo = JSON.parse(route.request().postData() || '{}')
    if (edicao === 'falha') return route.abort('failed')
    const json = (d) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) })
    if (fn === 'edicao_publica') return json(edicao)
    if (fn === 'participante_publico') {
      if (!edicao.participantes_publicos) return json({ estado: 'nao_divulgado' })
      const p = edicao.participantes.find((x) => x.slug === corpo.p_slug)
      return json(p ? { estado: 'publicado', fase: edicao.fase, participante: p } : { estado: 'inexistente' })
    }
    if (fn === 'criterios_avaliacao') return json(edicao.avaliacao?.aberta ? [{ chave: 'doce', rotulo: 'Doce', minimo: 5, maximo: 10 }, { chave: 'bebida', rotulo: 'Bebida', minimo: 5, maximo: 10 }] : [])
    if (fn === 'resultados_publicos') return json(null)
    return route.fulfill({ status: 404, body: '{}' })
  })
  await ctx.route('**/functions/v1/enviar-formulario', (route) => (envio === 'ok'
    ? route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
    : route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false,"message":"falha_ao_chamar_rpc"}' })))
  await ctx.route('**/challenges.cloudflare.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  await ctx.route('**/tiles.openfreemap.org/**', (route) => route.abort('failed'))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|openfreemap|maplibre|404/.test(m.text())) erros.push(m.text()) })
  return { ctx, page, erros }
}
const ir = (page, p) => page.goto(`${BASE}${p}${p.includes('?') ? '&' : '?'}preview=1`, { waitUntil: 'networkidle' })
const h1 = async (page) => (await page.locator('h1').first().textContent())?.trim()

const preview = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  cwd: join(__dirname, '..'), shell: true, stdio: ['ignore', 'pipe', 'pipe'],
})
let nav
try {
  await waitForServer(BASE)
  nav = await chromium.launch()

  console.log('\n1 · gate')
  {
    const { ctx, page } = await contexto(nav)
    await page.goto(`${BASE}/cartoon`, { waitUntil: 'networkidle' })
    if (await page.locator('.ct-edicao').count()) falha('sem preview, /cartoon mostrou a edição')
    else ok('sem preview, /cartoon cai na Home institucional')
    await ctx.close()
  }

  console.log('\n2 · cenas: link direto, recarregar, um <h1>')
  {
    const { ctx, page, erros } = await contexto(nav)
    const CENAS = [
      ['/cartoon/participantes', 'O elenco da Cartoon'],
      ['/cartoon/participantes/demo-casa-aurora', '[DEMO] Casa Aurora'],
      ['/cartoon/combos', 'Os combos da Cartoon'],
      ['/cartoon/combos/demo-casa-aurora', '[DEMO] Casa Aurora'],
      ['/cartoon/mapa', 'Mapa'],
      ['/cartoon/minha-rota', 'Minha rota'],
      ['/cartoon/avaliar', 'Avaliar'],
      ['/cartoon/premiacao', 'Premiação'],
      ['/cartoon/nao-existe', 'Não encontramos essa página da Cartoon'],
      ['/cartoon/participantes/casa-que-nao-existe', 'Não encontramos essa casa na Cartoon.'],
    ]
    const antes = falhas.length
    await ir(page, '/cartoon')
    if (!(await page.locator('h1 img[alt="Cartoon"]').count())) falha('/cartoon: h1 sem o lettering com nome')
    for (const [p, t] of CENAS) {
      await ir(page, p)
      await page.waitForFunction((t) => document.querySelector('h1')?.textContent?.trim() === t, t, { timeout: 5000 }).catch(() => {})
      if ((await h1(page)) !== t) falha(`${p}: h1 "${await h1(page)}" ≠ "${t}"`)
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForFunction((t) => document.querySelector('h1')?.textContent?.trim() === t, t, { timeout: 5000 }).catch(() => {})
      if ((await h1(page)) !== t) falha(`${p}: recarregar perdeu a cena`)
      if ((await page.locator('h1').count()) !== 1) falha(`${p}: ${await page.locator('h1').count()} <h1>`)
    }
    if (erros.length) falha(`console: ${erros.slice(0, 3).join(' | ')}`)
    if (falhas.length === antes) ok(`${CENAS.length + 1} cenas por link direto e recarregar, um <h1> cada, console limpo`)

    console.log('\n3 · hash antigo e Lovers')
    await page.goto(`${BASE}/?preview=1#/cartoon/mapa`, { waitUntil: 'networkidle' })
    if (new URL(page.url()).pathname !== '/cartoon/mapa' || (await h1(page)) !== 'Mapa') falha(`#/cartoon/mapa → ${page.url()}`)
    for (const p of ['/lovers/combos/paneer-patisserie', '/mapa', '/participantes', '/rota']) {
      await ir(page, p)
      await page.waitForFunction(() => location.pathname === '/', null, { timeout: 5000 }).catch(() => {})
      if (new URL(page.url()).pathname !== '/' || (await page.locator('.ct-edicao').count())) falha(`${p} não caiu na Home institucional`)
    }
    if (!falhas.some((f) => /Home|#\//.test(f))) ok('hash vira caminho limpo; endereços Lovers seguem na Home')
    await ctx.close()
  }

  console.log('\n4 · página do participante')
  {
    const { ctx, page } = await contexto(nav)
    const antes = falhas.length
    await ir(page, '/cartoon/participantes/demo-casa-aurora')
    await page.waitForSelector('#combo')
    const t = await page.locator('.ct-part').innerText()
    for (const s of ['R$ 38,90', '[DEMO] Doce · [DEMO] Salgado · [DEMO] Bebida', 'Contém glúten, leite e ovo', 'Pode conter', 'Confirme com a loja', 'Troca']) {
      if (!t.includes(s)) falha(`participante sem "${s}"`)
    }
    if (await page.locator('.ct-part [role="tab"], .ct-part [role="tablist"]').count()) falha('participante usa abas')
    const delivery = await page.locator('.ct-modos > li', { hasText: 'Delivery' }).innerText()
    if (!delivery.includes('Unidade Centro') || delivery.includes('Unidade Sul')) falha(`delivery fora da unidade certa: ${delivery}`)
    if (!t.includes('A casa informa que não contém lactose') || !/Contém\s*\n?\s*leite/.test(t)) falha('"sem lactose" sem o "contém leite" ao lado')
    await ir(page, '/cartoon/participantes/demo-casa-bico-de-pena')
    await page.waitForSelector('#combo')
    const b = await page.locator('.ct-part').innerText()
    if (!b.includes('Não informado pela casa')) falha('restrição não informada não aparece como "não informado"')
    if (b.includes('Não contém, segundo a casa')) falha('"não informado" virou "não contém"')
    if (b.includes('Delivery')) falha('Bico de Pena mostra delivery sem ter declarado')
    await ir(page, '/cartoon/participantes/demo-casa-quadro-a-quadro')
    await page.waitForSelector('.ct-casa')
    if (!(await page.locator('.ct-part').innerText()).includes('será revelado em breve') || await page.locator('#combo').count()) falha('casa sem combo publicado mostrou combo')
    await ir(page, '/cartoon/combos/demo-casa-aurora')
    await page.waitForSelector('#combo')
    await page.waitForTimeout(400)
    const topo = await page.evaluate(() => document.getElementById('combo').getBoundingClientRect().top)
    if (Math.abs(topo) > 120) falha(`/combos/:slug não abriu no bloco do combo (top=${Math.round(topo)})`)
    if (falhas.length === antes) ok('preço, composição, alergênicos e modos à vista; não informado ≠ não contém; delivery por unidade; combo focado')
    await ctx.close()
  }

  console.log('\n5 · estados parciais e de falha')
  {
    const antes = falhas.length
    const fechado = { ...clone(DEMO_EDICAO), participantes_publicos: false, combos_publicos: false, participantes: [] }
    let c = await contexto(nav, { edicao: fechado })
    await ir(c.page, '/cartoon/participantes')
    if (!(await c.page.locator('.ct-conteudo').innerText()).includes('será revelado em breve')) falha('sem elenco divulgado não diz "em breve"')
    await ir(c.page, '/cartoon/participantes/demo-casa-aurora')
    if (!(await c.page.locator('.ct-conteudo').innerText()).includes('será revelado em breve')) falha('slug com elenco fechado confirmou a casa')
    await c.ctx.close()

    c = await contexto(nav, { edicao: 'falha' })
    await ir(c.page, '/cartoon/participantes')
    const txt = await c.page.locator('.ct-conteudo').innerText()
    if (!txt.includes('Não conseguimos carregar a edição agora')) falha('falha de rede sem estado de falha')
    if (txt.includes('[DEMO]')) falha('falha de rede caiu em dado de demonstração')
    await c.ctx.close()

    const encerrada = { ...clone(DEMO_EDICAO), fase: 'encerrada' }
    c = await contexto(nav, { edicao: encerrada })
    await ir(c.page, '/cartoon/participantes/demo-casa-aurora')
    await c.page.waitForSelector('#combo')
    const e = await c.page.locator('.ct-part').innerText()
    if (e.includes('R$ 38,90') || e.includes('Adicionar à Minha rota') && e.includes('Horário do combo')) falha('edição encerrada ainda mostra preço ou horário')
    if (!e.includes('terminou')) falha('edição encerrada sem aviso')
    await c.ctx.close()
    if (falhas.length === antes) ok('sem elenco, slug sob elenco fechado, falha de rede (sem demo) e edição encerrada')
  }

  console.log('\n6 · catálogo: filtro na URL, voltar preserva filtro e posição')
  {
    const { ctx, page } = await contexto(nav, { w: 1440, h: 500 })
    const antes = falhas.length
    await ir(page, '/cartoon/participantes')
    await page.click('.ct-chip:has-text("Delivery")')
    await page.waitForFunction(() => new URLSearchParams(location.search).get('modo') === 'delivery')
    if ((await page.locator('.ct-cartao').count()) !== 1) falha(`filtro delivery: ${await page.locator('.ct-cartao').count()} cartões`)
    await page.evaluate(() => window.scrollTo(0, 200))
    const y0 = await page.evaluate(() => scrollY)
    await page.click('.ct-cartao__link')
    await page.waitForSelector('#combo')
    await page.goBack()
    await page.waitForSelector('.ct-cartao')
    await page.waitForTimeout(400)
    if (new URLSearchParams(new URL(page.url()).search).get('modo') !== 'delivery') falha('voltar perdeu o filtro')
    if ((await page.locator('.ct-cartao').count()) !== 1) falha('voltar não reaplicou o filtro')
    const y1 = await page.evaluate(() => scrollY)
    if (y0 > 0 && Math.abs(y1 - y0) > 40) falha(`voltar não restaurou a posição (${y0} → ${y1})`)
    if (falhas.length === antes) ok('filtro no endereço, voltar devolve filtro e posição')
    await ctx.close()
  }

  console.log('\n7 · Minha rota')
  {
    const { ctx, page } = await contexto(nav)
    const antes = falhas.length
    await ir(page, '/cartoon/participantes/demo-casa-aurora')
    await page.waitForSelector('.ct-unidade')
    await page.locator('.ct-unidade').first().locator('button:has-text("Adicionar à Minha rota")').click()
    await page.waitForSelector('.ct-topo .ct-contador')
    if ((await page.locator('.ct-topo .ct-contador').textContent()) !== '1') falha('contador da rota não foi a 1')
    await page.locator('.ct-unidade').first().locator('button:has-text("Na sua rota")').waitFor()
    await ir(page, '/cartoon/minha-rota')
    await page.reload({ waitUntil: 'networkidle' })
    if ((await page.locator('.ct-parada').count()) !== 1) falha('rota não persistiu no recarregar')
    if (!(await page.locator('a:has-text("Abrir a rota no Google Maps")').count())) falha('sem link de rota externa')
    if ((await page.locator('.ct-rota').innerText()).match(/melhor caminho|otimizad/i)) falha('rota promete otimização')
    await page.click('.ct-parada button:has-text("Remover")')
    if ((await page.locator('.ct-parada').count()) !== 0) falha('remover não tirou a parada')
    await page.evaluate(() => localStorage.setItem('scw:edicao:2026.2:rota', JSON.stringify({ versao: 1, unidades: ['u000000'] })))
    await page.reload({ waitUntil: 'networkidle' })
    if (!(await page.locator('.ct-parada--saiu').count())) falha('unidade despublicada sumiu calada da rota')
    if (falhas.length === antes) ok('adicionar, contador, persistir, remover, unidade que saiu sinalizada')
    await ctx.close()
  }

  console.log('\n8 · avaliação')
  {
    const antes = falhas.length
    let c = await contexto(nav)
    await ir(c.page, '/cartoon/avaliar')
    if (await c.page.locator('form.ct-form').count()) falha('formulário aberto com a avaliação fechada')
    await c.ctx.close()
    const aberta = { ...clone(DEMO_EDICAO), avaliacao: { aberta: true, abre_em: null, fecha_em: null } }
    for (const envio of ['erro', 'ok']) {
      c = await contexto(nav, { edicao: aberta, envio })
      await ir(c.page, '/cartoon/avaliar?participante=demo-casa-aurora')
      await c.page.waitForSelector('form.ct-form')
      await c.page.selectOption('.ct-form select >> nth=1', 'udemo1')
      await c.page.click('.ct-nota-campo:has-text("Doce") .ct-escala__op:has-text("9")')
      await c.page.click('.ct-nota-campo:has-text("Bebida") .ct-escala__op:has-text("8")')
      await c.page.fill('input[autocomplete="name"]', 'Pessoa Teste')
      await c.page.fill('input[type="email"]', 'pessoa@teste.com')
      await c.page.waitForTimeout(3100)
      await c.page.click('button[type="submit"]')
      if (envio === 'erro') {
        await c.page.waitForSelector('.ct-form [role="alert"]')
        if (await c.page.locator('h1:has-text("Avaliação registrada")').count()) falha('sucesso mostrado com erro do servidor')
        if (!(await c.page.locator('.ct-nota-campo:has-text("Doce") input:checked').count())) falha('erro apagou as notas')
      } else {
        await c.page.waitForSelector('h1:has-text("Avaliação registrada")', { timeout: 5000 }).catch(() => falha('sucesso não apareceu com resposta ok'))
      }
      await c.ctx.close()
    }
    if (falhas.length === antes) ok('fechada sem formulário; erro preserva notas e não finge sucesso; ok confirma')
  }

  console.log('\n9 · casca e larguras')
  for (const [w, h] of [[360, 800], [1440, 900]]) {
    const { ctx, page } = await contexto(nav, { w, h })
    for (const p of ['/cartoon', '/cartoon/participantes', '/cartoon/participantes/demo-casa-aurora', '/cartoon/mapa']) {
      await ir(page, p)
      await page.waitForTimeout(300)
      const m = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        inst: !!document.querySelector('.scw-header, .scw-footer'),
        // Contraste medido do texto de cada botão contra o próprio fundo (§10.1: herança de cor).
        contraste: [...document.querySelectorAll('.ct-edicao .ct-botao, .ct-edicao .ct-chip, .ct-edicao .ct-aba')].filter((e) => e.offsetParent).map((e) => {
          const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number)
          const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
            .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
          let el = e; let fundo = getComputedStyle(el).backgroundColor
          while (el && /rgba\(0, 0, 0, 0\)|transparent/.test(fundo)) { el = el.parentElement; fundo = el ? getComputedStyle(el).backgroundColor : 'rgb(253, 242, 223)' }
          const [a1, a2] = [lum(rgb(getComputedStyle(e).color)), lum(rgb(fundo))]
          return { t: e.textContent.trim().slice(0, 24), r: (Math.max(a1, a2) + 0.05) / (Math.min(a1, a2) + 0.05) }
        }).filter((x) => x.r < 4.5),
        alvos: [...document.querySelectorAll('.ct-edicao a, .ct-edicao button, .ct-edicao summary')]
          .filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim().slice(0, 30)),
      }))
      if (m.overflow > 1) falha(`@${w} ${p}: rolagem horizontal (${m.overflow}px)`)
      if (m.inst) falha(`@${w} ${p}: casca institucional dentro da edição`)
      if (m.alvos.length) falha(`@${w} ${p}: alvos < 44px: ${m.alvos.slice(0, 4).join(' | ')}`)
      if (m.contraste.length) falha(`@${w} ${p}: contraste < 4,5:1: ${m.contraste.map((x) => `${x.t} ${x.r.toFixed(2)}`).join(' | ')}`)
    }
    await ctx.close()
  }
  if (!falhas.some((f) => /^@/.test(f))) ok('360 e 1440: sem rolagem lateral, casca própria, alvos ≥ 44px, botões com contraste ≥ 4,5:1')
} finally {
  if (nav) await nav.close()
  killTree(preview.pid)
}

console.log(falhas.length ? `\n✗ ${falhas.length} falha(s)` : '\n✓ cartoon ok')
process.exit(falhas.length ? 1 : 0)
