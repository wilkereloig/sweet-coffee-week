/*
 * Página pública /preencher, no navegador (23/10/2026): o seletor do horário no festival dentro da página REAL (estática, ES5),
 * contra backend FALSO (preenchimento_ler / preenchimento_enviar). É o que as marcas estão preenchendo agora (prazo 24/10).
 *
 *   node tests/preencher-navegador.mjs          (de dentro de `tests/`)
 *
 * Prova: uma pergunta só ("Como esta unidade funciona nos dias do festival?"); o texto antigo vira "Hoje está"; incompleto bloqueia o
 * envio e a lista "Faltam N itens" leva ao ponto certo; completo manda `unidades[].horario_festival` (sem horario_loja/horario_combo);
 * "Igual todos os dias" com horários diferentes não apaga em silêncio (Desfazer); recarregar a aba (iPhone) mantém o que estava pela
 * metade. Trocas (02/11/2026): cada opção é um item completo — `itens[].trocas[]` com nome, descrição, disponibilidade e alergênicos
 * próprios, sem `troca` nem `original`; "Não" não manda troca; a lista de pendências cita cada troca; estado e rascunho antigos
 * (`troca`) ainda abrem. "O combo": nome e descrição obrigatórios. Capturas em 390 e 1440 (CAPTURAS, fora do repositório).
 * Não prova o servidor (resposta falsa) nem o iPhone/Safari real.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { criarBackend, dormir } from './helpers/backend-falso.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5245
const BASE = `http://localhost:${PORT}`
const CODIGO = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
const DATAS = Array.from({ length: 11 }, (_, i) => '2026-11-' + String(5 + i).padStart(2, '0'))
// Capturas (02/11/2026): fora do repositório. PREENCHER_CAPTURAS troca a pasta.
const CAPTURAS = process.env.PREENCHER_CAPTURAS || join(tmpdir(), 'scw-preencher-capturas')
const falhas = []
const ok = (cond, msg) => { if (cond) console.log('  ✓ ' + msg); else { falhas.push(msg); console.log('  ✗ ' + msg) } }
const matar = (pid) => { if (!pid) return; try { if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL') } catch { /* já morreu */ } }
async function esperarServidor(url, ms = 60000) {
  const t = Date.now()
  while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return } catch { /* subindo */ } await dormir(400) }
  throw new Error('servidor de desenvolvimento não respondeu')
}

const ALERG = ['gluten', 'leite', 'ovo', 'amendoim', 'castanhas', 'soja', 'peixe', 'crustaceos']
const item = (posicao, nome) => ({
  posicao, nome, descricao: 'Descrição de ' + nome, ingredientes: 'farinha, açúcar',
  alimentar: Object.fromEntries(ALERG.map((a) => [a, 'nao_contem'])), outro_alergenico: null, tem_troca: false, troca: null,
})
// O que preenchimento_ler devolve (ver supabase/migrations/20261016_link_preenchimento.sql + 20261107_horario_festival.sql).
function lido({ horarioAntigo = 'Ter a dom, 10h às 22h', horarioFestival = [], combo = {}, itens = null } = {}) {
  return {
    estado: 'ok', marca: 'Doce Sol', responsavel: 'Ana Souza', logo: null,
    edicao: {
      codigo: '2026.2', tema: 'CARTOON', inicio: '2026-11-05', fim: '2026-11-15', valor_combo: 25, vouchers: 4,
      cronograma: [{ chave: 'preenchimento', tipo: 'prazo', titulo: 'Preenchimento', inicio: null, fim: '2026-10-24', condicao: null }],
    },
    dados: {
      marca: { responsavel: 'Ana Souza', telefone: '84999998888', email: 'ana@docesol.com', instagram: '@docesol', site: '', cnpj: '', razao_social: '' },
      combo: { tema_combo: 'Divertida Mente', tema_justificativa: 'As emoções viram sabores', combo_nome: 'Combo Emoções', combo_descricao: 'Cinco emoções num combo só', combo_para_viagem: false, custo_embalagem: null, custo_delivery: null, ...combo },
      itens: itens || [item(1, 'Bolo de cenoura'), item(2, 'Cachorro-quente'), item(3, 'Café coado')],
      unidades: [{
        id: 'pu1', nome_unidade: 'Centro', logradouro: 'Rua A', numero: '10', complemento: null, bairro: 'Centro', cidade: 'Natal', cep: '59000000',
        referencia: null, whatsapp: '84999998888', whatsapp_autorizado: true, horario_combo: horarioAntigo, horario_festival: horarioFestival,
        consumo_local: 'sim', retirada: 'sim', delivery_combo: 'nao',
      }],
    },
    pendente: null, ultimo_envio: null,
  }
}

