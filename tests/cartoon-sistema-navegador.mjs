/**
 * cartoon-sistema-navegador.mjs — vitrine do sistema visual da Cartoon no SERVIDOR DE DESENVOLVIMENTO.
 *
 *   npm run test:cartoon-sistema
 *
 * A vitrine (/cartoon/sistema) só existe no DEV (docs/cartoon-2026-2/10 §10.12),
 * então este teste sobe o `vite`, não o build. Reprova, em 360, 768 e 1440:
 *  1. mais de um <h1>; erro no console ou requisição da própria origem que falha
 *     (só o host do Supabase é tolerado, e pela URL, não pelo texto da mensagem);
 *  2. Grandstander não carregada ou não aplicada ao texto;
 *  3. rolagem lateral;
 *  4. botão ou link da vitrine com menos de 44px de altura (nenhum alvo = falha, não "ok");
 *  5. <img> quebrada na vitrine (os 24 ícones, a cenografia e os 2 kits de tema entram);
 *  6. cenário por tema cobrindo texto, ou faixa recortada (vai inteira, na proporção do arquivo — §10.15);
 *  7. anel de foco: chocolate no fundo claro, amarelo no rodapé de chocolate;
 *  8. movimento: o letreiro anima com movimento permitido e NÃO anima com prefers-reduced-motion.
 * Guarda capturas em tests/capturas-sistema/ para a conferência visual do Wilker.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5218
const BASE = `http://localhost:${PORT}`
const CAPTURAS = join(__dirname, 'capturas-sistema')
const TELAS = [[360, 780], [768, 1024], [1440, 900]]
const SUPABASE = /\.supabase\.co(\/|$)/
const falhas = []
const falha = (m) => { falhas.push(m); console.log(`  ✗ ${m}`) }
const ok = (m) => console.log(`  ✓ ${m}`)

function killTree (pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    else process.kill(-pid, 'SIGKILL')
  } catch { /* já morto */ }
}

