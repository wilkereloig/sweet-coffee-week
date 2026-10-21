/*
 * Arrastar arquivo até uma pasta NA BIBLIOTECA, no navegador real (21/10/2026): painel real (Vite) contra
 * backend e Realtime FALSOS — nada vai ao Supabase. Mouse de verdade e TOQUE de verdade (CDP).
 *
 *   node tests/painel-biblioteca-arrastar-navegador.mjs        (rodar de dentro de `tests/`: o Playwright mora lá)
 *
 * Também cobre a COR da pasta (escolher na paleta, marcar a atual, voltar ao padrão).
 * Cobre: soltar na pasta move (mesma RPC de "Mover para…"); clique simples ainda abre a prévia; soltar fora e Esc
 * não movem; seleção arrasta junto; atalho "Sem pasta"/caminho como alvo; toque só pela alça (corpo do cartão não
 * arrasta); sem `redes.gerir` não há alça nem arrasto.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { criarBackend, criarRealtime, sessaoGuardada, dormir } from './helpers/backend-falso.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5236
const BASE = `http://localhost:${PORT}`
const UID = 'u-admin-0001'
const EMAIL = 'admin.teste@equipe.sweetcoffeeweek.com.br'
const BASE_PERMISSOES = ['dado.ler', 'redes.ver', 'redes.editar', 'redes.arquivos', 'editorial.ler']
const falhas = []
const ok = (cond, msg) => { if (cond) console.log('  ✓ ' + msg); else { falhas.push(msg); console.log('  ✗ ' + msg) } }
const matar = (pid) => { if (!pid) return; try { if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL') } catch { /* já morto */ } }
async function esperarServidor(url, ms = 60000) {
  const t = Date.now()
  while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return } catch { /* subindo */ } await dormir(400) }
  throw new Error('servidor de desenvolvimento não respondeu')
}

const PASTAS = [
  { id: 'p1', pai_id: null, nome: 'Pasta Um', n_itens: 0, n_itens_todos: 0, n_pastas: 0, criada_em: '2026-10-21T10:00:00Z' },
  { id: 'p2', pai_id: null, nome: 'Pasta Dois', n_itens: 0, n_itens_todos: 0, n_pastas: 0, criada_em: '2026-10-21T10:01:00Z' },
]
const ITENS = ['a1', 'a2', 'a3'].map((id, i) => ({
  tipo: 'arte', id, bucket: 'redes', path: 'x/' + id + '.png', nome: 'Arte ' + id.toUpperCase() + '.png', mime: 'image/png', largura: 1080, altura: 1350,
  situacao: 'disponivel', vinculo: 'Biblioteca', criado_em: '2026-10-21T1' + i + ':00:00Z', pasta_id: null,
}))

/* Backend com as pastas e os arquivos; cada mover atualiza o estado (a lista seguinte já vem sem o que saiu). */
function montar(permissoes) {
  const b = criarBackend(); const rt = criarRealtime()
  const onde = new Map(ITENS.map((x) => [x.id, null])) // id → pasta
  const movidos = []
  const editadas = []
  const pastas = PASTAS.map((p) => ({ ...p }))
  b.rpcs.minhas_permissoes = () => [{ acoes: permissoes, funcao: 'administrador', rotulo: 'Administrador', ativo: true, deve_trocar_senha: false }]
  b.rpcs.meu_perfil = () => ({ user_id: UID, nome: 'Admin Teste', funcao: 'administrador', funcao_rotulo: 'Administrador' })
  b.rpcs.equipe_diretorio = () => [{ user_id: UID, nome: 'Admin Teste', funcao: 'administrador', funcao_rotulo: 'Administrador', avatar_path: null }]
  b.rpcs.admin_ping = () => true
  b.rpcs.sync_meus_canais = () => ['scw:org', 'scw:social', 'scw:pessoa:' + UID]
  b.rpcs.get_notificacoes_org = () => []
  b.rpcs.redes_opcoes = () => ({ participantes: [], edicoes: [] })
  b.rpcs.social_pastas_listar = () => ({ pode_organizar: permissoes.includes('redes.gerir'), pastas: pastas.map((p) => ({ ...p, n_itens: [...onde.values()].filter((v) => v === p.id).length })) })
  b.rpcs.social_biblioteca = (c) => {
    const f = (c && c.p_filtros) || {}
    return ITENS.filter((x) => (f.pasta === 'sem' ? onde.get(x.id) === null : f.pasta ? onde.get(x.id) === f.pasta : true)).map((x) => ({ ...x, pasta_id: onde.get(x.id) }))
  }
  b.rpcs.social_biblioteca_mover = (c) => {
    movidos.push({ itens: c.p_itens.map((i) => i.id), pasta: c.p_pasta })
    for (const i of c.p_itens) onde.set(i.id, c.p_pasta)
    return { movidos: c.p_itens.length, pasta_id: c.p_pasta }
  }
  b.rpcs.social_pasta_editar = (c) => {
    editadas.push(c)
    const p = pastas.find((x) => x.id === c.p_id)
    if (c.p_dados && 'cor' in c.p_dados) p.cor = c.p_dados.cor || null
    return p
  }
  return { b, rt, movidos, editadas, onde }
}

