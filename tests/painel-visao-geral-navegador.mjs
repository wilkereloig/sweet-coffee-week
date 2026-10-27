/*
 * Visão geral da EQUIPE no navegador (22/10/2026), contra backend e Realtime FALSOS:
 *
 *   node tests/painel-visao-geral-navegador.mjs          (de dentro de `tests/`)
 *   CAPTURAS=<pasta> node tests/painel-visao-geral-navegador.mjs   → imagens em 390/768/1280/1440
 *
 * Prova: três áreas na ordem pedida (o que precisa da equipe · situação das marcas · atividade), cartão com
 * número = lista que ele abre (temas), permissão esconde o que a função não resolve, leitura que cai nunca
 * vira "tudo em dia", sem rolagem horizontal e sem erro de JavaScript.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { criarBackend, criarRealtime, sessaoGuardada, dormir } from './helpers/backend-falso.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5242
const BASE = `http://localhost:${PORT}`
const UID = 'u-admin-0001'
const EMAIL = 'admin.teste@equipe.sweetcoffeeweek.com.br'
const CAPTURAS = process.env.CAPTURAS || ''
const TAMANHOS = [[390, 844], [768, 1024], [1280, 900], [1440, 900]]
const TODAS = ['acesso.gerir', 'cadastro.editar', 'curadoria.decidir', 'dado.ler', 'edicao.gerir', 'editorial.editar', 'editorial.ler', 'marca.liberar', 'mensagem.enviar', 'pagamento.gerir', 'producao.gerir', 'redes.ver', 'redes.editar', 'redes.aprovar', 'equipe.gerir', 'relatorio.ler', 'contato.gerir', 'voucher.gerir', 'arquivo.gerir', 'resposta.ler']
const falhas = []
const ok = (cond, msg) => { if (cond) console.log('  ✓ ' + msg); else { falhas.push(msg); console.log('  ✗ ' + msg) } }
const matar = (pid) => { if (!pid) return; try { if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL') } catch { /* já morto */ } }
async function esperarServidor(url, ms = 60000) {
  const t = Date.now()
  while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return } catch { /* subindo */ } await dormir(400) }
  throw new Error('servidor de desenvolvimento não respondeu')
}

// Data LOCAL (a tela conta "amanhã" no fuso de quem abre). Com toISOString (UTC), depois das 21h em Natal o
// "amanhã" do teste já era depois de amanhã para a tela, e o V5 falhava só à noite (24/10/2026).
const diaLocal = (d) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
const hojeISO = () => diaLocal(new Date())
const emDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return diaLocal(d) }
const DADOS = {
  participantes: [
    { id: 'm1', nome_marca: 'Doce Sol', edicao_codigo: '2026.2', combo_status: 'em_analise', status_cadastro: 'em_preenchimento', user_id: 'u1' },
    { id: 'm2', nome_marca: 'Café Lua', edicao_codigo: '2026.2', combo_status: 'rascunho', status_cadastro: 'em_preenchimento', user_id: null },
    { id: 'm3', nome_marca: 'Pão Real', edicao_codigo: '2026.2', combo_status: 'aprovado', status_cadastro: 'cadastro_completo', user_id: 'u3' },
  ],
  temas: [
    { id: 't1', tema: 'Divertida Mente', marca: 'Doce Sol', participante_id: 'm1', status: 'proposto', prioridade: 1, solicitado_em: '2026-10-20T10:00:00Z', pagamento_status: 'pago' },
    { id: 't2', tema: 'Divertida Mente', marca: 'Café Lua', participante_id: 'm2', status: 'proposto', prioridade: 2, solicitado_em: '2026-10-21T10:00:00Z', pagamento_status: 'pendente' },
    { id: 't3', tema: 'Moana', marca: 'Pão Real', participante_id: 'm3', status: 'aprovado', prioridade: 1, solicitado_em: '2026-10-10T10:00:00Z', pagamento_status: 'pago', decidido_rotulo: 'Admin' },
    // Grupo {aprovada + proposta}: o estado comum logo depois de aprovar uma marca (a outra só é recusada depois, à mão).
    { id: 't4', tema: 'Moana', marca: 'Bolo Azul', participante_id: 'm4', status: 'proposto', prioridade: 2, solicitado_em: '2026-10-12T10:00:00Z', pagamento_status: 'pendente' },
  ],
  edicoes: [{ codigo: '2026.2', atual: true, festival_inicio: emDias(14), festival_fim: emDias(24), cronograma: [{ chave: 'preenchimento', tipo: 'prazo', fim: emDias(1), titulo: 'Prazo do cadastro', visivel_participante: true }] }],
  solicitacoes: [{ id: 'sol1', titulo: 'Mande a logo', publicada_em: '2026-10-15T10:00:00Z', arquivada: false, pendentes: 3 }],
  conversas: [{ participante_id: 'm1', nome_marca: 'Doce Sol', nao_lidas: 2 }],
}

