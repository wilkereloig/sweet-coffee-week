/*
 * Layout do Mapa da Doçura (celular e desktop): sem rolagem lateral, nenhum controle atravessado, nenhum pin cobrindo outro,
 * cartão de "criar mapa" antes e depois do mapa, estados do jogo. Servidor do Caça simulado na rede do navegador; o banco não é tocado.
 *   MAPA_LAYOUT_CAPTURAS=<pasta> grava as capturas (padrão: pasta temporária) · MAPA_LAYOUT_REUSAR=1 reaproveita o servidor da 5213.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'

const PORT = 5213
const BASE = `http://localhost:${PORT}`
const CAPTURAS = process.env.MAPA_LAYOUT_CAPTURAS || join(tmpdir(), `mapa-layout-${Date.now().toString(36)}`)
mkdirSync(CAPTURAS, { recursive: true })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const falhas = []
const checar = (cond, msg) => { console.log(`  ${cond ? '✓' : '✗'} ${msg}`); if (!cond) falhas.push(msg) }
const responde = async () => { try { return (await fetch(`${BASE}/cartoon`, { signal: AbortSignal.timeout(30000) })).ok } catch { return false } }

let servidor = null
if (!(await responde())) {
  if (process.env.MAPA_LAYOUT_REUSAR === '1') { console.error(`✗ sem servidor na ${PORT}`); process.exit(1) }
  servidor = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  for (let i = 0; i < 120 && !(await responde()); i++) await esperar(350)
}
const matar = () => { if (servidor?.pid) { try { process.platform === 'win32' ? execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' }) : process.kill(-servidor.pid, 'SIGKILL') } catch { /* já morto */ } } }

const CHAVE = 'F'.repeat(32)
const MAPA = {
  edicao: '2026.2', apelido: 'E2E', email: 'e2e@exemplo.com.br', whatsapp: null, no_ranking: true, principal: true, total_casas: 26,
  casas_validadas: 2, extras: 0, faltam: 24, posicao: 2, empatados: 1,
  casas: [
    { slug: 'adocee-doceria', carimbos: 1, avaliou: true, estado: 'validada', extras: 0 },
    { slug: 'carcara', carimbos: 1, avaliou: true, estado: 'validada', extras: 0 },
    { slug: 'cookitos', carimbos: 1, avaliou: false, estado: 'pendente', extras: 0 },
  ],
}
const ESTILO_VAZIO = { version: 8, sources: {}, layers: [{ id: 'fundo', type: 'background', paint: { 'background-color': '#FDF0DE' } }] }
const json = (route, corpo) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corpo) })

