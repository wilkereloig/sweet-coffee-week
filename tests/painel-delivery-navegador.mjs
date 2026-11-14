/*
 * Carimbo de delivery no painel, no navegador de verdade contra o BUILD (servidor estático com o rewrite /painel/ → painel-app), com
 * backend e Realtime FALSOS (tests/helpers/backend-falso.mjs): nada chega ao Supabase.
 *   D1 casa: botão no balcão, código errado/vencido/usado/de outra casa em frases claras, conferir → confirmar
 *   D2 organização: delivery com código aparece como "Aguardando a casa" SEM botões; com imagem tem Ver imagem/Aprovar/Negar
 *   node tests/painel-delivery-navegador.mjs [<pasta do build>]    CAPTURAS=<pasta> grava imagens
 */
import { chromium } from 'playwright'
import { execSync } from 'node:child_process'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname, normalize } from 'node:path'
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { criarBackend, criarRealtime, sessaoGuardada, dormir } from './helpers/backend-falso.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5249
const BASE = `http://localhost:${PORT}`
const UID = 'u-marca-0001'
const PID = '99999999-0000-4000-8000-000000000001'
const PA = 'pa-1'
const UID_ORG = 'u-admin-0001'
const EMAIL_ORG = 'admin.teste@equipe.sweetcoffeeweek.com.br'
const CAPTURAS = process.env.CAPTURAS || ''
const TODAS = ['dado.ler', 'producao.gerir', 'relatorio.ler', 'curadoria.decidir', 'redes.ver', 'acesso.gerir']
const falhas = []
const ok = (cond, msg) => { if (cond) console.log('  ✓ ' + msg); else { falhas.push(msg); console.log('  ✗ ' + msg) } }

let dir = process.argv[2]
if (!dir) { dir = join(tmpdir(), `scw-pdlv-${Date.now().toString(36)}`); execSync(`npx vite build --outDir "${dir}" --emptyOutDir`, { cwd: dirname(__dirname), stdio: 'ignore' }) }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' }
const servidor = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, BASE).pathname)
  if (p === '/painel/' || p === '/painel') p = '/painel-app/index.html'
  let f = normalize(join(dir, p))
  if (!f.startsWith(normalize(dir)) || !existsSync(f) || statSync(f).isDirectory()) f = join(dir, 'painel-app', 'index.html')
  res.setHeader('Content-Type', MIME[extname(f)] || 'application/octet-stream')
  res.end(readFileSync(f))
})
await new Promise((r) => servidor.listen(PORT, r))

const itens = () => [
  { id: 'i1', participacao_id: PA, posicao: 1, tipo: 'doce', nome: 'Bolo de cenoura', descricao: 'Com cobertura' },
  { id: 'i2', participacao_id: PA, posicao: 2, tipo: 'salgado', nome: 'Coxinha', descricao: 'Frango cremoso' },
  { id: 'i3', participacao_id: PA, posicao: 3, tipo: 'bebida', nome: 'Café', descricao: 'Coado' },
]
const participacao = { id: PA, participante_id: PID, edicao_codigo: '2026.2', status_cadastro: 'em_preenchimento', combo_status: 'rascunho', tema_combo: 'Divertida Mente', tema_justificativa: 'Emoções', logo_id: 'l1', foto_liberacao: 'liberado', created_at: '2026-09-01T00:00:00Z' }

