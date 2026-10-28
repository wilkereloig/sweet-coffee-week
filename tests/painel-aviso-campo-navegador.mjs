/*
 * Aviso "<marca> alterou o cadastro" → o toque leva ao CAMPO (27/10/2026), no navegador, contra backend e Realtime FALSOS:
 *
 *   node tests/painel-aviso-campo-navegador.mjs          (de dentro de `tests/`)
 *   CAPTURAS=<pasta> node tests/painel-aviso-campo-navegador.mjs
 *
 * Prova: o sino mostra os NOMES dos campos; o toque abre a ficha na seção certa, rola até o campo (ou o bloco do item/da
 * unidade) e o destaca; link com campo desconhecido cai na seção sem erro; trocar de seção solta o campo do endereço.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { criarBackend, criarRealtime, sessaoGuardada, dormir } from './helpers/backend-falso.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5247
const BASE = `http://localhost:${PORT}`
const CAPTURAS = process.env.CAPTURAS || ''
const UID = 'u-admin-0001'
const EMAIL = 'admin.teste@equipe.sweetcoffeeweek.com.br'
const TODAS = ['acesso.gerir', 'cadastro.editar', 'curadoria.decidir', 'dado.ler', 'edicao.gerir', 'editorial.editar', 'editorial.ler', 'marca.liberar', 'mensagem.enviar', 'pagamento.gerir', 'producao.gerir', 'redes.ver', 'redes.editar', 'redes.aprovar', 'relatorio.ler']
const M1 = 'aaaaaaaa-0000-4000-8000-000000000001'
const PA = 'bbbbbbbb-0000-4000-8000-000000000001'
const PU1 = 'cccccccc-0000-4000-8000-000000000001'
const falhas = []
const ok = (cond, msg) => { if (cond) console.log('  ✓ ' + msg); else { falhas.push(msg); console.log('  ✗ ' + msg) } }
const matar = (pid) => { if (!pid) return; try { if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL') } catch { /* já morto */ } }
async function esperarServidor(url, ms = 60000) {
  const t = Date.now()
  while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return } catch { /* subindo */ } await dormir(400) }
  throw new Error('servidor de desenvolvimento não respondeu')
}
async function capturar(page, nome) {
  if (!CAPTURAS) return
  mkdirSync(CAPTURAS, { recursive: true })
  await page.screenshot({ path: join(CAPTURAS, nome + '.png') })
}

const FICHA = {
  marca: { id: M1, nome_marca: 'Boldfood Confeitaria Inclusiva', responsavel: 'Carol', telefone: '84999990000', email: 'a@b.com', instagram: '@boldfood', site: 'https://boldfood.example', cnpj: '12345678000199', razao_social: 'Boldfood LTDA', apresentacao_publica: 'Confeitaria inclusiva.' },
  participacao: { id: PA, edicao_codigo: '2026.2', combo_status: 'em_analise', status_cadastro: 'cadastro_completo', tema_combo: 'Moana', tema_justificativa: 'Mar e ilhas', combo_nome: 'Ilha Doce', combo_descricao: 'Um combo do mar.', combo_para_viagem: true, custo_embalagem: '2.00', custo_delivery: '0.00' },
  itens: [
    { id: 'i1', posicao: 1, tipo: 'doce', nome: 'Bolo de coco', descricao: 'Coco e leite' },
    { id: 'i2', posicao: 2, tipo: 'salgado', nome: 'Empada', descricao: 'Frango' },
    { id: 'i3', posicao: 3, tipo: 'bebida', nome: 'Suco', descricao: 'Maracujá' },
  ],
  unidades: [{ id: PU1, unidade_id: 'u1', participa: true, ordem: 1, endereco: 'Rua A', bairro: 'Tirol', consumo_local: 'sim', retirada: 'sim', delivery_combo: 'nao', horario_festival: [] }],
  temas: [],
}

