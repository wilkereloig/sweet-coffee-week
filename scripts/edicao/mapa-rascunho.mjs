// Rascunho de posições do mapa desenhado da Cartoon (docs/cartoon-2026-2/14-mapa-da-docura.md §14.12).
//
//   node scripts/edicao/mapa-rascunho.mjs
//
// Lê o retrato local (casas, unidades, bairro, coordenada quando conferida) e a geografia do OpenStreetMap
// guardada em cache no Dropbox (litoral, rios, centro de cada bairro). Monta o mapa ESQUEMÁTICO: projeção real,
// lente que abre a Zona Sul (onde as casas se amontoam) e afasta as bolinhas que se encostam, sem trocar a ordem
// dos bairros. Numera as casas pela ordem do caminho (Norte → Leste → Oeste → Sul → Ponta Negra → Parnamirim).
//
// Saída (Dropbox, 06_MATERIAIS_PDV/03_MAPA_IMPRESSO/01_RASCUNHO_POSICOES/):
//   rascunho-posicoes-v1.png  — para o Wilker conferir
//   _bastidores/posicoes.json — posição de cada unidade (0–1), número da casa, região, fonte da posição
// Base geográfica © colaboradores do OpenStreetMap (ODbL).
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RAIZ = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(`${RAIZ}package.json`)
const PASTA = 'F:/F2 Experience Dropbox/Criação ELOI Design/SWEET&COFFEE WEEK/2026.2 SCW CARTOONS/06_MATERIAIS_PDV/03_MAPA_IMPRESSO/01_RASCUNHO_POSICOES'
const OSM = JSON.parse(readFileSync(`${PASTA}/_bastidores/osm-natal-2026-11-03.json`, 'utf8')).elements
const RETRATO = JSON.parse(readFileSync(`${RAIZ}src/edicao/dados/retrato/cartoon.local.json`, 'utf8'))

// Ordem do caminho: Ponta Negra fecha o percurso (o Morro do Careca é o "final"); passar por Parnamirim antes
// evita o vaivém Zona Sul → Ponta Negra → Parnamirim.
const REGIOES = ['Zona Norte', 'Zona Leste', 'Zona Oeste', 'Zona Sul', 'Parnamirim', 'Ponta Negra']
const REGIAO_DO_BAIRRO = {
  potengi: 'Zona Norte',
  tirol: 'Zona Leste', petropolis: 'Zona Leste', 'lagoa seca': 'Zona Leste', 'barro vermelho': 'Zona Leste',
  'cidade da esperanca': 'Zona Oeste',
  'capim macio': 'Zona Sul', 'lagoa nova': 'Zona Sul', candelaria: 'Zona Sul', neopolis: 'Zona Sul', pitimbu: 'Zona Sul',
  'ponta negra': 'Ponta Negra',
  'nova parnamirim': 'Parnamirim', // qualquer bairro de Parnamirim cai em Parnamirim pela cidade
}
const MARCOS = [ // centros lidos do OpenStreetMap em 03/11/2026
  { nome: 'Ponte Newton Navarro', lat: -5.7470, lon: -35.2115 },
  { nome: 'Forte dos Reis Magos', lat: -5.7563, lon: -35.1950 },
  { nome: 'Arena das Dunas', lat: -5.8266, lon: -35.2127 },
  { nome: 'Parque das Dunas', lat: -5.8272, lon: -35.1905 },
  { nome: 'Morro do Careca (duna)', lat: -5.8838, lon: -35.1644 },
]
// Pontos da Sicredi (patrocínio, pedido do Wilker 03/11): lista em _bastidores/pontos-sicredi.json —
// { nome, endereco, lat, lon, confirmado }. Não confirmado sai tracejado.
const SICREDI = JSON.parse(readFileSync(`${PASTA}/_bastidores/pontos-sicredi.json`, 'utf8'))
const sem = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

