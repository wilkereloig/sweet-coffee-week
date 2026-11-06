/*
 * Balcão da marca e atalhos da organização no navegador (05/11/2026), contra backend e Realtime FALSOS.
 *
 *   node tests/painel-balcao-navegador.mjs          (de dentro de `tests/`)
 *   CAPTURAS=<pasta> node tests/painel-balcao-navegador.mjs   → imagens em 360/390/768/1280/1440
 *
 * Prova: escanear/digitar/ajuda logo no topo do Início da marca, registro só no botão "Registrar uso", erros do servidor em
 * frases claras, câmera nunca pedida sozinha, marca sem vouchers e leitura caída, ajuda sem poder de aprovar, e na Visão geral
 * da equipe os atalhos Vouchers e Pedidos de carimbo (só com dado.ler). Não prova o servidor real nem a câmera real.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { criarBackend, criarRealtime, sessaoGuardada, dormir } from './helpers/backend-falso.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5248
const BASE = `http://localhost:${PORT}`
const UID = 'u-marca-0001'
const PID = '99999999-0000-4000-8000-000000000001'
const PA = 'pa-1'
const CAPTURAS = process.env.CAPTURAS || ''
const TAMANHOS = [[360, 780], [390, 844], [768, 1024], [1280, 900], [1440, 900]]
const falhas = []
const ok = (cond, msg) => { if (cond) console.log('  ✓ ' + msg); else { falhas.push(msg); console.log('  ✗ ' + msg) } }
const matar = (pid) => { if (!pid) return; try { if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL') } catch { /* já morto */ } }
async function esperarServidor(url, ms = 60000) {
  const t = Date.now()
  while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return } catch { /* subindo */ } await dormir(400) }
  throw new Error('servidor de desenvolvimento não respondeu')
}

const itens = (descrever = true) => [
  { id: 'i1', participacao_id: PA, posicao: 1, tipo: 'doce', nome: 'Bolo de cenoura', descricao: 'Com cobertura' },
  { id: 'i2', participacao_id: PA, posicao: 2, tipo: 'salgado', nome: 'Coxinha', descricao: descrever ? 'Frango cremoso' : '' },
  { id: 'i3', participacao_id: PA, posicao: 3, tipo: 'bebida', nome: 'Café', descricao: descrever ? 'Coado' : '' },
]
const cenario = (c) => {
  const participacao = {
    id: PA, participante_id: PID, edicao_codigo: '2026.2', status_cadastro: 'em_preenchimento', combo_status: 'rascunho',
    tema_combo: 'Divertida Mente', tema_justificativa: 'Emoções', logo_id: 'l1', foto_liberacao: 'liberado', created_at: '2026-09-01T00:00:00Z',
    ...c.participacao,
  }
  return {
    participacao, itens: itens(c.descrever !== false), faltando: c.faltando ?? [],
    correcoes: c.correcoes || [], pub: c.pub || { estado: 'nao_publicado', alterado_apos_aprovacao: false },
    sessoes: c.sessoes || [], arquivos: c.arquivos || [], leituras: c.leituras || [], solicitacoes: c.solicitacoes || [], estados: c.estados || [],
  }
}

