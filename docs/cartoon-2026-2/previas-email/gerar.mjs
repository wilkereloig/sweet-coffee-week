// Gera as prévias locais dos e-mails da Caça (imagem local no lugar da URL do site) e tira captura. Uso: node docs/cartoon-2026-2/previas-email/gerar.mjs
import { writeFileSync, readFileSync } from 'node:fs'
import { montarEmail, montarEmailLink, ARTE_SELO } from '../../../supabase/functions/caca-email/montar.js'
import { chromium } from 'playwright'
const dir = new URL('.', import.meta.url)
const png = 'data:image/png;base64,' + readFileSync(new URL('../../../public/images/email/selo-cartoon-email.png', import.meta.url)).toString('base64')
const pecas = {
  codigo: montarEmail('confirmar', '482913'),
  recuperar: montarEmail('recuperar', '071530'),
  link: montarEmailLink('AbCdEfGhIjKlMnOpQrStUvWxYz012345'),
}
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 640, height: 700 } })
for (const [nome, m] of Object.entries(pecas)) {
  const html = m.html.replaceAll(ARTE_SELO, png)
  writeFileSync(new URL(`${nome}.html`, dir), html)
  await pg.setContent(html); await pg.screenshot({ path: new URL(`${nome}.png`, dir).pathname.replace(/^\/([A-Z]:)/, '$1'), fullPage: true })
}
await b.close()
