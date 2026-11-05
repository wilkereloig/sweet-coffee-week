/**
 * cartoon-navegador.mjs — camada de edição contra o BUILD (docs/cartoon-2026-2/).
 *
 *   npm run build && npm run test:cartoon-navegador
 *
 * A projeção pública (RPC edicao_publica / participante_publico / criterios /
 * resultados) é INTERCEPTADA com os dados de demonstração: o build de produção
 * não tem modo demo, então o teste injeta a resposta na rede, que é o mesmo
 * caminho que o site usa de verdade.
 *
 * Reprova:
 *  1. GATE — sem ?preview, /cartoon mostra a Home institucional.
 *  2. CENAS — link direto e recarregar em todas; um <h1>; console limpo.
 *  3. HASH ANTIGO e LOVERS — #/... vira caminho limpo; endereços Lovers nunca na edição.
 *  4. PARTICIPANTE — preço, composição, alergênicos e modos sem abas; "não informado"
 *     visível; delivery só onde a unidade declarou para o combo; combo abre no bloco do combo;
 *     casa com dado fino (itens sem nome, modos em branco) sem título vazio e com "não informado".
 *  5. ESTADOS — casa inexistente, sem elenco divulgado, falha de rede (nunca demo), encerrada.
 *  6. CATÁLOGO — filtro na URL, voltar preserva filtro e posição.
 *  7. MINHA ROTA (painel do Sweet Lover) — "quero ir" na ficha, contador, persistir no recarregar, progresso
 *     "x de N casas", "já fui" tira a parada da lista e põe a casa em "Já fui" (e desfaz), remover, rota antiga
 *     (versão 1) e storage quebrado.
 *  8. AVALIAÇÃO — fechada: letreiro, "abre em 5 de novembro", três passos e nenhum formulário; formulário só
 *     aberto; sucesso só com resposta ok; erro preserva as notas.
 *  9. CASCA — sem casca institucional, sem rolagem lateral em 360 e 1440, alvos ≥ 44px; cabeçalho creme
 *     com o selo; no celular, menu em folha que fecha por Esc, véu e link (foco preso e devolvido ao
 *     botão) e quatro abas (Avaliar → Prêmios depois dos resultados); rodapé com F2 e cookies, sem barras de sinal.
 * 10. ENTRADA — topo Estreia (TV com o período do dado, placa de casas, botão de ação, sem olhinhos —
 *     MANUAL §1.3), vitrine dos combos (foto, sem foto: a logo), como funciona, bairros levando ao Mapa filtrado, Avalie, Dúvidas;
 *     sem elenco, falha de rede e edição encerrada.
 * 11. MAPA — topo no canal Rota; uma linha por unidade; sem coordenada = "em conferência"; aproximada dita assim
 *     na lista e no marcador; ?bairro= (contrato da Entrada) filtra a unidade; quero ir e já fui como filtro;
 *     "perto de mim" com recusa honesta e com posição (distância em linha reta).
 * 12. PREMIAÇÃO — canal Gala com a marca do Sweet Awards e o troféu v15 de ouro e "resultados depois de 15/11"; com resultados, pódio por
 *     categoria sem 2º/3º inventado.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { DEMO_EDICAO } from '../src/edicao/dados/demo/cartoon.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5217
const BASE = `http://localhost:${PORT}`
const falhas = []
const falha = (m) => { falhas.push(m); console.log(`  ✗ ${m}`) }
const ok = (m) => console.log(`  ✓ ${m}`)
const clone = (o) => JSON.parse(JSON.stringify(o))

function killTree(pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    else process.kill(-pid, 'SIGKILL')
  } catch { /* já morto */ }
}
async function waitForServer(url, ms = 30000) {
  const t = Date.now()
  while (Date.now() - t < ms) {
    try { if ((await fetch(url)).ok) return } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 350))
  }
  throw new Error('preview não respondeu')
}
try { await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1500) }); console.error(`✗ porta ${PORT} ocupada`); process.exit(1) } catch { /* livre */ }

