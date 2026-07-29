import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/*
 * Guarda do redesign 2026 do site institucional.
 * Substitui os testes que travavam o sistema anterior (home-v2-check,
 * home-motion, participar-form-width, participar-curadoria-icons) — aqueles
 * afirmavam classes e strings que a nova direção removeu.
 *
 * Aqui só entram contratos que valem a pena quebrar o build: paleta fechada,
 * cor da página por rota, movimento reduzido e as flags de publicação.
 * Aparência é conferência do usuário, não de teste.
 */

const ler = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')

const SISTEMA = 'src/styles/scw-2026.css'

const PAGINAS = [
  ['src/pages/institutional/Home.jsx', 'src/styles/scw-home.css'],
  ['src/pages/institutional/Edicoes.jsx', 'src/styles/scw-edicoes.css'],
  ['src/pages/institutional/HistoricoAwards.jsx', 'src/styles/scw-awards.css'],
  ['src/pages/institutional/Participar.jsx', 'src/styles/scw-participar-apoiar.css'],
  ['src/pages/institutional/Apoiar.jsx', 'src/styles/scw-participar-apoiar.css'],
  ['src/pages/institutional/Contato.jsx', 'src/styles/scw-contato.css'],
]

const CASCA = [
  'src/components/nav.jsx',
  'src/components/SiteFooter.jsx',
  'src/components/MobileTabBar.jsx',
  'src/components/MobileMenu.jsx',
  'src/components/AccessDialog.jsx',
]

/** Paleta fechada do handoff + neutros que o CSS usa em rgba/sombra. */
const PALETA = new Set([
  '#FEF0DD', '#F8E4C1', '#FFF7E9', '#EBD6B4', '#3D1308', '#6A2C15',
  '#FDBB1A', '#01AFCC', '#4D257E', '#F10767', '#D0055B', '#B3213B',
  '#D19100', '#D9BE95', '#C99A7E',
  '#FFF', '#FFFFFF', '#000', '#000000',
])

/** Hex fora de comentário. Comentar "#E52C4B não existe aqui" é permitido. */
function hexEmCodigo(fonte) {
  const semComentario = fonte
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
  return [...semComentario.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)].map((m) => m[0].toUpperCase())
}

const ARQUIVOS = [SISTEMA, ...new Set(PAGINAS.flat()), ...CASCA]

/* Exceção única e declarada: a seção 07 da Home usa o KV da F2 Experience, a
   agência que realiza o festival — preto, magenta e cinza da marca dela, fora
   da paleta do Sweet & Coffee Week. É quebra proposital (CLAUDE.md §3). Fica
   restrita ao bloco `.f2-realiza*`: qualquer hex desses fora dali reprova. */
const F2_MARCA = new Set(['#0B0B0C', '#E50053', '#F5F5F5'])

function trechoF2(fonte) {
  const ini = fonte.indexOf('.f2-realiza {')
  if (ini === -1) return ''
  const fim = fonte.indexOf('/* ====', ini)
  return fonte.slice(ini, fim === -1 ? fonte.length : fim)
}

test('nenhuma cor fora da paleta do handoff', () => {
  for (const arquivo of ARQUIVOS) {
    const fonte = ler(arquivo)
    const f2 = trechoF2(fonte)
    for (const hex of hexEmCodigo(fonte)) {
      if (PALETA.has(hex)) continue
      const daF2 = F2_MARCA.has(hex) && hexEmCodigo(f2).includes(hex)
      assert.ok(daF2, `cor fora da paleta em ${arquivo}: ${hex}`)
    }
  }
})

