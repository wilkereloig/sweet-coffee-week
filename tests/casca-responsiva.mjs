/*
 * Auditoria da casca em navegador — roda contra um build servido.
 * Não é `node --test`: precisa de servidor. Uso:
 *   npx vite build --outDir "$TEMP/scw_audit" --emptyOutDir
 *   npx vite preview --outDir "$TEMP/scw_audit" --port 5204 --strictPort
 *   node tests/casca-responsiva.mjs
 *
 * `?preview=1` é necessário porque COMING_SOON_PUBLICATION está ligada — em
 * localhost o gate libera o institucional sem tocar na flag de produção.
 * Confere, em 6 rotas × 3 larguras: modos da casca sem coexistir, header/
 * rodapé por rota (Edições tem cabeçalho próprio), um h1, zero rolagem
 * horizontal, cor da página aplicada e console limpo.
 * (A barra de 5px sob o cabeçalho saiu do sistema em 29/07/2026 — o herói já
 * é a cor da página. Não checar `.scw-barra-pagina` — foi removida.)
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:5204/?preview=1'
const ROTAS = [
  ['home', '/'],
  ['edicoes', '/edicoes'],
  ['awards', '/sweet-awards'],
  ['participar', '/participar'],
  ['apoiar', '/apoiar'],
  ['contato', '/contato'],
]
const TELAS = [
  ['desktop', 1440, 900],
  ['tablet', 1024, 800],
  ['mobile', 390, 844],
]

const visivel = (sel) => `(() => {
  const el = document.querySelector(${JSON.stringify(sel)})
  if (!el) return 'ausente'
  const cs = getComputedStyle(el)
  if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return 'oculto'
  const r = el.getBoundingClientRect()
  return (r.width > 0 && r.height > 0) ? 'visivel' : 'sem-caixa'
})()`

const navegador = await chromium.launch()
const problemas = []
const erros = []

for (const [nomeTela, w, h] of TELAS) {
  const ctx = await navegador.newContext({ viewport: { width: w, height: h } })
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') erros.push(`${nomeTela} ${m.text().slice(0, 160)}`) })
  page.on('pageerror', (e) => erros.push(`${nomeTela} PAGEERROR ${String(e).slice(0, 160)}`))

  for (const [rota, path] of ROTAS) {
    await page.goto(`${BASE}#${path}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(350)

    const est = {
      navDesktop: await page.evaluate(visivel('.scw-nav')),
      abas: await page.evaluate(visivel('.scw-abas')),
      acesso: await page.evaluate(visivel('.scw-acesso-topo')),
      header: await page.evaluate(visivel('.scw-header')),
      rodape: await page.evaluate(visivel('.scw-footer')),
      h1: await page.evaluate(`document.querySelectorAll('main h1, .scw-edx h1, .scw-edx-mob h1').length`),
      rolagemH: await page.evaluate(`document.documentElement.scrollWidth - document.documentElement.clientWidth`),
      corPagina: await page.evaluate(`getComputedStyle(document.body).getPropertyValue('--scw-pagina').trim()`),
    }

    const desktop = w > 900
    const linha = `${nomeTela.padEnd(7)} ${rota.padEnd(11)}`

    // 1. modos da casca não podem coexistir
    if (desktop && est.abas === 'visivel') problemas.push(`${linha} barra de abas do celular visível no desktop`)
    if (!desktop && est.navDesktop === 'visivel') problemas.push(`${linha} menu do desktop visível no celular`)
    if (!desktop && est.acesso === 'visivel') problemas.push(`${linha} botão de acesso do topo visível no celular`)
    if (desktop && rota !== 'edicoes' && est.navDesktop !== 'visivel') problemas.push(`${linha} menu do desktop ausente (${est.navDesktop})`)
    if (!desktop && est.abas !== 'visivel') problemas.push(`${linha} barra de abas ausente no celular (${est.abas})`)

    // 2. casca por rota: Edições tem cabeçalho próprio, sem header/rodapé do site
    if (rota === 'edicoes') {
      if (est.header === 'visivel') problemas.push(`${linha} header do site aparece em Edições`)
      if (est.rodape === 'visivel') problemas.push(`${linha} rodapé aparece em Edições`)
    } else {
      if (est.header !== 'visivel') problemas.push(`${linha} header do site ausente (${est.header})`)
      if (est.rodape !== 'visivel') problemas.push(`${linha} rodapé ausente (${est.rodape})`)
    }

    // 3. um H1 por página
    if (est.h1 !== 1) problemas.push(`${linha} ${est.h1} elementos h1 (esperado 1)`)

    // 4. sem rolagem horizontal
    if (est.rolagemH > 1) problemas.push(`${linha} rolagem horizontal de ${est.rolagemH}px`)

    // 5. cor da página aplicada
    if (!est.corPagina) problemas.push(`${linha} --scw-pagina vazia`)

    console.log(`${linha} nav=${est.navDesktop} abas=${est.abas} header=${est.header} rodape=${est.rodape} h1=${est.h1} overflowX=${est.rolagemH} cor=${est.corPagina}`)
  }
  await ctx.close()
}

await navegador.close()

console.log('\n================ PROBLEMAS ================')
if (!problemas.length) console.log('nenhum')
else problemas.forEach((p) => console.log('• ' + p))

console.log('\n================ ERROS DE CONSOLE ================')
if (!erros.length) console.log('nenhum')
else [...new Set(erros)].forEach((e) => console.log('• ' + e))