// ── centro de cada bairro (OSM admin_level 10); "Centro" de Parnamirim é o do sul
const bairros = new Map()
for (const e of OSM) {
  if (e.tags?.admin_level !== '10' || !e.center) continue
  const k = sem(e.tags.name)
  if (k === 'centro') bairros.set(e.center.lat < -5.88 ? 'centro|parnamirim' : 'centro|natal', e.center) // dois "Centro"
  else bairros.set(k, e.center)
}

// ── unidades: coordenada conferida quando existe; senão, o centro do bairro
const unidades = []
for (const p of RETRATO.participantes) {
  for (const u of p.unidades || []) {
    const parnamirim = sem(u.endereco?.cidade) === 'parnamirim'
    const b = sem(u.endereco?.bairro)
    const pos = u.coordenada ? { lat: u.coordenada.lat, lon: u.coordenada.lng } : bairros.get(b === 'centro' ? `centro|${parnamirim ? 'parnamirim' : 'natal'}` : b)
    if (!pos) throw new Error(`sem posição: ${p.casa.nome} · bairro "${u.endereco?.bairro}"`)
    const regiao = parnamirim ? 'Parnamirim' : REGIAO_DO_BAIRRO[b]
    if (!regiao) throw new Error(`bairro sem região: "${u.endereco?.bairro}" (${p.casa.nome})`)
    const bairro = u.endereco.bairro.trim().toLowerCase().split(/\s+/).map((w) => (/^(da|de|do)$/.test(w) ? w : w[0].toUpperCase() + w.slice(1))).join(' ')
    unidades.push({ slug: p.slug, casa: p.casa.nome, unidade: u.id, bairro,
      regiao, fonte: u.coordenada ? 'coordenada' : 'bairro', lat: pos.lat, lon: pos.lon })
  }
}

// ── projeção local (metros) + lente que abre o miolo das casas
const LAT0 = -5.83
const kx = 111320 * Math.cos(LAT0 * Math.PI / 180), ky = 110574
const proj = ({ lat, lon }) => ({ x: lon * kx, y: -lat * ky })
const meio = unidades.map(proj).reduce((a, p, _, l) => ({ x: a.x + p.x / l.length, y: a.y + p.y / l.length }), { x: 0, y: 0 })
const RAIO = 16000, FORCA = 2.4 // lente de Sarkar-Brown: perto do centro amplia, longe comprime; nunca inverte a ordem
const lente = (p) => {
  const dx = p.x - meio.x, dy = p.y - meio.y, r = Math.hypot(dx, dy)
  if (!r) return { ...p }
  const n = Math.min(r / RAIO, 1), m = ((FORCA + 1) * n) / (FORCA * n + 1)
  const f = r / RAIO > 1 ? 1 : (m * RAIO) / r
  return { x: meio.x + dx * f, y: meio.y + dy * f }
}
const mapa = (ll) => lente(proj(ll))

// ── recorte e escala para a tela: o enquadramento é o das casas e dos marcos (a lente entorta as bordas do
// retângulo, então cantos não servem), com folga; a geografia de fora é cortada
const W = 1760, H = 1500, AREA = { x: 40, y: 90, w: 980, h: 1370 }, FOLGA = 1500 // metros
const chave_ = [...unidades, ...MARCOS, ...SICREDI].map(mapa)
const minX = Math.min(...chave_.map((c) => c.x)) - FOLGA, maxX = Math.max(...chave_.map((c) => c.x)) + FOLGA * 1.6
const minY = Math.min(...chave_.map((c) => c.y)) - FOLGA, maxY = Math.max(...chave_.map((c) => c.y)) + FOLGA
const esc = Math.min(AREA.w / (maxX - minX), AREA.h / (maxY - minY))
const sobraX = (AREA.w - (maxX - minX) * esc) / 2, sobraY = (AREA.h - (maxY - minY) * esc) / 2
const tela = (ll) => { const p = mapa(ll); return { x: AREA.x + sobraX + (p.x - minX) * esc, y: AREA.y + sobraY + (p.y - minY) * esc } }

for (const u of unidades) Object.assign(u, tela(u))

