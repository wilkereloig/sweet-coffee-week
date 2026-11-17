// Números do site (src/data/festivalFacts.js) e estado dos resultados (src/data/resultadosEdicao.js).
// 16/11/2026 — a edição Cartoon encerrou: os números históricos derivam da base (17 · 437 · 131), os comerciais
// continuam os da apuração de junho de 2026 e DIZEM o período que cobrem; o Sweet Awards da Cartoon está em
// apuração e só entra no Hall e nas contagens quando o resultado for publicado. A publicação futura é conferida
// aqui com dados SINTÉTICOS, isolados — nenhum resultado de mentira encosta no acervo real.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const {
  festivalFacts: F, estadoDoFato, fatoPublicavel, partesDoFato, textoDoFato, notasDeApuracao,
} = await import('../src/data/festivalFacts.js')
const { SWEET_COFFEE_HISTORY: H } = await import('../src/data/sweetCoffeeHistory.js')
const { AWARDS_DADOS, construirAwards, estadoPremiacao } = await import('../src/data/handoff/awardsData.js')
const { RESULTADOS, resultadosDaEdicao, EDICAO_EM_DESTAQUE } = await import('../src/data/resultadosEdicao.js')
const C = await import('../src/pages/sweet-awards/consulta.js')
const { FAQ_DADOS } = await import('../src/data/faqCentral.js')

const ler = (p) => readFileSync(fileURLToPath(new URL('../' + p, import.meta.url)), 'utf8')
const COMERCIAIS = ['combosSold', 'revenue', 'igViews', 'igReach', 'igInteractions', 'igFollowers', 'igPosts']

test('histórico derivado da base: 17 edições, 437 participações, 131 marcas, 27 na Cartoon', () => {
  assert.equal(F.editions.value, 17)
  assert.equal(F.participations.value, 437)
  assert.equal(F.brands.value, 131)
  assert.deepEqual({ code: F.lastEdition.code, tema: F.lastEdition.tema, ano: F.lastEdition.ano, marcas: F.lastEdition.marcas },
    { code: '2026.2', tema: 'Cartoon', ano: 2026, marcas: 27 })
  // Conceitos diferentes não se confundem: marcas ≠ participações ≠ lojas.
  assert.notEqual(F.brands.value, F.participations.value)
  assert.equal(F.storesLovers.edicao, '2026.1', 'lojas só existem para a Lovers, e o campo diz isso')
  assert.equal(F.storesLastEdition, undefined, '"última edição" não pode apontar para a Lovers')
})

test('todo número comercial declara o que mede, fonte, período, apuração e estado', () => {
  for (const k of COMERCIAIS) {
    const f = F[k]
    for (const campo of ['mede', 'fonte', 'periodo', 'apurado', 'verificado']) {
      assert.ok(typeof f[campo] === 'string' && f[campo].trim(), `${k}: falta "${campo}"`)
    }
    assert.equal(estadoDoFato(f), 'confirmado', k)
    assert.equal(fatoPublicavel(f), true, k)
  }
  // A apuração de junho de 2026 é anterior à Cartoon: o texto não pode sugerir as 17 edições.
  for (const k of ['combosSold', 'revenue']) {
    assert.match(F[k].mede, /16 edições até a Lovers/, `${k}: o escopo precisa dizer até onde a soma vai`)
    assert.equal(F[k].edicoes, 16)
    assert.match(F[k].periodo, /16ª edição \(Lovers\)/)
  }
})

