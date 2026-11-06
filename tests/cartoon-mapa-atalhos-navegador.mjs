/*
 * Atalhos FIXOS do mapa (06/11/2026), no navegador de verdade contra o BUILD de produção (vite preview): os três botões compactos na tela
 * cheia (padrão Progresso · Prêmios · Ranking), a escolha no menu "Atalhos" (três de seis, trava no quarto), a persistência no aparelho
 * (recarregar e limpar), cada botão abrindo a folha certa SEM mexer em zoom/posição/seleção, foco devolvido ao botão, e nenhum controle
 * cobrindo zoom, localização, "Atalhos" ou sair — em celular em pé (360, 390), tablet, desktop e celular deitado. O servidor é simulado
 * na rede; o banco NÃO é tocado.
 *   node tests/cartoon-mapa-atalhos-navegador.mjs [<pasta do build>]   (sem argumento, roda `vite build` num diretório temporário)
 *   MAPA_E2E_CAPTURAS=<pasta> grava as capturas.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'

const RAIZ = join(import.meta.dirname, '..')
const PORT = 4186
const BASE = `http://localhost:${PORT}`
const CAPTURAS = process.env.MAPA_E2E_CAPTURAS || join(tmpdir(), `mapa-atalhos-${Date.now().toString(36)}`)
mkdirSync(CAPTURAS, { recursive: true })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const falhas = []
const checar = (cond, msg) => { console.log(`  ${cond ? '✓' : '✗'} ${msg}`); if (!cond) falhas.push(msg) }

let dir = process.argv[2]
if (!dir) {
  dir = join(tmpdir(), `scw-atalhos-build-${Date.now().toString(36)}`)
  execSync(`npx vite build --outDir "${dir}" --emptyOutDir`, { cwd: RAIZ, stdio: 'ignore' })
}
const servidor = spawn('npx', ['vite', 'preview', '--outDir', dir, '--port', String(PORT), '--strictPort'], { cwd: RAIZ, shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
const matar = () => { if (servidor?.pid) { try { process.platform === 'win32' ? execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' }) : process.kill(-servidor.pid, 'SIGKILL') } catch { /* já morto */ } } }
const responde = async () => { try { return (await fetch(`${BASE}/cartoon`, { signal: AbortSignal.timeout(1500) })).ok } catch { return false } }
for (let i = 0; i < 120 && !(await responde()); i++) await esperar(350)

const CHAVE = 'A'.repeat(32)
const MAPA = {
  edicao: '2026.2', apelido: 'E2E', email: 'e2e@exemplo.com.br', whatsapp: null, no_ranking: true, principal: true, total_casas: 26,
  casas_validadas: 2, extras: 0, faltam: 24, posicao: 2, empatados: 1,
  casas: [{ slug: 'casa-0', carimbos: 1, avaliou: true, estado: 'validada', extras: 0 }, { slug: 'casa-1', carimbos: 1, avaliou: true, estado: 'validada', extras: 0 }],
}
const DIAS = ['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11']
const PREMIOS = { agora: '2026-11-08T15:00:00Z', fuso: 'America/Fortaleza', corte_hora_local: '23:59', voucher_validade_ate: '2026-11-15', ganhadores_final: 3, dias: DIAS.map((dia, i) => ({ dia, corte: `${dia}T23:59:00-03:00`, estado: ['resultado', 'em_disputa', 'proximo', 'proximo', 'proximo'][i] })) }
const METAS = { total_casas: 26, casas_validadas: 2, metas: [{ casas: 5, titulo: 'Passeio', completa: false }, { casas: 26, titulo: 'Mapa completo', completa: false }] }
const ESTILO_VAZIO = { version: 8, sources: {}, layers: [{ id: 'fundo', type: 'background', paint: { 'background-color': '#FDF0DE' } }] }
const json = (route, corpo) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corpo) })
const rpc = (nome) => `**/rest/v1/rpc/${nome}*`
const ehOpcoes = (route) => route.request().method() === 'OPTIONS'

