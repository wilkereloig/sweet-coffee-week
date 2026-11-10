// Verificações de interação da central redesenhada (rede interceptada; nenhum mapa real). node tests/capturas-caca-redesign/verificar-central.mjs
import { chromium } from 'playwright'
const BASE = process.env.CACA_BASE || 'http://localhost:3000'
const CHAVE = 'F'.repeat(32)
const json = (route, corpo, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corpo) })
const mapa = (o = {}) => ({ edicao: '2026.2', apelido: 'Bia', email: 'bia@exemplo.com.br', whatsapp: null, no_ranking: true, principal: true, total_casas: 26, casas_validadas: 2, extras: 1, faltam: 24, posicao: 2, empatados: 2,
  casas: [{ slug: 'adocee-doceria', carimbos: 2, avaliou: true, estado: 'validada', extras: 1 }, { slug: 'cookitos', carimbos: 1, avaliou: false, estado: 'pendente', extras: 0 }], ...o })
let falhas = 0
const checar = (c, m) => { console.log(`${c ? '  ok ' : '  FALHA'} ${m}`); if (!c) falhas++ }
const nav = await chromium.launch()
async function pagina ({ w = 390, h = 844, mocks = {}, init = null, opcoes = {} } = {}) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, ...opcoes })
  await ctx.addInitScript(([k, c]) => { try { localStorage.setItem('scw:edicao:2026.2:mapa', k); localStorage.setItem('scw_privacidade', c) } catch (e) { /* sem storage */ } }, [CHAVE, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 })])
  if (init) await ctx.addInitScript(init)
  await ctx.route('**/rest/v1/rpc/**', async (route) => {
    const fn = route.request().url().split('/rpc/')[1].split('?')[0]
    if (route.request().method() === 'OPTIONS') return route.fallback()
    if (fn in mocks) return json(route, mocks[fn])
    return route.fallback()
  })
  await ctx.route('**/functions/v1/**', (r) => (r.request().method() === 'OPTIONS' ? r.fallback() : json(r, { ok: false, motivo: 'email_indisponivel' })))
  await ctx.route('**/challenges.cloudflare.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  const page = await ctx.newPage(); const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  await page.goto(`${BASE}/cartoon/caca?preview=1`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.getByRole('heading', { name: /Mapa de/ }).waitFor({ timeout: 15000 })
  return { ctx, page, erros }
}
const OK = { confirmado: true, valido: true }
const SUPORTE = () => {
  class N { static get permission () { return 'default' } static requestPermission () { return Promise.resolve('denied') } }
  window.Notification = N
  Object.defineProperty(window, 'PushManager', { value: function () {}, configurable: true })
}

// 1 · e-mail pendente: confirmar abre o fluxo do código; "Agora não" some e fica dispensado na visita
let c = await pagina({ mocks: { mapa_ler_v2: mapa(), mapa_confirmar_email_status: { confirmado: false, valido: true } } })
checar(await c.page.getByText(/e-mail ainda não foi confirmado/i).isVisible(), 'e-mail pendente: linha visível')
await c.page.getByRole('button', { name: 'Confirmar e-mail' }).click()
checar(await c.page.getByText(/mais de um mapa com este e-mail/).isVisible() && await c.page.getByRole('button', { name: 'Enviar código' }).isVisible(), 'e-mail pendente: abre o fluxo do código (com a nota de mais de um mapa)')
await c.page.reload({ waitUntil: 'networkidle' }); await c.page.getByRole('heading', { name: /Mapa de/ }).waitFor()
await c.page.getByRole('button', { name: 'Agora não' }).first().click()
checar(await c.page.getByText(/e-mail ainda não foi confirmado/i).count() === 0, 'e-mail pendente: "Agora não" some a linha')
await c.page.reload({ waitUntil: 'networkidle' }); await c.page.getByRole('heading', { name: /Mapa de/ }).waitFor()
checar(await c.page.getByText(/e-mail ainda não foi confirmado/i).count() === 0, 'e-mail pendente: dispensado vale na mesma visita (sessão)')
await c.ctx.close()