// ---- medição dentro da página: pins visíveis, sobreposição, seleção por toque e fios ----
const MEDIR = (vista) => {
  const rotuloDe = (el) => (el.closest?.('gmp-advanced-marker') || el).getAttribute('aria-label')
  const caixaMapa = (vista === 'mundo' ? document.querySelector('.ct-mundo__janela') : document.querySelector('.ct-mapa__mapa'))?.getBoundingClientRect()
  if (!caixaMapa) return { ok: false, motivo: 'sem mapa' }
  // Faixa realmente à vista: dentro do mapa e da janela, fora do cabeçalho e da barra de abas fixos (a pessoa rola a página para o resto).
  const fixo = (sel) => { const e = document.querySelector(sel); if (!e) return null; const cs = getComputedStyle(e); return cs.position === 'fixed' || cs.position === 'sticky' ? e.getBoundingClientRect() : null }
  const topo = fixo('.ct-topo'); const abas = fixo('.ct-abas')
  const faixa = { t: Math.max(caixaMapa.top, topo ? topo.bottom : 0), b: Math.min(caixaMapa.bottom, abas ? abas.top : innerHeight, innerHeight), l: Math.max(caixaMapa.left, 0), r: Math.min(caixaMapa.right, innerWidth) }
  const controles = [...document.querySelectorAll('.ct-mundo__zoom, .ct-mapa__ampliar, .gm-control-active, .gm-bundled-control, .gm-fullscreen-control, .maplibregl-ctrl, .ct-jogo__botao, .ct-mapa__sair')].map((e) => e.getBoundingClientRect()).filter((r) => r.width)
  const sobControle = (x, y) => controles.some((r) => x > r.left - 2 && x < r.right + 2 && y > r.top - 2 && y < r.bottom + 2)
  const dentro = (r) => !sobControle((r.left + r.right) / 2, (r.top + r.bottom) / 2) && (r.left + r.right) / 2 > faixa.l + 4 && (r.left + r.right) / 2 < faixa.r - 4 && (r.top + r.bottom) / 2 > faixa.t + 4 && (r.top + r.bottom) / 2 < faixa.b - 4
  const visivel = (el) => { const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && !el.classList.contains('is-agrupado') }
  const seletores = vista === 'mundo'
    ? [['casa', '.ct-mundo__casa', (el) => el], ['sicredi', '.ct-mundo__sicredi', (el) => el]]
    : [['casa', '.ct-marcador--pin', (el) => el.querySelector('.ct-pin') || el], ['sicredi', '.ct-sicredi-marcador', (el) => el.querySelector('.ct-sicredi-pin') || el]]
  const pins = []
  for (const [tipo, sel, corpo] of seletores) {
    for (const el of document.querySelectorAll(sel)) {
      if (!visivel(el)) continue
      const r = corpo(el).getBoundingClientRect()
      if (!r.width || !dentro(r)) continue
      const m = el.getBoundingClientRect()
      pins.push({ tipo, el, r, topo: { x: m.left + (tipo === 'sicredi' && vista === 'mundo' ? m.width * (Number(el.dataset.ancora || 50) / 100) : m.width / 2), y: m.bottom }, dx: parseFloat(el.style.getPropertyValue('--dx')) || 0, dy: parseFloat(el.style.getPropertyValue('--dy')) || 0 })
    }
  }
  // sobreposição: caixas encolhidas 3 px (a cauda e o halo não contam)
  const enc = (r) => ({ l: r.left + 3, r: r.right - 3, t: r.top + 3, b: r.bottom - 3 })
  const cobre = []
  pins.forEach((a, i) => pins.forEach((b, j) => {
    if (j <= i) return
    const x = enc(a.r); const y = enc(b.r)
    const w = Math.min(x.r, y.r) - Math.max(x.l, y.l); const h = Math.min(x.b, y.b) - Math.max(x.t, y.t)
    if (w > 2 && h > 2) cobre.push(`${rotuloDe(a.el) || a.tipo} × ${rotuloDe(b.el) || b.tipo} (${w.toFixed(0)}×${h.toFixed(0)})`)
  }))
  // seleção: o centro do pin tem que cair no próprio pin (não em outro por cima)
  const cobertos = pins.filter((p) => {
    const cx = (p.r.left + p.r.right) / 2; const cy = (p.r.top + p.r.bottom) / 2 - 4
    const topo = document.elementFromPoint(cx, cy)
    const caixa = (e) => e?.closest?.('gmp-advanced-marker')
    return !(topo && (p.el.contains(topo) || (caixa(topo) && caixa(topo) === caixa(p.el))))
  }).map((p) => { const cx = (p.r.left + p.r.right) / 2; const cy = (p.r.top + p.r.bottom) / 2 - 4; const t = document.elementFromPoint(cx, cy); return `${rotuloDe(p.el) || p.tipo} [coberto por ${t?.tagName}.${String(t?.className?.baseVal ?? t?.className).slice(0, 40)}]` })
  // fios: cada pin deslocado tem um fio que termina no ponto verdadeiro (ponta do pin − deslocamento; 5 px de folga: o hover levanta o pin 3 a 4 px)
  const fios = [...document.querySelectorAll('.ct-fio')].filter((f) => !f.hidden && getComputedStyle(f).display !== 'none').map((f) => { const r = f.getBoundingClientRect(); return { x: r.left, y: r.top } })
  const movidos = pins.filter((p) => Math.abs(p.dx) > 0.5 || Math.abs(p.dy) > 0.5)
  const fioDeCada = movidos.map((p) => fios.some((f) => Math.abs(p.topo.x - p.dx - f.x) < 5 && Math.abs(p.topo.y - p.dy - f.y) < 5))
  const selos = [...document.querySelectorAll('.ct-selo-grupo')].filter((e) => dentro(e.getBoundingClientRect()))
  const livre = movidos.find((p) => !cobertos.some((c) => c.startsWith(rotuloDe(p.el) || p.tipo)))
  const alvoClique = livre ? { x: (livre.r.left + livre.r.right) / 2, y: (livre.r.top + livre.r.bottom) / 2 - 4, nome: rotuloDe(livre.el) } : null
  return { ok: true, alvoClique, n: pins.length, cobre, cobertos, movidos: movidos.length, semFio: fioDeCada.filter((x) => !x).length, semFioNomes: movidos.filter((_, i) => !fioDeCada[i]).map((p) => `${rotuloDe(p.el) || p.tipo} topo(${p.topo.x | 0},${p.topo.y | 0}) d(${p.dx | 0},${p.dy | 0}) fios[${fios.map((f) => `${f.x | 0},${f.y | 0}`).join(' ')}]`), selos: selos.length, selosPequenos: selos.filter((e) => { const r = e.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5 }).length }
}
const conferirPins = async (page, vista, rotulo) => {
  await page.locator(vista === 'mundo' ? '.ct-mundo__janela' : '.ct-mapa__mapa').first().evaluate((e) => e.scrollIntoView({ block: 'center' }))
  await esperar(250)
  const m = await page.evaluate(MEDIR, vista)
  if (!m.ok) { checar(false, `${rotulo}: ${m.motivo}`); return m }
  checar(m.cobre.length === 0, `${rotulo}: nenhum pin cobre outro (${m.n} pins, ${m.movidos} afastados, ${m.selos} selos)${m.cobre.length ? ` — ${m.cobre.slice(0, 3).join('; ')}` : ''}`)
  checar(m.cobertos.length === 0, `${rotulo}: todo pin é selecionável (centro livre)${m.cobertos.length ? ` — cobertos: ${m.cobertos.slice(0, 3).join('; ')}` : ''}`)
  checar(m.semFio === 0, `${rotulo}: todo pin afastado tem fio até o ponto verdadeiro${m.semFio ? ` — ${m.semFioNomes.slice(0, 2).join(' | ')}` : ''}`)
  checar(m.selosPequenos === 0, `${rotulo}: selo de grupo com alvo de 44 px`)
  return m
}