async function abrir (nav, { w, h, toque = false }) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque, deviceScaleFactor: toque ? 2 : 1 })
  await ctx.addInitScript(([k, c]) => {
    try { localStorage.setItem('scw_privacidade', c); localStorage.setItem('scw:edicao:2026.2:mapa', k) } catch { /* sem storage */ }
  }, [CHAVE, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 })])
  await ctx.route(rpc('mapa_ler_v2'), (r) => (ehOpcoes(r) ? r.fallback() : json(r, MAPA)))
  await ctx.route(rpc('caca_metas_ler'), (r) => (ehOpcoes(r) ? r.fallback() : json(r, METAS)))
  await ctx.route(rpc('caca_premios_publico'), (r) => (ehOpcoes(r) ? r.fallback() : json(r, PREMIOS)))
  await ctx.route('**/tiles.openfreemap.org/**', (r) => json(r, ESTILO_VAZIO))
  await ctx.route('**/challenges.cloudflare.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e.message || e).slice(0, 200)))
  await page.goto(`${BASE}/cartoon/mapa?preview=1`, { waitUntil: 'networkidle', timeout: 120000 })
  await entrarNaTelaCheia(page)
  return { ctx, page, erros }
}
async function entrarNaTelaCheia (page) {
  await page.locator('.ct-mundo__palco').waitFor({ timeout: 30000 })
  await page.locator('.ct-mapa__ampliar').first().click()
  await page.locator('.ct-jogo__botao').waitFor({ timeout: 10000 })
}
const nomesFixos = (page) => page.locator('.ct-jogo__fixo').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')))
const guardado = (page) => page.evaluate(() => { try { return localStorage.getItem('scw_atalhos_fixos') } catch { return 'indisponível' } })
const camera = (page) => page.locator('.ct-mundo__palco').evaluate((p) => `${p.dataset.z}|${p.dataset.x}|${p.dataset.y}`)

/** Caixas (px) dos controles do mapa na tela cheia: nenhum fixo pode cobrir outro controle nem sair da tela. */
async function geometria (page) {
  return page.evaluate(() => {
    const r = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height } }
    const fixos = [...document.querySelectorAll('.ct-jogo__fixo')].map(r)
    const outros = [['zoom', '.ct-mundo__zoom'], ['atalhos', '.ct-jogo__botao'], ['perto', '.ct-mapa__perto-botao'], ['sair', '.ct-mapa__sair'], ['filtros', '.ct-mapa__filtros-botao'], ['rota', '.ct-mapa__rota-botao']]
      .map(([n, q]) => [n, document.querySelector(q)]).filter(([, e]) => e && e.getBoundingClientRect().width).map(([n, e]) => [n, r(e)])
    const barra = r(document.querySelector('.ct-mapa__barra'))
    const bate = (a, b) => !(a.r <= b.l + 0.5 || a.l >= b.r - 0.5 || a.b <= b.t + 0.5 || a.t >= b.b - 0.5)
    return {
      fixos, iw: innerWidth, ih: innerHeight, lateral: document.documentElement.scrollWidth - innerWidth, abaixoDaBarra: fixos.every((f) => f.t >= barra.b - 1),
      cobre: fixos.flatMap((f, i) => outros.filter(([, o]) => bate(f, o)).map(([n]) => `fixo${i + 1}×${n}`)),
    }
  })
}

const TELAS = [[360, 740, true], [390, 844, true], [768, 1024, true], [1440, 900, false], [844, 390, true]]

