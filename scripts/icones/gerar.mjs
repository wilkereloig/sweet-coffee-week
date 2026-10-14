#!/usr/bin/env node
/*
 * Gerador da iconografia SCW v3 (14/10/2026).
 *
 * Fonte:  icones/{interface,expressiva,marcas}/*.svg  +  icones/especificacao.json
 *         +  icones/aliases.json
 * Saída:  src/components/scw-icons/gerado/{interface,expressiva,especificacao}.js
 *         src/components/scw-icons/gerado/icones.css
 *         regiões marcadas nas páginas estáticas (especificacao.estaticos)
 *
 *   node scripts/icones/gerar.mjs              gera
 *   node scripts/icones/gerar.mjs --verificar  não grava; sai com 1 se algo estiver
 *                                              defasado ou se a fonte quebrar regra
 *
 * Determinístico: mesma fonte → mesmos bytes (chaves ordenadas, sem data).
 * A fonte aceita só um SVG simples — path, circle, rect, line, polyline, ellipse,
 * <title> obrigatório e class="detalhe" | "solido". Cor, traço e transform no
 * arquivo são recusados: quem decide é a especificação.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FONTE = join(RAIZ, 'icones')
const SAIDA = join(RAIZ, 'src', 'components', 'scw-icons', 'gerado')
const VERIFICAR = process.argv.includes('--verificar')

const SPEC = JSON.parse(readFileSync(join(FONTE, 'especificacao.json'), 'utf8'))
const ALIASES = Object.fromEntries(
  Object.entries(JSON.parse(readFileSync(join(FONTE, 'aliases.json'), 'utf8'))).filter(([k]) => !k.startsWith('_')),
)
const FAMILIAS = ['interface', 'expressiva', 'marcas']
const ATRIBUTOS = {
  path: ['d'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
  line: ['x1', 'y1', 'x2', 'y2'],
  polyline: ['points'],
}
const CLASSES = new Set(['detalhe', 'solido'])

const erros = []
const avisos = []

// ── Leitura e validação ───────────────────────────────────────────────────
function lerSvg(familia, arquivo) {
  const nome = arquivo.replace(/\.svg$/, '')
  const onde = familia + '/' + arquivo
  const texto = readFileSync(join(FONTE, familia, arquivo), 'utf8')
  const f = SPEC.familias[familia]
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(nome)) erros.push(onde + ': nome fora do padrão kebab-case')
  const raiz = /<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/.exec(texto)
  if (!raiz) { erros.push(onde + ': sem <svg> raiz'); return null }
  const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(raiz[1])
  if (!vb || +vb[1] !== f.grade || +vb[2] !== f.grade) erros.push(onde + ': viewBox precisa ser 0 0 ' + f.grade + ' ' + f.grade)
  if (/#[0-9a-f]{3,8}\b|rgb\(|stroke-width|style=|transform/i.test(texto)) erros.push(onde + ': cor, stroke-width, style ou transform no arquivo — a especificação decide')
  let corpo = raiz[2].replace(/<!--[\s\S]*?-->/g, '')
  const titulo = /<title>([^<]+)<\/title>/.exec(corpo)
  if (!titulo) erros.push(onde + ': falta <title> (o significado do desenho)')
  corpo = corpo.replace(/<title>[^<]*<\/title>/, '').replace(/<desc>[^<]*<\/desc>/, '')
  const elementos = []
  const re = /<(path|circle|ellipse|rect|line|polyline)\b([^>]*?)\/>/g
  let m
  let resto = corpo
  while ((m = re.exec(corpo))) {
    resto = resto.replace(m[0], '')
    const attrs = {}
    let classe = null
    for (const a of m[2].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      if (a[1] === 'class') {
        if (!CLASSES.has(a[2])) erros.push(onde + ': class "' + a[2] + '" não existe (detalhe | solido)')
        classe = a[2]
      } else if (ATRIBUTOS[m[1]].includes(a[1])) attrs[a[1]] = a[2].trim().replace(/\s+/g, ' ')
      else erros.push(onde + ': atributo "' + a[1] + '" não é aceito em <' + m[1] + '>')
    }
    elementos.push(classe ? [m[1], attrs, classe] : [m[1], attrs])
  }
  if (resto.trim()) erros.push(onde + ': conteúdo não aceito: ' + resto.trim().slice(0, 60))
  if (!elementos.length) erros.push(onde + ': desenho vazio')
  return { nome, familia, titulo: titulo ? titulo[1].trim() : nome, elementos }
}

// ── Geometria: caixa do desenho (com amostragem de curvas e arcos) ────────
function pontosDoPath(d) {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || []
  const pts = []
  let i = 0, cmd = '', x = 0, y = 0, x0 = 0, y0 = 0, cx = 0, cy = 0, partes = 0
  const n = () => parseFloat(tokens[i++])
  const bez = (p0, p1, p2, p3) => {
    for (let k = 0; k <= 16; k++) {
      const t = k / 16, u = 1 - t
      pts.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]])
    }
  }
  const arco = (x1, y1, rx, ry, fi, fa, fs, x2, y2) => {
    // W3C SVG F.6.5 — de extremos para centro.
    const phi = (fi * Math.PI) / 180, c = Math.cos(phi), s = Math.sin(phi)
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2
    const x1p = c * dx + s * dy, y1p = -s * dx + c * dy
    rx = Math.abs(rx); ry = Math.abs(ry)
    const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam) }
    const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
    const co = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / (rx * rx * y1p * y1p + ry * ry * x1p * x1p)))
    const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx
    const ccx = c * cxp - s * cyp + (x1 + x2) / 2, ccy = s * cxp + c * cyp + (y1 + y2) / 2
    const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
    let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
    if (!fs && dt > 0) dt -= 2 * Math.PI
    if (fs && dt < 0) dt += 2 * Math.PI
    for (let k = 0; k <= 32; k++) {
      const t = t1 + (dt * k) / 32
      pts.push([ccx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, ccy + rx * Math.cos(t) * s + ry * Math.sin(t) * c])
    }
  }
  while (i < tokens.length) {
    if (/[a-z]/i.test(tokens[i])) cmd = tokens[i++]
    const rel = cmd === cmd.toLowerCase()
    const C = cmd.toUpperCase()
    const ox = rel ? x : 0, oy = rel ? y : 0
    if (C === 'Z') { x = x0; y = y0; pts.push([x, y]); continue }
    if (C === 'M') { x = ox + n(); y = oy + n(); x0 = x; y0 = y; pts.push([x, y]); partes++; cmd = rel ? 'l' : 'L'; cx = x; cy = y }
    else if (C === 'L') { x = ox + n(); y = oy + n(); pts.push([x, y]); cx = x; cy = y }
    else if (C === 'H') { x = ox + n(); pts.push([x, y]); cx = x; cy = y }
    else if (C === 'V') { y = (rel ? y : 0) + n(); pts.push([x, y]); cx = x; cy = y }
    else if (C === 'C') {
      const p1 = [ox + n(), oy + n()], p2 = [ox + n(), oy + n()], p3 = [ox + n(), oy + n()]
      bez([x, y], p1, p2, p3); cx = p2[0]; cy = p2[1]; x = p3[0]; y = p3[1]
    } else if (C === 'S') {
      const p1 = [2 * x - cx, 2 * y - cy], p2 = [ox + n(), oy + n()], p3 = [ox + n(), oy + n()]
      bez([x, y], p1, p2, p3); cx = p2[0]; cy = p2[1]; x = p3[0]; y = p3[1]
    } else if (C === 'Q') {
      const q = [ox + n(), oy + n()], p3 = [ox + n(), oy + n()]
      bez([x, y], [x + (2 / 3) * (q[0] - x), y + (2 / 3) * (q[1] - y)], [p3[0] + (2 / 3) * (q[0] - p3[0]), p3[1] + (2 / 3) * (q[1] - p3[1])], p3)
      cx = q[0]; cy = q[1]; x = p3[0]; y = p3[1]
    } else if (C === 'T') {
      const q = [2 * x - cx, 2 * y - cy], p3 = [ox + n(), oy + n()]
      bez([x, y], [x + (2 / 3) * (q[0] - x), y + (2 / 3) * (q[1] - y)], [p3[0] + (2 / 3) * (q[0] - p3[0]), p3[1] + (2 / 3) * (q[1] - p3[1])], p3)
      cx = q[0]; cy = q[1]; x = p3[0]; y = p3[1]
    } else if (C === 'A') {
      const rx = n(), ry = n(), fi = n(), fa = n(), fs = n(), x2 = ox + n(), y2 = oy + n()
      arco(x, y, rx, ry, fi, fa, fs, x2, y2); x = x2; y = y2; cx = x; cy = y
    } else throw new Error('comando de path desconhecido: ' + cmd)
  }
  return { pts, partes }
}

function caixa(desenho) {
  const tr = Math.max(...Object.values(SPEC.familias[desenho.familia].traco))
  const fat = SPEC.familias[desenho.familia].detalhe
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  let gx1 = Infinity, gy1 = Infinity, gx2 = -Infinity, gy2 = -Infinity
  let partes = 0
  for (const [tag, a, classe] of desenho.elementos) {
    const num = (k) => parseFloat(a[k] || 0)
    let pts = []
    if (tag === 'circle') { const r = num('r'); pts = [[num('cx') - r, num('cy') - r], [num('cx') + r, num('cy') + r]] }
    else if (tag === 'ellipse') pts = [[num('cx') - num('rx'), num('cy') - num('ry')], [num('cx') + num('rx'), num('cy') + num('ry')]]
    else if (tag === 'rect') pts = [[num('x'), num('y')], [num('x') + num('width'), num('y') + num('height')]]
    else if (tag === 'line') pts = [[num('x1'), num('y1')], [num('x2'), num('y2')]]
    else if (tag === 'polyline') { const v = a.points.split(/[\s,]+/).map(Number); for (let k = 0; k < v.length; k += 2) pts.push([v[k], v[k + 1]]) }
    else { const r = pontosDoPath(a.d); pts = r.pts; if (classe !== 'solido') partes += r.partes - 1 }
    if (classe !== 'solido') partes++
    const meio = classe === 'solido' ? 0 : (classe === 'detalhe' ? tr * fat : tr) / 2
    for (const [px, py] of pts) {
      gx1 = Math.min(gx1, px); gy1 = Math.min(gy1, py); gx2 = Math.max(gx2, px); gy2 = Math.max(gy2, py)
      x1 = Math.min(x1, px - meio); y1 = Math.min(y1, py - meio); x2 = Math.max(x2, px + meio); y2 = Math.max(y2, py + meio)
    }
  }
  const r = (v) => Math.round(v * 100) / 100
  return { tinta: [r(x1), r(y1), r(x2), r(y2)], geometria: [r(gx1), r(gy1), r(gx2), r(gy2)], partes }
}

// ── Montagem ──────────────────────────────────────────────────────────────
const catalogo = { interface: {}, expressiva: {}, marcas: {} }
for (const familia of FAMILIAS) {
  const pasta = join(FONTE, familia)
  if (!existsSync(pasta)) continue
  for (const arq of readdirSync(pasta).filter((a) => a.endsWith('.svg')).sort()) {
    const d = lerSvg(familia, arq)
    if (!d) continue
    const f = SPEC.familias[familia]
    const cx = caixa(d)
    const [gx1, gy1, gx2, gy2] = cx.geometria
    const [tx1, ty1, tx2, ty2] = cx.tinta
    const tol = 0.25
    if (gx1 < f.margem - tol || gy1 < f.margem - tol || gx2 > f.grade - f.margem + tol || gy2 > f.grade - f.margem + tol)
      erros.push(familia + '/' + arq + ': geometria fora da área útil ' + f.margem + '–' + (f.grade - f.margem) + ' → ' + cx.geometria.join(' '))
    if (tx1 < 0 || ty1 < 0 || tx2 > f.grade || ty2 > f.grade) erros.push(familia + '/' + arq + ': o traço sai do quadro (recorte) → ' + cx.tinta.join(' '))
    const desvio = Math.max(Math.abs((gx1 + gx2) / 2 - f.grade / 2), Math.abs((gy1 + gy2) / 2 - f.grade / 2))
    if (desvio > f.grade / 16) avisos.push(familia + '/' + arq + ': centro geométrico desloca ' + desvio.toFixed(2) + ' (confira o centro óptico)')
    if (cx.partes > f.elementosMax) avisos.push(familia + '/' + arq + ': ' + cx.partes + ' traços (máximo recomendado ' + f.elementosMax + ')')
    catalogo[familia][d.nome] = { t: d.titulo, e: d.elementos, c: cx.tinta }
  }
}

const todos = new Set([...Object.keys(catalogo.interface), ...Object.keys(catalogo.expressiva), ...Object.keys(catalogo.marcas)])
for (const n of Object.keys(catalogo.marcas)) {
  if (catalogo.interface[n] || catalogo.expressiva[n]) erros.push('marcas/' + n + ': nome já usado por desenho do sistema')
}
for (const [antigo, novo] of Object.entries(ALIASES)) {
  if (todos.has(antigo)) erros.push('alias "' + antigo + '" esconde um desenho com o mesmo nome')
  if (!todos.has(novo)) erros.push('alias "' + antigo + '" → "' + novo + '": destino não existe')
}
for (const n of [...SPEC.css, ...(SPEC.cssPintado || []).map((x) => x[0]), SPEC.selectSeta.icone]) if (!catalogo.interface[n]) erros.push('especificacao: "' + n + '" não é desenho de interface')

// ── Saídas ────────────────────────────────────────────────────────────────
const CABECA = '// GERADO por scripts/icones/gerar.mjs — NÃO EDITAR.\n// Fonte: icones/ (um .svg por desenho). Mudou a fonte? `npm run icones`.\n'
const semCaixa = (fam) => Object.fromEntries(Object.entries(fam).map(([k, v]) => [k, { t: v.t, e: v.e }]))
const js = (obj) => '{\n' + Object.keys(obj).sort().map((k) => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(obj[k])).join(',\n') + '\n}'

const interfaceComMarcas = { ...semCaixa(catalogo.interface) }
for (const [k, v] of Object.entries(catalogo.marcas)) interfaceComMarcas[k] = { t: v.t, e: v.e, m: 1 }

const familiasSpec = Object.fromEntries(FAMILIAS.map((k) => {
  const f = SPEC.familias[k]
  return [k, { grade: f.grade, tamanhos: f.tamanhos, traco: f.traco, detalhe: f.detalhe }]
}))

const saidas = {}
saidas['interface.js'] = CABECA + '// Família de interface (grade 24) + marcas de terceiros (m: 1).\nexport default ' + js(interfaceComMarcas) + '\n'
saidas['expressiva.js'] = CABECA + '// Família expressiva (grade 48) — gastronomia e símbolos do festival.\nexport default ' + js(semCaixa(catalogo.expressiva)) + '\n'
saidas['especificacao.js'] = CABECA +
  'export const FAMILIAS = ' + JSON.stringify(familiasSpec) + '\n' +
  'export const ALIASES = ' + js(ALIASES) + '\n' +
  'export const NOMES = ' + JSON.stringify({
    interface: Object.keys(catalogo.interface).sort(),
    expressiva: Object.keys(catalogo.expressiva).sort(),
    marcas: Object.keys(catalogo.marcas).sort(),
  }) + '\n' +
  'export const CAIXAS = ' + JSON.stringify(Object.fromEntries(FAMILIAS.flatMap((f) => Object.keys(catalogo[f]).sort().map((n) => [f + '/' + n, catalogo[f][n].c])))) + '\n'

// SVG em texto (CSS e páginas estáticas): mesma regra de traço do componente.
function svgTexto(familia, nome, tamanho, cor = 'currentColor', extra = '') {
  const d = catalogo[familia][nome]
  const f = SPEC.familias[familia]
  const tr = f.traco[tamanho] ?? f.traco[f.tamanhos[f.tamanhos.length - 1]]
  const filhos = d.e.map(([tag, a, classe]) => {
    const at = Object.entries(a).map(([k, v]) => k + '="' + v + '"').join(' ')
    const st = classe === 'solido' ? ' fill="' + cor + '" stroke="none"' : classe === 'detalhe' ? ' stroke-width="' + +(tr * f.detalhe).toFixed(3) + '"' : ''
    return '<' + tag + ' ' + at + st + '/>'
  }).join('')
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + tamanho + '" height="' + tamanho + '" viewBox="0 0 ' + f.grade + ' ' + f.grade +
    '" fill="none" stroke="' + cor + '" stroke-width="' + tr + '" stroke-linecap="round" stroke-linejoin="round"' + extra + '>' + filhos + '</svg>'
}
const dataUri = (svg) => 'url("data:image/svg+xml,' + svg.replace(/"/g, "'").replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E') + '")'

let css = '/* GERADO por scripts/icones/gerar.mjs — NÃO EDITAR. Fonte: icones/ */\n' +
  '/* Marcadores em CSS. Na cor do texto: `mask: var(--icone-feito) center / contain no-repeat; background: currentColor`.\n' +
  '   Sobre disco colorido (pintado): `background: <cor do disco> var(--icone-exclamacao-creme) center / 14px no-repeat`. */\n:root {\n'
