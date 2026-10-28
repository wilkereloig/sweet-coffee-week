/*
 * Horário no festival no cadastro da MARCA, no navegador (23/10/2026): o seletor dentro do Cadastro real (Vite), contra backend
 * e Realtime FALSOS.
 *
 *   node tests/painel-horario-navegador.mjs          (de dentro de `tests/`)
 *
 * Prova: a pergunta é uma só (nada de "horário da loja"/"do combo"); "Igual todos os dias" grava as 11 datas do festival por
 * PATCH em `participacao_unidades` com o corpo canônico; rascunho INCOMPLETO nunca é gravado e o salvamento diz o que falta;
 * "Muda conforme o dia" → "Detalhar dia a dia", dois períodos e meia-noite; horário já gravado abre no modo certo; trocar para
 * "Igual todos os dias" com horários diferentes pede confirmação; alvos de toque e rolagem horizontal. Não prova o servidor
 * (resposta falsa, sem RLS nem grant de coluna) nem o iPhone real.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { criarBackend, criarRealtime, sessaoGuardada, dormir } from './helpers/backend-falso.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5243
const BASE = `http://localhost:${PORT}`
const UID = 'u-marca-0001'
const PID = '99999999-0000-4000-8000-000000000001'
const PA = 'pa-1'
const DATAS = Array.from({ length: 11 }, (_, i) => '2026-11-' + String(5 + i).padStart(2, '0'))
const falhas = []
const ok = (cond, msg) => { if (cond) console.log('  ✓ ' + msg); else { falhas.push(msg); console.log('  ✗ ' + msg) } }
const matar = (pid) => { if (!pid) return; try { if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL') } catch { /* já morreu */ } }
async function esperarServidor(url, ms = 60000) {
  const t = Date.now()
  while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return } catch { /* subindo */ } await dormir(400) }
  throw new Error('servidor de desenvolvimento não respondeu')
}
const linha = (data, abre, fecha) => ({ data, abre, fecha })
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)

async function abrir(nav, { horario = [], horarios = 'Ter a dom, 10h às 22h' } = {}, viewport = [390, 844]) {
  const ctx = await nav.newContext({ viewport: { width: viewport[0], height: viewport[1] } })
  const b = criarBackend(); const rt = criarRealtime()
  const patches = []
  let pu = { id: 'pu1', participacao_id: PA, unidade_id: 'un1', id_publico: 'u1', participa: true, consumo_local: 'sim', retirada: 'sim', delivery_combo: 'nao', ordem: 1, endereco: 'Rua A, 10', horarios, horario_festival: horario }
  b.tabelas.perfis = () => [{ deve_trocar_senha: false, ativo: true, bloqueado_em: null }]
  b.tabelas.participantes = () => [{ id: PID, nome_marca: 'Doce Sol', responsavel: 'Ana', telefone: '84999998888', slug: 'docesol', user_id: UID, created_at: '2026-09-01T00:00:00Z' }]
  b.tabelas.participacoes = () => [{ id: PA, participante_id: PID, edicao_codigo: '2026.2', status_cadastro: 'em_preenchimento', combo_status: 'rascunho', tema_combo: 'Divertida Mente', tema_justificativa: 'Emoções', logo_id: 'l1', foto_liberacao: 'liberado', created_at: '2026-09-01T00:00:00Z' }]
  b.tabelas.participantes_itens = () => [
    { id: 'i1', participacao_id: PA, posicao: 1, tipo: 'doce', nome: 'Bolo de cenoura', descricao: 'Com cobertura' },
    { id: 'i2', participacao_id: PA, posicao: 2, tipo: 'salgado', nome: 'Coxinha', descricao: 'Frango cremoso' },
    { id: 'i3', participacao_id: PA, posicao: 3, tipo: 'bebida', nome: 'Café', descricao: 'Coado' },
  ]
  b.tabelas.participacao_unidades = (url, metodo, corpo) => {
    if (metodo === 'PATCH') { patches.push({ q: url.search, corpo }); pu = { ...pu, ...corpo }; return [pu] }
    return [pu]
  }
  b.tabelas.unidades = (url, metodo, corpo) => [{ id: 'un1', logradouro: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'Natal', uf: 'RN', nome_unidade: 'Centro', ...(metodo === 'PATCH' ? corpo : {}) }]
  b.tabelas.edicoes = () => [{ codigo: '2026.2', nome: 'Cartoon', tema: 'Cartoon', festival_inicio: '2026-11-05', festival_fim: '2026-11-15', valor_combo: 25 }]
  b.tabelas.notificacoes = () => []
  b.rpcs.sync_meus_canais = () => ['scw:pessoa:' + UID, 'scw:marcas', 'scw:marca:' + PID]
  b.rpcs.marca_minha_logo = () => ({ atual: { id: 'l1' }, versoes: [] })
  b.rpcs.marca_previa_publica = () => ({ previa: {}, faltando: [] })
  b.rpcs.marca_minha_publicacao = () => ({ estado: 'nao_publicado', alterado_apos_aprovacao: false })
  await b.instalar(ctx); await rt.instalar(ctx)
  // O convite de instalar o app (R10) abre 2,5 s depois do tour e cobriria os cliques: aqui ele já foi adiado ("Agora não").
  await ctx.addInitScript(([s, id]) => {
    localStorage.setItem('scw_marca', s)
    localStorage.setItem('scw_tour_marca_' + id, '1')
    localStorage.setItem('scw_convite_aparelho_marca_' + id, String(Date.now()))
  }, [sessaoGuardada(UID, 'docesol@marca.sweetcoffeeweek.com.br'), PID])
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  await page.goto(`${BASE}/painel/#cadastro`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-tour="sino"]', { timeout: 30000 })
  await page.waitForSelector('[data-hf]', { state: 'attached', timeout: 30000 })
  await dormir(1200)
  const hf = page.locator('[data-hf]').first()
  // Bloco já preenchido vem recolhido: abre pelo cabeçalho, como a pessoa faria.
  if (!(await hf.isVisible())) { await page.locator('.mc-bloco', { has: page.locator('[data-hf]') }).locator('.mc-bloco__cabeca').click(); await hf.waitFor({ state: 'visible', timeout: 10000 }) }
  const comHorario = () => patches.filter((p) => p.corpo && 'horario_festival' in p.corpo)
  return { ctx, page, erros, patches, comHorario, hf, estado: () => pu }
}

