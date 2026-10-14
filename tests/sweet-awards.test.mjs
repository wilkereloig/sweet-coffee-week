import test from 'node:test'
import assert from 'node:assert/strict'

/*
 * Sweet Awards — a consulta reorganizada (12/10/2026).
 *
 * A página passou a ter índice de seções, filtro de categoria nos resultados
 * recentes e histórico em acordeão por edição. A lógica dessas três peças mora
 * em src/pages/sweet-awards/consulta.js; aqui ela é conferida contra a BASE REAL
 * (awardsData) e contra os números oficiais do acervo (§9.1 e §9.4), não contra
 * ela mesma: se a consulta perder um resultado ou recontar o Hall com outra
 * regra, algum número oficial deixa de bater.
 */

const { AWARDS_DADOS } = await import('../src/data/handoff/awardsData.js')
const C = await import('../src/pages/sweet-awards/consulta.js')
const T = await import('../src/data/conteudo/sweet-awards.js')
const { temDesenho } = await import('./_icones.mjs')

const EDICOES = AWARDS_DADOS.edicoes
const { recente, historico } = C.separarEdicoes(EDICOES, T.EDICAO_RECENTE)
const chaveDe = (e, c, p) => `${e.code}|${c.trilha}|${c.nome}|${p.pos}|${p.nomes.join('+')}`
const todasColocacoes = (eds) => eds.flatMap((e) => e.cats.flatMap((c) => c.pod.map((p) => chaveDe(e, c, p))))

test('a edição em destaque existe e nenhuma edição some do histórico', () => {
  assert.ok(recente, `a edição ${T.EDICAO_RECENTE} precisa existir na base`)
  assert.equal(recente.cats.length, 8, 'a edição dos dez anos teve oito categorias')
  const codes = [recente, ...historico].map((e) => e.code).sort()
  assert.deepEqual(codes, EDICOES.map((e) => e.code).sort(), 'recente + histórico = todas as edições, uma vez cada')
  // Histórico do mais recente para o mais antigo: 2025 abre, 2019.1 fecha.
  assert.equal(historico[0].code, '2025')
  assert.equal(historico.at(-1).code, '2019.1')
})

test('números do herói batem com o acervo oficial (§9.1)', () => {
  assert.deepEqual(C.estatisticas(EDICOES), { edicoes: 11, premios: 271, marcas: 44 })
})

test('o Hall é o do acervo oficial (§9.4), contado da base', () => {
  const OFICIAL = [
    ['Mr. Cupcake Confeitaria', 9, 14, 6, 29],
    ['Bocaditos', 12, 7, 7, 26],
    ['Marlon Vinicius', 9, 5, 12, 26],
    ['O Maestro Café', 9, 9, 4, 22],
    ['Atelier Mine Confeitaria', 0, 9, 5, 14],
    ["Canuto's", 4, 5, 3, 12],
    ["Duart's Confeitaria", 3, 2, 7, 12],
    ['Delicato Bolos', 5, 4, 2, 11],
    ['Jolie Café Pâtisserie', 3, 2, 4, 9],
    ['Bolomania', 2, 4, 3, 9],
  ]
  const hall = C.ranking(EDICOES, 10)
  assert.equal(hall.length, 10)
  hall.forEach((h, i) => {
    const [nome, p1, p2, p3, total] = OFICIAL[i]
    assert.equal(C.identidade(h.nome), C.identidade(nome), `posição ${i + 1}: esperava ${nome}, veio ${h.nome}`)
    assert.deepEqual([h.p1, h.p2, h.p3, h.total], [p1, p2, p3, total], `${nome}: contagem diverge do acervo`)
  })
  // O ranking inteiro soma as 271 colocações: Menção Honrosa (2021.1) não entra.
  const tudo = C.ranking(EDICOES)
  assert.equal(tudo.reduce((s, h) => s + h.total, 0), 271)
  assert.equal(tudo.length, 44)
})

