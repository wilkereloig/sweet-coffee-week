// Horário no festival (23/10/2026): o modelo puro que o seletor, a ficha da equipe e as telas de leitura usam.
// O banco tem a mesma regra (horario_festival_normalizar) — testada em supabase/testes/horario-festival.sql.
import test from 'node:test'
import assert from 'node:assert/strict'
import * as H from '../painel-app/src/lib/horarioFestival.js'

const DATAS = H.datasDoFestival('2026-11-05', '2026-11-15')
const todosIguais = (periodos) => DATAS.map((data) => ({ data, periodos: periodos.map((p) => [...p]) }))

test('datas do festival: 11 dias, de quinta 5 a domingo 15', () => {
  assert.equal(DATAS.length, 11)
  assert.equal(DATAS[0], '2026-11-05')
  assert.equal(DATAS[10], '2026-11-15')
  assert.deepEqual(H.datasDoFestival('2026-11-05', '2026-11-05'), ['2026-11-05'])
  assert.deepEqual(H.datasDoFestival('', ''), [])
  assert.deepEqual(H.datasDoFestival('2026-11-15', '2026-11-05'), [])
  assert.equal(H.datasDoFestival('2026-01-01', '2026-12-31').length, 31, 'nunca passa de 31 dias')
})

test('dia da semana e rótulo: segunda = 0, sem depender do fuso', () => {
  assert.equal(H.diaDaSemana('2026-11-05'), 3)   // quinta
  assert.equal(H.diaDaSemana('2026-11-08'), 6)   // domingo
  assert.equal(H.diaDaSemana('2026-11-09'), 0)   // segunda
  assert.equal(H.rotuloDia('2026-11-05'), 'Qui 5/11')
  assert.equal(H.rotuloDia('2026-11-14'), 'Sáb 14/11')
  assert.equal(H.grupoDaData('2026-11-05'), 'semana')
  assert.equal(H.grupoDaData('2026-11-07'), 'sab')
  assert.equal(H.grupoDaData('2026-11-15'), 'dom')
})

test('horas: texto curto, meia-noite e opções', () => {
  assert.equal(H.horaTexto('10:00'), '10h')
  assert.equal(H.horaTexto('09:30'), '9h30')
  assert.equal(H.horaTexto('10:00:00'), '10h')
  assert.equal(H.horaTexto('24:00'), 'meia-noite')
  assert.equal(H.horaTexto('abc'), '')
  assert.equal(H.periodoTexto(['10:00', '22:00']), 'das 10h às 22h')
  assert.equal(H.periodoTexto(['18:00', '24:00']), 'das 18h à meia-noite')
  assert.equal(H.periodosTexto([['12:00', '15:00'], ['18:00', '22:00']]), 'das 12h às 15h e das 18h às 22h')
  assert.equal(H.HORAS_ABRE[0], '05:00')
  assert.equal(H.HORAS_ABRE.at(-1), '23:30')
  assert.equal(H.HORAS_FECHA[0], '05:30')
  assert.equal(H.HORAS_FECHA.at(-1), '24:00')
  assert.ok(!H.HORAS_ABRE.includes('24:00'), 'abrir à meia-noite não existe')
  assert.equal(H.normalizarHora('9:05:00'), '09:05')
})

test('do banco para a tela: sem linha nenhuma = sem resposta; com linhas, dia sem linha = não abre', () => {
  assert.ok(H.diasDeLinhas([], DATAS).every((d) => d.periodos === null))
  assert.ok(H.diasDeLinhas(null, DATAS).every((d) => d.periodos === null))
  const linhas = [
    { data: '2026-11-05', abre: '10:00:00', fecha: '22:00:00' },
    { data: '2026-11-06', abre: '18:00', fecha: '22:00' },
    { data: '2026-11-06', abre: '12:00', fecha: '15:00' },
    { data: '2026-12-25', abre: '10:00', fecha: '12:00' },
  ]
  const dias = H.diasDeLinhas(linhas, DATAS)
  assert.deepEqual(dias[0].periodos, [['10:00', '22:00']])
  assert.deepEqual(dias[1].periodos, [['12:00', '15:00'], ['18:00', '22:00']], 'períodos em ordem')
  assert.deepEqual(dias[2].periodos, [], 'sábado sem linha = não abre')
  assert.equal(dias.length, 11, 'linha fora do festival é ignorada')
})