async function abrirMarca(nav, viewport) {
  const ctx = await nav.newContext({ viewport: { width: viewport[0], height: viewport[1] } })
  const b = criarBackend(); const rt = criarRealtime()
  b.tabelas.perfis = () => [{ deve_trocar_senha: false, ativo: true, bloqueado_em: null }]
  b.tabelas.participantes = () => [{ id: PID, nome_marca: 'Doce Sol', responsavel: 'Ana', telefone: '84999998888', slug: 'docesol', user_id: UID, created_at: '2026-09-01T00:00:00Z' }]
  b.tabelas.participacoes = () => [participacao]
  b.tabelas.participantes_itens = () => itens()
  b.tabelas.participacao_unidades = () => [{ id: 'pu1', participacao_id: PA, unidade_id: 'un1', id_publico: 'u1', participa: true, consumo_local: 'sim', retirada: 'sim', delivery_combo: 'sim', ordem: 1, endereco: 'Rua A, 10', horarios: 'Ter a dom, 10h às 22h', horario_festival: [] }]
  b.tabelas.unidades = () => [{ id: 'un1', logradouro: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'Natal', uf: 'RN', nome_unidade: 'Centro' }]
  b.tabelas.correcoes_campo = () => []
  b.tabelas.edicoes = () => [{ codigo: '2026.2', nome: 'Cartoon', tema: 'Cartoon', festival_inicio: '2026-11-05', festival_fim: '2026-11-15', valor_combo: 25 }]
  b.tabelas.notificacoes = () => []
  b.tabelas.sessoes_fotos = () => []
  b.tabelas.arquivos = () => []
  b.tabelas.arquivo_leitura = () => []
  b.tabelas.solicitacoes = () => []
  b.tabelas.solicitacao_estado = () => []
  b.rpcs.sync_meus_canais = () => ['scw:pessoa:' + UID, 'scw:marcas', 'scw:marca:' + PID]
  b.rpcs.marca_minha_logo = () => ({ atual: { id: 'l1' }, versoes: [] })
  b.rpcs.marca_previa_publica = () => ({ previa: {}, faltando: [] })
  b.rpcs.marca_meus_vouchers = () => ({ total: 7, distribuidos: 3, utilizados: [], virtuais: { total: 2, distribuidos: 1 } })
  b.rpcs.marca_minha_publicacao = () => ({ estado: 'nao_publicado', alterado_apos_aprovacao: false })
  await b.instalar(ctx); await rt.instalar(ctx)
  await ctx.addInitScript((s) => { localStorage.setItem('scw_marca', s); localStorage.setItem('scw_tour_marca_99999999-0000-4000-8000-000000000001', '1'); localStorage.setItem('scw_convite_aparelho_marca_99999999-0000-4000-8000-000000000001', String(Date.now())) }, sessaoGuardada(UID, 'docesol@marca.sweetcoffeeweek.com.br'))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  return { ctx, page, erros, b }
}

async function abrirOrg(nav, permissoes, viewport) {
  const ctx = await nav.newContext({ viewport: { width: viewport[0], height: viewport[1] } })
  const b = criarBackend(); const rt = criarRealtime()
  b.rpcs.minhas_permissoes = () => [{ acoes: permissoes, funcao: 'administrador', rotulo: 'Administrador', ativo: true, deve_trocar_senha: false }]
  b.rpcs.meu_perfil = () => ({ user_id: UID_ORG, nome: 'Admin Teste', funcao: 'administrador', funcao_rotulo: 'Administrador' })
  b.rpcs.equipe_diretorio = () => [{ user_id: UID_ORG, nome: 'Admin Teste', funcao: 'administrador', funcao_rotulo: 'Administrador', avatar_path: null }]
  b.rpcs.admin_ping = () => true
  b.rpcs.sync_meus_canais = () => ['scw:org', 'scw:social', 'scw:pessoa:' + UID_ORG]
  for (const n of ['get_notificacoes_org', 'get_quero_participar', 'get_participantes', 'get_temas', 'get_solicitacoes_admin', 'get_conversas', 'get_atividade', 'get_revisao', 'get_combos_em_analise']) b.rpcs[n] = () => []
  b.rpcs.get_edicoes = () => [{ codigo: '2026.2', atual: true, festival_inicio: '2026-11-05', festival_fim: '2026-11-15', cronograma: [] }]
  b.rpcs.redes_resumo = () => ({ hoje: 0, proximas: 0, atrasadas: 0, minhas: 0, sem_responsavel: 0, sem_data: 0, sem_arte: 0, sem_legenda: 0, aprovacao: 0, aprovadas: 0, ajuste: 0, proximos_itens: [] })
  await b.instalar(ctx); await rt.instalar(ctx)
  await ctx.addInitScript((s) => { if (!localStorage.getItem('scw_org_conta') && s) localStorage.setItem('scw_org_conta', s) }, sessaoGuardada(UID_ORG, EMAIL_ORG))
  await ctx.addInitScript((u) => { localStorage.setItem('scw_convite_aparelho_organizacao_' + u, String(Date.now())); localStorage.setItem('scw_tour_organizacao_Admin Teste', '1') }, UID_ORG)
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
  await page.getByRole('button', { name: 'Pular tour' }).click({ timeout: 1500 }).catch(() => {})
  await dormir(300)
}
async function capturar(page, nome) {
  if (!CAPTURAS) return
  mkdirSync(CAPTURAS, { recursive: true })
  await page.screenshot({ path: join(CAPTURAS, nome + '.png'), fullPage: true })
}
const horizontal = (page) => page.evaluate(() => { const e = document.querySelector('.pn-vista') || document.querySelector('.og-vista') || document.documentElement; return e.scrollWidth <= e.clientWidth + 1 })
const PEDIDO = { apelido: 'Ana', unidade: 'Centro', pedido_data: '2026-11-05', pedido_ref: '#9', avaliou: false, criado_em: '2026-11-05T20:00:00Z', expira_em: '2026-11-06T20:00:00Z' }

