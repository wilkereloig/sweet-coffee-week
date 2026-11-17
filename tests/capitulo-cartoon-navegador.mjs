// Home · Capítulo Cartoon e abertura do Sweet Awards em apuração, no NAVEGADOR (16/11/2026).
//
//   npm run build && node tests/capitulo-cartoon-navegador.mjs
//   BASE=http://localhost:3000 node tests/capitulo-cartoon-navegador.mjs   (contra um servidor já no ar)
//
// Confere o que a leitura do código não prova: teclado e foco na ampliação da cidade (Enter abre, foco no Fechar,
// Esc fecha, foco volta ao botão), alvos de toque de 44px, ausência de rolagem lateral em 360/390/768/1440, o que
// o celular realmente baixa (nunca a cidade de 4096 nem a arte inteira antes de ampliar), nenhuma requisição de
// vídeo, mapa ou banco da edição, seção inteira com prefers-reduced-motion, e o salto "Ver resultados anteriores"
// do Sweet Awards levando o foco ao título. Capturas em tests/capturas-capitulo-cartoon/.
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const saida = fileURLToPath(new URL('./capturas-capitulo-cartoon/', import.meta.url))
mkdirSync(saida, { recursive: true })

const PORTA = 4179
let BASE = process.env.BASE
let servidor = null
if (!BASE) {
  servidor = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'preview', '--port', String(PORTA), '--strictPort'], { cwd: raiz, stdio: 'ignore', shell: process.platform === 'win32' })
  BASE = `http://localhost:${PORTA}`
  for (let i = 0; i < 60; i += 1) {
    try { if ((await fetch(BASE)).ok) break } catch { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 500))
  }
}

const falhas = []
const falha = (m) => { falhas.push(m); console.log('  ✖', m) }
const ok = (m) => console.log('  ✔', m)
const confere = (cond, m) => (cond ? ok(m) : falha(m))

const TELAS = [['celular-360', 360, 780, true], ['celular-390', 390, 844, true], ['tablet-768', 768, 1024, true], ['desktop-1440', 1440, 900, false]]
const b = await chromium.launch()

