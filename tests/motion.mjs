/*
 * tests/motion.mjs — auditoria do sistema de movimento (redesign 2026).
 * Sistema: src/styles/scw-motion.css + src/hooks/useSiteMotion.js.
 *
 * Percorre as seis páginas institucionais em desktop e celular, com e sem
 * prefers-reduced-motion, e reprova se:
 *   1. o título do herói não estiver legível já na abertura;
 *   2. sobrar qualquer elemento de reveal invisível depois de rolar a página;
 *   3. houver rolagem horizontal;
 *   4. o motor ligar mesmo com prefers-reduced-motion (ou não ligar sem ela);
 *   5. o console acusar erro.
 *
 * Roda contra o BUILD, via `vite preview` — igual a tests/responsive.mjs: é o
 * build que reflete o site publicado (minificação, ordem final de CSS, assets
 * com hash). `?preview=1` destrava o institucional atrás do gate
 * COMING_SOON_PUBLICATION (permitido fora do domínio oficial — ver App.jsx).
 *
 * Uso:  npm run build && npm run test:motion
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5209
const BASE = `http://localhost:${PORT}`

const ROTAS = ['/', '/participar', '/apoiar', '/contato', '/sweet-awards', '/edicoes']
const TELAS = [
  { nome: 'desktop', w: 1440, h: 900 },
  { nome: 'celular', w: 390, h: 844, phone: true },
]
const TITULO_HEROI =
  '.scw-hero__titulo, .pa-hero__titulo, .ctt-abertura__titulo, .swa-hero .scw-h1, ' +
  '.scw-edx__tema, .scw-edx-mob__tema'

const falhas = []

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

function startPreview() {
  return spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
    cwd: join(__dirname, '..'),
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

// No Windows o spawn com shell cria um cmd que abre o vite; matar só o cmd deixa
// o preview órfão (segura a porta). Mata a árvore pelo PID.
function killTree(pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    else process.kill(-pid, 'SIGKILL')
  } catch { /* já morto */ }
}

async function waitForServer(url, timeoutMs = 30000) {
  const inicio = Date.now()
  while (Date.now() - inicio < timeoutMs) {
    try { if ((await fetch(url)).ok) return } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 350))
  }
  throw new Error(`preview não respondeu em ${timeoutMs}ms (${url})`)
}

async function rolarTudo(page) {
  await page.evaluate(async () => {
    const passo = Math.round(window.innerHeight * 0.7)
    const fim = document.body.scrollHeight + window.innerHeight
    for (let y = 0; y < fim; y += passo) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
    }
    window.scrollTo(0, document.body.scrollHeight)
    // Folga maior que o pior caso da sequência (atraso máximo + duração da
    // entrada), senão o último bloco é lido antes de terminar de aparecer.
    await new Promise((r) => setTimeout(r, 2000))
  })
}

async function auditar(page, rota, tela, reduzido) {
  const rotulo = `${rota} @${tela.nome}${reduzido ? ' [sem movimento]' : ''}`
  const erros = []
  const onConsole = (m) => { if (m.type() === 'error') erros.push(m.text()) }
  const onErro = (e) => erros.push('pageerror: ' + e.message)
  page.on('console', onConsole)
  page.on('pageerror', onErro)

  await page.goto(`${BASE}/?preview=1#${rota}`, { waitUntil: 'load', timeout: 20000 })
  await page.waitForTimeout(1200)

  // 1. o herói tem de estar legível de imediato
  const heroi = await page.evaluate((sel) => {
    const h = document.querySelector(sel)
    if (!h) return 'título de herói não encontrado'
    const o = parseFloat(getComputedStyle(h).opacity)
    return o < 0.9 ? `opacidade ${o}` : null
  }, TITULO_HEROI)
  if (heroi) falhas.push(`${rotulo}: herói — ${heroi}`)

  await rolarTudo(page)

  // 2. nada pode continuar invisível depois de percorrer a página
  const invisiveis = await page.evaluate(() =>
    [...document.querySelectorAll('[data-mo], [data-mo-grade] > *')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        if (!r.width && !r.height) return false // oculto por layout, não por motion
        return parseFloat(getComputedStyle(el).opacity) < 0.9
      })
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className || '').split(' ')[0]}`),
  )
  if (invisiveis.length) {
    falhas.push(`${rotulo}: ${invisiveis.length} elemento(s) invisíveis → ${invisiveis.slice(0, 5).join(', ')}`)
  }

  // 3. sem rolagem horizontal
  const larg = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: window.innerWidth,
  }))
  if (larg.doc > larg.win + 1) falhas.push(`${rotulo}: rolagem horizontal (${larg.doc} > ${larg.win})`)

  // 4. o motor obedece à preferência do sistema
  const ligado = await page.evaluate(() => document.documentElement.classList.contains('scw-mo-on'))
  if (reduzido && ligado) falhas.push(`${rotulo}: motor ligou apesar de prefers-reduced-motion`)
  if (!reduzido && !ligado && rota !== '/edicoes') falhas.push(`${rotulo}: motor não ligou`)

  if (erros.length) falhas.push(`${rotulo}: console → ${erros.slice(0, 3).join(' | ')}`)

  page.off('console', onConsole)
  page.off('pageerror', onErro)
  console.log(`   ${rotulo}`)
}

async function run() {
  if (!existsSync(join(__dirname, '..', 'dist', 'index.html'))) {
    console.error('✗ dist/ ausente. Rode `npm run build` antes.')
    process.exit(1)
  }
  await exigirPortaLivre(PORT)
  console.log('▶ subindo preview (build de produção)…')
  const server = startPreview()
  let navegador
  try {
    await waitForServer(BASE)
    navegador = await chromium.launch()

    for (const reduzido of [false, true]) {
      console.log(reduzido ? '\n— prefers-reduced-motion: reduce —' : '\n— movimento normal —')
      for (const tela of TELAS) {
        const ctx = await navegador.newContext({
          viewport: { width: tela.w, height: tela.h },
          isMobile: !!tela.phone,
          hasTouch: !!tela.phone,
          reducedMotion: reduzido ? 'reduce' : 'no-preference',
        })
        const page = await ctx.newPage()
        for (const rota of ROTAS) await auditar(page, rota, tela, reduzido)
        await ctx.close()
      }
    }
  } finally {
    if (navegador) await navegador.close()
    killTree(server.pid)
  }

  console.log('\n' + '='.repeat(72))
  if (falhas.length) {
    console.log(`${falhas.length} problema(s):`)
    falhas.forEach((f) => console.log('  ✗ ' + f))
    process.exitCode = 1
  } else {
    console.log('✓ heróis legíveis na abertura, nenhum reveal preso, sem overflow-x,')
    console.log('  reduced-motion respeitado e console limpo nas 6 páginas.')
  }
}

run()
