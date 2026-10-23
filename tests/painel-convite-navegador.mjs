/*
 * Convite para instalar o app e ligar os avisos, no navegador (23/10/2026, pedido R10): o diálogo abre já na 1ª visita (depois do
 * tour), "Entendi"/"Agora não" adiam 7 dias, e o sino mostra "Avisos neste aparelho" com o caminho de volta ao convite. Backend e
 * Realtime FALSOS; iPhone só emulado (UA + toque): não prova o Safari real, a Tela de Início nem o push.
 *
 *   node tests/painel-convite-navegador.mjs          (de dentro de `tests/`)
 */
import { chromium, devices } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { criarBackend, criarRealtime, sessaoGuardada, dormir } from './helpers/backend-falso.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5244
const BASE = `http://localhost:${PORT}`
const UID = 'u-marca-0001'
const PID = '99999999-0000-4000-8000-000000000001'
const PA = 'pa-1'
const falhas = []
const ok = (cond, msg) => { if (cond) console.log('  ✓ ' + msg); else { falhas.push(msg); console.log('  ✗ ' + msg) } }
const matar = (pid) => { if (!pid) return; try { if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL') } catch { /* já morreu */ } }
async function esperarServidor(url, ms = 60000) {
  const t = Date.now()
  while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return } catch { /* subindo */ } await dormir(400) }
  throw new Error('servidor de desenvolvimento não respondeu')
}

// `convite: false` = a pessoa ainda não respondeu ao convite (1ª visita); `true` = já adiou ("Agora não").
async function abrir(nav, { contexto = {}, jaAdiado = false } = {}) {
  const ctx = await nav.newContext(contexto)
  const b = criarBackend(); const rt = criarRealtime()
  b.tabelas.perfis = () => [{ deve_trocar_senha: false, ativo: true, bloqueado_em: null }]
  b.tabelas.participantes = () => [{ id: PID, nome_marca: 'Doce Sol', responsavel: 'Ana', telefone: '84999998888', slug: 'docesol', user_id: UID, created_at: '2026-09-01T00:00:00Z' }]
  b.tabelas.participacoes = () => [{ id: PA, participante_id: PID, edicao_codigo: '2026.2', status_cadastro: 'em_preenchimento', combo_status: 'rascunho', tema_combo: 'Divertida Mente', tema_justificativa: 'Emoções', logo_id: 'l1', foto_liberacao: 'liberado', created_at: '2026-09-01T00:00:00Z' }]
  b.tabelas.participantes_itens = () => []
  b.tabelas.participacao_unidades = () => []
  b.tabelas.unidades = () => []
  b.tabelas.edicoes = () => [{ codigo: '2026.2', nome: 'Cartoon', tema: 'Cartoon', festival_inicio: '2026-11-05', festival_fim: '2026-11-15', valor_combo: 25 }]
  b.tabelas.notificacoes = () => []
  b.tabelas.push_subscriptions = () => []
  b.rpcs.sync_meus_canais = () => ['scw:pessoa:' + UID, 'scw:marcas', 'scw:marca:' + PID]
  b.rpcs.marca_minha_logo = () => ({ atual: { id: 'l1' }, versoes: [] })
  b.rpcs.marca_previa_publica = () => ({ previa: {}, faltando: [] })
  b.rpcs.marca_minha_publicacao = () => ({ estado: 'nao_publicado', alterado_apos_aprovacao: false })
  await b.instalar(ctx); await rt.instalar(ctx)
  // O que o tour e o convite guardam no aparelho. Só na 1ª carga da aba: recarregar não pode "desfazer" o que a pessoa respondeu.
  await ctx.addInitScript(([s, id, adiado]) => {
    if (sessionStorage.getItem('__ini')) return
    sessionStorage.setItem('__ini', '1')
    localStorage.setItem('scw_marca', s)
    localStorage.setItem('scw_tour_marca_' + id, '1')
    if (adiado) localStorage.setItem('scw_convite_aparelho_marca_' + id, String(Date.now()))
  }, [sessaoGuardada(UID, 'docesol@marca.sweetcoffeeweek.com.br'), PID, jaAdiado])
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  await page.goto(`${BASE}/painel/#inicio`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-tour="sino"]', { timeout: 30000 })
  return { ctx, page, erros }
}