test('da tela para o banco: só os dias que abrem, em ordem e como HH:MM', () => {
  const dias = H.diasDeLinhas([{ data: '2026-11-07', abre: '12:00', fecha: '16:00' }, { data: '2026-11-05', abre: '10:00', fecha: '18:00' }], DATAS)
  assert.deepEqual(H.linhasDeDias(dias), [
    { data: '2026-11-05', abre: '10:00', fecha: '18:00' },
    { data: '2026-11-07', abre: '12:00', fecha: '16:00' },
  ])
  assert.deepEqual(H.linhasDeDias(DATAS.map((data) => ({ data, periodos: null }))), [])
  assert.deepEqual(H.linhasDeDias(todosIguais([])), [], 'tudo fechado não grava linha')
  assert.equal(H.linhasDeDias(todosIguais([['10:00', '22:00']])).length, 11)
})

test('dia completo: não abre vale; períodos têm que ser válidos, em ordem e sem se sobrepor', () => {
  assert.equal(H.diaCompleto(null), false)
  assert.equal(H.diaCompleto([]), true)
  assert.equal(H.diaCompleto([['10:00', '22:00']]), true)
  assert.equal(H.diaCompleto([['10:00', '14:00'], ['18:00', '24:00']]), true)
  assert.equal(H.diaCompleto([['10:00', '14:00'], ['14:00', '18:00']]), true, 'encostar é permitido')
  assert.equal(H.diaCompleto([['10:00', '14:00'], ['13:00', '18:00']]), false, 'sobrepõe')
  assert.equal(H.diaCompleto([['10:00', '09:00']]), false)
  assert.equal(H.diaCompleto([['10:00', '10:00']]), false)
  assert.equal(H.diaCompleto([['', '10:00']]), false)
  assert.equal(H.diaCompleto([['10:15', '12:00']]), false, 'só de meia em meia hora')
  assert.equal(H.diaCompleto([['04:30', '12:00']]), false)
  assert.equal(H.diaCompleto([['08:00', '10:00'], ['11:00', '13:00'], ['14:00', '16:00']]), false, 'no máximo 2 períodos')
  assert.equal(H.diaCompleto([['24:00', '24:00']]), false)
})

test('horário completo: tudo respondido e pelo menos um dia abre', () => {
  assert.equal(H.horarioCompleto(todosIguais([['10:00', '22:00']])), true)
  assert.equal(H.horarioCompleto(todosIguais([])), false, 'fechado o festival inteiro não é uma resposta')
  assert.equal(H.horarioCompleto(DATAS.map((data) => ({ data, periodos: null }))), false)
  const parcial = todosIguais([['10:00', '22:00']])
  parcial[5].periodos = null
  assert.equal(H.horarioCompleto(parcial), false)
  assert.deepEqual(H.diasIncompletos(parcial), ['2026-11-10'])
  assert.equal(H.horarioCompleto([]), false)
})