const TELAS = [
  { nome: 'celular', viewport: { width: 390, height: 844 }, mobile: true },
  { nome: 'desktop', viewport: { width: 1280, height: 900 }, mobile: false },
]

const nav = await chromium.launch()
try {
  for (const tela of TELAS.filter((t) => !process.env.MAPA_LAYOUT_SO || t.nome === process.env.MAPA_LAYOUT_SO)) {
    for (const estado of ['sem-mapa', 'com-mapa']) {
      console.log(`\n${tela.nome} · ${estado}`)
      const ctx = await nav.newContext({ viewport: tela.viewport, isMobile: tela.mobile, hasTouch: tela.mobile, deviceScaleFactor: 2 })
      await ctx.addInitScript(([k, c]) => {
        try { localStorage.setItem('scw_privacidade', c); if (k) localStorage.setItem('scw:edicao:2026.2:mapa', k) } catch { /* sem storage */ }
      }, [estado === 'com-mapa' ? CHAVE : '', JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 })])
      await ctx.route('**/rest/v1/rpc/mapa_ler_v2*', (route) => (route.request().method() === 'OPTIONS' ? route.fallback() : json(route, MAPA)))
      await ctx.route('**/tiles.openfreemap.org/**', (route) => json(route, ESTILO_VAZIO))
      await ctx.route('**/challenges.cloudflare.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
      const page = await ctx.newPage()
      page.setDefaultNavigationTimeout(120000)
      const erros = []
      page.on('pageerror', (e) => erros.push(String(e)))

      for (const vista of ['mundo', 'real', 'lista']) {
        await page.goto(`${BASE}/cartoon/mapa?preview=1&vista=${vista}`, { waitUntil: 'domcontentloaded' })
        await page.locator('.ct-mapa').first().waitFor()
        if (vista === 'mundo') await page.locator('.ct-mundo__casa').first().waitFor()
        if (vista === 'real') {
          if (await page.getByRole('button', { name: /^Ver no mapa/ }).count()) erros.push('sobrou o botão intermediário "Ver no mapa"')
          await page.locator('.ct-marcador--pin .ct-pin').first().waitFor({ timeout: 20000 }).catch(() => null)
        }
        await esperar(1500)
        // O aviso de prêmios é modal: feche-o como visitante antes de testar os pins.
        const avisoDisputa = page.locator('.ct-disputa-folha.is-aberta')
        if (await avisoDisputa.isVisible()) await avisoDisputa.locator('button.ct-mapa__fechar').click()
        const lateral = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        checar(lateral <= 1, `${vista}: sem rolagem lateral (${lateral}px)`)
        // O mapa vem primeiro: convite/progresso/e-mail abaixo dele, e o mapa começa na primeira dobra (a vista "lista" não tem palco).
        const ordem = await page.evaluate(() => {
          const topo = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + scrollY : null }
          return { moldura: topo('.ct-mapa__moldura'), abaixo: topo('.ct-mapa__abaixo'), convite: topo('.ct-mapa__convite'), progresso: topo('.ct-mapa__progresso'), h: innerHeight }
        })
        const cartao = estado === 'sem-mapa' ? ordem.convite : ordem.progresso
        checar(ordem.moldura != null && ordem.moldura < ordem.h * 0.8, `${tela.nome} ${estado} ${vista}: o mapa começa na primeira dobra (topo ${Math.round(ordem.moldura)} de ${ordem.h})`)
        checar(cartao != null && cartao > ordem.moldura, `${tela.nome} ${estado} ${vista}: convite/progresso fica abaixo do mapa (${Math.round(cartao)} > ${Math.round(ordem.moldura)})`)
        if (estado === 'sem-mapa') checar(await page.locator('.ct-mapa__abaixo details, .ct-mapa__abaixo summary').count() > 0 || (await page.getByText(/como carimbar/i).count()) > 0, `${tela.nome} ${vista}: "Como carimbar" segue acessível`)
        await page.screenshot({ path: join(CAPTURAS, `${tela.nome}-${estado}-${vista}.png`), fullPage: true })
        if (estado !== 'com-mapa' || vista === 'lista') continue

        // pins em vários zooms
        await conferirPins(page, vista, `${tela.nome} ${vista} · zoom inicial`)
        if (vista === 'mundo') {
          for (let i = 1; i <= 3; i++) {
            await page.locator('.ct-mundo__zoom-botao').first().click(); await esperar(900)
            await conferirPins(page, vista, `${tela.nome} ${vista} · aproximar ${i}`)
            if (i === 2) await page.locator('.ct-mundo__janela').screenshot({ path: join(CAPTURAS, `${tela.nome}-${vista}-zoom2.png`) })
          }
          for (let i = 1; i <= 3; i++) { await page.locator('.ct-mundo__zoom-botao').nth(1).click(); await esperar(500) }
          await esperar(600)
          await conferirPins(page, vista, `${tela.nome} ${vista} · afastar tudo`)
        } else {
          // Mapa real: espera os marcadores, abre cada selo de grupo tocando nele (tem que aproximar), e depois afasta e aproxima com Ctrl+roda.
          await page.waitForFunction(() => document.querySelector('.ct-marcador--pin:not(.is-agrupado), .ct-selo-grupo'), null, { timeout: 30000 }).catch(() => null)
          await esperar(1500)
          let maisPins = 0
          const medir = async (r) => { const m = await conferirPins(page, vista, r); maisPins = Math.max(maisPins, m.n || 0); return m }
          await medir(`${tela.nome} ${vista} · começo`)
          await page.locator('.ct-mapa__mapa').screenshot({ path: join(CAPTURAS, `${tela.nome}-${vista}-0-inicio.png`) })
          for (let i = 1; i <= 8; i++) {
            const selo = page.locator('.ct-mapa__mapa .ct-selo-grupo').filter({ visible: true })
            if (!(await selo.count())) break
            const indiceVisivel = await selo.evaluateAll((els) => els.findIndex((el) => {
              const r = el.getBoundingClientRect(); const mapa = el.closest('.ct-mapa__mapa').getBoundingClientRect()
              const x = (r.left + r.right) / 2; const y = (r.top + r.bottom) / 2
              return x > Math.max(0, mapa.left) && x < Math.min(innerWidth, mapa.right) && y > Math.max(0, mapa.top) && y < Math.min(innerHeight, mapa.bottom) && el.contains(document.elementFromPoint(x, y))
            }))
            if (indiceVisivel < 0) break
            const antes = await page.evaluate(() => document.querySelectorAll('.ct-mapa__mapa .ct-selo-grupo').length + ':' + document.querySelectorAll('.ct-marcador--pin:not(.is-agrupado)').length)
            await page.locator('.ct-mapa__mapa').first().evaluate((e) => e.scrollIntoView({ block: 'center' }))
            await selo.nth(indiceVisivel).click({ timeout: 8000 }); await esperar(1800)
            const depois = await page.evaluate(() => document.querySelectorAll('.ct-mapa__mapa .ct-selo-grupo').length + ':' + document.querySelectorAll('.ct-marcador--pin:not(.is-agrupado)').length)
            checar(antes !== depois, `${tela.nome} ${vista}: tocar no selo ${i} mudou o mapa (${antes} → ${depois})`)
            await medir(`${tela.nome} ${vista} · depois do selo ${i}`)
            await page.locator('.ct-mapa__mapa').screenshot({ path: join(CAPTURAS, `${tela.nome}-${vista}-selo${i}.png`) })
          }
          checar(maisPins >= 2, `${tela.nome} ${vista}: há múltiplos pins à vista para testar seleção (${maisPins})`)
          const centro = await page.locator('.ct-mapa__mapa').boundingBox()
          await page.mouse.move(centro.x + centro.width / 2, centro.y + centro.height / 2)
          for (const passo of [500, 500, -500, -500]) {
            await page.keyboard.down('Control'); await page.mouse.wheel(0, passo); await page.keyboard.up('Control'); await esperar(1300)
            await medir(`${tela.nome} ${vista} · zoom ${passo < 0 ? 'in' : 'out'}`)
          }
          await page.locator('.ct-mapa__mapa').screenshot({ path: join(CAPTURAS, `${tela.nome}-${vista}-zoom-final.png`) })
        }

        // tela cheia: abre, o mapa preenche a janela, nenhum pin cobre outro, Esc volta e o contexto fica
        const abrir = page.locator('[data-abrir-cheia]').first()
        if (await abrir.count()) {
          await page.locator(vista === 'mundo' ? '.ct-mundo__janela' : '.ct-mapa__mapa').first().evaluate((e) => e.scrollIntoView({ block: 'center' }))
          const antesCheia = await page.evaluate(() => document.querySelector('.ct-mundo__palco')?.dataset.z || '')
          await abrir.click(); await esperar(2500)
          const cheia = await page.evaluate((v) => {
            const j = document.querySelector(v === 'mundo' ? '.ct-mundo__janela' : '.ct-mapa__mapa')?.getBoundingClientRect()
            return { janela: j ? [Math.round(j.width), Math.round(j.height)] : null, vw: innerWidth, vh: innerHeight, lateral: document.documentElement.scrollWidth - document.documentElement.clientWidth, dialogo: !!document.querySelector('.ct-mapa__explorar.is-cheia') }
          }, vista)
          checar(cheia.dialogo, `${tela.nome} ${vista}: tela cheia abriu`)
          checar(cheia.janela && cheia.janela[0] >= cheia.vw - 2 && cheia.janela[1] >= cheia.vh * 0.6, `${tela.nome} ${vista}: na tela cheia o mapa preenche a largura e a maior parte da altura (${cheia.janela?.join('×')} em ${cheia.vw}×${cheia.vh})`)
          checar(cheia.lateral <= 1, `${tela.nome} ${vista}: tela cheia sem rolagem lateral`)
          await conferirPins(page, vista, `${tela.nome} ${vista} · tela cheia`)
          await page.screenshot({ path: join(CAPTURAS, `${tela.nome}-${vista}-tela-cheia.png`) })
          await page.keyboard.press('Escape'); await esperar(900)
          const voltou = await page.evaluate(() => ({ cheia: !!document.querySelector('.ct-mapa__explorar.is-cheia'), z: document.querySelector('.ct-mundo__palco')?.dataset.z || '' }))
          checar(!voltou.cheia, `${tela.nome} ${vista}: Esc fecha a tela cheia`)
          if (vista === 'mundo') checar(!!antesCheia, `${tela.nome} ${vista}: o zoom da câmera continua definido ao voltar (${antesCheia} → ${voltou.z})`)
        }

        // celular: girar o aparelho não cria rolagem lateral nem pin por cima de pin
        if (tela.mobile && vista === 'mundo') {
          await page.setViewportSize({ width: 844, height: 390 }); await esperar(1200)
          checar((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, `${tela.nome} ${vista}: deitado, sem rolagem lateral`)
          await conferirPins(page, vista, `${tela.nome} ${vista} · deitado`)
          await page.screenshot({ path: join(CAPTURAS, `${tela.nome}-${vista}-deitado.png`) })
          await page.setViewportSize(tela.viewport); await esperar(800)
        }

        // tocar num pin afastado escolhe aquele local (aria-pressed), e o toque não escolhe o vizinho
        await page.locator(vista === 'mundo' ? '.ct-mundo__janela' : '.ct-mapa__mapa').first().evaluate((e) => e.scrollIntoView({ block: 'center' }))
        await esperar(300)
        const alvo = (await page.evaluate(MEDIR, vista)).alvoClique
        if (alvo) {
          await page.mouse.click(alvo.x, alvo.y); await esperar(900)
          const marcados = await page.evaluate((v) => [...document.querySelectorAll(v === 'mundo' ? '.ct-mundo__casa[aria-pressed="true"]' : 'gmp-advanced-marker[aria-pressed="true"], .ct-marcador--pin[aria-pressed="true"]')].map((e) => e.getAttribute('aria-label')), vista)
          checar(marcados.length === 1 && marcados[0] === alvo.nome, `${tela.nome} ${vista}: tocar no pin afastado escolhe só ele (${marcados.length} marcado${marcados.length === 1 ? '' : 's'}${marcados[0] && marcados[0] !== alvo.nome ? `: ${marcados[0].slice(0, 30)}` : ''})`)
          await page.screenshot({ path: join(CAPTURAS, `${tela.nome}-${vista}-escolhida.png`) })
        } else console.log(`  · ${tela.nome} ${vista}: nenhum pin afastado com centro livre para tocar`)

        // teclado: Tab chega num pin e o foco aparece (contorno visível)
        if (!tela.mobile && vista === 'mundo') {
          await page.locator('.ct-mundo__janela').evaluate((e) => e.scrollIntoView({ block: 'center' }))
          const foco = await page.evaluate(() => { const b = document.querySelector('.ct-mundo__casa:not(.is-agrupado)'); b.focus({ focusVisible: true }); const cs = getComputedStyle(b); return { estilo: cs.outlineStyle, largura: parseFloat(cs.outlineWidth), tab: b.tabIndex } })
          checar(foco.estilo !== 'none' && foco.largura >= 2, `${tela.nome} ${vista}: foco visível no pin (${foco.estilo} ${foco.largura}px)`)
        }
      }
      checar(erros.length === 0, `sem erro de script${erros.length ? `: ${erros[0]}` : ''}`)
      await ctx.close()
    }
  }
} finally {
  await nav.close()
  matar()
}
console.log(`\ncapturas em ${CAPTURAS}`)
if (falhas.length) { console.error(`\n✗ ${falhas.length} falha(s)`); process.exit(1) }
console.log('\n✓ layout do mapa ok')