// 2 · avisos no celular com suporte: fechado, abre com categorias, honestidade e botão
c = await pagina({ mocks: { mapa_ler_v2: mapa(), mapa_confirmar_email_status: OK }, init: SUPORTE })
checar(await c.page.getByText('Avisos no celular').count() === 1, 'avisos: um único "Avisos no celular"')
checar(await c.page.getByRole('button', { name: /Ativar avisos/ }).isHidden(), 'avisos: botão de ativar só aparece ao abrir a linha')
await c.page.locator('.ct-central__detalhes > summary').click()
checar(await c.page.getByRole('button', { name: /Ativar avisos neste aparelho/ }).isVisible(), 'avisos: aberto mostra "Ativar avisos neste aparelho"')
checar(/podem atrasar ou não chegar/.test(await c.page.locator('.ct-caca-push').innerText()), 'avisos: a honestidade aparece junto do botão')
checar(await c.page.getByRole('checkbox').count() === 4, 'avisos: 4 categorias')
await c.page.getByRole('button', { name: /Ativar avisos neste aparelho/ }).click()
await c.page.waitForTimeout(600)
checar(c.erros.length === 0, `avisos: pedir permissão não quebra a tela (${c.erros[0] || ''})`)
await c.ctx.close()

// 3 · tab: a ação principal vem cedo; foco visível; leva à avaliação
c = await pagina({ mocks: { mapa_ler_v2: mapa(), mapa_confirmar_email_status: OK } })
let n = 0; let achou = ''
for (; n < 40; n++) { await c.page.keyboard.press('Tab'); const t = await c.page.evaluate(() => (document.activeElement?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)); if (/Avaliar o combo/i.test(t)) { achou = t; break } }
checar(!!achou, `teclado: "Avaliar o combo" em ${n + 1} Tabs`)
const foco = await c.page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2 })
checar(foco, 'teclado: foco visível no botão principal')
await c.page.keyboard.press('Enter'); await c.page.waitForTimeout(800)
checar(/avaliar|avaliacao/.test(c.page.url()), `avaliar: o botão leva à avaliação (${c.page.url().replace(BASE, '')})`)
await c.ctx.close()

// 4 · "Como conta?" abre e diz casa x unidade e "Já fui"
c = await pagina({ mocks: { mapa_ler_v2: mapa(), mapa_confirmar_email_status: OK } })
await c.page.getByText('Como conta?').click()
const como = await c.page.locator('.ct-central__como').innerText()
checar(/mais de um endereço/.test(como) && /Já fui/.test(como) && /não vira carimbo/.test(como), '"Como conta?": casa × unidade e "Já fui" não é carimbo')
await c.ctx.close()

// 5 · instalar iPhone em paisagem baixa
c = await pagina({ w: 844, h: 390, mocks: { mapa_ler_v2: mapa(), mapa_confirmar_email_status: OK }, opcoes: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', isMobile: true, hasTouch: true }, init: () => { delete window.PushManager } })
const t5 = await c.page.locator('main').innerText()
checar(/Adicionar à Tela de Início/.test(t5) && /O app precisa de internet/.test(t5), 'instalar (iPhone): instrução e honestidade visíveis')
checar(await c.page.getByText('Instalar o app da Caça').count() === 1, 'instalar: um único título')
await c.ctx.close()

// 6 · movimento reduzido: nada infinito
c = await pagina({ mocks: { mapa_ler_v2: mapa(), mapa_confirmar_email_status: OK }, opcoes: { reducedMotion: 'reduce' } })
const anim = await c.page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && (a.effect?.getTiming().iterations === Infinity || Number(a.effect?.getTiming().duration) > 400)).length)
checar(anim === 0, 'movimento reduzido: sem animação longa/infinita')
await c.ctx.close()
await nav.close()
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo ok'); process.exit(falhas ? 1 : 0)
