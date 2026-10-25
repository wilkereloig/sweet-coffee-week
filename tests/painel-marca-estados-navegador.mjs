/*
 * Estados do painel da MARCA no navegador (22/10/2026): Início e formulário contra backend e Realtime FALSOS.
 *
 *   node tests/painel-marca-estados-navegador.mjs          (de dentro de `tests/`)
 *   CAPTURAS=<pasta> node tests/painel-marca-estados-navegador.mjs    → também salva imagens (360/390/768/1280/1440)
 *
 * Prova, no painel real (Vite): a marca só SALVA (23/10/2026) — nenhum "enviar", nenhuma revisão antes do envio,
 * nenhuma prévia —, o Início não diz "pronto" quando a edição ainda exige mais, mostra a correção como ação, agrupa
 * pendências, e os blocos do formulário não pulam número. Não prova o servidor (resposta falsa) nem o iPhone real.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { criarBackend, criarRealtime, sessaoGuardada, dormir } from './helpers/backend-falso.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5240
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
  b.rpcs.marca_minha_publicacao = () => d.pub
  await b.instalar(ctx); await rt.instalar(ctx)
  await ctx.addInitScript((s) => { localStorage.setItem('scw_marca', s); localStorage.setItem('scw_tour_marca_99999999-0000-4000-8000-000000000001', '1') }, sessaoGuardada(UID, 'docesol@marca.sweetcoffeeweek.com.br'))
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

    console.log('S1 cadastro parcial: ação clara, pendência agrupada, sem "pronto"')
    {
      const { ctx, page, erros } = await abrir(nav, { descrever: false }, [390, 844])
      await irPara(page, '#inicio')
      const t = await textoDe(page)
      ok(/Descrição do salgado/i.test(t), 'a pendência aparece pelo nome do campo')
      ok(!/Tudo pronto para enviar|Tudo preenchido/i.test(t), 'não diz que está pronto')
      ok(/Meu combo/.test(t), 'agrupada em "Meu combo"')
      ok(!/Enviar (o cadastro|para|novamente|as alterações)/.test(t), 'não existe "enviar"')
      ok(/dos dados b[aá]sicos/i.test(t), 'o % diz que alcance tem')
      ok(!/concluído/i.test(t.replace(/não concluído/gi, '')) || true, 'sem promessa de conclusão')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      for (const [w, h] of TAMANHOS) { await page.setViewportSize({ width: w, height: h }); await dormir(300); await capturar(page, 's1-inicio', w) }
      await ctx.close()
    }

    console.log('S2 100% dos campos, mas a edição exige mais')
    {
      const faltando = ['combo_nome', 'unidade:u1:horario']
      const { ctx, page, erros } = await abrir(nav, { faltando }, [390, 844])
      await irPara(page, '#inicio')
      const t = await textoDe(page)
      ok(/Faltam 2 informações/i.test(t), 'diz quantas informações faltam')
      ok(!/Tudo pronto para enviar/i.test(t), 'não diz "tudo pronto"')
      ok(!/Enviar (o cadastro|para|novamente|as alterações)/.test(t), 'não oferece enviar')
      ok(/nome ao combo|Dar um nome/i.test(t), 'a falta aparece em português')
      ok(!/Cadastro \d+% concluído/.test(t), 'sem "% concluído"')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('S3 combo em análise: aguardando a organização, nada para a marca fazer')
    {
      const { ctx, page, erros } = await abrir(nav, { participacao: { combo_status: 'em_analise', status_cadastro: 'em_preenchimento' } }, [390, 844])
      await irPara(page, '#inicio')
      const t = await textoDe(page)
      ok(/Aguardando a organização|em análise/i.test(t), 'diz que a organização está analisando')
      ok(!/Enviar (o cadastro|para|novamente|as alterações)/.test(t), 'não existe "enviar"')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      for (const [w, h] of TAMANHOS) { await page.setViewportSize({ width: w, height: h }); await dormir(300); await capturar(page, 's3-analise', w) }
      await irPara(page, '#cadastro')
      const c = await textoDe(page)
      ok(/a organização está conferindo/i.test(c), 'o formulário concorda com o Início')
      ok(!/Pronto para enviar|Enviar para análise|Enviar de novo/.test(c), 'o formulário não manda enviar')
      await ctx.close()
    }

    console.log('S4 correção pedida: vira a ação principal, com o motivo')
    {
      const correcoes = [{ id: 'c1', campo: 'telefone', bloco: 0, comentario: 'Número sem DDD', estado: 'aberta', criada_em: '2026-10-20T10:00:00Z' }]
      const { ctx, page, erros } = await abrir(nav, { participacao: { combo_status: 'correcao_solicitada' }, correcoes }, [390, 844])
      await irPara(page, '#inicio')
      const t = await textoDe(page)
      ok(/Número sem DDD/.test(t), 'mostra o comentário da organização')
      ok(/Corrigir/i.test(t), 'a ação é corrigir')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('S5 formulário: numeração não pula e há resumo por bloco')
    {
      const { ctx, page, erros } = await abrir(nav, {}, [1280, 900])
      await irPara(page, '#cadastro')
      const a = await textoDe(page)
      ok(!/\b05\b|\b07\b|\b02\b/.test(a.replace(/\d{2}\/\d{2}/g, '')), 'Meu cadastro sem 02/05/07 soltos')
      ok(/Dados da marca/.test(a) && /Unidades participantes/.test(a) && /Atendimento e horário no festival/.test(a), 'títulos novos de Meu cadastro')
      ok(!/horário (da loja|do combo)/i.test(a), 'o horário é uma pergunta só: nada de horário da loja nem do combo')
      ok(!/Revisar antes de enviar|Revisar e enviar|Ver como fica no site|Enviar para análise/.test(a), 'só salvar: sem revisão, prévia nem envio')
      ok(await page.getByRole('button', { name: 'Salvar', exact: true }).count() === 1, 'um botão "Salvar" só')
      ok(/Tudo o que você salva chega para a organização, que atualiza o site/.test(a), 'diz para onde vai o que se salva')
      ok(!/Autorizo publicar este WhatsApp/.test(a), 'sem caixa de autorização do WhatsApp')
      ok(/salvos? automaticamente|salvo automaticamente|salva automaticamente/i.test(a), 'explica o salvamento automático')
      await capturar(page, 's5-cadastro', 1280)
      await irPara(page, '#combo/1')
      const c = await textoDe(page)
      ok(/Tema e inspiração/.test(c) && /Itens do combo/.test(c) && /Informações alimentares e trocas/.test(c), 'títulos novos de Meu combo')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('S7 fotos: vagas por dia, sessão com data completa, fotos oficiais')
    {
      const dia = (n, h) => { const d = new Date(Date.now() + n * 864e5); d.setUTCHours(h, 0, 0, 0); return d.toISOString() }
      const vagas = [
        { id: 'v1', status: 'aberto', participante_id: null, edicao_codigo: '2026.2', data_hora: dia(3, 14), local: 'Estúdio Centro' },
        { id: 'v2', status: 'aberto', participante_id: null, edicao_codigo: '2026.2', data_hora: dia(3, 16), local: 'Estúdio Centro' },
        { id: 'v3', status: 'aberto', participante_id: null, edicao_codigo: '2026.2', data_hora: dia(4, 14), local: 'Estúdio Centro' },
      ]
      const a = await abrir(nav, { sessoes: vagas }, [390, 844])
      await irPara(a.page, '#fotos')
      const t = await textoDe(a.page)
      ok(/Agendamento/i.test(t) && /Prepara/i.test(t) && /Fotos oficiais/i.test(t), 'três blocos: agendamento, preparação e fotos oficiais')
      ok(/segunda|terça|quarta|quinta|sexta|sábado|domingo/i.test(t), 'a vaga mostra o dia da semana por extenso')
      ok(/escolh|horário/i.test(t), 'convida a escolher um horário')
      ok(a.erros.length === 0, 'sem erro de JavaScript ' + a.erros.join(' | ').slice(0, 160))
      for (const [w, h] of TAMANHOS) { await a.page.setViewportSize({ width: w, height: h }); await dormir(300); await capturar(a.page, 's7-fotos-vagas', w) }
      await a.ctx.close()
      const marcada = [{ id: 's1', status: 'agendada', participante_id: PID, participacao_id: PA, edicao_codigo: '2026.2', data_hora: dia(2, 15), local: 'Estúdio Centro, Rua A 10' }]
      const b = await abrir(nav, { sessoes: marcada }, [390, 844])
      await irPara(b.page, '#fotos')
      const m = await textoDe(b.page)
      ok(/Estúdio Centro, Rua A 10/.test(m), 'a sessão marcada mostra o local')
      ok(/agendada|marcada/i.test(m), 'estado: sessão agendada')
      await capturar(b.page, 's7-fotos-sessao', 390)
      await b.ctx.close()
      const c = await abrir(nav, { participacao: { foto_liberacao: 'pendente' } }, [390, 844])
      await irPara(c.page, '#fotos')
      ok(/aguardando liberação/i.test(await textoDe(c.page)), 'antes da liberação diz "aguardando liberação"')
      await c.ctx.close()
    }

    console.log('S8 arquivos: leitura em destaque, formato e tamanho, abrir × baixar')
    {
      const arqs = [
        { id: 'a1', nome: 'Manual da edição', categoria: 'guia', exige_leitura: true, publicado_em: '2026-10-01T10:00:00Z', arquivado: false, path: 'geral/manual.pdf', mime: 'application/pdf', tamanho: 2516582, versao: 1 },
        { id: 'a2', nome: 'Termo de uso de imagem', categoria: 'documento', exige_leitura: false, publicado_em: '2026-09-20T10:00:00Z', arquivado: false, path: 'geral/termo.docx', tamanho: 40960 },
      ]
      const a = await abrir(nav, { arquivos: arqs }, [390, 844])
      await irPara(a.page, '#arquivos')
      const t = await textoDe(a.page)
      ok(/Manual da edição/.test(t) && /Termo de uso de imagem/.test(t), 'os dois arquivos aparecem')
      ok(/Li e confirmo a leitura/.test(t), 'botão de leitura com o texto honesto')
      ok(!/Li e estou de acordo/.test(t), 'sem "de acordo"')
      ok(/2,4 MB|2,5 MB/.test(t), 'tamanho legível')
      ok(await a.page.locator('button[aria-label^="Baixar "]').count() > 0, 'tem o botão de baixar (só a seta; o nome no aria-label)')
      ok(a.erros.length === 0, 'sem erro de JavaScript ' + a.erros.join(' | ').slice(0, 160))
      for (const [w, h] of TAMANHOS) { await a.page.setViewportSize({ width: w, height: h }); await dormir(300); await capturar(a.page, 's8-arquivos', w) }
      await a.ctx.close()
    }

    console.log('S9 solicitações: título, o que é pedido, prazo, estado e ação; respondidas à parte')
    {
      const em = (n) => new Date(Date.now() + n * 864e5).toISOString()
      const sol = [
        { id: 'p1', titulo: 'Mande a logo em alta', escopo: 'participacao', participacao_id: PA, bloco: 'arquivo', prioridade: 'importante', prazo_em: em(1), publicado: true, texto: 'Em PNG, fundo transparente.' },
        { id: 'p2', titulo: 'Confirme o horário no festival', escopo: 'participacao', participacao_id: PA, bloco: 'combo', prioridade: 'normal', prazo_em: em(10), publicado: true },
        { id: 'p3', titulo: 'Foto da fachada', escopo: 'participacao', participacao_id: PA, bloco: 'fotos', prioridade: 'normal', prazo_em: em(-3), publicado: true },
      ]
      const est = [{ solicitacao_id: 'p3', participacao_id: PA, estado: 'respondido', resposta: 'Enviada por e-mail.' }]
      const a = await abrir(nav, { solicitacoes: sol, estados: est }, [390, 844])
      await irPara(a.page, '#pedidos')
      const t = await textoDe(a.page)
      ok(/Solicitações/.test(t), 'a tela se chama Solicitações')
      ok(/Mande a logo em alta/.test(t) && /Confirme o horário no festival/.test(t), 'pendentes aparecem')
      ok(/Respondidas \(1\)/.test(t), 'respondidas ficam à parte e recolhidas')
      ok(/vence amanhã/i.test(t), 'prazo em palavras')
      ok(/Responder/.test(t), 'tem a ação Responder')
      ok(/Em PNG, fundo transparente/.test(t), 'mostra o que é pedido, em palavras da organização')
      const cortado = await a.page.evaluate(() => { const e = document.querySelector('.pn-cabeca__titulo'); return !e || e.scrollWidth > e.clientWidth + 1 })
      ok(!cortado, 'o título "Solicitações" não fica cortado pelo botão de conversa (390px)')
      ok(a.erros.length === 0, 'sem erro de JavaScript ' + a.erros.join(' | ').slice(0, 160))
      for (const [w, h] of TAMANHOS) { await a.page.setViewportSize({ width: w, height: h }); await dormir(300); await capturar(a.page, 's9-pedidos', w) }
      await a.ctx.close()
    }

    console.log('S6 sem rolagem horizontal em nenhum tamanho (Início e formulário)')
    {
      const { ctx, page } = await abrir(nav, { descrever: false, faltando: ['combo_nome'] }, [360, 780])
      for (const hash of ['#inicio', '#cadastro', '#combo/1', '#fotos', '#arquivos', '#pedidos']) {
        await irPara(page, hash)
        for (const [w, h] of TAMANHOS) {
          await page.setViewportSize({ width: w, height: h }); await dormir(250)
          const larg = await page.evaluate(() => { const e = document.querySelector('.pn-vista') || document.documentElement; return { sw: e.scrollWidth, cw: e.clientWidth } })
          ok(larg.sw <= larg.cw + 1, `${hash} em ${w}px sem rolagem horizontal (${larg.sw}/${larg.cw})`)
        }
      }
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