/* O tour guiado e o convite do aparelho abrem sozinhos nos primeiros segundos e cobrem a tela: dispensa, como a pessoa faria. */
async function limparCamadas(page) {
  for (let i = 0; i < 4; i++) {
    await dormir(1200)
    const pular = page.locator('.ui-tour button', { hasText: /Pular|Concluir/ }).first()
    if (await pular.count()) { await pular.click(); await dormir(300); continue }
    const convite = page.locator('dialog.cv[open] button', { hasText: /Agora não|Fechar|Entendi/ }).first()
    if (await convite.count()) { await convite.click(); await dormir(300) }
  }
}

async function abrir(nav, permissoes, ctxOpc) {
  const ctx = await nav.newContext(ctxOpc)
  const m = montar(permissoes)
  await m.b.instalar(ctx); await m.rt.instalar(ctx)
  await ctx.addInitScript((s) => { if (!localStorage.getItem('scw_org_conta') && s) localStorage.setItem('scw_org_conta', s) }, sessaoGuardada(UID, EMAIL))
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  await page.goto(`${BASE}/painel/#social/biblioteca`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.bb-arq', { timeout: 30000 })
  await limparCamadas(page)
  return { ctx, page, erros, ...m }
}
const centro = async (loc) => { const r = await loc.boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } }
// O cartão é alto: pega pela miniatura (o centro pode ficar sob a barra de seleção presa embaixo).
const pegada = async (loc) => { const r = await loc.boundingBox(); return { x: r.x + r.width / 2, y: r.y + Math.min(60, r.height / 2) } }

/* Arrasto com o mouse de verdade: pega o cartão, passa por passos intermediários e solta no alvo. */
async function arrastarMouse(page, origem, alvoLoc, { soltar = true, esc = false } = {}) {
  const o = await pegada(origem); const d = alvoLoc ? await centro(alvoLoc) : { x: 5, y: 5 }
  await page.mouse.move(o.x, o.y); await page.mouse.down()
  for (let i = 1; i <= 12; i++) await page.mouse.move(o.x + ((d.x - o.x) * i) / 12, o.y + ((d.y - o.y) * i) / 12)
  if (esc) await page.keyboard.press('Escape')
  if (soltar) await page.mouse.up()
  await dormir(600)
}
/* Toque de verdade (CDP): touchStart no ponto, passos, touchEnd. */
async function arrastarToque(cdp, de, para) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: de.x, y: de.y }] })
  for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: de.x + ((para.x - de.x) * i) / 12, y: de.y + ((para.y - de.y) * i) / 12 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await dormir(700)
}