test('modo: todos iguais · por semana · dia a dia · sem resposta', () => {
  assert.equal(H.modoDeDias(DATAS.map((data) => ({ data, periodos: null }))), null)
  assert.equal(H.modoDeDias([]), null)
  assert.equal(H.modoDeDias(todosIguais([['10:00', '22:00']])), 'todos')
  assert.equal(H.modoDeDias(todosIguais([])), 'todos')

  let dias = todosIguais([['10:00', '22:00']])
  dias = H.aplicar(dias, 'sab', [['12:00', '20:00']])
  dias = H.aplicar(dias, 'dom', [])
  assert.equal(H.modoDeDias(dias), 'semana')
  assert.equal(H.podeAgrupar(dias), true)

  const diferente = H.aplicar(dias, '2026-11-05', [['09:00', '12:00']])
  assert.equal(H.modoDeDias(diferente), 'dias', 'quinta 5 diferente das outras segunda a sexta')
  assert.equal(H.podeAgrupar(diferente), false)

  const incompleto = H.aplicar(todosIguais([['10:00', '22:00']]), '2026-11-07', null)
  assert.equal(H.modoDeDias(incompleto), 'dias', 'um dia sem resposta não é "todos"')

  // Rascunho "por semana": um grupo respondido e os outros ainda em branco CONTINUA sendo "por semana" (o seletor não pode saltar
  // para dia a dia assim que a pessoa responde segunda a sexta).
  const so = H.aplicar(DATAS.map((data) => ({ data, periodos: null })), 'semana', [['10:00', '22:00']])
  assert.equal(H.modoDeDias(so), 'semana')
  assert.equal(H.podeAgrupar(so), true)
  assert.equal(H.modoDeDias(H.aplicar(so, 'sab', [['12:00', '20:00']])), 'semana')
  // mas respondido só em parte DENTRO de um grupo é dia a dia
  assert.equal(H.modoDeDias(H.aplicar(DATAS.map((data) => ({ data, periodos: null })), '2026-11-05', [['10:00', '22:00']])), 'dias')
  // e o resumo não inventa "Sábado, não abre" para o grupo ainda sem resposta
  assert.deepEqual(H.resumoDias(so), ['Segunda a sexta, das 10h às 22h'])
})

test('aplicar: grupo, dia e todos; copia, não divide referência', () => {
  const base = DATAS.map((data) => ({ data, periodos: null }))
  const feito = H.aplicar(base, 'semana', [['10:00', '22:00']])
  assert.deepEqual(feito.filter((d) => d.periodos).map((d) => d.data), ['2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'])
  assert.ok(base.every((d) => d.periodos === null), 'não muda o original')
  feito[0].periodos[0][0] = '11:00'
  assert.equal(feito[1].periodos[0][0], '10:00', 'cada dia tem a própria cópia')
  assert.deepEqual(H.aplicar(base, '2026-11-07', [])[2].periodos, [])
  assert.ok(H.aplicar(base, 'todos', [['10:00', '12:00']]).every((d) => d.periodos.length === 1))
})

test('trocar para "igual todos os dias": o primeiro dia respondido vale para todos; os outros modos mantêm', () => {
  let dias = DATAS.map((data) => ({ data, periodos: null }))
  dias = H.aplicar(dias, 'sab', [['12:00', '20:00']])
  const todos = H.trocarModo(dias, 'todos')
  assert.ok(todos.every((d) => IGUAL(d.periodos, [['12:00', '20:00']])))
  assert.equal(H.trocarModo(dias, 'semana'), dias)
  assert.equal(H.trocarModo(dias, 'dias'), dias)
  assert.ok(H.trocarModo(DATAS.map((data) => ({ data, periodos: null })), 'todos').every((d) => d.periodos === null))
})

function IGUAL(a, b) { return JSON.stringify(a) === JSON.stringify(b) }

test('linhas editáveis de cada modo e o que falta responder', () => {
  const dias = H.aplicar(DATAS.map((data) => ({ data, periodos: null })), 'semana', [['10:00', '22:00']])
  assert.deepEqual(H.linhasDoModo(dias, 'todos').map((l) => l.rotulo), ['Todos os dias'])
  assert.deepEqual(H.linhasDoModo(dias, 'semana').map((l) => l.rotulo), ['Segunda a sexta', 'Sábado', 'Domingo'])
  assert.equal(H.linhasDoModo(dias, 'dias').length, 11)
  assert.equal(H.linhasDoModo(dias, 'dias')[0].rotulo, 'Qui 5/11')
  assert.deepEqual(H.rotulosFaltando(dias, 'semana'), ['Sábado', 'Domingo'])
  assert.deepEqual(H.rotulosFaltando(H.aplicar(dias, 'sab', []), 'semana'), ['Domingo'])
  assert.equal(H.rotulosFaltando(H.aplicar(H.aplicar(dias, 'sab', []), 'dom', []), 'semana').length, 0)
  assert.deepEqual(H.linhasDoModo(dias, null), [])
})

