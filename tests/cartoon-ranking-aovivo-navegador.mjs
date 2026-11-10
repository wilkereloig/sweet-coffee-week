/*
 * Ranking durante o uso (09/11/2026): a lista se atualiza sem recarregar, diz quando atualizou, mantém o último ranking quando a rede cai e
 * mostra o indicador de ritmo só quando há avanço. O servidor é SIMULADO na rede do navegador (rotas das RPCs): o banco não é tocado e
 * nenhum mapa é criado. Porta 5213 (a dos testes do mapa; rodar um de cada vez).
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'

const PORT = 5213
const BASE = `http://localhost:${PORT}`
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const falhas = []
const checar = (cond, msg) => { console.log(`  ${cond ? '✓' : '✗'} ${msg}`); if (!cond) falhas.push(msg) }
const responde = async () => { try { return (await fetch(`${BASE}/cartoon`, { signal: AbortSignal.timeout(30000) })).ok } catch { return false } }

let servidor = null
if (!(await responde())) {
  servidor = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  for (let i = 0; i < 120 && !(await responde()); i++) await esperar(350)
}
const matar = () => { if (servidor?.pid) { try { process.platform === 'win32' ? execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' }) : process.kill(-servidor.pid, 'SIGKILL') } catch { /* já morto */ } } }

const navegador = await chromium.launch()
try {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  let ranking = [{ posicao: 1, apelido: 'Ana Teste', casas: 5, extras: 1 }, { posicao: 2, apelido: 'Beto Teste', casas: 3, extras: 0 }]
  let ritmo = [{ apelido: 'Beto Teste', casas_novas: 2, extras_novos: 0 }]
  let cair = false
  let consultas = 0
  await ctx.route('**/rest/v1/rpc/caca_ranking_publico*', (route) => { consultas += 1; return cair ? route.abort() : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ranking) }) })
  await ctx.route('**/rest/v1/rpc/caca_ritmo_publico*', (route) => (cair ? route.abort() : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ horas: 24, ritmo, atualizado_em: new Date().toISOString() }) })))

  await page.goto(`${BASE}/cartoon/caca/ranking`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-rank-atualizar]').waitFor({ timeout: 45000 })
  const texto = () => page.locator('.ct-rank__pagina').innerText()
  checar((await texto()).includes('Ana Teste'), 'a lista aparece')
  checar(/Atualizado agora há pouco/.test(await texto()), 'diz quando atualizou')
  checar((await texto()).includes('Quem mais avançou nas últimas 24 horas') && (await texto()).includes('+2 casas'), 'ritmo: avanço recente com período dito')
  checar(/Não muda a classificação/.test(await texto()), 'ritmo: avisa que não muda a classificação')

  // Outra pessoa passa à frente: "Atualizar agora" traz a ordem nova sem recarregar a página.
  ranking = [{ posicao: 1, apelido: 'Beto Teste', casas: 6, extras: 0 }, { posicao: 2, apelido: 'Ana Teste', casas: 5, extras: 1 }]
  ritmo = []
  const antes = consultas
  await page.locator('[data-rank-atualizar]').click()
  await page.waitForFunction(() => document.querySelector('.ct-rank__pagina')?.innerText.indexOf('Beto Teste') < document.querySelector('.ct-rank__pagina')?.innerText.indexOf('Ana Teste'), null, { timeout: 15000 }).catch(() => {})
  const t2 = await texto()
  checar(t2.indexOf('Beto Teste') < t2.indexOf('Ana Teste') && consultas > antes, 'atualiza durante o uso (nova ordem, sem recarregar)')
  checar(!t2.includes('Quem mais avançou'), 'ritmo: sem avanço na janela o bloco some (ausência não vira zero)')

  // Voltar à aba dispara a releitura.
  const antesDaVolta = consultas
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await esperar(1500)
  checar(consultas > antesDaVolta, 'voltar à aba relê o ranking')

  // Rede cai: o último ranking fica na tela, com o aviso.
  cair = true
  await page.locator('[data-rank-atualizar]').click()
  await page.getByText('Sem conexão: mostrando o último ranking que chegou.').waitFor({ timeout: 15000 }).catch(() => {})
  const t3 = await texto()
  checar(t3.includes('Sem conexão') && t3.includes('Beto Teste'), 'rede caída: mantém o último ranking e avisa')
  cair = false
  await page.locator('[data-rank-atualizar]').click()
  await page.getByText(/Atualizado agora há pouco/).waitFor({ timeout: 15000 }).catch(() => {})
  checar(/Atualizado agora há pouco/.test(await texto()), 'reconexão: volta a atualizar')
  checar(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sem rolagem lateral')
  checar(erros.length === 0, `sem erro de script${erros.length ? ` (${erros[0]})` : ''}`)
} finally { await navegador.close(); matar() }
if (falhas.length) { console.error(`\n✗ ${falhas.length} falha(s)`); process.exit(1) }
console.log('\n✓ ranking ao vivo ok')