test('prefixo e unidade saem do fato: valor novo nunca fica com unidade antiga', () => {
  assert.equal(F.revenue.curto, '+R$ 712 mil')
  assert.equal(F.combosSold.curto, '+34 mil')
  assert.equal(F.igViews.curto, '+18 mi')
  assert.equal(F.igViews.label, '+18 milhões de visualizações')
  assert.equal(F.igPosts.label, '+1.600 posts')
  assert.deepEqual(partesDoFato(F.revenue), { antes: '+R$ ', valor: 712, depois: ' mil' })
  // Trocou a ordem de grandeza: o texto acompanha sozinho.
  assert.equal(textoDoFato({ value: 1.2, unit: 'milhões', piso: true, moeda: true }), '+R$ 1,2 mi')
  // Nenhuma página digita unidade ao lado do número.
  for (const arq of ['src/data/conteudo/home.js', 'src/pages/home/secoes/Trajetoria.jsx', 'src/pages/institutional/EmBreve.jsx']) {
    assert.doesNotMatch(ler(arq), /(antes|depois|prefixo|sufixo):\s*'[^']*(mil|mi|R\$)[^']*'/, `${arq} voltou a digitar prefixo ou unidade`)
  }
})

test('pendente, zero conferido, parcial e erro são quatro coisas diferentes', () => {
  // Pendente: ainda não apurado → some da página, nunca vira zero.
  assert.equal(estadoDoFato({ value: null, unit: 'mil' }), 'pendente')
  assert.equal(partesDoFato({ value: null, unit: 'mil' }), null)
  assert.equal(textoDoFato({ value: null, unit: 'mil' }), null)
  // Zero conferido: aparece como 0, sem o "+" de arredondamento.
  assert.equal(estadoDoFato({ value: 0, unit: '' }), 'confirmado')
  assert.equal(textoDoFato({ value: 0, unit: '', piso: true }), '0')
  // Parcial: aparece, e a nota diz que é parcial.
  const parcial = { value: 10, unit: 'mil', estado: 'parcial', apurado: 'novembro de 2026', periodo: 'edição Cartoon', publica: true }
  assert.equal(estadoDoFato(parcial), 'parcial')
  assert.match(notasDeApuracao([{ titulo: 'Combos', fato: parcial }])[0], /apuração parcial de novembro de 2026, edição Cartoon/)
  // Erro: valor ou unidade inválidos → nunca exibir.
  for (const ruim of [{ value: '34', unit: 'mil' }, { value: NaN, unit: 'mil' }, { value: -1, unit: '' }, { value: 3, unit: 'k' }, null]) {
    assert.equal(estadoDoFato(ruim), 'erro')
    assert.equal(partesDoFato(ruim), null)
    assert.equal(fatoPublicavel(ruim), false)
  }
  // Dado interno marcado como não publicável não chega à página.
  assert.equal(fatoPublicavel({ value: 5, unit: '', publica: false }), false)
})

test('nota de apuração: uma frase por grupo — datas diferentes não escondem a nota', () => {
  const hoje = notasDeApuracao([
    { titulo: 'Participações', fato: F.participations },
    { titulo: 'Combos vendidos', fato: F.combosSold },
    { titulo: 'Movimento nas casas', fato: F.revenue },
    { titulo: 'Visualizações', fato: F.igViews },
  ])
  assert.deepEqual(hoje, [
    'Combos vendidos e movimento nas casas: apuração de junho de 2026, até a 16ª edição (Lovers).',
    'Visualizações: apuração de junho de 2026, acumulado até a edição Lovers.',
  ])
  // Sintético: cada indicador com a sua data. Antes a nota sumia quando as datas divergiam.
  const tres = notasDeApuracao([
    { titulo: 'A', fato: { value: 1, unit: '', apurado: 'junho de 2026', periodo: 'x' } },
    { titulo: 'B', fato: { value: 2, unit: '', apurado: 'novembro de 2026', periodo: 'y' } },
    { titulo: 'C', fato: { value: 3, unit: '', apurado: 'dezembro de 2026' } },
    { titulo: 'D', fato: { value: null, unit: '', apurado: 'dezembro de 2026' } },
  ])
  assert.equal(tres.length, 3, 'três datas, três frases; o pendente não entra')
  assert.match(tres[2], /^C: apuração de dezembro de 2026\.$/)
  // A Trajetória não decide mais por "só uma data".
  assert.doesNotMatch(ler('src/pages/home/secoes/Trajetoria.jsx'), /APURADOS\.length\s*===\s*1/)
})

