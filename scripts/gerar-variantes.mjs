// Gera variantes estreitas das fotos do acervo, para o site parar de mandar um
// JPEG de desktop para uma tela de 390px.
//
// MEDIDA QUE MOTIVOU O SCRIPT (21/08/2026, no build, a 390px): a Home baixava
// 8,8 MB de foto antes de qualquer rolagem. O adiamento de carga (HeroFotos +
// GaleriaCarrossel) derrubou para 4,6 MB; o que sobra é peso de arquivo — os
// mesmos originais de desktop, com 1000 a 2000px de largura, servidos a um
// cartão que ocupa 340 CSS px.
//
// FERRAMENTA: o Chromium do Playwright, que já está no projeto — mesma escolha
// de `compute-focal-points.mjs` e `gen-favicon.mjs`. O `canvas` do navegador
// redimensiona e o próprio Chromium codifica o WebP (libwebp de verdade).
// Nenhuma dependência nova entra no package.json por causa disto.
//
// O QUE ELE FAZ: para cada foto acima do piso de peso e de largura, escreve
// `<nome>-480.webp` e `<nome>-960.webp` ao lado do original. O original NÃO é
// tocado — continua sendo o que o desktop recebe e a última entrada do
// `srcset`. Rodar de novo pula o que já existe, então é barato repetir.
//
// Uso: node scripts/gerar-variantes.mjs [--forcar] [--so=<trecho do caminho>]
// Rodar sempre que entrar foto nova em public/images.

import { chromium } from 'playwright'
import http from 'node:http'
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = join(__dirname, '..', 'public')

/* As duas larguras cobrem o que o site pede no celular:
   · 480 — miniatura de galeria e logo de marca (150–240 CSS px, até 3x);
   · 960 — cartão de pódio e herói sangrando a 390–430 CSS px (2,2 a 2,5x).
   Acima disso o desktop recebe o original, que é o que o `srcset` faz sozinho. */
export const LARGURAS = [480, 960]

/* Pisos. Abaixo deles a variante não paga o próprio arquivo: uma foto de 90KB
   vira duas de 40KB e o ganho não cobre a requisição a mais. */
const PISO_KB = 100
const PISO_LARGURA = 700

/* Qualidade do WebP. 0,78 é o joelho da curva para fotografia de comida — abaixo
   disso aparecem blocos no fundo desfocado dos combos, que é onde o artefato
   é mais visível neste acervo. */
const QUALIDADE = 0.72

const args = process.argv.slice(2)
const FORCAR = args.includes('--forcar')
const SO = (args.find((a) => a.startsWith('--so=')) || '').slice(5)

const eDerivada = (nome) => /-\d+\.webp$/.test(nome)

function listar(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...listar(p))
    else if (/\.(jpe?g|png|webp)$/i.test(e.name) && !eDerivada(e.name)) out.push(p)
  }
  return out
}

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

/* A página de trabalho é servida pelo MESMO servidor das fotos, e não
   `about:blank`. Motivo: o Chromium trata `about:blank` como origem nula em
   contexto inseguro, e o Private Network Access barra qualquer leitura dela
   para o loopback — `img.decode()` estourava com EncodingError e todo arquivo
   caía como "fora dos pisos". Mesma origem, e o canvas também não fica
   contaminado, que é o que permite o `toDataURL`. */
function servir() {
  const s = http.createServer((req, res) => {
    const caminho = decodeURIComponent(req.url.split('?')[0])
    if (caminho === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.end('<!doctype html><meta charset="utf-8"><title>gerar-variantes</title>')
    }
    const p = join(PUBLIC_DIR, caminho)
    if (!p.startsWith(PUBLIC_DIR) || !existsSync(p)) { res.statusCode = 404; return res.end() }
    res.setHeader('Content-Type', MIME[extname(p).toLowerCase()] || 'application/octet-stream')
    createReadStream(p).pipe(res)
  })
  return new Promise((r) => s.listen(0, '127.0.0.1', () => r({ servidor: s, porta: s.address().port })))
}

const { servidor, porta } = await servir()
const navegador = await chromium.launch()
const pagina = await navegador.newPage()
await pagina.goto(`http://127.0.0.1:${porta}/`)

const todos = listar(join(PUBLIC_DIR, 'images')).filter((p) => !SO || p.includes(SO))
let feitas = 0, puladas = 0, jaExistiam = 0, bytesOrig = 0, bytesNovos = 0