async function abrir(nav, aviso) {
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 700 } })
  const b = criarBackend(); const rt = criarRealtime()
  b.rpcs.minhas_permissoes = () => [{ acoes: TODAS, funcao: 'administrador', rotulo: 'Administrador', ativo: true, deve_trocar_senha: false }]
  b.rpcs.meu_perfil = () => ({ user_id: UID, nome: 'Admin Teste', funcao: 'administrador', funcao_rotulo: 'Administrador' })
  b.rpcs.equipe_diretorio = () => [{ user_id: UID, nome: 'Admin Teste', funcao: 'administrador', funcao_rotulo: 'Administrador', avatar_path: null }]
  b.rpcs.admin_ping = () => true
  b.rpcs.sync_meus_canais = () => ['scw:org', 'scw:social', 'scw:pessoa:' + UID]
  b.rpcs.get_notificacoes_org = () => (aviso ? [aviso] : [])
  b.rpcs.get_quero_participar = () => []
  b.rpcs.get_participantes = () => [{ id: M1, participacao_id: PA, nome_marca: 'Boldfood Confeitaria Inclusiva', edicao_codigo: '2026.2', combo_status: 'em_analise', status_cadastro: 'cadastro_completo', user_id: 'u1' }]
  b.rpcs.get_temas = () => []
  b.rpcs.get_edicoes = () => [{ codigo: '2026.2', atual: true, festival_inicio: '2026-11-05', festival_fim: '2026-11-15', cronograma: [] }]
  b.rpcs.get_solicitacoes_admin = () => []
  b.rpcs.get_conversas = () => []
  b.rpcs.get_atividade = () => []
  b.rpcs.get_revisao = () => []
  b.rpcs.get_ficha_360 = () => FICHA
  b.rpcs.get_publicacao = () => null
  b.rpcs.get_correcoes = () => []
  b.rpcs.redes_resumo = () => ({ hoje: 0, proximas: 0, atrasadas: 0, minhas: 0, sem_responsavel: 0, sem_data: 0, sem_arte: 0, sem_legenda: 0, aprovacao: 0, aprovadas: 0, ajuste: 0, proximos_itens: [] })
  await b.instalar(ctx); await rt.instalar(ctx)
  await ctx.addInitScript(([s, uid]) => {
    localStorage.setItem('scw_org_conta', s)
    localStorage.setItem('scw_tour_organizacao_admin.teste', '1')
    localStorage.setItem('scw_convite_aparelho_organizacao_' + uid, String(Date.now()))
    localStorage.setItem('scw_convite_aparelho_organizacao_' + uid + '-app', String(Date.now()))
  }, [sessaoGuardada(UID, EMAIL), UID])
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  return { ctx, page, erros }
}
async function ir(page, hash) {
  await page.goto(`${BASE}/painel/${hash}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-tour="sino"]', { timeout: 30000 })
  for (const rotulo of ['Pular', 'Agora não', 'Entendi']) {
    const b2 = page.getByRole('button', { name: rotulo })
    if (await b2.count()) { await b2.first().click().catch(() => {}); await dormir(300) }
  }
}
// O elemento destacado e se ele está dentro da área visível da página.
// Espera a rolagem suave terminar (a classe entra antes de a página chegar lá).
const destacado = async (page) => { await dormir(1500); return medir(page) }
const medir = (page) => page.evaluate(() => {
  const el = document.querySelector('.fg-alvo')
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { id: el.id, classe: el.className, visivel: r.top >= 0 && r.bottom <= window.innerHeight, texto: el.innerText.slice(0, 80) }
})
const URL_CAMPO = (sub, campo) => `#participantes/lista?campo=${campo}&item=${M1}&sub=${sub}`

async function principal() {
  const dev = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: dirname(__dirname), shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  let nav
  try {
    await esperarServidor(`${BASE}/painel/`)
    nav = await chromium.launch()

    console.log('C1 campo de dados: rola até ele e o destaca')
    {
      const { ctx, page, erros } = await abrir(nav)
      await ir(page, URL_CAMPO('combo', 'combo_nome'))
      await page.waitForSelector('.fg-alvo', { timeout: 15000 })
      const d = await destacado(page)
      ok(d && d.id === 'fg-campo-combo_nome', 'o campo "Nome do combo" está destacado (' + (d && d.id) + ')')
      ok(d && d.visivel, 'e está à vista na janela')
      ok(d && /Ilha Doce/.test(d.texto), 'com o valor da marca (' + (d && d.texto.replace(/\n/g, ' ')) + ')')
      await capturar(page, 'c1-campo')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('C2 item do combo e unidade: destaca o bloco inteiro')
    {
      const { ctx, page } = await abrir(nav)
      await ir(page, URL_CAMPO('combo', 'item-2'))
      await page.waitForSelector('.fg-alvo', { timeout: 15000 })
      let d = await destacado(page)
      ok(d && /fg-bloco/.test(d.classe) && /Empada/.test(d.texto), 'item 2 (salgado): o bloco do item está destacado (' + (d && d.texto.replace(/\n/g, ' ')) + ')')
      ok(d && d.visivel, 'e à vista')
      await ir(page, URL_CAMPO('unidades', 'uni-' + PU1))
      await page.waitForSelector('.fg-alvo', { timeout: 15000 })
      d = await destacado(page)
      ok(d && /fg-bloco/.test(d.classe) && d.id === '' , 'unidade: o bloco da unidade está destacado')
      ok(d && /Rua A|Unidade/.test(d.texto), 'com o endereço (' + (d && d.texto.replace(/\n/g, ' ')) + ')')
      await ctx.close()
    }

    console.log('C3 campo desconhecido cai na seção, sem erro')
    {
      const { ctx, page, erros } = await abrir(nav)
      await ir(page, URL_CAMPO('combo', 'campo_que_nao_existe'))
      await dormir(2500)
      ok((await destacado(page)) === null, 'nada destacado')
      ok(await page.locator('#fg-combo').count() === 1, 'a seção Tema e combo está na página')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('C4 trocar de seção solta o campo do endereço')
    {
      const { ctx, page } = await abrir(nav)
      await ir(page, URL_CAMPO('combo', 'combo_nome'))
      await page.waitForSelector('.fg-alvo', { timeout: 15000 })
      await page.locator('.fg-ancora', { hasText: 'Unidades' }).first().click()
      await dormir(800)
      const h = await page.evaluate(() => location.hash)
      ok(!/campo=/.test(h) && /sub=unidades/.test(h), 'o endereço trocou de seção e perdeu o campo (' + h + ')')
      await ctx.close()
    }

    console.log('C5 pelo sino: o aviso diz os campos e o toque leva ao primeiro')
    {
      const aviso = {
        id: 'av1', criada_em: new Date().toISOString(), tipo: 'cadastro', titulo: 'Boldfood Confeitaria Inclusiva alterou o cadastro',
        texto: 'Nome do combo · Salgado: descrição · Logo', link: `marcas/${M1}/combo/combo_nome`, ator_rotulo: 'Marca · Boldfood Confeitaria Inclusiva', lida: false, n_agrupadas: 3,
      }
      const { ctx, page, erros } = await abrir(nav, aviso)
      await ir(page, '#visao')
      await page.locator('[data-tour="sino"]').click()
      await page.getByText('Nome do combo · Salgado: descrição · Logo').waitFor({ timeout: 10000 })
      ok(true, 'o aviso lista os campos: "Nome do combo · Salgado: descrição · Logo"')
      await capturar(page, 'c5-sino')
      await page.getByText('Boldfood Confeitaria Inclusiva alterou o cadastro').click()
      await page.waitForSelector('.fg-alvo', { timeout: 15000 })
      const d = await destacado(page)
      ok(d && d.id === 'fg-campo-combo_nome' && d.visivel, 'o toque abriu a ficha e destacou o "Nome do combo" (' + (d && d.id) + ')')
      await capturar(page, 'c5-ficha')
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
