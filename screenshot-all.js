import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BASE = 'http://localhost:5173'
const OUT  = path.join(__dirname, 'screenshots')

const PAGES = [
  { name: '01-home',              hash: ''                  },
  { name: '02-curiosidades',      hash: '#/curiosidades'    },
  { name: '03-edicoes',           hash: '#/edicoes'         },
  { name: '04-participar',        hash: '#/participar'      },
  { name: '05-apoiar',            hash: '#/apoiar'          },
  { name: '06-contato',           hash: '#/contato'         },
  { name: '07-lovers-hub',        hash: '#/lovers'          },
  { name: '08-lovers-combos',     hash: '#/lovers/combos'   },
  { name: '09-lovers-mapa',       hash: '#/lovers/mapa'     },
  { name: '10-lovers-awards',     hash: '#/lovers/awards'   },
]

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch()
  const page    = await browser.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })

  for (const p of PAGES) {
    await page.goto(`${BASE}/${p.hash}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    const file = path.join(OUT, `${p.name}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log(`✓ ${p.name}`)
  }

  await browser.close()
  console.log(`\nSalvo em: ${OUT}`)
})()