test('resumo: todos iguais, por semana e dia a dia (só dias seguidos se juntam)', () => {
  assert.deepEqual(H.resumoDias(todosIguais([['10:00', '22:00']])), ['Todos os dias, das 10h às 22h'])
  assert.deepEqual(H.resumoDias(todosIguais([['10:00', '14:00'], ['18:00', '24:00']])), ['Todos os dias, das 10h às 14h e das 18h à meia-noite'])

  let semana = todosIguais([['10:00', '22:00']])
  semana = H.aplicar(semana, 'sab', [['12:00', '20:00']])
  semana = H.aplicar(semana, 'dom', [['12:00', '20:00']])
  assert.deepEqual(H.resumoDias(semana), ['Segunda a sexta, das 10h às 22h', 'Sábado e domingo, das 12h às 20h'])
  assert.deepEqual(H.resumoDias(H.aplicar(semana, 'dom', [])), ['Segunda a sexta, das 10h às 22h', 'Sábado, das 12h às 20h', 'Domingo, não abre'])
  assert.deepEqual(H.resumoDias(H.aplicar(H.aplicar(semana, 'sab', [['10:00', '22:00']]), 'dom', [])),
    ['Segunda a sábado, das 10h às 22h', 'Domingo, não abre'])

  const dias = H.aplicar(H.aplicar(todosIguais([['10:00', '22:00']]), '2026-11-05', [['15:00', '23:00']]), '2026-11-09', [])
  assert.deepEqual(H.resumoDias(dias), [
    'Qui 5/11: das 15h às 23h',
    'Sex 6 a Dom 8/11: das 10h às 22h',
    'Seg 9/11: não abre',
    'Ter 10 a Dom 15/11: das 10h às 22h',
  ])
  // um dia solto no meio não junta os que estão antes e depois
  const furo = H.aplicar(todosIguais([['10:00', '22:00']]), '2026-11-07', [])
  assert.deepEqual(H.resumoDias(furo), ['Qui 5 a Sex 6/11: das 10h às 22h', 'Sáb 7/11: não abre', 'Dom 8 a Dom 15/11: das 10h às 22h'])
  assert.deepEqual(H.resumoDias(DATAS.map((data) => ({ data, periodos: null }))), [])
  assert.equal(H.textoResumo(semana), 'Segunda a sexta, das 10h às 22h · Sábado e domingo, das 12h às 20h')
})

test('resumo de linhas do banco: texto pronto para leitura', () => {
  const linhas = DATAS.map((data) => ({ data, abre: '11:00', fecha: '19:00' }))
  assert.equal(H.resumoDeLinhas(linhas, DATAS), 'Todos os dias, das 11h às 19h')
  assert.equal(H.resumoDeLinhas([], DATAS), 'Não informado')
  assert.equal(H.resumoDeLinhas([], DATAS, ''), '')
})

test('linhas canônicas: chaves em outra ordem, HH:MM:SS e lixo não contam como mudança', () => {
  const a = [{ data: '2026-11-06', abre: '10:00', fecha: '22:00' }, { data: '2026-11-05', abre: '18:00', fecha: '24:00' }, { data: '2026-11-05', abre: '10:00', fecha: '14:00' }]
  const b = [
    { fecha: '14:00:00', abre: '10:00:00', data: '2026-11-05' },
    { fecha: '24:00', data: '2026-11-05', abre: '18:00' },
    { abre: '10:00', data: '2026-11-06', fecha: '22:00', observacao: 'x' },
    { data: '2026-11-07', abre: '', fecha: '' },
    null,
  ]
  assert.deepEqual(H.linhasCanonicas(a)[0], { data: '2026-11-05', abre: '10:00', fecha: '14:00' })
  assert.ok(H.mesmasLinhas(a, b))
  assert.ok(!H.mesmasLinhas(a, a.slice(1)))
  assert.ok(H.mesmasLinhas([], undefined))
  assert.ok(H.mesmasLinhas(null, [{ data: '2026-11-05', abre: '', fecha: '' }]), 'linha sem horas não é horário')
})

