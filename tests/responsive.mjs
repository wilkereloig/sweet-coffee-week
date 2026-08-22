/**
 * Validação responsiva — Sweet & Coffee Week
 * -------------------------------------------------------------
 * Sobe o preview do build, abre a Home/O Festival em uma lista de viewports
 * oficiais e checa, em cada uma:
 *   - overflow horizontal (scrollWidth vs innerWidth)
 *   - header em uma única linha (não quebra)
 *   - marca alinhada ao trilho único
 *   - barra de abas presente no celular, com as 5 abas e piso de toque
 *   - folha "mais": abre, fecha por clique no véu, por link e por Esc
 *
 * ⚠️ REESCRITO EM 22/08/2026, e a história importa porque o arquivo passou meses
 * reprovando sem haver defeito. Ele media a casca ANTERIOR — `.site-header`,
 * `.brand`, `.menu-toggle`, `.mobile-menu`, `.mobile-overlay` —, e a demolição
 * do §4.3 levou `styles.css` junto com todos esses seletores. `querySelector`
 * devolvia `null`, o teste anunciava "menu-toggle invisível no mobile" em 4 dos
 * 6 viewports, e a resposta certa era atualizar o teste, não o site (§10.8).
 *
 * Quatro premissas velhas saíram no mesmo passo, todas do sistema anterior:
 *   1. os cinco seletores mortos acima → casca 2026 (`.scw-header`, `.scw-marca`,
 *      `.scw-abas`, `.scw-folha`);
 *   2. breakpoint 960 → **900**, que é onde a casca vira aplicativo (§6.14);
 *   3. gutter `clamp(28px, 11.5vw, 150px)` → `--scw-trilho`, e medido do CSS
 *      computado do próprio header, não redigitado aqui (ver `readLayout`);
 *   4. rota `/#/` → `/`, porque o hash routing foi aposentado (§4.1 / Anexo A.3).
 *
 * Gera screenshots em tests/screenshots/ para revisão visual.
 * Sai com código 1 se houver overflow horizontal ou falha dura.
 *
 * Roda contra o BUILD de produção via `vite preview` — NÃO contra o dev server.
 * Motivo: só o build reflete o site publicado (minificação, ordem final de CSS,
 * assets com hash); o dev server serve os módulos soltos.
 *
 * Exige um `dist/` já buildado. Rode `npm run build` antes (a pasta dist fica no
 * Dropbox e o emptyDir do vite trava intermitentemente — por isso o build é uma
 * etapa separada, não acoplada ao teste).
 *
 * Uso:
 *   npm run build && npm run test:responsive   # todos os viewports
 *   npm run build && npm run test:mobile       # só telefones
 *
 * Doc da régua: CLAUDE.md §6.14 (responsividade) e §6.10 (pisos de toque).
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SHOTS = join(__dirname, 'screenshots')

const PORT = 5179
const BASE = `http://localhost:${PORT}`

/* ⚠️ `?preview=1` NÃO é enfeite: sem ele este teste mede a página errada.
   O `vite preview` serve o build de PRODUÇÃO, onde `import.meta.env.DEV` é
   false — então `COMING_SOON_PUBLICATION` derruba toda rota na landing
   /em-breve e a casca institucional simplesmente não existe no DOM (§3.4).
   Foi essa a causa real das reprovas antigas de `.menu-toggle`: o teste
   achava `.brand` (a landing tem) e não achava o menu (a landing não tem).
   `tests/motion.mjs` já fazia certo desde sempre. */
const HOME = `${BASE}/?preview=1`

// Viewports oficiais (CLAUDE.md §6.14). phone => isMobile + toque.
const VIEWPORTS = [
  { w: 390,  h: 844,  label: 'iphone-12-390',  phone: true },
  { w: 414,  h: 896,  label: 'iphone-11-414',  phone: true },
  { w: 430,  h: 932,  label: 'iphone-15pm-430', phone: true },
  { w: 768,  h: 1024, label: 'ipad-768',       phone: false },
  { w: 1024, h: 768,  label: 'ipad-land-1024', phone: false },
  { w: 1366, h: 768,  label: 'laptop-1366',    phone: false },
]