// Resumo do Social media (redes_resumo) sem nada em aberto. O backend falso responde 404 ao que não está aqui —
// e a Mesa lê o resumo (com redes.ver) para decidir o "nada precisa da equipe".
const RESUMO_REDES_VAZIO = { hoje: 0, proximas: 0, atrasadas: 0, minhas: 0, sem_responsavel: 0, sem_data: 0, sem_arte: 0, sem_legenda: 0, aprovacao: 0, aprovadas: 0, ajuste: 0, proximos_itens: [] }

// Nada a decidir e uma edição aberta: só a agenda pode pedir atenção (prazo do cadastro em `prazoEmDias`).
const semPendencia = (prazoEmDias) => ({
  participantes: [], temas: [], solicitacoes: [], conversas: [],
  edicoes: [{ ...DADOS.edicoes[0], cronograma: [{ chave: 'preenchimento', tipo: 'prazo', fim: emDias(prazoEmDias), titulo: 'Prazo do cadastro', visivel_participante: true }] }],
})

async function abrir(nav, { permissoes = TODAS, viewport = [1280, 900], falhar = [], dados = DADOS, rpcs = {} } = {}) {
  const ctx = await nav.newContext({ viewport: { width: viewport[0], height: viewport[1] } })
  const b = criarBackend(); const rt = criarRealtime()
  b.rpcs.minhas_permissoes = () => [{ acoes: permissoes, funcao: 'administrador', rotulo: 'Administrador', ativo: true, deve_trocar_senha: false }]
  b.rpcs.meu_perfil = () => ({ user_id: UID, nome: 'Admin Teste', funcao: 'administrador', funcao_rotulo: 'Administrador' })
  b.rpcs.equipe_diretorio = () => [{ user_id: UID, nome: 'Admin Teste', funcao: 'administrador', funcao_rotulo: 'Administrador', avatar_path: null }]
  b.rpcs.admin_ping = () => true
  b.rpcs.sync_meus_canais = () => ['scw:org', 'scw:social', 'scw:pessoa:' + UID]
  b.rpcs.get_notificacoes_org = () => []
  b.rpcs.get_quero_participar = () => []
  b.rpcs.get_participantes = () => dados.participantes
  b.rpcs.get_temas = () => dados.temas
  b.rpcs.get_edicoes = () => dados.edicoes
  b.rpcs.get_solicitacoes_admin = () => dados.solicitacoes
  b.rpcs.get_conversas = () => dados.conversas
  b.rpcs.get_atividade = () => []
  b.rpcs.get_revisao = () => []
  b.rpcs.redes_resumo = () => dados.redes || RESUMO_REDES_VAZIO
  b.rpcs.get_combos_em_analise = () => dados.combos || []
  Object.assign(b.rpcs, rpcs)
  for (const nome of falhar) b.falhas[nome] = 99
  await b.instalar(ctx); await rt.instalar(ctx)
  await ctx.addInitScript((s) => { if (!localStorage.getItem('scw_org_conta') && s) localStorage.setItem('scw_org_conta', s) }, sessaoGuardada(UID, EMAIL))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  return { ctx, page, erros }
}
const textoDe = (page) => page.evaluate(() => document.body.innerText)
async function irPara(page, hash) {
  await page.goto(`${BASE}/painel/${hash}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-tour="sino"]', { timeout: 30000 })
  await dormir(2500)
}
async function capturar(page, nome, w) {
  if (!CAPTURAS) return
  mkdirSync(CAPTURAS, { recursive: true })
  await page.screenshot({ path: join(CAPTURAS, nome + '-' + w + '.png'), fullPage: true })
}

async function principal() {
  const dev = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: dirname(__dirname), shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  let nav
  try {
    await esperarServidor(`${BASE}/painel/`)
    nav = await chromium.launch()

    console.log('V1 administrador: três áreas e cartões com número')
    {
      const { ctx, page, erros } = await abrir(nav)
      await irPara(page, '#visao')
      const t = await textoDe(page)
      const iAcoes = t.search(/precisa da equipe|Ações da equipe|O que a equipe/i)
      const iMarcas = t.search(/Situação das marcas|Como estão as marcas|Marcas na edição/i)
      const iAtiv = t.search(/Atividade recente|O que aconteceu/i)
      ok(iAcoes >= 0 && iMarcas >= 0 && iAtiv >= 0, 'as três áreas existem (' + [iAcoes, iMarcas, iAtiv].join(',') + ')')
      ok(iAcoes < iMarcas && iMarcas < iAtiv, 'na ordem: ações → marcas → atividade')
      ok(/Temas para decidir/.test(t), 'cartão de temas')
      ok(/Pedidos sem resposta/.test(t), 'cartão de pedidos')
      ok(!/Nada precisa da equipe agora/.test(t), 'com pendência, não diz que está tudo em dia')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      for (const [w, h] of TAMANHOS) {
        await page.setViewportSize({ width: w, height: h }); await dormir(300)
        const larg = await page.evaluate(() => { const e = document.querySelector('.og-vista') || document.documentElement; return { sw: e.scrollWidth, cw: e.clientWidth } })
        ok(larg.sw <= larg.cw + 1, `sem rolagem horizontal em ${w}px (${larg.sw}/${larg.cw})`)
        await capturar(page, 'v1-visao', w)
      }
      await ctx.close()
    }

    console.log('V2 o número do cartão de temas é o da lista que ele abre')
    {
      const { ctx, page } = await abrir(nav)
      await irPara(page, '#visao')
      const cartao = (await textoDe(page)).match(/(\d+)\s*(?:propostas? de tema)/i)
      const nCartao = cartao ? Number(cartao[1]) : null
      ok(nCartao === 3, 'o cartão conta 3 propostas esperando decisão (' + nCartao + ')')
      await page.goto(`${BASE}/painel/#participantes/temas`, { waitUntil: 'domcontentloaded' })
      await dormir(2500)
      const aba = await textoDe(page)
      ok(/Esperando decisão \(3\)/.test(aba), 'a aba Temas abre em "Esperando decisão (3)"')
      const pedir = await page.getByRole('button', { name: 'Pedir outro tema', exact: true }).count()
      ok(pedir === 3, 'cada proposta esperando decisão tem o seu "Pedir outro tema" (3 = o número do cartão; ' + pedir + ')')
      const aprovar = await page.getByRole('button', { name: 'Aprovar', exact: true }).count()
      ok(aprovar === 2, 'só as duas de Divertida Mente podem ser aprovadas; a de Moana já tem tema aprovado (' + aprovar + ')')
      // Grupo {aprovada + proposta}: a aprovada fica à vista e a nota diz o que fazer; ninguém "pediu" além da proposta.
      ok(/Já aprovado para Pão Real: a outra marca precisa trocar de tema/.test(aba), 'o grupo de Moana diz que já está aprovado para Pão Real')
      ok(/Pão Real/.test(aba) && /APROVADO por Admin/.test(aba), 'a marca aprovada aparece no grupo, com quem aprovou')
      ok(/Bolo Azul/.test(aba), 'a proposta pendente de Moana aparece')
      ok((aba.match(/marcas pediram este tema/g) || []).length === 1, 'só um grupo é conflito de verdade; a aprovada não entra na conta de quem "pediu" Moana')
      ok(/Conflito: 2 marcas pediram este tema/.test(aba), 'o conflito sem aprovada (Divertida Mente) continua dito')
      await ctx.close()
    }

    console.log('V3 permissão: quem só lê não vê cartão de ação que não resolve')
    {
      const { ctx, page, erros } = await abrir(nav, { permissoes: ['dado.ler'] })
      await irPara(page, '#visao')
      const t = await textoDe(page)
      ok(!/Temas para decidir/.test(t), 'sem curadoria.decidir, o cartão de temas não aparece')
      ok(!/Pedidos sem resposta/.test(t), 'sem producao.gerir, o de pedidos não aparece')
      ok(/Nada que a sua função possa resolver agora/.test(t), 'diz isso em palavras, em vez de "tudo em dia"')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('V4 leitura que cai nunca vira "tudo em dia"')
    {
      const { ctx, page } = await abrir(nav, { falhar: ['get_temas', 'get_solicitacoes_admin', 'get_conversas'] })
      await irPara(page, '#visao')
      const t = await textoDe(page)
      ok(!/Nada precisa da equipe agora/.test(t), 'com leituras caídas não afirma que não há nada')
      ok(/não deu para ler|Faltou ler|não consegui|Não foi possível ler/i.test(t), 'diz o que não foi lido')
      await ctx.close()
    }

    console.log('V5 prazo vencendo: "nada precisa da equipe" nunca ao lado da agenda urgente')
    {
      const { ctx, page, erros } = await abrir(nav, { dados: semPendencia(1) })
      await irPara(page, '#visao')
      const t = await textoDe(page)
      ok(/Prazos e agenda/.test(t) && /Vence amanhã/.test(t), 'a agenda mostra o prazo de amanhã como urgente')
      ok(!/Nada precisa da equipe agora/.test(t), 'com prazo vencendo, não diz que nada precisa da equipe')
      ok(/0\s*marcas na edição/.test(t), 'leitura que funcionou e voltou vazia continua dizendo 0 marcas (zero honesto)')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
      // O contrário: prazo longe e nada aberto → o vazio honesto continua valendo.
      const longe = await abrir(nav, { dados: semPendencia(20) })
      await irPara(longe.page, '#visao')
      ok(/Nada precisa da equipe agora/.test(await textoDe(longe.page)), 'sem prazo vencendo e sem pendência, diz que nada precisa')
      await longe.ctx.close()
    }

    console.log('V6 a leitura das marcas caiu: nem "0 marcas" nem esteira de zeros')
    {
      const { ctx, page } = await abrir(nav, { falhar: ['get_participantes'] })
      await irPara(page, '#visao')
      const t = await textoDe(page)
      ok(/Faltou ler as marcas/.test(t), 'o aviso do bloco diz que faltou ler as marcas')
      ok(/Não consegui ler as marcas agora, então não dá para dizer quantas participam/.test(t), 'a caixa da edição diz que não leu as marcas')
      ok(!/\d+\s*marcas? na edição/.test(t), 'não afirma quantas marcas há na edição')
      ok(!/com acesso ao painel|cadastros completos/.test(t), 'não mostra barras de "0 de 0"')
      ok(!/Nenhuma marca nesta etapa/.test(t), 'a esteira não diz "Nenhuma marca nesta etapa"')
      ok(/a esteira não aparece/.test(t), 'diz por que a esteira não aparece')
      await ctx.close()
    }

    console.log('V7 a leitura da edição caiu: não afirma que nenhuma edição está aberta')
    {
      const { ctx, page } = await abrir(nav, { falhar: ['get_edicoes'] })
      await irPara(page, '#visao')
      const t = await textoDe(page)
      ok(/Faltou ler a edição atual/.test(t), 'o aviso do bloco diz que faltou ler a edição atual')
      ok(/Não consegui ler a edição atual agora/.test(t), 'a caixa da edição diz que não leu')
      ok(!/Nenhuma edição está aberta/.test(t), 'não afirma que não há edição aberta')
      await ctx.close()
    }

    console.log('V8 Social media com atraso: "nada precisa da equipe" não aparece ao lado de "2 atrasadas"')
    {
      const { ctx, page, erros } = await abrir(nav, { dados: { ...semPendencia(20), redes: { ...RESUMO_REDES_VAZIO, atrasadas: 2 } } })
      await irPara(page, '#visao')
      const t = await textoDe(page)
      ok(/2\s*atrasadas/.test(t), 'o resumo do Social media mostra as 2 atrasadas')
      ok(!/Nada precisa da equipe agora/.test(t), 'e a área de ações não diz que nada precisa da equipe')
      ok(!/\b0\s*(de hoje|nos próximos 7 dias|sem responsável)/.test(t), 'contador zerado não aparece no resumo')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
      // A leitura do Social media caiu: diz no bloco, sem "nada precisa".
      const caiu = await abrir(nav, { dados: semPendencia(20), falhar: ['redes_resumo'] })
      await irPara(caiu.page, '#visao')
      const t2 = await textoDe(caiu.page)
      ok(/Faltou ler o planejamento do Social media/.test(t2), 'leitura do Social media caída é dita no bloco')
      ok(!/Nada precisa da equipe agora/.test(t2), 'e não afirma que nada precisa')
      await caiu.ctx.close()
    }

    console.log('V9 "Combos para aprovar": o cartão diz qual combo e a folha aprova ou pede ajuste')
    {
      const ha2h = new Date(Date.now() - 2 * 3600e3).toISOString()
      const dados = {
        ...DADOS,
        participantes: [
          { id: 'm1', participacao_id: 'pa-m1', nome_marca: 'Doce Sol', edicao_codigo: '2026.2', combo_status: 'em_analise', status_cadastro: 'cadastro_completo', user_id: 'u1' },
          { id: 'm5', participacao_id: 'pa-m5', nome_marca: 'Pão Real', edicao_codigo: '2026.2', combo_status: 'em_analise', status_cadastro: 'cadastro_completo', user_id: 'u5' },
        ],
        combos: [
          { participacao_id: 'pa-m1', participante_id: 'm1', nome_marca: 'Doce Sol', edicao_codigo: '2026.2', combo_nome: 'Sol da Tarde', combo_descricao: 'Um combo de verão.', tema_combo: 'Divertida Mente', tema_justificativa: 'Cores e emoções.', custo_embalagem: '5.00', custo_delivery: null, combo_para_viagem: true, desde: ha2h, itens: [{ tipo: 'doce', nome: 'Bolo alegria', descricao: 'Bolo amarelo' }] },
          { participacao_id: 'pa-m5', participante_id: 'm5', nome_marca: 'Pão Real', edicao_codigo: '2026.2', combo_nome: 'Coroa de Pão', tema_combo: 'Moana', desde: new Date().toISOString(), itens: [] },
        ],
      }
      const chamadas = []
      const { ctx, page, erros } = await abrir(nav, { dados, rpcs: { revisar_combo: (c) => { chamadas.push(c); return null } } })
      await irPara(page, '#visao')
      const t = await textoDe(page)
      ok(/Combos para aprovar/.test(t) && /combos esperando a sua decisão/.test(t), 'o cartão diz "combos esperando a sua decisão"')
      ok(/Doce Sol · “Sol da Tarde”/.test(t) && /Pão Real · “Coroa de Pão”/.test(t), 'o cartão traz marca e nome do combo')
      ok(/Revisar e decidir/.test(t), 'o pé do cartão diz "Revisar e decidir"')
      const pular = page.locator('.ui-tour button', { hasText: /Pular|Concluir/ }).first() // o tour abre sozinho na 1ª visita
      if (await pular.count()) await pular.click()
      await page.getByRole('button', { name: /Combos para aprovar/ }).click()
      await page.getByText('Combo 1 de 2').waitFor({ timeout: 8000 })
      let f = await textoDe(page)
      ok(/Sol da Tarde/.test(f) && /Divertida Mente/.test(f) && /Cores e emoções/.test(f) && /Bolo alegria/.test(f), 'a folha mostra combo, tema, justificativa e itens')
      ok(/Entrega: não informado/.test(f) && /R\$\s*5,00/.test(f), 'custo vazio = "não informado"; o preenchido aparece em reais')
      await page.getByRole('button', { name: 'Aprovar combo' }).click()
      await page.getByText('Combo 2 de 2').waitFor({ timeout: 8000 })
      ok(chamadas.length === 1 && chamadas[0].p_participacao === 'pa-m1' && chamadas[0].p_status === 'aprovado', 'Aprovar chama revisar_combo com aprovado')
      f = await textoDe(page)
      ok(/Doce Sol aprovado\. A marca foi avisada/.test(f) && /Coroa de Pão/.test(f), 'diz que a marca foi avisada e passa ao próximo combo')
      await page.getByRole('button', { name: 'Pedir ajuste', exact: true }).click()
      const enviar = page.getByRole('button', { name: 'Enviar pedido de ajuste' })
      ok(await enviar.isDisabled(), 'pedir ajuste sem texto não envia')
      await page.locator('textarea').fill('Trocar o nome do combo')
      await enviar.click()
      await dormir(1200)
      ok(chamadas.length === 2 && chamadas[1].p_status === 'correcao_solicitada' && chamadas[1].p_nota === 'Trocar o nome do combo', 'pedir ajuste manda a nota')
      ok(/Nenhum combo esperando decisão/.test(await textoDe(page)), 'sem combos na fila, a folha diz isso')
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