test('estado do rascunho: completo, faltando e "nenhum dia abre"', () => {
  const vazio = DATAS.map((data) => ({ data, periodos: null }))
  assert.deepEqual(H.estadoDoHorario(vazio, null), { completo: false, faltando: [], semDiaAberto: false })
  const semana = H.aplicar(H.aplicar(todosIguais([['10:00', '22:00']]), 'sab', null), 'dom', [['', '']])
  assert.deepEqual(H.estadoDoHorario(semana, 'semana'), { completo: false, faltando: ['Sábado', 'Domingo'], semDiaAberto: false })
  const fechado = todosIguais([])
  assert.deepEqual(H.estadoDoHorario(fechado, 'todos'), { completo: false, faltando: [], semDiaAberto: true })
  assert.deepEqual(H.estadoDoHorario(todosIguais([['10:00', '22:00']]), 'todos'), { completo: true, faltando: [], semDiaAberto: false })
})

test('ações de uma linha: abrir, fechar, intervalo e troca de hora', () => {
  assert.deepEqual(H.abrirDia(null), [['', '']])
  assert.deepEqual(H.abrirDia([]), [['', '']])
  assert.deepEqual(H.abrirDia([['10:00', '22:00']]), [['10:00', '22:00']], 'já aberto: não perde as horas')
  assert.deepEqual(H.fecharDia(), [])

  assert.ok(!H.podeAcrescentarIntervalo([['', '']]), 'primeiro período incompleto')
  assert.ok(!H.podeAcrescentarIntervalo([['10:00', '22:00'], ['', '']]), 'no máximo dois')
  assert.ok(H.podeAcrescentarIntervalo([['10:00', '22:00']]))
  assert.ok(!H.podeAcrescentarIntervalo([['10:00', '24:00']]), 'fechou à meia-noite: não sobra hora para o 2º período abrir')
  assert.deepEqual(H.acrescentarIntervalo([['10:00', '22:00']]), [['10:00', '22:00'], ['', '']])
  assert.deepEqual(H.acrescentarIntervalo([['', '']]), [['', '']])
  assert.deepEqual(H.tirarIntervalo([['10:00', '14:00'], ['18:00', '22:00']]), [['10:00', '14:00']])

  assert.deepEqual(H.trocarHora([['', '']], 0, 0, '10:00'), [['10:00', '']])
  assert.deepEqual(H.trocarHora([['10:00', '22:00']], 0, 1, '23:30'), [['10:00', '23:30']])
  assert.deepEqual(H.trocarHora([['10:00', '12:00']], 0, 0, '12:30'), [['12:30', '']], 'início passou do fim: o fim volta a "sem escolha"')
  assert.deepEqual(H.trocarHora([['10:00', '14:00'], ['18:00', '22:00']], 0, 1, '19:00'), [['10:00', '19:00'], ['', '']], 'invadiu o 2º período')
  assert.deepEqual(H.trocarHora([['10:00', '14:00'], ['18:00', '22:00']], 0, 1, '15:00'), [['10:00', '15:00'], ['18:00', '22:00']])

  const p = [['10:00', '14:00'], ['', '']]
  assert.equal(H.opcoesAbre(p, 0)[0], '05:00')
  assert.equal(H.opcoesAbre(p, 1)[0], '14:00', 'o 2º período começa a partir do fim do 1º')
  assert.equal(H.opcoesFecha(p, 0)[0], '10:30')
  assert.equal(H.opcoesFecha([['', '']], 0)[0], '05:30')
  assert.equal(H.opcoesFecha(p, 0).at(-1), '24:00')
})

test('período do festival em palavras', () => {
  assert.equal(H.periodoDoFestivalTexto(DATAS), 'de 5 a 15 de novembro')
  assert.equal(H.periodoDoFestivalTexto(H.datasDoFestival('2026-10-30', '2026-11-02')), 'de 30 de outubro a 2 de novembro')
  assert.equal(H.periodoDoFestivalTexto(['2026-11-05']), 'em 5 de novembro')
  assert.equal(H.periodoDoFestivalTexto([]), '')
})