async function principal() {
  const dev = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: dirname(__dirname), shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  let nav
  try {
    await esperarServidor(`${BASE}/painel/`)
    nav = await chromium.launch()
    const iphone = { ...devices['iPhone 13'] }
    delete iphone.defaultBrowserType

    console.log('C1 iPhone, 1ª visita: o convite abre sozinho, com os passos do Safari; "Entendi" adia 7 dias')
    {
      const { ctx, page, erros } = await abrir(nav, { contexto: iphone })
      const dlg = page.locator('dialog.cv[open]')
      await dlg.waitFor({ timeout: 15000 })
      const t = await dlg.innerText()
      ok(/Tenha o Painel SCW no seu celular/.test(t), 'título: ' + (t.split('\n')[0] || ''))
      ok(/Compartilhar/.test(t) && /Adicionar à Tela de Início/.test(t), 'os passos do iPhone aparecem direto (Compartilhar › Adicionar à Tela de Início)')
      ok(/nome e senha/.test(t) && /avisos/.test(t), 'diz o motivo de instalar (entrar sem digitar tudo e receber os avisos)')
      ok((await dlg.getByRole('button', { name: 'Entendi' }).count()) === 1 && (await dlg.getByRole('button', { name: 'Agora não' }).count()) === 1, 'os dois botões: Entendi e Agora não')
      await dlg.getByRole('button', { name: 'Entendi' }).click()
      await dormir(600)
      ok((await page.locator('dialog.cv[open]').count()) === 0, 'fecha')
      const chave = await page.evaluate((id) => localStorage.getItem('scw_convite_aparelho_marca_' + id), PID)
      ok(!!chave && Date.now() - Number(chave) < 60000, 'adiou o convite neste aparelho (7 dias)')
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-tour="sino"]', { timeout: 30000 })
      await dormir(5200)
      ok((await page.locator('dialog.cv[open]').count()) === 0, 'depois de recarregar não volta antes dos 7 dias')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('C2 sino: "Avisos neste aparelho" e o caminho de volta ao convite')
    {
      const { ctx, page, erros } = await abrir(nav, { contexto: iphone })
      const dlg = page.locator('dialog.cv[open]')
      await dlg.waitFor({ timeout: 15000 })
      await dlg.getByRole('button', { name: 'Agora não' }).click()
      await dormir(600)
      await page.locator('[data-tour="sino"]').click()
      const folha = page.getByRole('dialog').first()
      await folha.waitFor({ timeout: 8000 })
      const t = await folha.innerText()
      ok(/Avisos neste aparelho/.test(t), 'a folha do sino abre com "Avisos neste aparelho" no topo')
      ok(/(Desligados|Indisponíveis|Ligados|Bloqueados) neste aparelho/.test(t), 'diz se os avisos estão ligados ou não: ' + (t.match(/(Desligados|Indisponíveis|Ligados|Bloqueados) neste aparelho/) || [''])[0])
      // O Chromium sem interface começa com a permissão negada: é o caso "bloqueado" — a frase de como liberar aparece UMA vez só.
      ok((t.match(/não pode pedir de novo/g) || []).length <= 1, 'a frase "bloqueado" não se repete (estado + aviso)')
      const como = folha.getByRole('button', { name: 'Como instalar e ligar os avisos' })
      ok((await como.count()) === 1, 'há o botão "Como instalar e ligar os avisos"')
      await como.click()
      await page.locator('dialog.cv[open]').waitFor({ timeout: 8000 })
      ok((await page.locator('dialog.cv[open]').count()) === 1, 'o convite reabre sem esperar os 7 dias')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('C3 convite já adiado: não abre sozinho')
    {
      const { ctx, page, erros } = await abrir(nav, { contexto: iphone, jaAdiado: true })
      await dormir(5200)
      ok((await page.locator('dialog.cv[open]').count()) === 0, 'adiado há pouco: não abre')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('C4 computador: sem "Instalar" oferecido pelo navegador, vai direto às notificações (ou não abre)')
    {
      const { ctx, page, erros } = await abrir(nav, { contexto: { viewport: { width: 1280, height: 900 } } })
      await dormir(5200)
      const abriu = (await page.locator('dialog.cv[open]').count()) === 1
      if (abriu) {
        const t = await page.locator('dialog.cv[open]').innerText()
        ok(/Ative as notificações do painel|Tenha o Painel SCW neste computador/.test(t), 'no computador: ' + (t.split('\n')[0] || ''))
        await page.locator('dialog.cv[open]').getByRole('button', { name: /Agora não|Entendi/ }).first().click()
      } else ok(true, 'o navegador não suporta avisos aqui: nada a oferecer (não abre)')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }
  } finally {
    if (nav) await nav.close().catch(() => {})
    matar(dev.pid)
  }
  console.log(falhas.length ? `\n✗ ${falhas.length} falha(s)` : '\n✓ tudo certo')
  process.exit(falhas.length ? 1 : 0)
}
principal().catch((e) => { console.error(e); process.exit(1) })