const escolha = (hf, nome) => hf.getByLabel(nome, { exact: true }).first()
const linhaDe = (hf, chave) => hf.locator(`[data-hf-linha="${chave}"]`)
async function definir(hf, chave, rotulo, abre, fecha, periodo = 0) {
  const l = linhaDe(hf, chave)
  const pre = periodo ? 'segundo período, ' : ''
  await l.getByLabel(`${rotulo}: ${pre}abre às`).selectOption(abre)
  await l.getByLabel(`${rotulo}: ${pre}fecha às`).selectOption(fecha)
}
const resumo = (hf) => hf.locator('.hf__resumo').innerText()

async function principal() {
  const dev = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: dirname(__dirname), shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  let nav
  try {
    await esperarServidor(`${BASE}/painel/`)
    nav = await chromium.launch()

    console.log('H1 uma pergunta só, nada pré-marcado, "Hoje está" com o texto antigo')
    {
      const { ctx, page, erros, hf } = await abrir(nav)
      const t = await page.evaluate(() => document.body.innerText)
      ok(/Como esta unidade funciona nos dias do festival\?/.test(t), 'a pergunta é a do festival')
      ok(/De 5 a 15 de novembro\./.test(t), 'o período vem das datas da edição')
      ok(!/horário da loja|horário do combo/i.test(t), 'nada de "horário da loja"/"do combo"')
      ok(/Hoje está: Ter a dom, 10h às 22h\./.test(t), 'o texto antigo aparece para confirmar ou trocar')
      ok((await hf.locator('input[type=radio]:checked').count()) === 0, 'nenhuma opção vem marcada')
      ok((await hf.locator('[data-hf-linha]').count()) === 0, 'sem arranjo escolhido não há linha')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('H2 igual todos os dias: grava as 11 datas, uma vez, com o corpo canônico')
    {
      const { ctx, page, erros, hf, comHorario } = await abrir(nav)
      await escolha(hf, 'Igual todos os dias').check()
      ok((await linhaDe(hf, 'todos').count()) === 1, 'aparece uma linha só: "Todos os dias"')
      ok(/Falta responder: Todos os dias\./.test(await resumo(hf)), 'enquanto não responde, diz o que falta')
      await dormir(2600)
      ok(comHorario().length === 0, 'nada é gravado enquanto não está completo')
      await linhaDe(hf, 'todos').getByLabel('Abre', { exact: true }).check()
      await definir(hf, 'todos', 'Todos os dias', '10:00', '22:00')
      ok(/Fica assim: Todos os dias, das 10h às 22h/.test(await resumo(hf)), 'o resumo vivo diz como ficou')
      await dormir(3000)
      const enviados = comHorario()
      ok(enviados.length === 1, 'um PATCH com o horário (' + enviados.length + ')')
      const corpo = enviados[0] && enviados[0].corpo.horario_festival
      ok(Array.isArray(corpo) && corpo.length === 11 && igual(corpo.map((l) => l.data), DATAS), 'as 11 datas do festival, em ordem')
      ok(Array.isArray(corpo) && corpo.every((l) => igual(Object.keys(l).sort(), ['abre', 'data', 'fecha']) && l.abre === '10:00' && l.fecha === '22:00'), 'cada linha é só {data, abre, fecha}')
      ok(enviados[0] && /id=eq\.pu1/.test(enviados[0].q), 'o PATCH vai na linha da unidade (participacao_unidades?id=eq.pu1)')
      ok(!enviados.some((p) => JSON.stringify(p.corpo).includes('_horarioPendente')), 'o marcador de rascunho nunca vai ao banco')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('H3 incompleto nunca é gravado e o salvamento diz o que falta')
    {
      const { ctx, page, hf, comHorario } = await abrir(nav)
      await escolha(hf, 'Muda conforme o dia').check()
      ok((await hf.locator('[data-hf-linha]').count()) === 3, 'três linhas: Segunda a sexta · Sábado · Domingo')
      await linhaDe(hf, 'semana').getByLabel('Abre', { exact: true }).check()
      await definir(hf, 'semana', 'Segunda a sexta', '10:00', '22:00')
      await linhaDe(hf, 'sab').getByLabel('Abre', { exact: true }).check()      // abre, mas sem horas ainda
      ok(/Falta responder: Sábado e Domingo\./.test(await resumo(hf)), 'diz que falta Sábado e Domingo')
      await dormir(3200)
      ok(comHorario().length === 0, 'rascunho incompleto não é gravado')
      const t = await page.evaluate(() => document.body.innerText)
      ok(/O horário de .* não foi salvo/.test(t), 'o salvamento diz que o horário não foi salvo: ' + (t.match(/O horário de [^\n]*/) || [''])[0])
      await definir(hf, 'sab', 'Sábado', '12:00', '20:00')
      await linhaDe(hf, 'dom').getByLabel('Não abre', { exact: true }).check()
      ok(/Fica assim: Segunda a sexta, das 10h às 22h · Sábado, das 12h às 20h · Domingo, não abre/.test(await resumo(hf)), 'completo: resumo por semana')
      await dormir(3000)
      const enviados = comHorario()
      ok(enviados.length === 1, 'completo: um PATCH (' + enviados.length + ')')
      const corpo = (enviados[0] && enviados[0].corpo.horario_festival) || []
      ok(corpo.length === 9 && !corpo.some((l) => l.data === '2026-11-08' || l.data === '2026-11-15'), 'domingo não abre: as duas datas de domingo ficam de fora')
      ok(corpo.filter((l) => l.data === '2026-11-07' || l.data === '2026-11-14').every((l) => l.abre === '12:00' && l.fecha === '20:00'), 'os dois sábados com 12h às 20h')
      await ctx.close()
    }

    console.log('H4 dia a dia, dois períodos e meia-noite')
    {
      const { ctx, hf, comHorario, erros } = await abrir(nav)
      await escolha(hf, 'Muda conforme o dia').check()
      await linhaDe(hf, 'semana').getByLabel('Abre', { exact: true }).check()
      await definir(hf, 'semana', 'Segunda a sexta', '10:00', '22:00')
      await linhaDe(hf, 'sab').getByLabel('Abre', { exact: true }).check()
      await definir(hf, 'sab', 'Sábado', '10:00', '22:00')
      await linhaDe(hf, 'dom').getByLabel('Abre', { exact: true }).check()
      await definir(hf, 'dom', 'Domingo', '10:00', '22:00')
      await hf.getByRole('button', { name: 'Detalhar dia a dia' }).click()
      ok((await hf.locator('[data-hf-linha]').count()) === 11, 'uma linha por data do festival (11)')
      ok((await hf.getByRole('button', { name: 'Voltar a Segunda a sexta' }).count()) === 1, 'dá para voltar ao arranjo por semana (nada se perdeu)')
      // Sexta 6/11 fecha para o almoço e a quinta 5/11 vai até a meia-noite.
      const sexta = linhaDe(hf, '2026-11-06')
      await sexta.getByRole('button', { name: /Incluir intervalo/ }).click()
      await definir(hf, '2026-11-06', 'Sex 6/11', '10:00', '14:00')
      await definir(hf, '2026-11-06', 'Sex 6/11', '18:00', '22:00', 1)
      await linhaDe(hf, '2026-11-05').getByLabel('Qui 5/11: fecha às').selectOption('24:00')
      ok((await hf.getByRole('button', { name: 'Voltar a Segunda a sexta' }).count()) === 0, 'com dias diferentes dentro da semana não oferece voltar')
      ok(/Qui 5\/11: das 10h à meia-noite/.test(await resumo(hf)), 'o resumo diz "à meia-noite"')
      ok(/Sex 6\/11: das 10h às 14h e das 18h às 22h/.test(await resumo(hf)), 'o resumo diz os dois períodos')
      await dormir(3200)
      const enviados = comHorario()
      const corpo = (enviados[enviados.length - 1] && enviados[enviados.length - 1].corpo.horario_festival) || []
      ok(corpo.some((l) => l.data === '2026-11-05' && l.fecha === '24:00'), 'meia-noite grava 24:00')
      ok(corpo.filter((l) => l.data === '2026-11-06').length === 2, 'sexta tem duas linhas (dois períodos)')
      await sexta.getByRole('button', { name: /Tirar este intervalo/ }).click()
      ok(/Falta responder|Fica assim/.test(await resumo(hf)), 'tirar o intervalo atualiza o resumo')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('H5 horário já gravado abre no modo certo; trocar para "igual" com dias diferentes pede confirmação')
    {
      const gravado = DATAS.flatMap((d) => (d === '2026-11-08' || d === '2026-11-15' ? [] : [linha(d, d === '2026-11-07' || d === '2026-11-14' ? '12:00' : '10:00', d === '2026-11-07' || d === '2026-11-14' ? '20:00' : '22:00')]))
      const { ctx, page, hf, comHorario, erros } = await abrir(nav, { horario: gravado })
      const t = await page.evaluate(() => document.body.innerText)
      ok(!/Hoje está/.test(t), 'com horário gravado, o texto antigo não aparece')
      ok(await escolha(hf, 'Muda conforme o dia').isChecked(), 'abre em "Muda conforme o dia"')
      ok((await hf.locator('[data-hf-linha]').count()) === 3, 'por semana: Segunda a sexta · Sábado · Domingo')
      ok(/Segunda a sexta, das 10h às 22h/.test(await resumo(hf)) && /Domingo, não abre/.test(await resumo(hf)), 'o resumo reflete o gravado')
      await dormir(2600)
      ok(comHorario().length === 0, 'abrir a tela não grava nada')
      await escolha(hf, 'Igual todos os dias').click()      // não vira "marcada" antes da confirmação: nada de .check()
      const dialogo = page.getByRole('dialog')
      await dialogo.waitFor({ timeout: 5000 })
      ok(/Usar o mesmo horário em todos os dias\?/.test(await dialogo.innerText()), 'pergunta antes de apagar as diferenças')
      await dialogo.getByRole('button', { name: /Voltar|Cancelar/ }).first().click()
      ok(await escolha(hf, 'Muda conforme o dia').isChecked(), 'cancelar mantém o arranjo e os horários')
      await escolha(hf, 'Igual todos os dias').click()
      await page.getByRole('dialog').getByRole('button', { name: 'Usar em todos' }).click()
      ok(await escolha(hf, 'Igual todos os dias').isChecked() && (await hf.locator('[data-hf-linha]').count()) === 1, 'confirmar leva a uma linha só')
      await dormir(3000)
      const corpo = (comHorario().at(-1) || { corpo: {} }).corpo.horario_festival || []
      ok(corpo.length === 11 && corpo.every((l) => l.abre === '10:00' && l.fecha === '22:00'), 'o primeiro dia valeu para os 11 (10h às 22h)')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('H6 celular: alvo de toque de 44px, sem rolagem horizontal (360, 390, 768 e 1280)')
    {
      const { ctx, page, hf } = await abrir(nav, {}, [360, 780])
      await escolha(hf, 'Muda conforme o dia').check()
      await linhaDe(hf, 'semana').getByLabel('Abre', { exact: true }).check()
      await definir(hf, 'semana', 'Segunda a sexta', '10:00', '22:00')
      await linhaDe(hf, 'semana').getByRole('button', { name: /Incluir intervalo/ }).click()
      for (const [w, h] of [[360, 780], [390, 844], [768, 1024], [1280, 900]]) {
        await page.setViewportSize({ width: w, height: h }); await dormir(300)
        const m = await page.evaluate(() => {
          const raiz = document.querySelector('.pn-vista') || document.documentElement
          const peq = [...document.querySelectorAll('[data-hf] select, [data-hf] button, [data-hf] .hf__opcao')].filter((e) => e.getBoundingClientRect().height < 43.5).map((e) => (e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height))
          return { sw: raiz.scrollWidth, cw: raiz.clientWidth, peq }
        })
        ok(m.sw <= m.cw + 1, `${w}px sem rolagem horizontal (${m.sw}/${m.cw})`)
        ok(m.peq.length === 0, `${w}px: todo controle do seletor tem 44px ou mais ${m.peq.join(',')}`)
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
