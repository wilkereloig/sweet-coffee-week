/*
 * Fumaça das vistas da organização NO NAVEGADOR (19/10/2026): abre CADA módulo e CADA aba do painel real
 * (Vite, StrictMode ligado) contra backend e Realtime FALSOS e reprova se a tela lançar erro não tratado
 * (ReferenceError, TypeError de render), cair no ErrorBoundary ou ficar em branco.
 *
 *   node tests/painel-sincronizacao-fumaca-navegador.mjs
 *
 * ⚠️ O que isto NÃO prova: o conteúdo certo de cada tela (o servidor falso responde vazio). Só prova que ela
 * monta, assina a sincronização e sobrevive a um sinal de cada domínio, o que pegaria identificador esquecido
 * ou ordem de hooks quebrada nas vistas religadas à camada de sincronização.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { criarBackend, criarRealtime, sessaoGuardada, dormir } from './helpers/backend-falso.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5233
const BASE = `http://localhost:${PORT}`
const UID = 'u-admin-0001'
const EMAIL = 'admin.teste@equipe.sweetcoffeeweek.com.br'
const PERMISSOES = ['acesso.gerir', 'cadastro.editar', 'curadoria.decidir', 'dado.ler', 'edicao.gerir', 'editorial.editar', 'editorial.ler', 'importacao.gerir', 'marca.liberar', 'mensagem.enviar', 'pagamento.gerir', 'redes.ver', 'redes.editar', 'redes.aprovar', 'equipe.gerir', 'relatorio.ler', 'contato.gerir', 'voucher.gerir', 'arquivo.gerir', 'presskit.gerir', 'resposta.ler']
// Mesmos domínios do vocabulário fechado (lib/sync/dominios.js): um sinal de cada, para provar que nenhuma tela quebra ao reler.
const DOMINIOS = ['participantes', 'cadastro', 'unidades', 'temas', 'logos', 'correcoes', 'pedidos', 'fotos', 'arquivos', 'materiais', 'edicao', 'publicacao', 'mensagens', 'avisos', 'vendas', 'vouchers', 'acessos', 'redes', 'biblioteca', 'editorial', 'perfis', 'contatos', 'preenchimento', 'respostas', 'atividade', 'configuracao']
// vista/aba — lidas de painel-app/src/components/Modulos.jsx
const ROTAS = [
  '#visao', '#participantes/lista', '#participantes/candidaturas', '#participantes/temas', '#participantes/vendas', '#participantes/publicacao', '#participantes/preenchimento',
  '#contatos/pessoas', '#contatos/presskit', '#contatos/vouchers', '#contatos/recebidos',
  '#operacao/pedidos', '#operacao/fotos', '#operacao/materiais',
  '#social/planejamento', '#social/biblioteca', '#social/participantes',
  '#arquivos/gerais', '#arquivos/participantes', '#arquivos/arquivados',
  '#edicao/configuracao', '#edicao/publicacao', '#edicao/avaliacoes', '#edicao/edicoes',
  '#admin/equipe', '#admin/revisao', '#admin/importacoes', '#admin/historico', '#admin/formularios',
]
const falhas = []
const matar = (pid) => { if (!pid) return; try { if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL') } catch { /* já morto */ } }
async function esperarServidor(url, ms = 60000) {
  const t = Date.now()
  while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return } catch { /* subindo */ } await dormir(400) }
  throw new Error('servidor de desenvolvimento não respondeu')
}

const ROTAS_MARCA = ['#inicio', '#cadastro', '#combo/1', '#combo/2', '#combo/3', '#fotos', '#arquivos', '#pedidos', '#mensagens', '#guia']
const UID_M = 'u-marca-0001'
const PID = '99999999-0000-4000-8000-000000000001'

