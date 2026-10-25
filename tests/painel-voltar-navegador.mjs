/*
 * Voltar + Telas recentes e o Voltar do SISTEMA (24/10/2026), no navegador, contra backend e Realtime FALSOS:
 *
 *   node tests/painel-voltar-navegador.mjs          (de dentro de `tests/`)
 *   CAPTURAS=<pasta> node tests/painel-voltar-navegador.mjs
 *
 * iPhone e Android são EMULADOS (tela, toque e user agent): o "Voltar do sistema" do Android é o mesmo
 * evento que `page.goBack()` dispara (popstate). Não prova o app instalado num aparelho real.
 */
import { chromium, devices } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { criarBackend, criarRealtime, sessaoGuardada, dormir } from './helpers/backend-falso.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5246
const BASE = `http://localhost:${PORT}`
const CAPTURAS = process.env.CAPTURAS || ''
const UID = 'u-admin-0001'
const EMAIL = 'admin.teste@equipe.sweetcoffeeweek.com.br'
const TODAS = ['acesso.gerir', 'cadastro.editar', 'curadoria.decidir', 'dado.ler', 'edicao.gerir', 'editorial.editar', 'editorial.ler', 'marca.liberar', 'mensagem.enviar', 'pagamento.gerir', 'producao.gerir', 'redes.ver', 'redes.editar', 'redes.aprovar', 'relatorio.ler']
const MARCA_UID = 'u-marca-0001'
const PID = '99999999-0000-4000-8000-000000000001'
const falhas = []
const ok = (cond, msg) => { if (cond) console.log('  ✓ ' + msg); else { falhas.push(msg); console.log('  ✗ ' + msg) } }
const matar = (pid) => { if (!pid) return; try { if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL') } catch { /* já morto */ } }
async function esperarServidor(url, ms = 60000) {
  const t = Date.now()
  while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return } catch { /* subindo */ } await dormir(400) }
  throw new Error('servidor de desenvolvimento não respondeu')
}
const aparelho = (nome) => { const d = { ...devices[nome] }; delete d.defaultBrowserType; return d }
async function capturar(page, nome) {
  if (!CAPTURAS) return
  mkdirSync(CAPTURAS, { recursive: true })
  await page.screenshot({ path: join(CAPTURAS, nome + '.png') })
}

async function abrirOrg(nav, contexto) {
  const ctx = await nav.newContext(contexto)
  const b = criarBackend(); const rt = criarRealtime()
  b.rpcs.minhas_permissoes = () => [{ acoes: TODAS, funcao: 'administrador', rotulo: 'Administrador', ativo: true, deve_trocar_senha: false }]
  b.rpcs.meu_perfil = () => ({ user_id: UID, nome: 'Admin Teste', funcao: 'administrador', funcao_rotulo: 'Administrador' })
  b.rpcs.equipe_diretorio = () => [{ user_id: UID, nome: 'Admin Teste', funcao: 'administrador', funcao_rotulo: 'Administrador', avatar_path: null }]
  b.rpcs.admin_ping = () => true
  b.rpcs.sync_meus_canais = () => ['scw:org', 'scw:social', 'scw:pessoa:' + UID]
  b.rpcs.get_notificacoes_org = () => []
  b.rpcs.get_quero_participar = () => []
  b.rpcs.get_participantes = () => [
    { id: 'm1', nome_marca: 'Sabor de Pão', edicao_codigo: '2026.2', combo_status: 'rascunho', status_cadastro: 'em_preenchimento', user_id: 'u1', participacao_id: 'pa1' },
  ]
  b.rpcs.get_temas = () => []
  b.rpcs.get_edicoes = () => [{ codigo: '2026.2', atual: true, festival_inicio: '2026-11-05', festival_fim: '2026-11-15', cronograma: [] }]
  b.rpcs.get_solicitacoes_admin = () => []
  b.rpcs.get_conversas = () => []
  b.rpcs.get_atividade = () => []
  b.rpcs.get_revisao = () => []
  b.rpcs.redes_resumo = () => ({ hoje: 0, proximas: 0, atrasadas: 0, minhas: 0, sem_responsavel: 0, sem_data: 0, sem_arte: 0, sem_legenda: 0, aprovacao: 0, aprovadas: 0, ajuste: 0, proximos_itens: [] })
  await b.instalar(ctx); await rt.instalar(ctx)
  await ctx.addInitScript(([s, uid]) => {
    if (sessionStorage.getItem('__ini')) return
    sessionStorage.setItem('__ini', '1')
    localStorage.setItem('scw_org_conta', s)
    localStorage.setItem('scw_tour_organizacao_' + 'admin.teste', '1')
    localStorage.setItem('scw_convite_aparelho_organizacao_' + uid, String(Date.now()))
    localStorage.setItem('scw_convite_aparelho_organizacao_' + uid + '-app', String(Date.now()))
  }, [sessaoGuardada(UID, EMAIL), UID])
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  await page.goto(`${BASE}/painel/#visao`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-tour="sino"]', { timeout: 30000 })
  await dormir(1500)
  // Tour ou convite ainda na frente (chave de outra conta): fecha.
  for (const rotulo of ['Pular', 'Agora não', 'Entendi']) {
    const b2 = page.getByRole('button', { name: rotulo })
    if (await b2.count()) { await b2.first().click().catch(() => {}); await dormir(400) }
  }
  return { ctx, page, erros }
}