test('Menção Honrosa fica fora de cats e do Hall', () => {
  const series = EDICOES.find((e) => e.code === '2021.1')
  assert.ok(series.mencao && series.mencao.nomes.length > 0, 'a menção da 2021.1 continua na base')
  const nomesNoPodio = new Set(series.cats.flatMap((c) => c.pod.flatMap((p) => p.nomes)))
  // "Chocolatudos por Laís" só aparece pela menção: se ela virasse colocação, entraria no ranking.
  const soMencao = series.mencao.nomes.filter((n) => !nomesNoPodio.has(n))
  const ranking = C.ranking(EDICOES)
  for (const n of soMencao) {
    const r = ranking.find((h) => C.identidade(h.nome) === C.identidade(n))
    const emOutrasEdicoes = EDICOES.some((e) => e.cats.some((c) => c.pod.some((p) => p.nomes.includes(n))))
    if (!emOutrasEdicoes) assert.equal(r, undefined, `${n} só tem menção — não pode estar no ranking`)
  }
})

test('filtro "Todas" devolve todas as categorias, na ordem da base', () => {
  assert.deepEqual(C.filtrarCategorias(recente.cats, C.TODAS), recente.cats)
})

test('cada opção do filtro mostra exatamente o pódio daquela categoria, e nenhum resultado some', () => {
  const opcoes = C.opcoesFiltro(recente.cats, T.FILTRO.todas)
  assert.equal(opcoes[0].chave, C.TODAS)
  assert.equal(opcoes[0].total, recente.cats.length)
  assert.equal(new Set(opcoes.map((o) => o.chave)).size, opcoes.length, 'chaves do filtro repetidas')
  const vistas = []
  for (const o of opcoes.slice(1)) {
    const v = C.filtrarCategorias(recente.cats, o.chave)
    assert.equal(v.length, 1, `${o.rotulo}: o filtro deveria isolar uma categoria`)
    assert.equal(v[0].nome, o.chave)
    assert.ok(v[0].pod.length > 0, `${o.rotulo}: categoria sem resultado no filtro`)
    vistas.push(...v)
  }
  // A união das opções cobre todas as colocações da edição — nada fica sem caminho.
  assert.deepEqual(todasColocacoes([{ ...recente, cats: vistas }]).sort(), todasColocacoes([recente]).sort())
})

test('filtro desconhecido nunca deixa a tela vazia', () => {
  assert.equal(C.filtrarCategorias(recente.cats, 'Categoria que saiu').length, recente.cats.length)
  assert.match(C.anuncioFiltro(recente.cats, C.TODAS), /8 categorias/)
  assert.match(C.anuncioFiltro(recente.cats, 'Melhor Doce'), /Melhor Doce/)
})

test('pódio completo: 1º, 2º e 3º sempre presentes, ausência honesta, nada perdido', () => {
  for (const e of EDICOES) {
    for (const c of e.cats) {
      const completo = C.podioCompleto(c.pod)
      assert.deepEqual(completo.slice(0, 3).map((p) => p.pos), [1, 2, 3], `${e.code} ${c.nome}`)
      const nomes = completo.flatMap((p) => p.nomes || [])
      assert.deepEqual(nomes, c.pod.flatMap((p) => p.nomes), `${e.code} ${c.nome}: nome perdido no pódio`)
    }
  }
  // Colocação que o acervo não registra vira null — nunca é preenchida.
  const so1 = C.podioCompleto([{ pos: 1, nomes: ['Casa A'] }])
  assert.deepEqual(so1.map((p) => p.nomes), [['Casa A'], null, null])
  // Empate continua na MESMA colocação e é marcado.
  const doce = recente.cats.find((c) => c.nome === 'Melhor Doce')
  const terceiro = C.podioCompleto(doce.pod).find((p) => p.pos === 3)
  assert.equal(terceiro.empate, true)
  assert.equal(terceiro.nomes.length, 2)
})

