import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { EDITION_INSIGHTS, getEditionInsights } from '../src/data/editionInsights.js'
import { getDecadeCredits } from '../src/data/decadeCredits.js'

// Testes técnicos da página Edições (apresentação-cena "Cinema da Década") e da
// nova base de curiosidades. Verificam contratos de código/dados (fonte), não
// aparência — validação visual é do usuário. Padrão node:test + asserts sobre a
// fonte, igual a tests/home-v2-check.mjs.

const edx = await readFile(new URL('../src/pages/institutional/Edicoes.jsx', import.meta.url), 'utf8')

const VALID_CODES = ['2016', '2017.1', '2017.2', '2018.1', '2018.2', '2019.1', '2019.2', '2020.1', '2020.2', '2021.1', '2021.2', '2022', '2023', '2024', '2025', '2026.1']
const VALID_TYPES = ['primeira-vez', 'categoria', 'acervo', 'tema', 'momento']

test('16 edições na sequência 1→16, sem divisão por fases/eras', () => {
  assert.match(edx, /const PANELS = EDITIONS\.map\(\(ed, i\) =>/)
  assert.match(edx, /number: i \+ 1/)
  assert.match(edx, /const TOTAL = PANELS\.length/)
  // numeral da cena = posição na série (1ª..16ª), não agrupada por era
  assert.match(edx, /\{e\.number\}ª edição · \{e\.code\}/)
})

test('nenhuma rota ou link para a página Curiosidades (descontinuada)', () => {
  // a palavra "curiosidades" é o nome da feature de insights — permitida; o que
  // é proibido é a ROTA/PATH #/curiosidades ou navigate('/curiosidades').
  assert.doesNotMatch(edx, /#\/curiosidades/)
  assert.doesNotMatch(edx, /['"]\/curiosidades['"]/)
})

test('curiosidades só renderizam quando há dado verificado', () => {
  assert.match(edx, /const items = getEditionInsights\(e\.code\)/)
  assert.match(edx, /if \(!items\.length\) return null/)
  // não força nº fixo de cards: mapeia o que existir
  assert.match(edx, /items\.map\(\(it\) =>/)
})

test('pódio preserva empates (nomes lado a lado)', () => {
  assert.match(edx, /f\.nomes\.join\(' \+ '\)/)
  assert.match(edx, /const winners = f\.nomes\.map\(\(n\) => resolveParticipant\(n\)\)/)
  assert.match(edx, /className="edx-podio__medal" aria-hidden="true">1º/)
})

test('participantes: abre/fecha, busca em lista grande, Esc fecha', () => {
  assert.match(edx, /aria-expanded=\{open\}/)
  assert.match(edx, /onClick=\{\(\) => setOpen\(\(o\) => !o\)\}/)
  assert.match(edx, /ev\.key === 'Escape' && open/)
  assert.match(edx, /const big = list\.length >= 10/)
  assert.match(edx, /list\.filter\(\(n\) => n\.toLowerCase\(\)\.includes\(nq\)\)/)
})

test('fallbacks honestos de logo, foto e lista', () => {
  // logo do participante → iniciais quando não há imagem
  assert.match(edx, /resolveParticipant\(n\)/)
  assert.match(edx, /className="edx-parts__ini"/)
  // foto da cena ausente
  assert.match(edx, /Acervo desta edição pendente/)
  // lista de participantes ausente
  assert.match(edx, /Lista de participantes pendente/)
})

test('história completa vai para expansão acessível (não 4 parágrafos na foto)', () => {
  assert.match(edx, /function EditionStory/)
  assert.match(edx, /Ler a história completa/)
  assert.match(edx, /const rest = paras\.slice\(1\)/)
  // lead curto = só o primeiro parágrafo na cena
  assert.match(edx, /const lead = paras\[0\]/)
})

test('créditos da década = estado final do trilho (não seção empilhada)', () => {
  assert.match(edx, /function DecadeCredits/)
  assert.match(edx, /const TOTAL_STEPS = TOTAL \+ 1/)
  // no trilho desktop e na pilha mobile, depois das 16 cenas
  assert.match(edx, /<DecadeCredits isActive=\{active === TOTAL\} near=\{active >= TOTAL - 1\} go=\{go\} \/>/)
  assert.match(edx, /<DecadeCredits stacked go=\{go\} isActive=\{active === TOTAL\} \/>/)
  // CTA único do Sweet Awards vive nos créditos
  assert.match(edx, /className="edx-credits__cta"/)
  assert.match(edx, /Ver o Sweet Awards/)
  // não reintroduz <section class="edx-epilogo"> empilhada nem o edx-final antigo
  assert.doesNotMatch(edx, /edx-epilogo/)
  assert.doesNotMatch(edx, /edx-final__/)
  // rolagem é marquee transform-only, só na cena ativa, pausa em hover
  assert.match(edx, /@keyframes edxRoll \{ to \{ transform: translateY\(-50%\); \} \}/)
  assert.match(edx, /\.edx-credits__stage:hover \.edx-credits__roll \{ animation-play-state: paused; \}/)
})

test('cortina de tom: overlay único, transform-only, some em reduced-motion', () => {
  assert.match(edx, /className="edx-wipe"/)
  assert.match(edx, /@keyframes edxWipe \{ to \{ transform: translateX\(101%\); \} \}/)
  assert.match(edx, /\.edx-wipe \{[\s\S]*?pointer-events: none;/)
  assert.match(edx, /prefers-reduced-motion: reduce\)[\s\S]*?\.edx-wipe \{ display: none; \}/)
  // não dispara no primeiro render (só quando active muda)
  assert.match(edx, /if \(wipePrev\.current === active\) return/)
})

test('medidor da década: 16 segmentos no tom de cada edição', () => {
  assert.match(edx, /className=\{`edx-meter__seg\$\{i <= Math\.min\(active, TOTAL - 1\) \? ' is-lit' : ''\}`\}/)
  assert.match(edx, /\.edx-meter \{ display: flex;/)
  // barra antiga de progresso desktop saiu
  assert.doesNotMatch(edx, /className="edx-progress"/)
})

test('sem overflow horizontal estrutural (container clipa)', () => {
  assert.match(edx, /\.edx-page \{[\s\S]*?overflow-x: clip;/)
})

test('overhaul visual: coluna compacta, sem linhas decorativas, scrubber, faixa do rail', () => {
  // numeral-watermark removido (era o template "big number", um dos defaults de IA)
  assert.doesNotMatch(edx, /edx-scene__numeral/)
  // coluna editorial compacta e definida
  assert.match(edx, /\.edx-sticky \.edx-scene__title \{[\s\S]*?font-size: min\(clamp\(38px/)
  assert.match(edx, /\.edx-sticky \.edx-scene__head > \*, \.edx-sticky \.edx-scene__body > \* \{ max-width: min\(38vw, 480px\); \}/)
  // linhas decorativas do slate removidas (traço do rótulo + sublinhado do título)
  assert.doesNotMatch(edx, /edx-scene__title::after/)
  assert.doesNotMatch(edx, /edx-scene__code::before/)
  // faixa reservada dos cards flutuantes: limitada embaixo, rolagem própria
  assert.match(edx, /\.edx-rail \{[\s\S]*?bottom: 132px;[\s\S]*?overflow-y: auto;/)
  // scrubber revela o tema da cena ativa
  assert.match(edx, /\{i === active && <span className="edx-anos__th"/)
  assert.doesNotMatch(edx, /@keyframes edxThIn[^}]*\b(?:width|height)\b/)
})

test('base de curiosidades: só edições válidas, 0–3 por edição, tipos válidos', () => {
  const codes = Object.keys(EDITION_INSIGHTS)
  for (const code of codes) {
    assert.ok(VALID_CODES.includes(code), `code inválido: ${code}`)
    const items = EDITION_INSIGHTS[code]
    assert.ok(Array.isArray(items), `${code} deve ser array`)
    assert.ok(items.length >= 1 && items.length <= 3, `${code}: 1–3 cards (tem ${items.length})`)
    for (const it of items) {
      assert.ok(it.title && it.title.trim(), `${code}: title vazio`)
      assert.ok(it.text && it.text.trim(), `${code}: text vazio`)
      assert.ok(VALID_TYPES.includes(it.type), `${code}: type inválido ${it.type}`)
    }
  }
  // edições sem curiosidade confirmada ficam FORA (ausência honesta)
  for (const omit of ['2017.2', '2018.1', '2018.2', '2023', '2025']) {
    assert.equal(getEditionInsights(omit).length, 0, `${omit} não deveria ter curiosidade`)
  }
  // getEditionInsights nunca quebra em code desconhecido
  assert.deepEqual(getEditionInsights('9999'), [])
})

test('créditos da década: derivados das bases reais, sem invenção', () => {
  const { editions, cast } = getDecadeCredits()
  // 2016–2018 não tiveram premiação → fora dos créditos (ausência honesta)
  for (const ed of editions) {
    assert.ok(!['2016', '2017.1', '2017.2', '2018.1', '2018.2'].includes(ed.code), `${ed.code} não deveria ter créditos de pódio`)
    assert.ok(ed.firsts.length >= 1, `${ed.code} sem 1º lugares`)
    for (const f of ed.firsts) {
      assert.ok(f.categoria && Array.isArray(f.nomes) && f.nomes.length >= 1, `${ed.code}: first inválido`)
    }
  }
  // ordem cronológica (campo ordem da base)
  const ordens = editions.map((e) => e.ordem)
  assert.deepEqual(ordens, [...ordens].sort((a, b) => a - b))
  // Lovers presente com as 8 categorias oficiais (fonte loversAwardsResults)
  const lovers = editions.find((e) => e.code === '2026.1')
  assert.ok(lovers, 'Lovers ausente dos créditos')
  assert.equal(lovers.firsts.length, 8)
  // elenco = as 21 marcas reais
  assert.equal(cast.length, 21)
})
