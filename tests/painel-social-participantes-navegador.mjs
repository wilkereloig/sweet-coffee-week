/*
 * Social media › Participantes completo (31/10/2026): painel real (Vite) contra backend FALSO — nada vai ao Supabase.
 *
 *   node tests/painel-social-participantes-navegador.mjs            (rodar de dentro de `tests/`: o Playwright mora lá)
 *   DADOS=<fixture.json> CAPTURAS=<pasta> node …                     (fixture local fora do repo + capturas 1440 e 390)
 *
 * Confere: um cartão por participante, A–Z, com os campos fixos ("Aguardando informação" no lugar do que falta), a marcação
 * "Alterado" com o "antes", "Marquei como visto" chamando a RPC certa, sem rolagem horizontal no celular e sem erro de JS.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync, mkdirSync } from 'node:fs'
import { criarBackend, criarRealtime, sessaoGuardada, dormir } from './helpers/backend-falso.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5241
const BASE = `http://localhost:${PORT}`
const UID = 'u-micka-0002'
const EMAIL = 'micka.teste@equipe.sweetcoffeeweek.com.br'
const falhas = []
const ok = (cond, msg) => { if (cond) console.log('  ✓ ' + msg); else { falhas.push(msg); console.log('  ✗ ' + msg) } }
const matar = (pid) => { if (!pid) return; try { if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL') } catch { /* já morto */ } }
async function esperarServidor(url, ms = 60000) {
  const t = Date.now()
  while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return } catch { /* subindo */ } await dormir(400) }
  throw new Error('servidor de desenvolvimento não respondeu')
}

const TODOS_NAO = ['gluten', 'leite', 'ovo', 'amendoim', 'castanhas', 'soja', 'peixe', 'crustaceos'].map((aspecto) => ({ aspecto, estado: 'nao_contem' }))
const item = (tipo, posicao, nome, extra = {}) => ({ tipo, posicao, nome, descricao: 'Descrição de ' + nome + '.', alimentar: TODOS_NAO, ...extra })
const FICTICIO = {
  edicao: { codigo: '2026.2', nome: 'Cartoon', valor_combo: 38.9, festival_inicio: '2026-11-05', festival_fim: '2026-11-15' },
  combos: [
    { participacao_id: 'pa-1', participante_id: 'p-1', marca: 'Casa Aurora', instagram: 'casaaurora', tema: 'Garfield', combo_status: 'aprovado', para_viagem: true,
      combo: { nome: 'combo do gato', descricao: 'Um combo de teste.', itens: [item('doce', 1, 'Bolo'), item('salgado', 2, 'Lasanha'), item('bebida', 3, 'Refri', { substituicoes: [{ original: 'Refri', alternativa: 'Café', acrescimo: 0 }] })] },
      unidades: [{ id: 'u1', nome: 'Loja Centro', endereco: { logradouro: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'Natal', uf: 'RN' }, combo: { modos: { local: 'sim' }, disponibilidade: [{ data: '2026-11-05', abre: '15:00', fecha: '22:00' }] } }],
      revisoes: { 'combo.nome': { original: 'combo do gato', revisado: 'Combo do Gato' } },
      alteracoes: { 'salgado.nome': { antes: 'Lasanha antiga', removido: false, em: '2026-10-31T23:00:00Z' } }, visto_em: null },
    { participacao_id: 'pa-2', participante_id: 'p-2', marca: 'Bistrô Beta', tema: null, combo_status: 'rascunho', combo: { itens: [] }, unidades: [], revisoes: {}, alteracoes: {}, visto_em: null },
  ],
}

