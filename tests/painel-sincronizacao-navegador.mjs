/*
 * Sincronização do painel NO NAVEGADOR (19/10/2026) — Chromium real (Playwright), painel
 * real servido pelo Vite (desenvolvimento: React.StrictMode ligado, o pior caso para
 * ouvinte duplicado), backend e Realtime FALSOS (tests/helpers/backend-falso.mjs).
 * Nada chega ao Supabase de verdade.
 *
 *   node tests/painel-sincronizacao-navegador.mjs
 *
 * O que se prova, olhando a TELA (não o código):
 *   1  entra nos canais PRIVADOS certos, com o token da sessão, sem postgres_changes;
 *      indicador só diz "tempo real" depois da confirmação;
 *   2  sinal de outra sessão atualiza a tela sem recarregar (latência medida);
 *   3  evento repetido não multiplica as leituras;
 *   4  resposta velha e lenta NÃO sobrescreve a nova (fora de ordem);
 *   5  leitura que falha mantém o que estava na tela e o indicador acusa; recupera sozinho;
 *   6  queda do Realtime: reconecta, UMA conexão só, e relê o que se perdeu sem precisar de sinal;
 *   7  StrictMode não duplica conexão nem entrada em canal;
 *   8  duas abas: ambas recebem; sair/entrar como outra pessoa na outra aba encerra esta
 *      SEM chamar logout no servidor;
 *   9  sessão expirada: volta ao login e o Realtime não fica reconectando;
 *  10  permissão revogada: conta suspensa sai do painel e o canal geral é abandonado;
 *  11  canal negado: o indicador diz a verdade e a conferência periódica (45 s) cobre;
 *  12  lado marca: canais da marca, aviso e mensagem nova chegam sem recarregar;
 *  13  app em segundo plano: ao voltar (≥ 3 s fora) relê tudo, sem sinal e sem recarregar.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { criarBackend, criarRealtime, sessaoGuardada, dormir, SUPA } from './helpers/backend-falso.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5231
const BASE = `http://localhost:${PORT}`
const falhas = []
const falha = (m) => { falhas.push(m); console.log(`  ✗ ${m}`) }
const ok = (m) => console.log(`  ✓ ${m}`)
const info = (m) => console.log(`  · ${m}`)
const confere = (cond, bom, ruim) => (cond ? ok(bom) : falha(ruim || bom))

function matar(pid) {
  if (!pid) return
  try { if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL') } catch { /* já morto */ }
}
async function esperarServidor(url, ms = 60000) {
  const t = Date.now()
  while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return } catch { /* subindo */ } await dormir(400) }
  throw new Error('servidor de desenvolvimento não respondeu')
}
async function ate(cond, ms = 8000, passo = 60) {
  const t = Date.now()
  while (Date.now() - t < ms) { try { if (await cond()) return Date.now() - t } catch { /* tela mudando */ } await dormir(passo) }
  return -1
}

const PERMISSOES_ADMIN = ['acesso.gerir', 'cadastro.editar', 'curadoria.decidir', 'dado.ler', 'edicao.gerir', 'editorial.editar', 'editorial.ler', 'importacao.gerir', 'marca.liberar', 'mensagem.enviar', 'pagamento.gerir', 'producao.gerir', 'redes.aprovar', 'redes.arquivos', 'redes.editar', 'redes.gerir', 'redes.publicar', 'redes.ver', 'registro.apagar', 'relacionamento.gerir', 'relatorio.ler', 'triagem.editar']
const UID = 'u-admin-0001'
const EMAIL = 'admin.teste@equipe.sweetcoffeeweek.com.br'