let nav
try {
  nav = await chromium.launch()

  for (const [w, h, toque] of TELAS) {
    const onde = `@${w}x${h}`
    console.log(`\ntela cheia ${onde}`)
    const c = await abrir(nav, { w, h, toque })
    const p = c.page

    // 1 · padrão, ícones, alvos e posição
    checar((await nomesFixos(p)).join('|') === 'Progresso|Prêmios|Ranking', `${onde}: padrão Progresso · Prêmios · Ranking (${(await nomesFixos(p)).join(' · ')})`)
    const g = await geometria(p)
    checar(g.fixos.length === 3 && g.fixos.every((f) => f.w >= 43.5 && f.h >= 43.5), `${onde}: três botões, cada um com alvo ≥ 44px`)
    checar(g.fixos.every((f) => f.l >= 0 && f.r <= g.iw && f.b <= g.ih) && g.abaixoDaBarra, `${onde}: dentro da tela e abaixo da barra`)
    checar(g.cobre.length === 0, `${onde}: não cobrem zoom, localização, Atalhos, sair nem a barra${g.cobre.length ? ` — ${g.cobre.join(', ')}` : ''}`)
    checar(g.lateral <= 1, `${onde}: sem rolagem lateral`)
    const srcs = await p.locator('.ct-jogo__fixo img').evaluateAll((is) => is.map((i) => i.getAttribute('src')))
    checar(new Set(srcs).size === 3 && srcs.every((s) => /\/icones\/.+\.webp$/.test(s)), `${onde}: ícones distintos (${srcs.map((s) => s.split('/').pop()).join(' · ')})`)
    checar(srcs[1].endsWith('trofeu.webp') && srcs[2].endsWith('podio.webp'), `${onde}: Prêmios = troféu, Ranking = pódio`)
    const rotulosVisiveis = await p.locator('.ct-jogo__fixo span').first().isVisible()
    checar(rotulosVisiveis === (w >= 480), `${onde}: rótulo ${w >= 480 ? 'à vista' : 'só no nome acessível'} (aria-label sempre)`)
    await p.screenshot({ path: join(CAPTURAS, `fixos-${w}x${h}.png`) })

    // 2 · cada fixo abre a função existente, sem mexer no mapa, e devolve o foco
    await p.getByRole('button', { name: /aproximar/i }).first().click().catch(() => null)
    await esperar(600)
    const antes = await camera(p)
    for (const [nome, titulo] of [['Progresso', 'Progresso e carimbos'], ['Prêmios', 'Prêmios'], ['Ranking', 'Ranking']]) {
      await p.locator(`.ct-jogo__fixo[aria-label="${nome}"]`).click()
      const dlg = p.getByRole('dialog', { name: titulo, exact: true })
      await dlg.waitFor({ timeout: 8000 })
      await esperar(400)
      checar(await p.locator('.ct-folha-m--jogo').count() === 1, `${onde}: ${nome}: uma folha só`)
      checar(await dlg.evaluate((d) => { const b = d.getBoundingClientRect(); return b.left >= -1 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1 }), `${onde}: ${nome}: a folha cabe na tela`)
      await p.keyboard.press('Escape'); await esperar(300)
      checar(await p.locator('.ct-folha-m--jogo').count() === 0, `${onde}: ${nome}: Escape fecha`)
      checar(await p.evaluate(() => document.activeElement?.getAttribute('data-atalho-fixo')) === { Progresso: 'progresso', Prêmios: 'premios', Ranking: 'ranking' }[nome], `${onde}: ${nome}: o foco volta ao botão fixo`)
    }
    checar(await camera(p) === antes, `${onde}: zoom e posição do mapa preservados (${antes})`)

    // 3 · o menu continua com os seis, mais a escolha
    await p.locator('.ct-jogo__botao').click()
    const itens = (await p.locator('.ct-jogo__lista [data-atalho]').allInnerTexts()).map((t) => t.trim())
    checar(itens.join('|') === 'Progresso|Casas|Rota|Prêmios|Ranking|Grupos', `${onde}: o menu mantém os seis (${itens.join(' · ')})`)
    await p.locator('[data-config-fixos]').click()
    const marcados = await p.locator('[data-fixo-opcao]').evaluateAll((is) => is.filter((i) => i.checked).map((i) => i.dataset.fixoOpcao))
    checar(marcados.join('|') === 'progresso|premios|ranking', `${onde}: a escolha mostra os três atuais`)
    const travadas = await p.locator('[data-fixo-opcao]:disabled').evaluateAll((is) => is.map((i) => i.dataset.fixoOpcao))
    checar(travadas.join('|') === 'casas|rota|grupos', `${onde}: com três marcados, as outras travam (${travadas.join(', ')})`)
    await p.locator('[data-fixo-opcao="premios"]').uncheck()
    checar((await nomesFixos(p)).join('|') === 'Progresso|Prêmios|Ranking', `${onde}: com dois, a barra só muda ao completar três`)
    checar(/Escolha mais um atalho/.test(await p.locator('.ct-jogo__escolha-estado').innerText()), `${onde}: o estado diz quantos faltam`)
    checar(await p.locator('.ct-jogo__pronto').isDisabled(), `${onde}: "Pronto" espera o terceiro`)
    await p.locator('[data-fixo-opcao="grupos"]').check()
    checar((await nomesFixos(p)).join('|') === 'Progresso|Ranking|Grupos', `${onde}: três marcados valem na hora (${(await nomesFixos(p)).join(' · ')})`)
    checar(JSON.parse(await guardado(p)).join() === 'progresso,ranking,grupos', `${onde}: guardado só no aparelho`)
    const gl = await p.locator('.ct-jogo__lista').evaluate((l) => { const b = l.getBoundingClientRect(); return { r: b.right, b: b.bottom, iw: innerWidth, ih: innerHeight } })
    checar(gl.r <= gl.iw + 1 && gl.b <= gl.ih + 1, `${onde}: o menu com a escolha cabe na tela`)
    await p.screenshot({ path: join(CAPTURAS, `escolha-${w}x${h}.png`) })
    await p.locator('.ct-jogo__pronto').click()
    checar(await p.locator('.ct-jogo__escolha').count() === 0, `${onde}: "Pronto" fecha a escolha`)

    // 4 · o novo fixo funciona (Grupos) e o item do menu também
    await p.locator('.ct-jogo__fixo[aria-label="Grupos"]').click()
    await p.getByRole('dialog', { name: 'Grupos', exact: true }).waitFor({ timeout: 8000 })
    await p.keyboard.press('Escape'); await esperar(300)
    await p.locator('.ct-jogo__botao').click()
    await p.locator('[data-atalho="premios"]').click()
    await p.getByRole('dialog', { name: 'Prêmios', exact: true }).waitFor({ timeout: 8000 })
    checar(await p.evaluate(() => document.activeElement?.closest('.ct-folha-m--jogo') != null), `${onde}: Prêmios, mesmo fora dos fixos, abre pelo menu`)
    await p.keyboard.press('Escape'); await esperar(300)
    checar(await p.evaluate(() => document.activeElement?.hasAttribute('data-atalhos')), `${onde}: aberto pela lista, o foco volta ao botão Atalhos`)

    // 5 · persistência: recarrega e a escolha segue
    await p.reload({ waitUntil: 'networkidle' })
    await entrarNaTelaCheia(p)
    checar((await nomesFixos(p)).join('|') === 'Progresso|Ranking|Grupos', `${onde}: depois de recarregar a escolha continua`)

    // 6 · sem preferência (ou inválida) volta ao padrão, sem erro
    await p.evaluate(() => localStorage.setItem('scw_atalhos_fixos', '["x"]'))
    await p.reload({ waitUntil: 'networkidle' })
    await entrarNaTelaCheia(p)
    checar((await nomesFixos(p)).join('|') === 'Progresso|Prêmios|Ranking', `${onde}: preferência inválida volta ao padrão`)
    checar(c.erros.length === 0, `${onde}: sem erro de página${c.erros[0] ? ` — ${c.erros[0]}` : ''}`)
    await c.ctx.close()
  }

  console.log('\nsem localização e sem armazenamento: o mapa continua com os três fixos do padrão')
  {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    await ctx.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get () { throw new Error('bloqueado') } }) })
    await ctx.route(rpc('mapa_ler_v2'), (r) => (ehOpcoes(r) ? r.fallback() : json(r, null)))
    await ctx.route('**/tiles.openfreemap.org/**', (r) => json(r, ESTILO_VAZIO))
    await ctx.route('**/challenges.cloudflare.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
    const p = await ctx.newPage()
    const erros = []; p.on('pageerror', (e) => erros.push(String(e.message || e).slice(0, 160)))
    await p.goto(`${BASE}/cartoon/mapa?preview=1`, { waitUntil: 'networkidle', timeout: 120000 })
    await entrarNaTelaCheia(p)
    checar((await nomesFixos(p)).join('|') === 'Progresso|Prêmios|Ranking', 'armazenamento bloqueado: padrão, sem quebrar')
    await p.locator('.ct-jogo__botao').click(); await p.locator('[data-config-fixos]').click()
    await p.locator('[data-fixo-opcao="premios"]').uncheck(); await p.locator('[data-fixo-opcao="casas"]').check()
    checar((await nomesFixos(p)).join('|') === 'Progresso|Ranking|Casas', 'sem armazenamento a escolha vale até recarregar')
    checar(erros.length === 0, `sem erro de página${erros[0] ? ` — ${erros[0]}` : ''}`)
    await ctx.close()
  }
} catch (e) { falhas.push(`erro fatal: ${String(e.message || e).split('\n')[0]}`); console.log(`✗ erro fatal: ${e.message}`) } finally {
  await nav?.close().catch(() => null)
  matar()
}
console.log(`\ncapturas em ${CAPTURAS}`)
if (falhas.length) { console.log(`\n✗ ${falhas.length} falha(s)`); process.exit(1) }
console.log('\n✓ mapa: atalhos fixos ok')