/** Contexto com a projeção interceptada. `edicao` = resposta de edicao_publica (ou 'falha'). */
async function contexto (nav, { w = 1440, h = 900, edicao = DEMO_EDICAO, envio = 'ok', resultados = null, opcoes = {} } = {}) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, ...opcoes })
  await ctx.route('**/rest/v1/rpc/**', async (route) => {
    const fn = route.request().url().split('/rpc/')[1].split('?')[0]
    const corpo = JSON.parse(route.request().postData() || '{}')
    if (edicao === 'falha') return route.abort('failed')
    const json = (d) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) })
    if (fn === 'edicao_publica') return json(edicao)
    if (fn === 'participante_publico') {
      if (!edicao.participantes_publicos) return json({ estado: 'nao_divulgado' })
      const p = edicao.participantes.find((x) => x.slug === corpo.p_slug)
      return json(p ? { estado: 'publicado', fase: edicao.fase, participante: p } : { estado: 'inexistente' })
    }
    if (fn === 'criterios_avaliacao') return json(edicao.avaliacao?.aberta ? [{ chave: 'doce', rotulo: 'Doce', minimo: 5, maximo: 10 }, { chave: 'bebida', rotulo: 'Bebida', minimo: 5, maximo: 10 }] : [])
    if (fn === 'resultados_publicos') return json(resultados)
    return route.fulfill({ status: 404, body: '{}' })
  })
  await ctx.route('**/functions/v1/enviar-formulario', (route) => (envio === 'ok'
    ? route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
    : route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false,"message":"falha_ao_chamar_rpc"}' })))
  await ctx.route('**/challenges.cloudflare.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  await ctx.route('**/tiles.openfreemap.org/**', (route) => route.abort('failed'))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|openfreemap|maplibre|404/.test(m.text())) erros.push(m.text()) })
  return { ctx, page, erros }
}
const ir = (page, p) => page.goto(`${BASE}${p}${p.includes('?') ? '&' : '?'}preview=1`, { waitUntil: 'networkidle' })
const h1 = async (page) => (await page.locator('h1').first().textContent())?.trim()

const preview = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  cwd: join(__dirname, '..'), shell: true, stdio: ['ignore', 'pipe', 'pipe'],
})
let nav
try {
  await waitForServer(BASE)
  nav = await chromium.launch()

  console.log('\n1 · gate')
  {
    const { ctx, page } = await contexto(nav)
    await page.goto(`${BASE}/cartoon`, { waitUntil: 'networkidle' })
    if (await page.locator('.ct-edicao').count()) ok('rota pública: /cartoon abre sem preview')
    else falha('com CARTOON_PUBLICA ligada, /cartoon não abriu sem preview')
    await page.goto(`${BASE}/cartoon/mapa`, { waitUntil: 'networkidle' })
    const linkMapa = await page.locator('.ct-edicao nav a[href$="/mapa"]').count()
    if (await page.getByText('O mapa chega em breve').count() && !linkMapa) ok('sem preview, o mapa fica fora da navegação e mostra "em breve"')
    else falha('sem preview, o mapa apareceu')
    await ctx.close()
  }

  console.log('\n2 · cenas: link direto, recarregar, um <h1>')
  {
    const { ctx, page, erros } = await contexto(nav)
    const CENAS = [
      ['/cartoon/participantes', 'Estrelando: nosso elenco!'],
      ['/cartoon/participantes/demo-casa-aurora', '[DEMO] Casa Aurora'],
      ['/cartoon/combos', 'Escolha seu combo'],
      ['/cartoon/combos/demo-casa-aurora', '[DEMO] Casa Aurora'],
      ['/cartoon/mapa', 'Mapa da Doçura'],
      ['/cartoon/minha-rota', 'Mapa da Doçura'],
      ['/cartoon/avaliar', 'Sweet Awards'],
      ['/cartoon/premiacao', 'Sweet Awards'],
      ['/cartoon/nao-existe', 'Não encontramos essa página da Cartoon'],
      ['/cartoon/participantes/casa-que-nao-existe', 'Não encontramos essa casa na Cartoon.'],
    ]
    const antes = falhas.length
    await ir(page, '/cartoon')
    // Repaginação de 04/11: o letreiro é CSS (etiqueta de apoio + letras); o nome inteiro vai no aria-label.
    if ((await page.locator('h1.ct-letreiro').getAttribute('aria-label')) !== 'Agora é hora de provar!' || !(await page.locator('h1 .ct-letreiro__apoio').count())) falha('/cartoon: h1 sem o letreiro de gibi')
    for (const [p, t] of [['/cartoon', 'Agora é hora de provar!'], ...CENAS]) {
      await ir(page, p)
      await page.waitForFunction((t) => document.querySelector('h1')?.textContent?.trim() === t, t, { timeout: 5000 }).catch(() => {})
      if ((await h1(page)) !== t) falha(`${p}: h1 "${await h1(page)}" ≠ "${t}"`)
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForFunction((t) => document.querySelector('h1')?.textContent?.trim() === t, t, { timeout: 5000 }).catch(() => {})
      if ((await h1(page)) !== t) falha(`${p}: recarregar perdeu a cena`)
      if ((await page.locator('h1').count()) !== 1) falha(`${p}: ${await page.locator('h1').count()} <h1>`)
    }
    if (erros.length) falha(`console: ${erros.slice(0, 3).join(' | ')}`)
    if (falhas.length === antes) ok(`${CENAS.length + 1} cenas por link direto e recarregar, um <h1> cada, console limpo`)

    console.log('\n3 · hash antigo e Lovers')
    await page.goto(`${BASE}/?preview=1#/cartoon/mapa`, { waitUntil: 'networkidle' })
    if (new URL(page.url()).pathname !== '/cartoon/mapa' || (await h1(page)) !== 'Mapa da Doçura') falha(`#/cartoon/mapa → ${page.url()}`)
    for (const p of ['/lovers/combos/paneer-patisserie', '/mapa', '/participantes', '/rota']) {
      await ir(page, p)
      await page.waitForFunction(() => location.pathname === '/', null, { timeout: 5000 }).catch(() => {})
      if (new URL(page.url()).pathname !== '/' || !(await page.locator('.ct-edicao').count())) falha(`${p} não caiu na entrada da edição`)
    }
    if (!falhas.some((f) => /Home|#\//.test(f))) ok('hash vira caminho limpo; endereços Lovers seguem na Home')
    await ctx.close()
  }

  console.log('\n4 · página do participante')
  {
    const { ctx, page } = await contexto(nav)
    const antes = falhas.length
    await ir(page, '/cartoon/participantes/demo-casa-aurora')
    await page.waitForSelector('#combo')
    // A composição usa espaço fixo antes do "·" (a linha nunca começa com ponto): compara com espaço comum.
    const t = (await page.locator('.ct-part').innerText()).replace(/ /g, ' ')
    // O preço de R$ 38,90 vem no preço em letreiro (Preco, repaginação de 04/11): texto de verdade, não imagem.
    if ((await page.locator('.ct-part .ct-preco').first().textContent())?.trim() !== 'Combo R$ 38,90') falha('participante sem o preço "Combo R$ 38,90"')
    for (const s of ['Contém glúten, leite e ovo', 'Pode conter', 'Confirme com a loja', 'Opções de troca']) {
      if (!t.includes(s)) falha(`participante sem "${s}"`)
    }
    if (await page.locator('.ct-part [role="tab"], .ct-part [role="tablist"]').count()) falha('participante usa abas')
    // "No combo": a faixa dos itens, na ordem do combo, cada um com tipo e nome — e levando ao seu cartão.
    const nomesFaixa = await page.locator('.ct-composicao__nome').allTextContents()
    const tiposFaixa = await page.locator('.ct-composicao__tipo').allTextContents()
    if (nomesFaixa.join('|') !== '[DEMO] Doce|[DEMO] Salgado|[DEMO] Bebida' || tiposFaixa.join('|') !== 'Doce|Salgado|Bebida') falha(`faixa "No combo" fora de ordem: ${tiposFaixa} · ${nomesFaixa}`)
    // Avisos de alergênicos: "Contém" e "Pode conter" (antes só o primeiro), no painel do combo e no resumo do fim.
    if ((await page.locator('.ct-alerta--contem').innerText()).trim() !== 'Contém glúten, leite e ovo') falha('aviso "Contém" do combo mudou')
    if ((await page.locator('.ct-alerta--pode').innerText()).trim() !== 'Pode conter amendoim') falha('aviso "Pode conter" do combo ausente')
    if ((await page.locator('#restricoes .ct-declarado li').count()) !== 2) falha('resumo das restrições sem o que a casa declarou (contém / pode conter)')
    // Atalhos do topo: delivery vai direto ao link quando só uma unidade entrega; "No local" rola até as unidades SEM mexer no endereço
    // (a prévia do painel lê o hash como rota).
    const atalhoDelivery = page.locator('.ct-atalho', { hasText: 'Delivery' })
    if ((await atalhoDelivery.getAttribute('href')) !== 'https://wa.me/5584900000000' || (await atalhoDelivery.getAttribute('target')) !== '_blank') falha('atalho de delivery (uma só unidade entrega) não abre o link da unidade')
    await page.locator('.ct-atalho', { hasText: 'No local' }).click()
    await page.waitForTimeout(900)
    if (new URL(page.url()).hash) falha(`atalho interno mexeu no endereço: ${new URL(page.url()).hash}`)
    const topoUnidades = await page.evaluate(() => document.getElementById('unidades').getBoundingClientRect().top)
    if (Math.abs(topoUnidades) > 140) falha(`"No local" não rolou até as unidades (top=${Math.round(topoUnidades)})`)
    // O painel de delivery lista só quem entrega, com o canal DELA.
    const painelDelivery = await page.locator('.ct-delivery').innerText()
    if (painelDelivery.includes('Unidade Sul') || !/whatsapp/i.test(painelDelivery)) falha(`painel de delivery fora da unidade certa: ${painelDelivery}`)
    const delivery = await page.locator('.ct-modos > li', { hasText: 'Delivery' }).innerText()
    if (!delivery.includes('Unidade Centro') || delivery.includes('Unidade Sul')) falha(`delivery fora da unidade certa: ${delivery}`)
    if (!t.includes('A casa informa que não contém lactose') || !/Contém\s*\n?\s*leite/.test(t)) falha('"sem lactose" sem o "contém leite" ao lado')
    await ir(page, '/cartoon/participantes/demo-casa-bico-de-pena')
    await page.waitForSelector('#combo')
    const b = await page.locator('.ct-part').innerText()
    if (!b.includes('Não informado pela casa')) falha('restrição não informada não aparece como "não informado"')
    if (b.includes('Não contém, segundo a casa')) falha('"não informado" virou "não contém"')
    // Delivery aparece como "a casa não oferece" (dado declarado), nunca como disponível nem com canal.
    if ((await page.locator('.ct-modo--delivery').getAttribute('data-estado')) !== 'nao') falha('Bico de Pena: delivery não está como "não oferece"')
    if ((await page.locator('.ct-modo--delivery').innerText()).includes('Pedir por')) falha('Bico de Pena mostra canal de delivery sem ter declarado')
    if (await page.locator('.ct-atalho', { hasText: 'Delivery' }).count()) falha('Bico de Pena tem atalho de delivery no topo')
    await ir(page, '/cartoon/participantes/demo-casa-quadro-a-quadro')
    await page.waitForSelector('.ct-casa')
    if (!(await page.locator('.ct-part').innerText()).includes('será revelado em breve') || await page.locator('#combo').count()) falha('casa sem combo publicado mostrou combo')
    await ir(page, '/cartoon/combos/demo-casa-aurora')
    await page.waitForSelector('#combo')
    await page.waitForTimeout(400)
    const topo = await page.evaluate(() => document.getElementById('combo').getBoundingClientRect().top)
    if (Math.abs(topo) > 120) falha(`/combos/:slug não abriu no bloco do combo (top=${Math.round(topo)})`)
    if (falhas.length === antes) ok('preço, composição, alergênicos e modos à vista; não informado ≠ não contém; delivery por unidade; combo focado')
    await ctx.close()

    // Casa com dado fino, como as do painel hoje: itens sem nome, modos em branco, endereço em caixa alta.
    const antesFina = falhas.length
    const fina = {
      slug: 'teste-casa-fina', nivel: 'marca_e_combo', casa: { nome: 'Casa Fina' },
      combo: { preco: 38.9, fotos: {}, itens: [{ tipo: 'doce', posicao: 1 }, { tipo: 'salgado', posicao: 2 }, { tipo: 'bebida', posicao: 3 }] },
      unidades: [{ id: 'ufina1', endereco: { logradouro: 'RUA DO TESTE N 10', numero: '10', bairro: 'Tirol', cidade: 'Natal' }, combo: { modos: {} } }],
    }
    const c = await contexto(nav, { edicao: { ...clone(DEMO_EDICAO), participantes: [...clone(DEMO_EDICAO).participantes, fina] } })
    await ir(c.page, '/cartoon/participantes/teste-casa-fina')
    await c.page.waitForSelector('#combo')
    const vazios = await c.page.evaluate(() => [...document.querySelectorAll('.ct-part :is(h1, h2, h3)')].filter((h) => !h.textContent.trim()).length)
    if (vazios) falha(`casa fina: ${vazios} título(s) vazio(s)`)
    const f = await c.page.locator('.ct-part').innerText()
    for (const s of ['Nome não informado pela casa', 'Não informado pela casa', 'Não informadas pela casa.', 'Foto do combo em produção', 'Rua do Teste, 10']) {
      if (!f.includes(s)) falha(`casa fina sem "${s}"`)
    }
    if (f.includes('10, 10')) falha('casa fina: número do endereço repetido')
    if ((await c.page.locator('.ct-modo[data-estado="nao_informado"]').count()) !== 3) falha('casa fina: modos em branco não aparecem como não informados')
    if (falhas.length === antesFina) ok('casa com dado fino: sem título vazio, "não informado" à vista, endereço sem número repetido')
    await c.ctx.close()
  }

  console.log('\n4b · ficha de casa com várias unidades')
  {
    const DIAS_TESTE = clone(DEMO_EDICAO.participantes[0].unidades[0].combo.disponibilidade)
    const domingoCurto = DIAS_TESTE.map((f) => (f.data === '2026-11-08' || f.data === '2026-11-15' ? { ...f, fecha: '18:00' } : f))
    const unidade = (id, nome, bairro, link, disponibilidade, obs) => ({
      id, nome, endereco: { logradouro: 'Rua do Teste', numero: '1', bairro, cidade: 'Natal', uf: 'RN' },
      combo: { modos: { local: 'sim', retirada: 'sim', delivery: 'sim' }, canais: [{ tipo: 'whatsapp', link }], disponibilidade, observacao: obs },
    })
    const foto = (n) => ({ path: `/images/teste-ficha-${n}.jpg`, alt: '' })
    const item = (tipo, posicao, fotos) => ({ tipo, posicao, nome: `Item ${posicao}`, descricao: `Descrição do item ${posicao}.`, fotos, alimentar: [] })
    const varias = {
      slug: 'teste-casa-varias', nivel: 'marca_e_combo', casa: { nome: 'Casa Varias', apresentacao: 'Texto de apresentação da casa de teste.' },
      unidades: [
        unidade('uv1', 'Unidade Norte', 'Potengi', 'https://wa.me/5584911111111', DIAS_TESTE, 'Nada'),
        unidade('uv2', 'Unidade Praia', 'Ponta Negra', 'https://wa.me/5584922222222', domingoCurto, 'Estacionamento no subsolo.'),
      ],
      combo: { nome: 'Combo de teste', preco: 38.9, itens: [item('doce', 1, [foto(1), foto(2)]), item('salgado', 2, [foto(3), foto(4)]), item('bebida', 3, [foto(5)])] },
    }
    const c = await contexto(nav, { edicao: { ...clone(DEMO_EDICAO), participantes: [...clone(DEMO_EDICAO).participantes, varias] } })
    const antesV = falhas.length
    await ir(c.page, '/cartoon/participantes/teste-casa-varias')
    await c.page.waitForSelector('#combo')
    // O link de uma unidade não vale para a outra: o atalho não abre o primeiro canal da lista, leva a "Como pedir" para escolher.
    const atalho = c.page.locator('.ct-atalho', { hasText: 'Delivery' })
    if ((await atalho.getAttribute('href')) !== '#atendimento' || (await atalho.getAttribute('target'))) falha(`delivery com duas unidades abriu um link: ${await atalho.getAttribute('href')}`)
    if (!(await atalho.innerText()).includes('Escolha a unidade')) falha('atalho de delivery sem "Escolha a unidade"')
    await atalho.click()
    await c.page.waitForTimeout(900)
    if (new URL(c.page.url()).hash) falha('atalho de delivery mexeu no endereço')
    const topoAtendimento = await c.page.evaluate(() => document.getElementById('atendimento').getBoundingClientRect().top)
    if (Math.abs(topoAtendimento) > 140) falha(`atalho de delivery não rolou até "Como pedir" (top=${Math.round(topoAtendimento)})`)
    // Uma linha por unidade, cada uma com o canal DELA.
    const linhas = c.page.locator('.ct-delivery__unidade')
    if ((await linhas.count()) !== 2) falha('painel de delivery sem uma linha por unidade')
    else {
      if (!(await linhas.nth(0).innerText()).includes('Unidade Norte') || (await linhas.nth(0).locator('a').getAttribute('href')) !== 'https://wa.me/5584911111111') falha('delivery: canal da 1ª unidade trocado')
      if (!(await linhas.nth(1).innerText()).includes('Unidade Praia') || (await linhas.nth(1).locator('a').getAttribute('href')) !== 'https://wa.me/5584922222222') falha('delivery: canal da 2ª unidade trocado')
    }
    for (const modo of ['local', 'retirada', 'delivery']) {
      if ((await c.page.locator(`.ct-modo--${modo} .ct-modo__estado`).innerText()).trim() !== 'Em todas as unidades') falha(`"${modo}" não diz "Em todas as unidades"`)
    }
    // Observação que não diz nada ("Nada") não vira aviso; a de verdade fica.
    const obs = await c.page.locator('.ct-unidade__obs').allInnerTexts()
    if (obs.some((t) => /^nada$/i.test(t.trim())) || !obs.includes('Estacionamento no subsolo.')) falha(`observações das unidades: ${JSON.stringify(obs)}`)
    // Horário: frases em destaque; dias iguais não repetem a grade, dias diferentes ficam em "Ver todos os dias", fechado.
    if ((await c.page.locator('.ct-dias-detalhe').count()) !== 1) falha('só a unidade com horário por semana deveria ter "Ver todos os dias"')
    else {
      const det = c.page.locator('.ct-dias-detalhe')
      if (await det.evaluate((e) => e.open)) falha('"Ver todos os dias" abriu sozinho com o horário agrupado por semana')
      await det.locator('summary').click()
      if ((await det.locator('.ct-dia').count()) !== 11) falha('"Ver todos os dias" não lista os 11 dias do festival')
    }
    if (!(await c.page.locator('.ct-unidade').nth(0).innerText()).includes('Todos os dias')) falha('1ª unidade sem a frase "Todos os dias"')
    // Apresentação da casa: fora do topo, na seção "Sobre a casa"; o nome do combo, no topo.
    if (await c.page.locator('.ct-ficha__topo').getByText('Texto de apresentação').count()) falha('a apresentação voltou para o topo')
    if (!(await c.page.locator('#sobre').innerText()).includes('Texto de apresentação')) falha('sem a seção "Sobre a casa"')
    if ((await c.page.locator('.ct-ficha__combo').innerText()).trim() !== 'Combo de teste') falha('topo sem o nome do combo')
    // Os cartões dos itens dividem as linhas: o nome do item 3 (uma foto, sem contador) fica na altura dos outros dois.
    // (a camada gira os cartões 2 e 3 em ±0,6° e anima a entrada: sem isso a medição do topo erra por ~2px)
    await c.page.addStyleTag({ content: '.ct-item { rotate: 0deg !important; animation: none !important; }' })
    const topos = await c.page.locator('.ct-item__nome').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top + scrollY)))
    if (topos.length === 3 && Math.max(...topos) - Math.min(...topos) > 1) falha(`nomes dos itens fora de alinhamento: ${topos}`)
    // A faixa "No combo" leva ao cartão do item (id por posição).
    await c.page.locator('.ct-composicao__item', { hasText: 'Item 3' }).click()
    await c.page.waitForTimeout(900)
    const topoItem = await c.page.evaluate(() => document.getElementById('item-3').getBoundingClientRect().top)
    if (topoItem < 0 || topoItem > 200) falha(`faixa "No combo" não levou ao cartão do item (top=${Math.round(topoItem)})`)
    if (c.erros.length) falha(`console: ${c.erros.join(' | ')}`)
    if (falhas.length === antesV) ok('várias unidades: delivery escolhe a unidade, canal de cada uma, "em todas as unidades", observação vazia some, horário em frases, itens alinhados')
    await c.ctx.close()
  }

  console.log('\n5 · estados parciais e de falha')
  {
    const antes = falhas.length
    const fechado = { ...clone(DEMO_EDICAO), participantes_publicos: false, combos_publicos: false, participantes: [] }
    let c = await contexto(nav, { edicao: fechado })
    await ir(c.page, '/cartoon/participantes')
    if (!(await c.page.locator('.ct-conteudo').innerText()).includes('será revelado em breve')) falha('sem elenco divulgado não diz "em breve"')
    await ir(c.page, '/cartoon/participantes/demo-casa-aurora')
    if (!(await c.page.locator('.ct-conteudo').innerText()).includes('será revelado em breve')) falha('slug com elenco fechado confirmou a casa')
    await c.ctx.close()

    c = await contexto(nav, { edicao: 'falha' })
    await ir(c.page, '/cartoon/participantes')
    const txt = await c.page.locator('.ct-conteudo').innerText()
    if (!txt.includes('Não conseguimos carregar a edição agora')) falha('falha de rede sem estado de falha')
    if (txt.includes('[DEMO]')) falha('falha de rede caiu em dado de demonstração')
    await c.ctx.close()

    const encerrada = { ...clone(DEMO_EDICAO), fase: 'encerrada' }
    c = await contexto(nav, { edicao: encerrada })
    await ir(c.page, '/cartoon/participantes/demo-casa-aurora')
    await c.page.waitForSelector('#combo')
    const e = await c.page.locator('.ct-part').innerText()
    if (e.includes('R$ 38,90') || await c.page.locator('.ct-part img[alt*="R$"]').count() || e.includes('Horário no festival')) falha('edição encerrada ainda mostra preço ou horário')
    if (await c.page.locator('.ct-part .ct-marca').count()) falha('edição encerrada ainda mostra "Quero ir"/"Já fui"')
    if (!e.includes('terminou')) falha('edição encerrada sem aviso')
    await c.ctx.close()
    if (falhas.length === antes) ok('sem elenco, slug sob elenco fechado, falha de rede (sem demo) e edição encerrada')
  }

  console.log('\n6 · catálogo: filtro na URL, voltar preserva filtro e posição')
  {
    const { ctx, page } = await contexto(nav, { w: 1440, h: 500 })
    const antes = falhas.length
    await ir(page, '/cartoon/participantes')
    await page.click('.ct-chip:has-text("Delivery")')
    await page.waitForFunction(() => new URLSearchParams(location.search).get('modo') === 'delivery')
    if ((await page.locator('.ct-cartao').count()) !== 1) falha(`filtro delivery: ${await page.locator('.ct-cartao').count()} cartões`)
    // Rola até o cartão ANTES de medir: o clique do Playwright rolaria até ele de novo e a posição guardada
    // seria outra. O topo do elenco (letreiro) deixa o cartão abaixo da dobra em 500 px de altura.
    await page.locator('.ct-cartao__link').first().scrollIntoViewIfNeeded()
    const y0 = await page.evaluate(() => scrollY)
    if (y0 === 0) falha('catálogo: o teste não rolou, a posição não foi verificada')
    await page.click('.ct-cartao__link')
    await page.waitForSelector('#combo')
    await page.goBack()
    await page.waitForSelector('.ct-cartao')
    await page.waitForTimeout(400)
    if (new URLSearchParams(new URL(page.url()).search).get('modo') !== 'delivery') falha('voltar perdeu o filtro')
    if ((await page.locator('.ct-cartao').count()) !== 1) falha('voltar não reaplicou o filtro')
    const y1 = await page.evaluate(() => scrollY)
    if (y0 > 0 && Math.abs(y1 - y0) > 40) falha(`voltar não restaurou a posição (${y0} → ${y1})`)
    if (falhas.length === antes) ok('filtro no endereço, voltar devolve filtro e posição')
    await ctx.close()
  }

  console.log('\n7 · Minha rota (painel do Sweet Lover)')
  {
    const { ctx, page, erros } = await contexto(nav)
    const antes = falhas.length
    const CHAVE = 'scw:edicao:2026.2:rota'
    const prog = async () => (await page.locator('.ct-progresso__texto').innerText()).replace(/\s+/g, ' ').trim()
    await ir(page, '/cartoon/participantes/demo-casa-aurora')
    await page.waitForSelector('.ct-unidade')
    const quero = page.locator('.ct-unidade').first().locator('button:has-text("Quero ir")')
    await quero.click()
    await page.waitForSelector('.ct-topo__nav .ct-contador')
    if ((await page.locator('.ct-topo__nav .ct-contador').textContent()) !== '1') falha('contador da rota não foi a 1')
    if ((await quero.getAttribute('aria-pressed')) !== 'true') falha('"Quero ir" não ficou marcado (aria-pressed)')
    if ((await quero.innerText()).trim() !== 'Quero ir') falha('"Quero ir" trocou de nome ao marcar (o estado é o aria-pressed)')
    await ir(page, '/cartoon/minha-rota')
    await page.reload({ waitUntil: 'networkidle' })
    if ((await page.locator('.ct-parada').count()) !== 1) falha('rota não persistiu no recarregar')
    if (!(await page.locator('.ct-canal--rota h1').count())) falha('Minha rota: h1 fora do topo no canal Rota')
    if ((await page.locator('.ct-parada .ct-placa .ct-placa__numero').innerText()).trim() !== '1') falha('parada sem a placa numerada')
    if (!(await page.locator('a:has-text("Abrir a rota no Google Maps")').count())) falha('sem link de rota externa')
    if ((await page.locator('.ct-rota').innerText()).match(/melhor caminho|otimizad/i)) falha('rota promete otimização')
    // Demonstração: 3 casas com unidade.
    if ((await prog()) !== '0 de 3 casas marcadas por você') falha(`progresso inicial "${await prog()}"`)
    await page.click('.ct-parada button:has-text("Já fui")')
    if ((await page.locator('.ct-parada').count()) !== 0) falha('"já fui" não tirou a parada de "Quero ir"')
    if ((await page.locator('.ct-visitada').allInnerTexts()).join('|').indexOf('[DEMO] Casa Aurora') < 0) falha('casa visitada não aparece em "Já fui"')
    if ((await prog()) !== '1 de 3 casas marcadas por você' || (await page.locator('progress.ct-progresso__barra').getAttribute('value')) !== '1') falha(`progresso depois do "já fui": "${await prog()}"`)
    await page.reload({ waitUntil: 'networkidle' })
    if ((await prog()) !== '1 de 3 casas marcadas por você') falha('"já fui" não persistiu no recarregar')
    const salvo = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), CHAVE)
    if (salvo?.versao !== 2 || !salvo.visitadas?.includes('udemo1') || !salvo.visitadas?.includes('udemo2')) falha(`storage do painel: ${JSON.stringify(salvo)}`)
    await page.click('.ct-visitada button:has-text("Já fui")')
    if ((await page.locator('.ct-parada').count()) !== 1 || (await prog()) !== '0 de 3 casas marcadas por você') falha('desfazer o "já fui" não devolveu a parada')
    await page.click('.ct-parada button:has-text("Remover")')
    if ((await page.locator('.ct-parada').count()) !== 0) falha('remover não tirou a parada')
    // Rota antiga (versão 1, só unidades): lida como está; unidade despublicada sinalizada.
    await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ versao: 1, unidades: ['udemo3', 'u000000'] })), CHAVE)
    await page.reload({ waitUntil: 'networkidle' })
    if ((await page.locator('.ct-parada').count()) !== 2) falha('rota versão 1 não foi lida')
    if (!(await page.locator('.ct-parada--saiu').count())) falha('unidade despublicada sumiu calada da rota')
    // Storage quebrado: a página abre vazia, sem erro.
    await page.evaluate((k) => localStorage.setItem(k, '{quebrado'), CHAVE)
    await page.reload({ waitUntil: 'networkidle' })
    if ((await page.locator('.ct-parada').count()) !== 0 || !(await page.locator('.ct-rota').innerText()).includes('Sua lista está vazia')) falha('storage quebrado não abriu a lista vazia')
    if (erros.length) falha(`Minha rota: console ${erros.slice(0, 2).join(' | ')}`)
    if (falhas.length === antes) ok('quero ir, contador, persistir, placa numerada, progresso, já fui (e desfazer), remover, rota v1, saiu da edição, storage quebrado')
    await ctx.close()
  }

  console.log('\n8 · avaliação')
  {
    const antes = falhas.length
    let c = await contexto(nav)
    await ir(c.page, '/cartoon/avaliar')
    if (await c.page.locator('form.ct-form').count()) falha('formulário aberto com a avaliação fechada')
    // Avaliar + Premiação são uma página só (Sweet Awards, lista 13 N1): o h1 é o do topo no canal Gala.
    if (!(await c.page.locator('.ct-canal--gala h1').count())) falha('Sweet Awards: h1 fora do topo no canal Gala')
    if (!(await c.page.locator('.ct-conteudo').innerText()).includes('A avaliação abre em 5 de novembro.')) falha('Avaliar fechada sem "abre em 5 de novembro"')
    if ((await c.page.locator('.ct-passos li').count()) !== 3) falha('Avaliar sem os três passos')
    await c.ctx.close()
    const aberta = { ...clone(DEMO_EDICAO), avaliacao: { aberta: true, abre_em: null, fecha_em: null } }
    for (const envio of ['erro', 'ok']) {
      c = await contexto(nav, { edicao: aberta, envio })
      await ir(c.page, '/cartoon/avaliar?participante=demo-casa-aurora')
      await c.page.waitForSelector('form.ct-form')
      // Passo 1: a casa veio da ficha, mas tem duas unidades — o formulário começa na escolha da unidade.
      if (!(await c.page.locator('.ct-form__casa:has(input:checked)', { hasText: 'Aurora' }).count())) falha('formulário sem a casa da ficha marcada')
      await c.page.selectOption('.ct-form select', 'udemo1')
      await c.page.click('.ct-form__navegar button:has-text("Continuar")')
      // Passo 2: as notas, com a pergunta de cada critério.
      await c.page.click('.ct-nota-campo:has-text("doce") .ct-escala__op:has-text("9")')
      await c.page.click('.ct-nota-campo:has-text("bebida") .ct-escala__op:has-text("8")')
      await c.page.click('.ct-form__navegar button:has-text("Continuar")')
      // Passo 3: os dados. O Enviar espera o Turnstile (aqui o script vem vazio: libera na hora).
      await c.page.fill('input[autocomplete="name"]', 'Pessoa Teste')
      await c.page.fill('input[type="email"]', 'pessoa@teste.com')
      await c.page.waitForTimeout(3100)
      await c.page.click('button[type="submit"]')
      if (envio === 'erro') {
        await c.page.waitForSelector('.ct-form [role="alert"]')
        if (await c.page.locator('.ct-form__ok').count()) falha('sucesso mostrado com erro do servidor')
        await c.page.click('.ct-form__navegar button:has-text("Voltar")')
        if (!(await c.page.locator('.ct-nota-campo:has-text("doce") input:checked').count())) falha('erro apagou as notas')
      } else {
        await c.page.waitForSelector('.ct-form__ok:has-text("Avaliação registrada")', { timeout: 5000 }).catch(() => falha('sucesso não apareceu com resposta ok'))
      }
      await c.ctx.close()
    }
    if (falhas.length === antes) ok('fechada sem formulário; erro preserva notas e não finge sucesso; ok confirma')
  }

  console.log('\n9 · casca e larguras')
  for (const [w, h] of [[360, 800], [1440, 900]]) {
    const { ctx, page } = await contexto(nav, { w, h })
    for (const p of ['/cartoon', '/cartoon/participantes', '/cartoon/participantes/demo-casa-aurora', '/cartoon/mapa', '/cartoon/minha-rota', '/cartoon/avaliar', '/cartoon/premiacao']) {
      await ir(page, p)
      await page.waitForTimeout(300)
      const m = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        inst: !!document.querySelector('.scw-header, .scw-footer'),
        // Contraste medido do texto de cada botão contra o próprio fundo (§10.1: herança de cor).
        contraste: [...document.querySelectorAll('.ct-edicao .ct-botao, .ct-edicao .ct-chip, .ct-edicao .ct-aba')].filter((e) => e.offsetParent).map((e) => {
          const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number)
          const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
            .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
          let el = e; let fundo = getComputedStyle(el).backgroundColor
          while (el && /rgba\(0, 0, 0, 0\)|transparent/.test(fundo)) { el = el.parentElement; fundo = el ? getComputedStyle(el).backgroundColor : 'rgb(253, 242, 223)' }
          const { color, fontSize, fontWeight } = getComputedStyle(e)
          const [a1, a2] = [lum(rgb(color)), lum(rgb(fundo))]
          // Texto grande (≥ 24px, ou ≥ 18,66px em peso ≥ 700) pede 3:1 — regra de contraste da spec e WCAG 1.4.3.
          const px = parseFloat(fontSize)
          const minimo = px >= 24 || (px >= 18.66 && Number(fontWeight) >= 700) ? 3 : 4.5
          return { t: e.textContent.trim().slice(0, 24), r: (Math.max(a1, a2) + 0.05) / (Math.min(a1, a2) + 0.05), minimo }
        }).filter((x) => x.r < x.minimo),
        alvos: [...document.querySelectorAll('.ct-edicao a, .ct-edicao button, .ct-edicao summary')]
          // Dentro da área do mapa, só os NOSSOS marcadores contam: zoom, atribuição, termos e atalhos de teclado são
          // do provedor (Google desenha os dele; os controles vão a 44 px por controlSize em MapaGoogle; os do MapLibre
          // por CSS em 05-mapa-rota.css). Sem texto, o alvo aparece como <tag class="…"> para dar para achar.
          .filter((e) => e.offsetParent && !(e.closest('.ct-mapa__mapa') && !e.classList.contains('ct-marcador')) && e.getBoundingClientRect().height < 44)
          .map((e) => e.textContent.trim().slice(0, 30) || `<${e.tagName.toLowerCase()} class="${e.className}">`),
      }))
      if (m.overflow > 1) falha(`@${w} ${p}: rolagem horizontal (${m.overflow}px)`)
      if (m.inst) falha(`@${w} ${p}: casca institucional dentro da edição`)
      if (m.alvos.length) falha(`@${w} ${p}: alvos < 44px: ${m.alvos.slice(0, 4).join(' | ')}`)
      if (m.contraste.length) falha(`@${w} ${p}: contraste abaixo do mínimo: ${m.contraste.map((x) => `${x.t} ${x.r.toFixed(2)} (mín. ${x.minimo})`).join(' | ')}`)
    }
    await ctx.close()
  }
  if (!falhas.some((f) => /^@/.test(f))) ok('360 e 1440: sem rolagem lateral, casca própria, alvos ≥ 44px, botões com contraste ≥ 4,5:1 (3:1 em texto grande)')

  // Casca nova (§10.6): cabeçalho creme com selo; celular com "Menu" (folha que fecha por Esc, véu e link, foco
  // preso e devolvido ao botão) e quatro abas; desktop com a navegação e o cabeçalho preso; rodapé com F2, sem barras de sinal.
  {
    const antes = falhas.length
    const { ctx, page } = await contexto(nav, { w: 360, h: 800 })
    await ir(page, '/cartoon/participantes')
    const topo = await page.evaluate(() => {
      const t = document.querySelector('.ct-topo')
      const v = (s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none' }
      return { fundo: getComputedStyle(t).backgroundColor, selo: !!t.querySelector('.ct-topo__marca img[src*="selo-cartoon"]'), nav: v('.ct-topo__nav'), menu: v('.ct-topo__menu') }
    })
    if (topo.fundo !== 'rgb(253, 240, 222)') falha(`@360 cabeçalho não é creme (${topo.fundo})`)
    if (!topo.selo) falha('@360 cabeçalho sem o selo da edição')
    if (topo.nav || !topo.menu) falha('@360 celular deveria mostrar só o botão Menu')
    const abas = await page.locator('.ct-abas .ct-aba').allInnerTexts()
    if (abas.map((t) => t.trim()).join(' · ') !== 'Início · Casas · Mapa · Avaliar') falha(`@360 abas: ${abas.join(' · ')}`)
    if ((await page.locator('.ct-abas .ct-aba img.ct-icone').count()) !== 4) falha('@360 abas sem o ícone da edição')
    if ((await page.locator('.ct-abas .ct-aba[aria-current="page"]').innerText()).trim() !== 'Casas') falha('@360 aba ativa não é Casas')

    const aberto = () => page.evaluate(() => document.getElementById('ct-menu').open)
    const focoNoBotao = () => page.evaluate(() => document.activeElement?.classList.contains('ct-topo__menu'))
    // 1 · Esc fecha; o Tab dá a volta dentro da folha; o foco volta ao botão.
    await page.click('.ct-topo__menu')
    if (!(await aberto())) falha('menu do celular não abriu')
    if ((await page.locator('.ct-topo__menu').getAttribute('aria-expanded')) !== 'true') falha('botão Menu sem aria-expanded=true aberto')
    const fora = []
    // 12 Tab e 12 Shift+Tab: a folha tem 9 controles, então o foco dá a volta nos dois sentidos.
    for (let i = 0; i < 24; i++) {
      await page.keyboard.press(i < 12 ? 'Tab' : 'Shift+Tab')
      if (!(await page.evaluate(() => !!document.activeElement?.closest('#ct-menu')))) fora.push(i)
    }
    if (fora.length) falha(`foco saiu da folha no Tab (${fora.join(', ')})`)
    await page.keyboard.press('Escape')
    if (await aberto()) falha('Esc não fechou o menu')
    if (!(await focoNoBotao())) falha('Esc: o foco não voltou ao botão Menu')
    // 2 · Véu: clique fora da folha (acima dela).
    await page.click('.ct-topo__menu')
    await page.mouse.click(180, 30)
    if (await aberto()) falha('clique no véu não fechou o menu')
    if (!(await focoNoBotao())) falha('véu: o foco não voltou ao botão Menu')
    // 3 · Link: navega e fecha.
    await page.click('.ct-topo__menu')
    await page.click('#ct-menu a:has-text("Mapa")')
    await page.waitForFunction(() => location.pathname === '/cartoon/mapa')
    if (await aberto()) falha('link da folha não fechou o menu')
    if (!(await focoNoBotao())) falha('link: o foco não voltou ao botão Menu')
    await ctx.close()

    // Depois dos resultados, a aba do Sweet Awards vira Prêmios.
    const c = await contexto(nav, { w: 360, h: 800, edicao: { ...clone(DEMO_EDICAO), resultados_publicos: true } })
    await ir(c.page, '/cartoon/participantes')
    const abasDepois = (await c.page.locator('.ct-abas .ct-aba').allInnerTexts()).map((t) => t.trim()).join(' · ')
    if (abasDepois !== 'Início · Casas · Mapa · Prêmios') falha(`com resultados, abas: ${abasDepois}`)
    await c.ctx.close()

    const d = await contexto(nav, { w: 1440, h: 900 })
    await ir(d.page, '/cartoon/participantes')
    const m = await d.page.evaluate(() => {
      const v = (s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none' }
      return {
        posicao: getComputedStyle(document.querySelector('.ct-topo')).position, nav: v('.ct-topo__nav'), menu: v('.ct-topo__menu'), abas: v('.ct-abas'),
        marcaX: Math.round(document.querySelector('.ct-topo__marca').getBoundingClientRect().left),
        rodape: { barras: !!document.querySelector('.ct-barras'), f2: !!document.querySelector('.ct-marcas img[alt="F2 Experience"]'),
          cookies: [...document.querySelectorAll('.ct-rodape button')].some((b) => b.textContent.includes('Preferências de cookies')),
          legais: document.querySelectorAll('.ct-rodape a[href="/privacidade"], .ct-rodape a[href="/termos"]').length },
      }
    })
    if (m.posicao !== 'sticky' || !m.nav || m.menu || m.abas) falha(`@1440 cabeçalho: ${JSON.stringify(m)}`)
    if (m.marcaX > 120) falha(`@1440 selo não está à esquerda (x=${m.marcaX})`)
    if (m.rodape.barras || !m.rodape.f2 || !m.rodape.cookies || m.rodape.legais !== 2) falha(`rodapé incompleto: ${JSON.stringify(m.rodape)}`)
    await d.ctx.close()
    if (falhas.length === antes) ok('casca: cabeçalho creme com selo, menu do celular (Esc, véu, link; foco preso e devolvido), 4 abas (Avaliar → Prêmios), rodapé com F2 e cookies, sem barras de sinal (MANUAL-CARTOON 1.0)')
  }

  console.log('\n10 · Entrada')
  {
    const antes = falhas.length
    const { ctx, page, erros } = await contexto(nav, { w: 1440, h: 900 })
    await ir(page, '/cartoon')
    await page.waitForSelector('.ct-laminas')
    const e = await page.evaluate(() => {
      const txt = (s) => document.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() || ''
      return {
        canal: !!document.querySelector('.ct-canal--estreia h1'),
        mesa: !!document.querySelector('.ct-estreia__cena img.ct-gibi[src*="gibi/mesa"]'),
        acao: getComputedStyle(document.querySelector('.ct-estreia .ct-botao')).backgroundColor,
        olhos: document.querySelectorAll('.ct-estreia .ct-olhinhos').length,
        como: txt('#ct-como'),
        passos: [...document.querySelectorAll('.ct-passos li')].map((li) => [li.querySelector('img.ct-gibi')?.getAttribute('src')?.match(/objetos\/(.+)\.webp/)?.[1], li.querySelector('h3')?.textContent.trim()]),
        // Vitrine (03/11): ordem sorteada por dia, então a conferência é do CONJUNTO; casa sem foto leva à página dela.
        vitrine: [...document.querySelectorAll('.ct-lamina__link')].map((a) => a.getAttribute('href').split('?')[0]).sort(),
        fatos: [...document.querySelectorAll('.ct-estreia__fatos li')].map((li) => li.textContent.trim()),
        bairros: [...document.querySelectorAll('.ct-bairro')].map((a) => `${a.firstChild.textContent}:${a.querySelector('.ct-bairro__n').textContent}`),
        avalie: txt('.ct-entrada__avalie .ct-palco__texto'),
        avaliar: !!document.querySelector('.ct-entrada__avalie a[href^="/cartoon/avaliar"]'),
        duvidas: document.querySelectorAll('.ct-duvidas details').length,
        chao: !!document.querySelector('.ct-onde img.ct-onde__chao[src*="natal"]'),
      }
    })
    if (!e.canal) falha('Entrada: h1 fora do topo no canal Estreia')
    if (!e.mesa) falha('Entrada: topo sem a mesa do combo desenhada')
    if (e.acao !== 'rgb(237, 28, 32)') falha(`Entrada: botão sobre amarelo não é o de ação (${e.acao})`)
    // Repaginação de 04/11: os olhinhos espiam de trás da mesa, como na arte final do carrossel (um par só).
    if (e.olhos !== 1) falha(`Entrada: ${e.olhos} par(es) de olhinhos no topo (espera 1, espiando da mesa)`)
    if (e.como !== 'Como funciona') falha(`Entrada: título "${e.como}"`)
    if (JSON.stringify(e.passos) !== JSON.stringify([['loja', 'Escolha a casa'], ['bandeja', 'Prove o combo'], ['prancheta', 'Avalie']])) falha(`Entrada: passos ${JSON.stringify(e.passos)}`)
    if (JSON.stringify(e.vitrine) !== JSON.stringify(DEMO_EDICAO.participantes.map((p) => `/cartoon/${p.combo?.fotos?.principal ? 'combos' : 'participantes'}/${p.slug}`).sort())) falha(`Entrada: vitrine ${JSON.stringify(e.vitrine)}`)
    if (JSON.stringify(e.fatos) !== JSON.stringify(['5 a 15 de novembro', 'Combo R$ 38,90', '3 casas'])) falha(`Entrada: fatos do topo ${JSON.stringify(e.fatos)}`)
    if (JSON.stringify(e.bairros) !== JSON.stringify(['Tirol:2', 'Lagoa Nova:1', 'Ponta Negra:1'])) falha(`Entrada: bairros ${JSON.stringify(e.bairros)}`)
    if (!e.chao) falha('Entrada: Onde ficam sem a faixa de Natal')
    if (e.avalie !== 'A avaliação abre em 5 de novembro.' || !e.avaliar) falha(`Entrada: Avalie "${e.avalie}"`)
    if (e.duvidas !== 4) falha(`Entrada: ${e.duvidas} dúvidas`)
    // O bairro leva ao Mapa já filtrado.
    await page.click('.ct-bairro:has-text("Tirol")')
    await page.waitForFunction(() => location.pathname === '/cartoon/mapa')
    if (new URLSearchParams(new URL(page.url()).search).get('bairro') !== 'Tirol') falha(`Entrada: bairro levou a ${page.url()}`)
    if (erros.length) falha(`Entrada: console ${erros.slice(0, 2).join(' | ')}`)
    await ctx.close()

    // Estados: elenco fechado, falha de rede e edição encerrada.
    let c = await contexto(nav, { edicao: { ...clone(DEMO_EDICAO), participantes_publicos: false, combos_publicos: false, participantes: [] } })
    await ir(c.page, '/cartoon')
    const fechado = await c.page.locator('.ct-conteudo').innerText()
    if (!fechado.includes('será revelado em breve')) falha('Entrada sem elenco não diz "em breve"')
    if (await c.page.locator('.ct-estreia__casas, .ct-laminas, .ct-onde').count()) falha('Entrada sem elenco mostrou placa de casas, vitrine ou bairros')
    if ((await c.page.locator('.ct-estreia__fatos .ct-fita').textContent())?.trim() !== '5 a 15 de novembro') falha('Entrada sem elenco perdeu a fita do período')
    await c.ctx.close()
    c = await contexto(nav, { edicao: 'falha' })
    await ir(c.page, '/cartoon')
    await c.page.waitForSelector('.ct-entrada__elenco [role="alert"]')
    if (!(await c.page.locator('.ct-entrada__elenco button:has-text("Tentar de novo")').count())) falha('Entrada com falha sem "Tentar de novo"')
    if ((await c.page.locator('h1').count()) !== 1) falha('Entrada com falha sem o <h1> do topo')
    await c.ctx.close()
    c = await contexto(nav, { edicao: { ...clone(DEMO_EDICAO), fase: 'encerrada' } })
    await ir(c.page, '/cartoon')
    await c.page.waitForSelector('.ct-laminas')
    const enc = await c.page.locator('.ct-conteudo').innerText()
    if (!enc.includes('terminou') || await c.page.locator('.ct-entrada__como, .ct-onde').count()) falha('Entrada encerrada: sem aviso, ou ainda com Como funciona/Onde ficam')
    if (!enc.includes('A avaliação desta edição foi encerrada.')) falha('Entrada encerrada: Avalie sem o texto de encerrada')
    await c.ctx.close()
    if (falhas.length === antes) ok('Entrada: topo Estreia (mesa do combo, olhinhos espiando, fatos na fita e no preço, ação vermelha), vitrine de combos, como funciona, bairros → Mapa filtrado, Avalie, Dúvidas; sem elenco, falha e encerrada')
  }

  console.log('\n11 · Mapa')
  {
    const antes = falhas.length
    // Uma coordenada aproximada (como as do retrato: Nominatim por rua, "a conferir") na Bico de Pena.
    const ed = clone(DEMO_EDICAO)
    ed.participantes[1].unidades[0].coordenada = { lat: -5.876, lng: -35.178, conferir: true, precisao: 'rua' }
    // Estilo mínimo no lugar dos tiles: o MapLibre sobe e os marcadores aparecem (rota registrada depois vence).
    const estilo = { version: 8, sources: {}, layers: [{ id: 'fundo', type: 'background', paint: { 'background-color': '#FDF0DE' } }] }
    let c = await contexto(nav, { edicao: ed })
    await c.ctx.route('**/tiles.openfreemap.org/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(estilo) }))
    // Página única (14 §14.13): as três vistas (ilustrado, real e lista); com a arte final aprovada o ilustrado entra também fora do DEV.
    await ir(c.page, '/cartoon/mapa?vista=lista')
    await c.page.waitForSelector('.ct-mapa__item')
    const vistas = (await c.page.locator('.ct-mapa__vistas .ct-chip').allInnerTexts()).map((t) => t.trim()).join(' · ')
    if (vistas !== 'Mapa Ilustrado · Mapa real · Lista') falha(`vistas fora do DEV: ${vistas}`)
    const item = (id) => c.page.locator(`#mapa-${id}`)
    if (!(await c.page.locator('.ct-canal--rota h1').count())) falha('Mapa: h1 fora do topo no canal Rota')
    if ((await c.page.locator('.ct-mapa__item').count()) !== 4) falha(`Mapa: ${await c.page.locator('.ct-mapa__item').count()} linhas (uma por unidade = 4)`)
    if (!(await item('udemo4').innerText()).includes('Localização no mapa em conferência.')) falha('unidade sem coordenada sem "em conferência"')
    if (!(await item('udemo3').innerText()).includes('Ponto aproximado no mapa')) falha('coordenada aproximada não dita na lista')
    if ((await item('udemo1').innerText()).includes('aproximado')) falha('coordenada conferida dita como aproximada')
    // Quero ir e já fui na linha; depois o mapa real mostra o estado nos marcadores.
    await item('udemo3').locator('button:has-text("Quero ir")').click()
    await item('udemo1').locator('button:has-text("Já fui")').click()
    if ((await item('udemo2').locator('button:has-text("Já fui")').getAttribute('aria-pressed')) !== 'true') falha('"já fui" não marcou a casa inteira (as duas unidades)')
    await c.page.click('.ct-mapa__vistas button:has-text("Mapa real")')
    await c.page.waitForSelector('.ct-marcador', { timeout: 8000 }).catch(() => {})
    const marcadores = await c.page.evaluate(() => [...document.querySelectorAll('button.ct-marcador')].map((b) => ({ nome: b.getAttribute('aria-label'), aprox: b.classList.contains('ct-marcador--aprox'), alto: b.getBoundingClientRect().height })))
    if (marcadores.length !== 2) falha(`Mapa: ${marcadores.length} marcadores (as 2 unidades com coordenada)`)
    const aprox = marcadores.find((m) => m.aprox)
    if (!aprox || !/ponto aproximado/.test(aprox.nome) || marcadores.filter((m) => m.aprox).length !== 1) falha(`marcador aproximado: ${JSON.stringify(marcadores)}`)
    if (marcadores.some((m) => m.alto < 44)) falha('marcador com alvo < 44px')
    if (!(await c.page.locator('button.ct-marcador--quero').count()) || (await c.page.locator('button.ct-marcador--foi').count()) !== 1) falha('marcadores sem o estado de "quero ir"/"já fui"')
    // Os filtros mostram só o que o visitante marcou. Eles moram na folha "Filtros" (redesign de 06/11/2026): abre, marca, fecha.
    const filtrar = async (c2, nome) => { await c2.page.click('.ct-mapa__filtros-botao'); await c2.page.click(`.ct-mapa__filtros button:has-text("${nome}")`); await c2.page.keyboard.press('Escape') }
    await c.page.click('.ct-mapa__vistas button:has-text("Lista")')
    await filtrar(c, 'Quero ir')
    if (JSON.stringify(await c.page.locator('.ct-mapa__item').evaluateAll((l) => l.map((x) => x.id))) !== '["mapa-udemo3"]') falha('filtro "Quero ir"')
    await filtrar(c, 'Quero ir')
    await filtrar(c, 'Já fui')
    if ((await c.page.locator('.ct-mapa__item').count()) !== 2) falha('filtro "Já fui" (as duas unidades da casa)')
    // "Perto de mim" sem permissão: mensagem honesta, a lista segue.
    await c.page.click('.ct-mapa__filtros-botao')
    await c.page.click('button:has-text("Perto de mim")')
    await c.page.waitForSelector('text=Sem acesso à sua localização', { timeout: 12000 }).catch(() => falha('recusa da localização sem mensagem'))
    await c.ctx.close()
    // ?bairro= (contrato da Entrada): só as unidades daquele bairro, e o seletor mostra o bairro.
    c = await contexto(nav)
    await ir(c.page, '/cartoon/mapa?bairro=Tirol&vista=lista')
    await c.page.waitForSelector('.ct-mapa__item')
    if (JSON.stringify(await c.page.locator('.ct-mapa__item').evaluateAll((l) => l.map((x) => x.id).sort())) !== '["mapa-udemo1","mapa-udemo4"]') falha('?bairro=Tirol não filtrou as unidades')
    await c.page.click('.ct-mapa__filtros-botao')
    if ((await c.page.locator('.ct-mapa__filtros select').inputValue()) !== 'Tirol') falha('seletor de bairro não mostra Tirol')
    if (!/1 filtro ativo/.test(await c.page.locator('.ct-mapa__filtros-botao').getAttribute('aria-label'))) falha('?bairro=Tirol: o botão "Filtros" não conta o filtro ativo')
    await c.ctx.close()
    // Com a posição: ordena pela distância em linha reta.
    c = await contexto(nav, { opcoes: { permissions: ['geolocation'], geolocation: { latitude: -5.876, longitude: -35.178 } } })
    await ir(c.page, '/cartoon/mapa?vista=lista')
    await c.page.click('.ct-mapa__filtros-botao')
    await c.page.click('button:has-text("Perto de mim")')
    await c.page.waitForSelector('text=Ordenado pela distância em linha reta', { timeout: 12000 }).catch(() => falha('posição concedida sem ordenar'))
    await c.page.keyboard.press('Escape')
    if (!(await c.page.locator('.ct-mapa__item').first().innerText()).includes('em linha reta')) falha('distância sem "em linha reta"')
    await c.ctx.close()
    if (falhas.length === antes) ok('Mapa: canal Rota, linha por unidade, "em conferência", aproximada na lista e no marcador, quero ir/já fui, ?bairro=, perto de mim (recusa e posição)')
  }

  console.log('\n12 · Premiação')
  {
    const antes = falhas.length
    let c = await contexto(nav)
    await ir(c.page, '/cartoon/premiacao')
    if (!(await c.page.locator('.ct-canal--gala h1').count())) falha('Premiação: h1 fora do topo no canal Gala')
    if (!(await c.page.locator('.ct-gala__palco img[src*="trofeu-dourado"]').count())) falha('Premiação sem o troféu em desenho')
    // textContent: a data mora numa etiqueta em caixa-alta (CSS), e innerText devolveria o texto já transformado.
    if (!(await c.page.locator('.ct-gala').textContent()).includes('Resultados depois de 15/11.')) falha('Premiação sem "resultados depois de 15/11"')
    await c.ctx.close()
    const resultados = [
      { trilha: 'sweet_lovers', categoria: '[DEMO] Categoria A', colocacao: 1, nome: '[DEMO] Casa Aurora', slug: 'demo-casa-aurora' },
      { trilha: 'juri_tecnico', categoria: '[DEMO] Categoria B', colocacao: 1, nome: '[DEMO] Casa Bico de Pena', slug: 'demo-casa-bico-de-pena' },
      { trilha: 'juri_tecnico', categoria: '[DEMO] Categoria B', colocacao: 3, nome: '[DEMO] Casa Aurora', slug: 'demo-casa-aurora' },
    ]
    c = await contexto(nav, { edicao: { ...clone(DEMO_EDICAO), resultados_publicos: true }, resultados })
    await ir(c.page, '/cartoon/premiacao')
    await c.page.waitForSelector('.ct-podio')
    const podios = await c.page.locator('.ct-podio').evaluateAll((l) => l.map((a) => [a.querySelector('.ct-podio__cat').textContent, [...a.querySelectorAll('.ct-podio__lugar')].map((x) => x.textContent).join(',')]))
    if (JSON.stringify(podios) !== JSON.stringify([['[DEMO] Categoria A', '1º lugar'], ['[DEMO] Categoria B', '1º lugar,3º lugar']])) falha(`pódio inventou colocação: ${JSON.stringify(podios)}`)
    if ((await c.page.locator('.ct-gala').textContent()).includes('Resultados depois de')) falha('com resultados, ainda diz "resultados depois de"')
    if ((await c.page.locator('h1').count()) !== 1) falha('Premiação com resultados: mais de um <h1>')
    await c.ctx.close()
    if (falhas.length === antes) ok('Premiação: canal Gala com o troféu e "depois de 15/11"; pódio só com as colocações registradas')
  }
} finally {
  if (nav) await nav.close()
  killTree(preview.pid)
}

console.log(falhas.length ? `\n✗ ${falhas.length} falha(s)` : '\n✓ cartoon ok')
process.exit(falhas.length ? 1 : 0)
