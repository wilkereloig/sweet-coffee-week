// Home · Capítulo Cartoon (src/pages/home/secoes/CapituloCartoon.jsx + src/styles/scw-home-cartoon.css).
// É a exceção declarada de paleta e fonte no institucional (docs/regras/06a §6.1): a língua da edição só vale
// dentro de `.hm-cap`. Este teste é o que impede o vazamento — e confere que reaproveitar a cidade não religou
// nada do mapa, da Caça aos Carimbos, da avaliação ou dos vouchers.
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const ler = (p) => readFileSync(join(raiz, p), 'utf8')
const semComentario = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ')
const CSS = 'src/styles/scw-home-cartoon.css'
const COMPONENTE = 'src/pages/home/secoes/CapituloCartoon.jsx'

const { cidadeEdicao, seloEdicao, TROFEU_DESENHO_EDICAO, MARCAS_PARCEIROS, LOGO_F2 } = await import('../src/data/imageLibrary.js')
const { CAPITULO_CARTOON: T } = await import('../src/data/conteudo/home.js')
const { destaqueEdicao, destaqueValido } = await import('../src/data/destaqueEdicao.js')
const { CARTOON_PUBLICA, MAPA_PUBLICO, ENTRADA_PRINCIPAL } = await import('../src/edicao/config.js')

