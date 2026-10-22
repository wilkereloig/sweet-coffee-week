/*
 * Aprovar o que se VIU (21/10/2026): painel real (Vite) contra backend e Realtime FALSOS — nada vai ao Supabase.
 *
 *   node tests/painel-social-aprovacao-navegador.mjs        (rodar de dentro de `tests/`: o Playwright mora lá)
 *
 * Cenário: a Eline (redes.aprovar) abre uma postagem "Aguardando aprovação". Outra pessoa troca a arte (a versão
 * sobe no servidor e o sinal de sincronização chega). A tela relê — mas NÃO deixa aprovar com um clique: avisa quem
 * mudou e o quê, o botão vira "Conferi as mudanças", e só depois aparece "Aprovar", que manda a versão nova.
 * Também: mudança da própria pessoa não pede conferência; quem não aprova não vê o aviso.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { criarBackend, criarRealtime, sessaoGuardada, dormir } from './helpers/backend-falso.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5237
const BASE = `http://localhost:${PORT}`
const UID = 'u-eline-0001'
const OUTRO = 'u-micka-0002'
const EMAIL = 'eline.teste@equipe.sweetcoffeeweek.com.br'
const PID = '11111111-1111-4111-8111-111111111111'
const PERMISSOES = ['dado.ler', 'redes.ver', 'redes.editar', 'redes.arquivos', 'redes.publicar', 'redes.aprovar', 'editorial.ler']
const CAMPANHA = { id: '22222222-2222-4222-8222-222222222222', nome: 'Confirmados', cor: 'roxo', descricao: 'Um por casa', inicio: '2026-10-20', fim: '2026-11-04', meta: 20, arquivada: false, n_total: 3, n_publicadas: 2, n_abertas: 1, n_atrasadas: 0 }
const falhas = []
const ok = (cond, msg) => { if (cond) console.log('  ✓ ' + msg); else { falhas.push(msg); console.log('  ✗ ' + msg) } }
const matar = (pid) => { if (!pid) return; try { if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL') } catch { /* já morto */ } }
async function esperarServidor(url, ms = 60000) {
  const t = Date.now()
  while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return } catch { /* subindo */ } await dormir(400) }
  throw new Error('servidor de desenvolvimento não respondeu')
}

const arte = (id, ordem, versao = 1) => ({ id, post_id: PID, bucket: 'redes', path: PID + '/' + id + '.png', miniatura_path: null, nome: 'Arte ' + id + '.png', mime: 'image/png', tamanho: 1000, largura: 1080, altura: 1350, alt: '', ordem, versao, criado_por_id: OUTRO, criado_por_rotulo: 'Micka', criado_em: '2026-10-21T14:00:00Z', removido_em: null, substituido_por: null })