// ── afasta bolinhas encostadas (mola de volta ao lugar real; poucas centenas de passos bastam para 41 pontos)
const MIN = 50
const origem = unidades.map((u) => ({ x: u.x, y: u.y }))
const fixos = SICREDI.map(tela)
for (let passo = 0; passo < 400; passo++) {
  for (let i = 0; i < unidades.length; i++) {
    for (let j = i + 1; j < unidades.length; j++) {
      const a = unidades[i], b = unidades[j]
      let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy)
      if (d >= MIN) continue
      if (d < 0.01) { dx = Math.cos(i + j); dy = Math.sin(i + j); d = 1 }
      const emp = (MIN - d) / 2
      a.x -= (dx / d) * emp; a.y -= (dy / d) * emp; b.x += (dx / d) * emp; b.y += (dy / d) * emp
    }
  }
  for (const f of fixos) for (const u of unidades) { // ponto Sicredi não se mexe: a bolinha é que sai de cima
    const dx = u.x - f.x, dy = u.y - f.y, d = Math.hypot(dx, dy) || 1
    if (d < MIN) { u.x += (dx / d) * (MIN - d); u.y += (dy / d) * (MIN - d) }
  }
  unidades.forEach((u, i) => { u.x += (origem[i].x - u.x) * 0.02; u.y += (origem[i].y - u.y) * 0.02 })
}

// ── caminho: regiões na ordem. Dentro da região, vizinho mais perto — testando cada unidade como ponto de
// partida e ficando com o trajeto mais curto contando a chegada (do fim da região anterior) e a saída (rumo ao
// centro da próxima). Assim a região não termina numa casa isolada do lado errado.
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const centro = (l) => ({ x: l.reduce((a, u) => a + u.x, 0) / l.length, y: l.reduce((a, u) => a + u.y, 0) / l.length })
function vizinhos (inicio, lista) {
  const resto = lista.filter((u) => u !== inicio), ordem = [inicio]
  while (resto.length) { resto.sort((a, b) => dist(a, ordem.at(-1)) - dist(b, ordem.at(-1))); ordem.push(resto.shift()) }
  return ordem
}
const caminho = []
REGIOES.forEach((r, i) => {
  const lista = unidades.filter((u) => u.regiao === r); if (!lista.length) return
  const prox = REGIOES.slice(i + 1).map((q) => unidades.filter((u) => u.regiao === q)).find((l) => l.length)
  const anterior = caminho.at(-1)
  let melhor = null, custo = Infinity
  for (const inicio of lista) {
    const ordem = vizinhos(inicio, lista)
    const c = (anterior ? dist(anterior, inicio) : inicio.y) + ordem.slice(1).reduce((a, u, k) => a + dist(u, ordem[k]), 0) + (prox ? dist(ordem.at(-1), centro(prox)) : 0)
    if (c < custo) { custo = c; melhor = ordem }
  }
  caminho.push(...melhor)
})
const numero = new Map()
for (const u of caminho) if (!numero.has(u.slug)) numero.set(u.slug, numero.size + 1)
for (const u of unidades) u.numero = numero.get(u.slug)

