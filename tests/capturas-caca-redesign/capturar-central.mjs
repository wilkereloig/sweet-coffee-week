// Capturas da central e telas associadas (redesign). Uso: node tests/capturas-caca-redesign/capturar-central.mjs antes|depois [filtro]
// Fala com o dev server (CACA_BASE, padrão http://localhost:3000). Tudo por interceptação de rede: nenhum mapa é criado no banco.
import { chromium } from 'playwright'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

const BASE = process.env.CACA_BASE || 'http://localhost:3000'
const DEST = join(dirname(fileURLToPath(import.meta.url)), process.argv[2] || 'depois')
const FILTRO = process.argv[3] ? new RegExp(process.argv[3]) : null
mkdirSync(DEST, { recursive: true })
const CHAVE = 'F'.repeat(32)
const json = (route, corpo, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corpo) })
const mapaMock = ({ casas = [], validadas = 0, extras = 0, posicao = null, empatados = 0, total = 26, apelido = 'Bia' } = {}) => ({
  edicao: '2026.2', apelido, email: 'bia@exemplo.com.br', whatsapp: null, no_ranking: true, principal: true, total_casas: total,
  casas_validadas: validadas, extras, faltam: Math.max(total - validadas, 0), posicao, empatados, casas,
})
const PROGRESSO = mapaMock({ validadas: 2, extras: 1, posicao: 2, empatados: 2, casas: [
  { slug: 'adocee-doceria', carimbos: 2, avaliou: true, estado: 'validada', extras: 1 },
  { slug: 'carcara', carimbos: 1, avaliou: true, estado: 'validada', extras: 0 },
  { slug: 'cookitos', carimbos: 1, avaliou: false, estado: 'pendente', extras: 0 }] })
const COMPLETO = mapaMock({ validadas: 26, total: 26, extras: 4, posicao: 1, empatados: 1, casas: [{ slug: 'adocee-doceria', carimbos: 3, avaliou: true, estado: 'validada', extras: 2 }] })
const OK = { confirmado: true, valido: true }
const PEND = { confirmado: false, valido: true }
const RANK = [{ posicao: 1, apelido: 'Ana', casas: 9, extras: 3 }, { posicao: 2, apelido: 'Bia', casas: 7, extras: 1 }, { posicao: 2, apelido: 'Caio', casas: 7, extras: 1 }, { posicao: 4, apelido: 'Duda', casas: 3, extras: 0 }]

const CENARIOS = [
  { id: 'central-sem-mapa', rota: '/cartoon/caca', chave: null, mocks: {} },
  { id: 'central-falha', rota: '/cartoon/caca', mocks: { mapa_ler_v2: { __status: 500, corpo: { message: 'x' } } } },
  { id: 'central-carregando', rota: '/cartoon/caca', espera: 'lento', mocks: {} },
  { id: 'central-mapa-vazio', rota: '/cartoon/caca', mocks: { mapa_ler_v2: mapaMock(), mapa_confirmar_email_status: OK } },
  { id: 'central-progresso', rota: '/cartoon/caca', mocks: { mapa_ler_v2: PROGRESSO, mapa_confirmar_email_status: OK } },
  { id: 'central-email-pendente', rota: '/cartoon/caca', mocks: { mapa_ler_v2: PROGRESSO, mapa_confirmar_email_status: PEND } },
  { id: 'central-completo', rota: '/cartoon/caca', mocks: { mapa_ler_v2: COMPLETO, mapa_confirmar_email_status: OK } },
  { id: 'ranking', rota: '/cartoon/caca/ranking', vps: ['390x844', '1440x900'], mocks: { caca_ranking_publico: RANK, mapa_ler_v2: PROGRESSO, mapa_confirmar_email_status: OK } },
  { id: 'grupos-vazio', rota: '/cartoon/caca/grupos', vps: ['390x844', '1440x900'], mocks: { caca_grupo_listar: { ok: true, grupos: [] }, mapa_ler_v2: PROGRESSO, mapa_confirmar_email_status: OK } },
  { id: 'grupos-com-grupos', rota: '/cartoon/caca/grupos', vps: ['390x844', '1440x900'], mocks: { caca_grupo_listar: { ok: true, grupos: [{ grupo_id: 'a1b2c3d4-0000-4000-8000-000000000001', nome: 'Turma do café', papel: 'dono', membros_qtd: 3, casas_coletivas: 5, total_casas: 26 }, { grupo_id: 'a1b2c3d4-0000-4000-8000-000000000002', nome: 'Família', papel: 'membro', membros_qtd: 4, casas_coletivas: 9, total_casas: 26 }] }, mapa_ler_v2: PROGRESSO, mapa_confirmar_email_status: OK } },
  { id: 'metas', rota: '/cartoon/caca/metas', vps: ['390x844', '1440x900'], mocks: { mapa_ler_v2: PROGRESSO, mapa_confirmar_email_status: OK, caca_metas_ler: { total_casas: 26, casas_validadas: 2, metas: [{ casas: 1, titulo: 'Primeiro carimbo' }, { casas: 9, titulo: 'Pegou o jeito' }, { casas: 17, titulo: 'Quase lá' }, { casas: 26, titulo: 'Mapa completo', completa: true }] } } },
  { id: 'compartilhar', rota: '/cartoon/caca/compartilhar', vps: ['390x844', '1440x900'], mocks: { mapa_ler_v2: PROGRESSO, mapa_confirmar_email_status: OK } },
  { id: 'recuperar', rota: '/cartoon/caca/recuperar', vps: ['390x844'], mocks: { mapa_ler_v2: PROGRESSO, mapa_confirmar_email_status: OK } },
]
const VPS = ['360x780', '390x844', '768x1024', '1440x900', '844x390']

