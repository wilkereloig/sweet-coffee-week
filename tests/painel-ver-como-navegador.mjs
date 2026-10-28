/*
 * "Ver como participante" (22/10/2026): painel real (Vite) contra backend e Realtime FALSOS — nada vai ao Supabase.
 *
 *   node tests/painel-ver-como-navegador.mjs        (rodar de dentro de `tests/`: o Playwright mora lá)
 *
 * O administrador (conta pessoal) abre /painel/?ver_como=<marca>: aparece o painel da MARCA com a faixa
 * "Vendo como …", tudo lido por org_ver_como_ler, nenhuma tabela chamada direto, nenhuma gravação, nenhum
 * logout, nenhum canal de tempo real. Enviar mensagem avisa "Modo visualização". Abrir a conversa não marca lido.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { criarBackend, criarRealtime, sessaoGuardada, dormir } from './helpers/backend-falso.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5238
const BASE = `http://localhost:${PORT}`
const UID = 'u-admin-0001'
const EMAIL = 'wilkereloi.adm@equipe.sweetcoffeeweek.com.br'
const MARCA = '19f3f1d2-4698-4f5a-a65c-58db587709d3'
const PA = '33333333-3333-4333-8333-333333333333'
const falhas = []
const ok = (cond, msg) => { if (cond) console.log('  ✓ ' + msg); else { falhas.push(msg); console.log('  ✗ ' + msg) } }
const matar = (pid) => { if (!pid) return; try { if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL') } catch { /* já morto */ } }
async function esperarServidor(url, ms = 60000) {
  const t = Date.now()
  while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return } catch { /* subindo */ } await dormir(400) }
  throw new Error('servidor de desenvolvimento não respondeu')
}

const DADOS = {
  participantes: [{ id: MARCA, nome_marca: 'Bolomania', responsavel: 'Marco Aurélio', telefone: '84988879407', created_at: '2026-09-01T00:00:00Z' }],
  participacoes: [{ id: PA, participante_id: MARCA, edicao_codigo: '2026.2', status_cadastro: 'em_preenchimento', tema_combo: 'Divertida Mente', created_at: '2026-09-01T00:00:00Z' }],
  edicoes: [{ codigo: '2026.2', valor_combo: 25, festival_inicio: '2026-11-05', festival_fim: '2026-11-15' }],
  mensagens: [{ id: 'm1', de: 'organizacao', corpo: 'Olá, Bolomania! Mensagem da organização.', criada_em: '2026-10-22T12:00:00Z', lida_em: null }],
}

async function principal() {
  const dev = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: dirname(__dirname), shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  let nav
  try {
    await esperarServidor(`${BASE}/painel/`)
    nav = await chromium.launch()
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } })
    const b = criarBackend(); const rt = criarRealtime()
    const consultas = []
    b.rpcs.org_ver_como_iniciar = (c) => ({ participante_id: c.p_participante, nome_marca: 'Bolomania' })
    b.rpcs.org_ver_como_ler = (c) => {
      consultas.push(c.p_consulta)
      if (c.p_participante !== MARCA) return []
      const q = c.p_consulta
      if (q.rpc) return q.rpc === 'marca_minha_logo' ? { atual: null, versoes: [] } : {}
      return DADOS[q.tabela] || []
    }
    await b.instalar(ctx); await rt.instalar(ctx)
    await ctx.addInitScript((s) => { if (!localStorage.getItem('scw_org_conta') && s) localStorage.setItem('scw_org_conta', s) }, sessaoGuardada(UID, EMAIL))
    const page = await ctx.newPage()
    const erros = []
    page.on('pageerror', (e) => erros.push(String(e)))

    console.log('administrador abre a marca em modo visualização')
    await page.goto(`${BASE}/painel/?ver_como=${MARCA}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.vc-faixa', { timeout: 30000 }).catch(() => {})
    await dormir(2500)
    const faixa = (await page.locator('.vc-faixa').textContent().catch(() => '')) || ''
    ok(/Vendo como\s*Bolomania/.test(faixa) && /nada é gravado/.test(faixa), 'faixa no topo: "' + faixa.trim() + '"')
    ok((await page.locator('.pn-cabeca__ident-nome').textContent().catch(() => '')) === 'Bolomania', 'o painel é o da marca (nome no topo)')
    ok(b.total('org_ver_como_iniciar') >= 1 && b.total('org_ver_como_iniciar') <= 2, 'abrir registrou (org_ver_como_iniciar; 2× só no dev, pelo StrictMode do React)')
    ok(consultas.some((q) => q.tabela === 'participantes'), 'leu a marca por org_ver_como_ler')
    ok(await page.locator('.ui-tour').count() === 0, 'o tour não abre sozinho')

    console.log('conversa: lê, não marca como lido, não envia')
    await page.goto(`${BASE}/painel/?ver_como=${MARCA}#mensagens`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.ui-conversa__rolo', { timeout: 30000 }).catch(() => {})
    await dormir(2000)
    ok(/Mensagem da organização/.test((await page.locator('.ui-conversa__rolo').textContent().catch(() => '')) || ''), 'a mensagem da organização aparece')
    await page.locator('.ui-conversa textarea, form textarea').first().fill('teste do administrador')
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    await dormir(800)
    ok(/Modo visualização/.test((await page.locator('body').textContent()) || ''), 'enviar avisa "Modo visualização"')

    const nomes = Object.keys(b.chamadas)
    const fora = nomes.filter((n) => !['org_ver_como_iniciar', 'org_ver_como_ler'].includes(n) && !n.startsWith('/functions/') && !n.startsWith('/storage/'))
    ok(fora.length === 0, 'nenhuma tabela nem função da marca chamada direto (' + (fora.join(', ') || 'nada') + ')')
    ok(!consultas.some((q) => q.rpc === 'marca_ler_mensagens' || q.rpc === 'marca_enviar_mensagem'), 'nenhuma gravação passou para o leitor')
    ok(b.logouts.length === 0, 'nenhum logout')
    ok(rt.joins.length === 0, 'nenhum canal de tempo real (' + rt.joins.length + ')')
    ok(b.vazados.length === 0, 'nada vazou do backend falso (' + b.vazados.join(', ') + ')')
    ok(erros.length === 0, 'sem erro de JavaScript (' + erros.join(' | ').slice(0, 200) + ')')

    console.log('Sair volta ao painel da organização')
    await page.getByRole('button', { name: 'Sair', exact: true }).first().click()
    await page.waitForURL((u) => !/ver_como/.test(String(u)), { timeout: 15000 }).catch(() => {})
    ok(!/ver_como/.test(page.url()), 'saiu do modo (' + page.url() + ')')
    await ctx.close()
  } finally {
    if (nav) await nav.close()
    matar(dev.pid)
  }
  console.log(falhas.length ? '\n✗ ' + falhas.length + ' falha(s)' : '\n✓ tudo certo')
  process.exit(falhas.length ? 1 : 0)
}
principal().catch((e) => { console.error(e); process.exit(1) })