test('o KV da F2 não vaza para o resto do site', () => {
  for (const arquivo of ARQUIVOS) {
    const fonte = ler(arquivo)
    const foraDoBloco = fonte.replace(trechoF2(fonte), ' ')
    for (const hex of F2_MARCA) {
      assert.ok(!hexEmCodigo(foraDoBloco).includes(hex), `cor da F2 (${hex}) fora da seção 07, em ${arquivo}`)
    }
    // Archivo é a fonte da F2; o resto do site é Nexa Slab.
    const semF2 = foraDoBloco.replace(/\/\*[\s\S]*?\*\//g, ' ')
    assert.ok(!/Archivo/.test(semF2), `Archivo usada fora da seção 07, em ${arquivo}`)
  }
})

test('#E52C4B foi removida — nunca como valor', () => {
  for (const arquivo of ARQUIVOS) {
    assert.ok(!hexEmCodigo(ler(arquivo)).includes('#E52C4B'), `#E52C4B voltou em ${arquivo}`)
  }
})

test('cada página do redesign importa o próprio CSS', () => {
  for (const [pagina, css] of PAGINAS) {
    const base = css.split('/').pop()
    assert.match(ler(pagina), new RegExp(base.replace('.', '\\.')), `${pagina} não importa ${base}`)
  }
})

test('as 6 rotas definem a cor da página', () => {
  const sistema = ler(SISTEMA)
  for (const rota of ['home', 'edicoes', 'historico-awards', 'participar', 'apoiar', 'contato']) {
    assert.match(sistema, new RegExp(`body\\.route-${rota}\\b`), `rota sem cor definida: ${rota}`)
  }
  // Os três pontos onde a cor aparece: pill do menu, barra de 5px e selo do herói.
  assert.match(sistema, /--scw-pagina:/)
  assert.match(sistema, /--scw-pagina-tinta:/)
  assert.match(sistema, /--scw-pagina-menu:/)
})

test('trilho único de 1360px é o da casca e o das seções', () => {
  const sistema = ler(SISTEMA)
  assert.match(sistema, /--scw-trilho:\s*max\(clamp\(24px,\s*5vw,\s*72px\),\s*calc\(\(100% - 1360px\) \/ 2\)\)/)
  assert.match(sistema, /\.scw-secao\s*\{[^}]*padding:[^}]*var\(--scw-trilho\)/s)
  assert.match(sistema, /\.scw-header__linha\s*\{[^}]*var\(--scw-trilho\)/s)
})

/*
 * Regressão relatada: a barra de abas do celular aparecia no desktop e o menu do
 * desktop aparecia no celular. No protótipo o corte era estado JS (`compacto`);
 * aqui os dois modos são montados e quem separa é a media query de 900px.
 * A armadilha: o `display:block` das abas precisa vir DEPOIS da regra base
 * `display:none` — na primeira tentativa veio antes e o `none` venceu.
 */