try {
  for (const [nome, w, h, toque] of TELAS) {
    console.log(`\n${nome}`)
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque && w < 600, deviceScaleFactor: toque ? 2 : 1 })
    await ctx.addInitScript(() => { try { localStorage.setItem('scw_privacidade', JSON.stringify({ v: 1, analise: false, em: Date.now(), ate: Date.now() + 9e9 })) } catch { /* sem storage */ } })
    const p = await ctx.newPage()
    const pedidos = []
    p.on('request', (r) => pedidos.push(r.url()))
    const erros = []
    p.on('pageerror', (e) => erros.push(String(e)))

    await p.goto(`${BASE}/?preview=1`, { waitUntil: 'networkidle' })
    const secao = p.locator('.hm-cap')
    await secao.scrollIntoViewIfNeeded()
    await p.waitForTimeout(700)

    confere(await p.locator('h1').count() === 1, 'um <h1> na Home')
    confere(await secao.locator('h2#hm-cap-titulo').innerText() === 'Essa história ainda tem um próximo capítulo.', 'título da seção Cartoon')
    confere((await secao.locator('.hm-cap__estado').innerText()).trim() === 'Resultados em apuração.', 'estado: em apuração')
    const medidas = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
    confere(medidas.sw <= medidas.cw, `sem rolagem lateral (${medidas.sw} ≤ ${medidas.cw})`)

    // Fonte e cor da edição valem dentro da seção — e só nela.
    const estilo = await p.evaluate(() => {
      const f = (s) => getComputedStyle(document.querySelector(s)).fontFamily
      return { dentro: f('#hm-cap-titulo'), fora: f('#hm-abre-titulo'), depois: f('.hm-festival h2, #festival h2') }
    })
    confere(/Grandstander/.test(estilo.dentro), 'Grandstander no título da seção')
    confere(!/Grandstander/.test(estilo.fora) && !/Grandstander/.test(estilo.depois), 'fora da seção a fonte é a institucional')

    // A cidade ocupa área de verdade (não é miniatura nem faixa).
    const quadro = await secao.locator('.hm-cap__quadro').boundingBox()
    confere(quadro.width >= w * 0.5 && quadro.height >= 240, `cidade com ${Math.round(quadro.width)}×${Math.round(quadro.height)}px`)
    const img = await secao.locator('.hm-cap__cidade').evaluate((el) => ({ src: el.currentSrc, ok: el.complete && el.naturalWidth > 0 }))
    confere(img.ok, 'a imagem da cidade carregou')
    if (w < 600) confere(!/1920|2048|3072|4096/.test(img.src), `celular baixa o recorte leve (${img.src.split('/').pop()})`)

    // Alvos de toque.
    const alvos = await secao.locator('a.hm-cap__btn, button.hm-cap__ctrl, a.hm-cap__insta').evaluateAll((els) => els.filter((el) => !el.closest('dialog')).map((el) => { const r = el.getBoundingClientRect(); return [el.textContent.trim().slice(0, 28), Math.round(r.height)] }))
    confere(alvos.every(([, alt]) => alt >= 44), `alvos ≥ 44px (${alvos.map((a) => a.join(' ')).join(' · ')})`)

    // Placa e botão "ver a cidade" não se sobrepõem.
    const caixas = await p.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); const a = r('.hm-cap__ver'); const c = r('.hm-cap__placa'); return a.right <= c.left || c.right <= a.left || a.bottom <= c.top || c.bottom <= a.top })
    confere(caixas, 'placa do Sweet Awards não cobre o botão da cidade')

    // Antes de ampliar: nada da arte inteira, nenhum vídeo, nada do mapa nem do banco.
    confere(!pedidos.some((u) => /base-final-v1/.test(u)), 'a arte inteira não baixa antes de ampliar')
    confere(!pedidos.some((u) => /\.mp4|maplibre|supabase\.co|maps\.googleapis/.test(u)), 'sem vídeo, mapa ou banco da edição na Home')

    // Ampliação pelo teclado.
    const ver = secao.locator('.hm-cap__ver')
    await ver.focus()
    await p.keyboard.press('Enter')
    const dialogo = p.locator('dialog.hm-cap__ampliada[open]')
    await dialogo.waitFor({ state: 'visible' })
    confere(await p.evaluate(() => document.activeElement?.hasAttribute('data-fechar')), 'ao abrir, o foco vai para "Fechar"')
    await p.waitForFunction(() => { const i = document.querySelector('dialog.hm-cap__ampliada img'); return i && i.complete && i.naturalWidth > 0 })
    const noDialogo = await dialogo.locator('button').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)))
    confere(noDialogo.length === 2 && noDialogo.every((alt) => alt >= 44), `controles da ampliação ≥ 44px (${noDialogo.join(', ')})`)
    const aVista = await dialogo.locator('img, h3, .hm-cap__ampliada-legenda').evaluateAll((els) => els.map((el) => {
      const c = getComputedStyle(el); const r = el.getBoundingClientRect()
      return c.opacity === '1' && c.visibility === 'visible' && r.width > 40 && r.height > 10
    }))
    confere(aVista.length === 3 && aVista.every(Boolean), 'arte, título e legenda visíveis na ampliação')
    const cabe = await dialogo.locator('.hm-cap__ampliada-palco').evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)
    confere(cabe, 'inteira: a arte cabe na área, sem corte nem rolagem')
    await p.locator('dialog.hm-cap__ampliada img').evaluate((el) => el.decode().catch(() => {}))
    await p.waitForTimeout(300)
    await p.screenshot({ path: `${saida}/${nome}-ampliada.png` })
    const inteira = await dialogo.locator('img').evaluate((el) => el.currentSrc)
    confere(!/4096/.test(inteira), `ampliada sem a versão de 4096 (${inteira.split('/').pop()})`)
    await dialogo.locator('button[aria-pressed]').click()
    confere(await dialogo.locator('.hm-cap__ampliada-palco.is-perto').count() === 1, 'aproximar liga a rolagem da arte')
    const rola = await dialogo.locator('.hm-cap__ampliada-palco').evaluate((el) => el.scrollWidth > el.clientWidth)
    confere(rola, 'aproximada, a arte rola dentro do diálogo')
    await p.keyboard.press('Escape')
    await p.waitForTimeout(200)
    confere(await p.locator('dialog.hm-cap__ampliada[open]').count() === 0, 'Esc fecha')
    confere(await p.evaluate(() => document.activeElement?.classList.contains('hm-cap__ver')), 'o foco volta ao botão que abriu')

    await secao.scrollIntoViewIfNeeded()
    await secao.screenshot({ path: `${saida}/${nome}-secao.png` })
    confere(erros.length === 0, `sem erro de página${erros.length ? ': ' + erros[0] : ''}`)

    // Sweet Awards: abertura da expectativa e o salto para os resultados anteriores.
    await p.goto(`${BASE}/sweet-awards?preview=1`, { waitUntil: 'networkidle' })
    confere(await p.locator('h1').count() === 1 && (await p.locator('h1').innerText()).replace(/\s+/g, ' ') === 'O reconhecimento da Cartoon está a caminho.', 'Awards abre com a expectativa da Cartoon')
    confere((await p.locator('.swa-gala__estado').innerText()).trim() === 'Resultados em apuração', 'Awards: estado em apuração')
    confere(await p.locator('.swa-gala__trofeu').evaluate((el) => el.complete && el.naturalWidth > 0), 'troféu carregado')
    confere(await p.locator('.swa-medalha, .swa-card').first().evaluate((el) => !el.closest('.swa-gala')), 'nenhum pódio ou medalha dentro da abertura')
    const sa = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
    confere(sa.sw <= sa.cw, 'Awards sem rolagem lateral')
    await p.screenshot({ path: `${saida}/${nome}-awards.png` })
    await p.locator('.swa-gala a[href="#swa-resultados"]').click()
    await p.waitForTimeout(900)
    confere(await p.evaluate(() => document.activeElement?.id === 'swa-resultados-titulo'), '"Ver resultados anteriores" leva o foco ao título dos resultados')
    confere(/Último resultado publicado · 2026\.1 Lovers/i.test(await p.locator('#swa-resultados .scw-rotulo').innerText()), 'os resultados dizem que são os últimos publicados (Lovers)')
    await ctx.close()
  }

  // Movimento reduzido: a seção inteira, legível e sem animação rodando.
  console.log('\nmovimento reduzido (390)')
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const p = await ctx.newPage()
  await p.goto(`${BASE}/?preview=1`, { waitUntil: 'networkidle' })
  await p.locator('.hm-cap').scrollIntoViewIfNeeded()
  await p.waitForTimeout(400)
  const parado = await p.evaluate(() => {
    const s = document.querySelector('.hm-cap')
    const visivel = [...s.querySelectorAll('h2, .hm-cap__estado, .hm-cap__btn, .hm-cap__cidade, .hm-cap__gratos-titulo')].every((el) => { const c = getComputedStyle(el); return c.opacity !== '0' && c.visibility !== 'hidden' })
    return { visivel, animando: s.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length }
  })
  confere(parado.visivel, 'tudo visível sem movimento')
  confere(parado.animando === 0, 'nenhuma animação rodando na seção')
  await ctx.close()
} finally {
  await b.close()
  /* No Windows o `vite preview` sobe por um shell: matar só o pai deixa o servidor vivo, segurando a pasta
     dist/ (o build seguinte falha com EPERM). Derruba a árvore inteira. */
  if (servidor) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(servidor.pid), '/T', '/F'], { stdio: 'ignore' })
    else servidor.kill()
  }
}

console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\ntudo certo')
process.exit(falhas.length ? 1 : 0)
