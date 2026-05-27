import fs from 'node:fs/promises'
import path from 'node:path'
import QRCode from 'qrcode'
import { PARTICIPANTS } from '../src/data/participants.js'

const BASE_URL = 'https://www.sweetcoffeeweek.com.br'
const OUT_DIR = path.resolve('exports/qrcodes/lovers')
const COMBOS_DIR = path.join(OUT_DIR, 'combos')

const qrOptions = {
  errorCorrectionLevel: 'H',
  type: 'png',
  width: 1200,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
}

function comboUrl(slug) {
  return `${BASE_URL}/#/lovers/combos/${slug}`
}

function awardsUrl() {
  return `${BASE_URL}/#/lovers/awards`
}

function csvEscape(value) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

async function main() {
  await fs.mkdir(COMBOS_DIR, { recursive: true })

  const rows = [
    ['name', 'type', 'slug', 'url', 'file'],
  ]

  for (const participant of PARTICIPANTS) {
    const url = comboUrl(participant.slug)
    const fileName = `${participant.slug}.png`
    const filePath = path.join(COMBOS_DIR, fileName)

    await QRCode.toFile(filePath, url, qrOptions)

    rows.push([
      participant.name,
      'combo',
      participant.slug,
      url,
      `exports/qrcodes/lovers/combos/${fileName}`,
    ])

    console.log(`✓ ${participant.slug}`)
  }

  const awardsFile = path.join(OUT_DIR, 'awards.png')
  const awards = awardsUrl()
  await QRCode.toFile(awardsFile, awards, qrOptions)
  console.log('✓ awards')

  rows.push([
    'Sweet & Coffee Week Awards',
    'awards',
    'awards',
    awards,
    'exports/qrcodes/lovers/awards.png',
  ])

  const csv = rows.map(row => row.map(csvEscape).join(',')).join('\n')
  await fs.writeFile(path.join(OUT_DIR, 'qrcodes-lovers.csv'), csv, 'utf8')

  console.log(`\nQR Codes gerados em: ${OUT_DIR}`)
  console.log(`${PARTICIPANTS.length} QR Codes de combos + 1 QR Code de premiação`)
  console.log(`CSV: exports/qrcodes/lovers/qrcodes-lovers.csv`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
