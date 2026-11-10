/*
 * Capturas "antes e depois" das telas da Caça e da avaliação (criar/recuperar mapa, central, Sweet Awards, formulário de avaliação),
 * em celular e desktop, e medidas simples do Awards (troféu × foco de luz). Servidor da Caça simulado; o banco não é tocado.
 *   REFINO_PASTA=<pasta de saída> MAPA_E2E_REUSAR=1 node tests/cartoon-refino-capturas.mjs   (vite dev na 5212)
 */
import { chromium } from 'playwright'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'

const PORT = 5212
const BASE = `http://localhost:${PORT}`
const PASTA = process.env.REFINO_PASTA || join(tmpdir(), `refino-${Date.now().toString(36)}`)
mkdirSync(PASTA, { recursive: true })
const CHAVE = 'R'.repeat(32)
const MAPA = {
  edicao: '2026.2', apelido: 'Maria da Silva Sauro de Souza', email: 'e2e@exemplo.com.br', whatsapp: null, no_ranking: true, principal: true, total_casas: 26, casas_validadas: 2, extras: 0, faltam: 24, posicao: 2, empatados: 1,
  casas: [{ slug: 'carcara', carimbos: 1, avaliou: true, estado: 'validada', extras: 0 }, { slug: 'cookitos', carimbos: 1, avaliou: false, estado: 'pendente', extras: 0 }],
}
const json = (route, corpo) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corpo) })
const rpc = (n) => `**/rest/v1/rpc/${n}*`
const opc = (r) => r.request().method() === 'OPTIONS'
const TELAS = [{ nome: 'celular', w: 390, h: 844, toque: true }, { nome: 'desktop', w: 1280, h: 900, toque: false }]
const ROTAS = [
  ['criar', '/cartoon/caca', false],
  ['recuperar', '/cartoon/caca/recuperar', false],
  ['central', '/cartoon/caca', true],
  ['awards', '/cartoon/avaliar', false],
  ['awards-com-mapa', '/cartoon/avaliar', true],
]

const nav = await chromium.launch()
try {
  for (const t of TELAS) {
    for (const [nome, rota, comMapa] of ROTAS) {
      const ctx = await nav.newContext({ viewport: { width: t.w, height: t.h }, hasTouch: t.toque, isMobile: t.toque, deviceScaleFactor: 2 })
      await ctx.addInitScript(([k, c, m]) => { try { localStorage.setItem('scw_privacidade', c); if (m) localStorage.setItem('scw:edicao:2026.2:mapa', k) } catch { /* sem storage */ } },
        [CHAVE, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 }), comMapa])
      await ctx.route(rpc('mapa_ler_v2'), (r) => (opc(r) ? r.fallback() : json(r, comMapa ? MAPA : null)))
      await ctx.route(rpc('mapa_confirmar_email_status'), (r) => (opc(r) ? r.fallback() : json(r, { confirmado: true, valido: true })))
      await ctx.route(rpc('caca_visita_anterior_prazo'), (r) => (opc(r) ? r.fallback() : json(r, { aberto: true, ate: '2026-11-06T03:00:00Z', fuso: 'America/Fortaleza' })))
      await ctx.route(rpc('caca_excecao_minhas'), (r) => (opc(r) ? r.fallback() : json(r, { ok: true, pedidos: [] })))
      await ctx.route('**/challenges.cloudflare.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
      const page = await ctx.newPage()
      await page.goto(`${BASE}${rota}?preview=1`, { waitUntil: 'networkidle', timeout: 120000 })
      await page.waitForTimeout(1200)
      await page.screenshot({ path: join(PASTA, `${t.nome}-${nome}-topo.png`) })
      await page.screenshot({ path: join(PASTA, `${t.nome}-${nome}-pagina.png`), fullPage: true })
      if (nome.startsWith('awards')) {
        const m = await page.evaluate(() => {
          const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height) } }
          return { palco: r('.ct-gala'), trofeu: r('.ct-palco__trofeu'), corpo: r('.ct-palco__corpo'), lateral: document.documentElement.scrollWidth - document.documentElement.clientWidth }
        })
        console.log(t.nome, nome, JSON.stringify(m))
      }
      await ctx.close()
    }
  }
  console.log(`capturas em ${PASTA}`)
} finally { await nav.close() }
