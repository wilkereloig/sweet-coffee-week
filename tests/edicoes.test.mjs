/*
 * Edições — os contratos da visão geral e do detalhe, contra a base real
 * (src/pages/edicoes/acervo.js). Lógica pura, sem navegador; o comportamento
 * na tela (links diretos, voltar/avançar, galeria, foco) está em
 * tests/edicoes-navegador.mjs.
 *
 *   node --test tests/edicoes.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const A = await import('../src/pages/edicoes/acervo.js')
const { EDICOES_DADOS } = await import('../src/data/handoff/edicoesData.js')
const { SWEET_COFFEE_HISTORY } = await import('../src/data/sweetCoffeeHistory.js')
const { festivalFacts } = await import('../src/data/festivalFacts.js')

const HIST = SWEET_COFFEE_HISTORY.edicoes

test('as 16 edições do acervo, na ordem do acervo, e nenhuma em campanha', () => {
  assert.deepEqual(A.EDICOES.map((e) => e.code), HIST.map((e) => e.id))
  assert.equal(A.EDICOES.length, festivalFacts.editions.value)
  assert.ok(!A.EDICOES.some((e) => /^2026\.2$/.test(e.code) || /cartoon/i.test(e.tema)), 'Cartoon não é histórico')
})

test('tema, período e contagem vêm da base, sem cópia', () => {
  for (const e of A.EDICOES) {
    const h = HIST.find((x) => x.id === e.code)
    if (h.tema) assert.equal(e.tema, h.tema, `${e.code}: tema`)
    assert.equal(e.periodo, h.periodo, `${e.code}: período`)
    assert.equal(e.n, EDICOES_DADOS[e.code].participantes.length, `${e.code}: contagem`)
    assert.ok(e.mes && e.periodo.includes(e.mes), `${e.code}: mês "${e.mes}" lido do período`)
  }
  assert.equal(A.mesDeInicio('22 de julho a 01 de agosto de 2021'), 'julho', 'o mês é o do começo')
  assert.equal(A.mesDeInicio(''), null)
})

test('coleção por ano: do mais recente à estreia, 1ª antes da 2ª dentro do ano', () => {
  const g = A.anos()
  assert.deepEqual(g.map((x) => x.ano), ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016'])
  for (const x of g) {
    assert.ok(x.edicoes.every((e) => e.ano === x.ano))
    assert.deepEqual(x.edicoes.map((e) => e.code), [...x.edicoes.map((e) => e.code)].sort())
  }
  assert.equal(g.flatMap((x) => x.edicoes).length, 16, 'nenhuma edição some nem repete')
})

test('a grade fecha sem buraco em 4 e em 2 colunas', () => {
  const span = (x, cols) => (x.largura === 'inteira' ? cols : x.largura === 'dupla' ? 2 : x.edicoes.length)
  for (const cols of [4, 2]) {
    let linha = 0
    for (const x of A.anos()) {
      const s = Math.min(span(x, cols), cols)
      assert.ok(linha + s <= cols, `${cols} colunas: o ano ${x.ano} (${s}) não cabe na linha (${linha} ocupadas) e deixaria buraco`)
      linha = (linha + s) % cols
    }
    assert.equal(linha, 0, `${cols} colunas: a última linha ficou incompleta`)
  }
})

test('anos com duas edições se explicam sem ".1"/".2"', () => {
  const porCodigo = Object.fromEntries(A.EDICOES.map((e) => [e.code, e]))
  assert.equal(A.identificacao(porCodigo['2016']), 'A estreia, em 2016')
  assert.equal(A.identificacao(porCodigo['2017.1']), '1ª edição de 2017')
  assert.equal(A.identificacao(porCodigo['2021.2']), '2ª edição de 2021')
  assert.equal(A.identificacao(porCodigo['2023']), 'Edição de 2023')
  assert.equal(A.quando(porCodigo['2017.1']), '1ª do ano · abril')
  assert.equal(A.quando(porCodigo['2016']), 'A estreia · setembro')
  for (const e of A.EDICOES) {
    assert.doesNotMatch(A.quando(e), /\.\d/, `${e.code}: o cartão não depende do código`)
  }
})

test('cada edição tem capa do próprio acervo e marca oficial', () => {
  for (const e of A.EDICOES) {
    assert.ok(e.capa && e.capa.src.startsWith(`/images/edicoes/${e.code}/`), `${e.code}: capa de outra edição`)
    assert.ok(e.marca.logo, `${e.code}: marca da edição`)
  }
  for (const f of A.fotosAbertura()) assert.match(f.src, /^\/images\/edicoes\//)
  assert.equal(A.fotosAbertura().length, 4)
})

test('rota: código válido abre o detalhe; o resto é a visão geral', () => {
  assert.equal(A.codigoDaRota('/edicoes/2017.1'), '2017.1')
  assert.equal(A.codigoDaRota('/edicoes/2016/'), '2016')
  assert.equal(A.codigoDaRota('/edicoes/2016?x=1'), '2016')
  assert.equal(A.codigoDaRota('/edicoes'), null)
  assert.equal(A.codigoDaRota('/edicoes/'), null)
  assert.equal(A.codigoDaRota('/edicoes/2026.2'), null, 'Cartoon não tem página de histórico')
  assert.equal(A.codigoDaRota('/edicoes/1999'), null)
  assert.equal(A.codigoDaRota('/edicoes/2016/fotos'), null)
  for (const e of A.EDICOES) assert.equal(A.codigoDaRota(e.href.slice(1)), e.code)
})

test('detalhe: fotos, história, marcas e vizinhas de cada edição', () => {
  for (const [i, e] of A.EDICOES.entries()) {
    const d = A.detalhe(e.code)
    if (d.porMarca) {
      // Um combo por marca: cada foto diz a marca, a marca é desta edição e
      // não se repete; nunca mais fotos do que marcas.
      const nomes = d.fotos.map((f) => f.marca)
      assert.ok(nomes.every((m) => d.participantes.includes(m)), `${e.code}: foto de marca que não participou`)
      assert.equal(new Set(nomes).size, nomes.length, `${e.code}: marca repetida na galeria`)
      assert.ok(d.fotos.every((f) => f.src.startsWith(`/images/edicoes/${e.code}/combos/`) || (e.code === '2026.1' && f.src.startsWith('/images/combos/'))), `${e.code}: foto de outra edição`)
    } else {
      assert.ok(d.fotos.length >= 11, `${e.code}: galeria`)
      assert.ok(d.fotos.every((f) => f.src.startsWith(`/images/edicoes/${e.code}/`)), `${e.code}: foto de outra edição`)
    }
    assert.equal(d.participantes.length, d.n)
    assert.equal(d.anterior && d.anterior.code, i ? A.EDICOES[i - 1].code : null)
    assert.equal(d.proxima && d.proxima.code, A.EDICOES[i + 1] ? A.EDICOES[i + 1].code : null)
    assert.ok(d.curiosidades.every((c) => !/R\$/.test(`${c.x} ${c.v || ''}`)), `${e.code}: preço não entra`)
    assert.ok(d.narrativa.lead, `${e.code}: lead`)
  }
  // Revisão editorial de 14/10/2026: a explicação geral do festival é da Home,
  // não se repete no detalhe da estreia.
  assert.ok(!('abertura' in A.detalhe('2016')), 'a estreia não repete a explicação geral do festival')
  assert.equal(A.detalhe('2026.2'), null)
})

test('premiação: com e sem registro ficam diferentes', () => {
  const sem = A.detalhe('2018.1').premiacao
  assert.equal(sem.teve, false)
  assert.equal(sem.categorias.length, 0)
  assert.equal(sem.resumo, 'Sem premiação nesta edição')
  const com = A.detalhe('2020.2').premiacao
  assert.equal(com.teve, true)
  assert.match(com.resumo, /^\d+ categorias?$/)
  assert.ok(com.categorias.some((c) => c.nome === 'Melhor Combo · Júri Técnico'), 'trilha só quando a categoria repete')
  assert.ok(com.categorias.every((c) => c.primeiro === null || c.primeiro.length >= 1))
  const lovers = A.detalhe('2026.1').premiacao
  assert.ok(lovers.teve && lovers.categorias.length === 8, 'Lovers: oito categorias')
  // As edições premiadas são as do acervo do Awards, nem mais nem menos.
  const premiadas = A.EDICOES.filter((e) => A.detalhe(e.code).premiacao.teve).map((e) => e.code)
  assert.deepEqual(premiadas, ['2019.1', '2019.2', '2020.1', '2020.2', '2021.1', '2021.2', '2022', '2023', '2024', '2025', '2026.1'])
})

test('a página não captura teclas nem gestos na janela', () => {
  const pasta = 'src/pages/edicoes'
  const arquivos = ['index.jsx', 'secoes/Colecao.jsx', 'secoes/NavAnos.jsx', 'secoes/Detalhe.jsx', 'secoes/GaleriaEdicao.jsx']
  for (const f of arquivos) {
    // só o código: o comentário que diz "sem autoplay" não conta
    const fonte = readFileSync(`${pasta}/${f}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    assert.doesNotMatch(fonte, /window\.addEventListener\(\s*['"]key/, `${f}: teclado na janela`)
    assert.doesNotMatch(fonte, /onPointerDown|onTouchStart/, `${f}: arraste`)
    assert.doesNotMatch(fonte, /setInterval|autoplay/i, `${f}: troca automática`)
  }
})