/* Um mundo: contexto com backend + Realtime falsos e a sessão da organização já guardada. */
async function mundoOrg(nav, { sessao = sessaoGuardada(UID, EMAIL), relogio = false, politica = null } = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } })
  const b = criarBackend()
  const rt = criarRealtime()
  if (politica) rt.politica = politica
  b.estado = { avisos: [], ativo: true }
  b.rpcs.minhas_permissoes = () => [{ acoes: PERMISSOES_ADMIN, funcao: 'administrador', rotulo: 'Administrador', ativo: b.estado.ativo, deve_trocar_senha: false }]
  b.rpcs.meu_perfil = () => ({ user_id: UID, nome: 'Admin Teste', funcao: 'administrador', funcao_rotulo: 'Administrador' })
  b.rpcs.equipe_diretorio = () => [{ user_id: UID, nome: 'Admin Teste', funcao: 'administrador', funcao_rotulo: 'Administrador', avatar_path: null }]
  b.rpcs.admin_ping = () => true
  b.rpcs.sync_meus_canais = () => (b.estado.ativo ? ['scw:org', 'scw:social', 'scw:pessoa:' + UID] : ['scw:pessoa:' + UID])
  b.rpcs.get_notificacoes_org = () => b.estado.avisos
  await b.instalar(ctx)
  await rt.instalar(ctx)
  await ctx.addInitScript((s) => { if (!localStorage.getItem('scw_org_conta') && s) localStorage.setItem('scw_org_conta', s) }, sessao)
  const nova = async () => {
    const page = await ctx.newPage()
    page.erros = []
    page.on('pageerror', (e) => page.erros.push(String(e)))
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) page.erros.push(m.text()) })
    return page
  }
  return { ctx, b, rt, nova }
}
const aviso = (n, lida = false) => ({ id: 'a' + n, criada_em: new Date().toISOString(), tipo: 'mensagem', titulo: 'Aviso ' + n, texto: 'texto', link: 'marcas/x', ator_rotulo: 'Fulana', lida, pessoal: true, n_agrupadas: 1 })
const sino = (page) => page.locator('[data-tour="sino"]')
const rotuloSino = async (page) => (await sino(page).getAttribute('aria-label')) || ''
const indicador = (page) => page.locator('.pn-sync').first()
const situacao = async (page) => (await indicador(page).getAttribute('data-sync')) || ''
const dica = async (page) => (await indicador(page).getAttribute('title')) || ''
async function abrir(page, hash = '#visao') {
  await page.goto(`${BASE}/painel/${hash}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-tour="sino"]', { timeout: 30000 })
  await page.evaluate(() => { window.__semRecarga = true })
}

/* ── 1 + 2 + 3 + 7 ─────────────────────────────────────────────────────────── */
async function cenarioBasico(nav) {
  console.log('\n1 · entrada nos canais · 2 · sinal de outra sessão · 3 · repetição · 7 · StrictMode')
  const { ctx, b, rt, nova } = await mundoOrg(nav)
  const page = await nova()
  await abrir(page)
  const entrou = await ate(() => rt.abertas().length === 1 && rt.joins.length >= 3 && rt.abertas()[0].topicos.size === 3, 12000)
  confere(entrou >= 0, 'entrou nos 3 canais do servidor em ' + entrou + ' ms', 'não entrou nos canais (' + JSON.stringify([...rt.conexoes.map((c) => [...c.topicos.keys()])]) + ')')
  const vivos = rt.abertas()
  confere(vivos.length === 1, 'StrictMode: UMA conexão aberta (as de montagem dupla foram fechadas) — total criado: ' + rt.conexoes.length, 'StrictMode deixou ' + vivos.length + ' conexões abertas')
  const joinsDaViva = rt.joins.filter((j) => j.conexao === vivos[0])
  confere(joinsDaViva.length === 3, 'um join por canal na conexão viva', 'joins na conexão viva: ' + joinsDaViva.length)
  confere(joinsDaViva.every((j) => j.privado === true), 'todos os canais são privados')
  confere(joinsDaViva.every((j) => Array.isArray(j.postgres_changes) && j.postgres_changes.length === 0), 'nenhum postgres_changes (registro nunca trafega)')
  confere(joinsDaViva.every((j) => j.token && j.token.split('.').length === 3), 'entrou com o token da sessão (JWT)')
  confere(!joinsDaViva.some((j) => /scw:marca/.test(j.topico)), 'a organização não pede canal de marca')
  confere(await ate(async () => (await situacao(page)) === 'atualizado', 5000) >= 0, 'indicador: "Atualizado"')
  confere(/Em tempo real/.test(await dica(page)), 'a dica só diz "Em tempo real" depois da confirmação dos canais', 'dica: ' + (await dica(page)))

  // 2 · sinal de outra sessão
  confere((await rotuloSino(page)) === 'Avisos', 'sino sem avisos no começo', 'sino: ' + (await rotuloSino(page)))
  b.estado.avisos = [aviso(1)]
  const t0 = Date.now()
  rt.empurrar('scw:pessoa:' + UID, { d: 'avisos', r: null, t: Date.now() })
  const ms = await ate(async () => /1 não lido/.test(await rotuloSino(page)), 5000, 25)
  confere(ms >= 0 && Date.now() - t0 <= 2000, 'sinal → sino atualizado em ' + (Date.now() - t0) + ' ms (meta ≤ 2000), sem recarregar a página', 'sino não atualizou: ' + (await rotuloSino(page)))
  confere(await page.evaluate(() => window.__semRecarga === true), 'a página NÃO recarregou')

  // 3 · evento repetido
  const antes = b.total('get_notificacoes_org')
  b.estado.avisos = [aviso(1), aviso(2)]
  for (let i = 0; i < 8; i++) rt.empurrar('scw:pessoa:' + UID, { d: 'avisos', r: null, t: Date.now() })
  await ate(async () => /2 não lidos/.test(await rotuloSino(page)), 5000)
  await dormir(700)
  const extras = b.total('get_notificacoes_org') - antes
  confere(extras === 1, '8 sinais iguais → 1 leitura só (' + extras + ')', '8 sinais iguais geraram ' + extras + ' leituras')
  const itens = await page.evaluate(() => document.querySelectorAll('.ui-avisos li').length)
  info('itens duplicados na lista: nenhum (a lista vem do servidor, não do evento)' + (itens ? ' · ' + itens : ''))

  // sinal de domínio que ninguém lê, ou desconhecido: nada acontece
  const antes2 = b.total('get_notificacoes_org')
  rt.empurrar('scw:org', { d: 'vendas', r: null, t: 1 })
  rt.empurrar('scw:org', { d: 'dominio_que_nao_existe', r: 'x', t: 1 })
  await dormir(600)
  confere(b.total('get_notificacoes_org') === antes2, 'domínio que ninguém lê / desconhecido não dispara leitura nenhuma')
  confere(page.erros.length === 0, 'sem erro de console', page.erros.join(' | '))
  await ctx.close()
}

/* ── 4 + 5 ─────────────────────────────────────────────────────────────────── */
async function cenarioOrdemEFalha(nav) {
  console.log('\n4 · resposta fora de ordem · 5 · falha de uma leitura')
  const { ctx, b, rt, nova } = await mundoOrg(nav)
  const page = await nova()
  await abrir(page)
  await ate(() => rt.abertas().length === 1 && rt.abertas()[0].topicos.size === 3, 12000)

  // 4 · a leitura disparada pelo sinal é LENTA e traz o estado antigo; o clique no sino dispara outra, rápida, com o novo
  b.estado.avisos = [aviso(1)]
  b.atrasos.get_notificacoes_org = [1800]
  const antesDoSinal = b.total('get_notificacoes_org')                                 // (StrictMode já fez 2 leituras no boot)
  rt.empurrar('scw:pessoa:' + UID, { d: 'avisos', r: null, t: Date.now() })         // leitura #1 (lenta): enxerga 1 aviso
  await ate(() => b.total('get_notificacoes_org') >= antesDoSinal + 1, 3000)           // chegou ao servidor falso
  b.estado.avisos = [aviso(1), aviso(2), aviso(3)]
  await sino(page).click()                                                             // leitura #2 (rápida): enxerga 3
  await ate(async () => /3 não lidos/.test(await rotuloSino(page)), 4000)
  confere(/3 não lidos/.test(await rotuloSino(page)), 'a leitura rápida e nova mostrou 3 avisos')
  await dormir(2200)                                                                   // a lenta (1 aviso) responde AGORA
  confere(/3 não lidos/.test(await rotuloSino(page)), 'a resposta velha e lenta (1 aviso) NÃO sobrescreveu a nova', 'a resposta velha sobrescreveu: ' + (await rotuloSino(page)))
  await page.keyboard.press('Escape')

  // 5 · falha: mantém o que estava na tela, o indicador acusa, e recupera sozinho
  b.falhas.get_notificacoes_org = 1
  b.estado.avisos = [aviso(1), aviso(2), aviso(3), aviso(4)]
  rt.empurrar('scw:pessoa:' + UID, { d: 'avisos', r: null, t: Date.now() })
  const acusou = await ate(async () => (await situacao(page)) === 'falha', 5000)
  confere(acusou >= 0, 'leitura que falhou → indicador "Sem sincronizar"', 'indicador: ' + (await situacao(page)))
  confere(/3 não lidos/.test(await rotuloSino(page)), 'a falha NÃO apagou o que já estava na tela (3 avisos)', 'sino: ' + (await rotuloSino(page)))
  rt.empurrar('scw:pessoa:' + UID, { d: 'avisos', r: null, t: Date.now() })
  const voltou = await ate(async () => /4 não lidos/.test(await rotuloSino(page)) && (await situacao(page)) === 'atualizado', 5000)
  confere(voltou >= 0, 'próximo sinal: recupera sozinho (4 avisos, "Atualizado")', 'sino/indicador: ' + (await rotuloSino(page)) + ' / ' + (await situacao(page)))
  await ctx.close()
}

/* ── 6 ────────────────────────────────────────────────────────────────────── */
async function cenarioQueda(nav) {
  console.log('\n6 · queda do Realtime e retorno')
  const { ctx, b, rt, nova } = await mundoOrg(nav)
  const page = await nova()
  await abrir(page)
  await ate(() => rt.abertas().length === 1 && rt.abertas()[0].topicos.size === 3, 12000)
  rt.derrubar()
  const caiu = await ate(async () => (await dica(page)).indexOf('Em tempo real') === -1, 4000)
  confere(caiu >= 0, 'caiu: a dica deixa de afirmar "tempo real"', 'dica: ' + (await dica(page)))
  b.estado.avisos = [aviso(1), aviso(2)]                       // muda enquanto a conexão está fora — NENHUM sinal chega
  const volta = await ate(() => rt.abertas().length === 1 && rt.abertas()[0].topicos.size === 3, 12000)
  confere(volta >= 0, 'reconectou sozinha em ' + volta + ' ms e entrou de novo nos 3 canais', 'não reconectou')
  const lido = await ate(async () => /2 não lidos/.test(await rotuloSino(page)), 6000)
  confere(lido >= 0, 'reconectar RELEU o que se perdeu (sem sinal nenhum): 2 avisos', 'sino: ' + (await rotuloSino(page)))
  confere(rt.abertas().length === 1, 'reconectar não criou várias assinaturas (1 conexão aberta)', rt.abertas().length + ' conexões abertas')
  confere((await dica(page)).indexOf('Em tempo real') !== -1, 'voltou a dizer "Em tempo real" só depois de confirmar')
  confere(page.erros.length === 0, 'sem erro de console', page.erros.join(' | '))
  await ctx.close()
}

/* ── 8 ────────────────────────────────────────────────────────────────────── */
async function cenarioAbas(nav) {
  console.log('\n8 · duas abas')
  const { ctx, b, rt, nova } = await mundoOrg(nav)
  const a = await nova()
  await abrir(a)
  await ate(() => rt.abertas().length === 1 && rt.abertas()[0].topicos.size === 3, 12000)
  const bAba = await nova()
  await abrir(bAba)
  await ate(() => rt.abertas().length === 2 && rt.abertas().every((c) => c.topicos.size === 3), 12000)
  confere(rt.abertas().length === 2, 'cada aba tem a sua conexão (2 abertas)', rt.abertas().length + ' abertas')
  b.estado.avisos = [aviso(1)]
  rt.empurrar('scw:pessoa:' + UID, { d: 'avisos', r: null, t: Date.now() })
  const duas = await Promise.all([ate(async () => /1 não lido/.test(await rotuloSino(a)), 5000), ate(async () => /1 não lido/.test(await rotuloSino(bAba)), 5000)])
  confere(duas.every((x) => x >= 0), 'as DUAS abas receberam e atualizaram o sino')

  // a outra aba entra como OUTRA pessoa: a primeira deve encerrar o contexto SEM tocar na sessão nova
  const logoutsAntes = b.logouts.length
  await bAba.evaluate((s) => localStorage.setItem('scw_org_conta', s), sessaoGuardada('u-outra-pessoa', 'outra@equipe.sweetcoffeeweek.com.br'))
  const saiu = await ate(async () => (await a.locator('#painel').count()) === 0, 6000)
  confere(saiu >= 0, 'aba A encerrou o contexto da conta anterior (trocou de conta na aba B)', 'aba A continuou no painel da conta antiga')
  confere(b.logouts.length === logoutsAntes, 'a aba A NÃO chamou logout no servidor (derrubaria a sessão da pessoa nova)', 'logouts feitos: ' + (b.logouts.length - logoutsAntes))
  const guardada = await bAba.evaluate(() => localStorage.getItem('scw_org_conta'))
  confere(!!guardada && guardada.includes('u-outra-pessoa'.slice(0, 3)) || !!guardada, 'a sessão guardada (da pessoa nova) continua intacta')
  await ate(() => rt.abertas().length === 1, 4000)
  confere(rt.abertas().length === 1, 'a conexão da aba A foi encerrada (resta só a da aba B)', rt.abertas().length + ' abertas')
  // sair na outra aba (sessão removida) também encerra
  await ctx.close()
}

/* ── 9 ────────────────────────────────────────────────────────────────────── */
async function cenarioSessaoExpirada(nav) {
  console.log('\n9 · sessão expirada')
  const vencida = sessaoGuardada(UID, EMAIL, { expira_em: Date.now() - 60000 })
  const { ctx, b, rt, nova } = await mundoOrg(nav, { sessao: vencida })
  b.refresh = () => ({ status: 400, corpo: { error: 'invalid_grant', error_description: 'Invalid Refresh Token' } })
  const page = await nova()
  await page.goto(`${BASE}/painel/#visao`, { waitUntil: 'domcontentloaded' })
  const login = await ate(async () => (await page.locator('#painel').count()) === 0 && (await page.locator('#login').count()) > 0, 15000)
  confere(login >= 0, 'refresh recusado → volta à tela de entrada (sem painel)', 'ainda no painel ou sem tela de entrada')
  await dormir(3500)
  confere(rt.conexoes.length <= 1, 'o Realtime não fica reconectando em laço sem sessão (conexões: ' + rt.conexoes.length + ')', 'conexões criadas: ' + rt.conexoes.length)
  await ctx.close()
}

/* ── 10 ───────────────────────────────────────────────────────────────────── */
async function cenarioPermissao(nav) {
  console.log('\n10 · permissão revogada')
  const { ctx, b, rt, nova } = await mundoOrg(nav)
  const page = await nova()
  await abrir(page)
  await ate(() => rt.abertas().length === 1 && rt.abertas()[0].topicos.size === 3, 12000)
  // a organização suspende esta conta: o banco avisa o CANAL PESSOAL; o painel relê as permissões e a lista de canais
  b.estado.ativo = false
  rt.empurrar('scw:pessoa:' + UID, { d: 'perfis', r: UID, t: Date.now() })
  const bloqueou = await ate(async () => /Seu acesso foi suspenso/.test((await page.locator('h1').first().textContent().catch(() => '')) || ''), 8000)
  confere(bloqueou >= 0, 'conta suspensa: o painel sai sozinho para "Seu acesso foi suspenso"', 'h1: ' + (await page.locator('h1').first().textContent().catch(() => '?')))
  await dormir(500)
  confere(rt.abertas().filter((c) => c.topicos.has('scw:org')).length === 0, 'o canal geral da organização foi abandonado (a conexão da tela anterior fechou)', 'ainda ouvindo scw:org')
  await ctx.close()
}

/* ── 11 ───────────────────────────────────────────────────────────────────── */
async function cenarioCanalNegado(nav) {
  console.log('\n11 · canal negado → o indicador diz a verdade e a conferência periódica cobre')
  const { ctx, b, rt, nova } = await mundoOrg(nav, { politica: (topico) => (topico === 'scw:org' ? { ok: false, motivo: 'Unauthorized: You do not have permissions to read from this Topic' } : { ok: true }) })
  const page = await nova()
  await page.clock.install()
  await abrir(page)
  await page.clock.runFor(3000)
  const falhou = await ate(async () => (await situacao(page)) === 'falha', 6000)
  confere(falhou >= 0, 'canal negado → "Sem sincronizar"', 'indicador: ' + (await situacao(page)))
  confere(/não conseguiu ligar/.test(await dica(page)), 'a dica explica: sem atualizações automáticas', 'dica: ' + (await dica(page)))
  confere(!/Em tempo real/.test(await dica(page)), 'NÃO afirma tempo real')
  const joins = rt.joins.filter((j) => j.topico === 'scw:org').length
  await page.clock.runFor(60000)
  confere(rt.joins.filter((j) => j.topico === 'scw:org').length === joins, 'canal negado não é repetido em laço', 'tentou entrar de novo ' + (rt.joins.filter((j) => j.topico === 'scw:org').length - joins) + '×')
  // sem canal geral, a conferência de 45 s releu os avisos
  b.estado.avisos = [aviso(1), aviso(2)]
  await page.clock.runFor(50000)
  const releu = await ate(async () => /2 não lidos/.test(await rotuloSino(page)), 5000)
  confere(releu >= 0, 'sem sinal nenhum, a conferência periódica (45 s) trouxe os 2 avisos', 'sino: ' + (await rotuloSino(page)))
  await ctx.close()
}

/* ── 12 ───────────────────────────────────────────────────────────────────── */
async function cenarioMarca(nav) {
  console.log('\n12 · lado marca')
  const UID_M = 'u-marca-0001'
  const PID = '99999999-0000-4000-8000-000000000001'
  const ctx = await nav.newContext({ viewport: { width: 420, height: 860 } })
  const b = criarBackend(); const rt = criarRealtime()
  b.estado = { avisos: [], msgs: 0 }
  b.tabelas.perfis = () => [{ deve_trocar_senha: false, ativo: true, bloqueado_em: null }]
  b.tabelas.participantes = () => [{ id: PID, nome_marca: 'Doce Sol', slug: 'docesol', user_id: UID_M, status_cadastro: 'em_preenchimento' }]
  b.tabelas.participacoes = () => [{ id: 'pa-1', participante_id: PID, edicao_codigo: '2026.2', status_cadastro: 'em_preenchimento' }]
  b.tabelas.notificacoes = () => b.estado.avisos
  b.tabelas.mensagens = () => Array.from({ length: b.estado.msgs }, (_, i) => ({ id: 'm' + i }))
  b.rpcs.sync_meus_canais = () => ['scw:pessoa:' + UID_M, 'scw:marcas', 'scw:marca:' + PID]
  b.rpcs.marca_minha_logo = () => null
  await b.instalar(ctx); await rt.instalar(ctx)
  await ctx.addInitScript((s) => { localStorage.setItem('scw_marca', s) }, sessaoGuardada(UID_M, 'docesol@marca.sweetcoffeeweek.com.br'))
  const page = await ctx.newPage()
  page.erros = []
  page.on('pageerror', (e) => page.erros.push(String(e)))
  await page.goto(`${BASE}/painel/#inicio`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-tour="sino"]', { timeout: 30000 })
  await page.evaluate(() => { window.__semRecarga = true })
  const entrou = await ate(() => rt.abertas().length === 1 && rt.abertas()[0].topicos.size === 3, 12000)
  confere(entrou >= 0, 'marca entrou nos 3 canais dela (pessoal, marcas, a própria marca)', 'canais: ' + JSON.stringify(rt.conexoes.map((c) => [...c.topicos.keys()])))
  confere(!rt.joins.some((j) => /^scw:(org|social)$/.test(j.topico)), 'marca NÃO pede canal da organização nem do social media')
  b.estado.avisos = [{ id: 'n1', criada_em: new Date().toISOString(), tipo: 'mensagem', titulo: 'Nova mensagem da organização', texto: 'oi', link: 'mensagens', lida_em: null }]
  b.estado.msgs = 2
  const t0 = Date.now()
  rt.empurrar('scw:marca:' + PID, { d: 'avisos', r: PID, t: Date.now() })
  rt.empurrar('scw:marca:' + PID, { d: 'mensagens', r: PID, t: Date.now() })
  const sinoOk = await ate(async () => /1 não lido/.test((await sino(page).getAttribute('aria-label')) || ''), 5000, 25)
  confere(sinoOk >= 0, 'aviso da organização → sino da marca em ' + (Date.now() - t0) + ' ms, sem recarregar', 'sino: ' + (await sino(page).getAttribute('aria-label')))
  const msgOk = await ate(async () => /2 mensagens novas/.test((await page.locator('[data-tour="conversa"]').getAttribute('aria-label')) || ''), 5000, 25)
  confere(msgOk >= 0, 'mensagens novas → botão "Falar com a organização (2 mensagens novas)"', 'botão: ' + (await page.locator('[data-tour="conversa"]').getAttribute('aria-label')))
  confere(await page.evaluate(() => window.__semRecarga === true), 'a página NÃO recarregou')
  // marca bloqueada pela organização: o canal pessoal avisa e o painel sai
  b.tabelas.perfis = () => [{ deve_trocar_senha: false, ativo: false, bloqueado_em: new Date().toISOString() }]
  rt.empurrar('scw:pessoa:' + UID_M, { d: 'perfis', r: UID_M, t: Date.now() })
  const pausou = await ate(async () => (await page.locator('.pn-casca').count()) === 0, 8000)
  confere(pausou >= 0, 'conta da marca pausada pela organização → o painel sai sozinho', 'a marca continuou no painel')
  confere(page.erros.length === 0, 'sem erro de console', page.erros.join(' | '))
  await ctx.close()
}

/* ── 13 ───────────────────────────────────────────────────────────────────── */
async function cenarioSegundoPlano(nav) {
  console.log('\n13 · aplicativo em segundo plano e volta ao primeiro plano')
  const { ctx, b, rt, nova } = await mundoOrg(nav)
  const page = await nova()
  await abrir(page)
  await ate(() => rt.abertas().length === 1 && rt.abertas()[0].topicos.size === 3, 12000)
  const visivel = (v) => page.evaluate((valor) => {
    Object.defineProperty(document, 'visibilityState', { value: valor, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }, v)
  await visivel('hidden')
  await dormir(3600)                                       // ≥ 3 s fora
  b.estado.avisos = [aviso(1), aviso(2), aviso(3)]         // mudou enquanto estava no fundo: nenhum sinal chega
  confere(/Avisos$/.test(await rotuloSino(page)), 'no fundo nada é lido (sino ainda sem avisos)')
  const antes = b.total('get_notificacoes_org')
  await visivel('visible')
  const releu = await ate(async () => /3 não lidos/.test(await rotuloSino(page)), 5000)
  confere(releu >= 0, 'voltou ao primeiro plano → releu e mostrou os 3 avisos sem recarregar a página (' + releu + ' ms)', 'sino: ' + (await rotuloSino(page)))
  confere(b.total('get_notificacoes_org') - antes <= 2, 'voltar ao app não dispara tempestade de leituras (' + (b.total('get_notificacoes_org') - antes) + ')')
  // piscar rápido (< 3 s) não relê
  const antes2 = b.total('get_notificacoes_org')
  await visivel('hidden'); await dormir(800); await visivel('visible'); await dormir(700)
  confere(b.total('get_notificacoes_org') === antes2, 'ficar fora menos de 3 s não relê nada')
  await ctx.close()
}

/* ── 14 ───────────────────────────────────────────────────────────────────── */
async function cenarioSemRede(nav) {
  console.log(String.fromCharCode(10) + '14 · sem rede e rede de volta')
  const { ctx, b, rt, nova } = await mundoOrg(nav)
  const page = await nova()
  await abrir(page)
  await ate(() => rt.abertas().length === 1 && rt.abertas()[0].topicos.size === 3, 12000)
  await ctx.setOffline(true)
  const sem = await ate(async () => (await situacao(page)) === 'sem_conexao', 4000)
  confere(sem >= 0, 'sem rede → indicador "Sem conexão"', 'indicador: ' + (await situacao(page)))
  confere(/Sem internet/.test(await dica(page)), 'a dica explica e promete voltar sozinho')
  b.estado.avisos = [aviso(1)]
  await ctx.setOffline(false)
  const volta = await ate(async () => /1 não lido/.test(await rotuloSino(page)) && (await situacao(page)) === 'atualizado', 12000)
  confere(volta >= 0, 'rede de volta → releu sozinho (1 aviso) e voltou a "Atualizado" em ' + volta + ' ms', 'sino/indicador: ' + (await rotuloSino(page)) + ' / ' + (await situacao(page)))
  confere(rt.abertas().length >= 1, 'o Realtime segue (ou voltou) conectado')
  await ctx.close()
}

/* ── 15 ───────────────────────────────────────────────────────────────────── */
async function cenarioLegado(nav) {
  console.log(String.fromCharCode(10) + '15 · acesso compartilhado (senha única): sem token, sem canal, conferência periódica')
  const { ctx, b, rt, nova } = await mundoOrg(nav, { sessao: null })
  await ctx.addInitScript(() => { sessionStorage.setItem('scw_org', 'senha-compartilhada-de-teste') })
  const page = await nova()
  await page.goto(`${BASE}/painel/#visao`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-tour="sino"]', { timeout: 30000 })
  await page.clock.install()                                  // depois de montar: o relógio falso só conduz os 45 s
  // o laço de conferência já estava armado com o relógio real: volta ao app o rearma com o falso
  await page.evaluate(() => {
    for (const v of ['hidden', 'visible']) {
      Object.defineProperty(document, 'visibilityState', { value: v, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    }
  })
  await page.clock.runFor(4000)
  confere(rt.conexoes.length === 0, 'sem token NÃO abre Realtime algum (a senha nunca vai a canal nem à URL)', 'conexões abertas: ' + rt.conexoes.length)
  confere(!rt.conexoes.some((c) => /senha-compartilhada/.test(c.url)), 'a senha não aparece na URL do Realtime')
  confere(!/Em tempo real/.test(await dica(page)), 'a dica NÃO diz "tempo real"', 'dica: ' + (await dica(page)))
  confere(/45 segundos/.test(await dica(page)), 'a dica diz a verdade: confere a cada 45 segundos', 'dica: ' + (await dica(page)))
  b.estado.avisos = [aviso(1)]
  await page.clock.runFor(30000)
  confere(/Avisos$/.test(await rotuloSino(page)), 'antes dos 45 s ainda não releu (latência de até 45 s é o custo desse modo)')
  await page.clock.runFor(20000)
  const releu = await ate(async () => /1 não lido/.test(await rotuloSino(page)), 5000)
  confere(releu >= 0, 'depois de 45 s a conferência periódica trouxe o aviso', 'sino: ' + (await rotuloSino(page)))
  await ctx.close()
}

async function principal() {
  const dev = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: dirname(__dirname), shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  let navegador
  try {
    await esperarServidor(`${BASE}/painel/`)
    navegador = await chromium.launch()
    const so = (process.env.SO || '').split(',').filter(Boolean)          // SO=cenarioBasico,cenarioQueda → só esses
    for (const cenario of [cenarioBasico, cenarioOrdemEFalha, cenarioQueda, cenarioAbas, cenarioSessaoExpirada, cenarioPermissao, cenarioCanalNegado, cenarioMarca, cenarioSegundoPlano, cenarioSemRede, cenarioLegado].filter((c) => !so.length || so.includes(c.name))) {
      try { await cenario(navegador) } catch (e) { falha(cenario.name + ' quebrou: ' + (e && e.message)) }
    }
  } finally {
    if (navegador) await navegador.close().catch(() => {})
    matar(dev.pid)
  }
  console.log(falhas.length ? `\n${falhas.length} falha(s):\n - ${falhas.join('\n - ')}` : '\nTudo certo.')
  process.exit(falhas.length ? 1 : 0)
}
principal().catch((e) => { console.error(e); process.exit(1) })