async function abrir(nav, c, viewport) {
  const d = cenario(c)
  const ctx = await nav.newContext({ viewport: { width: viewport[0], height: viewport[1] } })
  const b = criarBackend(); const rt = criarRealtime()
  b.tabelas.perfis = () => [{ deve_trocar_senha: false, ativo: true, bloqueado_em: null }]
  b.tabelas.participantes = () => [{ id: PID, nome_marca: 'Doce Sol', responsavel: 'Ana', telefone: '84999998888', slug: 'docesol', user_id: UID, created_at: '2026-09-01T00:00:00Z' }]
  b.tabelas.participacoes = () => [d.participacao]
  b.tabelas.participantes_itens = () => d.itens
  b.tabelas.participacao_unidades = () => [{ id: 'pu1', participacao_id: PA, unidade_id: 'un1', id_publico: 'u1', participa: true, consumo_local: 'sim', retirada: 'sim', delivery_combo: 'nao', ordem: 1, endereco: 'Rua A, 10', horarios: 'Ter a dom, 10h às 22h', horario_festival: [] }]
  b.tabelas.unidades = () => [{ id: 'un1', logradouro: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'Natal', uf: 'RN', nome_unidade: 'Centro' }]
  b.tabelas.correcoes_campo = () => d.correcoes
  b.tabelas.edicoes = () => [{ codigo: '2026.2', nome: 'Cartoon', tema: 'Cartoon', festival_inicio: '2026-11-05', festival_fim: '2026-11-15', valor_combo: 25 }]
  b.tabelas.notificacoes = () => []
  b.tabelas.sessoes_fotos = () => d.sessoes
  b.tabelas.arquivos = () => d.arquivos
  b.tabelas.arquivo_leitura = () => d.leituras
  b.tabelas.solicitacoes = () => d.solicitacoes
  b.tabelas.solicitacao_estado = () => d.estados
  b.rpcs.sync_meus_canais = () => ['scw:pessoa:' + UID, 'scw:marcas', 'scw:marca:' + PID]
  b.rpcs.marca_minha_logo = () => ({ atual: { id: 'l1' }, versoes: [] })
  b.rpcs.marca_previa_publica = () => ({ previa: {}, faltando: d.faltando })
  if (c.vouchers !== undefined) b.rpcs.marca_meus_vouchers = () => c.vouchers
  b.rpcs.marca_minha_publicacao = () => d.pub
  await b.instalar(ctx); await rt.instalar(ctx)
  await ctx.addInitScript((s) => { localStorage.setItem('scw_marca', s); localStorage.setItem('scw_tour_marca_99999999-0000-4000-8000-000000000001', '1'); localStorage.setItem('scw_convite_aparelho_marca_99999999-0000-4000-8000-000000000001', String(Date.now())) }, sessaoGuardada(UID, 'docesol@marca.sweetcoffeeweek.com.br'))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  return { ctx, page, erros, b }
}
const textoDe = (page) => page.evaluate(() => document.body.innerText)