for (const arq of todos) {
  const kb = statSync(arq).size / 1024
  if (kb < PISO_KB) { puladas++; continue }

  const url = '/' + arq.slice(PUBLIC_DIR.length + 1).split('\\').join('/')
  const base = arq.slice(0, -extname(arq).length)

  /* Largura real da foto: variante mais larga que o original seria upscale —
     arquivo maior, imagem pior. */
  const largura = await pagina.evaluate(async (u) => {
    const img = new Image()
    img.src = u
    try { await img.decode() } catch { return 0 }
    return img.naturalWidth
  }, `http://127.0.0.1:${porta}${url}`)

  if (!largura || largura < PISO_LARGURA) { puladas++; continue }

  for (const w of LARGURAS) {
    if (w >= largura) continue
    const destino = `${base}-${w}.webp`
    if (existsSync(destino) && !FORCAR) { jaExistiam++; continue }

    const dataUrl = await pagina.evaluate(async ([u, alvo, q]) => {
      const img = new Image()
      img.src = u
      await img.decode()
      const c = document.createElement('canvas')
      c.width = alvo
      c.height = Math.round((img.naturalHeight / img.naturalWidth) * alvo)
      const ctx = c.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, c.width, c.height)
      return c.toDataURL('image/webp', q)
    }, [`http://127.0.0.1:${porta}${url}`, w, QUALIDADE])

    const buf = Buffer.from(dataUrl.split(',')[1], 'base64')
    await writeFile(destino, buf)
    feitas++
    bytesOrig += statSync(arq).size
    bytesNovos += buf.length
    if (feitas % 40 === 0) console.log(`  ${feitas} variantes…`)
  }
}

/* MANIFESTO. O `srcset` não pode citar um arquivo que não existe: o navegador
   escolheria o candidato pela largura declarada e só descobriria o 404 depois,
   deixando o quadro vazio. Então quem tem variante é declarado, e o
   `imageLibrary` só monta `srcset` para esses caminhos.
   Mesmo padrão de `compute-focal-points.mjs`, que escreve `focalPoints.js`. */
const comVariante = []
for (const arq of listar(join(PUBLIC_DIR, 'images'))) {
  const base = arq.slice(0, -extname(arq).length)
  const larguras = LARGURAS.filter((w) => existsSync(`${base}-${w}.webp`))
  if (!larguras.length) continue

  const url = '/' + arq.slice(PUBLIC_DIR.length + 1).split('\\').join('/')
  /* A largura REAL do original entra no manifesto porque o `srcset` precisa
     descrever todos os candidatos em `w` — sem ela o original ficaria de fora e
     o desktop passaria a receber a variante de 960px no lugar do arquivo cheio,
     que é justamente o que não pode acontecer. */
  const original = await pagina.evaluate(async (u) => {
    const img = new Image()
    img.src = u
    try { await img.decode() } catch { return 0 }
    return img.naturalWidth
  }, `http://127.0.0.1:${porta}${url}`)

  comVariante.push([url, larguras, original])
}
comVariante.sort((a, b) => a[0].localeCompare(b[0]))

await navegador.close()
servidor.close()

const saida = `/* GERADO por scripts/gerar-variantes.mjs — não editar à mão.
 *
 * Quais fotos têm variante estreita em disco, em que larguras, e qual a largura
 * do original. O \`imageLibrary.srcSet()\` lê daqui: caminho que não está nesta
 * tabela sai sem \`srcset\`, e o navegador usa o original — que é o
 * comportamento de antes.
 *
 * Rodar \`node scripts/gerar-variantes.mjs\` depois de acrescentar foto ao acervo.
 */

export const VARIANTES = new Map([
${comVariante.map(([p, ls, o]) => `  ['${p}', { larguras: [${ls.join(', ')}], original: ${o} }],`).join('\n')}
])

export default VARIANTES
`
await writeFile(join(__dirname, '..', 'src', 'data', 'imageVariants.js'), saida)
console.log(`manifesto: ${comVariante.length} fotos com variante → src/data/imageVariants.js`)

console.log(`\nvariantes geradas: ${feitas}`)
console.log(`já existiam:       ${jaExistiam}`)
console.log(`fora dos pisos:    ${puladas} (abaixo de ${PISO_KB}KB ou ${PISO_LARGURA}px)`)
if (feitas) {
  console.log(`peso: ${(bytesNovos / 1048576).toFixed(1)} MB de variantes`)
}