test('todo seletor do módulo começa por .hm-cap (a língua da edição não vaza)', () => {
  const css = semComentario(ler(CSS))
  // Tira @font-face e @keyframes (não têm seletor de elemento) e abre os @media.
  const regras = css
    .replace(/@font-face\s*\{[^}]*\}/g, ' ')
    .replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, ' ')
    .replace(/@media[^{]*\{/g, ' ')
  const seletores = [...regras.matchAll(/([^{}]+)\{/g)].flatMap((m) => m[1].split(',')).map((s) => s.trim()).filter(Boolean)
  assert.ok(seletores.length > 40, 'esperava as regras do módulo')
  for (const s of seletores) assert.match(s, /^\.hm-cap\b/, `seletor fora do escopo: "${s}"`)
})

test('as cores são as da paleta da edição — não existe segunda paleta', () => {
  const edicao = new Set([...ler('src/styles/scw-cartoon.css').matchAll(/--ct-[a-z]+:\s*(#[0-9A-Fa-f]{6})\s*;/g)].map((m) => m[1].toUpperCase()))
  assert.ok(edicao.size >= 10, 'não li a paleta da edição')
  const tokens = [...semComentario(ler(CSS)).matchAll(/--hc-[a-z]+:\s*(#[0-9A-Fa-f]{6})\s*;/g)].map((m) => m[1].toUpperCase())
  assert.ok(tokens.length >= 4)
  for (const hex of tokens) assert.ok(edicao.has(hex), `${hex} não é cor da paleta da edição`)
  // Fora dos tokens, só branco puro (fundo exigido pela marca do patrocinador) e preto de máscara.
  const soltos = [...semComentario(ler(CSS)).replace(/--hc-[a-z]+:\s*#[0-9A-Fa-f]{6}/g, '').matchAll(/#[0-9A-Fa-f]{3,8}\b/g)].map((m) => m[0].toLowerCase())
  for (const hex of soltos) assert.ok(['#fff', '#000'].includes(hex), `hex solto no módulo: ${hex}`)
})

test('fora do módulo, o institucional não conhece a paleta nem a fonte da edição', () => {
  const arquivos = []
  const varrer = (dir) => {
    for (const nome of readdirSync(join(raiz, dir))) {
      const rel = `${dir}/${nome}`
      if (statSync(join(raiz, rel)).isDirectory()) { if (!['edicao', 'cartoon', '_arquivo', 'gerado'].includes(nome)) varrer(rel) }
      else if (/\.(jsx?|css)$/.test(nome)) arquivos.push(rel)
    }
  }
  varrer('src')
  const fora = arquivos.filter((f) => f !== CSS && f !== 'src/styles/scw-cartoon.css')
  for (const f of fora) {
    const fonte = /\.css$/.test(f) ? semComentario(ler(f)) : ler(f)
    assert.doesNotMatch(fonte, /--hc-/, `${f} usa token do módulo Cartoon`)
    if (/\.css$/.test(f)) assert.doesNotMatch(fonte, /Grandstander/, `${f} usa a fonte da edição`)
  }
  // O módulo só é carregado pela seção dele.
  const importam = arquivos.filter((f) => /scw-home-cartoon\.css/.test(ler(f)))
  assert.deepEqual(importam, [COMPONENTE])
  // E usa os próprios tokens, não os da camada /cartoon nem os institucionais de cor.
  const css = semComentario(ler(CSS))
  assert.doesNotMatch(css, /--ct-/)
  assert.doesNotMatch(css, /var\(--scw-(creme|bege|choco|marrom|amarelo|cyan|roxo|magenta|laranja)\)/, 'cor institucional dentro do módulo')
})

test('sem laço de animação: a seção está completa parada', () => {
  const css = semComentario(ler(CSS))
  assert.doesNotMatch(css, /animation\s*:|@keyframes|infinite/)
  assert.match(css, /prefers-reduced-motion: reduce/)
})

test('a cidade é a arte aprovada, em recortes responsivos, e a maior versão não vai para a Home', () => {
  const c = cidadeEdicao()
  assert.equal(c.aprovada, true, 'só a arte final aprovada')
  const arquivos = (srcSet) => srcSet.split(', ').map((p) => p.split(' ')[0])
  for (const src of [...arquivos(c.recorte.srcSet), ...arquivos(c.inteira.srcSet), c.recorte.src, c.inteira.src]) {
    assert.ok(existsSync(join(raiz, 'public', src)), `falta ${src}`)
  }
  assert.deepEqual(c.recorte.srcSet.match(/ (\d+)w/g).map((s) => +s.trim().slice(0, -1)), [768, 1280, 1920])
  assert.doesNotMatch(c.inteira.srcSet, /4096/, 'a de 4096 fica só para o mapa')
  // A medida reservada no <img> é a do ARQUIVO (lida do cabeçalho do WebP), não uma constante repetida.
  const medida = (src) => {
    const b = readFileSync(join(raiz, 'public', src))
    assert.equal(b.toString('ascii', 8, 12), 'WEBP', src)
    const tipo = b.toString('ascii', 12, 16)
    if (tipo === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]
    if (tipo === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]
    throw new Error(`${src}: WebP ${tipo} não previsto`)
  }
  assert.deepEqual(medida('/images/marcas-edicoes/2026.2/mundo/cidade-home-1920.webp'), [c.recorte.largura, c.recorte.altura], 'largura e altura reservadas = as do arquivo maior')
  for (const src of arquivos(c.recorte.srcSet)) {
    const [w, h] = medida(src)
    assert.ok(Math.abs(w / h - c.recorte.largura / c.recorte.altura) < 0.005, `${src}: proporção diferente da reservada`)
  }
  // Peso: o celular não baixa mais de ~450 KB de cidade.
  const kb = (src) => statSync(join(raiz, 'public', src)).size / 1024
  assert.ok(kb('/images/marcas-edicoes/2026.2/mundo/cidade-home-768.webp') < 200)
  assert.ok(kb('/images/marcas-edicoes/2026.2/mundo/cidade-home-1280.webp') < 460)
  // Selo, troféu e marcas dos créditos: arquivos oficiais, no disco.
  for (const m of [seloEdicao(), TROFEU_DESENHO_EDICAO, MARCAS_PARCEIROS.sicredi, MARCAS_PARCEIROS.senac, MARCAS_PARCEIROS.espacoReduzido, LOGO_F2]) {
    assert.ok(existsSync(join(raiz, 'public', m.src)), `falta ${m.src}`)
  }
})

test('reaproveitar a cidade não religa a edição: sem motor de mapa, carimbo, avaliação ou voucher', () => {
  const fonte = semComentario(ler(COMPONENTE))   // o cabeçalho do arquivo cita o que NÃO foi religado
  assert.doesNotMatch(fonte, /from ['"][^'"]*\/edicao\//, 'a seção não importa nada da camada da edição')
  assert.doesNotMatch(fonte, /maplibre|geolocation|mundoEdicao\(|carimb|voucher/i)
  assert.doesNotMatch(fonte, /href=["']\/cartoon/, 'nenhum link para /cartoon/*')
  // A edição segue fora do ar e o domínio no institucional.
  assert.equal(CARTOON_PUBLICA, false)
  assert.equal(MAPA_PUBLICO, false)
  assert.equal(ENTRADA_PRINCIPAL, 'institucional')
  // Imagem responsiva com dimensões reservadas, sem autoplay e sem vídeo na seção.
  assert.match(fonte, /loading="lazy"/)
  assert.match(fonte, /width=\{cidade\.recorte\.largura\}/)
  assert.doesNotMatch(fonte, /<video|autoPlay/)
})

test('texto por estado: em apuração e divulgado, sem data nem resultado no código', () => {
  for (const estado of ['em-apuracao', 'divulgado']) {
    const e = T.estados[estado]
    for (const campo of ['titulo', 'apoio', 'estado', 'acao']) assert.ok(e[campo] && e[campo].trim(), `${estado}.${campo}`)
    assert.equal(e.placa.length, 2)
  }
  assert.equal(T.estados['em-apuracao'].estado, 'Resultados em apuração.')
  assert.equal(T.estados.divulgado.acao, 'Conheça os vencedores')
  assert.equal(T.secundaria.href, '/edicoes/2026.2')
  assert.doesNotMatch(JSON.stringify(T.estados), /\d{1,2} de (dezembro|novembro|janeiro)|cerim[oô]nia/i, 'nada de data ou cerimônia sem confirmação')
  assert.ok(T.cidade.alt.length > 40, 'a cidade tem alternativa textual de verdade')
  // Aviso dos outros resultados: concorda e começa em maiúscula com um ou dois pendentes.
  const aviso = T.outros['em-apuracao']
  assert.match(aviso(['Caça aos Carimbos', 'sorteios']), /^Caça aos Carimbos e sorteios também estão em conferência\. Cada resultado /)
  assert.match(aviso(['sorteios']), /^Sorteios também está em conferência\. O resultado /)
  assert.match(aviso(['Caça aos Carimbos']), /^Caça aos Carimbos também está em conferência\. O resultado /)
})

test('a abertura da Home voltou a ser a do festival (o destaque de edição está desligado)', () => {
  assert.equal(destaqueValido(), false)
  assert.equal(destaqueEdicao.ativo, false)
  const index = ler('src/pages/home/index.jsx')
  assert.match(index, /<Abertura[^>]*\/>\s*<CapituloCartoon/, 'a seção Cartoon vem logo depois da abertura')
  assert.doesNotMatch(index, /Encerramento/)
  assert.ok(!existsSync(join(raiz, 'src/pages/home/secoes/Encerramento.jsx')))
})