async function waitForServer (url, ms = 30000) {
  const t = Date.now()
  while (Date.now() - t < ms) {
    try { if ((await fetch(url)).ok) return } catch { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`servidor não respondeu em ${ms}ms`)
}

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: join(__dirname, '..'), shell: true, stdio: 'ignore', detached: process.platform !== 'win32',
})
let browser
try {
  await waitForServer(`${BASE}/`)
  mkdirSync(CAPTURAS, { recursive: true })
  browser = await chromium.launch()
  for (const [w, h] of TELAS) {
    console.log(`\n${w}×${h}`)
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    const erros = []
    // Só a falha de rede para o Supabase (a RPC da edição) é ignorada — pela URL do recurso, não pelo texto da mensagem.
    page.on('console', (m) => {
      const url = m.location()?.url ?? ''
      if (m.type() === 'error' && !SUPABASE.test(url)) erros.push(`${m.text()} ${url}`.trim())
    })
    page.on('pageerror', (e) => erros.push(e.message))
    page.on('requestfailed', (r) => { if (r.url().startsWith(BASE)) erros.push(`requisição falhou: ${r.url()}`) })
    page.on('response', (r) => { if (r.url().startsWith(BASE) && r.status() >= 400) erros.push(`HTTP ${r.status()}: ${r.url()}`) })
    // Vite recém-subido transforma os módulos sob demanda: a 1ª tela leva ~30s no Windows.
    await page.goto(`${BASE}/cartoon/sistema`, { waitUntil: 'networkidle', timeout: 120000 })
    await page.waitForSelector('.ct-vitrine', { timeout: 20000 })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(1000) // as animações de entrada (≤ 740 ms) terminam antes de medir e fotografar
    const r = await page.evaluate(async () => {
      const corpo = document.querySelector('.ct-vitrine .ct-bloco > p:not([class])')
      const alvos = [...document.querySelectorAll('.ct-vitrine a, .ct-vitrine button')]
        .filter((e) => e.offsetParent !== null)
        .map((e) => ({ texto: e.textContent.trim(), altura: Math.round(e.getBoundingClientRect().height) }))
      const imgs = [...document.querySelectorAll('.ct-vitrine img')]
      await Promise.all(imgs.filter((i) => !i.complete).map((i) => new Promise((fim) => {
        i.addEventListener('load', fim, { once: true }); i.addEventListener('error', fim, { once: true }); setTimeout(fim, 8000)
      })))
      const cruza = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
      const cenarios = [...document.querySelectorAll('.ct-cenario')].map((c) => {
        const f = c.querySelector('.ct-cenario__faixa')
        const fr = f.getBoundingClientRect()
        const pecas = [...c.querySelectorAll('img')].map((i) => [i.className, i.getBoundingClientRect()])
        const textos = [...c.parentElement.querySelectorAll('.ct-rotulo, .ct-letreiro, .ct-lead, .ct-vitrine__selo')].map((e) => e.getBoundingClientRect())
        return {
          recorte: Math.round(Math.abs(fr.height - fr.width * f.naturalHeight / f.naturalWidth)),
          cobre: pecas.filter(([, rect]) => textos.some((t) => cruza(rect, t))).map(([nome]) => nome),
        }
      })
      return {
        h1: document.querySelectorAll('h1').length,
        carregada: document.fonts.check('500 18px Grandstander'),
        familia: getComputedStyle(corpo).fontFamily,
        lateral: document.documentElement.scrollWidth - window.innerWidth,
        alvos: alvos.length,
        baixos: alvos.filter((a) => a.altura < 44),
        imgs: imgs.length,
        icones: document.querySelectorAll('.ct-vitrine__icones .ct-icone').length,
        quebradas: imgs.filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.getAttribute('src')),
        cenarios,
      }
    })
    if (r.h1 === 1) ok('um <h1>'); else falha(`${w}: ${r.h1} <h1>`)
    if (r.carregada && /Grandstander/.test(r.familia)) ok('Grandstander aplicada'); else falha(`${w}: fonte "${r.familia}", carregada=${r.carregada}`)
    if (r.lateral <= 0) ok('sem rolagem lateral'); else falha(`${w}: rolagem lateral de ${r.lateral}px`)
    if (r.alvos === 0) falha(`${w}: nenhum botão ou link na vitrine (a checagem de 44px não mediu nada)`)
    else if (r.baixos.length === 0) ok(`${r.alvos} alvos ≥ 44px`)
    else falha(`${w}: alvos baixos ${JSON.stringify(r.baixos)}`)
    if (r.icones === 24 && r.quebradas.length === 0) ok(`${r.imgs} imagens carregadas (${r.icones} ícones)`)
    else falha(`${w}: imagens — ${r.imgs} no total, ${r.icones} ícones, quebradas: ${JSON.stringify(r.quebradas)}`)
    if (r.cenarios.length === 2) ok('2 cenários por tema'); else falha(`${w}: ${r.cenarios.length} cenários (esperava 2)`)
    for (const c of r.cenarios) {
      if (c.cobre.length) falha(`${w}: cenário cobre texto — ${c.cobre.join(', ')}`)
      if (c.recorte > 2) falha(`${w}: faixa de cenário recortada (${c.recorte}px fora da proporção do arquivo)`)
    }
    if (r.cenarios.every((c) => !c.cobre.length && c.recorte <= 2)) ok('cenário sem cobrir texto; faixa inteira, sem recorte')
    if (erros.length === 0) ok('console limpo'); else falha(`${w}: console — ${erros.join(' | ')}`)

    // Anel de foco: chocolate no fundo claro, amarelo sobre o chocolate do rodapé (§10.15, decisão de 28/10).
    const anel = async (seletor) => {
      const alvo = page.locator(seletor).first()
      await alvo.scrollIntoViewIfNeeded()
      await alvo.focus()
      return alvo.evaluate((e) => ({ visivel: e.matches(':focus-visible'), cor: getComputedStyle(e).outlineColor }))
    }
    const claro = await anel('.ct-vitrine .ct-acoes .ct-botao')
    const escuro = await anel('.ct-rodape a, .ct-rodape button')
    if (claro.visivel && claro.cor === 'rgb(58, 21, 15)') ok('anel de foco chocolate no fundo claro'); else falha(`${w}: anel no fundo claro = ${JSON.stringify(claro)}`)
    if (escuro.visivel && escuro.cor === 'rgb(253, 185, 1)') ok('anel de foco amarelo no rodapé'); else falha(`${w}: anel no rodapé = ${JSON.stringify(escuro)}`)
    // Captura de página inteira: percorre a página e decodifica todas as imagens antes — com decoding="async",
    // as grandes (TV, objetos de cenário) saíam em branco na foto, embora a tela real as mostre.
    await page.evaluate(async () => {
      document.activeElement?.blur()
      for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
        window.scrollTo(0, y)
        await new Promise((fim) => setTimeout(fim, 120))
      }
      await Promise.all([...document.images].map((i) => i.decode().catch(() => {})))
      window.scrollTo(0, 0)
    })
    await page.screenshot({ path: join(CAPTURAS, `sistema-${w}.png`), fullPage: true })

    // Movimento: o letreiro anima por padrão e fica parado com prefers-reduced-motion (o 2º só prova algo se o 1º existir).
    const animacao = () => page.evaluate(() => getComputedStyle(document.querySelector('.ct-letreiro')).animationName)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const com = await animacao()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const sem = await animacao()
    if (com !== 'none' && sem === 'none') ok(`letreiro anima (${com}) e para com movimento reduzido`); else falha(`${w}: animationName com=${com} sem=${sem}`)

    // Olhinhos (§10.5): decorativos (aria-hidden, nada clicável dentro), param com movimento reduzido e piscam sozinhos.
    const olhos = await page.evaluate(() => [...document.querySelectorAll('.ct-olhinhos')].map((o) => ({
      oculto: o.getAttribute('aria-hidden') === 'true', clicavel: o.querySelectorAll('a, button, [tabindex]').length, mov: o.getAttribute('data-movimento'),
    })))
    if (olhos.length >= 3 && olhos.every((o) => o.oculto && !o.clicavel && o.mov === 'nao')) ok(`${olhos.length} pares de olhinhos decorativos, parados com movimento reduzido`)
    else falha(`${w}: olhinhos ${JSON.stringify(olhos)}`)
    if (w === 1440) {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      const piscou = await page.waitForFunction(() => document.querySelector('.ct-olhinhos.ct-olhinhos--pisca'), null, { timeout: 7500, polling: 50 }).then(() => true, () => false)
      if (piscou) ok('olhinhos piscam sozinhos (intervalo de 3 a 6 s)'); else falha('olhinhos não piscaram em 7,5 s')
    }
    await page.close()
  }
} finally {
  await browser?.close()
  killTree(vite.pid)
}
if (falhas.length) { console.log(`\n${falhas.length} falha(s)`); process.exit(1) }
console.log('\nvitrine ok')
