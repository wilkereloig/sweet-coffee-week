#!/usr/bin/env node
/*
 * QR Codes das casas da edição (fase 8 do plano docs/cartoon-2026-2/, §2.4).
 *
 * Lê a PROJEÇÃO PÚBLICA (edicao_publica — a mesma que o site lê): só gera QR de
 * casa publicada, com o slug que o banco já congelou na 1ª publicação. Endereço
 * limpo, sem hash: https://www.sweetcoffeeweek.com.br/cartoon/participantes/<slug>?utm_source=qr&utm_medium=impresso&utm_campaign=cartoon
 * (o roteador lê o caminho; os utm_* são os únicos parâmetros que o Analytics guarda —
 * src/lib/analytics.js enderecoLimpo —, então a origem "QR impresso" fica medida sem código novo).
 *
 * Saída FORA do repositório por padrão (os PNGs são material de impressão):
 *   ../sweet-coffee-week-dados/qr-cartoon-<AAAA-MM-DD>/<slug>.png + lista.csv
 *
 * Uso:
 *   node scripts/qr-edicao.mjs                 → edição 2026.2, domínio oficial
 *   node scripts/qr-edicao.mjs --saida <pasta> --base <url> --edicao <codigo>
 *   node scripts/qr-edicao.mjs --lista <arquivo.json>   → antes da publicação (slug já gravado)
 *
 * Nunca gerar QR sem slug_publico gravado: ele congela na publicação (ou quando a
 * organização grava antes — 16/10/2026, os 25 da Cartoon), e um QR impresso com slug
 * provisório apontaria para o nada. Slug gravado e ainda não publicado pode ser trocado
 * no painel SEM alias — trocar depois de imprimir quebra o QR.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import QRCode from 'qrcode'

const arg = (nome, padrao) => {
  const i = process.argv.indexOf(`--${nome}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : padrao
}
const EDICAO = arg('edicao', '2026.2')
const BASE = arg('base', 'https://www.sweetcoffeeweek.com.br').replace(/\/$/, '')
const CAMINHO = arg('caminho', '/cartoon')
const hoje = new Date().toISOString().slice(0, 10)
const SAIDA = path.resolve(arg('saida', `../sweet-coffee-week-dados/qr-cartoon-${hoje}`))

// Mesma URL e chave PÚBLICA do site (src/lib/supabaseConfig.js); lidas do arquivo
// para não haver uma segunda cópia. A chave publicável é pública por desenho.
const config = await fs.readFile(new URL('../src/lib/supabaseConfig.js', import.meta.url), 'utf8')
const URL_BASE = process.env.VITE_SUPABASE_URL || /SUPABASE_URL = .*?'([^']+)'/.exec(config)[1]
const CHAVE = process.env.VITE_SUPABASE_KEY || /SUPABASE_KEY =\s*\n?\s*.*?'([^']+)'/s.exec(config)[1]

// --lista <arquivo.json> ([{ "casa": "...", "slug": "..." }]): QR antes da publicação, com
// slug_publico já gravado no banco (a publicação mantém slug existente — cartoon_02 §v_slug).
async function casasDaLista (arquivo) {
  const lista = JSON.parse(await fs.readFile(arquivo, 'utf8'))
  return lista.map(({ casa, slug }) => ({ slug, casa: { nome: casa } }))
}

async function main () {
  const LISTA = arg('lista', null)
  const casas = LISTA ? await casasDaLista(path.resolve(LISTA)) : await casasDaProjecao()
  if (!casas) return
  await gerar(casas)
}

async function casasDaProjecao () {
  const r = await fetch(`${URL_BASE}/rest/v1/rpc/edicao_publica`, {
    method: 'POST',
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_edicao: EDICAO }),
  })
  if (!r.ok) { console.error(`✗ projeção respondeu ${r.status}. As migrations da Cartoon estão aplicadas?`); process.exitCode = 1; return }
  const dados = await r.json()
  if (!dados?.participantes_publicos) { console.error('✗ participantes ainda não publicados (interruptor 3 desligado). Nada a gerar.'); process.exitCode = 1; return }
  const casas = (dados.participantes || []).filter((p) => p.slug)
  if (!casas.length) { console.error('✗ nenhuma casa publicada.'); process.exitCode = 1; return }
  return casas
}

async function gerar (casas) {
  await fs.mkdir(SAIDA, { recursive: true })
  const csv = [['casa', 'slug', 'url', 'arquivo']]
  const opcoes = { errorCorrectionLevel: 'H', type: 'png', width: 1200, margin: 2, color: { dark: '#050505', light: '#FFFFFF' } }
  for (const p of casas) {
    const url = `${BASE}${CAMINHO}/participantes/${p.slug}?utm_source=qr&utm_medium=impresso&utm_campaign=cartoon`
    const arquivo = `${p.slug}.png`
    await QRCode.toFile(path.join(SAIDA, arquivo), url, opcoes)
    csv.push([p.casa?.nome || p.slug, p.slug, url, arquivo])
  }
  const linha = (c) => c.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')
  await fs.writeFile(path.join(SAIDA, 'lista.csv'), csv.map(linha).join('\n') + '\n', 'utf8')
  console.log(`✓ ${casas.length} QR Codes em ${SAIDA}`)
}

await main()