// Em ≤900px a casca vira aplicativo: a logo perde o overhang, o botão de acesso
// do topo some e entra a barra inferior de 5 abas (§6.14). É o ponto que decide
// quais checagens valem — não 960, que era do sistema anterior.
const MOBILE_NAV_BREAKPOINT = 901
const OVERFLOW_TOLERANCE = 1 // px — sub-pixel rounding
const MIN_TOUCH = 44         // px — piso de toque do §6.10, para qualquer controle
const ABAS_ESPERADAS = 5     // festival · edições · awards · participar · mais

const onlyMobile = process.argv.includes('--mobile')
const targets = onlyMobile ? VIEWPORTS.filter((v) => v.phone) : VIEWPORTS

/* ⚠️ A PORTA TEM QUE ESTAR LIVRE ANTES DE SUBIR O PREVIEW.
   Com `--strictPort` o vite MORRE se a porta estiver ocupada — ele não pula
   para a próxima. E o `waitForServer` abaixo pergunta "alguém responde?",
   não "o MEU servidor responde?": junto, os dois faziam o teste medir o
   servidor de outro processo e reportar as diferenças como defeito do site.
   Aconteceu em 22/08/2026 com duas sessões abertas no mesmo repositório, e as
   reprovas ("motor não ligou", "título de herói não encontrado") não tinham
   nada a ver com o código. É a mesma armadilha do §10.8, com outra roupa:
   teste que mede a coisa errada e culpa o site. */
async function exigirPortaLivre(porta) {
  try {
    await fetch(`http://localhost:${porta}/`, { signal: AbortSignal.timeout(2000) })
  } catch {
    return                       // ninguém respondeu: livre, é o que queremos
  }
  console.error([
    '',
    `✗ A porta ${porta} ja esta ocupada por outro processo.`,
    '  Este teste sobe o proprio preview com --strictPort e mediria o servidor',
    '  alheio, reportando as diferencas como defeito do site.',
    '  Feche o outro preview (ou a outra sessao) e rode de novo.',
    '',
  ].join('\n'))
  process.exit(1)
}

function startPreviewServer() {
  const proc = spawn(
    'npm',
    ['run', 'preview', '--', '--port', String(PORT), '--strictPort'],
    { cwd: join(__dirname, '..'), shell: true, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  proc.stderr.on('data', (d) => {
    const s = d.toString()
    if (/error/i.test(s)) process.stderr.write(`[vite] ${s}`)
  })
  return proc
}

// No Windows o spawn com shell cria um cmd que abre o vite; matar só o cmd deixa
// o preview órfão (segura a porta e impede o node de sair). Mata a árvore pelo PID.
function killTree(pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    else process.kill(-pid, 'SIGKILL')
  } catch {
    /* já morto */
  }
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 350))
  }
  throw new Error(`Dev server não respondeu em ${timeoutMs}ms (${url})`)
}

/** Lê métricas de layout da casca e do documento. */
function readLayout() {
  const de = document.documentElement
  const vw = window.innerWidth
  const visivel = (el) => !!el && getComputedStyle(el).display !== 'none'
  const caixa = (el) => {
    if (!el) return null
    const b = el.getBoundingClientRect()
    return {
      left: Math.round(b.left), right: Math.round(b.right),
      top: Math.round(b.top), bottom: Math.round(b.bottom),
      width: Math.round(b.width), height: Math.round(b.height),
      visible: visivel(el),
    }
  }

  const header = document.querySelector('.scw-header')
  const linha = document.querySelector('.scw-header__linha') || header
  const marca = document.querySelector('.scw-marca')
  const abas = document.querySelector('.scw-abas')

  /* O trilho NÃO é redigitado aqui. `--scw-trilho` é uma fórmula com `max()` e
     `clamp()` que já mudou de valor mais de uma vez; recopiá-la para o teste
     criaria a segunda fonte de verdade que o §5.2 proíbe — e o teste passaria a
     medir a cópia, não a regra. Lemos o padding real do elemento que o aplica,
     então a checagem continua válida quando a fórmula mudar. */
  const trilho = linha ? Math.round(parseFloat(getComputedStyle(linha).paddingInlineStart)) : null

  /* Piso de toque medido no CONTROLE, não na linha que o contém (§10.2). */
  const controlesAba = [...document.querySelectorAll('.scw-aba')].map((el) => {
    const b = el.getBoundingClientRect()
    return { w: Math.round(b.width), h: Math.round(b.height) }
  })

  return {
    vw,
    overflowX: de.scrollWidth - vw,
    headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
    trilho,
    marca: caixa(marca),
    abas: caixa(abas),
    controlesAba,
  }
}

