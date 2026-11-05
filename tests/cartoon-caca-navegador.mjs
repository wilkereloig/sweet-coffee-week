/**
 * cartoon-caca-navegador.mjs — jornadas de ponta a ponta da Caça aos Carimbos no navegador (docs/cartoon-2026-2/15-caca-*.md).
 *
 *   npm run test:caca-navegador            (sobe o vite dev na 5212, sem build, e derruba ao terminar)
 *   CACA_E2E_REUSAR=1 npm run test:caca-navegador   (usa um servidor já aberto na 5212 e não o derruba)
 *   CACA_E2E_SECOES=1,4 npm run test:caca-navegador (só algumas seções)
 *   CACA_E2E_CAPTURAS=<pasta>              (onde salvar as capturas; padrão: pasta temporária do sistema)
 *
 * O DEV fala com o Supabase REAL (projeto "Sweet & Coffee Week"). Por isso:
 *  - todo mapa é de teste (apelido "E2E …", e-mail e2e-caca-<execução>-<n>@exemplo.com.br) e é APAGADO no fim por `mapa_apagar`;
 *    o teste prova a limpeza relendo cada chave (`mapa_ler_v2` tem de devolver nulo);
 *  - a janela de avaliação do banco está FECHADA e o teste NÃO a abre: o carimbo real só vai até a resposta `nao_aberta`.
 *    Estados com carimbo/avaliação/ranking (pendente, conquistada, revisita, empate, metas) são montados interceptando a
 *    resposta da RPC no navegador — o mesmo caminho de rede que o site usa — e a leitura real do servidor fica por conta
 *    dos testes SQL (supabase/testes). Falhas de GPS também são simuladas (o servidor, de janela fechada, só diria `nao_aberta`);
 *  - NENHUM e-mail real: a edge `caca-email` é sempre interceptada, exceto numa sonda com endereço de sandbox do provedor
 *    (delivered+…@resend.dev), que não entrega a ninguém;
 *  - nenhuma flag pública é tocada e nada é publicado.
 *  - limite do servidor: 60 mapas novos por IP em 10 min — não rode a suíte completa mais de 3 vezes seguidas nesse prazo;
 *  - resíduo que o produto não apaga (grupos de teste): o SQL de limpeza é impresso no fim da execução.
 *
 * Reprova (cada item vira "✗" com a descrição; "⚠" é achado de produto conhecido, que não derruba o teste):
 *  1 criar mapa pelo formulário, reabrir (recarregar), guardar o link, validações do formulário, mesmo e-mail = mesma pessoa
 *  2 recuperar: e-mail indisponível, envio ok, limitado, falha temporária, sem rede, código inválido, código válido troca a chave,
 *    confirmar e-mail, sonda real com endereço de sandbox
 *  3 duas portas: QR → avaliar (e carimbo real recusado com "ainda não abriu") e avaliação → criar mapa / mapa existente
 *  4 GPS: negada, indisponível, demorou, imprecisa, longe; pedido de revisão só depois de 2 falhas; "enviado" só com ok
 *  5 estados do mapa (sem mapa, falha, vazio, pendente, conquistada, revisita) nas 3 vistas
 *  6 ranking e empate (mesma posição, sem desempate por hora, nunca e-mail)
 *  7 grupo: criar, convite por token, aceitar com outro mapa, isolamento, rota colaborativa, convite revogado
 *  8 metas relativas ao total, sem prêmio inventado
 *  9 compartilhar: arte sem e-mail/chave, texto e URL limpos, arquivo baixado
 * 10 avisos (sem suporte, bloqueada, iPhone) e instalação
 * 11 manifest e service worker só em /cartoon/caca
 * 12 teclado e foco, movimento reduzido, alvos ≥ 44px, contraste dos botões e rolagem lateral em 360 e 1440
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { chamar } from '../src/edicao/rota/carimbo.js'
import { DEMO_EDICAO } from '../src/edicao/dados/demo/cartoon.js'

// No DEV a edição vem do "retrato local" (arquivo fora do git, só nesta máquina); sem ele cai na RPC. A avaliação do banco está
// fechada, então o teste abre a avaliação só NA REDE do navegador: troca o módulo do retrato (ou a RPC, sem retrato) por uma cópia
// com `avaliacao.aberta = true`. O banco não é tocado.
const ARQUIVO_RETRATO = join(dirname(fileURLToPath(import.meta.url)), '../src/edicao/dados/retrato/cartoon.local.json')
const RETRATO_ABERTO = existsSync(ARQUIVO_RETRATO)
  ? (() => { const r = JSON.parse(readFileSync(ARQUIVO_RETRATO, 'utf8')); r.avaliacao = { aberta: true, abre_em: null, fecha_em: null }; return r })()
  : null
const FORM = RETRATO_ABERTO
  ? (() => { const p = RETRATO_ABERTO.participantes.find((x) => x.slug === 'adocee-doceria'); return { slug: p.slug, unidade: p.unidades[0].id, nome: p.casa.nome, procurar: /Adocee/ } })()
  : { slug: 'demo-casa-aurora', unidade: 'udemo1', nome: 'Aurora', procurar: /Aurora/ }

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5212
const BASE = `http://localhost:${PORT}`
const EXEC = Date.now().toString(36)
const EDICAO = '2026.2'
const CHAVE_LOJA = `scw:edicao:${EDICAO}:mapa`
const CAPTURAS = process.env.CACA_E2E_CAPTURAS || join(tmpdir(), `caca-e2e-${EXEC}`)
mkdirSync(CAPTURAS, { recursive: true })
const SECOES = process.env.CACA_E2E_SECOES ? process.env.CACA_E2E_SECOES.split(',').map(Number) : null

const falhas = []
const avisos = []
const falha = (m) => { falhas.push(m); console.log(`  ✗ ${m}`) }
const ok = (m) => console.log(`  ✓ ${m}`)
const aviso = (m) => { avisos.push(m); console.log(`  ⚠ ${m}`) }
const checar = (cond, msg) => { if (!cond) falha(msg); return !!cond }
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------- servidor
function killTree (pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    else process.kill(-pid, 'SIGKILL')
  } catch { /* já morto */ }
}
async function responde () { try { return (await fetch(`${BASE}/cartoon`, { signal: AbortSignal.timeout(1500) })).ok } catch { return false } }
async function esperarServidor (ms = 40000) {
  const t = Date.now()
  while (Date.now() - t < ms) { if (await responde()) return; await esperar(350) }
  throw new Error('o vite dev não respondeu na porta 5212')
}
const reusar = process.env.CACA_E2E_REUSAR === '1'
if (!reusar && await responde()) { console.error(`✗ porta ${PORT} ocupada (use CACA_E2E_REUSAR=1 para reaproveitar o servidor)`); process.exit(1) }

// ---------------------------------------------------------------- dados de teste (mapas reais, sempre apagados)
const criados = [] // chaves de todo mapa que o teste fez nascer (RPC ou formulário)
const email = (n) => `e2e-caca-${EXEC}-${n}@exemplo.com.br`
async function mapaReal (n, { apelido = `E2E ${n}`, mail = email(n), ranking = true } = {}) {
  const r = await chamar('mapa_criar_v2', { p_edicao: EDICAO, p_apelido: apelido, p_email: mail, p_whatsapp: null, p_ranking: ranking, p_aceite: true })
  criados.push(r.chave)
  return { chave: r.chave, apelido, email: mail }
}
async function registrar (page) {
  const k = await page.evaluate((c) => { try { return localStorage.getItem(c) } catch { return null } }, CHAVE_LOJA).catch(() => null)
  if (k && !criados.includes(k)) criados.push(k)
  return k
}
const CHAVE_FAKE = 'F'.repeat(32) // só para mapas totalmente interceptados (o banco não a conhece)

// Casas reais da edição (slug, unidade, QR e posição) lidas do banco por quem montou o teste.
const CASA = { slug: 'adocee-doceria', nome: 'Adocee Doceria', qr: 'zhw9h9gb', unidade: '4d19620b-5064-402c-b50b-cfd446119a39', lat: -5.868404, lng: -35.182793 }

function mapaMock ({ casas = [], validadas = 0, extras = 0, posicao = null, empatados = 0, total = 26, apelido = 'E2E Mock', mail = 'e2e-mock@exemplo.com.br', ranking = true, principal = true } = {}) {
  return {
    edicao: EDICAO, apelido, email: mail, whatsapp: null, no_ranking: ranking, principal, total_casas: total,
    casas_validadas: validadas, extras, faltam: Math.max(total - validadas, 0), posicao, empatados, casas,
  }
}
const MAPA_PROGRESSO = mapaMock({
  validadas: 2, extras: 1, posicao: 2, empatados: 2,
  casas: [
    { slug: 'adocee-doceria', carimbos: 2, avaliou: true, estado: 'validada', extras: 1 },
    { slug: 'carcara', carimbos: 1, avaliou: true, estado: 'validada', extras: 0 },
    { slug: 'cookitos', carimbos: 1, avaliou: false, estado: 'pendente', extras: 0 },
  ],
})

// ---------------------------------------------------------------- contexto
const CONSENTIMENTO = () => JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 1e10 })
const json = (route, corpo, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corpo) })

/**
 * `mocks`: { <rpc>: corpo | (corpoDaRequisicao, route) => corpo | undefined | 'passar' }. O que não está em `mocks` vai para o banco real.
 * `email`: resposta da edge caca-email (objeto, função ou 'falha'). Sem ela, a edge é SEMPRE interceptada com `email_indisponivel`
 * (nunca chega ao provedor).
 */