async function principal() {
  const original = process.env.DADOS ? JSON.parse(readFileSync(process.env.DADOS, 'utf8')) : FICTICIO
  const capturas = process.env.CAPTURAS || ''
  if (capturas) mkdirSync(capturas, { recursive: true })
  const dev = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: dirname(__dirname), shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  let nav
  try {
    await esperarServidor(`${BASE}/painel/`)
    nav = await chromium.launch()
    for (const [largura, altura] of [[1440, 1000], [390, 844]]) {
      console.log('tela de ' + largura + ' px')
      const ctx = await nav.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: 1 })
      const fixture = structuredClone(original) // cada tela começa do mesmo estado (o "visto" de uma não vaza para a outra)
      const b = criarBackend(); const rt = criarRealtime()
      const vistos = []
      b.rpcs.minhas_permissoes = () => [{ acoes: ['redes.ver', 'redes.editar', 'editorial.ler'], funcao: 'social', rotulo: 'Social media', ativo: true, deve_trocar_senha: false }]
      b.rpcs.meu_perfil = () => ({ user_id: UID, nome: 'Micka', funcao: 'social', funcao_rotulo: 'Social media' })
      b.rpcs.equipe_diretorio = () => [{ user_id: UID, nome: 'Micka', funcao: 'social', funcao_rotulo: 'Social media', avatar_path: null }]
      b.rpcs.admin_ping = () => true
      b.rpcs.sync_meus_canais = () => ['scw:org', 'scw:social', 'scw:pessoa:' + UID]
      b.rpcs.get_notificacoes_org = () => []
      b.rpcs.redes_resumo = () => ({})
      b.rpcs.redes_opcoes = () => ({ participantes: [], edicoes: [{ codigo: '2026.2', nome: 'Cartoon' }], perfis: [], responsaveis: [] })
      b.rpcs.editorial_participantes = () => ({ edicao: '2026.2', participantes: fixture.combos.map((d, i) => ({ participacao_id: d.participacao_id, participante_id: d.participante_id, marca: d.marca, tema: d.tema, combo_nome: d.combo && d.combo.nome, combo_status: d.combo_status, n_posts: i % 3 ? 0 : 2, no_site: false, logo: null })) })
      b.rpcs.editorial_combos = () => fixture
      b.rpcs.editorial_marcar_visto = (c) => { vistos.push(c); const d = fixture.combos.find((x) => x.participacao_id === c.p_participacao); if (d) d.alteracoes = {}; return 1 }
      await b.instalar(ctx); await rt.instalar(ctx)
      await ctx.addInitScript((s) => { if (!localStorage.getItem('scw_org_conta') && s) localStorage.setItem('scw_org_conta', s) }, sessaoGuardada(UID, EMAIL))
      const page = await ctx.newPage()
      const erros = []
      page.on('pageerror', (e) => erros.push(String(e)))
      await page.goto(`${BASE}/painel/#social/participantes`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('.scb-cartao', { timeout: 30000 }).catch(() => {})
      for (let i = 0; i < 4; i++) {
        await dormir(1000)
        const pular = page.locator('.ui-tour button', { hasText: /Pular|Concluir/ }).first()
        if (await pular.count()) { await pular.click(); await dormir(300); continue }
        const conv = page.locator('dialog[open] button', { hasText: /Agora não|Fechar|Entendi/ }).first()
        if (await conv.count()) { await conv.click(); await dormir(300) }
      }
      const n = await page.locator('.scb-cartao').count()
      ok(n === fixture.combos.length, 'um cartão por participante (' + n + ')')
      const textos = await page.locator('.scb-cartao .ui-modulo__titulo').allTextContents()
      const esperado = fixture.combos.map((d) => d.marca).sort((a, b) => a.localeCompare(b, 'pt-BR'))
      ok(esperado.every((m, i) => (textos[i] || '').includes(m)), 'em ordem alfabética')
      ok(await page.locator('.scb-aguardando').count() > 0, '"Aguardando informação" no lugar do que falta')
      ok(await page.locator('text=Ainda sem').count() === 0, 'sem a lista "Ainda sem"')
      ok(await page.locator('.scb-campo--marcado').count() > 0 && await page.locator('.scb-antes').count() > 0, 'campo alterado marcado, com o "antes"')
      const larg = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      ok(larg <= 1, 'sem rolagem horizontal (' + larg + ' px)')
      if (capturas) {
        await page.screenshot({ path: join(capturas, `participantes-${largura}-topo.png`) })
        await page.locator('.scb-cartao').first().screenshot({ path: join(capturas, `participantes-${largura}-cartao1.png`) })
        const marcado = page.locator('.scb-cartao:has(.scb-novidades)').first()
        if (await marcado.count()) await marcado.screenshot({ path: join(capturas, `participantes-${largura}-alterado.png`) })
        if (largura < 600) { // no celular: telas inteiras, rolando pelo primeiro cartão (o cabeçalho fixo cobre o print por elemento)
          await page.locator('.scb-cartao').first().scrollIntoViewIfNeeded()
          await page.mouse.move(195, 400)
          for (let k = 0; k < 4; k++) {
            if (k) await page.mouse.wheel(0, 620)
            await dormir(400)
            await page.screenshot({ path: join(capturas, `participantes-390-rolagem-${k + 1}.png`) })
          }
        }
        const branco = page.locator('.scb-cartao:has-text("Combo em branco")').first()
        if (await branco.count()) await branco.screenshot({ path: join(capturas, `participantes-${largura}-branco.png`) })
      }
      const visto = page.getByRole('button', { name: 'Marquei como visto' }).first()
      if (await visto.count()) {
        const antes = await page.locator('.scb-novidades').count()
        await visto.click(); await dormir(1200)
        ok(vistos.length === 1 && !!vistos[0].p_participacao, '"Marquei como visto" chama editorial_marcar_visto da participação')
        ok(await page.locator('.scb-novidades').count() === antes - 1, 'depois do visto, o aviso daquele cartão sai')
      }
      ok(erros.length === 0, 'sem erro de JavaScript (' + erros.join(' | ').slice(0, 200) + ')')
      await ctx.close()
    }
  } finally {
    if (nav) await nav.close()
    matar(dev.pid)
  }
  if (falhas.length) { console.log('\n' + falhas.length + ' falha(s)'); process.exit(1) }
  console.log('\ntudo certo')
}
principal().catch((e) => { console.error(e); process.exit(1) })