test('frases do horário gravado: com as datas da edição, o resumo completo; sem elas, dia a dia e sem afirmar o resto', () => {
  const l = (data, abre, fecha) => ({ data, abre, fecha })
  const todos = DATAS.map((d) => l(d, '10:00', '22:00'))
  assert.deepEqual(H.frasesDeLinhas(todos, DATAS), ['Todos os dias, das 10h às 22h'])
  // sem as datas do festival (o Social media não lê a edição) nunca diz "todos os dias": só do primeiro ao último dia citado
  assert.deepEqual(H.frasesDeLinhas(todos, []), ['Qui 5 a Dom 15/11: das 10h às 22h'])
  assert.deepEqual(H.frasesDeLinhas(todos), ['Qui 5 a Dom 15/11: das 10h às 22h'])
  assert.deepEqual(H.frasesDeLinhas([], DATAS), [])
  assert.deepEqual(H.frasesDeLinhas(null, DATAS), [])
  // linhas que não cabem nas datas dadas não viram "não abre" em todos os dias
  assert.deepEqual(H.frasesDeLinhas(todos, H.datasDoFestival('2027-01-01', '2027-01-05')), ['Qui 5 a Dom 15/11: das 10h às 22h'])
  // domingo fechado, com as datas: por semana; sem elas, o fim da lista fica sem menção (não foi dito)
  const semDomingo = DATAS.filter((d) => H.diaDaSemana(d) !== 6).map((d) => l(d, '10:00', '22:00'))
  assert.deepEqual(H.frasesDeLinhas(semDomingo, DATAS), ['Segunda a sábado, das 10h às 22h', 'Domingo, não abre'])
  assert.equal(H.frasesDeLinhas(semDomingo, []).join(' | '), 'Qui 5 a Sáb 7/11: das 10h às 22h | Dom 8/11: não abre | Seg 9 a Sáb 14/11: das 10h às 22h')
  // "Não informado" só quando de fato não há linha — e não quando faltam as datas
  assert.equal(H.resumoDeLinhas(todos, []), 'Qui 5 a Dom 15/11: das 10h às 22h')
  assert.equal(H.resumoDeLinhas([], []), 'Não informado')
  // data ilegível nunca derruba a leitura (grupo nenhum)
  assert.equal(H.grupoDaData(''), '')
  assert.doesNotThrow(() => H.modoDeDias([{ data: '', periodos: null }, { data: '2026-11-05', periodos: [['10:00', '22:00']] }]))
  assert.deepEqual(H.resumoDiaADia([{ data: '2026-11-05', periodos: [['10:00', '12:00']] }, { data: '2026-11-06', periodos: null }, { data: '2026-11-07', periodos: [] }]),
    ['Qui 5/11: das 10h às 12h', 'Sáb 7/11: não abre'])
})

test('arranjo que vale (o que o seletor desenha): responder o 1º grupo não salta para dia a dia', () => {
  const vazio = DATAS.map((data) => ({ data, periodos: null }))
  assert.equal(H.modoQueVale(null, vazio), null)
  assert.equal(H.modoQueVale('semana', vazio), 'semana', 'nada respondido: vale a escolha')
  assert.equal(H.modoQueVale('todos', vazio), 'todos')
  // escolher "Muda conforme o dia", responder segunda a sexta (sábado e domingo em branco) → continua por semana
  const semana = H.aplicar(vazio, 'semana', [['10:00', '22:00']])
  assert.equal(H.modoQueVale('semana', semana), 'semana')
  assert.deepEqual(H.estadoDoHorario(semana, 'semana').faltando, ['Sábado', 'Domingo'])
  assert.equal(H.modoQueVale('semana', H.aplicar(H.aplicar(semana, 'sab', [['12:00', '20:00']]), 'dom', [])), 'semana')
  // veio de fora um horário que não cabe no arranjo escolhido: o desenho acompanha
  assert.equal(H.modoQueVale('semana', H.aplicar(semana, '2026-11-05', [['09:00', '12:00']])), 'dias')
  assert.equal(H.modoQueVale('todos', H.aplicar(H.aplicar(vazio, 'todos', [['10:00', '22:00']]), 'sab', [])), 'semana')
  assert.equal(H.modoQueVale('dias', semana), 'dias', 'quem pediu dia a dia fica em dia a dia')
})