/* Estado do servidor falso: a postagem, suas artes e a versão. `mudarArte` imita o banco: sobe a versão e carimba quem mexeu. */
function montar(permissoes) {
  const b = criarBackend(); const rt = criarRealtime()
  const estado = { versao: 5, arquivos: [arte('a1', 0)], situacao: 'aprovacao', por: { id: OUTRO, rotulo: 'Micka' }, em: '2026-10-21T14:00:00Z', legenda: 'Legenda original' }
  const aprovacoes = []
  const marcacoes = []
  estado.checklist = [
    { id: 'k1', post_id: PID, ordem: 1, texto: 'Arte conferida', feito: true, feito_por_id: OUTRO, feito_por_rotulo: 'Micka', feito_em: '2026-10-21T14:00:00Z' },
    { id: 'k2', post_id: PID, ordem: 2, texto: 'Legenda revisada', feito: false },
    { id: 'k3', post_id: PID, ordem: 3, texto: 'Data e horário confirmados', feito: false },
  ]
  const post = () => ({
    id: PID, titulo: 'Post de teste', perfil: '@sweetcoffeeweek', edicao_codigo: '2026.2', participante_id: null, formato: 'feed', legenda: estado.legenda, mencoes: '', observacoes: '', referencias: '',
    programado_para: '2026-11-03T20:00:00Z', responsavel_id: OUTRO, situacao: estado.situacao, versao: estado.versao, criado_por_id: OUTRO, atualizado_por_id: estado.por.id, atualizado_por_rotulo: estado.por.rotulo,
    atualizado_em: estado.em, responsavel_nome: 'Micka', participante_nome: null, campanha_id: CAMPANHA.id, campanha_nome: CAMPANHA.nome, campanha_cor: CAMPANHA.cor, checklist_total: estado.checklist.length, checklist_feitos: estado.checklist.filter((k) => k.feito).length, n_arquivos: estado.arquivos.length, miniatura: null, n_comentarios: 0, ajuste_aberto: false, pendencias: [],
  })
  b.rpcs.minhas_permissoes = () => [{ acoes: permissoes, funcao: 'administrador', rotulo: 'Administrador', ativo: true, deve_trocar_senha: false }]
  b.rpcs.meu_perfil = () => ({ user_id: UID, nome: 'Eline', funcao: 'administrador', funcao_rotulo: 'Administrador' })
  b.rpcs.equipe_diretorio = () => [{ user_id: UID, nome: 'Eline', funcao: 'administrador', funcao_rotulo: 'Administrador', avatar_path: null }, { user_id: OUTRO, nome: 'Micka', funcao: 'social', funcao_rotulo: 'Social media', avatar_path: null }]
  b.rpcs.admin_ping = () => true
  b.rpcs.sync_meus_canais = () => ['scw:org', 'scw:social', 'scw:pessoa:' + UID]
  b.rpcs.get_notificacoes_org = () => []
  b.rpcs.redes_opcoes = () => ({ participantes: [], edicoes: [], perfis: ['@sweetcoffeeweek'], responsaveis: [] })
  b.rpcs.redes_resumo = () => ({})
  b.rpcs.redes_campanhas_listar = () => [CAMPANHA]
  const salvas = []
  const modelosSalvos = []
  b.rpcs.redes_checklist_modelos_listar = () => ['feed', 'carrossel', 'reels', 'story'].flatMap((f) => [{ id: f + '1', formato: f, ordem: 1, texto: 'Arte conferida', ativo: true }, { id: f + '2', formato: f, ordem: 2, texto: 'Legenda revisada', ativo: true }])
  b.rpcs.redes_checklist_modelo_salvar = (c) => { modelosSalvos.push(c); return c.p_itens.map((x, i) => ({ id: 'n' + i, formato: c.p_formato, ordem: i + 1, texto: x.texto, ativo: x.ativo })) }
  b.rpcs.redes_checklist_marcar = (c) => {
    marcacoes.push(c)
    const k = estado.checklist.find((x) => x.id === c.p_item)
    Object.assign(k, { feito: c.p_feito, feito_por_id: c.p_feito ? UID : null, feito_por_rotulo: c.p_feito ? 'Eline' : null, feito_em: c.p_feito ? new Date().toISOString() : null })
    return k
  }
  b.rpcs.redes_campanha_salvar = (c) => { salvas.push(c); return { ...CAMPANHA, id: '33333333-3333-4333-8333-333333333333', ...c.p_dados, meta: c.p_dados.meta === '' ? null : c.p_dados.meta } }
  b.rpcs.redes_listar = () => ({ agora: new Date().toISOString(), eu: UID, posts: [post()] })
  b.rpcs.redes_post = () => ({ post: post(), arquivos: estado.arquivos, checklist: estado.checklist, historico: [], comentarios: [], conflitos: [], agora: '2026-10-21T15:00:00Z', eu: UID })
  b.rpcs.redes_situacao = (c) => {
    aprovacoes.push({ versao: c.p_versao, para: c.p_situacao })
    if (c.p_versao !== estado.versao) return { __erro: true }
    estado.situacao = c.p_situacao; estado.versao += 1; estado.por = { id: UID, rotulo: 'Eline' }
    return post()
  }
  // O que o banco faz quando OUTRA pessoa mexe na arte em "aguardando aprovação": versão +1 e carimbo dela.
  const mudarArte = (porQuem) => { estado.arquivos = [arte('a1', 0, 1), arte('a2', 1)].map((x, i) => ({ ...x, ordem: i })); estado.versao += 1; estado.por = porQuem; estado.em = '2026-10-21T15:30:00Z' }
  return { b, rt, estado, aprovacoes, mudarArte, salvas, marcacoes, modelosSalvos }
}

