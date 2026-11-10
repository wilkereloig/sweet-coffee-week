/*
 * Aba "Prêmios" do Mapa da Doçura, no navegador de verdade: painel do mapa normal (desktop e celular), folha dos atalhos na tela
 * cheia, os cinco estados da pessoa (sem mapa, vazio, carimbo pendente, casas validadas, completo), falha do servidor e a
 * posição do mapa preservada ao abrir e fechar. O servidor da Caça é simulado na rede (mapa_ler_v2, caca_premios_publico,
 * caca_metas_ler); o banco não é tocado. Precisa do vite dev na 5212.
 *   MAPA_E2E_REUSAR=1 reaproveita o servidor · MAPA_E2E_CAPTURAS=<pasta> grava as capturas.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'

const PORT = 5212
const BASE = `http://localhost:${PORT}`
const CAPTURAS = process.env.MAPA_E2E_CAPTURAS || join(tmpdir(), `mapa-premios-${Date.now().toString(36)}`)
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

const CHAVE = 'E'.repeat(32)
const DIAS = ['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11']
const PERIODO = (estado) => ({ inicio: '2026-11-05', fim: '2026-11-15', estado })
const PREMIOS = (estados, periodo = 'aberta') => ({
  agora: '2026-11-08T15:00:00Z', periodo: periodo ? PERIODO(periodo) : undefined, fuso: 'America/Fortaleza', corte_hora_local: '23:59', voucher_validade_ate: '2026-11-15', ganhadores_final: 3,
  dias: DIAS.map((dia, i) => ({ dia, corte: `${dia}T23:59:00-03:00`, estado: estados[i] })),
})
const DURANTE = PREMIOS(['resultado', 'em_disputa', 'proximo', 'proximo', 'proximo'])
const mapa = (feitas, { pendentes = 0, extras = 0 } = {}) => ({
  edicao: '2026.2', apelido: 'E2E', email: 'e2e@exemplo.com.br', whatsapp: null, no_ranking: true, principal: true, total_casas: 26,
  casas_validadas: feitas, extras, faltam: 26 - feitas, posicao: feitas ? 2 : null, empatados: 1,
  casas: [
    ...Array.from({ length: feitas }, (_, i) => ({ slug: `casa-${i}`, carimbos: 1, avaliou: true, estado: 'validada', extras: 0 })),
    ...Array.from({ length: pendentes }, (_, i) => ({ slug: `pend-${i}`, carimbos: 1, avaliou: false, estado: 'pendente', extras: 0 })),
  ],
})
const METAS = (feitas) => ({ total_casas: 26, casas_validadas: feitas, metas: [{ casas: 5, titulo: 'Passeio', completa: false }, { casas: 13, titulo: 'Meio caminho', completa: false }, { casas: 26, titulo: 'Mapa completo', completa: true }] })
const ESTILO_VAZIO = { version: 8, sources: {}, layers: [{ id: 'fundo', type: 'background', paint: { 'background-color': '#FDF0DE' } }] }
const json = (route, corpo) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corpo) })
const rpc = (nome) => `**/rest/v1/rpc/${nome}*`
const ehOpcoes = (route) => route.request().method() === 'OPTIONS'

async function abrir (nav, { w, h, toque = false, meuMapa = null, premios = DURANTE, premiosFalha = false, url = '/cartoon/mapa?tela=normal&preview=1' }) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque, deviceScaleFactor: toque ? 2 : 1 })
  await ctx.addInitScript(([k, c, comMapa]) => {
    try { localStorage.setItem('scw_privacidade', c); if (comMapa) localStorage.setItem('scw:edicao:2026.2:mapa', k) } catch { /* sem storage */ }
  }, [CHAVE, JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 }), !!meuMapa])
  await ctx.route(rpc('mapa_ler_v2'), (r) => (ehOpcoes(r) ? r.fallback() : json(r, meuMapa)))
  await ctx.route(rpc('caca_metas_ler'), (r) => (ehOpcoes(r) ? r.fallback() : json(r, METAS(meuMapa?.casas_validadas ?? 0))))
  await ctx.route(rpc('caca_premios_publico'), (r) => (ehOpcoes(r) ? r.fallback() : premiosFalha ? r.fulfill({ status: 404, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"message":"function not found"}' }) : json(r, premios)))
  await ctx.route('**/tiles.openfreemap.org/**', (r) => json(r, ESTILO_VAZIO))
  await ctx.route('**/challenges.cloudflare.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e.message || e).slice(0, 200)))
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.locator('.ct-mundo__palco').waitFor({ timeout: 30000 })
  return { ctx, page, erros }
}
const lateral = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const texto = (page) => page.locator('.ct-premios').innerText()

let nav
try {
  nav = await chromium.launch()

  console.log('\nmapa normal · desktop 1440 · sem mapa (painel Prêmios por endereço)')
  {
    const c = await abrir(nav, { w: 1440, h: 900, url: '/cartoon/mapa?tela=normal&preview=1&painel=premios' })
    await c.page.locator('.ct-premios').waitFor({ timeout: 15000 })
    await c.page.getByText('Em disputa agora').waitFor({ timeout: 10000 })
    const t = await texto(c.page)
    checar(/Em disputa agora/i.test(t) && /Domingo, 8 de novembro/.test(t), 'mostra primeiro o voucher relevante: o dia em disputa (8 de novembro)')
    checar(/1 voucher em disputa/.test(t) && /5 dias com voucher em disputa/.test(t), 'um voucher por dia, 5 dias (vindos do servidor)')
    checar(/Complete as \d+ casas/.test(t) && /3 ganhadores previstos/.test(t) && /press kit oficial da edição e uma surpresa/.test(t), 'prêmio final: completar as casas, 3 ganhadores, press kit e surpresa')
    checar(/não uma chance garantida/.test(t) && !/%/.test(t), 'vantagem dos extras sem percentual nem promessa')
    checar(/Criar meu mapa/i.test(t), 'sem mapa: ação clara para criar o mapa, sem bloquear a consulta')
    checar(/Casa validada/.test(t) && /Carimbo extra/.test(t) && /Já fui/.test(t), 'diferencia casa validada, carimbo extra e "Já fui"')
    await c.page.getByText('Ver todos os dias').click()
    const lista = await c.page.locator('.ct-premios__dia').allInnerTexts()
    checar(lista.length === 5 && /Resultado confirmado/.test(lista[0]) && /Disputa em andamento/.test(lista[1]) && /Disputa em andamento/.test(lista[2]) && !lista.some((l) => /Em breve/.test(l)), 'lista dos 5 dias com estado de cada um (confirmado, disputa em andamento nos demais, nunca "em breve")')
    await c.page.getByText('Como o voucher do dia é decidido').click()
    const r = await texto(c.page)
    checar(/até as 23h59/.test(r) && /valem até 15 de novembro/.test(r) && /no máximo um voucher por dia/.test(r), 'regras curtas com corte e validade lidos do servidor')
    checar(!/ganhou|entregue/i.test(r), 'nenhuma afirmação de ganhador ou entrega')
    checar(await lateral(c.page) <= 1, 'sem rolagem lateral')
    await c.page.screenshot({ path: join(CAPTURAS, 'desktop-sem-mapa.png') })
    checar(c.erros.length === 0, `sem erro de página${c.erros[0] ? ` — ${c.erros[0]}` : ''}`)
    await c.ctx.close()
  }

  const ESTADOS = [
    ['mapa vazio', mapa(0), [/Seu mapa está vazio/, /0 de 26 casas validadas/, /Faltam 26 casas/]],
    ['carimbo pendente', mapa(0, { pendentes: 2 }), [/0 de 26 casas validadas/, /2 carimbos aguardam avaliação\. Só contam quando forem validados/]],
    ['casas validadas', mapa(7, { extras: 3 }), [/7 de 26 casas validadas/, /Faltam 19 casas/, /3 carimbos extras/, /Meio caminho: faltam 6 casas/, /não dão prêmio/]],
    ['mapa completo', mapa(26), [/26 de 26 casas validadas/, /Mapa completo: você concorre ao prêmio final/, /Mapa completo!/]],
  ]
  for (const [nome, m, esperado] of ESTADOS) {
    console.log(`\nmapa normal · celular 390 · ${nome}`)
    const c = await abrir(nav, { w: 390, h: 844, toque: true, meuMapa: m, url: '/cartoon/mapa?tela=normal&preview=1&painel=premios' })
    await c.page.locator('.ct-premios').waitFor({ timeout: 15000 })
    await c.page.getByText(/Em disputa agora/).waitFor({ timeout: 10000 })
    if (/casas validadas/.test(nome)) await c.page.getByText('Metas comemorativas').waitFor({ timeout: 10000 })
    await esperar(300)
    const t = await texto(c.page)
    for (const re of esperado) checar(re.test(t), `${nome}: ${re}`)
    checar(!/Criar meu mapa/i.test(t), `${nome}: com mapa não pede para criar de novo`)
    checar(await lateral(c.page) <= 1, `${nome}: sem rolagem lateral`)
    await c.page.screenshot({ path: join(CAPTURAS, `celular-${nome.replace(/\s+/g, '-')}.png`) })
    checar(c.erros.length === 0, `${nome}: sem erro de página${c.erros[0] ? ` — ${c.erros[0]}` : ''}`)
    await c.ctx.close()
  }

  console.log('\nantes e depois dos dias (estado vem do servidor)')
  for (const [rot, estados, foco, esperado, periodo] of [
    ['antes de tudo', ['proximo', 'proximo', 'proximo', 'proximo', 'proximo'], /Próximo voucher[\s\S]*Sábado, 7 de novembro/i, /Disputa em andamento[\s\S]*você já pode acumular carimbos[\s\S]*mais casas diferentes validadas[\s\S]*sorteio/],
    ['Caça ainda não aberta', ['proximo', 'proximo', 'proximo', 'proximo', 'proximo'], /Próximo voucher[\s\S]*Sábado, 7 de novembro/i, /Em breve[\s\S]*A disputa deste dia ainda não começou[\s\S]*Os carimbos passam a valer em 5 de novembro/, 'antes'],
    ['dia encerrado, sem confirmação', ['em_apuracao', 'proximo', 'proximo', 'proximo', 'proximo'], /Próximo voucher[\s\S]*Domingo, 8 de novembro/i, /O dia 7\/11 encerrou e está em apuração\. Ainda não há resultado confirmado/],
    ['tudo confirmado', ['resultado', 'resultado', 'resultado', 'resultado', 'resultado'], /Último resultado[\s\S]*Quarta, 11 de novembro/i, /Resultado confirmado/],
  ]) {
    const c = await abrir(nav, { w: 1440, h: 900, premios: PREMIOS(estados, periodo), url: '/cartoon/mapa?tela=normal&preview=1&painel=premios' })
    await c.page.locator('.ct-premios__destaque').waitFor({ timeout: 15000 })
    await c.page.screenshot({ path: join(CAPTURAS, `dias-${rot.replace(/[^a-z0-9]+/gi, '-')}.png`) })
    const t = await texto(c.page)
    checar(foco.test(t), `${rot}: o voucher em foco é o certo`)
    checar(esperado.test(t), `${rot}: estado ${esperado}`)
    await c.ctx.close()
  }

  console.log('\nfalha / atraso dos dados de apuração')
  {
    const c = await abrir(nav, { w: 1440, h: 900, premiosFalha: true, url: '/cartoon/mapa?tela=normal&preview=1&painel=premios' })
    await c.page.getByText(/não estão disponíveis agora/).waitFor({ timeout: 15000 })
    const t = await texto(c.page)
    checar(/Tentar de novo/i.test(t), 'falha: estado honesto com "Tentar de novo"')
    checar(!/Domingo|Em disputa|ganhou/.test(t), 'falha: nenhuma data, estado ou ganhador inventado')
    checar(/Complete as \d+ casas/.test(t) && /ganhadores previstos/.test(t) && !/3 ganhadores/.test(t), 'falha: o prêmio final segue legível, sem número que o servidor não confirmou')
    checar(c.erros.length === 0, 'falha: sem erro de página')
    await c.ctx.close()
  }

  console.log('\ntela cheia · celular 390 · atalho Prêmios (mapa preservado)')
  {
    const c = await abrir(nav, { w: 390, h: 844, toque: true, meuMapa: mapa(7, { extras: 3 }) })
    await c.page.locator('.ct-mapa__ampliar').first().click()
    await c.page.locator('[data-atalhos]').waitFor({ timeout: 10000 })
    // aproxima o mapa: o zoom tem que sobreviver a abrir e fechar a folha
    await c.page.getByRole('button', { name: /aproximar/i }).first().click(); await esperar(700)
    const z0 = await c.page.locator('.ct-mundo__palco').getAttribute('data-z')
    await c.page.locator('[data-atalhos]').click()
    const itens = await c.page.locator('.ct-jogo__item').allInnerTexts()
    checar(itens.map((s) => s.trim()).join('|') === 'Progresso|Casas|Rota|Prêmios|Ranking|Grupos|Pedir carimbo|Escolher atalhos fixos', `atalhos: ${itens.map((s) => s.trim()).join(' · ')}`)
    await c.page.locator('[data-atalho="premios"]').click()
    await c.page.locator('.ct-premios').waitFor({ timeout: 10000 })
    await c.page.getByText(/Em disputa agora/).waitFor({ timeout: 10000 })
    checar(/7 de 26 casas validadas/.test(await texto(c.page)), 'folha Prêmios abre com o progresso pessoal')
    const folha = await c.page.locator('.ct-folha-m--jogo .ct-folha-m__corpo').boundingBox()
    checar(folha && folha.y >= 60 && folha.x >= 0 && folha.x + folha.width <= 391, 'a folha fica dentro da tela e deixa a barra visível')
    checar(await lateral(c.page) <= 1, 'sem rolagem lateral')
    await c.page.screenshot({ path: join(CAPTURAS, 'cheia-celular-premios.png') })
    await c.page.keyboard.press('Escape'); await esperar(500)
    checar(await c.page.locator('.ct-premios').count() === 0, 'Esc fecha a folha')
    checar(await c.page.locator('.ct-mundo__palco').getAttribute('data-z') === z0, `zoom do mapa preservado (${z0})`)
    checar(await c.page.locator('[data-atalhos]').isVisible(), 'continua na tela cheia, com o botão Atalhos')
    checar(c.erros.length === 0, `sem erro de página${c.erros[0] ? ` — ${c.erros[0]}` : ''}`)
    await c.ctx.close()
  }

  console.log('\ntela cheia · desktop 1440 · atalho Prêmios')
  {
    const c = await abrir(nav, { w: 1440, h: 900 })
    await c.page.locator('.ct-mapa__ampliar').first().click()
    await c.page.locator('[data-atalhos]').click()
    await c.page.locator('[data-atalho="premios"]').click()
    await c.page.getByText(/Em disputa agora/).waitFor({ timeout: 10000 })
    checar(/Criar meu mapa/i.test(await texto(c.page)), 'desktop sem mapa: convite para criar o mapa')
    await c.page.screenshot({ path: join(CAPTURAS, 'cheia-desktop-premios.png') })
    await c.ctx.close()
  }
} catch (e) { falhas.push(`erro fatal: ${String(e.message || e).split('\n')[0]}`); console.log(`✗ erro fatal: ${e.message}`) } finally {
  await nav?.close().catch(() => null)
  matar()
}
console.log(`\ncapturas em ${CAPTURAS}`)
if (falhas.length) { console.log(`\n✗ ${falhas.length} falha(s)`); process.exit(1) }
console.log('\n✓ mapa: aba Prêmios ok')