test('a casca troca de modo em 900px, e na ordem certa', () => {
  const sistema = ler(SISTEMA)

  const baseAbas = sistema.indexOf('.scw-abas {')
  const libera = /\.scw-abas \{ display: block; \}/.exec(sistema)
  assert.ok(baseAbas !== -1, 'regra base de .scw-abas sumiu')
  assert.ok(libera, '.scw-abas nunca é liberada em ≤900px')
  assert.ok(libera.index > baseAbas, '.scw-abas é liberada antes da regra base — o display:none vence')
  // E a liberação tem de estar mesmo dentro de um bloco ≤900px.
  assert.match(sistema.slice(0, libera.index).split('@media').pop(), /^ \(max-width: 900px\)/)

  // Estado padrão (desktop): modo aplicativo desligado.
  assert.match(sistema, /\.scw-abas \{\s*display: none/, '.scw-abas precisa nascer oculta')
  assert.match(sistema, /\.scw-folha \{\s*display: none/, '.scw-folha precisa nascer oculta')
  // ≤900px: menu e botão de acesso do desktop saem de cena.
  assert.match(sistema, /@media \(max-width: 900px\)[\s\S]*?\.scw-nav \{ display: none; \}/)
  assert.match(sistema, /@media \(max-width: 900px\)[\s\S]*?\.scw-acesso-topo \{ display: none; \}/)
})

test('o aviso de cookies não cobre a barra de abas', () => {
  assert.match(
    ler(SISTEMA),
    /\.scw-raiz\.tem-abas \.cookie-consent \{ bottom: calc\(88px \+ env\(safe-area-inset-bottom\)\); \}/,
    'sem esse deslocamento o aviso intercepta os cliques das abas',
  )
})

test('prefers-reduced-motion zera animação e transição', () => {
  const sistema = ler(SISTEMA)
  assert.match(sistema, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(sistema, /prefers-reduced-motion: reduce\)\s*\{[\s\S]*?animation-duration:\s*\.001ms\s*!important/)
  assert.match(sistema, /prefers-reduced-motion: reduce\)\s*\{[\s\S]*?transition-duration:\s*\.001ms\s*!important/)
})

test('Sweet Awards não vaza o KV da edição Lovers', () => {
  for (const arquivo of ['src/pages/institutional/HistoricoAwards.jsx', 'src/styles/scw-awards.css']) {
    const fonte = ler(arquivo).replace(/\/\*[\s\S]*?\*\//g, ' ')
    assert.ok(!/--lovers-|kv-lovers|sofia-pro/.test(fonte), `identidade Lovers vazou em ${arquivo}`)
  }
})

/*
 * O texto editorial (curiosidades, notas, leads) cita quantidades de marcas por
 * edição. Elas já divergiram da base: a primeira edição aparecia com "cerca de
 * 11 estabelecimentos" quando o acervo registra 13, e a Trip aparecia com 32
 * quando são 33. Aqui todo número seguido de um substantivo de contagem é
 * conferido contra o `n` da edição — preço e data não casam com o padrão.
 */
const COISAS = 'estabelecimentos?|endereços?|combos?|marcas?|pontos?|participantes?'
// "Mais de vinte marcas" é uma afirmação de piso, não de contagem — vale se o
// número real for maior. Qualquer outra forma tem de bater exato: foi um "cerca
// de 11" que escondeu o 13 da primeira edição.
const PISO = /(mais de|acima de)\s*$/i
const CONTAGEM = new RegExp(`\\b(\\d{1,3})\\s+(?:${COISAS})\\b`, 'gi')
const POR_EXTENSO = { onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15, vinte: 20, trinta: 30, quarenta: 40 }
const EXTENSO = new RegExp(`\\b(${Object.keys(POR_EXTENSO).join('|')})\\s+(?:${COISAS})\\b`, 'gi')

test('cada edição declara o número de participantes que realmente tem', async () => {
  const { EDICOES_DADOS } = await import('../src/data/handoff/edicoesData.js')
  for (const [code, e] of Object.entries(EDICOES_DADOS)) {
    assert.equal(e.n, e.participantes.length, `${code}: n=${e.n} mas a lista tem ${e.participantes.length}`)
  }
})

test('os números citados no texto editorial batem com a base', async () => {
  const { EDICOES_DADOS } = await import('../src/data/handoff/edicoesData.js')
  const { AWARDS_DADOS } = await import('../src/data/handoff/awardsData.js')
  const leads = ler('src/pages/institutional/Edicoes.jsx')

  /* Um texto pode citar outra edição de propósito — a curiosidade de 2024
     relembra a primeira, de 2016. Quando aparece um ano no texto, o número é
     conferido contra as edições daquele ano, não contra a edição corrente. */
  const alvos = (code, texto) => {
    const anos = [...texto.matchAll(/\b(20[0-2]\d)\b/g)].map((m) => m[1])
      .filter((ano) => ano !== code.slice(0, 4))
    const codes = anos.length
      ? Object.keys(EDICOES_DADOS).filter((k) => anos.includes(k.slice(0, 4)))
      : [code]
    return codes.map((k) => EDICOES_DADOS[k]).filter(Boolean)
  }

  const conferir = (code, onde, texto) => {
    if (!EDICOES_DADOS[code]) return
    const es = alvos(code, texto)
    if (!es.length) return
    const esperados = es.map((e) => e.n)
    const checa = (valor, m) => {
      const piso = PISO.test(texto.slice(0, m.index))
      assert.ok(
        piso ? esperados.some((n) => n > valor) : esperados.includes(valor),
        `${code} (${onde}): "${m[0]}"${piso ? ' (piso)' : ''} — o acervo registra ${esperados.join(' ou ')}`,
      )
    }
    for (const m of texto.matchAll(CONTAGEM)) checa(+m[1], m)
    for (const m of texto.matchAll(EXTENSO)) checa(POR_EXTENSO[m[1].toLowerCase()], m)
  }

  for (const [code, e] of Object.entries(EDICOES_DADOS)) {
    for (const c of e.curiosidades || []) conferir(code, 'curiosidade', `${c.t} ${c.x}`)
  }
  // Texto longo da página Edições — a transcrição corrigiu os números que o
  // texto de origem trazia errados (11 → 13, "mais de trinta" → 30, 32 → 33).
  const { EDICOES_NARRATIVA, ABERTURA } = await import('../src/data/edicoesNarrativa.js')
  for (const [code, n] of Object.entries(EDICOES_NARRATIVA)) {
    for (const campo of ['lead', 'marco', 'curiosidade', 'legado']) {
      conferir(code, `narrativa/${campo}`, n[campo] || '')
    }
  }
  conferir('2016', 'abertura', ABERTURA.paragrafos.join(' '))
  for (const e of AWARDS_DADOS.edicoes || []) conferir(e.code, 'nota do Awards', e.nota || '')
  for (const m of leads.matchAll(/\{ code: '([^']+)',[\s\S]*?lead: '([^']*)'/g)) conferir(m[1], 'lead da cena', m[2])
})

test('flags de publicação seguem intactas', () => {
  const app = ler('src/App.jsx')
  assert.match(app, /AWARDS_ONLY_PUBLICATION\s*=\s*false/)
  assert.match(app, /COMING_SOON_PUBLICATION\s*=\s*true/)
})

test('rotas dos QR Codes da Lovers continuam congeladas', () => {
  const app = ler('src/App.jsx')
  assert.match(app, /\/lovers\/combos\//)
  assert.match(app, /\/lovers\/awards/)
})