async function abrir(nav, cenario = {}, { viewport = { width: 390, height: 844 } } = {}) {
  const ctx = await nav.newContext({ viewport })
  const b = criarBackend()
  const envios = []
  b.rpcs.preenchimento_ler = () => lido(cenario)
  b.rpcs.preenchimento_enviar = (corpo) => { envios.push(corpo); return { ok: true } }
  await b.instalar(ctx)
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  await page.goto(`${BASE}/preencher/#${CODIGO}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#pr-conteudo:not(.oculto)', { timeout: 30000 })
  await dormir(500)
  return { ctx, page, erros, envios, b }
}

const caixa = (page) => page.locator('[data-horario]').first()
const escolha = (page, nome) => caixa(page).getByLabel(nome, { exact: true }).first()
const linhaDe = (page, nome) => caixa(page).locator('.hrow', { has: page.locator('legend', { hasText: new RegExp('^' + nome + '$') }) })
async function horas(page, rotulo, abre, fecha) {
  const l = linhaDe(page, rotulo)
  await l.getByLabel(rotulo + ': abre às').selectOption(abre)
  await l.getByLabel(rotulo + ': fecha às').selectOption(fecha)
}

// Horário completo + "Conferi tudo": o que falta para o envio passar quando o resto do cadastro está em dia.
async function completarHorarioEConfirmar(page) {
  await escolha(page, 'Igual todos os dias').check()
  await linhaDe(page, 'Todos os dias').getByLabel('Abre', { exact: true }).check()
  await horas(page, 'Todos os dias', '10:00', '22:00')
  await page.locator('#pr-confirma').check()
}
const itemNo = (page, n) => page.locator('#pr-itens .item').nth(n)
const opTroca = (item, n) => item.locator('.troca-op').nth(n)
const pendencias = (page) => page.evaluate(() => (document.getElementById('pr-faltas') || { innerText: '' }).innerText)
const progresso = (page) => page.locator('#pr-progresso').innerText()
async function preencherTroca(op, { nome, descricao, nenhum = false, contem = [], carac = [], disp = null }) {
  await op.getByLabel('Nome do item da troca').fill(nome)
  await op.getByLabel(/^Descrição/).fill(descricao)
  if (nenhum) await op.getByLabel('Nenhum', { exact: true }).check()
  for (const a of contem) await op.locator('[data-alergenico="' + a + '"]').check()
  for (const c of carac) await op.getByLabel(c, { exact: true }).check()
  if (disp) await op.getByLabel(disp, { exact: true }).check()
}
async function recarregar(page) {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#pr-conteudo:not(.oculto)', { timeout: 30000 })
  await dormir(500)
}

async function principal() {
  const dev = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: dirname(__dirname), shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  let nav
  try {
    await esperarServidor(`${BASE}/preencher/`)
    nav = await chromium.launch()

    console.log('P1 uma pergunta só, com o texto antigo como "Hoje está"')
    {
      const { ctx, page, erros } = await abrir(nav)
      const t = await page.evaluate(() => document.body.innerText)
      ok(/Como esta unidade funciona nos dias do festival\?/.test(t), 'a pergunta é a do festival')
      ok(/De 5 a 15 de novembro\./.test(t), 'o período vem da edição')
      ok(!/Horário da loja|Dias e horário de funcionamento da loja|igual ao (horário do )?combo/i.test(t), 'nada de "horário da loja" nem "igual ao combo"')
      ok(/Hoje está: Ter a dom, 10h às 22h/.test(t), 'o texto antigo aparece para confirmar ou trocar')
      ok((await caixa(page).locator('input[type=radio]:checked').count()) === 0, 'nenhuma opção vem marcada')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('P2 horário incompleto bloqueia o envio e a lista leva ao ponto certo')
    {
      const { ctx, page, envios } = await abrir(nav)
      await page.locator('#pr-enviar').click()
      await dormir(400)
      const lista = await page.evaluate(() => (document.getElementById('pr-faltas') || { innerText: '' }).innerText)
      ok(/Faltam?\s+\d+\s+iten/i.test(lista) && /horário|Horário|escolha uma das opções/i.test(lista), 'a lista de pendências cita o horário (' + lista.replace(/\s+/g, ' ').slice(0, 120) + ')')
      ok(envios.length === 0, 'nada é enviado')
      await escolha(page, 'Igual todos os dias').check()
      await linhaDe(page, 'Todos os dias').getByLabel('Abre', { exact: true }).check()
      await page.locator('#pr-enviar').click()
      await dormir(400)
      ok(envios.length === 0, 'com "Abre" e sem horas, continua bloqueado')
      await ctx.close()
    }

    console.log('P3 completo: manda horario_festival (11 datas), sem horario_loja nem horario_combo')
    {
      const { ctx, page, envios, erros } = await abrir(nav)
      await escolha(page, 'Igual todos os dias').check()
      await linhaDe(page, 'Todos os dias').getByLabel('Abre', { exact: true }).check()
      await horas(page, 'Todos os dias', '10:00', '22:00')
      ok(/Fica assim: Todos os dias, das 10h às 22h/.test(await caixa(page).innerText()), 'o resumo vivo diz como ficou')
      await page.locator('#pr-confirma').check()
      await page.locator('#pr-enviar').click()
      await dormir(800)
      const lista = await page.evaluate(() => (document.getElementById('pr-faltas') || { innerText: '' }).innerText)
      ok(envios.length === 1, 'um envio (' + envios.length + ')' + (envios.length ? '' : ' — pendências: ' + lista.slice(0, 200)))
      const un = envios[0] && envios[0].p_dados && envios[0].p_dados.unidades && envios[0].p_dados.unidades[0]
      ok(!!un && Array.isArray(un.horario_festival) && un.horario_festival.length === 11, 'unidades[0].horario_festival tem 11 linhas')
      ok(!!un && JSON.stringify(un.horario_festival.map((l) => l.data)) === JSON.stringify(DATAS), 'as 11 datas do festival, em ordem')
      ok(!!un && un.horario_festival.every((l) => l.abre === '10:00' && l.fecha === '22:00' && Object.keys(l).sort().join() === 'abre,data,fecha'), 'cada linha é só {data, abre, fecha}')
      ok(!!un && !('horario_loja' in un) && !('horario_combo' in un), 'não manda horario_loja nem horario_combo')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('P4 "Igual todos os dias" com horários diferentes não apaga em silêncio')
    {
      const gravado = DATAS.flatMap((d) => {
        const dow = new Date(d + 'T12:00:00Z').getUTCDay()
        if (dow === 0) return []
        return [{ data: d, abre: dow === 6 ? '12:00' : '10:00', fecha: dow === 6 ? '16:00' : '22:00' }]
      })
      const { ctx, page } = await abrir(nav, { horarioFestival: gravado })
      ok(await escolha(page, 'Muda conforme o dia').isChecked(), 'o gravado abre em "Muda conforme o dia"')
      ok(/Domingo, não abre/.test(await caixa(page).innerText()), 'o resumo reflete o gravado')
      await escolha(page, 'Igual todos os dias').check()
      const t = await caixa(page).innerText()
      ok(/Desfazer/.test(t), 'avisa e oferece "Desfazer": ' + (t.match(/[^\n]*Desfazer[^\n]*/) || [''])[0])
      await caixa(page).getByRole('button', { name: 'Desfazer' }).click()
      ok(await escolha(page, 'Muda conforme o dia').isChecked() && /Domingo, não abre/.test(await caixa(page).innerText()), 'desfazer devolve o arranjo e os horários')
      await ctx.close()
    }

    console.log('P5 recarregar a aba (iPhone volta do WhatsApp) mantém o horário pela metade')
    {
      const { ctx, page, b } = await abrir(nav)
      await escolha(page, 'Muda conforme o dia').check()
      await linhaDe(page, 'Segunda a sexta').getByLabel('Abre', { exact: true }).check()
      await horas(page, 'Segunda a sexta', '10:00', '22:00')
      await linhaDe(page, 'Sábado').getByLabel('Abre', { exact: true }).check()      // sábado sem horas, domingo em branco
      await page.locator('input[name="marca.responsavel"]').fill('Ana Souza')       // qualquer edição dispara o rascunho local
      await dormir(1200)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForSelector('#pr-conteudo:not(.oculto)', { timeout: 30000 })
      await dormir(600)
      ok(await escolha(page, 'Muda conforme o dia').isChecked(), 'volta em "Muda conforme o dia"')
      ok(/Segunda a sexta, das 10h às 22h|Falta responder: Sábado/.test(await caixa(page).innerText()), 'volta com o que já tinha respondido: ' + ((await caixa(page).innerText()).match(/Falta responder[^\n]*/) || [''])[0])
      void b
      await ctx.close()
    }

    console.log('P7 trocas: "Sim" no salgado com duas opções completas → itens[1].trocas com 2, sem troca nem original')
    {
      const { ctx, page, envios, erros } = await abrir(nav)
      const sal = itemNo(page, 1)
      ok(!/Troca o quê/.test(await page.evaluate(() => document.body.innerText)), 'não pergunta mais "Troca o quê?"')
      await sal.getByLabel('Sim', { exact: true }).check()
      ok((await sal.locator('.troca-op').count()) === 1, 'com "Sim" aparece um cartão vazio')
      ok(!(await opTroca(sal, 0).getByRole('button', { name: /Remover/ }).isVisible()), 'um cartão só: sem "Remover"')
      await preencherTroca(opTroca(sal, 0), { nome: 'Cachorro-quente vegetariano', descricao: 'Salsicha de soja e purê', contem: ['gluten', 'soja'], carac: ['Vegetariano'] })
      await sal.getByRole('button', { name: 'Adicionar outra opção de troca' }).click()
      ok((await sal.locator('.troca-op').count()) === 2, '"+ Adicionar outra opção de troca" cria o 2º cartão')
      ok(/Opção de troca 2/.test(await opTroca(sal, 1).innerText()), 'o 2º cartão se chama "Opção de troca 2"')
      ok(await opTroca(sal, 0).getByRole('button', { name: /Remover/ }).isVisible(), 'com dois cartões aparece "Remover"')
      await preencherTroca(opTroca(sal, 1), { nome: 'Cachorro-quente sem glúten', descricao: 'Pão sem glúten', nenhum: true, disp: 'Sob consulta' })
      await completarHorarioEConfirmar(page)
      mkdirSync(CAPTURAS, { recursive: true })
      // Só para a captura: o rodapé fixo (Enviar) cairia no meio da imagem do elemento.
      const semRodape = await page.addStyleTag({ content: '.enviar{position:static}' })
      for (const [w, h] of [[390, 844], [1440, 900]]) {
        await page.setViewportSize({ width: w, height: h }); await dormir(300)
        const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
        ok(m.sw <= m.cw + 1, `${w}px sem rolagem horizontal (${m.sw}/${m.cw})`)
        await sal.screenshot({ path: join(CAPTURAS, `item-duas-trocas-${w}.png`) })
        await page.locator('[data-bloco="combo"]').screenshot({ path: join(CAPTURAS, `bloco-o-combo-${w}.png`) })
      }
      await semRodape.evaluate((n) => n.remove())
      await page.setViewportSize({ width: 390, height: 844 })
      await page.locator('#pr-enviar').click()
      await dormir(800)
      ok(envios.length === 1, 'um envio (' + envios.length + ')' + (envios.length ? '' : ' — pendências: ' + (await pendencias(page)).slice(0, 200)))
      const itens = (envios[0] && envios[0].p_dados.itens) || []
      const tr = (itens[1] && itens[1].trocas) || []
      ok(!!itens[1] && itens[1].tem_troca === true && tr.length === 2, 'salgado: tem_troca e 2 trocas (' + tr.length + ')')
      ok(tr.every((t) => Object.keys(t).sort().join() === 'alimentar,alternativa,descricao,disponibilidade,outro_alergenico'), 'cada troca é só {alternativa, descricao, disponibilidade, alimentar, outro_alergenico}')
      ok(!!tr[0] && tr[0].alternativa === 'Cachorro-quente vegetariano' && tr[0].descricao === 'Salsicha de soja e purê' && tr[0].disponibilidade === 'sempre', 'troca 1: nome, descrição e "Sempre" por padrão')
      ok(!!tr[0] && tr[0].alimentar.gluten === 'contem' && tr[0].alimentar.soja === 'contem' && tr[0].alimentar.leite === 'nao_contem' && tr[0].alimentar.vegetariano === 'sim', 'troca 1: alergênicos e "Vegetariano" próprios')
      ok(!!tr[1] && ALERG.every((a) => tr[1].alimentar[a] === 'nao_contem') && tr[1].disponibilidade === 'sob_consulta', 'troca 2: "Nenhum" e "Sob consulta"')
      ok(itens.length === 3 && itens.every((it) => !('troca' in it) && !(it.trocas || []).some((t) => 'original' in t)), 'nenhum item manda `troca` nem `original`')
      ok(!!itens[0] && itens[0].tem_troca === false && !('trocas' in itens[0]) && !('trocas' in itens[2]), '"Não" (doce e bebida): sem trocas')
      ok(!!itens[1] && itens[1].alimentar.gluten === 'nao_contem' && !('vegetariano' in itens[1].alimentar), 'o item segue com os próprios alergênicos')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('P8 trocas: pendências citam cada troca; "Remover" e "Não" tiram da conta')
    {
      const { ctx, page, envios } = await abrir(nav)
      const doce = itemNo(page, 0)
      await completarHorarioEConfirmar(page)
      await doce.getByLabel('Sim', { exact: true }).check()
      await doce.getByRole('button', { name: 'Adicionar outra opção de troca' }).click()
      await preencherTroca(opTroca(doce, 1), { nome: 'Bolo de cenoura sem glúten', descricao: 'Farinha de arroz', nenhum: true })
      await page.locator('#pr-enviar').click()
      await dormir(400)
      const l = await pendencias(page)
      ok(/Doce · troca 1: nome/.test(l) && !/Doce · troca 1: descrição/.test(l) && /Doce · troca 1: alergênicos/.test(l), 'a lista cita nome e alergênicos da troca 1, e não a descrição, que é opcional (' + l.replace(/\s+/g, ' ').slice(0, 160) + ')')
      ok(!/troca 2/.test(l), 'a troca 2, completa, não aparece')
      ok(envios.length === 0, 'nada é enviado')
      await opTroca(doce, 0).getByRole('button', { name: /Remover/ }).click()
      ok((await doce.locator('.troca-op').count()) === 1 && /Opção de troca 1/.test(await opTroca(doce, 0).innerText()), 'remover renumera: sobra a "Opção de troca 1"')
      ok(/Tudo certo/.test(await progresso(page)), 'o contador do rodapé acompanha: ' + await progresso(page))
      await doce.getByRole('button', { name: 'Adicionar outra opção de troca' }).click()
      ok(/Falta/.test(await progresso(page)), 'cartão novo vazio volta a contar: ' + await progresso(page))
      await doce.getByLabel('Não', { exact: true }).check()
      ok(/Tudo certo/.test(await progresso(page)), 'com "Não" os cartões escondidos não contam')
      await page.locator('#pr-enviar').click()
      await dormir(600)
      const it0 = envios[0] && envios[0].p_dados.itens[0]
      ok(!!it0 && it0.tem_troca === false && !('trocas' in it0), '"Não": o envio vai sem trocas')
      await ctx.close()
    }

    console.log('P9 "O combo": nome e descrição obrigatórios, sem "(opcional)"')
    {
      const { ctx, page, envios } = await abrir(nav, { combo: { combo_nome: '', combo_descricao: '' } })
      const t = await page.locator('[data-bloco="combo"]').innerText()
      ok(/^O combo/m.test(t) && /Nome do combo/.test(t) && /Descrição do combo/.test(t) && !/opcional/i.test(t), 'bloco "O combo" com os dois campos, sem "(opcional)"')
      ok(/^Tema$/m.test(await page.locator('[data-bloco="tema"]').innerText()), 'o tema fica em bloco próprio')
      await completarHorarioEConfirmar(page)
      await page.locator('#pr-enviar').click()
      await dormir(400)
      const l = await pendencias(page)
      ok(/Nome do combo/.test(l) && /Descrição do combo/.test(l), 'a lista cobra nome e descrição do combo')
      ok(envios.length === 0, 'nada é enviado')
      await page.locator('[name="combo.combo_nome"]').fill('Combo Emoções')
      await page.locator('[name="combo.combo_descricao"]').fill('Cinco emoções num combo só')
      await page.locator('#pr-enviar').click()
      await dormir(600)
      ok(envios.length === 1 && envios[0].p_dados.combo.combo_nome === 'Combo Emoções' && envios[0].p_dados.combo.combo_descricao === 'Cinco emoções num combo só', 'preenchidos, o envio passa com os dois')
      await ctx.close()
    }

    console.log('P10 estado antigo (só `troca`) e estado novo (`trocas`) abrem nos cartões')
    {
      const antigo = { ...item(1, 'Bolo de cenoura'), tem_troca: true, troca: { original: 'Bolo de cenoura', alternativa: 'Bolo sem glúten', disponibilidade: 'sob_consulta', acrescimo: 0 } }
      const novo = {
        ...item(2, 'Cachorro-quente'), tem_troca: true,
        troca: { original: 'Cachorro-quente', alternativa: 'Cachorro-quente vegetariano', disponibilidade: 'sempre' },
        trocas: [
          { id: 's1', original: 'Cachorro-quente', alternativa: 'Cachorro-quente vegetariano', descricao: 'Salsicha de soja', disponibilidade: 'sempre', alimentar: { gluten: 'contem', vegetariano: 'sim' }, outro_alergenico: 'gergelim' },
          { id: 's2', original: 'Cachorro-quente', alternativa: 'Cachorro-quente sem glúten', descricao: 'Pão sem glúten', disponibilidade: 'limitada', alimentar: Object.fromEntries(ALERG.map((a) => [a, 'nao_contem'])), outro_alergenico: null },
        ],
      }
      const { ctx, page, erros } = await abrir(nav, { itens: [antigo, novo, item(3, 'Café coado')] })
      const doce = itemNo(page, 0), sal = itemNo(page, 1)
      ok(await doce.getByLabel('Sim', { exact: true }).isChecked() && await doce.locator('.troca').isVisible(), 'antigo: "Sim" marcado e cartões à vista')
      ok((await doce.locator('.troca-op').count()) === 1 && (await opTroca(doce, 0).getByLabel('Nome do item da troca').inputValue()) === 'Bolo sem glúten', 'antigo: `troca` vira o cartão 1')
      ok(await opTroca(doce, 0).getByLabel('Sob consulta', { exact: true }).isChecked(), 'antigo: a disponibilidade vem junto')
      ok((await sal.locator('.troca-op').count()) === 2, 'novo: `trocas` com 2 → 2 cartões (`troca` ignorado)')
      const c1 = opTroca(sal, 0)
      ok((await c1.getByLabel(/^Descrição/).inputValue()) === 'Salsicha de soja' && await c1.locator('[data-alergenico="gluten"]').isChecked() && await c1.getByLabel('Vegetariano', { exact: true }).isChecked(), 'novo: descrição e alergênicos do cartão 1')
      ok((await c1.locator('[data-outro]').inputValue()) === 'gergelim', 'novo: outro alergênico do cartão 1')
      ok(await opTroca(sal, 1).getByLabel('Nenhum', { exact: true }).isChecked() && await opTroca(sal, 1).getByLabel('Até acabar', { exact: true }).isChecked(), 'novo: cartão 2 com "Nenhum" e "Até acabar"')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('P11 rascunho: guarda as trocas ao recarregar; o do formato antigo (`troca`) ainda abre')
    {
      const { ctx, page } = await abrir(nav)
      const sal = itemNo(page, 1)
      await sal.getByLabel('Sim', { exact: true }).check()
      await preencherTroca(opTroca(sal, 0), { nome: 'Vegetariano', descricao: 'Soja', nenhum: true })
      await sal.getByRole('button', { name: 'Adicionar outra opção de troca' }).click()
      await preencherTroca(opTroca(sal, 1), { nome: 'Sem glúten', descricao: 'Pão de arroz', contem: ['ovo'] })
      await dormir(300)
      await recarregar(page)
      ok((await sal.locator('.troca-op').count()) === 2 && (await opTroca(sal, 1).getByLabel('Nome do item da troca').inputValue()) === 'Sem glúten' && await opTroca(sal, 1).locator('[data-alergenico="ovo"]').isChecked(), 'recarregar mantém as duas trocas')
      // Rascunho do formato anterior (uma troca só, em `troca`), como ficou guardado nos aparelhos antes de 02/11.
      await page.evaluate((k) => {
        const r = JSON.parse(localStorage.getItem(k))
        r.dados.itens[2] = { posicao: 3, nome: 'Café coado', descricao: 'x', alimentar: {}, tem_troca: true, troca: { original: 'Café coado', alternativa: 'Café com leite vegetal', disponibilidade: 'limitada' } }
        localStorage.setItem(k, JSON.stringify(r))
      }, 'scw_preencher_' + CODIGO)
      await recarregar(page)
      const beb = itemNo(page, 2)
      ok((await opTroca(beb, 0).getByLabel('Nome do item da troca').inputValue()) === 'Café com leite vegetal' && await opTroca(beb, 0).getByLabel('Até acabar', { exact: true }).isChecked(), 'rascunho antigo: `troca` vira o cartão 1')
      await ctx.close()
    }

    console.log('P6 celular: alvo de toque ≥ 44px e sem rolagem horizontal (360, 390 e 768)')
    {
      const { ctx, page } = await abrir(nav, {}, { viewport: { width: 360, height: 780 } })
      await escolha(page, 'Muda conforme o dia').check()
      await linhaDe(page, 'Segunda a sexta').getByLabel('Abre', { exact: true }).check()
      await horas(page, 'Segunda a sexta', '10:00', '22:00')
      for (const [w, h] of [[360, 780], [390, 844], [768, 1024]]) {
        await page.setViewportSize({ width: w, height: h }); await dormir(300)
        const m = await page.evaluate(() => {
          const peq = [...document.querySelectorAll('[data-horario] select, [data-horario] button, [data-horario] label.opcao')].filter((e) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height < 43.5).map((e) => e.tagName + '.' + e.className + ':' + Math.round(e.getBoundingClientRect().height))
          return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, peq }
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