/* Abre cada rota com um sinal de cada domínio chegando por `topicos`; devolve as falhas. */
async function varrer(page, rt, rotas, topicos, ancora, rotulo) {
  let erros = []
  page.removeAllListeners('pageerror'); page.removeAllListeners('console')
  page.on('pageerror', (e) => erros.push('pageerror: ' + String(e)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::|status of 4|status of 5|erro simulado|não mockado/.test(m.text())) erros.push('console: ' + m.text().slice(0, 300)) })
  const texto = () => page.evaluate(() => ({ n: (document.querySelector('main, #root') || document.body).innerText.trim().length, caiu: /Algo deu errado|Something went wrong|Unexpected Application Error/i.test(document.body.innerText) }))
  await page.goto(`${BASE}/painel/${rotas[0]}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector(ancora, { timeout: 30000 })
  for (const rota of rotas) {
    erros = []
    await page.evaluate((r) => { location.hash = r }, rota)
    await dormir(700)
    const antes = await texto()
    for (const d of DOMINIOS) for (const t of topicos) rt.empurrar(t, { d, r: 'x' })
    await dormir(1300)
    const depois = await texto()
    const problemas = []
    if (antes.caiu || depois.caiu) problemas.push('caiu no ErrorBoundary')
    if (!antes.n || !depois.n) problemas.push('tela em branco')
    if (erros.length) problemas.push(...erros.slice(0, 3))
    if (problemas.length) { falhas.push(rotulo + ' ' + rota + ' → ' + problemas.join(' | ')); console.log('  ✗ ' + rotulo + ' ' + rota + ' → ' + problemas.join(' | ')) } else console.log('  ✓ ' + rotulo + ' ' + rota)
  }
}

async function principal() {
  const dev = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: dirname(__dirname), shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  let nav
  try {
    await esperarServidor(`${BASE}/painel/`)
    nav = await chromium.launch()
    // ── organização ──
    {
      const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } })
      const b = criarBackend(); const rt = criarRealtime()
      b.rpcs.minhas_permissoes = () => [{ acoes: PERMISSOES, funcao: 'administrador', rotulo: 'Administrador', ativo: true, deve_trocar_senha: false }]
      b.rpcs.meu_perfil = () => ({ user_id: UID, nome: 'Admin Teste', funcao: 'administrador', funcao_rotulo: 'Administrador' })
      b.rpcs.equipe_diretorio = () => [{ user_id: UID, nome: 'Admin Teste', funcao: 'administrador', funcao_rotulo: 'Administrador', avatar_path: null }]
      b.rpcs.admin_ping = () => true
      b.rpcs.sync_meus_canais = () => ['scw:org', 'scw:social', 'scw:pessoa:' + UID]
      b.rpcs.get_notificacoes_org = () => []
      await b.instalar(ctx); await rt.instalar(ctx)
      await ctx.addInitScript((s) => { if (!localStorage.getItem('scw_org_conta') && s) localStorage.setItem('scw_org_conta', s) }, sessaoGuardada(UID, EMAIL))
      await varrer(await ctx.newPage(), rt, ROTAS, ['scw:org', 'scw:social', 'scw:pessoa:' + UID], '[data-tour="sino"]', 'org')
      await ctx.close()
    }
    // ── marca ──
    {
      const ctx = await nav.newContext({ viewport: { width: 420, height: 860 } })
      const b = criarBackend(); const rt = criarRealtime()
      b.tabelas.perfis = () => [{ deve_trocar_senha: false, ativo: true, bloqueado_em: null }]
      b.tabelas.participantes = () => [{ id: PID, nome_marca: 'Doce Sol', slug: 'docesol', user_id: UID_M, status_cadastro: 'em_preenchimento' }]
      b.tabelas.participacoes = () => [{ id: 'pa-1', participante_id: PID, edicao_codigo: '2026.2', status_cadastro: 'em_preenchimento' }]
      b.tabelas.notificacoes = () => []
      b.rpcs.sync_meus_canais = () => ['scw:pessoa:' + UID_M, 'scw:marcas', 'scw:marca:' + PID]
      b.rpcs.marca_minha_logo = () => null
      await b.instalar(ctx); await rt.instalar(ctx)
      await ctx.addInitScript((s) => { localStorage.setItem('scw_marca', s) }, sessaoGuardada(UID_M, 'docesol@marca.sweetcoffeeweek.com.br'))
      await varrer(await ctx.newPage(), rt, ROTAS_MARCA, ['scw:marcas', 'scw:marca:' + PID, 'scw:pessoa:' + UID_M], '[data-tour="sino"]', 'marca')
      await ctx.close()
    }
  } finally {
    if (nav) await nav.close().catch(() => {})
    matar(dev.pid)
  }
  console.log(falhas.length ? `\n${falhas.length} falha(s)` : `\nTudo certo (${ROTAS.length} rotas da organização + ${ROTAS_MARCA.length} da marca).`)
  process.exit(falhas.length ? 1 : 0)
}
principal().catch((e) => { console.error(e); process.exit(1) })