test('número da agência não se mistura: só "edições assinadas" vem do festival, e vem da fonte', () => {
  const home = ler('src/data/conteudo/home.js')
  assert.match(home, /\['03', \{ fato: 'editions' \}, '', 'edições do festival assinadas'\]/)
  assert.doesNotMatch(home, /\['03', '\d+'/, 'o número de edições da F2 voltou a ser digitado')
  assert.match(ler('src/pages/home/secoes/Realizacao.jsx'), /festivalFacts\[num\.fato\]\.value/)
})

test('a central de dúvidas cita a última edição da base, não uma cópia', () => {
  assert.equal(FAQ_DADOS.edicao.ultima.code, F.lastEdition.code)
  assert.equal(FAQ_DADOS.edicao.ultima.tema, F.lastEdition.tema)
  assert.equal(FAQ_DADOS.edicao.ultima.edicoes, F.editions.value)
  assert.equal(FAQ_DADOS.edicao.ultima.periodo, F.lastEdition.periodo, 'tema e período andam juntos, os dois da base')
  assert.match(F.lastEdition.periodo, /novembro de 2026/)
  assert.doesNotMatch(ler('src/data/faqCentral.js'), /periodo:\s*'[^']*de 20\d\d'/, 'período da última edição voltou a ser digitado')
  const q = (id) => FAQ_DADOS.perguntas.find((p) => p.id === id)
  assert.equal(q('qual-e-o-tema-da-edicao-atual').p, 'Qual é o tema da próxima edição?', 'não há edição "atual" em cartaz')
  assert.match(q('quando-os-resultados-sao-divulgados').r.join(' '), /edição Cartoon está em apuração/)
  assert.equal(q('quando-os-resultados-sao-divulgados').link, 'awards')
})

/* ---------------------------------------------------------------------------
   Sweet Awards: Cartoon em apuração hoje; publicação futura com base sintética
   ------------------------------------------------------------------------ */

test('hoje: Cartoon em apuração, fora do Hall e das contagens', () => {
  assert.equal(EDICAO_EM_DESTAQUE, '2026.2')
  assert.equal(RESULTADOS.awards.estado, 'em-apuracao')
  assert.equal(RESULTADOS.tema, 'Cartoon')
  assert.equal(estadoPremiacao('2026.2'), 'em-apuracao')
  assert.equal(estadoPremiacao('2026.1'), 'divulgado')
  assert.equal(estadoPremiacao('2016'), 'sem-premiacao')
  assert.ok(!AWARDS_DADOS.edicoes.some((e) => e.code === '2026.2'), 'a Cartoon não entra sem resultado publicado')
  assert.equal(C.ultimaComResultado(AWARDS_DADOS.edicoes), '2026.1', 'os resultados que abrem a página são os da Lovers')
  assert.deepEqual(C.estatisticas(AWARDS_DADOS.edicoes), { edicoes: 11, premios: 271, marcas: 44 })
  // Três resultados, três estados: nenhum publicado.
  assert.deepEqual([RESULTADOS.caca.estado, RESULTADOS.sorteios.estado], ['em-apuracao', 'em-apuracao'])
  assert.equal(RESULTADOS.caca.href, null)
})

/* Base sintética: a mesma do acervo, com a 2026.2 trocada. Nomes de exemplo
   que não existem no acervo — nada aqui é resultado real. */
const baseCom = (premiacao) => ({
  ...H,
  edicoes: H.edicoes.map((e) => (e.id === '2026.2' ? { ...e, premiacao: { ...e.premiacao, ...premiacao } } : e)),
})
const PODIO = [
  { key: 'melhor-combo', categoria: 'Melhor Combo', trilha: 'sweet_lovers', descricao: '', colocacoes: [
    { pos: 1, nomes: ['Casa de Exemplo A'] }, { pos: 2, nomes: ['Casa de Exemplo B', 'Casa de Exemplo C'] }, { pos: 3, nomes: ['Casa de Exemplo A'] },
  ] },
]

test('publicação futura (sintética): com pódio e status liberado, a Cartoon vira o destaque e entra nas contas', () => {
  const dados = construirAwards(baseCom({ status: 'completa', categorias: PODIO }))
  assert.equal(C.ultimaComResultado(dados.edicoes), '2026.2')
  assert.equal(estadoPremiacao('2026.2', dados), 'divulgado')
  const r = resultadosDaEdicao({ history: baseCom({ status: 'completa', categorias: PODIO }), awards: dados })
  assert.equal(r.awards.estado, 'divulgado')
  // Hall e contagens passam a incluir exatamente o que foi publicado: 4 prêmios, 3 marcas novas, 1 edição.
  assert.deepEqual(C.estatisticas(dados.edicoes), { edicoes: 12, premios: 275, marcas: 47 })
  // Divulgar o Sweet Awards não marca Caça nem sorteios como concluídos.
  assert.deepEqual([r.caca.estado, r.sorteios.estado], ['em-apuracao', 'em-apuracao'])
  // O acervo real não foi tocado.
  assert.equal(C.estatisticas(AWARDS_DADOS.edicoes).premios, 271)
})

test('publicação pela metade não vale: categoria sem pódio, ou pódio com status em apuração', () => {
  const semPodio = construirAwards(baseCom({ status: 'completa', categorias: [{ ...PODIO[0], colocacoes: [] }] }))
  assert.ok(!semPodio.edicoes.some((e) => e.code === '2026.2'), 'categoria definida sem pódio não é resultado')
  const naoLiberado = construirAwards(baseCom({ status: 'em-apuracao', categorias: PODIO }))
  assert.ok(!naoLiberado.edicoes.some((e) => e.code === '2026.2'), 'pódio com status em apuração ainda não foi liberado')
  assert.equal(estadoPremiacao('2026.2', naoLiberado, baseCom({ status: 'em-apuracao', categorias: PODIO })), 'em-apuracao')
  assert.deepEqual(C.estatisticas(naoLiberado.edicoes), { edicoes: 11, premios: 271, marcas: 44 })
})

test('Caça e sorteios: cada um com o seu estado, e "divulgado" só com o link oficial', () => {
  const r = resultadosDaEdicao({ manuais: {
    caca: { nome: 'Caça aos Carimbos', estado: 'divulgado', href: 'https://www.instagram.com/p/exemplo/' },
    sorteios: { nome: 'sorteios', estado: 'divulgado', href: null },
  } })
  assert.equal(r.caca.estado, 'divulgado')
  assert.equal(r.caca.href, 'https://www.instagram.com/p/exemplo/')
  assert.equal(r.sorteios.estado, 'em-apuracao', 'sem link oficial não há resultado divulgado')
  assert.equal(r.awards.estado, 'em-apuracao', 'a Caça divulgada não muda o Sweet Awards')
})

test('nada de resultado no código antes da divulgação (A4)', () => {
  const cartoon = H.edicoes.find((e) => e.id === '2026.2')
  assert.equal(cartoon.premiacao.status, 'em-apuracao')
  assert.deepEqual(cartoon.premiacao.categorias, [])
  // As páginas não anunciam data, cerimônia nem contagem regressiva.
  for (const arq of ['src/data/conteudo/home.js', 'src/data/conteudo/sweet-awards.js', 'src/data/conteudo/edicoes.js']) {
    assert.doesNotMatch(ler(arq).replace(/\/\*[\s\S]*?\*\//g, ' '), /cerim[oô]nia de premia|contagem regressiva|faltam \d+ dias/i, arq)
  }
})