async function principal() {
  const dev = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: dirname(__dirname), shell: true, stdio: 'ignore', detached: process.platform !== 'win32' })
  let nav
  try {
    await esperarServidor(`${BASE}/painel/`)
    nav = await chromium.launch()

    console.log('mouse — quem organiza (redes.gerir)')
    {
      const { ctx, page, movidos, erros } = await abrir(nav, [...BASE_PERMISSOES, 'redes.gerir'], { viewport: { width: 1280, height: 900 } })
      ok(await page.locator('.bb-arq__alca').count() === 3, 'cada arquivo tem a alça')
      const pasta1 = page.locator('.bb-pasta', { hasText: 'Pasta Um' })
      // 1) soltar na pasta move; a prévia NÃO abre
      await arrastarMouse(page, page.locator('.bb-arq').first(), pasta1)
      ok(movidos.length === 1 && movidos[0].pasta === 'p1' && movidos[0].itens.join() === 'a1', 'soltar na pasta chama social_biblioteca_mover com o arquivo e a pasta (' + JSON.stringify(movidos) + ')')
      ok(await page.locator('.bb-previa').count() === 0, 'soltar não abre a prévia')
      ok((await page.locator('.og-aviso[role=status]').first().textContent()).includes('1 arquivo movido para “Pasta Um”'), 'avisa o que moveu')
      ok(await page.locator('.bb-arq').count() === 2, 'a lista relê e o arquivo sai de "sem pasta"')
      // 2) clique simples continua abrindo a prévia
      await page.locator('.bb-arq__abrir').first().click()
      await page.waitForSelector('.bb-previa', { timeout: 5000 })
      ok(true, 'clique simples (sem mexer) abre a prévia')
      await page.keyboard.press('Escape'); await dormir(300)
      if (await page.locator('.bb-previa').count()) await page.locator('button', { hasText: 'Fechar' }).first().click().catch(() => {})
      await dormir(300)
      // 3) soltar fora de qualquer alvo não faz nada
      await arrastarMouse(page, page.locator('.bb-arq').first(), null)
      ok(movidos.length === 1, 'soltar fora de uma pasta não move')
      // 4) Esc cancela, mesmo soltando em cima da pasta
      await arrastarMouse(page, page.locator('.bb-arq').first(), page.locator('.bb-pasta', { hasText: 'Pasta Dois' }), { esc: true })
      ok(movidos.length === 1, 'Esc cancela o arrasto')
      ok(await page.locator('.bb-previa').count() === 0, 'o clique depois de arrastar não abre a prévia')
      // 5) seleção: arrastar um marcado leva todos os marcados
      await page.getByRole('button', { name: 'Selecionar' }).click()
      await page.locator('.bb-arq__marca input').nth(0).check(); await page.locator('.bb-arq__marca input').nth(1).check()
      ok(await page.locator('.bb-arq[data-marcado]').count() === 2, 'dois arquivos marcados')
      await arrastarMouse(page, page.locator('.bb-arq').nth(0), page.locator('.bb-pasta', { hasText: 'Pasta Dois' }))
      ok(movidos.length === 2 && movidos[1].pasta === 'p2' && movidos[1].itens.length === 2, 'arrastar um marcado leva a seleção inteira (' + JSON.stringify(movidos[1]) + ')')
      // 6) de dentro de uma pasta, o atalho "Sem pasta" é alvo (volta o arquivo)
      await page.locator('.bb-pasta', { hasText: 'Pasta Um' }).locator('.bb-pasta__abrir').click()
      await page.waitForSelector('.bb-arq', { timeout: 5000 })
      await arrastarMouse(page, page.locator('.bb-arq').first(), page.locator('.bb-atalho', { hasText: 'Sem pasta' }))
      ok(movidos.length === 3 && movidos[2].pasta === null, 'soltar em "Sem pasta" tira o arquivo da pasta (' + JSON.stringify(movidos[2]) + ')')
      ok(erros.length === 0, 'sem erro de JavaScript (' + erros.join(' | ').slice(0, 200) + ')')
      await ctx.close()
    }

    console.log('cor da pasta')
    {
      const { ctx, page, editadas, erros } = await abrir(nav, [...BASE_PERMISSOES, 'redes.gerir'], { viewport: { width: 1280, height: 900 } })
      const disco = (nome) => page.locator('.bb-pasta', { hasText: nome }).locator('.bb-pasta__icone')
      const fundo = (nome) => disco(nome).evaluate((e) => getComputedStyle(e).backgroundColor)
      const antes = await fundo('Pasta Um')
      await page.locator('.bb-pasta', { hasText: 'Pasta Um' }).locator('summary').click()
      await page.locator('.bb-pasta', { hasText: 'Pasta Um' }).locator('.ui-mais-acoes__item', { hasText: 'Cor da pasta…' }).click()
      await page.getByRole('radio', { name: 'Roxo' }).click()
      await dormir(700)
      ok(editadas.length === 1 && editadas[0].p_id === 'p1' && editadas[0].p_dados.cor === 'roxo', 'escolher Roxo chama social_pasta_editar só com a cor (' + JSON.stringify(editadas) + ')')
      const roxo = await fundo('Pasta Um')
      ok(roxo === 'rgb(77, 37, 126)' && roxo !== antes, 'o disco da pasta fica roxo (era ' + antes + ', ficou ' + roxo + ')')
      ok(await fundo('Pasta Dois') === antes, 'a outra pasta não muda')
      ok((await page.locator('.og-aviso[role=status]').first().textContent()).includes('Cor da pasta “Pasta Um”: Roxo.'), 'avisa a cor escolhida')
      // reabrir: Roxo vem marcado; "Padrão" volta ao acento do módulo
      await page.locator('.bb-pasta', { hasText: 'Pasta Um' }).locator('summary').click()
      await page.locator('.bb-pasta', { hasText: 'Pasta Um' }).locator('.ui-mais-acoes__item', { hasText: 'Cor da pasta…' }).click()
      ok(await page.getByRole('radio', { name: 'Roxo' }).getAttribute('aria-checked') === 'true', 'a cor atual aparece marcada ao reabrir')
      await page.getByRole('radio', { name: 'Padrão' }).click()
      await dormir(700)
      ok(editadas.length === 2 && editadas[1].p_dados.cor === '', 'Padrão manda cor vazia')
      ok(await fundo('Pasta Um') === antes, 'sem cor, o disco volta ao acento do módulo')
      ok(erros.length === 0, 'sem erro de JavaScript (' + erros.join(' | ').slice(0, 200) + ')')
      await ctx.close()
    }

    console.log('toque — só pela alça')
    {
      const { ctx, page, movidos, erros } = await abrir(nav, [...BASE_PERMISSOES, 'redes.gerir'], { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
      const cdp = await ctx.newCDPSession(page)
      const alca = await centro(page.locator('.bb-arq__alca').first())
      const pasta2 = await centro(page.locator('.bb-pasta', { hasText: 'Pasta Dois' }))
      // corpo do cartão: arrastar NÃO move (é rolagem)
      const corpo = await centro(page.locator('.bb-arq__abrir').first())
      await arrastarToque(cdp, corpo, pasta2)
      ok(movidos.length === 0, 'tocar e arrastar pelo corpo do cartão não move (a lista só rola)')
      await page.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('.og-vista').forEach((e) => { e.scrollTop = 0 }) })
      await dormir(300)
      const alca2 = await centro(page.locator('.bb-arq__alca').first())
      const pasta2b = await centro(page.locator('.bb-pasta', { hasText: 'Pasta Dois' }))
      await arrastarToque(cdp, alca2, pasta2b)
      ok(movidos.length === 1 && movidos[0].pasta === 'p2', 'arrastar pela alça até a pasta move (' + JSON.stringify(movidos) + ')')
      ok(erros.length === 0, 'sem erro de JavaScript (' + erros.join(' | ').slice(0, 200) + ')')
      void alca; void pasta2
      await ctx.close()
    }

    console.log('sem permissão de organizar')
    {
      const { ctx, page, movidos } = await abrir(nav, BASE_PERMISSOES, { viewport: { width: 1280, height: 900 } })
      ok(await page.locator('.bb-arq__alca').count() === 0, 'sem redes.gerir não há alça')
      await arrastarMouse(page, page.locator('.bb-arq').first(), page.locator('.bb-pasta').first())
      ok(movidos.length === 0, 'sem redes.gerir arrastar não move')
      await ctx.close()
    }
  } finally {
    if (nav) await nav.close().catch(() => {})
    matar(dev.pid)
  }
  console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\nTudo certo.')
  process.exit(falhas.length ? 1 : 0)
}
principal().catch((e) => { console.error(e); process.exit(1) })
