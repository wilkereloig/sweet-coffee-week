/*
 * Auditoria fotográfica em navegador — roda contra um build servido.
 * Não é `node --test`: precisa de servidor. Uso:
 *   npx vite build --outDir "$TEMP/scw_img" --emptyOutDir
 *   npx vite preview --outDir "$TEMP/scw_img" --port 5204 --strictPort
 *   node tests/imagens-navegador.mjs
 *
 * Confere o que só existe em runtime: imagem que não carregou, alt ausente ou
 * genérico, requisição de imagem com erro, e o carrossel de Edições realmente
 * trocando de foto por clique e por teclado.
 */
import { chromium } from 'playwright'

const B = 'http://localhost:5204/?preview=1'
const ROTAS = [['home','/'],['edicoes','/edicoes'],['awards','/sweet-awards'],
               ['participar','/participar'],['apoiar','/apoiar'],['contato','/contato']]
const GENERICO = /^(imagem|foto|banner|doce|combo|logo)\.?$/i

const b = await chromium.launch()
const P = []
const SEED = { storageState: { cookies: [], origins: [{ origin: 'http://localhost:5204', localStorage: [{ name: 'scw_consent', value: 'denied' }] }] } }

for (const [tela, w, h] of [['desktop',1440,900],['mobile',390,844]]) {
  const ctx = await b.newContext({ ...SEED, viewport: { width: w, height: h } })
  const page = await ctx.newPage()
  const falhas = []
  page.on('response', (r) => {
    if (r.request().resourceType() === 'image' && r.status() >= 400) falhas.push(`${r.status()} ${r.url().split('/').slice(3).join('/')}`)
  })

  for (const [rota, path] of ROTAS) {
    await page.goto(`${B}#${path}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    // rola a página para disparar o lazy loading
    await page.evaluate(`new Promise(r => { let y = 0; const id = setInterval(() => {
      window.scrollTo(0, y); y += window.innerHeight;
      if (y > document.body.scrollHeight) { clearInterval(id); window.scrollTo(0,0); r() }
    }, 120) })`)
    await page.waitForTimeout(900)

    const est = await page.evaluate(`(() => {
      const imgs = [...document.images]
      const quebradas = imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.currentSrc || i.src)
      const semAlt = imgs.filter(i => !i.hasAttribute('alt')).map(i => i.currentSrc || i.src)
      const alts = imgs.map(i => i.getAttribute('alt')).filter(a => a)
      const comFundo = [...document.querySelectorAll('*')].filter(e => {
        const bg = getComputedStyle(e).backgroundImage
        return bg && bg.includes('/images/')
      }).length
      return { total: imgs.length, quebradas, semAlt, alts, comFundo }
    })()`)

    est.quebradas.forEach((s) => P.push(`${tela} ${rota}: imagem não carregou — ${s.split('/').slice(3).join('/')}`))
    est.semAlt.forEach((s) => P.push(`${tela} ${rota}: <img> sem atributo alt — ${s.split('/').slice(3).join('/')}`))
    est.alts.filter((a) => GENERICO.test(a.trim())).forEach((a) => P.push(`${tela} ${rota}: alt genérico "${a}"`))

    console.log(`${tela.padEnd(7)} ${rota.padEnd(11)} imgs=${String(est.total).padStart(3)} fundos=${String(est.comFundo).padStart(3)} quebradas=${est.quebradas.length} semAlt=${est.semAlt.length}`)
  }

  // carrossel de Edições: clique e teclado precisam trocar a foto
  await page.goto(`${B}#/edicoes`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  const antes = await page.evaluate(`[...document.querySelectorAll('[data-galeria] img')].map(i => i.getAttribute('src')).join('|')`)
  const proxima = await page.$('[data-galeria] button[aria-label*="róxim"], [data-galeria] button[aria-label*="eguinte"], [data-galeria] button[aria-label*="Próxima"]')
  if (!proxima) {
    P.push(`${tela} edicoes: carrossel sem botão de próxima foto`)
  } else {
    await proxima.click(); await page.waitForTimeout(700)
    const depois = await page.evaluate(`[...document.querySelectorAll('[data-galeria] img')].map(i => i.getAttribute('src')).join('|')`)
    if (antes === depois) P.push(`${tela} edicoes: clique em "próxima" não trocou a foto`)
    else console.log(`${tela.padEnd(7)} carrossel: clique troca a foto ✓`)
  }
  falhas.forEach((f) => P.push(`${tela}: requisição de imagem falhou — ${f}`))
  await ctx.close()
}

await b.close()
console.log('\n============ PROBLEMAS ============')
console.log(P.length ? [...new Set(P)].map((x) => '• ' + x).join('\n') : 'nenhum')