async function irPara(page, hash) {
  await page.goto(`${BASE}/painel/${hash}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-tour="sino"]', { timeout: 30000 })
  await dormir(2200)
  // O tour da equipe abre sozinho na 1ª visita e cobre a tela (o da marca já vem dispensado); o teste dele é outro.
  await page.getByRole('button', { name: 'Pular tour' }).click({ timeout: 1500 }).catch(() => {})
  await dormir(300)
}

async function capturar(page, nome, w) {
  if (!CAPTURAS) return
  mkdirSync(CAPTURAS, { recursive: true })
  await page.screenshot({ path: join(CAPTURAS, nome + '-' + w + '.png'), fullPage: true })
}

const VOUCHERS = { total: 7, distribuidos: 3, utilizados: [{ codigo: 'SCW-AB2CD', canal: 'fisico', utilizado_em: '2026-11-05T15:00:00Z' }], virtuais: { total: 2, distribuidos: 1 } }
const TODAS = ['dado.ler', 'producao.gerir', 'relatorio.ler', 'curadoria.decidir', 'redes.ver', 'acesso.gerir']
const UID_ORG = 'u-admin-0001'
const EMAIL_ORG = 'admin.teste@equipe.sweetcoffeeweek.com.br'

async function abrirOrg(nav, permissoes, viewport) {
  const ctx = await nav.newContext({ viewport: { width: viewport[0], height: viewport[1] } })
  const b = criarBackend(); const rt = criarRealtime()
  b.rpcs.minhas_permissoes = () => [{ acoes: permissoes, funcao: 'administrador', rotulo: 'Administrador', ativo: true, deve_trocar_senha: false }]
  b.rpcs.meu_perfil = () => ({ user_id: UID_ORG, nome: 'Admin Teste', funcao: 'administrador', funcao_rotulo: 'Administrador' })
  b.rpcs.equipe_diretorio = () => [{ user_id: UID_ORG, nome: 'Admin Teste', funcao: 'administrador', funcao_rotulo: 'Administrador', avatar_path: null }]
  b.rpcs.admin_ping = () => true
  b.rpcs.sync_meus_canais = () => ['scw:org', 'scw:social', 'scw:pessoa:' + UID_ORG]
  b.rpcs.get_notificacoes_org = () => []
  b.rpcs.get_quero_participar = () => []
  b.rpcs.get_participantes = () => []
  b.rpcs.get_temas = () => []
  b.rpcs.get_edicoes = () => [{ codigo: '2026.2', atual: true, festival_inicio: '2026-11-05', festival_fim: '2026-11-15', cronograma: [] }]
  b.rpcs.get_solicitacoes_admin = () => []
  b.rpcs.get_conversas = () => []
  b.rpcs.get_atividade = () => []
  b.rpcs.get_revisao = () => []
  b.rpcs.redes_resumo = () => ({ hoje: 0, proximas: 0, atrasadas: 0, minhas: 0, sem_responsavel: 0, sem_data: 0, sem_arte: 0, sem_legenda: 0, aprovacao: 0, aprovadas: 0, ajuste: 0, proximos_itens: [] })
  b.rpcs.get_combos_em_analise = () => []
  b.rpcs.caca_excecao_listar = () => ({ itens: [], pendentes: 3 })
  await b.instalar(ctx); await rt.instalar(ctx)
  await ctx.addInitScript((s) => { if (!localStorage.getItem('scw_org_conta') && s) localStorage.setItem('scw_org_conta', s) }, sessaoGuardada(UID_ORG, EMAIL_ORG))
  await ctx.addInitScript((u) => { localStorage.setItem('scw_convite_aparelho_organizacao_' + u, String(Date.now())); localStorage.setItem('scw_tour_organizacao_Admin Teste', '1') }, UID_ORG) // o convite de instalar/avisos tem teste próprio (painel-convite-navegador)
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  return { ctx, page, erros, b }
}
const semRolagemHorizontal = (page) => page.evaluate(() => { const e = document.querySelector('.pn-vista') || document.querySelector('.og-vista') || document.documentElement; return e.scrollWidth <= e.clientWidth + 1 })

async function principal() {
  const dev = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: dirname(__dirname), shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  let nav
  try {
    await esperarServidor(`${BASE}/painel/`)
    nav = await chromium.launch()

    console.log('B1 marca com vouchers: balcão é o primeiro bloco, com os três atalhos à vista')
    {
      const { ctx, page, erros } = await abrir(nav, { vouchers: VOUCHERS }, [390, 844])
      await irPara(page, '#inicio')
      const t = await textoDe(page)
      ok(/Escanear QR do voucher/.test(t) && /Digitar código do voucher/.test(t) && /Ajudar o cliente a carimbar/.test(t), 'atalhos visíveis')
      const pos = await page.evaluate(() => {
        const ids = ['.bal', '.im-identificacao, .gm-identificacao, [data-bloco="identificacao"]']
        const bal = document.querySelector('.bal'); const vista = document.querySelector('.pn-vista')
        const topo = bal ? bal.getBoundingClientRect().top : -1
        return { topo, altura: window.innerHeight, rolagem: vista ? vista.scrollTop : 0 }
      })
      ok(pos.topo >= 0 && pos.topo < pos.altura * 0.75, 'o balcão aparece na primeira tela do celular sem rolar (topo em ' + Math.round(pos.topo) + 'px)')
      const alvo = await page.evaluate(() => [...document.querySelectorAll('.bal-acao')].map((e) => Math.round(e.getBoundingClientRect().height)))
      ok(alvo.length === 3 && alvo.every((h) => h >= 44), 'alvos de toque com 44px ou mais (' + alvo.join(',') + ')')
      ok(/3 já distribuídos/.test(t) && /1 usados/.test(t), 'a contagem do cartão carrega')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      for (const [w, h] of TAMANHOS) { await page.setViewportSize({ width: w, height: h }); await dormir(300); await capturar(page, 'b1-inicio-marca', w) }
      await ctx.close()
    }

    console.log('B2 digitar o código: só registra no botão, e pede confirmação (campo preenchido, nada enviado antes)')
    {
      const { ctx, page, b } = await abrir(nav, { vouchers: VOUCHERS }, [390, 844])
      b.rpcs.marca_usar_voucher = (corpo) => ({ codigo: corpo.p_codigo, utilizado_em: new Date().toISOString() })
      await irPara(page, '#inicio')
      ok(await page.locator('input[placeholder="SCW-XXXXX"]').count() === 0, 'o campo só aparece depois do toque em "Digitar código"')
      await page.getByRole('button', { name: /Digitar código do voucher/ }).click()
      await dormir(300)
      ok(await page.evaluate(() => document.activeElement && document.activeElement.placeholder === 'SCW-XXXXX'), 'o foco vai para o campo')
      await page.fill('input[placeholder="SCW-XXXXX"]', 'scw-ab2cd')
      await dormir(200)
      ok((b.chamadas.marca_usar_voucher || 0) === 0, 'digitar não registra nada')
      await page.getByRole('button', { name: 'Registrar uso' }).click()
      await dormir(600)
      ok((b.chamadas.marca_usar_voucher || 0) === 1, 'o botão "Registrar uso" faz a única chamada')
      ok(/Voucher SCW-AB2CD registrado/.test(await textoDe(page)), 'mensagem de sucesso com o código')
      await ctx.close()
    }

    console.log('B3 erros do servidor viram frases claras (usado, cancelado, não distribuído, outra marca/inexistente, rede)')
    {
      const casos = [
        ['voucher_ja_utilizado', /já foi usado/i], ['voucher_cancelado', /cancelado/i], ['voucher_nao_distribuido', /ainda não foi entregue/i],
        ['voucher_nao_encontrado', /não encontrado/i],
      ]
      const { ctx, page } = await abrir(nav, { vouchers: VOUCHERS }, [390, 844])
      let erroDaVez = ''
      await ctx.route(/\/rest\/v1\/rpc\/marca_usar_voucher/, (route) => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: erroDaVez }) }))
      await irPara(page, '#inicio')
      await page.getByRole('button', { name: /Digitar código do voucher/ }).click()
      for (const [chave, re] of casos) {
        erroDaVez = chave
        await page.fill('input[placeholder="SCW-XXXXX"]', 'SCW-AB2CD')
        await page.getByRole('button', { name: 'Registrar uso' }).click()
        await dormir(500)
        ok(re.test(await textoDe(page)), chave + ' → ' + re)
      }
      await page.unroute(/\/rest\/v1\/rpc\/marca_usar_voucher/)
      await ctx.route(/\/rest\/v1\/rpc\/marca_usar_voucher/, (route) => route.abort('failed'))
      await page.fill('input[placeholder="SCW-XXXXX"]', 'SCW-AB2CD')
      await page.getByRole('button', { name: 'Registrar uso' }).click()
      await dormir(700)
      ok(/Sem conexão agora.*NÃO foi registrado/i.test(await textoDe(page)), 'falha de conexão diz que NÃO registrou')
      await ctx.close()
    }

    console.log('B4 sem leitor de QR no aparelho: o botão continua e a explicação leva à digitação; a câmera nunca abre sozinha')
    {
      const { ctx, page } = await abrir(nav, { vouchers: VOUCHERS }, [390, 844])
      await ctx.addInitScript(() => { try { delete window.BarcodeDetector } catch { /* segue */ } window.__camera = 0; const md = navigator.mediaDevices; if (md) { const o = md.getUserMedia.bind(md); md.getUserMedia = (...a) => { window.__camera++; return o(...a) } } })
      await irPara(page, '#inicio')
      ok(await page.evaluate(() => window.__camera) === 0, 'abrir a tela não pede a câmera')
      await page.getByRole('button', { name: /Escanear QR do voucher/ }).click()
      await dormir(400)
      const t = await textoDe(page)
      ok(/não lê QR dentro do painel/i.test(t) && /digite o código/i.test(t), 'explica o caminho alternativo (câmera do celular ou digitar)')
      ok(await page.evaluate(() => window.__camera) === 0, 'sem leitor, a câmera não é pedida')
      ok(await page.locator('input[placeholder="SCW-XXXXX"]').count() === 1, 'o campo de digitação já aparece')
      await ctx.close()
    }

    console.log('B5 câmera negada: avisa e deixa digitar')
    {
      const { ctx, page } = await abrir(nav, { vouchers: VOUCHERS }, [390, 844])
      await ctx.addInitScript(() => { window.BarcodeDetector = function () { this.detect = async () => [] }; navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('negada'), { name: 'NotAllowedError' })) })
      await irPara(page, '#inicio')
      await page.getByRole('button', { name: /Escanear QR do voucher/ }).click()
      await dormir(600)
      ok(/câmera não foi liberada/i.test(await textoDe(page)), 'mensagem de permissão negada')
      ok(await page.locator('input[placeholder="SCW-XXXXX"]').count() === 1, 'o campo de digitação aparece como alternativa')
      await ctx.close()
    }

    console.log('B6 marca sem vouchers e leitura caída')
    {
      const { ctx, page } = await abrir(nav, { vouchers: { total: 0, distribuidos: 0, utilizados: [] } }, [390, 844])
      await irPara(page, '#inicio')
      const t = await textoDe(page)
      ok(/não tem vouchers nesta edição/i.test(t), 'sem vouchers: diz o motivo')
      ok(await page.getByRole('button', { name: /Escanear QR do voucher/ }).isDisabled(), 'escanear fica desligado')
      ok(!(await page.getByRole('button', { name: /Ajudar o cliente a carimbar/ }).isDisabled()), 'a ajuda com carimbo segue ligada')
      await capturar(page, 'b6-sem-vouchers', 390)
      await ctx.close()
      const caida = await abrir(nav, {}, [390, 844])
      caida.b.falhas.marca_meus_vouchers = 99
      await irPara(caida.page, '#inicio')
      ok(/Não deu para carregar a contagem/i.test(await textoDe(caida.page)), 'leitura caída é dita')
      ok(!(await caida.page.getByRole('button', { name: /Digitar código do voucher/ }).isDisabled()), 'com a leitura caída os atalhos seguem ligados')
      await caida.ctx.close()
    }

    console.log('B7 Ajudar o cliente a carimbar: orientação, sem poder de aprovar e sem chamada ao servidor')
    {
      const { ctx, page, b } = await abrir(nav, { vouchers: VOUCHERS }, [390, 844])
      await irPara(page, '#inicio')
      const antes = Object.keys(b.chamadas).length
      await page.getByRole('button', { name: /Ajudar o cliente a carimbar/ }).click()
      await dormir(600)
      const t = await textoDe(page)
      ok(/Estou na casa e o GPS não funciona/.test(t), 'cita o pedido de revisão existente')
      ok(/Quem decide o pedido é a organização/.test(t) && /não aprova nem cria carimbo/.test(t), 'deixa claro que a casa não aprova')
      ok(/nunca peça nem aceite o link de acesso ou a chave pessoal/i.test(t), 'não pede a chave pessoal do cliente')
      ok(Object.keys(b.chamadas).length === antes || Object.keys(b.chamadas).every((k) => !/carimbo|excecao|voucher_usar|marca_usar/i.test(k)), 'abrir a ajuda não chama o servidor de carimbo')
      await capturar(page, 'b7-ajuda-carimbo', 390)
      await page.keyboard.press('Escape'); await dormir(500)
      ok(!/Ajudar o cliente a carimbar/.test(await textoDe(page)), 'Esc fecha a folha')
      await ctx.close()
    }

    console.log('B8 sem rolagem horizontal em celular, tablet e desktop')
    {
      const { ctx, page } = await abrir(nav, { vouchers: VOUCHERS }, [360, 780])
      await irPara(page, '#inicio')
      for (const [w, h] of TAMANHOS) {
        await page.setViewportSize({ width: w, height: h }); await dormir(250)
        ok(await semRolagemHorizontal(page), `Início da marca em ${w}px sem rolagem horizontal`)
      }
      await ctx.close()
    }

    console.log('O1 organização com dado.ler: atalhos de Vouchers e Pedidos de carimbo, com a contagem; levam às telas certas')
    {
      const { ctx, page, erros } = await abrirOrg(nav, TODAS, [1280, 900])
      await irPara(page, '#visao')
      const t = await textoDe(page)
      ok(/Vouchers e carimbos/.test(t) && /Pedidos de carimbo/.test(t), 'o bloco aparece')
      ok(/3 pedidos esperando decisão/.test(t), 'a contagem de pendentes vem da fila existente')
      ok(!(/Escanear|Digitar código/.test(t)), 'a organização não ganha escanear/digitar (a baixa é da marca)')
      for (const [w, h] of [[390, 844], [768, 1024], [1280, 900], [1440, 900]]) { await page.setViewportSize({ width: w, height: h }); await dormir(300); await capturar(page, 'o1-visao-organizacao', w) }
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.getByRole('button', { name: /Pedidos de carimbo/ }).click()
      await dormir(1500)
      ok(/#edicao\/carimbos/.test(page.url()) && /sub=presenca/.test(page.url()), 'abre Edição › Carimbos na fila de presença (' + page.url().split('#')[1] + ')')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
      const v = await abrirOrg(nav, TODAS, [1280, 900])
      await irPara(v.page, '#visao')
      await v.page.getByRole('button', { name: /Vouchers/ }).first().click()
      await dormir(1200)
      ok(/#contatos\/vouchers/.test(v.page.url()), 'Vouchers abre Contatos › Vouchers (' + v.page.url().split('#')[1] + ')')
      await v.ctx.close()
    }

    console.log('O2 sem dado.ler: o bloco não aparece')
    {
      const { ctx, page } = await abrirOrg(nav, ['redes.ver'], [1280, 900])
      await irPara(page, '#visao')
      ok(!/Vouchers e carimbos/.test(await textoDe(page)), 'função sem dado.ler não vê os atalhos')
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