for (const n of SPEC.css) css += '  --icone-' + n + ': ' + dataUri(svgTexto('interface', n, 16, '#000')) + ';\n'
for (const [n, nomeCor, hex] of SPEC.cssPintado || []) css += '  --icone-' + n + '-' + nomeCor + ': ' + dataUri(svgTexto('interface', n, 16, hex)) + ';\n'
const sel = SPEC.selectSeta
css += '  /* Seta da caixa de seleção: pintada (background-image não herda currentColor). */\n'
css += '  --icone-select: ' + dataUri(svgTexto('interface', sel.icone, sel.tamanho, sel.cor)) + ';\n}\n'
saidas['icones.css'] = css

// Páginas estáticas: <!--icone:nome:tamanho-->…<!--/icone--> e /*icone-select*/…/*/icone-select*/
const estaticos = {}
for (const rel of SPEC.estaticos || []) {
  const caminho = join(RAIZ, rel)
  const antes = readFileSync(caminho, 'utf8')
  const depois = antes
    .replace(/<!--icone:([a-z0-9-]+):(\d+)-->[\s\S]*?<!--\/icone-->/g, (_, nome, tam) => {
      const canon = ALIASES[nome] || nome
      const fam = +tam >= 32 && catalogo.expressiva[canon] ? 'expressiva' : catalogo.interface[canon] ? 'interface' : catalogo.marcas[canon] ? 'marcas' : null
      if (!fam) { erros.push(rel + ': ícone "' + nome + '" não existe'); return _ }
      return '<!--icone:' + nome + ':' + tam + '-->' + svgTexto(fam, canon, +tam, 'currentColor', ' aria-hidden="true" focusable="false"').replace(' xmlns="http://www.w3.org/2000/svg"', '') + '<!--/icone-->'
    })
    .replace(/\/\*icone-select\*\/[\s\S]*?\/\*\/icone-select\*\//g, () => '/*icone-select*/' + dataUri(svgTexto('interface', sel.icone, sel.tamanho, sel.cor)) + '/*/icone-select*/')
  estaticos[rel] = { caminho, antes, depois }
}

// ── Gravar ou verificar ───────────────────────────────────────────────────
for (const a of avisos) console.warn('aviso  ' + a)
if (erros.length) {
  for (const e of erros) console.error('ERRO   ' + e)
  console.error('\n' + erros.length + ' erro(s) — nada foi gravado.')
  process.exit(1)
}
const defasados = []
if (!VERIFICAR) mkdirSync(SAIDA, { recursive: true })
for (const [arq, conteudo] of Object.entries(saidas)) {
  const caminho = join(SAIDA, arq)
  const atual = existsSync(caminho) ? readFileSync(caminho, 'utf8') : null
  if (atual === conteudo) continue
  if (VERIFICAR) defasados.push('src/components/scw-icons/gerado/' + arq)
  else writeFileSync(caminho, conteudo)
}
for (const [rel, { caminho, antes, depois }] of Object.entries(estaticos)) {
  if (antes === depois) continue
  if (VERIFICAR) defasados.push(rel)
  else writeFileSync(caminho, depois)
}
const total = Object.keys(catalogo.interface).length + Object.keys(catalogo.expressiva).length + Object.keys(catalogo.marcas).length
if (VERIFICAR && defasados.length) {
  console.error('Defasado em relação à fonte (rode `npm run icones`):\n  ' + defasados.join('\n  '))
  process.exit(1)
}
console.log((VERIFICAR ? 'em dia' : 'gerado') + ' · ' + Object.keys(catalogo.interface).length + ' interface · ' +
  Object.keys(catalogo.expressiva).length + ' expressiva · ' + Object.keys(catalogo.marcas).length + ' marca · ' +
  Object.keys(ALIASES).length + ' aliases · ' + total + ' desenhos' + (avisos.length ? ' · ' + avisos.length + ' aviso(s)' : ''))