async function principal() {
  let nav
  try {
    nav = await chromium.launch()
    for (const [w, h, nome] of [[390, 844, 'celular'], [1280, 900, 'desktop']]) {
      console.log(`D1 casa (${nome}): botão no balcão e fluxo conferir → confirmar`)
      const { ctx, page, erros, b } = await abrirMarca(nav, [w, h])
      const visto = { codigo: null }
      b.rpcs.caca_delivery_consultar = (c) => (c.p_codigo === 'ABC123' ? { ok: true, pedido: PEDIDO } : c.p_codigo === 'OLD111' ? { ok: false, motivo: 'codigo_expirado' } : c.p_codigo === 'USD222' ? { ok: false, motivo: 'codigo_usado' } : { ok: false, motivo: 'codigo_invalido' })
      b.rpcs.caca_delivery_confirmar = (c) => { visto.codigo = c.p_codigo; return { ok: true, estado: 'aprovado', carimbo_id: 'k1' } }
      await irPara(page, '#inicio')
      const botoes = await page.evaluate(() => [...document.querySelectorAll('.bal-acao')].map((e) => ({ t: e.innerText.trim(), h: Math.round(e.getBoundingClientRect().height) })))
      ok(botoes.some((x) => /Confirmar carimbo de delivery/.test(x.t)), 'o balcão tem o botão "Confirmar carimbo de delivery"')
      ok(botoes.every((x) => x.h >= 44), 'alvos de toque com 44px ou mais (' + botoes.map((x) => x.h).join(',') + ')')
      await page.getByRole('button', { name: /Confirmar carimbo de delivery/ }).click()
      await dormir(500)
      const campo = page.getByLabel('Código que o cliente enviou')
      ok(await campo.count() === 1, 'abre o painel com o campo do código')
      ok(/Nunca peça o link nem a chave do mapa/.test(await textoDe(page)), 'avisa para nunca pedir o link nem a chave')
      await capturar(page, `casa-${nome}-1-campo`)
      for (const [cod, re, rotulo] of [['xxx111', /não é desta casa ou não existe/i, 'código de outra casa ou inexistente'], ['old111', /venceu/i, 'código vencido'], ['usd222', /já foi usado/i, 'código já usado']]) {
        await campo.fill(cod); await page.getByRole('button', { name: 'Conferir pedido' }).click(); await dormir(500)
        ok(re.test(await textoDe(page)), rotulo + ' → frase clara')
      }
      ok((b.chamadas.caca_delivery_confirmar || 0) === 0, 'nenhuma tentativa errada confirma carimbo')
      await campo.fill('abc-123'); await page.getByRole('button', { name: 'Conferir pedido' }).click(); await dormir(500)
      const t = await textoDe(page)
      ok(/Ana/.test(t) && /Centro/.test(t) && /5\/11\/2026/.test(t) && /#9/.test(t) && /Ainda não avaliou/.test(t), 'mostra só o essencial do pedido')
      ok(!/@|whatsapp/i.test(await page.locator('[aria-label="Dados do pedido"]').innerText()), 'não mostra e-mail nem telefone do cliente')
      ok((b.chamadas.caca_delivery_confirmar || 0) === 0, 'conferir não cria carimbo')
      await capturar(page, `casa-${nome}-2-pedido`)
      await page.getByRole('button', { name: 'Confirmar entrega' }).click(); await dormir(600)
      ok(visto.codigo === 'ABC123', 'confirmar manda o código normalizado (ABC123)')
      const fim = await textoDe(page)
      ok(/Carimbo registrado para o cliente/.test(fim) && /depois que o cliente avaliar/.test(fim), 'sucesso diz que a casa só vale depois da avaliação')
      ok(await horizontal(page), 'sem rolagem lateral')
      await capturar(page, `casa-${nome}-3-confirmado`)
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }

    console.log('D2 organização: fila de pedidos com delivery')
    {
      const { ctx, page, erros, b } = await abrirOrg(nav, TODAS, [1280, 900])
      const base = { criado_em: '2026-11-05T21:00:00Z', apelido: 'Ana', casa: 'Doce Sol', slug: 'docesol', avaliou: false, carimbos_na_casa: 0, pedidos_da_pessoa: 1, unidades_na_casa: 1, motivo: 'delivery', pedido_data: '2026-11-05' }
      b.rpcs.caca_excecao_listar = () => ({ pendentes: 1, aguardando_casa: 2, pendentes_delivery: 1, itens: [
        { ...base, id: 'e-img', estado: 'pendente', via: 'imagem', pedido_ref: 'R1', imagem: '2026.2/e/i.webp' },
        { ...base, id: 'e-casa', estado: 'pendente', via: 'casa', aguardando_casa: true, apelido: 'Bia' },
        { ...base, id: 'e-exp', estado: 'pendente', via: 'casa', aguardando_casa: true, codigo_expirado: true, apelido: 'Caio' },
      ] })
      await irPara(page, '#edicao/carimbos?sub=presenca')
      await page.waitForSelector('table', { timeout: 20000 })
      const linhas = await page.evaluate(() => [...document.querySelectorAll('tbody tr')].map((tr) => ({ t: tr.innerText, botoes: [...tr.querySelectorAll('button')].map((x) => x.innerText.trim()) })))
      const img = linhas.find((l) => /Ana/.test(l.t)); const casa = linhas.find((l) => /Bia/.test(l.t)); const exp = linhas.find((l) => /Caio/.test(l.t))
      ok(img && img.botoes.includes('Aprovar') && img.botoes.includes('Negar') && img.botoes.includes('Ver imagem'), 'delivery com imagem: Ver imagem, Aprovar e Negar')
      ok(casa && casa.botoes.length === 0 && /Aguardando a casa/.test(casa.t), 'delivery com código: "Aguardando a casa" e nenhum botão para a organização')
      ok(exp && exp.botoes.includes('Aprovar') && exp.botoes.includes('Negar') && /Código vencido/.test(exp.t), 'código vencido: rótulo "Código vencido" com Aprovar e Negar da organização')
      ok(img && /Delivery/.test(img.t) && /sem prova de local/.test(img.t), 'motivo "Delivery" e aviso de que não há prova de local')
      ok(await horizontal(page), 'sem rolagem lateral')
      await capturar(page, 'org-fila-delivery')
      ok(erros.length === 0, 'sem erro de JavaScript ' + erros.join(' | ').slice(0, 160))
      await ctx.close()
    }
  } finally {
    await nav?.close()
    servidor.close()
  }
  if (falhas.length) { console.error(`\n✗ ${falhas.length} falha(s)`); process.exit(1) }
  console.log('\n✓ delivery (painel) ok')
}
principal().catch((e) => { console.error(e); process.exit(1) })