test('histórico agrupado por trilha não perde categoria e separa júri de público onde houve os dois', () => {
  for (const e of historico) {
    const grupos = C.agruparPorTrilha(e.cats)
    const juntas = grupos.flatMap((g) => g.cats)
    assert.equal(juntas.length, e.cats.length, `${e.code}: categoria perdida ou duplicada`)
    assert.deepEqual(new Set(juntas), new Set(e.cats), `${e.code}: categoria perdida`)
    // Dentro de cada trilha, a ordem da base se mantém.
    for (const g of grupos) {
      assert.deepEqual(g.cats, e.cats.filter((c) => (c.trilha || '') === g.trilha), `${e.code}/${g.trilha}: ordem trocada`)
    }
  }
  const comDuas = historico.filter((e) => C.agruparPorTrilha(e.cats).length > 1).map((e) => e.code).sort()
  assert.deepEqual(comDuas, ['2020.2', '2021.1', '2021.2'], 'Júri Técnico existiu em três edições (§7.3)')
})

test('foto só onde o vínculo marca↔combo existe, e casa premiada várias vezes não repete foto', () => {
  const fotos = C.fotosDoPodio(recente)
  for (const c of recente.cats) {
    for (const p of c.pod) assert.ok(fotos.get(`${c.nome}:${p.pos}`), `${c.nome} ${p.pos}º sem foto na edição Lovers`)
  }
  // O Maestro Café vence Combo, Criatividade e Salgado: três combos diferentes.
  const maestro = recente.cats
    .filter((c) => c.pod.some((p) => p.pos === 1 && p.nomes[0] === 'O Maestro Café'))
    .map((c) => fotos.get(`${c.nome}:1`).src)
  assert.equal(maestro.length, 3)
  assert.equal(new Set(maestro).size, 3, 'a mesma foto se repetiu entre categorias')
  // Edição antiga: nenhuma foto inventada.
  for (const e of historico) for (const f of C.fotosDoPodio(e).values()) assert.equal(f, null, `${e.code} ganhou foto`)
})

test('índice: uma entrada por seção, âncoras únicas e contagens tiradas da base', () => {
  const hall = C.ranking(EDICOES, 10)
  const indice = C.indiceDaPagina({
    secoes: T.SECOES, ordem: T.ORDEM_SECOES, recente, historico, hall, trilha: T.TRILHA,
  })
  assert.deepEqual(indice.map((i) => i.chave), T.ORDEM_SECOES)
  assert.deepEqual(new Set(indice.map((i) => i.id)).size, indice.length, 'âncora repetida')
  for (const i of indice) {
    assert.match(i.id, /^swa-[a-z-]+$/, `âncora "${i.id}" sem o prefixo da página`)
    assert.ok(i.resumo, `${i.rotulo}: entrada do índice sem resumo`)
  }
  const por = Object.fromEntries(indice.map((i) => [i.chave, i.resumo]))
  assert.match(por.resultados, new RegExp(`^${recente.cats.length} categorias`))
  assert.match(por.hall, new RegExp(`\\b${hall.length}\\b`))
  assert.match(por.historico, /^10 edições, de 2019 a 2025$/)
})

test('todo ícone citado no conteúdo existe no sistema (ícone ausente some sem erro, §6.11)', () => {
  const nomes = [
    ...Object.values(T.ICONE_CATEGORIA), T.ICONE_CATEGORIA_PADRAO,
    ...T.TRILHA.map((m) => m.icone),
    ...Object.values(T.SECOES).map((s) => s.icone),
  ]
  // Pódio e rótulos usam 20–24px: o nome precisa do desenho de interface.
  for (const n of nomes) assert.ok(temDesenho(n, 24), `ícone sem desenho de interface: ${n}`)
  // Toda categoria da edição em destaque tem ícone próprio, não o padrão.
  for (const c of recente.cats) assert.ok(T.ICONE_CATEGORIA[c.nome], `${c.nome} sem ícone`)
})