// ── geografia em SVG
const linha = (geo) => geo.map((g, i) => { const p = tela({ lat: g.lat, lon: g.lon }); return `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join('')
const chave = (g) => `${g.lat.toFixed(7)},${g.lon.toFixed(7)}`
function juntar (vias) { // emenda os trechos do litoral pelas pontas
  const resto = vias.map((v) => [...v]), cadeias = []
  while (resto.length) {
    let c = resto.shift(), mudou = true
    while (mudou) {
      mudou = false
      for (let i = 0; i < resto.length; i++) {
        const v = resto[i]
        if (chave(v[0]) === chave(c.at(-1))) c = c.concat(v.slice(1))
        else if (chave(v.at(-1)) === chave(c[0])) c = v.concat(c.slice(1))
        else if (chave(v.at(-1)) === chave(c.at(-1))) c = c.concat([...v].reverse().slice(1))
        else if (chave(v[0]) === chave(c[0])) c = [...v].reverse().concat(c.slice(1))
        else continue
        resto.splice(i, 1); mudou = true; break
      }
    }
    cadeias.push(c)
  }
  return cadeias
}
const litoral = juntar(OSM.filter((e) => e.tags?.natural === 'coastline' && e.geometry).map((e) => e.geometry))
const LESTE = -35.0
const mar = litoral.filter((c) => c.length > 30).map((c) => { // fecha cada trecho longo pelo leste, onde fica o mar
  const ida = [...c, { lat: c.at(-1).lat, lon: LESTE }, { lat: c[0].lat, lon: LESTE }]
  return `<path d="${linha(ida)}Z" fill="#BFE6F2"/>`
}).join('')
const costa = litoral.map((c) => `<path d="${linha(c)}" fill="none" stroke="#3A150F" stroke-width="3" stroke-linejoin="round"/>`).join('')
const RIO = JSON.parse(readFileSync(`${PASTA}/_bastidores/osm-rio-potengi-2026-11-03.json`, 'utf8')).elements
const estuario = RIO.filter((e) => e.members).flatMap((e) => juntar(e.members.filter((m) => m.role === 'outer' && m.geometry).map((m) => m.geometry)))
  .map((c) => `<path d="${linha(c)}Z" fill="#BFE6F2" stroke="#3A150F" stroke-width="2"/>`).join('')
const rios = OSM.filter((e) => e.tags?.waterway === 'river' && e.geometry)
  .map((e) => `<path d="${linha(e.geometry)}" fill="none" stroke="#7CC8E2" stroke-width="${/potengi/i.test(e.tags.name) ? 14 : 5}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')

const esc_ = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
const trilha = `<path d="${caminho.map((u, i) => `${i ? 'L' : 'M'}${u.x.toFixed(1)},${u.y.toFixed(1)}`).join('')}" fill="none" stroke="#ED1C20" stroke-width="4" stroke-dasharray="2 10" stroke-linecap="round" stroke-linejoin="round"/>`
// Rótulos: entre algumas posições candidatas, a que fica mais longe das bolinhas e dos rótulos já postos
// (caixa estimada pela largura média da letra) e dentro da área do mapa.
const ocupados = unidades.map((u) => ({ x: u.x - 20, y: u.y - 20, w: 40, h: 40 }))
const folga = (c) => Math.min(...ocupados.map((o) => Math.max(o.x - (c.x + c.w), c.x - (o.x + o.w), o.y - (c.y + c.h), c.y - (o.y + o.h))))
const dentro = (c) => c.x > AREA.x + 6 && c.x + c.w < AREA.x + AREA.w - 6 && c.y > AREA.y + 6 && c.y + c.h < AREA.y + AREA.h - 6
function rotular (texto, ax, ay, tamanho, desvios) {
  const w = texto.length * tamanho * 0.56, h = tamanho * 1.1
  const cands = desvios.map(([dx, dy]) => ({ x: ax + dx - (dx < 0 ? w : dx === 0 ? w / 2 : 0), y: ay + dy - h / 2, w, h })).filter(dentro)
  const c = cands.sort((a, b) => folga(b) - folga(a))[0] || { x: ax, y: ay - h, w, h }
  ocupados.push(c)
  return { x: c.x, y: c.y + h * 0.8 }
}
const sicredi = SICREDI.map((s) => {
  const p = tela(s)
  ocupados.push({ x: p.x - 15, y: p.y - 15, w: 30, h: 30 })
  const r = rotular(s.nome, p.x, p.y, 13, [[20, 0], [-20, 0], [0, -26], [0, 26]])
  return `<g><rect x="${(p.x - 14).toFixed(1)}" y="${(p.y - 14).toFixed(1)}" width="28" height="28" rx="7" fill="#3FA535" stroke="#3A150F" stroke-width="2.5" ${s.confirmado ? '' : 'stroke-dasharray="5 3"'}/><text x="${p.x.toFixed(1)}" y="${(p.y + 6).toFixed(1)}" class="sic" text-anchor="middle">S</text><text x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" class="marco">${esc_(s.nome)}${s.confirmado ? '' : ' (a confirmar)'}</text></g>`
}).join('')
const marcos = MARCOS.map((m) => {
  const p = tela(m)
  ocupados.push({ x: p.x - 12, y: p.y - 14, w: 24, h: 22 })
  const r = rotular(m.nome, p.x, p.y, 13, [[15, 0], [-15, 0], [0, -24], [0, 24], [15, -18], [-15, 18]])
  return `<g><path d="M${p.x},${p.y - 13}l11,20h-22z" fill="#FDB901" stroke="#3A150F" stroke-width="2"/><text x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" class="marco">${esc_(m.nome)}</text></g>`
}).join('')
const rotulosRegiao = REGIOES.map((reg) => {
  const l = unidades.filter((u) => u.regiao === reg); if (!l.length) return ''
  const c = centro(l), r = rotular(reg, c.x, c.y, 22, [[0, -60], [0, 60], [70, 0], [-70, 0], [0, -110], [0, 110], [90, -50], [-90, -50], [90, 50], [-90, 50]])
  return `<text x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" class="regiao">${esc_(reg)}</text>`
}).join('')
const bolinhas = unidades.map((u) => `<g><circle cx="${u.x.toFixed(1)}" cy="${u.y.toFixed(1)}" r="17" fill="${u.fonte === 'coordenada' ? '#FCFCFC' : '#FDF0DE'}" stroke="#3A150F" stroke-width="2.5" ${u.fonte === 'bairro' ? 'stroke-dasharray="5 3"' : ''}/><text x="${u.x.toFixed(1)}" y="${(u.y + 5.5).toFixed(1)}" class="num" text-anchor="middle">${u.numero}</text></g>`).join('')

// ── legenda por região
const casas = [...numero.entries()].map(([slug, n]) => {
  const us = unidades.filter((u) => u.slug === slug)
  return { n, nome: us[0].casa, regiao: caminho.find((u) => u.slug === slug).regiao, bairros: [...new Set(us.map((u) => u.bairro))].join(', '), qtd: us.length }
})
const LX = 1060
let ly = 110, legenda = ''
for (const r of REGIOES) {
  const l = casas.filter((c) => c.regiao === r); if (!l.length) continue
  legenda += `<text x="${LX}" y="${ly}" class="leg-regiao">${esc_(r)}</text>`; ly += 26
  for (const c of l) {
    const bairros = `${c.bairros}${c.qtd > 1 ? ` (${c.qtd} unidades)` : ''}`
    const longa = bairros.length + c.nome.length > 52 // longa: os bairros descem para a linha de baixo
    legenda += `<text x="${LX}" y="${ly}" class="leg"><tspan class="leg-n">${c.n}</tspan>  ${esc_(c.nome)}${longa ? '' : `<tspan class="leg-b">  ·  ${esc_(bairros)}</tspan>`}</text>`
    if (longa) { ly += 19; legenda += `<text x="${LX + 26}" y="${ly}" class="leg leg-b">${esc_(bairros)}</text>` }
    ly += 21
  }
  ly += 10
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#F4E6CF"/>
<clipPath id="area"><rect x="${AREA.x}" y="${AREA.y}" width="${AREA.w}" height="${AREA.h}" rx="18"/></clipPath>
<g clip-path="url(#area)"><rect x="${AREA.x}" y="${AREA.y}" width="${AREA.w}" height="${AREA.h}" fill="#EFE3C4"/>${mar}${estuario}${rios}${costa}${trilha}${marcos}${rotulosRegiao}${bolinhas}${sicredi}</g>
<rect x="${AREA.x}" y="${AREA.y}" width="${AREA.w}" height="${AREA.h}" rx="18" fill="none" stroke="#3A150F" stroke-width="3"/>
<text x="40" y="58" class="titulo">Mapa da Doçura · rascunho de posições v1</text>
<text x="${LX}" y="58" class="sub">Casas pela ordem do caminho</text>
${legenda}
<g transform="translate(${LX} ${Math.max(ly + 20, 1260)})">
  <circle cx="14" cy="0" r="12" fill="#FCFCFC" stroke="#3A150F" stroke-width="2.5"/><text x="36" y="5" class="leg">unidade com localização conferida</text>
  <circle cx="14" cy="32" r="12" fill="#FDF0DE" stroke="#3A150F" stroke-width="2.5" stroke-dasharray="5 3"/><text x="36" y="37" class="leg">posição pelo centro do bairro</text>
  <path d="M2,64h26" stroke="#ED1C20" stroke-width="4" stroke-dasharray="2 10" stroke-linecap="round"/><text x="36" y="69" class="leg">caminho (ordem da numeração)</text>
  <path d="M14,88l11,20h-22z" fill="#FDB901" stroke="#3A150F" stroke-width="2"/><text x="36" y="103" class="leg">marco da cidade</text>
  <rect x="2" y="120" width="24" height="24" rx="6" fill="#3FA535" stroke="#3A150F" stroke-width="2.5"/><text x="14" y="138" class="sic" text-anchor="middle">S</text><text x="36" y="137" class="leg">ponto Sicredi (patrocínio)</text>
</g>
<text x="${AREA.x}" y="${H - 14}" class="credito">Esquemático: a Zona Sul está ampliada e a distância não é real. Base geográfica © colaboradores do OpenStreetMap.</text>
</svg>`

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: G; src: url('${pathToFileURL(`${RAIZ}public/fonts/grandstander/grandstander-latin.woff2`).href}'); font-weight: 100 900; }
body { margin: 0; } text { font-family: G, sans-serif; fill: #3A150F; }
.titulo { font-size: 30px; font-weight: 900; } .sub { font-size: 18px; font-weight: 800; }
.regiao { font-size: 22px; font-weight: 900; fill: #6424AB; paint-order: stroke; stroke: #F4E6CF; stroke-width: 6px; }
.marco { font-size: 13px; font-weight: 700; paint-order: stroke; stroke: #EFE3C4; stroke-width: 4px; }
.num { font-size: 15px; font-weight: 900; }
.leg-regiao { font-size: 17px; font-weight: 900; fill: #6424AB; } .leg { font-size: 14px; font-weight: 700; }
.leg-n { font-weight: 900; fill: #ED1C20; } .leg-b { font-weight: 500; } .credito { font-size: 12px; font-weight: 600; } .sic { font-size: 16px; font-weight: 900; fill: #FCFCFC; }
</style>${svg}`

const { chromium } = require('playwright')
const nav = await chromium.launch()
async function fotografar (pagina, largura, altura, saida) {
  const temp = `${PASTA}/_bastidores/_render.html`
  writeFileSync(temp, pagina)
  const pag = await nav.newPage({ viewport: { width: largura, height: altura }, deviceScaleFactor: 1 })
  await pag.goto(pathToFileURL(temp).href, { waitUntil: 'networkidle' })
  await pag.evaluate(() => document.fonts.ready)
  await pag.screenshot({ path: saida })
  await pag.close()
}
await fotografar(html, W, H, `${PASTA}/rascunho-posicoes-v1.png`)

// ── Guia da arte (pacote do ChatGPT, 1024 × 1536, retrato 2:3) e gabarito de posições no MESMO enquadramento.
// A terra ocupa ~65% da largura e o mar a leste fica livre (título, legenda, patrocínio). O guia não tem texto
// nem número (a IA copiaria); o gabarito tem, para o Wilker posicionar os pins no Illustrator.
const PACOTE = `${PASTA}/../02_PACOTE_CHATGPT`
const GW = 1024, GH = 1536
const metros = (t) => ({ x: (t.x - AREA.x - sobraX) / esc + minX, y: (t.y - AREA.y - sobraY) / esc + minY }) // tela do rascunho -> espaço da lente
const pontosG = [...unidades.map(metros), ...[...MARCOS, ...SICREDI].map(mapa)]
let gx0 = Math.min(...pontosG.map((q) => q.x)) - 1300, gx1 = Math.max(...pontosG.map((q) => q.x)) + 900
const gy0 = Math.min(...pontosG.map((q) => q.y)) - 3200, gy1 = Math.max(...pontosG.map((q) => q.y)) + 1400 // folga no alto: título
gx1 = gx0 + (gx1 - gx0) / 0.65
const gesc = Math.min(GW / (gx1 - gx0), GH / (gy1 - gy0))
const gox = (GW - (gx1 - gx0) * gesc) / 2, goy = (GH - (gy1 - gy0) * gesc) / 2
const gtela = (m) => ({ x: gox + (m.x - gx0) * gesc, y: goy + (m.y - gy0) * gesc })
const gll = (ll) => gtela(mapa(ll))
const glinha = (geo) => geo.map((g, i) => { const q = gll({ lat: g.lat, lon: g.lon }); return `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}` }).join('')
// mar: o litoral baixado acaba no recorte; além das pontas, segue reto para norte e sul até sair da tela
const gMar = litoral.filter((c) => c.length > 30).map((c) => {
  const [ini, fim] = c[0].lat > c.at(-1).lat ? [c[0], c.at(-1)] : [c.at(-1), c[0]] // ini = ponta norte
  const cadeia = c[0] === ini ? c : [...c].reverse()
  return `<path d="${glinha([{ lat: ini.lat + 0.3, lon: ini.lon }, ...cadeia, { lat: fim.lat - 0.3, lon: fim.lon }, { lat: fim.lat - 0.3, lon: -34.7 }, { lat: ini.lat + 0.3, lon: -34.7 }])}Z" fill="#BFE6F2"/>`
}).join('')
const gCostaExtra = litoral.filter((c) => c.length > 30).map((c) => {
  const [ini, fim] = c[0].lat > c.at(-1).lat ? [c[0], c.at(-1)] : [c.at(-1), c[0]]
  return `<path d="${glinha([{ lat: ini.lat + 0.3, lon: ini.lon }, ini])}" fill="none" stroke="#3A150F" stroke-width="3"/><path d="${glinha([fim, { lat: fim.lat - 0.3, lon: fim.lon }])}" fill="none" stroke="#3A150F" stroke-width="3"/>`
}).join('')
const gEst = RIO.filter((e) => e.members).flatMap((e) => juntar(e.members.filter((m) => m.role === 'outer' && m.geometry).map((m) => m.geometry)))
  .map((c) => `<path d="${glinha(c)}Z" fill="#BFE6F2" stroke="#3A150F" stroke-width="2"/>`).join('')
const gRios = OSM.filter((e) => e.tags?.waterway === 'river' && e.geometry).map((e) => `<path d="${glinha(e.geometry)}" fill="none" stroke="#7CC8E2" stroke-width="${/potengi/i.test(e.tags.name) ? 10 : 4}" stroke-linecap="round"/>`).join('')
const gCosta = litoral.map((c) => `<path d="${glinha(c)}" fill="none" stroke="#3A150F" stroke-width="3" stroke-linejoin="round"/>`).join('')
const COR_MARCO = ['#ED1C20', '#6424AB', '#0184E4', '#2E8B3A', '#FDB901'] // Ponte, Forte, Arena, Parque das Dunas, Morro do Careca
const gU = unidades.map((u) => ({ ...u, g: gtela(metros(u)) }))
const gM = MARCOS.map((m, i) => ({ ...m, g: gll(m), cor: COR_MARCO[i] }))
const gS = SICREDI.map((s2) => ({ ...s2, g: gll(s2) }))
const baseG = `<rect width="${GW}" height="${GH}" fill="#BFE6F2"/><path d="M0,0H${GW}V${GH}H0Z" fill="#F3E3C3"/>${gMar}${gEst}${gRios}${gCosta}${gCostaExtra}`
const guia = `<svg xmlns="http://www.w3.org/2000/svg" width="${GW}" height="${GH}">${baseG}
${gM.map((m) => `<circle cx="${m.g.x.toFixed(1)}" cy="${m.g.y.toFixed(1)}" r="22" fill="${m.cor}" stroke="#3A150F" stroke-width="3"/>`).join('')}
${gS.map((q) => `<rect x="${(q.g.x - 11).toFixed(1)}" y="${(q.g.y - 11).toFixed(1)}" width="22" height="22" rx="5" fill="#FCFCFC" stroke="#3A150F" stroke-width="2.5"/>`).join('')}
${gU.map((u) => `<circle cx="${u.g.x.toFixed(1)}" cy="${u.g.y.toFixed(1)}" r="10" fill="#FCFCFC" stroke="#3A150F" stroke-width="2.5"/>`).join('')}
</svg>`
const gabarito = `<svg xmlns="http://www.w3.org/2000/svg" width="${GW}" height="${GH}">${baseG}
<path d="${caminho.map((u, i) => { const q = gtela(metros(u)); return `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}` }).join('')}" fill="none" stroke="#ED1C20" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/>
${gM.map((m) => `<circle cx="${m.g.x.toFixed(1)}" cy="${m.g.y.toFixed(1)}" r="14" fill="${m.cor}" stroke="#3A150F" stroke-width="2"/><text x="${(m.g.x + 18).toFixed(1)}" y="${(m.g.y + 4).toFixed(1)}" class="gm">${esc_(m.nome)}</text>`).join('')}
${gS.map((q) => `<rect x="${(q.g.x - 11).toFixed(1)}" y="${(q.g.y - 11).toFixed(1)}" width="22" height="22" rx="5" fill="#3FA535" stroke="#3A150F" stroke-width="2"/><text x="${q.g.x.toFixed(1)}" y="${(q.g.y + 5).toFixed(1)}" class="gs" text-anchor="middle">S</text><text x="${(q.g.x + 16).toFixed(1)}" y="${(q.g.y + 4).toFixed(1)}" class="gm">${esc_(q.nome)}</text>`).join('')}
${gU.map((u) => `<circle cx="${u.g.x.toFixed(1)}" cy="${u.g.y.toFixed(1)}" r="12" fill="#FCFCFC" stroke="#3A150F" stroke-width="2"/><text x="${u.g.x.toFixed(1)}" y="${(u.g.y + 4.5).toFixed(1)}" class="gn" text-anchor="middle">${u.numero}</text>`).join('')}
<text x="24" y="${GH - 16}" class="gm">Gabarito · posições aproximadas (mapa esquemático) · base © colaboradores do OpenStreetMap</text>
</svg>`
const estiloG = `<style>@font-face { font-family: G; src: url('${pathToFileURL(`${RAIZ}public/fonts/grandstander/grandstander-latin.woff2`).href}'); font-weight: 100 900; }
body { margin: 0; } text { font-family: G, sans-serif; fill: #3A150F; } .gn { font-size: 12px; font-weight: 900; } .gs { font-size: 13px; font-weight: 900; fill: #FCFCFC; }
.gm { font-size: 12px; font-weight: 700; paint-order: stroke; stroke: #F3E3C3; stroke-width: 4px; }</style>`
await fotografar(`<!doctype html><meta charset="utf-8">${estiloG}${guia}`, GW, GH, `${PACOTE}/referencias/ref-01-guia-do-mapa.png`)
await fotografar(`<!doctype html><meta charset="utf-8">${estiloG}${gabarito}`, GW, GH, `${PACOTE}/gabarito-posicoes.png`)
await nav.close()

writeFileSync(`${PASTA}/_bastidores/posicoes.json`, JSON.stringify(unidades.map((u) => ({
  numero: u.numero, slug: u.slug, casa: u.casa, unidade: u.unidade, bairro: u.bairro, regiao: u.regiao, fonte: u.fonte,
  x: +((u.x - AREA.x) / AREA.w).toFixed(4), y: +((u.y - AREA.y) / AREA.h).toFixed(4),
})).sort((a, b) => a.numero - b.numero), null, 2) + '\n')
const porFonte = unidades.reduce((a, u) => ({ ...a, [u.fonte]: (a[u.fonte] || 0) + 1 }), {})
console.log(`casas ${numero.size} · unidades ${unidades.length} · ${JSON.stringify(porFonte)} · trechos de litoral ${litoral.length}`)