async function abrir(nav, permissoes, ajustar) {
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } })
  const m = montar(permissoes)
  if (ajustar) ajustar(m)
  await m.b.instalar(ctx); await m.rt.instalar(ctx)
  await ctx.addInitScript((s) => { if (!localStorage.getItem('scw_org_conta') && s) localStorage.setItem('scw_org_conta', s) }, sessaoGuardada(UID, EMAIL))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  await page.goto(`${BASE}/painel/#social/planejamento?item=${PID}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.rd-ficha, [role=dialog], .og-folha, .ui-folha', { timeout: 30000 }).catch(() => {})
  // O tour guiado e o convite do aparelho abrem sozinhos e cobrem a tela: dispensa, como a pessoa faria.
  for (let i = 0; i < 4; i++) {
    await dormir(1200)
    const pular = page.locator('.ui-tour button', { hasText: /Pular|Concluir/ }).first()
    if (await pular.count()) { await pular.click(); await dormir(300); continue }
    const convite = page.locator('dialog.cv[open] button', { hasText: /Agora não|Fechar|Entendi/ }).first()
    if (await convite.count()) { await convite.click(); await dormir(300) }
  }
  return { ctx, page, erros, ...m }
}
const botaoPrincipal = (page) => page.locator('.rd-rodape button, .og-folha__rodape button, footer button').filter({ hasText: /^(Aprovar|Conferi as mudanças)$/ }).first()

async function principal() {
  const dev = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: dirname(__dirname), shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  let nav
  try {
    await esperarServidor(`${BASE}/painel/`)
    nav = await chromium.launch()

    console.log('quem aprova: outra pessoa troca a arte enquanto a postagem está aberta')
    {
      const { ctx, page, estado, aprovacoes, mudarArte, rt, erros } = await abrir(nav, PERMISSOES)
      const aprovar = page.getByRole('button', { name: 'Aprovar', exact: true }).first()
      ok(await aprovar.count() > 0, 'sem mudança, o botão é "Aprovar"')
      ok(await page.locator('.rd-mudou').count() === 0, 'sem aviso enquanto nada mudou')
      mudarArte({ id: OUTRO, rotulo: 'Micka' })
      rt.empurrar('scw:social', { d: 'redes', r: PID })
      await dormir(1800)
      ok(await page.locator('.rd-mudou').count() === 1, 'a tela avisa que a postagem mudou depois de aberta')
      const texto = await page.locator('.rd-mudou').first().textContent()
      ok(/Micka/.test(texto) && /a arte/.test(texto), 'diz QUEM mudou e O QUÊ (“' + (texto || '').trim().slice(0, 100) + '”)')
      ok(await page.getByRole('button', { name: 'Aprovar', exact: true }).count() === 0, 'o botão "Aprovar" some enquanto a mudança não for conferida')
      ok(await page.getByRole('button', { name: 'Conferi as mudanças' }).count() >= 1, 'no lugar dele: "Conferi as mudanças"')
      ok(aprovacoes.length === 0, 'nada foi aprovado ainda')
      await page.getByRole('button', { name: 'Conferi as mudanças' }).last().click()
      await dormir(600)
      ok(await page.locator('.rd-mudou').count() === 0, 'conferiu: o aviso sai')
      const aprovar2 = page.getByRole('button', { name: 'Aprovar', exact: true }).first()
      ok(await aprovar2.count() > 0, 'e o "Aprovar" volta')
      await aprovar2.click()
      await dormir(900)
      ok(aprovacoes.length === 1 && aprovacoes[0].para === 'pronto' && aprovacoes[0].versao === estado.versao - 1, 'aprovar manda a versão ATUAL (' + JSON.stringify(aprovacoes) + ', versão do servidor agora ' + estado.versao + ')')
      ok(erros.length === 0, 'sem erro de JavaScript (' + erros.join(' | ').slice(0, 200) + ')')
      await ctx.close()
    }

    console.log('mudança da própria pessoa não pede conferência')
    {
      const { ctx, page, mudarArte, rt } = await abrir(nav, PERMISSOES)
      mudarArte({ id: UID, rotulo: 'Eline' })
      rt.empurrar('scw:social', { d: 'redes', r: PID })
      await dormir(1800)
      ok(await page.locator('.rd-mudou').count() === 0, 'se foi ela quem mexeu, não há aviso')
      ok(await page.getByRole('button', { name: 'Aprovar', exact: true }).count() > 0, 'e o "Aprovar" continua à mão')
      await ctx.close()
    }

    console.log('campanhas: no cartão, na ficha e na aba')
    {
      const { ctx, page, erros, salvas } = await abrir(nav, PERMISSOES)
      // a postagem é de 3/11: o dia dela, sem a ficha aberta, mostra o cartão
      await page.goto(`${BASE}/painel/#social/planejamento?modo=dia&data=2026-11-03`, { waitUntil: 'domcontentloaded' })
      await page.locator('.rd-cartao').first().waitFor({ timeout: 15000 }).catch(() => {})
      ok(await page.locator('.rd-cartao__camp', { hasText: 'Confirmados' }).count() >= 1, 'o cartão mostra a campanha')
      await page.goto(`${BASE}/painel/#social/planejamento?item=${PID}`, { waitUntil: 'domcontentloaded' })
      await page.getByText('Detalhes: título interno', { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {})
      await page.getByText('Detalhes: título interno', { exact: false }).first().click()
      await dormir(400)
      const linha = page.locator('.rd-dados div', { has: page.locator('dt', { hasText: /^Campanha$/ }) }).first()
      ok(/Confirmados/.test((await linha.textContent()) || ''), 'a ficha mostra a campanha nos detalhes')
      await page.goto(`${BASE}/painel/#social/campanhas`, { waitUntil: 'domcontentloaded' })
      await page.locator('.sc-cartao').first().waitFor({ timeout: 15000 }).catch(() => {})
      const cartao = (await page.locator('.sc-cartao').first().textContent().catch(() => '')) || ''
      ok(/Confirmados/.test(cartao) && /2 de 20 publicadas/.test(cartao), 'a aba Campanhas mostra nome e progresso (“' + cartao.trim().slice(0, 90) + '”)')
      ok(await page.getByRole('button', { name: 'Nova campanha' }).count() > 0, 'quem edita vê “Nova campanha”')
      await page.getByRole('button', { name: 'Nova campanha' }).first().click()
      await page.getByLabel('Nome', { exact: true }).fill('Contagem regressiva')
      await page.getByRole('button', { name: 'Salvar campanha' }).click()
      await dormir(900)
      ok(salvas.length === 1 && salvas[0].p_id === null && salvas[0].p_dados.nome === 'Contagem regressiva' && salvas[0].p_dados.cor === 'amarelo', 'o formulário manda nome e cor padrão (' + JSON.stringify(salvas[0] || null).slice(0, 140) + ')')
      ok(await page.locator('dialog, .ui-folha, [role=dialog]').filter({ hasText: 'Nova campanha' }).count() === 0, 'e fecha depois de salvar')
      ok(erros.length === 0, 'sem erro de JavaScript (' + erros.join(' | ').slice(0, 200) + ')')
      await ctx.close()
    }

    console.log('checklist: marcar, contar e perguntar antes de enviar')
    {
      const { ctx, page, estado, marcacoes, aprovacoes, erros } = await abrir(nav, PERMISSOES, (m) => { m.estado.situacao = 'rascunho' })
      const bloco = page.locator('.ck')
      await bloco.waitFor({ timeout: 15000 }).catch(() => {})
      ok(/1\/3/.test((await bloco.textContent().catch(() => '')) || ''), 'o bloco mostra 1/3')
      await page.getByRole('checkbox', { name: 'Legenda revisada' }).click()
      await dormir(700)
      ok(marcacoes.length === 1 && marcacoes[0].p_item === 'k2' && marcacoes[0].p_feito === true, 'marcar manda o item e o valor (' + JSON.stringify(marcacoes[0] || null) + ')')
      ok(/2\/3/.test((await bloco.textContent().catch(() => '')) || ''), 'e a contagem vira 2/3 depois da resposta do servidor')
      ok(estado.versao === 5, 'marcar item não sobe a versão da postagem')
      await page.getByRole('button', { name: 'Enviar para aprovação' }).last().click()
      await page.locator('dialog[open]').waitFor({ timeout: 8000 }).catch(() => {})
      const pergunta = (await page.locator('dialog[open]').textContent().catch(() => '')) || ''
      ok(/Falta 1 item do checklist: Data e horário confirmados/.test(pergunta), 'com item aberto, pergunta antes de enviar (“' + pergunta.trim().slice(0, 100) + '”)')
      await page.locator('dialog[open] button:not([type=submit])').first().click()
      await dormir(500)
      ok(aprovacoes.length === 0, 'cancelar a pergunta não envia')
      await page.getByRole('button', { name: 'Enviar para aprovação' }).last().click()
      await page.locator('dialog[open] button[type=submit]').click()
      await dormir(900)
      ok(aprovacoes.length === 1 && aprovacoes[0].para === 'aprovacao', 'confirmar envia mesmo com item aberto')
      ok(erros.length === 0, 'sem erro de JavaScript (' + erros.join(' | ').slice(0, 200) + ')')
      await ctx.close()
    }

    console.log('checklist padrão: só o administrador abre e salva por formato')
    {
      const { ctx, page, modelosSalvos, erros } = await abrir(nav, [...PERMISSOES, 'redes.gerir'])
      await page.goto(`${BASE}/painel/#social/planejamento`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: 'Checklist padrão' }).click()
      await page.getByRole('heading', { name: 'Reel' }).waitFor({ timeout: 10000 }).catch(() => {})
      ok(await page.getByRole('heading', { name: 'Story' }).count() === 1 && await page.getByRole('heading', { name: 'Carrossel' }).count() === 1, 'a folha mostra um grupo por formato')
      await page.getByRole('textbox', { name: 'Item 1 de Reel' }).fill('Capa conferida')
      await page.getByRole('button', { name: 'Salvar Reel' }).click()
      await dormir(700)
      ok(modelosSalvos.length === 1 && modelosSalvos[0].p_formato === 'reels' && modelosSalvos[0].p_itens[0].texto === 'Capa conferida' && modelosSalvos[0].p_itens.length === 2, 'salvar manda só o formato editado, na ordem (' + JSON.stringify(modelosSalvos[0] || null).slice(0, 150) + ')')
      ok(erros.length === 0, 'sem erro de JavaScript (' + erros.join(' | ').slice(0, 200) + ')')
      await ctx.close()
      const sem = await abrir(nav, PERMISSOES)
      await sem.page.goto(`${BASE}/painel/#social/planejamento`, { waitUntil: 'domcontentloaded' })
      await dormir(1500)
      ok(await sem.page.getByRole('button', { name: 'Checklist padrão' }).count() === 0, 'sem redes.gerir o botão não existe')
      await sem.ctx.close()
    }

    console.log('quem não aprova não vê o aviso')
    {
      const { ctx, page, mudarArte, rt } = await abrir(nav, PERMISSOES.filter((p) => p !== 'redes.aprovar'))
      mudarArte({ id: OUTRO, rotulo: 'Micka' })
      rt.empurrar('scw:social', { d: 'redes', r: PID })
      await dormir(1800)
      ok(await page.locator('.rd-mudou').count() === 0, 'sem redes.aprovar não aparece o aviso de conferência')
      await ctx.close()
    }
  } finally {
    if (nav) await nav.close().catch(() => {})
    matar(dev.pid)
  }
  void botaoPrincipal
  console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\nTudo certo.')
  process.exit(falhas.length ? 1 : 0)
}
principal().catch((e) => { console.error(e); process.exit(1) })