async function run() {
  if (!existsSync(join(__dirname, '..', 'dist', 'index.html'))) {
    console.error('✗ dist/ ausente. Rode `npm run build` antes de validar.')
    process.exit(1)
  }
  // Limpeza best-effort: a pasta fica no Dropbox e pode estar travada (EBUSY).
  // Se não der pra apagar, seguimos — os screenshots são sobrescritos por nome.
  await rm(SHOTS, { recursive: true, force: true }).catch(() => {})
  await mkdir(SHOTS, { recursive: true }).catch(() => {})

  await exigirPortaLivre(PORT)
  console.log('▶ subindo preview server (build de produção)…')
  const server = startPreviewServer()
  let browser
  const results = []

  try {
    await waitForServer(BASE)
    console.log(`▶ preview pronto em ${BASE}\n`)
    browser = await chromium.launch()

    for (const vp of targets) {
      const isMobileNav = vp.w < MOBILE_NAV_BREAKPOINT
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        isMobile: vp.phone,
        hasTouch: vp.phone,
        deviceScaleFactor: vp.phone ? 3 : 1,
      })
      const page = await context.newPage()
      page.setDefaultTimeout(4000)
      const issues = []

      await page.goto(HOME, { waitUntil: 'load', timeout: 15000 })
      await page.waitForTimeout(600) // assenta fontes/animações de entrada

      const L = await page.evaluate(readLayout)

      // 1. overflow horizontal
      if (L.overflowX > OVERFLOW_TOLERANCE) issues.push(`overflow-x: +${L.overflowX}px`)

      // 2. a casca existe (se o seletor morrer de novo, o teste diz isso em vez
      //    de inventar um defeito de layout a partir de um null)
      if (L.headerHeight === null) issues.push('.scw-header não encontrado — casca mudou?')
      if (!L.marca) issues.push('.scw-marca não encontrada — casca mudou?')

      // 3. header não quebra (uma linha — altura sã)
      if (L.headerHeight && L.headerHeight > vp.h * 0.45) issues.push(`header alto demais: ${L.headerHeight}px`)

      // 4. marca alinhada ao trilho único, lido do CSS computado (§6.6)
      if (L.marca && L.trilho !== null && Math.abs(L.marca.left - L.trilho) > 12) {
        issues.push(`marca fora do trilho (left=${L.marca.left}, trilho=${L.trilho})`)
      }

      // 5. marca não estoura a borda
      if (L.marca && L.marca.right > vp.w) issues.push(`marca estoura à direita (right=${L.marca.right})`)

      // 6. barra de abas — só abaixo de 900px (§6.14)
      if (isMobileNav) {
        if (!L.abas || !L.abas.visible) {
          issues.push('barra de abas ausente no celular')
        } else {
          if (L.abas.bottom > vp.h + OVERFLOW_TOLERANCE) issues.push(`barra de abas abaixo da tela (bottom=${L.abas.bottom})`)
          if (L.controlesAba.length !== ABAS_ESPERADAS) {
            issues.push(`abas: ${L.controlesAba.length} (esperado ${ABAS_ESPERADAS})`)
          }
          const curtas = L.controlesAba.filter((c) => c.w < MIN_TOUCH || c.h < MIN_TOUCH)
          if (curtas.length) {
            issues.push(`aba abaixo do piso de ${MIN_TOUCH}px: ${curtas.map((c) => `${c.w}x${c.h}`).join(', ')}`)
          }
        }
      } else if (L.abas && L.abas.visible) {
        issues.push('barra de abas visível acima de 900px')
      }

      // screenshot da página
      await page.screenshot({ path: join(SHOTS, `${vp.label}.png`), fullPage: true })

      // 7. fluxo da folha "mais" — cada passo é tolerante a falha (registra o
      //    problema e se recupera, fechando à força antes de reabrir).
      //    A folha sai por `.is-fechando` e só então desmonta (§6.15), por isso
      //    "fechada" é medido por `state: 'detached'`, não por invisibilidade.
      if (isMobileNav && L.abas && L.abas.visible) {
        const folha = page.locator('.scw-folha')
        const veu = page.locator('.scw-folha-veu')
        const botaoMais = page.locator('.scw-aba').last()

        const aberta = () => folha.isVisible().catch(() => false)
        const abrir = async () => {
          await botaoMais.click({ force: true }).catch(() => {})
          await folha.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {})
          await page.waitForTimeout(360) // deixa `scwFolha` terminar de subir
        }
        const fecharForcado = async () => {
          if (await aberta()) {
            await page.locator('.scw-folha__fechar').click({ force: true }).catch(() => {})
            await folha.waitFor({ state: 'detached', timeout: 1500 }).catch(() => {})
          }
        }
        const fechouEm = (ms = 1500) =>
          folha.waitFor({ state: 'detached', timeout: ms }).then(() => true).catch(() => false)

        try {
          await abrir()
          if (!(await aberta())) issues.push('folha "mais" não abriu')
          await page.waitForTimeout(250)
          await page.screenshot({ path: join(SHOTS, `${vp.label}--folha.png`) })

          // overflow com a folha aberta
          const folhaOverflow = await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          )
          if (folhaOverflow > OVERFLOW_TOLERANCE) issues.push(`folha aberta gera overflow: +${folhaOverflow}px`)

          // a folha carrega a navegação completa — NAV_LINKS, as 6 rotas
          const linkCount = await page.locator('.scw-folha__nav a').count()
          if (linkCount < 6) issues.push(`folha com poucos links: ${linkCount} (esperado ≥6)`)

          // fecha com Esc
          await page.keyboard.press('Escape')
          if (!(await fechouEm())) issues.push('folha não fechou com Esc')
          await fecharForcado()

          // fecha por clique no véu (canto, longe do painel)
          await abrir()
          await veu.click({ position: { x: 6, y: 6 }, force: true }).catch(() => {})
          if (!(await fechouEm())) issues.push('folha não fechou ao clicar no véu')
          await fecharForcado()

          // fecha ao clicar num link (clique real — valida que o link é tocável)
          await abrir()
          const link = page.locator('.scw-folha__nav a').nth(1)
          await link.scrollIntoViewIfNeeded().catch(() => {})
          await link.click().catch((e) => issues.push(`clique no link falhou: ${e.message?.split('\n')[0]}`))
          if (!(await fechouEm())) issues.push('folha não fechou ao clicar em link')
          await fecharForcado()
        } catch (e) {
          issues.push(`erro no fluxo da folha: ${e.message?.split('\n')[0]}`)
          await fecharForcado()
        }

        // volta pra Home p/ a próxima iteração começar limpa
        await page.goto(HOME, { waitUntil: 'domcontentloaded' }).catch(() => {})
      }

      results.push({ vp, L, issues })
      await context.close()

      const tag = issues.length ? `✗ ${issues.length}` : '✓'
      console.log(`${tag.padEnd(4)} ${vp.label.padEnd(18)} ${vp.w}x${vp.h}  overflow=${L.overflowX}px`)
      for (const i of issues) console.log(`       · ${i}`)
    }
  } finally {
    if (browser) await browser.close()
    killTree(server.pid)
  }

  const failed = results.filter((r) => r.issues.length > 0)
  console.log(`\n${'─'.repeat(48)}`)
  console.log(`screenshots → tests/screenshots/`)
  if (failed.length) {
    console.log(`✗ ${failed.length}/${results.length} viewports com problemas`)
    process.exit(1)
  }
  console.log(`✓ ${results.length}/${results.length} viewports OK`)
  process.exit(0) // o filho do preview pode manter o event loop vivo
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