const hash = (page) => page.evaluate(() => location.hash)
const trilha = (page) => page.locator('.pn-cabeca .pn-trilha')
const voltarBtn = (page) => page.locator('.pn-cabeca .pn-trilha__voltar')
async function abaCelular(page, rotulo) {
  await page.locator('.og-abasapp .og-abaapp', { hasText: rotulo }).first().click()
  await dormir(700)
}

async function principal() {
  const dev = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: dirname(__dirname), shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  let nav
  try {
    await esperarServidor(`${BASE}/painel/`)
    nav = await chromium.launch()

    console.log('E1 equipe no iPhone: "‹ Voltar" com o nome da tela anterior, sem mexer na altura do cabeçalho')
    {
      const { ctx, page, erros } = await abrirOrg(nav, aparelho('iPhone 13'))
      ok((await voltarBtn(page).count()) === 0, 'primeira tela: sem Voltar')
      const alturaAntes = await page.locator('.pn-cabeca').evaluate((e) => e.getBoundingClientRect().height)
      await abaCelular(page, 'participantes')
      await abaCelular(page, 'operação')
      ok(/#operacao/.test(await hash(page)), 'na Operação')
      const v = voltarBtn(page)
      ok((await v.count()) === 1, 'Voltar apareceu')
      ok((await v.innerText()).trim() === 'Participantes', 'mostra a tela anterior: "' + (await v.innerText()).trim() + '"')
      ok(/Voltar para Participantes/.test(await v.getAttribute('aria-label')), 'nome acessível: ' + (await v.getAttribute('aria-label')))
      const alturaDepois = await page.locator('.pn-cabeca').evaluate((e) => e.getBoundingClientRect().height)
      ok(Math.abs(alturaDepois - alturaAntes) <= 2, `altura do cabeçalho igual (${Math.round(alturaAntes)} → ${Math.round(alturaDepois)} px)`)
      const caixa = await v.evaluate((e) => { const r = e.getBoundingClientRect(); const a = getComputedStyle(e, '::before'); return { h: r.height, top: parseFloat(a.top) || 0, bottom: parseFloat(a.bottom) || 0 } })
      const toque = caixa.h - caixa.top - caixa.bottom
      ok(toque >= 44, 'área de toque ≥ 44 px (' + Math.round(caixa.h) + ' px visíveis, ' + Math.round(toque) + ' px de toque)')
      ok((await page.locator('.pn-cabeca__marca').isVisible()) === false, 'com o Voltar no canto, o selo sai (o nome cabe)')
      ok(!(await v.evaluate((e) => { const n = e.querySelector('.pn-trilha__nome'); return n.scrollWidth > n.clientWidth })), 'o nome "Participantes" cabe inteiro, sem "…"')
      const topoTitulo = await page.locator('.pn-cabeca__titulo').evaluate((e) => e.getBoundingClientRect().top)
      ok(topoTitulo >= 4, 'o título não encosta no topo (' + Math.round(topoTitulo) + ' px)')
      await capturar(page, 'e1-iphone-operacao')
      await v.click()
      await dormir(700)
      ok(/#participantes/.test(await hash(page)), 'tocou: voltou para Participantes')
      ok((await voltarBtn(page).innerText()).trim() === 'Visão geral', 'agora aponta a Visão geral')
      await voltarBtn(page).click()
      await dormir(700)
      ok(/#visao/.test(await hash(page)), 'voltou para a Visão geral')
      ok((await voltarBtn(page).count()) === 0, 'na primeira tela o Voltar some')
      ok((await page.locator('.pn-trilha__recentes').count()) === 1, '…e fica o "Telas recentes"')
      const largura = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
      ok(largura[0] <= largura[1], 'sem rolagem horizontal (' + largura.join('/') + ')')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 200))
      await ctx.close()
    }

    console.log('E2 Telas recentes: lista da sessão e pulo direto')
    {
      const { ctx, page, erros } = await abrirOrg(nav, aparelho('iPhone 13'))
      await abaCelular(page, 'participantes')
      await abaCelular(page, 'social')
      await abaCelular(page, 'operação')
      await page.locator('.pn-cabeca .pn-trilha__recentes').click()
      const folha = page.getByRole('dialog', { name: 'Telas recentes' })
      await folha.waitFor({ timeout: 5000 })
      const t = await folha.innerText()
      ok(/Você está aqui/.test(t) && /Operação/.test(t), 'mostra a tela atual')
      ok(/Social media/.test(t) && /Participantes/.test(t) && /Visão geral/.test(t), 'lista as outras telas da sessão')
      ok(t.indexOf('Social media') < t.indexOf('Visão geral'), 'a mais recente primeiro')
      await capturar(page, 'e2-iphone-recentes')
      await folha.getByRole('button', { name: /^Visão geral/ }).click()
      await dormir(900)
      ok(/#visao/.test(await hash(page)), 'pulou direto para a Visão geral')
      ok((await page.getByRole('dialog', { name: 'Telas recentes' }).count()) === 0, 'a folha fechou')
      ok((await voltarBtn(page).innerText()).trim() === 'Operação', 'o Voltar agora leva de volta à Operação')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 200))
      await ctx.close()
    }

    console.log('E3 Android: o Voltar do SISTEMA fecha a folha aberta antes de trocar de tela')
    {
      const { ctx, page, erros } = await abrirOrg(nav, aparelho('Pixel 7'))
      await abaCelular(page, 'participantes')
      await page.locator('[data-tour="sino"]').click()
      await page.getByRole('dialog').first().waitFor({ timeout: 5000 })
      const antes = await hash(page)
      await page.goBack()
      await dormir(800)
      ok((await page.locator('aside.og-detalhe:not(.is-fechando)').count()) === 0, 'a folha do sino fechou')
      ok((await hash(page)) === antes, 'a tela continua a mesma (' + antes + ')')
      await page.goBack()
      await dormir(800)
      ok(/#visao/.test(await hash(page)), 'o próximo Voltar troca de tela (Visão geral)')
      // "Mais" do celular (folha) + Voltar do sistema
      await page.locator('.og-abasapp .og-abaapp', { hasText: 'mais' }).click()
      await page.getByRole('dialog').first().waitFor({ timeout: 5000 })
      await page.goBack()
      await dormir(800)
      ok((await page.locator('aside.og-detalhe:not(.is-fechando)').count()) === 0, 'o "Mais" também fecha com o Voltar do sistema')
      ok(/#visao/.test(await hash(page)), '…sem sair da tela')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 200))
      await ctx.close()
    }

    console.log('E4 fechar a folha pela tela não deixa "voltar morto"; navegar com folha aberta também não')
    {
      const { ctx, page, erros } = await abrirOrg(nav, aparelho('Pixel 7'))
      await abaCelular(page, 'participantes')
      await page.locator('[data-tour="sino"]').click()
      const folha = page.getByRole('dialog').first()
      await folha.waitFor({ timeout: 5000 })
      await folha.getByRole('button', { name: 'Fechar' }).first().click()
      await dormir(800)
      await page.goBack()
      await dormir(800)
      ok(/#visao/.test(await hash(page)), 'depois do X, um Voltar já troca de tela')
      // Folha aberta e navegar pela barra: o Voltar depois volta para a tela de antes, sem parada fantasma.
      await abaCelular(page, 'participantes')
      await page.locator('.og-abasapp .og-abaapp', { hasText: 'mais' }).click()
      await page.getByRole('dialog').first().waitFor({ timeout: 5000 })
      await page.locator('.ui-mais__item', { hasText: 'Arquivos' }).first().click()
      await dormir(900)
      ok(/#arquivos/.test(await hash(page)), 'escolheu Arquivos no "Mais"')
      await page.goBack()
      await dormir(800)
      ok(/#participantes/.test(await hash(page)), 'Voltar: Participantes direto (' + (await hash(page)) + ')')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 200))
      await ctx.close()
    }

    console.log('E5 ficha com nome: "‹ Sabor de Pão" e computador (linha de contexto)')
    {
      const { ctx, page, erros } = await abrirOrg(nav, { viewport: { width: 1280, height: 900 } })
      await page.locator('.pn-rail__btn[data-tour="menu-participantes"]').click()
      await dormir(900)
      await page.locator('button.og-item--marca', { hasText: 'Sabor de Pão' }).first().click()
      await dormir(1200)
      ok(/item=m1/.test(await hash(page)), 'ficha aberta')
      await page.locator('.pn-rail__btn[data-tour="menu-operacao"]').click()
      await dormir(900)
      const v = voltarBtn(page)
      ok((await v.count()) === 1 && (await v.isVisible()), 'no computador o Voltar aparece na barra de cima')
      ok((await v.innerText()).trim() === 'Sabor de Pão', 'com o nome da ficha: "' + (await v.innerText()).trim() + '"')
      await capturar(page, 'e5-computador')
      await v.click()
      await dormir(1000)
      ok(/item=m1/.test(await hash(page)), 'voltou para a ficha')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 200))
      await ctx.close()
    }

    console.log('E7 Android: ficha aberta de FORA da lista (link de aviso) — dois Voltares chegam de onde veio, sem laço')
    {
      const { ctx, page, erros } = await abrirOrg(nav, aparelho('Pixel 7'))
      await page.goto(`${BASE}/painel/#contatos/pessoas?item=c1`, { waitUntil: 'domcontentloaded' }) // como o link de um aviso
      await page.getByRole('dialog').first().waitFor({ timeout: 8000 })
      await page.goBack()
      await dormir(900)
      ok((await page.locator('aside.og-detalhe:not(.is-fechando)').count()) === 0, '1º Voltar: a ficha fechou')
      ok((await hash(page)) === '#contatos/pessoas', '…e mostra a lista do módulo (' + (await hash(page)) + ')')
      await page.goBack()
      await dormir(900)
      ok(/#visao/.test(await hash(page)), '2º Voltar: de volta à Visão geral, sem reabrir a ficha (' + (await hash(page)) + ')')
      ok((await page.locator('aside.og-detalhe:not(.is-fechando)').count()) === 0, 'nenhuma folha reabriu')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 200))
      await ctx.close()
    }

    console.log('E8 recarregar com folha aberta ("Atualizar agora", F5): o 1º Voltar já troca de tela')
    {
      const { ctx, page, erros } = await abrirOrg(nav, { viewport: { width: 1280, height: 900 } })
      await page.locator('.pn-rail__btn[data-tour="menu-participantes"]').click()
      await dormir(900)
      await page.locator('[data-tour="sino"]').click()
      await page.getByRole('dialog').first().waitFor({ timeout: 5000 })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-tour="sino"]', { timeout: 30000 })
      await dormir(1500)
      ok(/#participantes/.test(await hash(page)), 'recarregou em Participantes')
      ok((await voltarBtn(page).innerText()).trim() === 'Visão geral', 'o Voltar do cabeçalho continua apontando a Visão geral')
      await page.goBack()
      await dormir(900)
      ok(/#visao/.test(await hash(page)), 'o 1º Voltar do navegador já troca de tela (' + (await hash(page)) + ')')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 200))
      await ctx.close()
    }

    console.log('E6 painel da MARCA no iPhone e Android')
    for (const nome of ['iPhone 13', 'Pixel 7']) {
      const ctx = await nav.newContext(aparelho(nome))
      const b = criarBackend(); const rt = criarRealtime()
      b.tabelas.perfis = () => [{ deve_trocar_senha: false, ativo: true, bloqueado_em: null }]
      b.tabelas.participantes = () => [{ id: PID, nome_marca: 'Doce Sol', responsavel: 'Ana', telefone: '84999998888', slug: 'docesol', user_id: MARCA_UID, created_at: '2026-09-01T00:00:00Z' }]
      b.tabelas.participacoes = () => [{ id: 'pa-1', participante_id: PID, edicao_codigo: '2026.2', status_cadastro: 'em_preenchimento', combo_status: 'rascunho', tema_combo: 'Divertida Mente', created_at: '2026-09-01T00:00:00Z' }]
      for (const t of ['participantes_itens', 'participacao_unidades', 'unidades', 'notificacoes', 'push_subscriptions', 'mensagens', 'arquivos', 'arquivo_leitura', 'sessoes_fotos', 'solicitacoes', 'solicitacao_estado', 'correcoes_campo', 'temas_propostos', 'declaracoes_alimentares', 'substituicoes', 'midias_participacao', 'vendas_diarias']) b.tabelas[t] = () => []
      b.tabelas.edicoes = () => [{ codigo: '2026.2', nome: 'Cartoon', tema: 'Cartoon', festival_inicio: '2026-11-05', festival_fim: '2026-11-15', valor_combo: 25 }]
      b.rpcs.sync_meus_canais = () => ['scw:pessoa:' + MARCA_UID, 'scw:marcas', 'scw:marca:' + PID]
      b.rpcs.marca_minha_logo = () => ({ atual: null, versoes: [] })
      b.rpcs.marca_previa_publica = () => ({ previa: {}, faltando: [] })
      b.rpcs.marca_minha_publicacao = () => ({ estado: 'nao_publicado', alterado_apos_aprovacao: false })
      await b.instalar(ctx); await rt.instalar(ctx)
      await ctx.addInitScript(([s, id]) => {
        if (sessionStorage.getItem('__ini')) return
        sessionStorage.setItem('__ini', '1')
        localStorage.setItem('scw_marca', s)
        localStorage.setItem('scw_tour_marca_' + id, '1')
        localStorage.setItem('scw_convite_aparelho_marca_' + id, String(Date.now()))
        localStorage.setItem('scw_convite_aparelho_marca_' + id + '-app', String(Date.now()))
      }, [sessaoGuardada(MARCA_UID, 'docesol@marcas.sweetcoffeeweek.com.br'), PID])
      const page = await ctx.newPage()
      const erros = []
      page.on('pageerror', (e) => erros.push(String(e)))
      await page.goto(`${BASE}/painel/#inicio`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-tour="sino"]', { timeout: 30000 })
      await dormir(1500)
      await abaCelular(page, 'meu combo')
      await abaCelular(page, 'fotos')
      const v = voltarBtn(page)
      ok((await v.count()) === 1 && (await v.innerText()).trim() === 'Meu combo', nome + ': "‹ Meu combo" nas Fotos')
      await capturar(page, 'e6-marca-' + nome.replace(/\s+/g, '-').toLowerCase())
      if (nome.startsWith('Pixel')) {
        await page.goBack() // Voltar do sistema
        await dormir(800)
        ok(/#combo/.test(await hash(page)), nome + ': o Voltar do sistema volta para Meu combo')
        ok((await voltarBtn(page).innerText()).trim() === 'Início', nome + ': e o do cabeçalho passa a apontar o Início')
      } else {
        await v.click()
        await dormir(800)
        ok(/#combo/.test(await hash(page)), nome + ': o Voltar do cabeçalho volta para Meu combo')
      }
      ok(erros.length === 0, nome + ': sem erro de JavaScript ' + erros.join(' | ').slice(0, 200))
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