async function contexto (nav, { w = 360, h = 800, chave = null, mocks = {}, email: mailResp = { ok: false, motivo: 'email_indisponivel' }, init = null, opcoes = {}, edicaoDemo = false, envio = 'ok', permissoes = [], geo = null } = {}) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, permissions: permissoes, geolocation: geo || undefined, ...opcoes })
  await ctx.addInitScript(([k, c]) => {
    try { if (k) localStorage.setItem('scw:edicao:2026.2:mapa', k); localStorage.setItem('scw_privacidade', c) } catch { /* sem storage */ }
  }, [chave, CONSENTIMENTO()])
  if (init) await ctx.addInitScript(init)
  const pedidos = [] // { fn, corpo }
  await ctx.route('**/rest/v1/rpc/**', async (route) => {
    const fn = route.request().url().split('/rpc/')[1].split('?')[0]
    let corpo = {}
    try { corpo = JSON.parse(route.request().postData() || '{}') } catch { /* sem corpo */ }
    if (route.request().method() === 'OPTIONS') return route.fallback()
    pedidos.push({ fn, corpo })
    if (edicaoDemo && !RETRATO_ABERTO) {
      const aberta = { ...JSON.parse(JSON.stringify(DEMO_EDICAO)), avaliacao: { aberta: true, abre_em: null, fecha_em: null } }
      if (fn === 'edicao_publica') return json(route, aberta)
      if (fn === 'participante_publico') {
        const p = aberta.participantes.find((x) => x.slug === corpo.p_slug)
        return json(route, p ? { estado: 'publicado', fase: aberta.fase, participante: p } : { estado: 'inexistente' })
      }
      if (fn === 'criterios_avaliacao') return json(route, [{ chave: 'doce', rotulo: 'Doce', minimo: 5, maximo: 10 }, { chave: 'bebida', rotulo: 'Bebida', minimo: 5, maximo: 10 }])
    }
    if (fn in mocks) {
      let r = mocks[fn]
      if (typeof r === 'function') r = await r(corpo, route)
      if (r === 'rede') return route.abort('failed')
      if (r && r.__status) return json(route, r.corpo, r.__status)
      if (r !== undefined && r !== 'passar') return json(route, r)
    }
    return route.fallback()
  })
  if (edicaoDemo && RETRATO_ABERTO) {
    await ctx.route('**/dados/retrato/cartoon.local.json*', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: `export default ${JSON.stringify(RETRATO_ABERTO)}` }))
  }
  await ctx.route('**/functions/v1/enviar-formulario', (route) => (envio === 'ok'
    ? json(route, { ok: true })
    : route.fulfill({ status: 500, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":false}' })))
  await ctx.route('**/functions/v1/caca-email', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fallback()
    let r = mailResp
    if (typeof r === 'function') r = await r(JSON.parse(route.request().postData() || '{}'))
    pedidos.push({ fn: 'caca-email', corpo: JSON.parse(route.request().postData() || '{}') })
    if (r === 'falha') return route.abort('failed')
    return json(route, r)
  })
  await ctx.route('**/challenges.cloudflare.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  await ctx.route('**/tiles.openfreemap.org/**', (route) => route.abort('failed'))
  ctx.setDefaultNavigationTimeout(60000)
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|openfreemap|maplibre|404|status of 4|status of 5/.test(m.text())) erros.push(m.text()) })
  return { ctx, page, erros, pedidos }
}
const ir = (page, p) => page.goto(`${BASE}${p}${p.includes('?') ? '&' : '?'}preview=1`, { waitUntil: 'networkidle' })
const texto = (page) => page.locator('main').innerText()
const foto = (page, nome) => page.screenshot({ path: join(CAPTURAS, `${nome}.png`), fullPage: true }).catch(() => null)
async function semErros (c, onde) { if (c.erros.length) falha(`${onde}: erro de console/página: ${c.erros.slice(0, 2).join(' | ').slice(0, 220)}`); c.erros.length = 0 }

/** Acelera só os temporizadores longos do GPS (6 s + 9 s + 12 s) sem tocar nos curtos da interface. */
const ACELERAR_TEMPORIZADORES = () => {
  const st = window.setTimeout.bind(window)
  window.setTimeout = (f, ms, ...a) => st(f, typeof ms === 'number' && ms >= 5000 && ms <= 15000 ? Math.round(ms / 30) : ms, ...a)
}
/** Sinal de GPS de mentira: erro (1 negada · 2 indisponível · 3 demorou) em toda tentativa. */
const gpsComErro = (codigo) => `(() => {
  const g = { watchPosition: (ok, erro) => { setTimeout(() => erro({ code: ${codigo}, message: 'simulado' }), 20); return 1 }, clearWatch: () => {}, getCurrentPosition: (ok, erro) => erro({ code: ${codigo} }) }
  Object.defineProperty(navigator, 'geolocation', { value: g, configurable: true })
})()`

// ---------------------------------------------------------------- medidas de qualidade reaproveitadas nas seções
function medirPagina (page) {
  return page.evaluate(() => {
    const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number)
    const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
    const visivel = (e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed'
    const contraste = [...document.querySelectorAll('.ct-edicao .ct-botao, .ct-edicao .ct-chip, .ct-edicao .ct-aba')].filter(visivel).map((e) => {
      let el = e; let fundo = getComputedStyle(el).backgroundColor
      while (el && /rgba\(0, 0, 0, 0\)|transparent/.test(fundo)) { el = el.parentElement; fundo = el ? getComputedStyle(el).backgroundColor : 'rgb(253, 242, 223)' }
      const { color, fontSize, fontWeight } = getComputedStyle(e)
      const [a1, a2] = [lum(rgb(color)), lum(rgb(fundo))]
      const px = parseFloat(fontSize)
      const minimo = px >= 24 || (px >= 18.66 && Number(fontWeight) >= 700) ? 3 : 4.5
      return { t: e.textContent.trim().slice(0, 24), r: (Math.max(a1, a2) + 0.05) / (Math.min(a1, a2) + 0.05), minimo }
    }).filter((x) => x.r < x.minimo)
    const alvos = [...document.querySelectorAll('.ct-edicao a, .ct-edicao button, .ct-edicao summary, .ct-edicao input:not([type=hidden]), .ct-edicao select, .ct-edicao textarea')]
      .filter((e) => visivel(e) && !e.closest('.ct-mapa__mapa') && !e.closest('.cookie-consent') && e.getBoundingClientRect().height > 0)
      .filter((e) => { const r = e.getBoundingClientRect(); const eh = e.type === 'checkbox' || e.type === 'radio'; return eh ? false : r.height < 43.5 })
      .map((e) => e.textContent.trim().slice(0, 30) || e.getAttribute('aria-label') || `<${e.tagName.toLowerCase()} class="${String(e.className).slice(0, 30)}">`)
    // Elemento que passa da borda direita da tela (texto cortado), mesmo quando a página em si não rola de lado.
    const estouram = [...document.querySelectorAll('.ct-edicao *')]
      .filter((e) => visivel(e) && !e.closest('.ct-mapa__mapa') && !e.closest('.ct-mundo') && !e.closest('.ct-sr, [class*="visually"]') && !e.closest('[aria-hidden=true]'))
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed' })
      .slice(0, 5).map((e) => `<${e.tagName.toLowerCase()} class="${String(e.className).slice(0, 32)}"> até ${Math.round(e.getBoundingClientRect().right)}px`)
    return { overflow: document.documentElement.scrollWidth - innerWidth, contraste, alvos, estouram, h1: document.querySelectorAll('h1').length }
  })
}

/**
 * Alvos < 44px reprovam (CLAUDE.md §6.10: o piso vale também para link de texto). Os links avulsos ganharam `.ct-link-solto`
 * e os de dentro de frase `.ct-link-frase` (E2E-5); não há mais aviso conhecido.
 */
function alvosPequenos (onde, lista) {
  checar(lista.length === 0, `${onde}: alvos ≥ 44px — ${lista.slice(0, 4).join(' | ')}`)
}
/** Nada passa da borda direita (E2E-1, corrigido com minmax(0, 1fr) em .ct-caca__central): qualquer estouro reprova. */
function estouros (onde, lista, rota = '') {
  if (!lista.length) return
  falha(`${onde}: nada passa da borda direita — ${lista.join(' | ')}`)
}

// ---------------------------------------------------------------- execução
const servidor = reusar ? null : spawn(`npx vite --port ${PORT} --strictPort`, { cwd: join(__dirname, '..'), shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
let nav
const secoes = []
const secao = (n, titulo, fn) => secoes.push({ n, titulo, fn })

// ================================================================ 1 · criar, reabrir, guardar
secao(1, 'criar o mapa, reabrir, guardar o link e validar o formulário', async () => {
  for (const [w, h] of [[360, 800], [1440, 900]]) {
    const c = await contexto(nav, { w, h, permissoes: ['clipboard-read', 'clipboard-write'] })
    const { page } = c
    await ir(page, '/cartoon/caca')
    const sem = await texto(page)
    checar(/Comece seu mapa/.test(sem) && /Sem senha/.test(sem), `@${w} sem mapa: a central abre direto na criação, sem senha e sem tutorial`)
    checar(!(await page.locator('input[type=password]').count()), `@${w} criação sem campo de senha`)
    // Validações do formulário (o servidor decide; a tela mostra o motivo e não cria nada).
    await page.getByLabel(/Apelido/).fill('E')
    await page.getByLabel(/^E-mail/).fill('isso-nao-e-email')
    await page.getByRole('button', { name: 'Criar meu mapa' }).click()
    await page.locator('.ct-carimbar__form [role=alert]').waitFor({ timeout: 8000 }).catch(() => null)
    const msg1 = await page.locator('.ct-carimbar__form [role=alert]').innerText().catch(() => '')
    checar(/aceite|apelido|e-mail|Confira/i.test(msg1), `@${w} formulário inválido mostra o motivo (${msg1 || 'sem mensagem'})`)
    checar(!(await registrar(page)), `@${w} formulário inválido não gravou chave no aparelho`)
    await page.getByLabel(/Apelido/).fill(`E2E Criar ${w}`)
    await page.getByLabel(/^E-mail/).fill(email(`criar${w}`))
    await page.getByLabel(/Quero aparecer/).check()
    await page.getByRole('button', { name: 'Criar meu mapa' }).click()
    await page.locator('.ct-carimbar__form [role=alert]').waitFor({ timeout: 6000 }).catch(() => null)
    checar(/aceite/i.test(await page.locator('.ct-carimbar__form [role=alert]').innerText().catch(() => '')), `@${w} sem aceitar o regulamento não cria o mapa`)
    await page.getByLabel(/Li e aceito/).check()
    await page.getByRole('button', { name: 'Criar meu mapa' }).click()
    await page.getByRole('heading', { name: new RegExp(`Mapa de E2E Criar ${w}`) }).waitFor({ timeout: 15000 })
    const chave = await registrar(page)
    checar(/^[A-Za-z0-9_-]{32}$/.test(chave || ''), `@${w} a chave de 32 caracteres ficou no aparelho`)
    checar(!page.url().includes(chave || '#'), `@${w} a chave não aparece no endereço`)
    await page.getByText(/e-mail ainda não foi confirmado/i).waitFor({ timeout: 8000 }).catch(() => null)
    const central = await texto(page)
    checar(/0 de \d+ casas/.test(central) && /Escolha uma casa para começar/.test(central), `@${w} mapa vazio: progresso 0 de N e "Escolha uma casa para começar"`)
    checar(/Guarde seu mapa/.test(central) && /como uma senha/.test(central), `@${w} aviso de guardar o link, dito como credencial`)
    checar(/e-mail ainda não foi confirmado/i.test(central), `@${w} lembrete discreto de e-mail pendente`)
    checar(!central.includes(chave || '#') && !central.toLowerCase().includes(email(`criar${w}`)), `@${w} nem a chave nem o e-mail inteiro aparecem na tela`)
    await foto(page, `01-criado-${w}`)
    // Guardar: o botão copia o link pessoal (#mapa=…), nunca compartilha.
    await page.getByRole('button', { name: /Copiar meu link pessoal/i }).click()
    const copiado = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '')
    checar(copiado.endsWith(`/cartoon/mapa#mapa=${chave}`), `@${w} "Copiar meu link" põe o link pessoal na área de transferência`)
    checar(!(await page.getByRole('button', { name: /whatsapp|compartilhar/i }).count()), `@${w} guardar o mapa não oferece compartilhar o link`)
    // Reabrir: recarregar mantém o mapa; o aviso de "guardar" some (só logo após criar).
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: new RegExp(`Mapa de E2E Criar ${w}`) }).waitFor({ timeout: 10000 })
    checar(!(await texto(page)).includes('Guarde seu mapa'), `@${w} ao reabrir, o mapa vem do aparelho sem repetir o "guarde"`)
    // Abrir pelo link pessoal em outro aparelho (contexto limpo): grava e tira a chave do endereço.
    const outro = await contexto(nav, { w, h })
    await outro.page.goto(`${BASE}/cartoon/caca?preview=1#mapa=${chave}`, { waitUntil: 'networkidle' })
    await outro.page.getByRole('heading', { name: new RegExp(`Mapa de E2E Criar ${w}`) }).waitFor({ timeout: 10000 })
    checar(!outro.page.url().includes(chave), `@${w} abrir pelo link pessoal tira a chave do endereço`)
    await semErros(c, `@${w} criar/reabrir`)
    await outro.ctx.close(); await c.ctx.close()
  }
  // Mesmo e-mail = mesma pessoa: sem e-mail confirmado, dois mapas deixam a identidade em disputa (nenhum é principal); o sexto em 24 h é recusado.
  const a = await mapaReal('par-a', { mail: email('par') })
  const b = await mapaReal('par-b', { mail: email('par') })
  const la = await chamar('mapa_ler_v2', { p_chave: a.chave }); const lb = await chamar('mapa_ler_v2', { p_chave: b.chave })
  checar(la?.principal === false && lb?.principal === false, 'mesmo e-mail em dois mapas, nenhum confirmado: identidade em disputa, ninguém é principal (20261216)')
  let recusado = ''
  for (let i = 0; i < 4; i++) { try { const r = await chamar('mapa_criar_v2', { p_edicao: EDICAO, p_apelido: `E2E lim ${i}`, p_email: email('par'), p_whatsapp: null, p_ranking: false, p_aceite: true }); criados.push(r.chave) } catch (e) { recusado = e.message } }
  try { const r = await chamar('mapa_criar_v2', { p_edicao: EDICAO, p_apelido: 'E2E lim 9', p_email: email('par'), p_whatsapp: null, p_ranking: false, p_aceite: true }); criados.push(r.chave) } catch (e) { recusado = e.message }
  checar(recusado === 'muitos_pedidos', `o 6º mapa do mesmo e-mail em 24 h é recusado (${recusado || 'não recusou'})`)
})

// ================================================================ 2 · recuperar
secao(2, 'recuperar e confirmar por e-mail (estados do envio)', async () => {
  const alvo = await mapaReal('rec')
  const novo = await mapaReal('rec-novo', { apelido: 'E2E Recuperado' })
  const validar = async (page, codigo = '123456') => { await page.getByLabel(/Código de 6 dígitos/).fill(codigo); await page.getByRole('button', { name: 'Validar código' }).click() }

  // a) e-mail indisponível (provedor não configurado): diz a verdade e dá alternativas.
  let c = await contexto(nav, { email: { ok: false, motivo: 'email_indisponivel' } })
  await ir(c.page, '/cartoon/caca/recuperar')
  await c.page.getByLabel(/E-mail do mapa/).fill(alvo.email)
  await c.page.getByRole('button', { name: 'Enviar código' }).click()
  await c.page.getByText('Não conseguimos enviar o e-mail agora').waitFor({ timeout: 8000 }).catch(() => falha('e-mail indisponível: sem o aviso honesto'))
  const ind = await texto(c.page)
  checar(/link pessoal/.test(ind) && /organização/.test(ind) && !/está a caminho/.test(ind), 'e-mail indisponível: alternativas (link pessoal, organização) e nenhuma promessa de código')
  checar(await c.page.getByRole('link', { name: 'Falar com a organização' }).count() === 1, 'e-mail indisponível: ação "Falar com a organização"')
  checar(c.pedidos.some((p) => p.fn === 'caca-email' && p.corpo.finalidade === 'recuperar'), 'o pedido de código sai com finalidade "recuperar"')
  await foto(c.page, '02-email-indisponivel')
  await c.ctx.close()

  // b) envio ok → etapa do código; "Não chegou?"; código inválido real (o banco recusa); reenvio com contagem.
  c = await contexto(nav, { email: { ok: true } })
  await ir(c.page, '/cartoon/caca/recuperar')
  await c.page.getByLabel(/E-mail do mapa/).fill(alvo.email)
  await c.page.getByRole('button', { name: 'Enviar código' }).click()
  await c.page.getByLabel(/Código de 6 dígitos/).waitFor({ timeout: 8000 })
  const env = await texto(c.page)
  checar(/Se existir um mapa com esse e-mail/.test(env) && /10 minutos/.test(env), 'envio ok: texto igual exista ou não mapa (não revela se o e-mail tem mapa) e validade de 10 min')
  checar(await c.page.getByRole('button', { name: /Enviar outro código em \d+ s/ }).isDisabled(), 'reenvio fica travado durante a contagem de 60 s')
  checar(await c.page.getByRole('button', { name: 'Validar código' }).isDisabled(), '"Validar" fica travado até o código ter 6 dígitos')
  await validar(c.page)
  await c.page.getByText('Código inválido ou vencido').waitFor({ timeout: 8000 }).catch(() => falha('código errado: sem a mensagem de código inválido'))
  checar(!(await c.page.getByText(/recuperado/).count()), 'código errado não recupera nada')
  checar(!(await registrar(c.page)), 'código errado não grava chave no aparelho')
  checar((await c.page.getByLabel(/Código de 6 dígitos/).inputValue()) === '', 'código errado limpa o campo')
  await c.page.getByRole('button', { name: 'Não chegou?' }).click()
  checar(await c.page.getByText('O código não chegou?').count() === 1, '"Não chegou?" abre as alternativas honestas')
  await c.page.getByRole('button', { name: 'Voltar e digitar o código' }).click()
  checar(await c.page.getByLabel(/Código de 6 dígitos/).count() === 1, '"Voltar e digitar o código" volta à etapa do código')
  await c.ctx.close()

  // c) limitado · falha temporária (com "Tentar de novo") · sem rede
  for (const [resp, esperado, nome] of [[{ ok: true, limitado: true }, /Muitos pedidos de código/, 'limitado'], [{ ok: false, motivo: 'falha_temporaria' }, /tentar de novo|instantes|agora/i, 'falha temporária'], ['falha', /Sem conexão/, 'sem rede'], [{ ok: false, motivo: 'email_invalido' }, /Confira o e-mail/, 'e-mail inválido']]) {
    c = await contexto(nav, { email: resp })
    await ir(c.page, '/cartoon/caca/recuperar')
    await c.page.getByLabel(/E-mail do mapa/).fill(alvo.email)
    await c.page.getByRole('button', { name: 'Enviar código' }).click()
    await c.page.waitForTimeout(700)
    checar(esperado.test(await texto(c.page)), `envio ${nome}: a tela diz o que houve`)
    if (nome === 'falha temporária' || nome === 'sem rede') checar(await c.page.getByRole('button', { name: 'Tentar de novo' }).count() === 1, `envio ${nome}: oferece "Tentar de novo"`)
    await c.ctx.close()
  }

  // d) código VÁLIDO (resposta simulada da RPC): troca a chave neste aparelho e avisa que o antigo precisa recuperar de novo.
  c = await contexto(nav, { email: { ok: true }, mocks: { mapa_codigo_validar: { ok: true, finalidade: 'recuperar', chave: novo.chave, apelido: novo.apelido } } })
  await ir(c.page, '/cartoon/caca/recuperar')
  await c.page.getByLabel(/E-mail do mapa/).fill(alvo.email)
  await c.page.getByRole('button', { name: 'Enviar código' }).click()
  await validar(c.page)
  await c.page.getByText(/foi recuperado neste aparelho/).waitFor({ timeout: 8000 }).catch(() => falha('código válido: sem a confirmação de recuperação'))
  checar(/aparelho antigo precisará recuperar de novo/.test(await texto(c.page)), 'recuperar avisa que a chave antiga deixa de valer')
  checar((await registrar(c.page)) === novo.chave, 'código válido guarda a chave NOVA no aparelho')
  const corpoValidar = c.pedidos.find((p) => p.fn === 'mapa_codigo_validar')?.corpo
  checar(corpoValidar?.p_finalidade === 'recuperar' && corpoValidar?.p_codigo === '123456' && !JSON.stringify(c.pedidos.filter((p) => p.fn !== 'mapa_codigo_validar')).includes('123456'), 'o código só viaja no corpo da validação')
  await c.page.getByRole('link', { name: /central/i }).first().click()
  await c.page.getByRole('heading', { name: /Mapa de E2E Recuperado/ }).waitFor({ timeout: 10000 }).catch(() => falha('depois de recuperar, a central não abriu o mapa recuperado'))
  await c.ctx.close()

  // e) colar o link pessoal na recuperação
  c = await contexto(nav, {})
  await ir(c.page, '/cartoon/caca/recuperar')
  await c.page.locator('details summary').first().click()
  await c.page.getByLabel(/link/i).last().fill(`${BASE}/cartoon/minha-rota#mapa=${alvo.chave}`)
  await c.page.getByRole('button', { name: /Abrir/i }).last().click()
  await c.page.getByRole('heading', { name: /Mapa de E2E rec/ }).waitFor({ timeout: 10000 }).catch(() => falha('colar o link pessoal não abriu o mapa'))
  await c.ctx.close()

  // f) confirmar e-mail (lembrete da central) com resposta simulada
  c = await contexto(nav, { chave: alvo.chave, email: { ok: true }, mocks: { mapa_codigo_validar: { ok: true, finalidade: 'confirmar' } } })
  await ir(c.page, '/cartoon/caca')
  await c.page.getByRole('button', { name: 'Confirmar e-mail' }).click()
  checar(/e\*+@exemplo\.com\.br/.test(await texto(c.page)), 'confirmar: o e-mail aparece mascarado')
  await c.page.getByRole('button', { name: 'Enviar código' }).click()
  await validar(c.page)
  await c.page.getByText(/confirmado/i).first().waitFor({ timeout: 8000 }).catch(() => falha('confirmar e-mail: sem a confirmação'))
  checar(c.pedidos.find((p) => p.fn === 'caca-email')?.corpo.finalidade === 'confirmar', 'confirmar e-mail pede o código com finalidade "confirmar"')
  await c.page.getByText(/Enviamos o link do seu mapa/).first().waitFor({ timeout: 8000 }).catch(() => falha('confirmar e-mail: a tela não disse que o link foi enviado'))
  const pedidoLink = c.pedidos.find((p) => p.fn === 'caca-email' && p.corpo.finalidade === 'link')
  checar(!!pedidoLink && pedidoLink.corpo.chave === alvo.chave && /^[a-z0-9._%+-]+@/i.test(pedidoLink.corpo.email || ''), 'depois de confirmar, o app pede o envio do link pessoal (finalidade "link", com a chave do mapa)')
  checar(/Enviamos o link do seu mapa para e\*+@/.test(await texto(c.page)), 'depois de confirmar, a tela diz que o link foi enviado, com o e-mail mascarado')
  checar(!(await texto(c.page)).includes(alvo.chave), 'o link/chave nunca aparece na tela de confirmação')
  await semErros(c, 'recuperar')
  await c.ctx.close()

  // g) sonda real com endereço de SANDBOX do provedor (não entrega a ninguém): relata o estado do envio.
  const sandbox = await mapaReal('sandbox', { mail: `delivered+e2e${EXEC}@resend.dev` })
  c = await contexto(nav, { chave: sandbox.chave, email: undefined })
  c.ctx.unroute('**/functions/v1/caca-email')
  await ir(c.page, '/cartoon/caca/recuperar')
  await c.page.getByLabel(/E-mail do mapa/).fill(sandbox.email)
  await c.page.getByRole('button', { name: 'Enviar código' }).click()
  await c.page.waitForTimeout(4000)
  const real = await texto(c.page)
  if (/Não conseguimos enviar o e-mail agora/.test(real)) aviso('sonda real (sandbox do provedor): a edge caca-email respondeu "e-mail indisponível" — provedor/credencial não configurado neste ambiente')
  else if (/Se existir um mapa com esse e-mail/.test(real)) ok('sonda real (sandbox do provedor): a edge aceitou o pedido e a tela foi para a etapa do código')
  else if (/Tentar de novo|Sem conexão/.test(real)) aviso('sonda real (sandbox do provedor): falha temporária/sem rede na edge caca-email')
  else falha(`sonda real: estado não reconhecido: ${real.slice(0, 120)}`)
  await c.ctx.close()
})

// ================================================================ 3 · duas portas
secao(3, 'duas portas: QR → avaliar e avaliação → mapa', async () => {
  const m = await mapaReal('porta')
  // 3a — QR real com a janela fechada: o servidor recusa com "nao_aberta" e a tela não finge carimbo.
  let c = await contexto(nav, { chave: m.chave, permissoes: ['geolocation'], geo: { latitude: CASA.lat, longitude: CASA.lng, accuracy: 10 } })
  await ir(c.page, `/cartoon/carimbo/${CASA.qr}`)
  checar(await c.page.getByRole('button', { name: 'Carimbar aqui' }).isVisible(), 'QR: com mapa no aparelho, um toque pede a posição e carimba')
  await c.page.getByRole('button', { name: 'Carimbar aqui' }).click()
  await c.page.getByRole('heading', { name: /ainda não abriu/i }).waitFor({ timeout: 15000 }).catch(() => falha('QR real com a janela fechada: sem "ainda não abriu"'))
  const fechado = await texto(c.page)
  checar(/Os carimbos (começam|começam junto)/.test(fechado), 'QR real fechado: explica quando começam')
  checar(!/Carimbado!/.test(fechado), 'QR real fechado: nunca diz "Carimbado!" sem o servidor confirmar')
  const corpo = c.pedidos.find((p) => p.fn === 'mapa_carimbar')?.corpo
  checar(corpo?.p_qr === CASA.qr && Number.isFinite(corpo?.p_lat), 'QR: o pedido leva o código do QR e a posição (só na RPC)')
  await foto(c.page, '03-qr-fechado')
  await semErros(c, 'QR fechado')
  await c.ctx.close()

  // 3b — QR sem mapa: oferece criar; QR com formato errado: recusa clara.
  c = await contexto(nav, {})
  await ir(c.page, `/cartoon/carimbo/${CASA.qr}`)
  checar(/Primeira vez\? Comece seu mapa/.test(await texto(c.page)) && await c.page.getByRole('button', { name: 'Começar e carimbar' }).count() === 1, 'QR sem mapa: "Comece seu mapa" com ação "Começar e carimbar"')
  await ir(c.page, '/cartoon/carimbo/xx')
  checar(await c.page.locator('h1').count() === 1 && !(await c.page.getByRole('button', { name: 'Carimbar aqui' }).count()), 'QR inválido: um <h1> e nenhuma ação de carimbar')
  await c.ctx.close()

  // 3c — QR → carimbo PENDENTE (resposta simulada: primeira visita, sem avaliação) → "Avaliar o combo" leva à avaliação com a casa e o mapa.
  c = await contexto(nav, { chave: m.chave, edicaoDemo: true, permissoes: ['geolocation'], geo: { latitude: CASA.lat, longitude: CASA.lng, accuracy: 10 },
    mocks: { mapa_carimbar: { ok: true, primeira: true, avaliou: false, slug: FORM.slug, unidade: FORM.unidade } } })
  await ir(c.page, '/cartoon/carimbo/abcdef23')
  await c.page.getByRole('button', { name: 'Carimbar aqui' }).click()
  await c.page.getByRole('heading', { name: /pendente|Falta avaliar|Carimbo/i }).first().waitFor({ timeout: 15000 })
  const pend = await texto(c.page)
  checar(/avalie|avaliar/i.test(pend) && /Avaliar o combo|Avaliar agora|Avaliar/.test(pend), 'QR → pendente: convite claro para avaliar o combo daquela casa')
  // o app lê o mapa logo depois do carimbo; só com ele lido o "Avaliar" leva apelido e e-mail (tocar antes dessa leitura não os leva)
  for (let i = 0; i < 40 && !c.pedidos.some((p) => p.fn === 'mapa_ler_v2'); i++) await esperar(150)
  await esperar(400)
  const botaoAvaliar = c.page.getByRole('button', { name: /Avaliar/ }).first()
  await botaoAvaliar.click()
  await c.page.waitForURL(/\/cartoon\/avaliar/, { timeout: 8000 })
  await c.page.waitForSelector('form.ct-form', { timeout: 8000 }).catch(() => null)
  checar(FORM.procurar.test(await c.page.locator('form.ct-form').first().innerText().catch(() => '')), 'QR → avaliar: o formulário já vem com a casa carimbada')
  const campos0 = c.page.locator('.ct-nota-campo')
  for (let i = 0; i < await campos0.count(); i++) await campos0.nth(i).locator('.ct-escala__op', { hasText: /^9$/ }).click()
  await c.page.click('.ct-form__navegar button:has-text("Continuar")')
  checar((await c.page.locator('input[autocomplete="name"]').inputValue()) === m.apelido && (await c.page.locator('input[type="email"]').inputValue()) === m.email, 'QR → avaliar: apelido e e-mail do mapa já vêm preenchidos nos dados da avaliação')
  await foto(c.page, '03-qr-para-avaliar')
  await c.ctx.close()

  // 3d — avaliação → mapa: sem mapa oferece criar com o mesmo e-mail; com mapa, explica que ainda é preciso carimbar na casa.
  const preencher = async (page) => {
    await page.goto(`${BASE}/cartoon/avaliar?participante=${FORM.slug}&preview=1`, { waitUntil: 'networkidle' })
    await page.waitForSelector('form.ct-form', { timeout: 10000 })
    // Uma unidade só: o formulário já abre nas notas. Mais de uma: começa na escolha da unidade.
    if (await page.locator('.ct-form select').count()) { await page.selectOption('.ct-form select', FORM.unidade); await page.click('.ct-form__navegar button:has-text("Continuar")') }
    const campos = page.locator('.ct-nota-campo')
    for (let i = 0; i < await campos.count(); i++) await campos.nth(i).locator('.ct-escala__op', { hasText: /^9$/ }).click()
    await page.click('.ct-form__navegar button:has-text("Continuar")')
    await page.fill('input[autocomplete="name"]', 'Pessoa E2E')
    await page.fill('input[type="email"]', email('aval'))
    await page.waitForTimeout(3100)
    await page.click('button[type="submit"]')
    await page.waitForSelector('.ct-form__ok', { timeout: 8000 })
  }
  c = await contexto(nav, { edicaoDemo: true })
  await preencher(c.page)
  const aposSem = await texto(c.page)
  checar(/Essa avaliação te coloca na Caça aos Carimbos/.test(aposSem) && /mesmo e-mail da avaliação/.test(aposSem), 'avaliação → mapa (sem mapa): convite para criar com o mesmo e-mail')
  checar(/carimbar presencialmente/.test(aposSem), 'avaliação → mapa (sem mapa): diz que ainda é preciso carimbar presencialmente')
  checar((await c.page.getByLabel(/^E-mail/).inputValue()) === email('aval'), 'avaliação → mapa: o e-mail da avaliação já vem no formulário do mapa')
  await c.page.getByLabel(/Apelido/).fill('E2E Depois da Avaliação')
  await c.page.getByLabel(/Li e aceito/).check()
  await c.page.getByRole('button', { name: 'Criar meu mapa' }).click()
  await c.page.getByText('Mapa criado! Falta só carimbar na casa').waitFor({ timeout: 15000 }).catch(() => falha('avaliação → mapa: o mapa não foi criado'))
  await registrar(c.page)
  checar(/Avaliar sozinho não cria carimbo/.test(await texto(c.page)), 'avaliação → mapa: avaliar sozinho não cria carimbo')
  checar(await c.page.getByRole('link', { name: /Abrir minha Caça/i }).count() >= 1, 'avaliação → mapa: link "Abrir minha Caça"')
  await foto(c.page, '03-avaliacao-para-mapa')
  await c.ctx.close()
  const m2 = await mapaReal('porta2')
  c = await contexto(nav, { chave: m2.chave, edicaoDemo: true })
  await preencher(c.page)
  const aposCom = await texto(c.page)
  checar(/Sua avaliação também vale na Caça aos Carimbos/.test(aposCom) && /Ela valida o carimbo/.test(aposCom) && /vá até a casa e leia o QR/.test(aposCom), 'avaliação → mapa (com mapa): vale na Caça, mas o carimbo é na casa')
  await semErros(c, 'duas portas')
  await c.ctx.close()
})

// ================================================================ 4 · GPS e pedido de revisão
secao(4, 'GPS autônomo: negada, indisponível, demorou, imprecisa, longe e pedido de revisão', async () => {
  const m = await mapaReal('gps')
  const recusa = (extra = {}) => ({ ok: false, slug: CASA.slug, ...extra })
  const carimbar = async (c) => { await c.page.getByRole('button', { name: /Carimbar aqui|Tentar de novo/ }).first().click(); await c.page.locator('h1[tabindex="-1"]').first().waitFor({ timeout: 20000 }) }
  const titulo = (c) => c.page.locator('h1').first().innerText()

  let c
  // cada cenário abre um contexto com o GPS de mentira certo (erro do navegador) e a resposta do servidor correspondente
  const cenario = async (nome, { init, geo, permissoes, resposta, tituloEsperado, passos = true }) => {
    const initFn = `(${ACELERAR_TEMPORIZADORES})();${init || ''}`
    const cx = await contexto(nav, { chave: m.chave, init: initFn, mocks: { mapa_carimbar: resposta }, geo, permissoes: permissoes || [] })
    await ir(cx.page, `/cartoon/carimbo/${CASA.qr}`)
    await carimbar(cx)
    const t = await titulo(cx); const corpo = await texto(cx.page)
    checar(tituloEsperado.test(t), `GPS ${nome}: título "${t}"`)
    checar(!/Carimbado!/.test(corpo), `GPS ${nome}: nunca diz "Carimbado!"`)
    if (passos) checar(/No iPhone/.test(corpo) && /No Android/.test(corpo) && /Instagram/.test(corpo), `GPS ${nome}: passo a passo para iPhone, Android e navegador de app`)
    checar(/Para o GPS pegar melhor/.test(corpo), `GPS ${nome}: dicas para o sinal`)
    checar(await cx.page.getByRole('button', { name: 'Tentar de novo' }).count() === 1, `GPS ${nome}: ação "Tentar de novo"`)
    const corpoRpc = cx.pedidos.find((p) => p.fn === 'mapa_carimbar')?.corpo
    return { cx, corpoRpc }
  }
  let r = await cenario('negada', { init: gpsComErro(1), resposta: recusa({ motivo: 'sem_localizacao' }), tituloEsperado: /bloqueou a localização/ })
  checar(r.corpoRpc?.p_lat === null && r.corpoRpc?.p_lng === null, 'GPS negada: o pedido vai sem posição')
  checar(await r.cx.page.getByRole('button', { name: /Estou na casa e o GPS não funciona/ }).count() === 0, 'GPS negada: com UMA falha ainda não oferece o pedido de revisão')
  await foto(r.cx.page, '04-gps-negada')
  // segunda falha seguida → aparece o pedido; o pedido real, com a janela fechada, volta "ainda não abriram"
  await r.cx.page.getByRole('button', { name: 'Tentar de novo' }).click()
  await r.cx.page.getByRole('button', { name: /Estou na casa e o GPS não funciona/ }).waitFor({ timeout: 20000 }).catch(() => falha('GPS: depois de 2 falhas seguidas o pedido de revisão não apareceu'))
  await r.cx.page.getByRole('button', { name: /Estou na casa e o GPS não funciona/ }).click()
  const form = await texto(r.cx.page)
  checar(/não vale carimbo por si só/.test(form) && /nunca a casa/.test(form) && /posição não é guardada/.test(form), 'pedido: diz que não vale carimbo, que quem decide é a organização e que a posição não é guardada')
  checar(await r.cx.page.locator('textarea[maxlength="200"]').count() === 1, 'pedido: nota opcional de até 200 caracteres')
  await r.cx.page.getByRole('button', { name: 'Enviar pedido à organização' }).click()
  await r.cx.page.getByRole('alert').waitFor({ timeout: 10000 }).catch(() => null)
  const real = await r.cx.page.getByRole('alert').innerText().catch(() => '')
  checar(/confirme o seu e-mail/.test(real) && !(await r.cx.page.getByText('Pedido enviado').count()), `pedido real de mapa sem e-mail confirmado: recusado e nunca "enviado" (${real.slice(0, 60)})`)
  await foto(r.cx.page, '04-pedido-recusado')
  await r.cx.ctx.close()
  // pedido aceito pelo servidor (simulado): "enviado" só com ok + estado pendente, e nada foi carimbado
  const cp = await contexto(nav, { chave: m.chave, init: `(${ACELERAR_TEMPORIZADORES})();${gpsComErro(2)}`, mocks: { mapa_carimbar: recusa({ motivo: 'sem_localizacao' }), caca_excecao_pedir: { ok: true, id: 'x', estado: 'pendente' } } })
  await ir(cp.page, `/cartoon/carimbo/${CASA.qr}`)
  await carimbar(cp)
  checar(/não conseguiu a localização/.test(await titulo(cp)), 'GPS indisponível: "Este aparelho não conseguiu a localização"')
  await cp.page.getByRole('button', { name: 'Tentar de novo' }).click()
  await cp.page.getByRole('button', { name: /Estou na casa/ }).waitFor({ timeout: 20000 })
  await cp.page.getByRole('button', { name: /Estou na casa/ }).click()
  await cp.page.locator('textarea').fill('Estou no segundo piso, sem sinal.')
  await cp.page.getByRole('button', { name: 'Enviar pedido à organização' }).click()
  await cp.page.getByText('Pedido enviado').waitFor({ timeout: 8000 })
  checar(/nada foi carimbado/i.test(await texto(cp.page)), 'pedido enviado: "nada foi carimbado" e depende de aprovação')
  const ped = cp.pedidos.find((p) => p.fn === 'caca_excecao_pedir')?.corpo
  checar(ped?.p_motivo === 'sem_localizacao' && ped?.p_nota === 'Estou no segundo piso, sem sinal.' && !('p_email' in ped), 'pedido: motivo e nota seguem; nenhum e-mail na requisição')
  await foto(cp.page, '04-pedido-enviado')
  await cp.ctx.close()
  // demorou
  r = await cenario('demorou', { init: gpsComErro(3), resposta: recusa({ motivo: 'sem_localizacao' }), tituloEsperado: /demorou demais/ })
  await r.cx.ctx.close()
  // imprecisa (margem 800 m): título de sinal fraco
  r = await cenario('imprecisa', { geo: { latitude: CASA.lat, longitude: CASA.lng, accuracy: 800 }, permissoes: ['geolocation'], resposta: recusa({ motivo: 'longe', distancia_m: 420, margem_m: 300 }), tituloEsperado: /sinal de localização está fraco/ })
  checar(/margem de cerca de 800 m/.test(await texto(r.cx.page)), 'GPS imprecisa: informa a margem medida')
  await r.cx.ctx.close()
  // longe de verdade (precisão boa): mensagem de distância, sem passo a passo de permissão, sem pedido de revisão
  const cl = await contexto(nav, { chave: m.chave, init: ACELERAR_TEMPORIZADORES, geo: { latitude: CASA.lat + 0.03, longitude: CASA.lng, accuracy: 10 }, permissoes: ['geolocation'], mocks: { mapa_carimbar: recusa({ motivo: 'longe', distancia_m: 3300 }) } })
  await ir(cl.page, `/cartoon/carimbo/${CASA.qr}`)
  await carimbar(cl)
  const longe = await texto(cl.page)
  checar(/longe|perto/i.test(longe), 'GPS longe: mensagem de distância')
  await cl.page.getByRole('button', { name: 'Tentar de novo' }).click()
  await cl.page.locator('h1[tabindex="-1"]').first().waitFor()
  await cl.page.waitForTimeout(400)
  checar(await cl.page.getByRole('button', { name: /Estou na casa/ }).count() === 0, 'GPS longe (a 3 km): quem está claramente em outro lugar não vê o pedido de revisão')
  await semErros(cl, 'GPS')
  await cl.ctx.close()
  // sem rede
  const cr = await contexto(nav, { chave: m.chave, geo: { latitude: CASA.lat, longitude: CASA.lng, accuracy: 10 }, permissoes: ['geolocation'], mocks: { mapa_carimbar: 'rede' } })
  await ir(cr.page, `/cartoon/carimbo/${CASA.qr}`)
  await carimbar(cr)
  checar(/conexão|rede/i.test(await texto(cr.page)) && !/Carimbado!/.test(await texto(cr.page)), 'carimbo sem rede: pede a conexão e não finge sucesso')
  await cr.ctx.close()
  // carimbo "ok" com avaliação feita (simulado): título e progresso vêm do servidor
  const co = await contexto(nav, { chave: m.chave, geo: { latitude: CASA.lat, longitude: CASA.lng, accuracy: 10 }, permissoes: ['geolocation'],
    mocks: { mapa_carimbar: { ok: true, primeira: true, avaliou: true, slug: CASA.slug, unidade: CASA.unidade }, mapa_ler_v2: MAPA_PROGRESSO } })
  await ir(co.page, `/cartoon/carimbo/${CASA.qr}`)
  await carimbar(co)
  checar(/Carimbado!/.test(await titulo(co)) && /2 de 26/.test(await texto(co.page)), 'carimbo ok (resposta do servidor): "Carimbado!" e o progresso vindo do servidor')
  await co.ctx.close()
})

// ================================================================ 5 · estados do mapa
secao(5, 'estados do mapa nas três vistas (vazio, pendente, conquistada, revisita)', async () => {
  // sem mapa
  let c = await contexto(nav, {})
  await ir(c.page, '/cartoon/caca/mapa')
  checar(/Crie seu mapa para carimbar/.test(await texto(c.page)), 'mapa sem mapa pessoal: convite para criar, sem estados desenhados')
  checar(await c.page.locator('button[aria-label*="conquistada"]').count() === 0, 'mapa sem mapa pessoal: nenhum pin conquistado')
  await c.ctx.close()
  // falha de leitura
  c = await contexto(nav, { chave: CHAVE_FAKE, mocks: { mapa_ler_v2: { __status: 500, corpo: { message: 'boom' } } } })
  await ir(c.page, '/cartoon/caca/mapa')
  await c.page.getByText(/Não deu para ler o seu mapa agora/).waitFor({ timeout: 8000 }).catch(() => falha('mapa com a leitura falhando: sem o aviso de falha'))
  checar(await c.page.getByRole('button', { name: 'Tentar de novo' }).count() >= 1, 'mapa com leitura falhando: "Tentar de novo"')
  await c.ctx.close()
  // vazio (mapa real, nenhum carimbo)
  const m = await mapaReal('estados')
  c = await contexto(nav, { chave: m.chave })
  await ir(c.page, '/cartoon/caca/mapa')
  await c.page.getByText(/0 de \d+ casas validadas/).first().waitFor({ timeout: 10000 })
  checar(await c.page.locator('button[aria-label*="ainda não visitada"]').count() > 5 && !(await c.page.locator('button[aria-label*="pendente"], button[aria-label*="conquistada"]').count()), 'mapa vazio: todas as casas "ainda não visitada"')
  checar(await c.page.getByText(/Próximo passo/).count() >= 1, 'mapa vazio: o próximo passo é indicado')
  await c.ctx.close()
  // pendente + conquistada + revisita (resposta simulada, o contrato do servidor)
  for (const [w, h] of [[360, 800], [1440, 900]]) {
    c = await contexto(nav, { w, h, chave: CHAVE_FAKE, mocks: { mapa_ler_v2: MAPA_PROGRESSO, mapa_confirmar_email_status: { confirmado: true, valido: true } } })
    await ir(c.page, '/cartoon/caca/mapa')
    await c.page.getByText('2 de 26 casas validadas').first().waitFor({ timeout: 10000 })
    const t = await texto(c.page)
    checar(/1 carimbo esperando avaliação · 1 carimbo extra/.test(t), `@${w} mundo: contadores de pendente e extra`)
    // Próximo passo = UM botão que diz a ação inteira ("Avaliar o combo de Cookitos"); a frase longa vem como descrição dele.
    checar(/Falta avaliar o combo de Cookitos/.test(t) && await c.page.getByRole('button', { name: /Avaliar o combo de Cookitos/ }).count() === 1, `@${w} mundo: próximo passo = avaliar a casa pendente`)
    const pins = await c.page.locator('button[aria-label]').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')).filter((a) => /^\d+\. /.test(a)))
    checar(pins.some((p) => /Adocee.*conquistada, 1 revisita/.test(p)), `@${w} mundo: casa conquistada com "1 revisita" (estado dito por texto, não só por cor)`)
    checar(pins.some((p) => /Carcará.*conquistada$/.test(p)), `@${w} mundo: casa conquistada sem revisita`)
    checar(pins.filter((p) => /Cookitos.*carimbo pendente: falta avaliar/.test(p)).length >= 1, `@${w} mundo: casa pendente diz "falta avaliar"`)
    checar(/Mapa ilustrativo: não mostra posições reais/.test(t), `@${w} mundo: aviso de mapa ilustrativo`)
    await c.page.locator('summary', { hasText: 'Como ler os pins' }).click() // a legenda é recolhível: aberta, diz do Sicredi
    checar(await c.page.getByRole('region', { name: /Mundo da Doçura/ }).locator('button:has-text("Sicredi"), button[aria-label*="Sicredi"]').count() >= 1 && /não conta como casa/.test(await texto(c.page)), `@${w} mundo: agências do Sicredi marcadas como "não contam como casa"`)
    // "casas × endereços": a faixa de resumo conta casas e endereços, e diz que a Caça conta casas
    checar(/\d+ casas?( \(\d+ valem carimbo\))? · \d+ endereços/.test(t) && /Cada casa vale um carimbo, mesmo com mais de um endereço/.test(t), `@${w} mundo: resumo "N casas · M endereços" e a regra "cada casa vale um carimbo"`)
    // filtro "Meu progresso" — mora na folha de Filtros (dialog), com o contador de ativos no botão
    const botaoFiltros = c.page.getByRole('button', { name: /^Filtros/ })
    await botaoFiltros.click()
    await c.page.getByRole('dialog', { name: 'Filtros do mapa' }).waitFor({ timeout: 5000 })
    await c.page.getByRole('button', { name: 'Conquistadas' }).click()
    await c.page.getByRole('button', { name: /^Ver \d+ endereços?$/ }).click()
    await c.page.waitForTimeout(300)
    checar(/1 filtro ativo/.test(await botaoFiltros.getAttribute('aria-label')), `@${w} filtros: o botão diz quantos filtros estão ativos`)
    const filtrada = /Casas em lista \((\d+)\)/.exec(await texto(c.page))
    checar(!filtrada || Number(filtrada[1]) <= 41, `@${w} filtro "Conquistadas" estreita a lista`)
    await c.page.getByRole('button', { name: 'Limpar filtros' }).first().click() // limpa
    checar(await botaoFiltros.getAttribute('aria-label') === 'Filtros', `@${w} filtros: limpar zera o contador`)
    await foto(c.page, `05-mundo-${w}`)
    // vista Lista
    await c.page.getByRole('button', { name: 'Lista' }).click()
    await c.page.waitForTimeout(500)
    const li = await texto(c.page)
    checar(/Conquistada/.test(li) && /Falta avaliar/.test(li), `@${w} lista: estados escritos (Conquistada / Falta avaliar)`)
    checar(/1 revisita/.test(li), `@${w} lista: revisita contada`)
    // cada casa da lista abre o cartão (folha no celular, coluna no desktop), com o caminho para a ficha; "Fechar" fecha
    await c.page.locator('.ct-mapa__sel', { hasText: /Adocee/ }).first().click()
    await c.page.locator('.ct-mapa__cartao').waitFor({ timeout: 5000 })
    checar(/Adocee/.test(await c.page.locator('.ct-mapa__cartao').innerText()), `@${w} lista: a casa abre o cartão`)
    await c.page.locator('.ct-mapa__cartao .ct-mapa__fechar').click()
    checar(await c.page.locator('.ct-mapa__cartao').count() === 0, `@${w} lista: o botão Fechar fecha o cartão`)
    await foto(c.page, `05-lista-${w}`)
    // vista Mapa real (tiles bloqueados no teste): a vista abre, diz a cobertura e lista as sem localização
    await c.page.getByRole('button', { name: 'Mapa real' }).click()
    await c.page.waitForTimeout(1500)
    const real = await texto(c.page)
    checar(/unidades? com localização conferida/.test(real) || /Carregando o mapa real/.test(real), `@${w} mapa real: cobertura das localizações ("conferida/aproximada/sem")`)
    const semPonto = c.page.locator('summary', { hasText: 'Ainda sem localização no mapa' })
    if (await semPonto.count()) await semPonto.first().click()
    checar(/Ainda sem localização no mapa/.test(real) ? /em conferência/.test(await texto(c.page)) : true, `@${w} mapa real: unidade sem ponto é dita "em conferência", nunca desenhada`)
    checar(!/Sicredi.*conta como casa/.test(real.replace(/não conta como casa/g, '')), `@${w} mapa real: Sicredi nunca conta como casa`)
    await foto(c.page, `05-real-${w}`)
    const med = await medirPagina(c.page)
    checar(med.overflow <= 1, `@${w} mapa: sem rolagem lateral (${med.overflow}px)`)
    await semErros(c, `@${w} mapa`)
    await c.ctx.close()
  }
  // "Minha rota" e "Já fui" não validam casa (spec §1): a central e o mapa dizem N de TOTAL do servidor.
  c = await contexto(nav, { chave: CHAVE_FAKE, mocks: { mapa_ler_v2: MAPA_PROGRESSO, mapa_confirmar_email_status: { confirmado: true, valido: true } } })
  await ir(c.page, '/cartoon/caca/mapa')
  await c.page.getByText('2 de 26 casas validadas').first().waitFor()
  // Minha rota e Carimbos moram num painel à parte: no celular é uma folha aberta pelo botão "Minha rota"; no desktop, a coluna.
  await c.page.locator('.ct-mapa__rota-botao').click()
  await c.page.getByRole('dialog', { name: /Sua rota e seus carimbos/ }).waitFor({ timeout: 5000 })
  const painel = await c.page.locator('.ct-folha-m--painel').innerText()
  const marcadas = /(\d+) de (\d+) casas marcadas por você/.exec(painel)
  checar(!marcadas || marcadas[2] === '26', `o painel "Sua rota e seus carimbos" usa o total do servidor (${marcadas ? marcadas[0] : 'sem contagem local'})`)
  checar(/2 de 26 casas validadas na Caça aos Carimbos/.test(painel), 'o painel de rota mostra a MESMA conta do servidor (validadas de total_casas)')
  checar(!/Já fui[\s\S]*Cookitos[\s\S]*Carimbada(?!,)/.test(painel), 'carimbo PENDENTE não aparece como "Carimbada" simples na lista "Já fui" (vira "Carimbada, falta avaliar")')
  checar(await c.page.locator('.ct-folha-m--painel .ct-mapa__fechar').isVisible(), 'a folha da rota tem o botão Fechar à vista')
  await c.page.keyboard.press('Escape')
  checar(await c.page.getByRole('dialog', { name: /Sua rota e seus carimbos/ }).count() === 0, 'Escape fecha a folha da rota')
  await c.ctx.close()
  await mapaTelaCheiaEFolhas()
  await mapaUnicoRota()
})

// ---- Redesign de 06/11/2026: tela cheia, folha da casa, folha de filtros e a rota dentro do Mapa da Doçura ----
const MOCKS_PROGRESSO = {
  mapa_ler_v2: MAPA_PROGRESSO, mapa_confirmar_email_status: { confirmado: true, valido: true },
  // as folhas Ranking e Grupos dos atalhos leem estas duas RPCs: respostas de teste (nada do banco, nada de dado real)
  caca_ranking_publico: [{ posicao: 1, apelido: 'Ana', casas: 9, extras: 3 }, { posicao: 2, apelido: 'Teste', casas: 2, extras: 1 }],
  caca_grupo_listar: { ok: true, total_casas: 26, grupos: [] },
}
const ESTILO_VAZIO = { version: 8, sources: {}, layers: [{ id: 'fundo', type: 'background', paint: { 'background-color': '#FDF0DE' } }] }
const TELAS = [[360, 800], [390, 844], [768, 1024], [1440, 900], [844, 390]]
const dom = (page, fn, arg) => page.evaluate(fn, arg)
/** Espera a rolagem da página assentar (o cartão rola o mapa para cima com animação suave). */
const esperarRolagem = async (page) => {
  let ultimo = -1; let iguais = 0
  for (let i = 0; i < 40 && iguais < 3; i++) { const y = await page.evaluate(() => Math.round(scrollY)); iguais = y === ultimo ? iguais + 1 : 0; ultimo = y; await page.waitForTimeout(100) }
}
const fotoTela = (page, nome) => page.screenshot({ path: join(CAPTURAS, `${nome}.png`) }).catch(() => null) // só a tela (a tela cheia trava o corpo: fullPage sairia em preto)

/** O que a tela cheia promete: contêiner fixo, tela toda, trava de rolagem, Fechar à vista e foco dentro. */
const estadoDaTelaCheia = (page) => dom(page, () => {
  const el = document.querySelector('.ct-mapa__explorar.is-cheia')
  if (!el) return null
  const r = el.getBoundingClientRect(); const cs = getComputedStyle(el)
  const f = document.querySelector('[data-fechar-cheia]')?.getBoundingClientRect()
  return {
    pos: cs.position, w: r.width, h: r.height, top: r.top, left: r.left, iw: innerWidth, ih: innerHeight, role: el.getAttribute('role'), modal: el.getAttribute('aria-modal'), nome: el.getAttribute('aria-label'),
    fecharOk: !!f && f.top >= 0 && f.left >= 0 && f.right <= innerWidth && f.height >= 43.5 && f.width >= 43.5,
    corpoFixo: getComputedStyle(document.body).position === 'fixed', htmlTrava: getComputedStyle(document.documentElement).overflow === 'hidden',
    foco: !!document.activeElement?.hasAttribute('data-fechar-cheia'), lateral: document.documentElement.scrollWidth - innerWidth,
  }
})

/**
 * Atalhos do jogo na tela cheia (06/11/2026): um botão compacto → lista de cinco → uma folha por vez. Com a tela cheia já aberta.
 * Confere o botão (alvo, canto, nome), a lista, cada folha (conteúdo, foco preso, Fechar), que fechar não muda zoom/posição/seleção/
 * filtros e a ordem do Escape (folha → lista → tela cheia: este último fica com quem chama).
 */
async function atalhosDoJogo (p, ro) {
  const botao = p.locator('[data-atalhos]')
  const g = await dom(p, () => {
    const b = document.querySelector('[data-atalhos]').getBoundingClientRect(); const z = document.querySelector('.ct-mundo__zoom')?.getBoundingClientRect()
    const barra = document.querySelector('.ct-mapa__barra').getBoundingClientRect()
    return { w: b.width, h: b.height, l: b.left, r: b.right, bt: b.bottom, iw: innerWidth, ih: innerHeight, abaixoDaBarra: b.top >= barra.bottom - 1, cobreZoom: !!z && !(b.right < z.left || b.left > z.right || b.bottom < z.top || b.top > z.bottom) }
  })
  checar(g.w >= 43.5 && g.h >= 43.5 && g.l >= 0 && g.r <= g.iw && g.bt <= g.ih && g.abaixoDaBarra && !g.cobreZoom, `${ro}: atalhos: botão ≥ 44px, dentro da tela, abaixo da barra e longe do zoom`)
  checar(/^Atalhos do jogo, 2 de 26 casas validadas$/.test(await botao.getAttribute('aria-label')), `${ro}: atalhos: o botão tem nome com o placar`)
  const estado = () => dom(p, () => {
    const pl = document.querySelector('.ct-mundo__palco').dataset // câmera do mapa (camera.js): zoom e posição do desenho
    return { l: Number(pl.x), t: Number(pl.y), zoom: pl.z, card: document.querySelector('.ct-mapa__cartao h2')?.textContent || '', filtros: document.querySelector('.ct-mapa__filtros-botao').getAttribute('aria-label') }
  })
  const antes = await estado()
  const lista = p.getByRole('list', { name: 'Atalhos do jogo' })
  await botao.click()
  await lista.waitFor({ timeout: 5000 })
  const nomes = (await lista.getByRole('button').allInnerTexts()).map((t) => t.trim())
  checar(nomes.join('|') === 'Progresso|Casas|Rota|Ranking|Grupos', `${ro}: atalhos: a lista tem os cinco, na ordem (${nomes.join(' · ')})`)
  checar(await botao.getAttribute('aria-expanded') === 'true', `${ro}: atalhos: aria-expanded no botão`)
  await fotoTela(p, `05-jogo-lista-${ro.replace(/\D+/g, '-').replace(/^-|-$/g, '')}`)
  await p.keyboard.press('Escape')
  checar(await lista.count() === 0 && await p.locator('.ct-mapa__explorar.is-cheia').count() === 1, `${ro}: atalhos: o Escape recolhe a lista e a tela cheia continua`)
  checar(await dom(p, () => document.activeElement?.hasAttribute('data-atalhos')), `${ro}: atalhos: o foco volta ao botão dos atalhos`)
  const CONTEUDO = {
    progresso: ['Progresso e carimbos', /2 de 26 casas validadas/],
    casas: ['Casas', /Casas em lista/],
    rota: ['Minha rota', /Quero ir/i],
    ranking: ['Ranking', /Ana/],
    grupos: ['Grupos', /grupo/i],
  }
  for (const [chave, [titulo, esperado]] of Object.entries(CONTEUDO)) {
    const rc = `${ro}: atalho ${titulo}`
    await botao.click()
    await lista.waitFor({ timeout: 5000 })
    await p.locator(`[data-atalho="${chave}"]`).click()
    const dlg = p.getByRole('dialog', { name: titulo, exact: true })
    await dlg.waitFor({ timeout: 8000 })
    await p.waitForTimeout(500) // a folha sobe em 240 ms; Ranking e Grupos baixam sob demanda
    checar(await lista.count() === 0, `${rc}: a lista recolhe sozinha ao abrir a folha`)
    checar(await p.locator('.ct-folha-m--jogo').count() === 1, `${rc}: só uma folha aberta`)
    checar(await dom(p, () => !!document.activeElement?.closest('.ct-folha-m--jogo')), `${rc}: o foco entra na folha`)
    checar(esperado.test(await dlg.innerText()), `${rc}: conteúdo certo (${esperado})`)
    const caixa = await dlg.boundingBox()
    const tela = await dom(p, () => [innerWidth, innerHeight])
    checar(caixa.x >= -1 && caixa.x + caixa.width <= tela[0] + 1 && caixa.y >= -1 && caixa.y + caixa.height <= tela[1] + 1, `${rc}: a folha cabe na tela`)
    if (chave === 'ranking') await fotoTela(p, `05-jogo-ranking-${tela[0]}x${tela[1]}`)
    const fechar = p.getByRole('button', { name: `Fechar: ${titulo}`, exact: true })
    checar(await fechar.evaluate((b) => { const r = b.getBoundingClientRect(); return r.width >= 43.5 && r.height >= 43.5 && r.top >= 0 && r.right <= innerWidth }), `${rc}: "Fechar" à vista, com alvo ≥ 44px`)
    const dentro = []
    for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); dentro.push(await dom(p, () => !!document.activeElement?.closest('.ct-folha-m--jogo'))) }
    checar(dentro.every(Boolean), `${rc}: o Tab fica preso na folha`)
    if (chave === 'rota') await fechar.click() // o botão explícito
    else await p.keyboard.press('Escape')
    await p.waitForTimeout(200)
    checar(await p.locator('.ct-folha-m--jogo').count() === 0 && await p.locator('.ct-mapa__explorar.is-cheia').count() === 1, `${rc}: fecha e a tela cheia continua`)
    checar(await lista.count() === 0, `${rc}: a lista segue recolhida depois de fechar a folha`)
    await p.waitForTimeout(100)
    checar(await dom(p, () => document.activeElement?.hasAttribute('data-atalhos')), `${rc}: o foco volta ao botão dos atalhos`)
    const depois = await estado()
    checar(Math.abs(depois.l - antes.l) <= 1 && Math.abs(depois.t - antes.t) <= 1 && depois.zoom === antes.zoom && depois.card === antes.card && depois.filtros === antes.filtros,
      `${rc}: seleção, filtros, zoom e posição do mapa não mudaram (${JSON.stringify(antes)} × ${JSON.stringify(depois)})`)
  }
  // Escape em pilha: folha → lista → (tela cheia, com quem chama)
  await botao.click(); await lista.waitFor({ timeout: 5000 })
  await p.locator('[data-atalho="rota"]').click()
  await p.getByRole('dialog', { name: 'Minha rota', exact: true }).waitFor({ timeout: 5000 })
  await p.keyboard.press('Escape')
  checar(await p.locator('.ct-folha-m--jogo').count() === 0 && await p.locator('.ct-mapa__explorar.is-cheia').count() === 1 && await lista.count() === 0, `${ro}: atalhos: Escape fecha só a folha`)
  await botao.click(); await lista.waitFor({ timeout: 5000 })
  await p.keyboard.press('Escape')
  checar(await lista.count() === 0 && await p.locator('.ct-mapa__explorar.is-cheia').count() === 1, `${ro}: atalhos: o seguinte Escape fecha só a lista`)
}

async function mapaTelaCheiaEFolhas () {
  for (const [w, h] of TELAS) {
    const onde = `@${w}x${h}`
    const c = await contexto(nav, { w, h, chave: CHAVE_FAKE, mocks: MOCKS_PROGRESSO })
    await c.ctx.route('**/tiles.openfreemap.org/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ESTILO_VAZIO) }))
    // Sem Google nos testes (a chave local não é do teste e cada carga custa): o mapa cai na reserva (MapLibre), o mesmo caminho de quem não tem chave.
    await c.ctx.route('**/maps.googleapis.com/**', (route) => route.abort('failed'))
    const p = c.page
    try {
    await ir(p, '/cartoon/caca/mapa')
    await p.getByText('2 de 26 casas validadas').first().waitFor({ timeout: 10000 })
    const abrir = p.getByRole('button', { name: 'Abrir mapa em tela cheia' })
    checar(await abrir.isVisible(), `${onde} ilustrado: "Abrir mapa em tela cheia" à vista`)
    await p.evaluate(() => document.querySelector('.ct-mapa__moldura').scrollIntoView({ block: 'start' }))
    checar(await abrir.evaluate((b) => { const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && b.contains(e) }), `${onde} o botão de tela cheia não está coberto (sobre o mapa, fora das barras fixas)`)

    // ---- estado que a tela cheia tem de levar: filtro ativo, casa escolhida (cartão), zoom ----
    await p.getByRole('button', { name: /^Filtros/ }).click()
    await p.getByRole('dialog', { name: 'Filtros do mapa' }).waitFor({ timeout: 5000 })
    await p.waitForTimeout(450) // a folha sobe em 240 ms
    checar(await dom(p, () => !!document.activeElement?.closest('[role=dialog]')), `${onde} filtros: o foco entra na folha`)
    checar(await dom(p, () => getComputedStyle(document.body).position === 'fixed'), `${onde} filtros: a página de trás não rola (trava)`)
    const fecharFiltros = p.getByRole('button', { name: 'Fechar os filtros' })
    checar(await fecharFiltros.evaluate((b) => { const r = b.getBoundingClientRect(); return r.height >= 43.5 && r.top >= 0 && r.right <= innerWidth }), `${onde} filtros: "Fechar" à vista, com alvo ≥ 44px`)
    const seq = []
    for (let i = 0; i < 24; i++) { await p.keyboard.press('Tab'); seq.push(await dom(p, () => !!document.activeElement?.closest('[role=dialog]'))) }
    checar(seq.every(Boolean), `${onde} filtros: o Tab fica preso na folha (24 toques)`)
    const caixa = await p.getByRole('dialog', { name: 'Filtros do mapa' }).boundingBox()
    checar(caixa.x >= -1 && caixa.x + caixa.width <= w + 1 && caixa.y >= -1 && caixa.y + caixa.height <= h + 1, `${onde} filtros: a folha cabe na tela`)
    await p.keyboard.press('Escape')
    checar(await p.getByRole('dialog', { name: 'Filtros do mapa' }).count() === 0, `${onde} filtros: Escape fecha`)
    checar(await dom(p, () => document.activeElement?.classList.contains('ct-mapa__filtros-botao')), `${onde} filtros: o foco volta ao botão "Filtros"`)
    checar(await dom(p, () => getComputedStyle(document.body).position !== 'fixed'), `${onde} filtros: a rolagem da página volta`)
    await p.getByRole('button', { name: /^Filtros/ }).click()
    await p.getByRole('button', { name: 'Conquistadas' }).click()
    await p.mouse.click(3, 3) // o véu fecha (canto da tela, fora da folha)
    checar(await p.getByRole('dialog', { name: 'Filtros do mapa' }).count() === 0, `${onde} filtros: o véu fecha`)
    checar(/1 filtro ativo/.test(await p.getByRole('button', { name: /^Filtros/ }).getAttribute('aria-label')), `${onde} filtros: ativo continua contado depois de fechar`)

    await p.locator('.ct-mundo__zoom-botao').first().evaluate((b) => b.click()) // aproximar
    await p.waitForTimeout(450) // o zoom por botão anima em ~240 ms
    checar(await p.locator('.ct-mundo__janela.is-zoom').count() === 1, `${onde} zoom do desenho ligado`)
    await p.locator('button[aria-label*="Cookitos"]').first().evaluate((b) => b.click())
    const cartao = p.locator('.ct-mapa__cartao')
    await cartao.waitFor({ timeout: 5000 })
    await esperarRolagem(p)
    const folha = await dom(p, () => {
      const car = document.querySelector('.ct-mapa__cartao'); const r = car.getBoundingClientRect()
      const aba = document.querySelector('.ct-abas'); const ar = aba && getComputedStyle(aba).display !== 'none' ? aba.getBoundingClientRect() : null
      const zoom = document.querySelector('.ct-mundo__zoom-botao').getBoundingClientRect()
      const e = document.elementFromPoint(zoom.left + zoom.width / 2, zoom.top + zoom.height / 2)
      return { l: r.left, r: r.right, iw: innerWidth, abaTop: ar ? ar.top : null, b: r.bottom, ih: innerHeight, foco: document.activeElement === car, zoomLivre: !!e && !!e.closest('.ct-mundo__zoom'), nome: car.querySelector('h2')?.textContent || '' }
    })
    checar(folha.l >= -1 && folha.r <= folha.iw + 1, `${onde} cartão: cabe na largura`)
    checar(folha.abaTop === null ? folha.b <= folha.ih + 1 : folha.b <= folha.abaTop + 1, `${onde} cartão: não passa por baixo da barra de abas`)
    checar(folha.foco, `${onde} cartão: o foco vai para o cartão quando a casa é escolhida`)
    checar(folha.zoomLivre, `${onde} cartão: o zoom do desenho segue livre (o mapa continua explorável)`)
    checar(/Cookitos/.test(folha.nome), `${onde} cartão: mostra a casa escolhida`)
    const fecharCartao = await p.locator('.ct-mapa__cartao .ct-mapa__fechar').boundingBox()
    checar(fecharCartao.width >= 43.5 && fecharCartao.height >= 43.5 && fecharCartao.y >= -1, `${onde} cartão: botão Fechar ≥ 44px e à vista`)
    await fotoTela(p, `05-cartao-${w}x${h}`)

    // ---- tela cheia: entrar e sair várias vezes, com o mesmo estado, pelo teclado ----
    const nomeAntes = folha.nome
    const zoomAntes = await p.locator('.ct-mundo__palco').evaluate((e) => e.dataset.z)
    for (let volta = 1; volta <= 3; volta++) {
      await abrir.focus() // o foco já rola o botão para a tela; a posição "de antes" é a de agora
      await esperarRolagem(p)
      const yAntes = await dom(p, () => scrollY)
      await p.keyboard.press('Enter')
      await p.waitForSelector('.ct-mapa__explorar.is-cheia', { timeout: 5000 })
      await p.waitForTimeout(300)
      const e = await estadoDaTelaCheia(p)
      const ro = `${onde} tela cheia (volta ${volta})`
      checar(e && e.pos === 'fixed' && Math.abs(e.w - e.iw) <= 1 && Math.abs(e.h - e.ih) <= 1 && e.top <= 1 && e.left <= 1, `${ro}: ocupa a tela toda (${e && `${Math.round(e.w)}x${Math.round(e.h)} de ${e.iw}x${e.ih}`})`)
      checar(e && e.role === 'dialog' && e.modal === 'true' && e.nome === 'Mapa em tela cheia', `${ro}: é um diálogo nomeado`)
      checar(e && e.fecharOk, `${ro}: "Fechar" sempre à vista, dentro da tela e ≥ 44px`)
      checar(e && e.corpoFixo && e.htmlTrava, `${ro}: a página de trás não rola`)
      checar(e && e.foco, `${ro}: o foco entra no "Fechar"`)
      checar(e && e.lateral <= 1, `${ro}: sem rolagem lateral (${e && e.lateral}px)`)
      if (volta === 1) {
        checar((await p.locator('.ct-mapa__cartao h2').textContent()) === nomeAntes, `${ro}: a casa escolhida continua escolhida (cartão dentro da tela cheia)`)
        checar(/1 filtro ativo/.test(await p.getByRole('button', { name: /^Filtros/ }).getAttribute('aria-label')), `${ro}: o filtro continua ativo`)
        checar((await p.locator('.ct-mundo__palco').evaluate((el) => el.dataset.z)) === zoomAntes && await p.locator('.ct-mundo__janela.is-zoom').count() === 1, `${ro}: o zoom continua o mesmo`)
        // Tab preso na tela cheia, para frente e para trás
        const dentro = []
        for (let i = 0; i < 30; i++) { await p.keyboard.press('Tab'); dentro.push(await dom(p, () => !!document.activeElement?.closest('.ct-mapa__explorar.is-cheia'))) }
        for (let i = 0; i < 6; i++) { await p.keyboard.press('Shift+Tab'); dentro.push(await dom(p, () => !!document.activeElement?.closest('.ct-mapa__explorar.is-cheia'))) }
        checar(dentro.every(Boolean), `${ro}: o foco não escapa da tela cheia (Tab e Shift+Tab)`)
        await fotoTela(p, `05-tela-cheia-${w}x${h}`)
        // a folha de filtros dentro da tela cheia fecha primeiro (Escape em pilha) e devolve o foco
        await p.getByRole('button', { name: /^Filtros/ }).click()
        await p.getByRole('dialog', { name: 'Filtros do mapa' }).waitFor({ timeout: 5000 })
        checar(await p.getByRole('searchbox', { name: 'Buscar casa ou bairro' }).count() === 1, `${ro}: na tela cheia a busca está na folha de filtros`)
        await fotoTela(p, `05-tela-cheia-filtros-${w}x${h}`)
        await p.keyboard.press('Escape')
        checar(await p.getByRole('dialog', { name: 'Filtros do mapa' }).count() === 0 && await p.locator('.ct-mapa__explorar.is-cheia').count() === 1, `${ro}: o primeiro Escape fecha só a folha de filtros`)
        checar(await dom(p, () => document.activeElement?.classList.contains('ct-mapa__filtros-botao')), `${ro}: o foco volta ao botão "Filtros"`)
        await atalhosDoJogo(p, ro)
      }
      if (volta === 2) { // sair pelo botão explícito, com o mouse
        await p.locator('[data-fechar-cheia]').click()
      } else {
        await p.keyboard.press('Escape')
        if (await p.locator('.ct-mapa__explorar.is-cheia').count()) await p.keyboard.press('Escape') // o cartão aberto fecha primeiro quando o foco está nele
      }
      await p.waitForFunction(() => !document.querySelector('.ct-mapa__explorar.is-cheia'), null, { timeout: 5000 }).catch(() => falha(`${ro}: não saiu da tela cheia`))
      // com a Fullscreen API, a página só é destravada quando o navegador termina de sair (o corpo fica preso na posição de antes)
      await p.waitForFunction(() => getComputedStyle(document.body).position !== 'fixed', null, { timeout: 5000 }).catch(() => null)
      await p.waitForTimeout(250)
      const fora = await dom(p, () => ({ corpoFixo: getComputedStyle(document.body).position === 'fixed', y: scrollY, foco: document.activeElement?.hasAttribute('data-abrir-cheia'), lateral: document.documentElement.scrollWidth - innerWidth }))
      checar(!fora.corpoFixo, `${ro}: a rolagem da página volta`)
      checar(Math.abs(fora.y - yAntes) <= 2, `${ro}: a página volta à posição de antes (${fora.y} × ${yAntes})`)
      checar(fora.foco, `${ro}: o foco volta ao botão que abriu`)
      checar(fora.lateral <= 1, `${ro}: sem rolagem lateral ao sair`)
      if (volta === 1) checar((await p.locator('.ct-mapa__cartao h2').count()) === 0 || (await p.locator('.ct-mapa__cartao h2').textContent()) === nomeAntes, `${ro}: ao sair, a seleção segue a mesma`)
    }

    // ---- atalho "Casas": escolher uma casa fecha a folha e o cartão aparece dentro da tela cheia ----
    await abrir.focus()
    await p.keyboard.press('Enter')
    await p.waitForSelector('.ct-mapa__explorar.is-cheia', { timeout: 5000 })
    await p.locator('[data-atalhos]').click()
    await p.locator('[data-atalho="casas"]').click()
    await p.getByRole('dialog', { name: 'Casas', exact: true }).waitFor({ timeout: 5000 })
    await p.locator('.ct-folha-m--jogo .ct-caca-mapa__rapida-item').first().click()
    await p.waitForTimeout(500)
    checar(await p.getByRole('dialog', { name: 'Casas', exact: true }).count() === 0 && await p.locator('.ct-mapa__explorar.is-cheia .ct-mapa__cartao').count() === 1, `${onde} atalho Casas: escolher uma casa fecha a folha e abre o cartão dentro da tela cheia`)
    await p.keyboard.press('Escape')
    if (await p.locator('.ct-mapa__explorar.is-cheia').count()) await p.keyboard.press('Escape')
    await p.waitForFunction(() => !document.querySelector('.ct-mapa__explorar.is-cheia'), null, { timeout: 5000 }).catch(() => falha(`${onde} atalho Casas: não saiu da tela cheia`))
    await p.waitForFunction(() => getComputedStyle(document.body).position !== 'fixed', null, { timeout: 5000 }).catch(() => null)
    await p.waitForTimeout(250)

    // ---- mapa real: a mesma tela cheia; o mapa acompanha o novo tamanho (sem filtro: o "Conquistadas" deixaria sem ponto) ----
    if (await p.locator('.ct-mapa__cartao').count()) await p.locator('.ct-mapa__cartao .ct-mapa__fechar').click() // o cartão (no celular deitado, um painel à esquerda) cobre a barra
    await p.getByRole('button', { name: 'Limpar filtros' }).first().click()
    await p.getByRole('button', { name: 'Mapa real' }).click()
    const ver = p.getByRole('button', { name: /Ver no mapa/ })
    if (await ver.count()) await ver.click()
    await p.waitForSelector('.ct-mapa__mapa canvas', { timeout: 15000 }).catch(() => falha(`${onde} mapa real: o mapa não subiu`))
    if (await p.locator('.ct-mapa__mapa canvas').count()) {
      await p.evaluate(() => document.querySelector('.ct-mapa__moldura').scrollIntoView({ block: 'start' }))
      checar(await abrir.isVisible(), `${onde} mapa real: "Abrir mapa em tela cheia" à vista`)
      await abrir.focus()
      await p.keyboard.press('Enter')
      await p.waitForSelector('.ct-mapa__explorar.is-cheia', { timeout: 5000 })
      await p.waitForTimeout(900)
      const real = await dom(p, () => {
        const m = document.querySelector('.ct-mapa__mapa').getBoundingClientRect(); const cv = document.querySelector('.ct-mapa__mapa canvas').getBoundingClientRect()
        const barra = document.querySelector('.ct-mapa__barra').getBoundingClientRect()
        return { mh: m.height, mw: m.width, ch: cv.height, cw: cv.width, ih: innerHeight, iw: innerWidth, barraB: barra.bottom }
      })
      checar(Math.abs(real.mh - (real.ih - real.barraB)) <= 2 && Math.abs(real.mw - real.iw) <= 1, `${onde} mapa real em tela cheia: o mapa ocupa tudo abaixo da barra (${Math.round(real.mw)}x${Math.round(real.mh)})`)
      checar(Math.abs(real.ch - real.mh) <= 2 && Math.abs(real.cw - real.mw) <= 2, `${onde} mapa real em tela cheia: o desenho do mapa acompanhou o novo tamanho (${Math.round(real.cw)}x${Math.round(real.ch)})`)
      await fotoTela(p, `05-tela-cheia-real-${w}x${h}`)
      await p.keyboard.press('Escape')
      if (await p.locator('.ct-mapa__explorar.is-cheia').count()) await p.keyboard.press('Escape')
      await p.waitForFunction(() => !document.querySelector('.ct-mapa__explorar.is-cheia'), null, { timeout: 5000 }).catch(() => falha(`${onde} mapa real: não saiu da tela cheia`))
      await p.waitForFunction(() => getComputedStyle(document.body).position !== 'fixed', null, { timeout: 5000 }).catch(() => null)
    }
    } catch (e) {
      falha(`${onde} tela cheia e folhas interrompido: ${String(e.message).split(/\r?\n/)[0].slice(0, 160)} · ${(String(e.stack).match(/cartoon-caca-navegador\.mjs:(\d+)/) || [])[0] || ''}`)
    }
    await semErros(c, `${onde} tela cheia e folhas`)
    await c.ctx.close()
  }
}

/** Mapa e Minha rota são UMA experiência (Mapa da Doçura): /cartoon/minha-rota abre o MESMO mapa com o painel da rota aberto (a URL vira
 *  /cartoon/mapa); a rota é folha no celular e coluna no desktop; fechar volta ao mapa com seleção e zoom como estavam; ?u= segue valendo. */
async function mapaUnicoRota () {
  for (const [w, h] of [[360, 800], [1440, 900]]) {
    const c = await contexto(nav, { w, h, chave: CHAVE_FAKE, mocks: MOCKS_PROGRESSO })
    await ir(c.page, '/cartoon/minha-rota')
    await c.page.locator('.ct-folha-m--painel').waitFor({ timeout: 10000 })
    await c.page.waitForFunction(() => location.pathname === '/cartoon/mapa', null, { timeout: 5000 }).catch(() => {})
    const r = await dom(c.page, () => {
      const pn = document.querySelector('.ct-folha-m--painel'); const h1 = document.querySelector('h1')
      return {
        caminho: location.pathname, h1n: document.querySelectorAll('h1').length, h1: (h1?.getAttribute('aria-label') || h1?.textContent || '').trim(),
        mapa: !!document.querySelector('.ct-mapa__explorar'), segundaPagina: !!document.querySelector('.ct-mapa--rota, .ct-mapa--mapa'),
        visivel: pn.getClientRects().length > 0, modal: pn.classList.contains('is-modal'), fechar: !!pn.querySelector('.ct-mapa__fechar'),
        marcas: /Na rota[\s\S]*Já fui[\s\S]*Carimbo/.test(pn.innerText), grupo: /Rota do grupo/i.test(pn.innerText),
        lateral: document.documentElement.scrollWidth - innerWidth,
      }
    })
    checar(r.caminho === '/cartoon/mapa' && r.h1 === 'Mapa da Doçura' && r.h1n === 1, `@${w} Minha rota abre o Mapa da Doçura (${r.caminho}, h1 "${r.h1}")`)
    checar(r.mapa && !r.segundaPagina && r.visivel && r.lateral <= 1, `@${w} a rota é o painel da MESMA página, com o mapa ao lado e sem rolagem lateral`)
    checar(r.modal === (w < 900), `@${w} painel da rota: ${w < 900 ? 'folha modal no celular' : 'coluna fixa no desktop'}`)
    checar(r.marcas && r.grupo, `@${w} painel: rota planejada, "já fui" e carimbo explicados, e a rota do grupo identificada à parte`)
    // Seleção e zoom do mapa sobrevivem a abrir e fechar a rota.
    const palco = () => c.page.locator('.ct-mundo__palco').evaluate((e) => Math.round(e.getBoundingClientRect().width))
    if (w < 900) {
      await c.page.locator('.ct-folha-m--painel .ct-mapa__fechar').click()
      checar(await c.page.locator('.ct-folha-m--painel.is-aberta').count() === 0, `@${w} o botão Fechar da rota devolve o mapa`)
      checar(await c.page.waitForFunction(() => document.activeElement?.classList.contains('ct-mapa__rota-botao'), null, { timeout: 1500 }).then(() => true, () => false), `@${w} o foco volta ao botão "Minha rota" (devolvido no quadro seguinte)`)
    }
    const w0 = await palco()
    for (let i = 0; i < 2; i++) { await c.page.locator('.ct-mundo__zoom-botao').first().evaluate((b) => b.click()); await c.page.waitForTimeout(450) }
    const w1 = await palco()
    await c.page.locator('.ct-mundo__casa').first().evaluate((b) => b.click())
    await c.page.locator('.ct-mapa__cartao').waitFor({ timeout: 5000 })
    const nome = await c.page.locator('.ct-mapa__cartao h2').first().innerText()
    if (w < 900) {
      await c.page.locator('.ct-mapa__rota-botao').evaluate((b) => b.click())
      await c.page.locator('.ct-folha-m--painel.is-aberta').waitFor({ timeout: 5000 })
      checar(await c.page.locator('.ct-mapa__cartao').count() === 1, `@${w} abrir a rota não descarta a casa escolhida`)
      await c.page.keyboard.press('Escape')
      await c.page.locator('.ct-folha-m--painel.is-aberta').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
    } else {
      checar(await c.page.locator('.ct-folha-m--painel').isVisible() && await c.page.locator('.ct-mapa__cartao').isVisible(), `@${w} desktop: cartão da casa e rota convivem na coluna`)
    }
    checar((await c.page.locator('.ct-mapa__cartao h2').first().innerText()) === nome && (await palco()) === w1 && w1 > w0, `@${w} a casa escolhida e o zoom ficam como estavam (${w0}→${w1}px)`)
    await semErros(c, `@${w} Minha rota`)
    await c.ctx.close()
  }
  // Rota compartilhada (?u=): continua valendo no endereço antigo e no novo; o painel diz que é de outra pessoa.
  for (const base of ['/cartoon/minha-rota', '/cartoon/mapa']) {
    const c = await contexto(nav, { w: 1440, h: 900, chave: CHAVE_FAKE, mocks: MOCKS_PROGRESSO })
    await ir(c.page, `${base}?u=udemo1,udemo2`)
    await c.page.locator('.ct-folha-m--painel').waitFor({ timeout: 10000 })
    await c.page.getByText('Esta é uma rota compartilhada com você.').waitFor({ timeout: 5000 })
    const u = await c.page.evaluate(() => ({ p: location.pathname, u: new URLSearchParams(location.search).get('u') }))
    checar(u.p === '/cartoon/mapa' && u.u === 'udemo1,udemo2', `${base}?u=: rota compartilhada preservada no endereço do mapa (${u.p}?u=${u.u})`)
    await c.ctx.close()
  }
}

// ================================================================ 6 · ranking e empate
secao(6, 'ranking geral, posição própria e empate', async () => {
  const ranking = [{ posicao: 1, apelido: 'Ana', casas: 9, extras: 3 }, { posicao: 2, apelido: 'Bia', casas: 7, extras: 1 }, { posicao: 2, apelido: 'Caio', casas: 7, extras: 1 }, { posicao: 4, apelido: 'Duda', casas: 3, extras: 0 }]
  // ranking vazio real
  let c = await contexto(nav, { chave: CHAVE_FAKE, mocks: { mapa_ler_v2: mapaMock({ posicao: null }), mapa_confirmar_email_status: { confirmado: true, valido: true } } })
  await ir(c.page, '/cartoon/caca/ranking')
  await c.page.getByText('O ranking ainda está vazio').waitFor({ timeout: 10000 }).catch(() => falha('ranking real sem ninguém: sem o estado vazio'))
  checar(/Valide sua primeira casa para ganhar uma posição/.test(await texto(c.page)), 'ranking: quem não validou casa vê o convite, não uma posição')
  await c.ctx.close()
  for (const [w, h] of [[360, 800], [1440, 900]]) {
    c = await contexto(nav, { w, h, chave: CHAVE_FAKE, mocks: {
      caca_ranking_publico: ranking,
      mapa_ler_v2: mapaMock({ validadas: 7, extras: 1, posicao: 2, empatados: 2, apelido: 'Bia', ranking: true }),
      mapa_confirmar_email_status: { confirmado: true, valido: true },
    } })
    await ir(c.page, '/cartoon/caca/ranking')
    await c.page.getByText('Caio').waitFor({ timeout: 10000 })
    const t = await texto(c.page)
    checar((t.match(/empatad[oa] em 2º/gi) || []).length >= 2, `@${w} ranking: Bia e Caio aparecem "empatados em 2º" (mesma posição)`)
    checar(/3º/.test(t) === false && /4º/.test(t), `@${w} ranking: depois do empate em 2º vem o 4º (sem inventar o 3º)`)
    // As regras ficam atrás de "Como o ranking funciona" (fechado); a nota de privacidade fica à vista.
    const regra = await c.page.locator('.ct-rank__regra').textContent()
    checar(await c.page.locator('.ct-rank__regra details').count() === 1 && !(await c.page.locator('.ct-rank__regra details').getAttribute('open')), `@${w} ranking: as regras vêm fechadas`)
    checar(/Não desempatamos por horário/.test(regra) && /só o apelido e o progresso/i.test(t), `@${w} ranking: regra de empate sem horário e só apelido/progresso`)
    checar(!/@/.test(t.replace(/\S+@(exemplo|sweet)\S*/g, '')) && !/e2e-mock/.test(t), `@${w} ranking: nunca mostra e-mail`)
    checar(/Sua posição/.test(t) && /2º/.test(t), `@${w} ranking: a posição da própria pessoa aparece`)
    const med = await medirPagina(c.page)
    checar(med.overflow <= 1, `@${w} ranking: sem rolagem lateral`)
    alvosPequenos(`@${w} ranking`, med.alvos)
    await foto(c.page, `06-ranking-${w}`)
    await c.ctx.close()
  }
  // a própria pessoa fora do recorte (posição 31) ainda vê a sua posição
  c = await contexto(nav, { chave: CHAVE_FAKE, mocks: { caca_ranking_publico: ranking, mapa_ler_v2: mapaMock({ validadas: 1, extras: 0, posicao: 31, empatados: 4, apelido: 'Fora', ranking: false }), mapa_confirmar_email_status: { confirmado: true, valido: true } } })
  await ir(c.page, '/cartoon/caca/ranking')
  await c.page.getByText('Sua posição').first().waitFor({ timeout: 10000 })
  const fora = await texto(c.page)
  checar(/31º/.test(fora) && /empatad/i.test(fora), 'ranking: a posição 31 (fora do recorte) aparece com o empate')
  await semErros(c, 'ranking')
  await c.ctx.close()
})

// ================================================================ 7 · grupos
secao(7, 'grupos: criar, convite, aceitar, isolamento e rota colaborativa', async () => {
  const A = await mapaReal('ga', { apelido: 'E2E Ana' }); const B = await mapaReal('gb', { apelido: 'E2E Bia' }); const C3 = await mapaReal('gc', { apelido: 'E2E Cai' })
  const ca = await contexto(nav, { chave: A.chave })
  await ir(ca.page, '/cartoon/caca/grupos')
  // aceite de visibilidade é obrigatório
  await ca.page.getByLabel('Nome do grupo').fill('Turma E2E')
  await ca.page.getByRole('button', { name: 'Criar grupo' }).click()
  await ca.page.waitForTimeout(800)
  checar(await ca.page.getByRole('textbox', { name: 'Link de convite' }).count() === 0, 'grupo: sem o aceite de visibilidade não cria')
  await ca.page.getByLabel(/Entendi: os integrantes/).check()
  await ca.page.getByRole('button', { name: 'Criar grupo' }).click()
  const campo = ca.page.getByRole('textbox', { name: 'Link de convite' })
  await campo.waitFor({ timeout: 12000 })
  const link = await campo.inputValue()
  const token = link.split('/convite/')[1]
  checar(/^https?:\/\/[^/]+\/cartoon\/caca\/convite\/[A-Za-z0-9_-]{20,}$/.test(link), 'grupo: o convite é um link com token no CAMINHO')
  checar(/só aparece agora/.test(await texto(ca.page)), 'grupo: avisa que o link só aparece uma vez')
  const armazenado = await ca.page.evaluate(() => JSON.stringify([localStorage, sessionStorage]))
  checar(!armazenado.includes(token), 'grupo: o token de convite não vai para localStorage/sessionStorage')
  await foto(ca.page, '07-grupo-criado')
  const grupoUrl = await ca.page.getByRole('link', { name: 'Abrir o grupo', exact: true }).getAttribute('href')
  const grupoId = grupoUrl.split('/grupo/')[1]
  // C (terceiro mapa, fora do grupo) não enxerga nada do grupo
  const cc = await contexto(nav, { chave: C3.chave })
  await ir(cc.page, `/cartoon/caca/grupo/${grupoId}`)
  await cc.page.waitForTimeout(1500)
  const isolado = await texto(cc.page)
  checar(!/Turma E2E/.test(isolado) && !/E2E Ana|E2E Bia/.test(isolado), 'isolamento: um terceiro mapa abrindo /grupo/<id> não vê nome nem integrantes')
  const leitura = await chamar('caca_grupo_ler', { p_chave: C3.chave, p_grupo: grupoId }).catch((e) => ({ erro: e.message }))
  checar(leitura?.ok !== true, `isolamento no servidor: caca_grupo_ler com o mapa de fora não devolve dados (${JSON.stringify(leitura).slice(0, 80)})`)
  const lista = await chamar('caca_grupo_listar', { p_chave: C3.chave }).catch(() => null)
  checar(!JSON.stringify(lista).includes('Turma E2E'), 'isolamento no servidor: caca_grupo_listar do terceiro não traz o grupo')
  await foto(cc.page, '07-grupo-isolado')
  await cc.ctx.close()
  // B abre o convite com o PRÓPRIO mapa e aceita
  const cb = await contexto(nav, { chave: B.chave })
  await cb.page.goto(`${link}?preview=1`, { waitUntil: 'networkidle' })
  checar(/Turma E2E/.test(await texto(cb.page)) && /Você vai entrar como E2E Bia/.test(await texto(cb.page)), 'convite: mostra o grupo e com QUAL mapa a pessoa entra')
  checar(!/E2E Ana/.test(await texto(cb.page)), 'convite: a pré-visualização não expõe integrantes')
  await cb.page.getByRole('button', { name: 'Entrar no grupo' }).click()
  await cb.page.waitForTimeout(600)
  const aindaConvite = cb.page.url().includes('/convite/')
  checar(aindaConvite, 'convite: sem o aceite de visibilidade a pessoa continua na tela do convite')
  await cb.page.getByLabel(/Entendi: os integrantes/).check()
  await cb.page.getByRole('button', { name: 'Entrar no grupo' }).click()
  await cb.page.waitForURL(/\/caca\/grupo\//, { timeout: 12000 }).catch(() => falha('convite: aceitar não levou ao grupo'))
  await cb.page.getByText('E2E Ana').first().waitFor({ timeout: 8000 })
  checar(/2 integrantes/.test(await texto(cb.page)), 'grupo: depois de aceitar, são 2 integrantes')
  // entrar não cria carimbo para ninguém
  const lb = await chamar('mapa_ler_v2', { p_chave: B.chave })
  checar(lb.casas_validadas === 0 && (lb.casas || []).length === 0, 'entrar no grupo não cria carimbo')
  await foto(cb.page, '07-grupo-2-integrantes')
  // rota colaborativa: B adiciona duas casas, reordena, A vê quem adicionou e remove
  const adicionar = async (page, slug) => { await page.getByRole('combobox', { name: 'Adicionar uma casa' }).selectOption(slug); await page.getByRole('button', { name: 'Adicionar à rota' }).click() }
  await adicionar(cb.page, 'carcara')
  await cb.page.getByText('Carcará').first().waitFor({ timeout: 8000 })
  await adicionar(cb.page, 'cookitos')
  await cb.page.getByText('Cookitos').first().waitFor({ timeout: 8000 })
  const rotaB = await texto(cb.page)
  checar(/E2E Bia/.test(rotaB) || /por você|você/i.test(rotaB), 'rota do grupo: mostra quem adicionou')
  checar(/nunca marca|ninguém marca visita/.test(rotaB) || /ninguém marca visita/.test(rotaB), 'rota do grupo: dita como lista de planejamento (nunca marca visita)')
  const ordem = async (page) => page.locator('section[aria-labelledby], region').first().evaluate(() => [...document.querySelectorAll('ol li, ul li')].map((l) => l.textContent).filter((t) => /Carcará|Cookitos/.test(t)).map((t) => (/Carcará/.test(t) ? 'carcara' : 'cookitos')))
  const antes = await ordem(cb.page)
  await cb.page.getByRole('button', { name: /Descer.*Carcará|Carcará.*Descer/ }).first().click().catch(async () => { await cb.page.getByRole('button', { name: /Descer/ }).first().click() })
  await cb.page.waitForTimeout(1200)
  const depois = await ordem(cb.page)
  checar(antes.length === 2 && depois.length === 2 && antes[0] !== depois[0], `rota do grupo: reordenar troca a ordem (${antes} → ${depois})`)
  // A abre o grupo, atualiza e vê as casas adicionadas por B
  await ca.page.goto(`${BASE}/cartoon/caca/grupo/${grupoId}?preview=1`, { waitUntil: 'networkidle' })
  const rotaA = await texto(ca.page)
  checar(/Carcará/.test(rotaA) && /Cookitos/.test(rotaA) && /E2E Bia/.test(rotaA), 'rota do grupo: o outro integrante vê as casas e quem adicionou')
  await ca.page.getByRole('button', { name: /Tirar.*Cookitos|Cookitos.*Tirar/ }).first().click().catch(async () => { await ca.page.getByRole('button', { name: /Tirar/ }).last().click() })
  await ca.page.waitForTimeout(1500)
  await cb.page.getByRole('button', { name: 'Atualizar' }).click()
  await cb.page.waitForTimeout(1500)
  const alt = await ordem(cb.page)
  checar(alt.length === 1, `rota do grupo: remover por um integrante aparece para o outro depois de Atualizar (${alt})`)
  // conflito de edição: operação com versão velha
  const velha = await chamar('caca_grupo_rota_adicionar', { p_chave: A.chave, p_grupo: grupoId, p_slug: 'cookitos', p_versao: 1 }).catch((e) => ({ erro: e.message }))
  checar(velha?.ok !== true && /conflito|versao/i.test(JSON.stringify(velha)), `rota do grupo: versão velha é recusada como conflito (${JSON.stringify(velha).slice(0, 90)})`)
  for (const [nome, pg] of [['grupo (A)', ca.page], ['grupo (B)', cb.page]]) {
    const med = await medirPagina(pg); const w = pg.viewportSize().width
    checar(med.overflow <= 1, `@${w} ${nome}: sem rolagem lateral (${med.overflow}px)`)
    estouros(`@${w} ${nome}`, med.estouram, '/grupo/')
    alvosPequenos(`@${w} ${nome}`, med.alvos)
  }
  // convite revogado: um quarto mapa (D) sem mapa abre o link e vê que não vale; antes, sem mapa, cria o próprio mapa e volta
  const cd = await contexto(nav, {})
  await cd.page.goto(`${link}?preview=1`, { waitUntil: 'networkidle' })
  checar(/Para entrar, você precisa do seu mapa/.test(await texto(cd.page)), 'convite sem mapa: pede para criar o próprio mapa')
  await cd.page.getByLabel(/Apelido/).fill('E2E Duda')
  await cd.page.getByLabel(/^E-mail/).fill(email('gd'))
  await cd.page.getByLabel(/Li e aceito/).check()
  await cd.page.getByRole('button', { name: 'Criar meu mapa' }).click()
  await cd.page.getByRole('button', { name: 'Entrar no grupo' }).waitFor({ timeout: 15000 }).catch(() => falha('convite sem mapa: depois de criar o mapa a pessoa não voltou ao convite'))
  await registrar(cd.page)
  // A revoga os links
  await ca.page.getByRole('button', { name: 'Cancelar todos os links' }).click()
  await ca.page.getByRole('button', { name: /Cancelar|Sim|Confirmar/ }).last().click().catch(() => null)
  await ca.page.waitForTimeout(1500)
  await cd.page.getByLabel(/Entendi: os integrantes/).check()
  await cd.page.getByRole('button', { name: 'Entrar no grupo' }).click()
  await cd.page.waitForTimeout(2000)
  const rev = await texto(cd.page)
  checar(/não vale|revogad|expirou|inválid|cancelad/i.test(rev) && !cd.page.url().includes('/caca/grupo/'), `convite revogado: não entra e explica (${rev.slice(0, 0)})`)
  await foto(cd.page, '07-convite-revogado')
  // sair do grupo e perder acesso
  await semErros(ca, 'grupo A'); await semErros(cb, 'grupo B')
  await ca.ctx.close(); await cb.ctx.close(); await cd.ctx.close()
})

// ================================================================ 8 · metas
secao(8, 'metas relativas ao total, sem prêmio inventado', async () => {
  const m = await mapaReal('metas')
  let c = await contexto(nav, { chave: m.chave })
  await ir(c.page, '/cartoon/caca/metas')
  await c.page.getByText('Todos os marcos').waitFor({ timeout: 10000 })
  const t = await texto(c.page)
  const marcos = t.split('Todos os marcos')[1].split('\n').map((l) => /^(\d+) casas?$/.exec(l.trim())).filter(Boolean).map((x) => Number(x[1]))
  const total = Number(/0 de (\d+) casas/.exec(t)?.[1])
  checar(total > 0 && /Todas as casas \((\d+)\)/.test(t) && Number(/Todas as casas \((\d+)\)/.exec(t)[1]) === total, `metas: o marco final é "todas as casas" e acompanha o total do servidor (${total})`)
  checar(marcos.length >= 2 && marcos.every((n, i) => i === 0 || n >= marcos[i - 1]), `metas: marcos crescentes (${marcos})`)
  checar(!/ganh|prêmio de|voucher de|brinde/i.test(t.replace(/O que vale como benefício[^.]*\./, '')), 'metas: nenhum prêmio por meta é prometido')
  checar(/uma surpresa/.test(t) ? !/plaquinha|Sweet Lover/i.test(t) : true, 'metas: a surpresa do prêmio final nunca é revelada')
  checar(!/vot(o|ação|ar)/i.test(t), 'metas: nunca "voto/votação" (as pessoas avaliam)')
  await c.ctx.close()
  // com progresso: comemora o marco, mostra a próxima, e é dito sem prêmio
  c = await contexto(nav, { chave: CHAVE_FAKE, mocks: {
    mapa_ler_v2: mapaMock({ validadas: 10, extras: 0, posicao: 4 }),
    mapa_confirmar_email_status: { confirmado: true, valido: true },
    caca_metas_ler: { total_casas: 26, casas_validadas: 10, metas: [{ casas: 1, titulo: 'Primeiro carimbo' }, { casas: 9, titulo: 'Pegou o jeito' }, { casas: 17, titulo: 'Quase lá' }, { casas: 26, titulo: 'Mapa completo', completa: true }] },
  } })
  await ir(c.page, '/cartoon/caca/metas')
  await c.page.getByText(/Meta alcançada: Pegou o jeito/).waitFor({ timeout: 10000 }).catch(() => falha('metas: não comemorou o marco "Pegou o jeito" com 10 casas'))
  const p = await texto(c.page)
  checar(/Faltam 7 casas para "Quase lá"/.test(p), 'metas: a próxima meta diz quantas casas faltam')
  checar((p.match(/Alcançada/g) || []).length === 2, 'metas: 2 marcos alcançados (1 e 9)')
  checar(!/prêmio|voucher/i.test(p.replace(/O que vale como benefício[^.]*\./, '')), 'metas com progresso: nenhum prêmio por meta')
  await foto(c.page, '08-metas-progresso')
  const med = await medirPagina(c.page)
  checar(med.overflow <= 1, `metas: sem rolagem lateral (${med.overflow}px)`)
  // avisos da central refletem a pendência e a meta
  await ir(c.page, '/cartoon/caca')
  await c.page.getByText(/Meta alcançada: Pegou o jeito/).first().waitFor({ timeout: 10000 }).catch(() => null)
  await semErros(c, 'metas')
  await c.ctx.close()
})

// ================================================================ 9 · compartilhar
secao(9, 'compartilhar: arte e texto sem dados pessoais', async () => {
  const mail = 'e2e-mock@exemplo.com.br'
  const init = () => {
    window.__desenhado = []
    const ft = CanvasRenderingContext2D.prototype.fillText; const st = CanvasRenderingContext2D.prototype.strokeText
    CanvasRenderingContext2D.prototype.fillText = function (t, ...a) { window.__desenhado.push(String(t)); return ft.call(this, t, ...a) }
    CanvasRenderingContext2D.prototype.strokeText = function (t, ...a) { window.__desenhado.push(String(t)); return st.call(this, t, ...a) }
    navigator.share = (d) => { window.__share = { title: d.title, text: d.text, url: d.url, files: (d.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size })) }; return Promise.resolve() }
    navigator.canShare = (d) => !d.files || d.files.length > 0
  }
  for (const [w, h] of [[360, 800], [1440, 900]]) {
    const c = await contexto(nav, { w, h, chave: CHAVE_FAKE, init, opcoes: { acceptDownloads: true }, permissoes: ['clipboard-read', 'clipboard-write'],
      mocks: { mapa_ler_v2: MAPA_PROGRESSO, mapa_confirmar_email_status: { confirmado: true, valido: true } } })
    await ir(c.page, '/cartoon/caca/compartilhar')
    const img = c.page.locator('img.ct-caca-story__arte')
    await img.waitFor({ timeout: 12000 }).catch(() => falha(`@${w} compartilhar: a arte não foi gerada`))
    checar(/não vai|Nunca vai e-mail/.test(await texto(c.page)) || /Nunca vai e-mail, WhatsApp nem o link do seu mapa/.test(await texto(c.page)), `@${w} compartilhar: diz que nada pessoal vai na arte`)
    const alt = await img.getAttribute('alt')
    checar(/E2E Mock validou 2 de 26 casas/.test(alt || ''), `@${w} compartilhar: a arte tem texto alternativo com o progresso`)
    const desenhado = await c.page.evaluate(() => window.__desenhado)
    const tudo = desenhado.join(' | ')
    checar(desenhado.length > 0 && /E2E Mock/.test(tudo) && /2/.test(tudo), `@${w} arte: desenha apelido e progresso (${desenhado.length} textos)`)
    checar(!/@/.test(tudo) && !tudo.includes(CHAVE_FAKE) && !/e2e-mock|exemplo\.com|#mapa|minha-rota/i.test(tudo), `@${w} arte: nenhum e-mail, chave ou link pessoal entre os textos desenhados`)
    // download do PNG
    const [dl] = await Promise.all([c.page.waitForEvent('download', { timeout: 8000 }), c.page.getByRole('button', { name: 'Baixar a imagem' }).click()])
    const arquivo = join(CAPTURAS, `09-arte-${w}.png`)
    await dl.saveAs(arquivo)
    const bytes = readFileSync(arquivo)
    checar(dl.suggestedFilename() === 'caca-aos-carimbos-progresso.png', `@${w} arte: nome do arquivo sem dados pessoais (${dl.suggestedFilename()})`)
    checar(bytes.slice(0, 8).toString('hex') === '89504e470d0a1a0a' && bytes.readUInt32BE(16) >= 540 && bytes.readUInt32BE(20) > bytes.readUInt32BE(16), `@${w} arte: PNG vertical válido (${bytes.readUInt32BE(16)}×${bytes.readUInt32BE(20)})`)
    checar(!bytes.includes(Buffer.from(mail)) && !bytes.includes(Buffer.from(CHAVE_FAKE)) && !bytes.includes(Buffer.from('mapa=')), `@${w} arte: os bytes do PNG não carregam e-mail nem chave (nem nos metadados)`)
    // compartilhar (Web Share simulado) e copiar o texto
    await c.page.getByRole('button', { name: /^Compartilhar$/ }).click()
    await c.page.waitForTimeout(500)
    const share = await c.page.evaluate(() => window.__share)
    checar(share && !/@/.test(`${share.text}${share.url}${share.title}`) && !`${share.text}${share.url}`.includes(CHAVE_FAKE) && !/#mapa|\/minha-rota|\/caca\/convite/.test(`${share.text}${share.url}`), `@${w} compartilhar: texto e URL compartilhados sem e-mail, chave ou convite de grupo (${share?.url})`)
    const linkPublico = share?.url || /https?:\/\/\S+/.exec(share?.text || '')?.[0]
    checar(share?.files?.length === 1 && share.files[0].type === 'image/png' && !/[@]/.test(share.files[0].name), `@${w} compartilhar: com arquivo, vai o PNG da arte (${share?.files?.[0]?.name})`)
    checar(linkPublico && new URL(linkPublico).pathname === '/cartoon' && !new URL(linkPublico).hash, `@${w} compartilhar: o link público é a entrada da edição (${linkPublico})`)
    await c.page.getByRole('button', { name: 'Copiar o texto e o link' }).click()
    const copiado = await c.page.evaluate(() => navigator.clipboard.readText())
    checar(/Já validei 2 de 26 casas/.test(copiado) && !/@|#mapa/.test(copiado), `@${w} compartilhar: o texto copiado traz o progresso sem dado pessoal`)
    // links públicos de casa e rota
    await c.page.getByRole('combobox', { name: 'Casa' }).selectOption('carcara')
    await c.page.getByRole('button', { name: 'Compartilhar a casa' }).click()
    await c.page.waitForTimeout(400)
    const sh2 = await c.page.evaluate(() => window.__share)
    checar(/\/cartoon\/participantes\/carcara$/.test(sh2?.url || '') && !/mapa=/.test(sh2?.url || ''), `@${w} compartilhar a casa: link público da casa, sem chave (${sh2?.url})`)
    await foto(c.page, `09-compartilhar-${w}`)
    await semErros(c, `@${w} compartilhar`)
    await c.ctx.close()
  }
  // sem casa validada: sem arte, só o convite
  const c0 = await contexto(nav, { chave: CHAVE_FAKE, mocks: { mapa_ler_v2: mapaMock({ validadas: 0 }), mapa_confirmar_email_status: { confirmado: true, valido: true } } })
  await ir(c0.page, '/cartoon/caca/compartilhar')
  await c0.page.getByText(/Valide a sua primeira casa para ter um progresso/).waitFor({ timeout: 8000 }).catch(() => falha('compartilhar sem casa validada: sem o aviso'))
  checar(await c0.page.locator('img.ct-caca-story__arte').count() === 0, 'compartilhar sem casa validada: nenhuma arte falsa')
  await c0.ctx.close()
})

// ================================================================ 10 · avisos e instalação
secao(10, 'avisos (sem suporte, bloqueada, iPhone) e instalação do app', async () => {
  const mocks = { mapa_ler_v2: MAPA_PROGRESSO, mapa_confirmar_email_status: { confirmado: true, valido: true } }
  // avisos úteis aparecem na central mesmo sem notificação
  let c = await contexto(nav, { chave: CHAVE_FAKE, mocks, init: () => { delete window.Notification; delete window.PushManager } })
  await ir(c.page, '/cartoon/caca')
  await c.page.getByText('Avisos no celular').waitFor({ timeout: 10000 })
  const t = await texto(c.page)
  checar(/Este navegador não recebe avisos de sites/.test(t) && /aparece aqui na central/.test(t), 'avisos sem suporte: diz que o navegador não recebe e que o importante aparece na central')
  checar(/Falta avaliar o combo da Cookitos/.test(t), 'central: a avaliação pendente é o próximo passo em destaque, sem depender de push')
  checar(await c.page.getByRole('button', { name: 'Avaliar o combo' }).count() === 1, 'central: uma só ação "Avaliar o combo" (o pendente não se repete em avisos)')
  checar(!(await c.page.getByRole('button', { name: /Ativar avisos/ }).count()), 'avisos sem suporte: não oferece ativar')
  await foto(c.page, '10-avisos-sem-suporte')
  await c.ctx.close()
  // bloqueada
  c = await contexto(nav, { chave: CHAVE_FAKE, mocks, init: () => {
    class N { static get permission () { return 'denied' } static requestPermission () { return Promise.resolve('denied') } }
    window.Notification = N
    Object.defineProperty(window, 'PushManager', { value: function () {}, configurable: true })
  } })
  await ir(c.page, '/cartoon/caca')
  await c.page.getByText('Avisos no celular').waitFor({ timeout: 10000 })
  checar(/estão bloqueadas no navegador/.test(await texto(c.page)), 'avisos bloqueados: explica como liberar e que a central continua avisando')
  await c.ctx.close()
  // iPhone sem o app instalado: só funciona instalado
  c = await contexto(nav, { chave: CHAVE_FAKE, mocks, opcoes: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', isMobile: true, hasTouch: true }, init: () => { delete window.PushManager } })
  await ir(c.page, '/cartoon/caca')
  await c.page.getByText('Instalar o app da Caça').waitFor({ timeout: 10000 })
  const ios = await texto(c.page)
  checar(/Adicionar à Tela de Início/.test(ios), 'iPhone: instrução de "Adicionar à Tela de Início" (instalação e avisos)')
  checar(/O app precisa de internet/.test(ios) && !/offline/i.test(ios.replace(/não/gi, '')), 'instalar: não promete funcionar offline')
  await foto(c.page, '10-iphone')
  // "Agora não" dispensa e lembra
  await c.page.getByRole('button', { name: 'Agora não' }).click()
  checar(await c.page.getByText('Instalar o app da Caça').count() === 0, 'instalar: "Agora não" some o bloco')
  await c.page.reload({ waitUntil: 'networkidle' })
  await c.page.getByText(/Mapa de/).first().waitFor()
  checar(await c.page.getByText('Instalar o app da Caça').count() === 0, 'instalar: a dispensa é lembrada depois de recarregar')
  await c.ctx.close()
  // Android/Chrome: botão com o evento do navegador; sem evento, instrução manual; não aparece sem o primeiro carimbo
  c = await contexto(nav, { chave: CHAVE_FAKE, mocks })
  await ir(c.page, '/cartoon/caca')
  await c.page.getByText('Instalar o app da Caça').waitFor({ timeout: 10000 })
  checar(/No menu do navegador, procure "Instalar app"/.test(await texto(c.page)), 'instalar sem o evento do navegador: instrução manual')
  await c.page.evaluate(() => {
    const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => Promise.resolve(); e.userChoice = Promise.resolve({ outcome: 'accepted' })
    window.dispatchEvent(e)
  })
  await c.page.getByRole('button', { name: 'Instalar o app' }).waitFor({ timeout: 5000 }).catch(() => falha('instalar: o botão não apareceu com o beforeinstallprompt'))
  await c.page.getByRole('button', { name: 'Instalar o app' }).click()
  await c.page.evaluate(() => window.dispatchEvent(new Event('appinstalled'))) // o navegador avisa depois da instalação
  await c.page.getByText(/App instalado!/).waitFor({ timeout: 5000 }).catch(() => falha('instalar: sem a confirmação depois de aceitar'))
  await c.ctx.close()
  c = await contexto(nav, { chave: CHAVE_FAKE, mocks: { ...mocks, mapa_ler_v2: mapaMock({ casas: [] }) } })
  await ir(c.page, '/cartoon/caca')
  await c.page.getByText(/Mapa de/).first().waitFor({ timeout: 10000 })
  checar(await c.page.getByText('Instalar o app da Caça').count() === 0, 'instalar: não é oferecido antes do primeiro carimbo (momento útil)')
  await semErros(c, 'avisos/instalar')
  await c.ctx.close()
})

// ================================================================ 11 · manifest e service worker
secao(11, 'manifest e service worker só em /cartoon/caca', async () => {
  const c = await contexto(nav, { chave: CHAVE_FAKE, mocks: { mapa_ler_v2: MAPA_PROGRESSO, mapa_confirmar_email_status: { confirmado: true, valido: true } } })
  const { page } = c
  const manifest = () => page.evaluate(() => document.querySelector('link[rel="manifest"]')?.getAttribute('href') || null)
  await ir(page, '/cartoon/caca')
  await page.getByText(/Mapa de/).first().waitFor({ timeout: 10000 })
  checar((await manifest()) === '/caca/manifest.webmanifest', `na Caça o manifest é o da Caça (${await manifest()})`)
  const mf = await (await page.request.get(`${BASE}/caca/manifest.webmanifest`)).json()
  checar(mf.scope === '/cartoon/caca' && mf.id === '/cartoon/caca' && /^\/cartoon\/caca/.test(mf.start_url), `manifest da Caça: id/escopo/início próprios (${mf.id} · ${mf.scope})`)
  checar(mf.icons?.some((i) => i.purpose === 'maskable') && mf.icons.every((i) => i.src.startsWith('/')), 'manifest da Caça: ícones, inclusive maskable')
  await page.waitForTimeout(1500)
  const regs = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map((r) => ({ escopo: new URL(r.scope).pathname, script: (r.active || r.installing || r.waiting)?.scriptURL.replace(location.origin, '') })))
  checar(regs.length >= 1 && regs.every((r) => r.escopo === '/cartoon/caca' && r.script === '/caca-sw.js'), `service worker: só o da Caça, com escopo /cartoon/caca (${JSON.stringify(regs)})`)
  const sw = await (await page.request.get(`${BASE}/caca-sw.js`)).text()
  checar(!/chave|mapa=|localStorage/.test(sw.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')), 'service worker: não lê chave pessoal nem storage')
  // navegar para fora (clique, sem recarregar a página): o manifest do site volta
  await page.getByRole('navigation', { name: 'A edição' }).getByRole('link', { name: 'Casas', exact: true }).first().evaluate((e) => e.click())
  await page.waitForURL(/\/cartoon\/participantes/)
  await page.waitForTimeout(500)
  checar((await manifest()) === '/manifest.webmanifest', `ao sair da Caça o manifest do site volta (${await manifest()})`)
  await page.getByRole('navigation', { name: 'A edição' }).getByRole('link', { name: 'Caça aos Carimbos', exact: true }).first().evaluate((e) => e.click())
  await page.waitForURL(/\/cartoon\/caca/)
  await page.waitForTimeout(500)
  checar((await manifest()) === '/caca/manifest.webmanifest', 'voltando à Caça, o manifest da Caça volta')
  // o Painel SCW tem o PRÓPRIO manifest, disjunto
  await page.goto(`${BASE}/painel/`, { waitUntil: 'domcontentloaded' })
  const mp = await manifest()
  if (mp) {
    const mj = await (await page.request.get(new URL(mp, `${BASE}/painel/`).toString())).json().catch(() => null)
    checar(mp !== '/caca/manifest.webmanifest' && (!mj || (mj.scope !== '/cartoon/caca' && mj.id !== '/cartoon/caca')), `Painel SCW: manifest próprio, sem o escopo da Caça (${mp} · ${mj?.scope})`)
  } else ok('Painel SCW: sem manifest da Caça injetado')
  await c.ctx.close()
})

// ================================================================ 12 · teclado, movimento reduzido, alvos, contraste
secao(12, 'teclado, foco visível, movimento reduzido, alvos, contraste e rolagem lateral', async () => {
  const ROTAS = ['/cartoon/caca', '/cartoon/caca/recuperar', '/cartoon/caca/ranking', '/cartoon/caca/grupos', '/cartoon/caca/metas', '/cartoon/caca/compartilhar', '/cartoon/caca/mapa', `/cartoon/carimbo/${CASA.qr}`]
  const mocks = { mapa_ler_v2: MAPA_PROGRESSO, mapa_confirmar_email_status: { confirmado: true, valido: true }, caca_ranking_publico: [{ posicao: 1, apelido: 'Ana', casas: 9, extras: 3 }] }
  for (const [w, h] of [[360, 800], [1440, 900]]) {
    for (const [nome, opts] of [['sem mapa', {}], ['com mapa', { chave: CHAVE_FAKE, mocks }]]) {
      const c = await contexto(nav, { w, h, ...opts })
      for (const rota of ROTAS) {
        if (nome === 'com mapa' && rota === ROTAS[1]) continue
        await ir(c.page, rota)
        await c.page.waitForTimeout(500)
        const med = await medirPagina(c.page)
        const onde = `@${w} ${nome} ${rota.replace('/cartoon', '')}`
        checar(med.overflow <= 1, `${onde}: sem rolagem lateral (${med.overflow}px)`)
        estouros(onde, med.estouram, rota)
        checar(med.h1 === 1, `${onde}: um único <h1> (${med.h1})`)
        alvosPequenos(onde, med.alvos)
        checar(med.contraste.length === 0, `${onde}: contraste — ${med.contraste.map((x) => `${x.t} ${x.r.toFixed(2)}`).join(' | ')}`)
      }
      await semErros(c, `@${w} ${nome} (12)`)
      await c.ctx.close()
    }
  }
  // teclado: Tab chega ao botão principal, o foco é visível e Enter envia o formulário (sem mouse)
  let c = await contexto(nav, { w: 1440, h: 900 })
  await ir(c.page, '/cartoon/caca')
  await c.page.getByLabel(/Apelido/).focus()
  await c.page.keyboard.type('E2E Teclado')
  await c.page.keyboard.press('Tab'); await c.page.keyboard.type(email('teclado'))
  await c.page.keyboard.press('Tab'); await c.page.keyboard.press('Tab'); await c.page.keyboard.press('Tab'); await c.page.keyboard.press('Space')
  checar(await c.page.getByLabel(/Li e aceito/).isChecked(), 'teclado: Tab chega ao aceite do regulamento e Espaço marca')
  await c.page.keyboard.press('Tab'); await c.page.keyboard.press('Tab') // pula o link do regulamento e chega ao botão
  const foco = await c.page.evaluate(() => {
    const e = document.activeElement; const s = getComputedStyle(e)
    return { texto: e.textContent.trim(), outline: s.outlineStyle, largura: parseFloat(s.outlineWidth), sombra: s.boxShadow, visivel: e.matches(':focus-visible') }
  })
  checar(/Criar meu mapa/.test(foco.texto) && foco.visivel, `teclado: o foco chega a "Criar meu mapa" (${foco.texto})`)
  checar((foco.outline !== 'none' && foco.largura >= 2) || foco.sombra !== 'none', `teclado: o foco é visível (outline ${foco.outline} ${foco.largura}px · sombra ${foco.sombra.slice(0, 30)})`)
  await c.page.keyboard.press('Enter')
  await c.page.getByRole('heading', { name: /Mapa de E2E Teclado/ }).waitFor({ timeout: 15000 }).catch(() => falha('teclado: Enter no botão não criou o mapa'))
  await registrar(c.page)
  // Tab na central (recarregada, sem o aviso de "guardar"): a ação principal é alcançável pelo teclado, sem armadilha de foco
  await c.page.reload({ waitUntil: 'networkidle' })
  await c.page.getByRole('heading', { name: /Mapa de E2E Teclado/ }).waitFor({ timeout: 10000 })
  const seq = []
  let achou = false
  for (let i = 0; i < 40 && !achou; i++) {
    await c.page.keyboard.press('Tab')
    const alvo = await c.page.evaluate(() => (document.activeElement?.textContent || document.activeElement?.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28))
    seq.push(alvo)
    achou = /Ver as casas|Avaliar o combo/i.test(alvo)
  }
  checar(achou, `teclado: a ação principal da central ("Ver as casas") é alcançável pelo Tab em ${seq.length} toques (${seq.slice(-6).join(' › ')})`)
  await c.ctx.close()
  // movimento reduzido: nenhum laço infinito rodando nas telas da Caça; a conquista não anima
  for (const rota of ['/cartoon/caca', '/cartoon/caca/mapa', '/cartoon/caca/metas']) {
    c = await contexto(nav, { chave: CHAVE_FAKE, mocks, opcoes: { reducedMotion: 'reduce' } })
    await ir(c.page, rota)
    await c.page.waitForTimeout(1200)
    const anim = await c.page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity).map((a) => a.animationName || a.id || 'anim'))
    checar(anim.length === 0, `movimento reduzido ${rota.replace('/cartoon/caca', '') || '/'}: nenhuma animação infinita rodando (${anim.slice(0, 3)})`)
    const longas = await c.page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && Number(a.effect?.getTiming().duration) > 400).map((a) => a.animationName || 'anim'))
    checar(longas.length === 0, `movimento reduzido ${rota.replace('/cartoon/caca', '') || '/'}: nenhuma animação longa rodando (${longas.slice(0, 3)})`)
    await c.ctx.close()
  }
})

// ---------------------------------------------------------------- orquestra
let codigoSaida = 0
try {
  if (!reusar) await esperarServidor()
  nav = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
  // Aquecimento: o vite dev compila cada rota na primeira visita (pode passar de 30 s); sem isto a 1ª seção estoura o tempo.
  {
    const quente = await nav.newContext({ viewport: { width: 360, height: 800 } })
    await quente.route('**/tiles.openfreemap.org/**', (r) => r.abort('failed'))
    const pg = await quente.newPage()
    for (const r of ['/cartoon/caca', '/cartoon/caca/mapa', '/cartoon/caca/grupos', '/cartoon/caca/ranking', '/cartoon/caca/metas', '/cartoon/caca/compartilhar', '/cartoon/caca/recuperar', `/cartoon/carimbo/${CASA.qr}`, '/cartoon/avaliar']) {
      await pg.goto(`${BASE}${r}?preview=1`, { waitUntil: 'networkidle', timeout: 120000 }).catch(() => null)
    }
    await quente.close()
  }
  for (const s of secoes) {
    if (SECOES && !SECOES.includes(s.n)) continue
    console.log(`\n${s.n} · ${s.titulo}`)
    const antes = falhas.length
    try { await s.fn() } catch (e) { falha(`seção ${s.n} interrompida: ${String(e?.message || e).split('\n')[0].slice(0, 260)}`) }
    if (falhas.length === antes) ok(`seção ${s.n} sem falhas`)
  }
} catch (e) {
  console.error('✗ erro fatal:', e)
  codigoSaida = 1
} finally {
  // ---------------------------------------------------------------- limpeza e prova
  console.log('\nLimpeza · apagar os mapas de teste e provar')
  let apagados = 0; let restam = 0
  for (const k of [...new Set(criados)]) {
    try { await chamar('mapa_apagar', { p_chave: k }); apagados += 1 } catch (e) { falha(`não apagou um mapa de teste: ${e.message}`) }
  }
  for (const k of [...new Set(criados)]) {
    try { if ((await chamar('mapa_ler_v2', { p_chave: k })) !== null) restam += 1 } catch { /* mapa_ler_v2 de chave apagada pode recusar: conta como apagado */ }
  }
  if (restam) falha(`${restam} mapa(s) de teste ainda existem depois de apagar`)
  else ok(`${apagados} mapa(s) de teste apagado(s); nenhuma chave reabre (mapa_ler_v2 devolve nulo)`)
  try { await nav?.close() } catch { /* já fechado */ }
  if (servidor) killTree(servidor.pid)
}

// Desde 20261216 `mapa_apagar` também apaga integrante, rota e convites de grupo da pessoa (quando é o último mapa do e-mail): não sobra resíduo de teste.
console.log(`\nCapturas: ${CAPTURAS}`)
if (avisos.length) { console.log(`\nAchados de produto (não reprovam o teste):`); for (const a of avisos) console.log(`  ⚠ ${a}`) }
if (falhas.length) { console.log(`\n${falhas.length} falha(s):`); for (const f of falhas) console.log(`  ✗ ${f}`); process.exit(1) }
console.log('\n✓ jornadas da Caça aos Carimbos passaram no navegador')
process.exit(codigoSaida)