// Auditoria (AUDITAR=1): as mesmas medidas do E2E (rolagem lateral, alvos ≥ 44px, contraste, estouro à direita, um h1).
function medirPagina (page) {
  return page.evaluate(() => {
    const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number)
    const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
    const visivel = (e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed'
    const contraste = [...document.querySelectorAll('.ct-edicao .ct-botao, .ct-edicao .ct-chip, .ct-edicao .ct-aba')].filter(visivel).map((e) => {
      let el = e; let fundo = getComputedStyle(el).backgroundColor
      while (el && /rgba\(0, 0, 0, 0\)|transparent/.test(fundo)) { el = el.parentElement; fundo = el ? getComputedStyle(el).backgroundColor : 'rgb(253, 242, 223)' }
      const { color, fontSize, fontWeight } = getComputedStyle(e)
      const [a1, a2] = [lum(rgb(color)), lum(rgb(fundo))]
      const px = parseFloat(fontSize)
      const minimo = px >= 24 || (px >= 18.66 && Number(fontWeight) >= 700) ? 3 : 4.5
      return { t: e.textContent.trim().slice(0, 24), r: (Math.max(a1, a2) + 0.05) / (Math.min(a1, a2) + 0.05), minimo }
    }).filter((x) => x.r < x.minimo)
    const alvos = [...document.querySelectorAll('.ct-edicao a, .ct-edicao button, .ct-edicao summary, .ct-edicao input:not([type=hidden]), .ct-edicao select, .ct-edicao textarea')]
      .filter((e) => visivel(e) && !e.closest('.ct-mapa__mapa') && !e.closest('.cookie-consent') && e.getBoundingClientRect().height > 0)
      .filter((e) => { const r = e.getBoundingClientRect(); const eh = e.type === 'checkbox' || e.type === 'radio'; return eh ? false : r.height < 43.5 })
      .map((e) => e.textContent.trim().slice(0, 30) || e.getAttribute('aria-label') || `<${e.tagName.toLowerCase()} class="${String(e.className).slice(0, 30)}">`)
    // Elemento que passa da borda direita da tela (texto cortado), mesmo quando a página em si não rola de lado.
    const estouram = [...document.querySelectorAll('.ct-edicao *')]
      .filter((e) => visivel(e) && !e.closest('.ct-mapa__mapa') && !e.closest('.ct-mundo') && !e.closest('.ct-sr, [class*="visually"]') && !e.closest('[aria-hidden=true]'))
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed' })
      .slice(0, 5).map((e) => `<${e.tagName.toLowerCase()} class="${String(e.className).slice(0, 32)}"> até ${Math.round(e.getBoundingClientRect().right)}px`)
    return { overflow: document.documentElement.scrollWidth - innerWidth, contraste, alvos, estouram, h1: document.querySelectorAll('h1').length }
  })
}


const nav = await chromium.launch()
for (const c of CENARIOS) {
  if (FILTRO && !FILTRO.test(c.id)) continue
  for (const vp of c.vps || VPS) {
    const [w, h] = vp.split('x').map(Number)
    const ctx = await nav.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800 })
    const chave = c.chave === null ? null : CHAVE
    await ctx.addInitScript(([k, cons]) => { try { if (k) localStorage.setItem('scw:edicao:2026.2:mapa', k); localStorage.setItem('scw_privacidade', cons) } catch {} }, [chave, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 })])
    await ctx.route('**/rest/v1/rpc/**', async (route) => {
      const fn = route.request().url().split('/rpc/')[1].split('?')[0]
      if (route.request().method() === 'OPTIONS') return route.fallback()
      if (c.espera === 'lento' && fn === 'mapa_ler_v2') return // nunca responde: fica "carregando"
      if (fn in c.mocks) { const r = c.mocks[fn]; return r && r.__status ? json(route, r.corpo, r.__status) : json(route, r) }
      return route.fallback()
    })
    await ctx.route('**/functions/v1/**', (route) => (route.request().method() === 'OPTIONS' ? route.fallback() : json(route, { ok: false, motivo: 'email_indisponivel' })))
    await ctx.route('**/challenges.cloudflare.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
    const page = await ctx.newPage()
    const erros = []
    page.on('pageerror', (e) => erros.push(String(e)))
    await page.goto(`${BASE}${c.rota}?preview=1`, { waitUntil: c.espera === 'lento' ? 'domcontentloaded' : 'networkidle', timeout: 90000 }).catch(() => {})
    await page.waitForTimeout(c.espera === 'lento' ? 2500 : 900)
    const m = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, altura: document.documentElement.scrollHeight }))
    if (c.id.startsWith('central')) await page.screenshot({ path: join(DEST, `${c.id}-${vp}-dobra.png`) }).catch(() => {})
    if (process.env.AUDITAR) {
      const med = await medirPagina(page)
      const probs = [med.overflow > 1 && `overflow ${med.overflow}`, med.h1 !== 1 && `h1=${med.h1}`, med.alvos.length && `alvos<44: ${med.alvos.join(' | ')}`, med.contraste.length && `contraste: ${med.contraste.map((x) => `${x.t} ${x.r.toFixed(2)}`).join(' | ')}`, med.estouram.length && `estouram: ${med.estouram.join(' | ')}`].filter(Boolean)
      console.log(`  AUDITORIA ${c.id} ${vp}: ${probs.length ? probs.join(' ;; ') : 'ok'}`)
    } else {
    await page.screenshot({ path: join(DEST, `${c.id}-${vp}.png`), fullPage: true }).catch(() => {})
    }
    console.log(`${c.id} ${vp}: altura ${m.altura}px overflow ${m.overflow}${erros.length ? ` ERRO ${erros[0].slice(0, 100)}` : ''}`)
    await ctx.close()
  }
}
await nav.close()
