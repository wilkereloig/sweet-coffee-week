// Horário no festival na página /preencher (23/10/2026, pedido do Wilker): UMA pergunta por unidade — como ela funciona em cada
// dia do festival. Sem "horário da loja" × "horário do combo".
//
// A página é estática (sem import, sem build), então carrega uma CÓPIA do modelo de src/edicao/dados/horarioFestival.js. Este teste:
//   1. roda a cópia em node:vm e compara com o módulo oficial (entradas fixas + passeios aleatórios): as duas não podem divergir;
//   2. roda o SELETOR da página (o mesmo texto do HTML) num DOM falso mínimo e conversa com ele como a pessoa faria;
//   3. confere o que a página manda no envio, o que ela pergunta e o que o site público mostra.
// Sem navegador: o que só um navegador mostra (layout, foco no celular, picker nativo) está dito no relatório do lote.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import * as H from '../src/edicao/dados/horarioFestival.js'
import * as M from '../src/edicao/dados/modelo.js'

const esbuild = createRequire(import.meta.url)('esbuild')
const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const PAGINA = ler('public/preencher/index.html')
const SCRIPT = [...PAGINA.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])[0]
const SQL_FORM = ler('supabase/migrations/20261107_horario_festival_formulario.sql')

/** Do marcador `ini` até o fim do marcador `fim` (inclusive). */
function trecho(texto, ini, fim) {
  const a = texto.indexOf(ini)
  const b = texto.indexOf(fim, a)
  assert.ok(a > -1 && b > a, 'marcador não encontrado: ' + ini)
  return texto.slice(a, b + fim.length)
}
const BLOCO = trecho(SCRIPT, '/* ── horarioFestival (cópia de src/edicao/dados/horarioFestival.js) ── */', '/* ── fim horarioFestival ── */')
const SELETOR = trecho(SCRIPT, '/* ── Seletor do horário no festival', '/* ── fim seletor ── */')
const FN_EL = SCRIPT.match(/ {2}function el\(tag, attrs, texto\) \{[\s\S]*?\n {2}\}\n/)[0]
const FN_TXT = SCRIPT.match(/ {2}function txt\(v\) \{[^\n]*\}\n/)[0]

const DATAS = H.datasDoFestival('2026-11-05', '2026-11-15')
const fresco = (x) => JSON.parse(JSON.stringify(x))
const norm = (v) => JSON.stringify(v === undefined ? '__undefined__' : v)

/* ══ 1 · A página só tem UMA pergunta de horário ═════════════════════════════════════════════════════════ */

test('página: uma pergunta só — sem "horário da loja", sem "o combo é o mesmo?", sem texto livre', () => {
  const modelo = trecho(PAGINA, '<template id="tpl-loja">', '</template>')
  assert.equal([...modelo.matchAll(/data-horario/g)].length, 1, 'uma pergunta de horário por loja')
  assert.match(modelo, /data-pergunta="horario_festival"/)
  assert.doesNotMatch(PAGINA, /horario_loja|data-loja-igual|loja_igual|loja-igual|data-max=|<input type="hidden" data-k="horario/)
  assert.doesNotMatch(PAGINA, /A loja abre nesses mesmos|Dias e horário de funcionamento da loja|Dias e horário em que o combo/)
  // horario_combo só é LIDO, para a nota "Hoje está: …" — nunca vira campo, nem vai no envio
  const usos = [...SCRIPT.matchAll(/horario_combo/g)].length
  const dentro = (trecho(SCRIPT, 'function textoAntigoDoHorario(u) {', '\n  }\n').match(/horario_combo/g) || []).length
  assert.ok(usos > 0 && usos === dentro, 'horario_combo só dentro de textoAntigoDoHorario')
})

test('página: o envio manda horario_festival (dia a dia) só quando está completo; nada de texto nem de horário da loja', () => {
  const coletar = trecho(SCRIPT, 'function coletar(paraRascunho) {', '\n  function temDelivery')
  assert.match(coletar, /var linhasH = hf \? hf\.linhas\(\) : null;\s*if \(linhasH\) x\.horario_festival = linhasH;/)
  assert.doesNotMatch(coletar, /horario_loja|horario_combo|loja-igual/)
  // o arranjo e as horas do seletor (mesmo incompletos) só vão no RASCUNHO deste aparelho; o envio chama coletar() sem o aviso
  assert.match(coletar, /if \(paraRascunho && hf\) \{ var estadoH = hf\.estado\(\); if \(estadoH\) x\.horario_rascunho = estadoH; \}/)
  assert.match(SCRIPT, /JSON\.stringify\(\{ em: Date\.now\(\), dados: coletar\(true\) \}\)/)
  assert.match(SCRIPT, /rpc\('preenchimento_enviar', \{ p_codigo: codigo, p_dados: coletar\(\) \}\)/)
  assert.equal([...SCRIPT.matchAll(/coletar\(/g)].length, 3, 'só a definição, o rascunho e o envio: nenhum outro lugar chama coletar')
  // incompleto bloqueia o envio, com o que falta e o foco no ponto certo
  const faltas = trecho(SCRIPT, 'function faltas(pintar) {', '// Contador ao vivo')
  assert.match(faltas, /if \(hf\.horario && !hf\.horario\.completo\(\)\) \{/)
  // o alvo é uma função: o seletor refaz as linhas ao trocar Igual/Muda/Detalhar, então o controle é achado NO CLIQUE, não no envio
  assert.match(faltas, /texto: rot \+ 'horário no festival \(' \+ hf\.horario\.motivo\(\) \+ '\)', alvo: function \(\) \{ return hf\.horario\.alvo\(\); \}/)
  const lista = trecho(SCRIPT, 'function mostrarFaltas(lista, mensagem) {', '\n  var ERROS')
  assert.match(lista, /var alvo = typeof f\.alvo === 'function' \? f\.alvo\(\) : f\.alvo;\s*var det = alvo\.closest\('details'\);/)
  assert.doesNotMatch(lista, /f\.alvo\.(focus|closest|scrollIntoView)/)
  assert.doesNotMatch(faltas, /horario_loja|horario_combo|loja-igual/)
  // o banco aplica exatamente esse campo
  assert.match(SQL_FORM, /jsonb_typeof\(un -> 'horario_festival'\) = 'array'/)
})

test('página: as datas do festival vêm do cadastro da edição, nunca escritas no código', () => {
  assert.doesNotMatch(SCRIPT, /\b20\d\d-\d\d-\d\d\b/, 'nenhuma data ISO escrita à mão')
  assert.match(SCRIPT, /var ed = \(info && info\.edicao\) \|\| \{\};\s*datasEdicao = datasDoFestival\(txt\(ed\.inicio\)\.slice\(0, 10\), txt\(ed\.fim\)\.slice\(0, 10\)\);/)
  assert.match(SCRIPT, /datas: datasFestival\(\)/)
})

test('página: a recusa do servidor usa a mesma mensagem do painel', () => {
  assert.match(SCRIPT, /horario_invalido: 'Confira os horários: o fim tem que ser depois do início e os períodos do mesmo dia não podem se sobrepor\.'/)
  assert.match(SCRIPT, /data_fora_do_festival: 'Esse dia não está no festival\.'/)
  assert.match(SCRIPT, /ERROS\[e\.message\]/, 'a mesma tela de recusa que os outros erros')
})

test('página: retomada — o que está gravado entra no seletor e o texto antigo só vira a nota', () => {
  const loja = trecho(SCRIPT, 'function adicionarLoja(u) {', '\n  // O texto livre que a marca mandou antes')
  assert.match(loja, /no\.querySelector\('\[data-horario\]'\)\.horarioInicial = \{\s*linhas: u && Array\.isArray\(u\.horario_festival\) \? u\.horario_festival : \[\],\s*antigo: textoAntigoDoHorario\(u\),\s*rascunho: u && u\.horario_rascunho[^\n]*\n\s*\};/)
  assert.match(SCRIPT, /preencher\(rascunho \? rascunho\.dados : \(info\.pendente \|\| info\.dados \|\| \{\}\)\)/, 'rascunho > envio aguardando > cadastro, como sempre')
  assert.match(SCRIPT, /linhas: ini\.linhas, antigo: ini\.antigo, rascunho: ini\.rascunho, avisar: reavaliar/)
})

/* ══ 2 · A cópia do modelo é igual ao módulo oficial ═════════════════════════════════════════════════════ */

const copia = vm.createContext({})
vm.runInContext("'use strict';\n" + BLOCO, copia)
const NOMES_COPIADOS = [...BLOCO.matchAll(/^ {2}(?:function|var) ([A-Za-z_]\w*)/gm)].map((m) => m[1])

/** Roda `f(lib)` na cópia e no módulo oficial e exige a MESMA resposta (inclusive o mesmo tipo de erro). */
function iguais(rotulo, f) {
  const r = (lib) => { try { return norm(f(lib)) } catch (e) { return 'ERRO:' + e.name } }
  assert.equal(r(copia), r(H), rotulo)
}

test('cópia: tem tudo o que a página usa e cada nome existe no módulo oficial', () => {
  const minimo = ['normalizarHora', 'horaTexto', 'periodoTexto', 'periodosTexto', 'diaDaSemana', 'datasDoFestival', 'rotuloDia', 'grupoDaData',
    'diasDeLinhas', 'linhasDeDias', 'periodoValido', 'diaCompleto', 'horarioCompleto', 'modoDeDias', 'podeAgrupar', 'aplicar', 'trocarModo',
    'linhasDoModo', 'rotulosFaltando', 'resumoDias', 'textoResumo', 'estadoDoHorario', 'abrirDia', 'fecharDia', 'podeAcrescentarIntervalo',
    'acrescentarIntervalo', 'tirarIntervalo', 'trocarHora', 'opcoesAbre', 'opcoesFecha', 'periodoDoFestivalTexto']
  for (const n of minimo) {
    assert.ok(NOMES_COPIADOS.includes(n), 'a cópia não declara ' + n)
    assert.equal(typeof copia[n], 'function', n)
    assert.equal(typeof H[n], 'function', 'o módulo oficial perdeu ' + n)
  }
  // helpers só da página (não existem no módulo) e as constantes
  const soDaPagina = new Set(['doisDigitos', 'ordenarPeriodos', 'partes', 'IGUAL', 'chaveDia', 'textoDoDia', 'diasEntre', 'rotuloIntervalo',
    'NOMES_CURTOS', 'MESES_LONGOS'])
  for (const n of NOMES_COPIADOS) {
    if (soDaPagina.has(n)) continue
    assert.ok(n in H, n + ' foi copiado mas não existe no módulo oficial (renomeou? tirou?)')
  }
})

test('cópia: constantes e textos de hora iguais ao módulo', () => {
  assert.equal(norm(copia.HORAS_ABRE), norm(H.HORAS_ABRE))
  assert.equal(norm(copia.HORAS_FECHA), norm(H.HORAS_FECHA))
  assert.equal(norm(copia.GRUPOS), norm(H.GRUPOS))
  assert.equal(copia.MAX_PERIODOS_POR_DIA, H.MAX_PERIODOS_POR_DIA)
  const horas = ['10:00', '9:05', '09:05:00', '9:05:00.123', '24:00', '00:00', '23:59', 'abc', '', null, undefined, ' 7:30 ', '10', '10:5', '25:00', '1:00:00', 1000, '12:60', '05:00', '23:30']
  for (const h of horas) {
    iguais('normalizarHora ' + h, (L) => L.normalizarHora(h))
    iguais('horaTexto ' + h, (L) => L.horaTexto(h))
  }
  const pares = [['10:00', '22:00'], ['18:00', '24:00'], ['09:30', '10:00'], ['', '10:00'], ['10:00', ''], null, undefined, [], ['10:00'], ['00:00', '24:00'], ['abc', 'def']]
  for (const p of pares) iguais('periodoTexto ' + norm(p), (L) => L.periodoTexto(p))
  for (const ps of [[], null, undefined, [['10:00', '14:00'], ['18:00', '22:00']], [['10:00', '14:00'], ['', '']], [['18:00', '24:00']]]) {
    iguais('periodosTexto ' + norm(ps), (L) => L.periodosTexto(ps))
  }
})

test('cópia: datas, dia da semana, rótulos e o período em palavras', () => {
  const datas = H.datasDoFestival('2026-10-25', '2026-12-05').concat(['2024-02-29', '2026-02-28', '2026-12-31', '2027-01-01'])
  for (const d of datas) {
    iguais('diaDaSemana ' + d, (L) => L.diaDaSemana(d))
    iguais('rotuloDia ' + d, (L) => L.rotuloDia(d))
    iguais('grupoDaData ' + d, (L) => L.grupoDaData(d))
  }
  const pontas = [['2026-11-05', '2026-11-15'], ['2026-11-05', '2026-11-05'], ['2026-11-15', '2026-11-05'], ['', ''], [undefined, undefined], [null, '2026-11-05'],
    ['2026-01-01', '2026-12-31'], ['2026-10-30', '2026-11-02'], ['2026-11', '2026-12'], ['abc', 'def'], ['2026-11-05T00:00:00', '2026-11-15'], ['2026-12-28', '2027-01-03']]
  for (const [a, b] of pontas) {
    iguais('datasDoFestival ' + a + '→' + b, (L) => L.datasDoFestival(a, b))
    iguais('periodoDoFestivalTexto ' + a + '→' + b, (L) => L.periodoDoFestivalTexto(L.datasDoFestival(a, b)))
  }
  for (const l of [[], null, undefined, ['2026-11-05'], ['2026-11-05', '2026-11-15'], ['2026-10-30', '2026-11-02'], ['2026-12-31', '2027-01-02']]) {
    iguais('periodoDoFestivalTexto ' + norm(l), (L) => L.periodoDoFestivalTexto(l))
  }
  assert.equal(copia.periodoDoFestivalTexto(DATAS), 'de 5 a 15 de novembro')
  // data ilegível: grupo nenhum, nunca erro (o módulo mudou de "lança" para "devolve vazio")
  for (const ruim of ['', 'lixo', undefined, null, '2026-13-45', '2026-11']) iguais('grupoDaData ilegível ' + ruim, (L) => L.grupoDaData(ruim))
  assert.equal(copia.grupoDaData(''), '')
  assert.equal(H.grupoDaData(''), '')
})

// Estados do horário (dias = [{ data, periodos }]) para comparar. Os fixos cobrem os casos de borda; os aleatórios, o resto.
const todosIguais = (periodos, datas = DATAS) => datas.map((data) => ({ data, periodos: periodos.map((p) => [...p]) }))
const ESTADOS_FIXOS = [
  ['vazio', []],
  ['ninguém respondeu', DATAS.map((data) => ({ data, periodos: null }))],
  ['todos 10–22', todosIguais([['10:00', '22:00']])],
  ['todos fechado', todosIguais([])],
  ['dois períodos e meia-noite', todosIguais([['10:00', '14:00'], ['18:00', '24:00']])],
  ['semana: sábado diferente e domingo fechado', H.aplicar(H.aplicar(todosIguais([['10:00', '22:00']]), 'sab', [['12:00', '20:00']]), 'dom', [])],
  ['semana: sábado e domingo iguais', H.aplicar(H.aplicar(todosIguais([['10:00', '22:00']]), 'sab', [['12:00', '20:00']]), 'dom', [['12:00', '20:00']])],
  ['semana: sábado igual à semana', H.aplicar(todosIguais([['10:00', '22:00']]), 'dom', [])],
  ['dias: quinta diferente', H.aplicar(todosIguais([['10:00', '22:00']]), '2026-11-05', [['09:00', '12:00']])],
  ['dias: furo no sábado', H.aplicar(todosIguais([['10:00', '22:00']]), '2026-11-07', [])],
  ['dias: um dia sem resposta', H.aplicar(todosIguais([['10:00', '22:00']]), '2026-11-07', null)],
  ['rascunho por semana: só segunda a sexta respondida', H.aplicar(DATAS.map((data) => ({ data, periodos: null })), 'semana', [['10:00', '22:00']])],
  ['rascunho por semana: semana e sábado respondidos', H.aplicar(H.aplicar(DATAS.map((data) => ({ data, periodos: null })), 'semana', [['10:00', '22:00']]), 'sab', [['12:00', '20:00']])],
  ['rascunho dia a dia: só a quinta respondida', H.aplicar(DATAS.map((data) => ({ data, periodos: null })), '2026-11-05', [['10:00', '22:00']])],
  ['incompleto: sem horas', todosIguais([['', '']])],
  ['incompleto: sem fim', todosIguais([['10:00', '']])],
  ['inválido: fim antes do início', todosIguais([['22:00', '10:00']])],
  ['inválido: sobrepostos', todosIguais([['10:00', '14:00'], ['13:00', '18:00']])],
  ['inválido: três períodos', todosIguais([['08:00', '10:00'], ['11:00', '13:00'], ['14:00', '16:00']])],
  ['períodos fora de ordem', todosIguais([['18:00', '22:00'], ['10:00', '14:00']])],
  ['hora fora da grade', todosIguais([['10:15', '12:00']])],
  ['HH:MM:SS', todosIguais([['10:00:00', '22:00:00']])],
  ['outro festival', todosIguais([['10:00', '12:00']], H.datasDoFestival('2026-10-30', '2026-11-02'))],
  ['um dia só', todosIguais([['10:00', '12:00']], ['2026-11-05'])],
]

function comparaEstado(rotulo, dias) {
  const f = (nome, fn) => iguais(rotulo + ' · ' + nome, (L) => fn(L, fresco(dias)))
  f('modoDeDias', (L, d) => L.modoDeDias(d))
  f('podeAgrupar', (L, d) => L.podeAgrupar(d))
  f('horarioCompleto', (L, d) => L.horarioCompleto(d))
  f('linhasDeDias', (L, d) => L.linhasDeDias(d))
  f('resumoDias', (L, d) => L.resumoDias(d))
  f('resumoDiaADia', (L, d) => L.resumoDiaADia(d))
  f('textoResumo', (L, d) => [L.textoResumo(d), L.textoResumo(d, ' | ')])
  f('trocarModo', (L, d) => [L.trocarModo(d, 'todos'), L.trocarModo(d, 'semana'), L.trocarModo(d, 'dias')])
  f('diaCompleto por dia', (L, d) => d.map((x) => L.diaCompleto(x.periodos)))
  f('aplicar', (L, d) => [L.aplicar(d, 'todos', [['10:00', '12:00']]), L.aplicar(d, 'sab', []), L.aplicar(d, 'dom', null), L.aplicar(d, 'semana', [['09:00', '10:00'], ['11:00', '12:00']]),
    d.length ? L.aplicar(d, d[0].data, [['09:00', '10:00']]) : []])
  for (const modo of [null, 'todos', 'semana', 'dias']) {
    f('estadoDoHorario ' + modo, (L, d) => L.estadoDoHorario(d, modo))
    f('linhasDoModo ' + modo, (L, d) => L.linhasDoModo(d, modo))
    f('rotulosFaltando ' + modo, (L, d) => L.rotulosFaltando(d, modo))
  }
  // das linhas do banco para a tela e de volta
  f('diasDeLinhas∘linhasDeDias', (L, d) => L.diasDeLinhas(L.linhasDeDias(d), d.map((x) => x.data)))
}

test('cópia: estados fixos dão a mesma resposta em tudo', () => {
  for (const [nome, dias] of ESTADOS_FIXOS) comparaEstado(nome, dias)
})

test('cópia: linhas do banco (HH:MM:SS, fora do festival, lixo) viram o mesmo horário na tela', () => {
  const entradas = [
    [], null, undefined,
    [{ data: '2026-11-05', abre: '10:00:00', fecha: '22:00:00' }, { data: '2026-11-06', abre: '18:00', fecha: '22:00' }, { data: '2026-11-06', abre: '12:00', fecha: '15:00' }, { data: '2026-12-25', abre: '10:00', fecha: '12:00' }],
    [{ data: '2026-11-07', abre: '12:00', fecha: '16:00' }, { data: '2026-11-05', abre: '10:00', fecha: '18:00' }, null, { data: '2026-11-08', abre: '', fecha: '' }],
    DATAS.map((data) => ({ data, abre: '11:00', fecha: '19:00', observacao: 'x' })),
    DATAS.map((data) => ({ data, abre: '10:00', fecha: '24:00' })),
  ]
  for (const linhas of entradas) {
    iguais('diasDeLinhas ' + norm(linhas), (L) => L.diasDeLinhas(linhas, DATAS))
    iguais('diasDeLinhas sem datas ' + norm(linhas), (L) => L.diasDeLinhas(linhas, undefined))
    iguais('linhasDeDias∘diasDeLinhas ' + norm(linhas), (L) => L.linhasDeDias(L.diasDeLinhas(linhas, DATAS)))
    iguais('resumo ' + norm(linhas), (L) => L.textoResumo(L.diasDeLinhas(linhas, DATAS)))
  }
})

/** Gerador pseudoaleatório fixo (mulberry32): o teste é sempre o mesmo e reproduzível. */
function sorteio(semente) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const GRADE = H.HORAS_ABRE.concat(['24:00'])
function periodosSorteados(r) {
  const sorte = r()
  if (sorte < 0.08) return null
  if (sorte < 0.2) return []
  if (sorte < 0.3) return [['', '']]
  if (sorte < 0.36) return [[GRADE[Math.floor(r() * GRADE.length)], '']]
  if (sorte < 0.42) return [[GRADE[Math.floor(r() * GRADE.length)], GRADE[Math.floor(r() * GRADE.length)]]] // pode ser inválido
  const n = r() < 0.7 ? 1 : 2
  const pontos = Array.from({ length: n * 2 }, () => Math.floor(r() * GRADE.length)).sort((x, y) => x - y)
  const out = []
  for (let i = 0; i < n; i++) out.push([GRADE[pontos[i * 2]], GRADE[pontos[i * 2 + 1]]])
  return out
}

test('cópia: passeios aleatórios (aplicar / trocar modo) nunca divergem do módulo', () => {
  const alvos = ['todos', 'semana', 'sab', 'dom', ...DATAS]
  for (let semente = 1; semente <= 120; semente++) {
    const r = sorteio(semente)
    let dias = DATAS.map((data) => ({ data, periodos: null }))
    for (let passo = 0; passo < 14; passo++) {
      if (r() < 0.15) dias = H.trocarModo(dias, 'todos')
      else dias = H.aplicar(dias, alvos[Math.floor(r() * alvos.length)], periodosSorteados(r))
      comparaEstado('semente ' + semente + ' passo ' + passo, dias)
    }
  }
})

test('cópia: as ações de uma linha (abrir, fechar, intervalo, trocar hora, opções) dão a mesma resposta', () => {
  const listas = [null, undefined, [], [['', '']], [['10:00', '']], [['', '12:00']], [['10:00', '22:00']], [['10:00', '14:00'], ['', '']],
    [['10:00', '14:00'], ['18:00', '22:00']], [['10:00', '14:00'], ['13:00', '18:00']], [['10:00', '24:00']], [['23:30', '24:00']], [['05:00', '05:30']],
    [['10:00', '12:00'], ['12:00', '14:00']], [['10:00', '14:00'], ['16:00', '']]]
  const horas = ['', '05:00', '10:00', '12:30', '13:00', '14:00', '18:30', '23:30', '24:00']
  for (const l of listas) {
    iguais('abrirDia ' + norm(l), (L) => L.abrirDia(fresco(l)))
    iguais('podeAcrescentarIntervalo ' + norm(l), (L) => L.podeAcrescentarIntervalo(fresco(l)))
    iguais('acrescentarIntervalo ' + norm(l), (L) => L.acrescentarIntervalo(fresco(l)))
    iguais('tirarIntervalo ' + norm(l), (L) => L.tirarIntervalo(fresco(l)))
    iguais('periodoValido ' + norm(l), (L) => (l || []).map((p) => L.periodoValido(p)))
    iguais('diaCompleto ' + norm(l), (L) => L.diaCompleto(fresco(l)))
    for (const i of [0, 1, 2]) {
      iguais('opcoesAbre ' + norm(l) + i, (L) => L.opcoesAbre(fresco(l), i))
      iguais('opcoesFecha ' + norm(l) + i, (L) => L.opcoesFecha(fresco(l), i))
      for (const qual of [0, 1]) for (const h of horas) iguais('trocarHora ' + norm(l) + i + qual + h, (L) => L.trocarHora(fresco(l), i, qual, h))
    }
  }
  iguais('fecharDia', (L) => L.fecharDia())
})

/* ══ 3 · O seletor da página, num DOM falso mínimo ═══════════════════════════════════════════════════════ */

/** O pouco de DOM que o seletor usa. Rádio do mesmo nome se exclui (como no navegador) só por `escolher`. */
class No {
  constructor(tag) {
    this.tag = tag; this.attrs = {}; this.filhos = []; this.pai = null; this.ouvintes = {}
    this._classes = new Set(); this._texto = ''; this.checked = false; this._valor = undefined
  }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this._classes = new Set(String(v).split(/\s+/).filter(Boolean)) }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null }
  get name() { return this.attrs.name || '' }
  get type() { return this.attrs.type || '' }
  get classList() {
    const n = this
    return {
      add: (c) => n._classes.add(c),
      remove: (c) => n._classes.delete(c),
      contains: (c) => n._classes.has(c),
      toggle: (c, forca) => { const quer = forca === undefined ? !n._classes.has(c) : !!forca; if (quer) n._classes.add(c); else n._classes.delete(c); return quer },
    }
  }
  appendChild(f) { f.pai = this; this.filhos.push(f); return f }
  get textContent() { return this._texto + this.filhos.map((f) => f.textContent).join('') }
  set textContent(t) { this.filhos.forEach((f) => { f.pai = null }); this.filhos = []; this._texto = String(t); if (this.tag === 'select') this._valor = undefined }
  get value() {
    if (this.tag === 'select') return this._valor !== undefined ? this._valor : (this.filhos[0] ? this.filhos[0].attrs.value : '')
    return this.attrs.value || ''
  }
  set value(v) {
    if (this.tag === 'select') this._valor = this.filhos.some((o) => o.attrs.value === v) ? v : ''
    else this.attrs.value = String(v)
  }
  addEventListener(tipo, fn) { (this.ouvintes[tipo] = this.ouvintes[tipo] || []).push(fn) }
  dispatchEvent(ev) {
    let n = this
    while (n) { for (const fn of n.ouvintes[ev.type] || []) fn(ev); if (!ev.bubbles) break; n = n.pai }
  }
  focus() { No.foco = this }
}
No.foco = null

const todos = (n, pred, out = []) => { if (pred(n)) out.push(n); n.filhos.forEach((f) => todos(f, pred, out)); return out }
const oculto = (n) => { for (let x = n; x; x = x.pai) if (x._classes.has('oculto')) return true; return false }
const raizDe = (n) => { let x = n; while (x.pai) x = x.pai; return x }
const rotuloRadio = (raiz, texto) => {
  const lab = todos(raiz, (n) => n.tag === 'label' && n.textContent === texto)[0]
  assert.ok(lab, 'não achei a opção “' + texto + '”')
  return lab.filhos[0]
}
const opcaoDeModo = (raiz, texto) => { const lab = todos(raiz, (n) => n.tag === 'label' && n.textContent === texto)[0]; return lab && lab.filhos[0] } // sem datas não há opções
const botao = (raiz, texto) => todos(raiz, (n) => n.tag === 'button' && n.textContent === texto)[0]
const textoDe = (raiz, classe) => (todos(raiz, (n) => n._classes.has(classe))[0] || { textContent: undefined }).textContent

/** A pessoa toca num rádio / escolhe numa lista / toca num botão. */
function escolher(radio) {
  if (radio.checked) return
  todos(raizDe(radio), (n) => n.tag === 'input' && n.type === 'radio' && n.name === radio.name).forEach((o) => { o.checked = false })
  radio.checked = true
  radio.dispatchEvent({ type: 'change', bubbles: true })
}
function trocarLista(sel, valor) {
  assert.ok(sel.filhos.some((o) => o.attrs.value === valor), 'a lista não oferece ' + valor)
  sel.value = valor
  sel.dispatchEvent({ type: 'change', bubbles: true })
}
const tocar = (btn) => { assert.ok(btn && !oculto(btn), 'botão ausente ou escondido'); btn.dispatchEvent({ type: 'click', bubbles: true }) }
const opcoesDe = (sel) => sel.filhos.map((o) => ({ valor: o.attrs.value, texto: o.textContent }))

const ambiente = vm.createContext({ document: { createElement: (tag) => new No(tag) } })
vm.runInContext("'use strict';\n" + FN_EL + FN_TXT + BLOCO + SELETOR, ambiente)

/** Monta um seletor como a página faz (ctx.avisar conta quantas vezes a página foi avisada por botão). */
function seletor({ linhas = [], antigo = '', datas = DATAS, uid = 1, rascunho, loja } = {}) {
  const caixa = new No('div')
  const avisos = []
  const h = ambiente.montarHorario(caixa, { uid, datas, linhas, antigo, rascunho, avisar: () => avisos.push(1) })
  if (loja) h.rotular(loja)
  const linhasTela = () => todos(caixa, (n) => n._classes.has('hrow')).map((no) => ({
    no,
    nome: todos(no, (n) => n.tag === 'legend')[0].textContent,
    abre: rotuloRadio(no, 'Abre'),
    fecha: rotuloRadio(no, 'Não abre'),
    listas: todos(no, (n) => n.tag === 'select'),
    mais: botao(no, '+ Intervalo (ex.: fecha para o almoço)'),
    tirar: botao(no, 'Tirar este intervalo'),
  }))
  const resumo = () => todos(caixa, (n) => n._classes.has('hresumo'))[0]
  const aviso = () => todos(caixa, (n) => n._classes.has('haviso__texto'))[0]
  const desfazer = () => botao(caixa, 'Desfazer')
  const detalhar = () => todos(caixa, (n) => n._classes.has('hdetalhar'))[0]
  return {
    caixa, h, avisos, linhasTela, resumo, aviso, desfazer, detalhar,
    igual: opcaoDeModo(caixa, 'Igual todos os dias'),
    muda: opcaoDeModo(caixa, 'Muda conforme o dia'),
  }
}
// segunda a sexta 10–22, sábado 12–20, domingo fechado (sem linha); o banco devolve HH:MM:SS
const POR_SEMANA = DATAS.flatMap((data) => {
  const dia = H.diaDaSemana(data)
  return dia < 5 ? [{ data, abre: '10:00:00', fecha: '22:00:00' }] : dia === 5 ? [{ data, abre: '12:00', fecha: '20:00' }] : []
})
const grava = (h) => fresco(h.linhas())
const linhasDe = (datas, abre, fecha) => datas.map((data) => ({ data, abre, fecha }))
const valoresDe = (l) => l.listas.map((s) => s.value)

test('seletor: a pergunta, o apoio com as datas da edição e as duas opções — nenhuma marcada sem horário gravado', () => {
  const s = seletor()
  assert.equal(todos(s.caixa, (n) => n.tag === 'fieldset' && n._classes.has('hmodo')).length, 1)
  assert.equal(todos(s.caixa, (n) => n.tag === 'legend')[0].textContent, 'Como esta unidade funciona nos dias do festival?')
  assert.equal(textoDe(s.caixa, 'hapoio'), 'De 5 a 15 de novembro. Se for diferente do horário normal da loja, vale o do festival. Fecha depois da meia-noite? Escolha “meia-noite”.')
  assert.equal(s.igual.checked, false)
  assert.equal(s.muda.checked, false)
  assert.equal(s.linhasTela().length, 0, 'nenhuma linha até escolher')
  assert.ok(oculto(s.resumo()) && oculto(s.detalhar()))
  assert.equal(s.h.completo(), false)
  assert.equal(s.h.linhas(), null, 'sem resposta não grava nada')
  assert.equal(s.h.motivo(), 'escolha uma das opções')
  assert.equal(s.h.alvo(), s.igual, 'o foco vai para a primeira opção')
  assert.equal(s.caixa.attrs.role, undefined)
  // radios com nome próprio (dois seletores na mesma página não se misturam)
  assert.notEqual(seletor({ uid: 2 }).igual.name, s.igual.name)
  assert.equal(s.igual.name, s.muda.name)
})

test('seletor: "Igual todos os dias" → uma linha; Abre → Das … às …; tudo escolhido vira 11 linhas gravadas', () => {
  const s = seletor()
  escolher(s.igual)
  let [l, ...resto] = s.linhasTela()
  assert.equal(resto.length, 0)
  assert.equal(l.nome, 'Todos os dias')
  assert.equal(s.resumo().textContent, 'Falta responder: Todos os dias.')
  assert.ok(!oculto(s.resumo()))
  assert.ok(oculto(l.listas[0]), 'as horas só aparecem depois de "Abre"')

  escolher(l.abre)
  ;[l] = s.linhasTela()
  assert.ok(!oculto(l.listas[0]) && oculto(l.listas[2]), 'um período à vista, o segundo escondido')
  assert.deepEqual(valoresDe(l).slice(0, 2), ['', ''])
  assert.equal(s.h.motivo(), 'falta responder: Todos os dias')
  assert.equal(s.h.alvo(), l.listas[0], 'o foco vai para a primeira hora que falta')
  assert.ok(oculto(l.mais), '"+ Intervalo" só depois do primeiro período completo')

  trocarLista(l.listas[0], '10:00')
  assert.equal(l.listas[1].filhos[1].attrs.value, '10:30', 'o fim só oferece horas depois do início')
  assert.equal(s.h.alvo(), l.listas[1])
  trocarLista(l.listas[1], '22:00')
  assert.equal(s.resumo().textContent, 'Fica assim: Todos os dias, das 10h às 22h.')
  assert.equal(s.h.completo(), true)
  assert.deepEqual(grava(s.h), DATAS.map((data) => ({ data, abre: '10:00', fecha: '22:00' })))
  assert.equal(s.h.motivo(), '')
  assert.ok(!oculto(l.mais))
  assert.deepEqual(s.avisos, [], 'rádio e lista avisam a página pelo próprio change (que sobe até o formulário); só botão chama avisar')
})

test('seletor: as listas de hora — de meia em meia hora, o fim chega à meia-noite', () => {
  const s = seletor()
  escolher(s.igual)
  escolher(s.linhasTela()[0].abre)
  const [l] = s.linhasTela()
  const abre = opcoesDe(l.listas[0]), fecha = opcoesDe(l.listas[1])
  assert.deepEqual(abre[0], { valor: '', texto: '—' })
  assert.deepEqual(abre[1], { valor: '05:00', texto: '5h' })
  assert.deepEqual(abre[2], { valor: '05:30', texto: '5h30' })
  assert.deepEqual(abre.at(-1), { valor: '23:30', texto: '23h30' }, 'abrir à meia-noite não existe')
  assert.deepEqual(fecha[1], { valor: '05:30', texto: '5h30' })
  assert.deepEqual(fecha.at(-1), { valor: '24:00', texto: 'meia-noite' })
  assert.equal(abre.length, H.HORAS_ABRE.length + 1)
  assert.equal(fecha.length, H.HORAS_FECHA.length + 1)
  // nome acessível de cada lista
  assert.deepEqual(l.listas.slice(0, 2).map((x) => x.attrs['aria-label']), ['Todos os dias: abre às', 'Todos os dias: fecha às'])
})

test('seletor: intervalo (fecha para o almoço) — um segundo período que começa depois do primeiro; tirar volta ao primeiro', () => {
  const s = seletor({ linhas: linhasDe(DATAS, '10:00', '14:00') })
  let [l] = s.linhasTela()
  tocar(l.mais)
  ;[l] = s.linhasTela()
  assert.deepEqual(s.avisos, [1], 'botão avisa a página')
  assert.equal(No.foco, l.listas[2], 'o foco vai para o "abre" do novo período')
  assert.ok(!oculto(l.listas[2]) && oculto(l.mais) && !oculto(l.tirar))
  assert.equal(opcoesDe(l.listas[2])[1].valor, '14:00', 'o 2º período começa a partir do fim do 1º')
  assert.equal(s.resumo().textContent, 'Falta responder: Todos os dias.')
  assert.equal(s.h.linhas(), null)
  assert.deepEqual(l.listas.map((x) => x.attrs['aria-label']).slice(2), ['Todos os dias: segundo período, abre às', 'Todos os dias: segundo período, fecha às'])
  trocarLista(l.listas[2], '18:00')
  trocarLista(l.listas[3], '24:00')
  assert.equal(s.resumo().textContent, 'Fica assim: Todos os dias, das 10h às 14h e das 18h à meia-noite.')
  assert.deepEqual(grava(s.h).slice(0, 2), [{ data: '2026-11-05', abre: '10:00', fecha: '14:00' }, { data: '2026-11-05', abre: '18:00', fecha: '24:00' }])
  assert.equal(grava(s.h).length, 22)
  tocar(l.tirar)
  ;[l] = s.linhasTela()
  assert.deepEqual(s.avisos, [1, 1])
  assert.equal(No.foco, l.mais, 'sem o botão que sumiu, o foco vai para "+ Intervalo"')
  assert.ok(oculto(l.listas[2]) && !oculto(l.mais) && oculto(l.tirar))
  assert.equal(s.resumo().textContent, 'Fica assim: Todos os dias, das 10h às 14h.')
})

test('seletor: trocar o início para depois do fim limpa o fim; invadir o 2º período limpa o 2º', () => {
  const s = seletor({ linhas: [...linhasDe(DATAS, '10:00', '12:00'), ...linhasDe(DATAS, '18:00', '22:00')] })
  let [l] = s.linhasTela()
  assert.deepEqual(valoresDe(l), ['10:00', '12:00', '18:00', '22:00'])
  trocarLista(l.listas[1], '19:00')
  assert.deepEqual(valoresDe(l), ['10:00', '19:00', '', ''], 'o fim do 1º invadiu o 2º: o 2º período volta a "sem escolha"')
  assert.equal(s.h.completo(), false)
  trocarLista(l.listas[0], '19:30')
  assert.deepEqual(valoresDe(l).slice(0, 2), ['19:30', ''], 'início depois do fim: o fim volta a "sem escolha"')
  assert.equal(s.resumo().textContent, 'Falta responder: Todos os dias.')
})

test('seletor: "Muda conforme o dia" → Segunda a sexta · Sábado · Domingo; falta responder; Detalhar dia a dia e voltar', () => {
  const s = seletor()
  escolher(s.muda)
  assert.deepEqual(s.linhasTela().map((l) => l.nome), ['Segunda a sexta', 'Sábado', 'Domingo'])
  assert.equal(s.resumo().textContent, 'Falta responder: Segunda a sexta, Sábado, Domingo.')
  assert.equal(s.detalhar().textContent, 'Detalhar dia a dia')
  assert.ok(!oculto(s.detalhar()))

  let [semana, sab, dom] = s.linhasTela()
  escolher(semana.abre); trocarLista(semana.listas[0], '10:00'); trocarLista(semana.listas[1], '22:00')
  ;[semana, sab, dom] = s.linhasTela()
  assert.equal(s.resumo().textContent, 'Falta responder: Sábado, Domingo.')
  assert.equal(s.h.motivo(), 'falta responder: Sábado, Domingo')
  assert.equal(s.h.alvo(), sab.abre, 'o foco vai para o 1º que falta')
  escolher(sab.abre); trocarLista(sab.listas[0], '12:00'); trocarLista(sab.listas[1], '20:00')
  ;[semana, sab, dom] = s.linhasTela()
  escolher(dom.fecha)
  ;[semana, sab, dom] = s.linhasTela()
  assert.equal(s.resumo().textContent, 'Fica assim: Segunda a sexta, das 10h às 22h · Sábado, das 12h às 20h · Domingo, não abre.')
  assert.ok(oculto(dom.listas[0]), '"Não abre" esconde as horas')
  const gravado = grava(s.h)
  assert.equal(gravado.length, 7 + 2, 'sete dias úteis (5, 6 e 9 a 13) + dois sábados (7 e 14); domingo fechado não grava linha')
})

test('seletor: dia a dia mostra uma linha por data; "Voltar a Segunda a sexta" só quando dá para agrupar sem perder nada', () => {
  const s = seletor({ linhas: [...linhasDe(DATAS, '10:00', '22:00')] })
  assert.equal(s.igual.checked, true)
  escolher(s.muda)
  assert.deepEqual(s.linhasTela().map((l) => l.nome), ['Segunda a sexta', 'Sábado', 'Domingo'], 'o horário igual continua igual')
  tocar(s.detalhar())
  let ls = s.linhasTela()
  assert.deepEqual(ls.map((l) => l.nome), ['Qui 5/11', 'Sex 6/11', 'Sáb 7/11', 'Dom 8/11', 'Seg 9/11', 'Ter 10/11', 'Qua 11/11', 'Qui 12/11', 'Sex 13/11', 'Sáb 14/11', 'Dom 15/11'])
  assert.equal(s.detalhar().textContent, 'Voltar a Segunda a sexta')
  assert.ok(!oculto(s.detalhar()))
  assert.deepEqual(s.avisos, [1])
  // um dia diferente da sua semana: não dá mais para agrupar → o botão some
  escolher(ls[0].fecha) // quinta 5 não abre
  ls = s.linhasTela()
  assert.ok(oculto(s.detalhar()))
  assert.equal(s.resumo().textContent, 'Fica assim: Qui 5/11: não abre · Sex 6 a Dom 15/11: das 10h às 22h.')
  // volta a ficar igual dentro de cada grupo → o botão volta e leva às três linhas
  escolher(ls[0].abre)
  trocarLista(s.linhasTela()[0].listas[0], '10:00')
  trocarLista(s.linhasTela()[0].listas[1], '22:00')
  assert.ok(!oculto(s.detalhar()))
  tocar(s.detalhar())
  assert.deepEqual(s.linhasTela().map((l) => l.nome), ['Segunda a sexta', 'Sábado', 'Domingo'])
})

test('seletor: "Não abre" em todos os dias não é resposta — pelo menos um dia precisa abrir', () => {
  const s = seletor()
  escolher(s.igual)
  escolher(s.linhasTela()[0].fecha)
  assert.equal(s.resumo().textContent, 'Pelo menos um dia precisa abrir. Se esta loja não vende no festival, use “Não vende aqui”.')
  assert.ok(s.resumo()._classes.has('hresumo--falta'))
  assert.equal(s.h.completo(), false)
  assert.equal(s.h.linhas(), null)
  assert.equal(s.h.motivo(), 'pelo menos um dia precisa abrir')
  assert.equal(s.h.alvo(), s.linhasTela()[0].abre)
  // abre um dia → vale; o aviso de "falta" some
  escolher(s.muda)
  const [semana, sab, dom] = s.linhasTela()
  escolher(sab.abre); trocarLista(s.linhasTela()[1].listas[0], '12:00'); trocarLista(s.linhasTela()[1].listas[1], '16:00')
  assert.ok(!s.resumo()._classes.has('hresumo--falta'))
  assert.equal(s.h.completo(), true)
  assert.deepEqual(grava(s.h).map((x) => x.data), ['2026-11-07', '2026-11-14'])
})

test('seletor: abre já no modo certo com o horário gravado, e devolve as mesmas linhas se ninguém mexer', () => {
  // todos os dias
  const todosDias = linhasDe(DATAS, '10:00', '22:00')
  let s = seletor({ linhas: todosDias })
  assert.deepEqual([s.igual.checked, s.muda.checked], [true, false])
  assert.deepEqual(s.linhasTela().map((l) => l.nome), ['Todos os dias'])
  assert.deepEqual(valoresDe(s.linhasTela()[0]).slice(0, 2), ['10:00', '22:00'])
  assert.equal(s.resumo().textContent, 'Fica assim: Todos os dias, das 10h às 22h.')
  assert.deepEqual(grava(s.h), todosDias)
  // por semana: segunda a sexta 10–22, sábado 12–20, domingo fechado (sem linha)
  const porSemana = DATAS.flatMap((data) => {
    const dia = H.diaDaSemana(data)
    return dia < 5 ? [{ data, abre: '10:00:00', fecha: '22:00:00' }] : dia === 5 ? [{ data, abre: '12:00', fecha: '20:00' }] : []
  })
  s = seletor({ linhas: porSemana })
  assert.deepEqual([s.igual.checked, s.muda.checked], [false, true])
  const [semana, sab, dom] = s.linhasTela()
  assert.deepEqual([semana.nome, sab.nome, dom.nome], ['Segunda a sexta', 'Sábado', 'Domingo'])
  assert.deepEqual([valoresDe(semana).slice(0, 2), valoresDe(sab).slice(0, 2)], [['10:00', '22:00'], ['12:00', '20:00']])
  assert.equal(dom.fecha.checked, true)
  assert.equal(s.detalhar().textContent, 'Detalhar dia a dia')
  assert.equal(s.h.completo(), true)
  assert.deepEqual(grava(s.h), porSemana.map((l) => ({ data: l.data, abre: l.abre.slice(0, 5), fecha: l.fecha.slice(0, 5) })), 'HH:MM:SS volta como HH:MM')
  // dia a dia: a quinta é diferente das outras de segunda a sexta
  const diaADia = DATAS.map((data) => (data === '2026-11-05' ? { data, abre: '15:00', fecha: '23:00' } : { data, abre: '10:00', fecha: '22:00' }))
  s = seletor({ linhas: diaADia })
  assert.equal(s.linhasTela().length, 11)
  assert.ok(oculto(s.detalhar()), 'não dá para agrupar sem perder a quinta')
  assert.deepEqual(valoresDe(s.linhasTela()[0]).slice(0, 2), ['15:00', '23:00'])
  assert.deepEqual(grava(s.h), diaADia)
})

test('seletor: nota "Hoje está: …" só enquanto não há horário gravado', () => {
  const sem = seletor({ antigo: 'Seg a Sex, 10h às 22h.' })
  assert.equal(textoDe(sem.caixa, 'atual'), 'Hoje está: Seg a Sex, 10h às 22h. Escolha abaixo para confirmar ou trocar.')
  assert.equal(sem.igual.checked || sem.muda.checked, false, 'nada vem marcado: a marca confirma ou troca')
  assert.equal(textoDe(seletor({}).caixa, 'atual'), undefined, 'sem texto antigo, sem nota')
  assert.equal(textoDe(seletor({ antigo: '   ' }).caixa, 'atual'), undefined)
  assert.equal(textoDe(seletor({ antigo: 'Seg a Sex, 10h às 22h', linhas: linhasDe(DATAS, '10:00', '22:00') }).caixa, 'atual'), undefined, 'com horário gravado, o texto antigo não aparece')
})

test('seletor: sem as datas da edição não há o que perguntar — avisa e não trava o envio', () => {
  const s = seletor({ datas: [] })
  assert.match(textoDe(s.caixa, 'atual'), /as datas da edição não chegaram/)
  assert.equal(s.h.completo(), true)
  assert.equal(s.h.linhas(), null, 'nada é enviado: o cadastro fica como está')
  assert.equal(s.h.motivo(), '')
})

test('seletor: festival de outro tamanho (uma semana que cruza o mês)', () => {
  const datas = H.datasDoFestival('2026-10-30', '2026-11-02')
  const s = seletor({ datas })
  assert.match(textoDe(s.caixa, 'hapoio'), /^De 30 de outubro a 2 de novembro\. /)
  escolher(s.muda)
  assert.deepEqual(s.linhasTela().map((l) => l.nome), ['Segunda a sexta', 'Sábado', 'Domingo'])
  tocar(s.detalhar())
  assert.deepEqual(s.linhasTela().map((l) => l.nome), ['Sex 30/10', 'Sáb 31/10', 'Dom 1/11', 'Seg 2/11'])
})

test('seletor: "Igual todos os dias" sobre o que foi digitado avisa qual horário usou e deixa desfazer', () => {
  const quintaDiferente = DATAS.map((data) => (data === '2026-11-05' ? { data, abre: '15:00', fecha: '23:00' } : { data, abre: '10:00', fecha: '22:00' }))
  const s = seletor({ linhas: quintaDiferente }) // dia a dia
  assert.equal(s.linhasTela().length, 11)
  assert.equal(s.aviso().textContent, '', 'sem troca, sem aviso')
  assert.ok(oculto(s.desfazer()))
  escolher(s.igual)
  assert.deepEqual(s.linhasTela().map((l) => l.nome), ['Todos os dias'])
  assert.deepEqual(valoresDe(s.linhasTela()[0]).slice(0, 2), ['15:00', '23:00'])
  assert.deepEqual(grava(s.h), DATAS.map((data) => ({ data, abre: '15:00', fecha: '23:00' })), 'o que se grava é o que a tela mostra: todos os dias')
  assert.equal(s.aviso().textContent, 'Usei o horário de Qui 5/11 em todos os dias.')
  assert.equal(s.aviso().attrs.role, 'status', 'o leitor de tela anuncia a troca')
  assert.ok(!oculto(s.desfazer()))
  tocar(s.desfazer())
  // volta exatamente ao que era: 11 linhas, a quinta diferente, "Muda conforme o dia" marcado, o foco no ponto que ficou
  assert.equal(s.linhasTela().length, 11)
  assert.deepEqual(grava(s.h), quintaDiferente)
  assert.deepEqual([s.igual.checked, s.muda.checked], [false, true])
  assert.equal(s.aviso().textContent, '')
  assert.ok(oculto(s.desfazer()))
  assert.equal(No.foco, s.muda)
  assert.deepEqual(s.avisos, [1], 'desfazer avisa a página (o rascunho se atualiza)')

  // por semana: o aviso fala do grupo, não de uma data
  const semana = seletor({ linhas: POR_SEMANA })
  escolher(semana.igual)
  assert.equal(semana.aviso().textContent, 'Usei o horário de Segunda a sexta em todos os dias.')
  assert.deepEqual(grava(semana.h), DATAS.map((data) => ({ data, abre: '10:00', fecha: '22:00' })))
  tocar(semana.desfazer())
  assert.deepEqual(grava(semana.h), POR_SEMANA.map((l) => ({ data: l.data, abre: l.abre.slice(0, 5), fecha: l.fecha.slice(0, 5) })))

  // já era igual em todos os dias (ou nada respondido): nada foi trocado, nada a avisar
  const igualJa = seletor({ linhas: linhasDe(DATAS, '10:00', '22:00') })
  escolher(igualJa.muda)
  escolher(igualJa.igual)
  assert.equal(igualJa.aviso().textContent, '')
  assert.ok(oculto(igualJa.desfazer()))
  const vazio = seletor()
  escolher(vazio.muda)
  escolher(vazio.igual)
  assert.equal(vazio.aviso().textContent, '')

  // mexer em qualquer linha depois do aviso apaga o aviso (desfazer passaria por cima do que foi feito depois)
  const s2 = seletor({ linhas: quintaDiferente })
  escolher(s2.igual)
  assert.ok(!oculto(s2.desfazer()))
  trocarLista(s2.linhasTela()[0].listas[1], '23:30')
  assert.equal(s2.aviso().textContent, '')
  assert.ok(oculto(s2.desfazer()))

  // a seta do teclado marca a opção ao passar: ir e voltar não perde a saída
  const s3 = seletor({ linhas: quintaDiferente })
  escolher(s3.igual)
  escolher(s3.muda)
  assert.ok(!oculto(s3.desfazer()), 'voltar para "Muda conforme o dia" não apaga a saída')
  tocar(s3.desfazer())
  assert.deepEqual(grava(s3.h), quintaDiferente)

  // depois de "Muda conforme o dia" o aviso continua; ir para o dia a dia o encerra (já é outra tela, e desfazer passaria por cima)
  const s5 = seletor({ linhas: quintaDiferente })
  escolher(s5.igual)
  escolher(s5.muda)
  assert.ok(!oculto(s5.desfazer()))
  tocar(s5.detalhar())
  assert.equal(s5.aviso().textContent, '')
  assert.ok(oculto(s5.desfazer()))

  // o nome do botão diz de qual loja é
  const s4 = seletor({ linhas: quintaDiferente })
  s4.h.rotular('Loja 2 · Tirol')
  assert.equal(s4.desfazer().attrs['aria-label'], 'Desfazer — Loja 2 · Tirol')
})

test('seletor: fechar à meia-noite não deixa "+ Intervalo" (depois dela não há hora para abrir de novo)', () => {
  const s = seletor({ linhas: linhasDe(DATAS, '18:00', '24:00') })
  const [l] = s.linhasTela()
  assert.ok(oculto(l.mais))
  trocarLista(l.listas[1], '23:30')
  assert.ok(!oculto(l.mais))
  trocarLista(l.listas[1], '24:00')
  assert.ok(oculto(l.mais))
})

test('seletor: nome acessível — o dia em cada botão que se repete, a loja na legenda', () => {
  const s = seletor({ linhas: linhasDe(DATAS, '10:00', '14:00') })
  const [um] = s.linhasTela()
  assert.equal(um.mais.attrs['aria-label'], '+ Intervalo (ex.: fecha para o almoço) — Todos os dias')
  assert.equal(um.tirar.attrs['aria-label'], 'Tirar este intervalo — Todos os dias')
  escolher(s.muda)
  tocar(s.detalhar())
  const linhas = s.linhasTela()
  assert.equal(linhas.length, 11)
  assert.equal(new Set(linhas.map((l) => l.mais.attrs['aria-label'])).size, 11, 'cada linha tem o nome do seu dia')
  assert.equal(new Set(linhas.map((l) => l.tirar.attrs['aria-label'])).size, 11)
  assert.equal(linhas[0].mais.attrs['aria-label'], '+ Intervalo (ex.: fecha para o almoço) — Qui 5/11')
  assert.equal(linhas[10].tirar.attrs['aria-label'], 'Tirar este intervalo — Dom 15/11')
  // o texto visível continua contido no nome (rótulo no nome)
  assert.ok(linhas.every((l) => l.mais.attrs['aria-label'].startsWith(l.mais.textContent) && l.tirar.attrs['aria-label'].startsWith(l.tirar.textContent)))

  // a legenda é igual em todas as lojas: a página diz de qual é (só para leitor de tela, o visível não muda)
  const legenda = todos(s.caixa, (n) => n.tag === 'legend')[0]
  assert.equal(legenda.textContent, 'Como esta unidade funciona nos dias do festival?')
  assert.equal(s.detalhar().attrs['aria-label'], 'Voltar a Segunda a sexta')
  s.h.rotular('Loja 2 · Tirol')
  assert.equal(legenda.textContent, 'Como esta unidade funciona nos dias do festival? — Loja 2 · Tirol')
  assert.ok(todos(legenda, (n) => n._classes.has('sr') && n.textContent === ' — Loja 2 · Tirol').length === 1, 'o nome da loja fica escondido (sr)')
  assert.equal(s.detalhar().attrs['aria-label'], 'Voltar a Segunda a sexta — Loja 2 · Tirol')
  s.h.rotular('Loja 2 · Tirol') // repetir não muda nada
  s.h.rotular('')
  assert.equal(legenda.textContent, 'Como esta unidade funciona nos dias do festival?')
  assert.equal(s.detalhar().attrs['aria-label'], 'Voltar a Segunda a sexta')
})

test('seletor: alvo() sempre aponta para um controle que está na tela, também depois de trocar Igual/Muda/Detalhar', () => {
  const s = seletor()
  escolher(s.muda)
  const antes = s.h.alvo() // o 1º que falta: "Abre" de Segunda a sexta
  assert.equal(raizDe(antes), s.caixa)
  tocar(s.detalhar()) // refaz as linhas: o controle de antes saiu da tela
  assert.notEqual(raizDe(antes), s.caixa, 'o alvo antigo ficou solto (por isso a página o pede de novo NO CLIQUE)')
  const agora = s.h.alvo()
  assert.equal(raizDe(agora), s.caixa)
  assert.ok(!oculto(agora))
  assert.equal(agora, s.linhasTela()[0].abre, 'agora a primeira linha é Qui 5/11')
  escolher(s.igual)
  const todosDias = s.h.alvo()
  assert.equal(raizDe(todosDias), s.caixa)
  assert.equal(todosDias, s.linhasTela()[0].abre)
})

test('seletor: o rascunho guarda o arranjo e as horas como estão (mesmo incompletos) e volta igual', () => {
  const s = seletor()
  escolher(s.muda)
  const [semana] = s.linhasTela()
  escolher(semana.abre)
  trocarLista(semana.listas[0], '10:00') // só o início
  const guardado = fresco(s.h.estado())
  assert.equal(guardado.modo, 'semana')
  assert.equal(s.h.linhas(), null, 'incompleto não vai no envio')

  const volta = seletor({ rascunho: guardado })
  assert.deepEqual([volta.igual.checked, volta.muda.checked], [false, true])
  assert.deepEqual(volta.linhasTela().map((l) => l.nome), ['Segunda a sexta', 'Sábado', 'Domingo'])
  assert.deepEqual(valoresDe(volta.linhasTela()[0]).slice(0, 2), ['10:00', ''])
  assert.equal(volta.resumo().textContent, 'Falta responder: Segunda a sexta, Sábado, Domingo.')
  assert.equal(volta.h.linhas(), null)
  assert.deepEqual(fresco(volta.h.estado()), guardado, 'guardar de novo dá o mesmo')

  // dia a dia, com uma hora no meio do caminho
  const d = seletor()
  escolher(d.muda)
  tocar(d.detalhar())
  escolher(d.linhasTela()[2].abre) // sábado 7
  trocarLista(d.linhasTela()[2].listas[0], '12:00')
  trocarLista(d.linhasTela()[2].listas[1], '20:00')
  const diaADia = seletor({ rascunho: fresco(d.h.estado()) })
  assert.equal(diaADia.linhasTela().length, 11)
  assert.deepEqual(valoresDe(diaADia.linhasTela()[2]).slice(0, 2), ['12:00', '20:00'])
  assert.deepEqual(valoresDe(diaADia.linhasTela()[0]).slice(0, 2), ['', ''], 'as outras seguem sem resposta')
  assert.deepEqual(fresco(diaADia.h.estado()), fresco(d.h.estado()))
})

test('seletor: horário completo do banco que a pessoa começou a mudar volta do rascunho como estava, sem "Hoje está"', () => {
  const gravado = linhasDe(DATAS, '10:00', '22:00')
  const s = seletor({ linhas: gravado, antigo: 'Seg a Sex, 9h às 18h' })
  assert.equal(textoDe(s.caixa, 'atual'), undefined)
  escolher(s.muda)
  const [semana] = s.linhasTela()
  trocarLista(semana.listas[0], '23:30') // início depois do fim: o fim volta a "sem escolha" e o horário fica incompleto
  assert.equal(s.h.linhas(), null)
  const rascunho = fresco(s.h.estado())
  // o que a página vê ao reabrir: o horário completo NÃO foi para o rascunho do envio, só o estado do seletor
  const volta = seletor({ linhas: [], antigo: 'Seg a Sex, 9h às 18h', rascunho })
  assert.equal(textoDe(volta.caixa, 'atual'), undefined, 'já há arranjo escolhido: o texto antigo não toma o lugar do que a pessoa estava fazendo')
  assert.deepEqual(valoresDe(volta.linhasTela()[0]).slice(0, 2), ['23:30', ''])
  assert.deepEqual(valoresDe(volta.linhasTela()[1]).slice(0, 2), ['10:00', '22:00'], 'sábado e domingo seguem como estavam')
  assert.equal(volta.resumo().textContent, 'Falta responder: Segunda a sexta.')
  // sem arranjo escolhido no rascunho, a nota volta a valer
  const nada = { modo: null, dias: DATAS.map((data) => ({ data, periodos: null })) }
  assert.match(textoDe(seletor({ antigo: 'Seg a Sex, 9h às 18h', rascunho: nada }).caixa, 'atual'), /^Hoje está: Seg a Sex, 9h às 18h\./)
})

test('seletor: rascunho de outros dias, estragado ou incoerente nunca derruba a tela — vale o que está gravado', () => {
  const gravado = linhasDe(DATAS, '10:00', '22:00')
  const bom = { modo: 'todos', dias: DATAS.map((data) => ({ data, periodos: [['09:00', '12:00']] })) }
  const mostra = (rascunho) => valoresDe(seletor({ linhas: gravado, rascunho }).linhasTela()[0]).slice(0, 2)
  assert.deepEqual(mostra(bom), ['09:00', '12:00'], 'o rascunho vale mais que o gravado, como o resto do formulário')
  const ruins = [
    { modo: 'todos', dias: bom.dias.slice(1) }, // um dia a menos
    { modo: 'todos', dias: bom.dias.map((d, i) => (i ? d : { data: '2026-12-01', periodos: d.periodos })) }, // outra data
    { modo: 'todos', dias: bom.dias.map((d) => ({ data: d.data, periodos: 'x' })) },
    { modo: 'todos', dias: bom.dias.map((d) => ({ data: d.data, periodos: [['09:00', '10:00'], ['11:00', '12:00'], ['13:00', '14:00']] })) }, // três períodos
    { modo: 'todos', dias: 'x' }, { modo: 'todos' }, {}, null, 'lixo', 42,
  ]
  for (const r of ruins) assert.deepEqual(mostra(r), ['10:00', '22:00'], 'ignorado: ' + norm(r).slice(0, 60))
  // horas soltas viram texto; período de um item só vira par
  assert.deepEqual(valoresDe(seletor({ rascunho: { modo: 'todos', dias: DATAS.map((data) => ({ data, periodos: [['10:00', null]] })) } }).linhasTela()[0]).slice(0, 2), ['10:00', ''])
  // modo que os dias não sustentam: vale o que os dias dizem
  const umDiaDiferente = { modo: 'todos', dias: bom.dias.map((d, i) => (i === 3 ? { data: d.data, periodos: [] } : d)) }
  assert.equal(seletor({ rascunho: umDiaDiferente }).linhasTela().length, 11, 'um dia diferente não cabe em "Igual todos os dias"')
  const semModo = { modo: 'qualquer', dias: bom.dias }
  assert.deepEqual(seletor({ rascunho: semModo }).linhasTela().map((l) => l.nome), ['Todos os dias'])
  const nuloComRespostas = { modo: null, dias: bom.dias }
  assert.deepEqual(seletor({ rascunho: nuloComRespostas }).linhasTela().map((l) => l.nome), ['Todos os dias'])
  // por semana com a semana respondida e o fim de semana ainda em branco (módulo: "sem resposta" é um valor)
  const semanaSo = { modo: 'semana', dias: DATAS.map((data) => ({ data, periodos: H.diaDaSemana(data) < 5 ? [['10:00', '22:00']] : null })) }
  const sS = seletor({ rascunho: semanaSo })
  assert.deepEqual(sS.linhasTela().map((l) => l.nome), ['Segunda a sexta', 'Sábado', 'Domingo'])
  assert.equal(sS.resumo().textContent, 'Falta responder: Sábado, Domingo.')
})

test('página: guarda de ES5 — var e function, sem =>, crase, const/let, espalhar, .includes(, padStart, Object.entries', () => {
  // o esbuild imprime o código sem comentários; os textos saem antes de procurar (o que sobra é código)
  const codigo = (texto) => esbuild.transformSync(texto, { target: 'esnext', legalComments: 'none' }).code.replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
  const proibidos = [[/=>/, 'função de seta'], [/`/, 'crase (template)'], [/\bconst\b/, 'const'], [/\blet\b/, 'let'], [/\.\.\./, 'espalhar (...)'],
    [/\.includes\(/, '.includes('], [/padStart/, 'padStart'], [/Object\.(entries|fromEntries)/, 'Object.entries/fromEntries']]
  for (const [re, nome] of proibidos) assert.doesNotMatch(codigo(SCRIPT), re, 'o script da página usa ' + nome)
  // o script inteiro compila como script comum (não módulo) e o bloco novo (modelo + seletor) se converte para ES5 sem ressalva
  assert.doesNotThrow(() => new vm.Script(SCRIPT))
  assert.doesNotThrow(() => esbuild.transformSync(BLOCO + SELETOR, { target: 'es5' }), 'sintaxe que o ES5 não tem (async, for-of, classe…)')
  // a própria guarda enxerga o defeito
  assert.match(codigo('var f = (a) => a + 1;'), /=>/)
  assert.match(codigo('var s = `x${1}`;'), /`/)
  assert.match(codigo('const a = [...b]; let c = a.includes(1);'), /\bconst\b/)
})

test('página: WhatsApp já cadastrado e ainda sem liberação abre a seção da loja (a marca vê que, preenchido, vai ao site)', () => {
  const loja = trecho(SCRIPT, 'function adicionarLoja(u) {', '\n  // O texto livre que a marca mandou antes')
  assert.match(loja, /if \(u && digitos\(txt\(u\.whatsapp\)\)\.length > 0 && u\.whatsapp_autorizado === false\) no\.querySelector\('details\.mais'\)\.open = true;/)
  assert.equal([...trecho(PAGINA, '<template id="tpl-loja">', '</template>').matchAll(/<details class="mais">/g)].length, 1, 'uma seção só: a do WhatsApp')
})

test('página: o nome da loja chega ao seletor (legenda e botões para leitor de tela)', () => {
  const titulos = trecho(SCRIPT, 'function titulosLojas() {', '\n  }\n')
  assert.match(titulos, /var hf = u\.no\.querySelector\('\[data-horario\]'\)\.horario;\s*if \(hf\) hf\.rotular\(titulo === 'Endereço' \? '' : titulo\);/)
})

/* ══ 4 · O site público fala do horário no festival ══════════════════════════════════════════════════════ */

test('site: o horário da unidade sai em frases — dia sem período não abre; dias não seguidos não se juntam', () => {
  const periodo = { inicio: '2026-11-05', fim: '2026-11-15' }
  const util = DATAS.filter((d) => H.diaDaSemana(d) < 5)
  const semFimDeSemana = linhasDe(util, '10:00', '22:00')
  assert.deepEqual(M.horarioNoFestival(semFimDeSemana, periodo), ['Segunda a sexta, das 10h às 22h', 'Sábado e domingo, não abre'])
  assert.deepEqual(M.horarioNoFestival(linhasDe(DATAS, '14:00', '20:00'), periodo), ['Todos os dias, das 14h às 20h'])
  assert.deepEqual(M.horarioNoFestival([...linhasDe(DATAS, '10:00', '14:00'), ...linhasDe(DATAS, '18:00', '24:00')], periodo), ['Todos os dias, das 10h às 14h e das 18h à meia-noite'])
  // só quinta e sexta, o resto fechado
  assert.deepEqual(M.horarioNoFestival(linhasDe(['2026-11-05', '2026-11-06'], '15:00', '23:00'), periodo), ['Qui 5 a Sex 6/11: das 15h às 23h', 'Sáb 7 a Dom 15/11: não abre'])
  // sem a edição à mão: só os dias que as linhas citam, dia a dia — nunca "todos os dias" (o que está fora das pontas não foi dito)
  assert.deepEqual(M.horarioNoFestival(linhasDe(['2026-11-05', '2026-11-06'], '15:00', '23:00')), ['Qui 5 a Sex 6/11: das 15h às 23h'])
  // período que não bate com as linhas não vira "não abre em todos os dias": cai no mesmo dia a dia
  assert.deepEqual(M.horarioNoFestival(linhasDe(DATAS, '10:00', '12:00'), { inicio: '2027-01-01', fim: '2027-01-05' }), ['Qui 5 a Dom 15/11: das 10h às 12h'])
  // sem horário respondido: nada (a página diz "a confirmar")
  assert.deepEqual(M.horarioNoFestival([], periodo), [])
  assert.deepEqual(M.horarioNoFestival(undefined, periodo), [])
  assert.match(M.textoEstado({ estado: 'sem_horario' }), /^Horário no festival a confirmar/)
  // o dado do banco chega como jsonb: observação extra e HH:MM:SS não atrapalham
  assert.deepEqual(M.horarioNoFestival(DATAS.map((data) => ({ data, abre: '10:00:00', fecha: '22:00:00', observacao: 'x' })), periodo), ['Todos os dias, das 10h às 22h'])
})

test('site: nenhum texto "horário da loja" nem "horário do combo" nas páginas da edição', () => {
  for (const arq of ['src/edicao/cartoon/paginas/Participante.jsx', 'src/edicao/cartoon/textos.js', 'src/edicao/dados/demo/cartoon.js']) {
    const t = ler(arq)
    assert.doesNotMatch(t, /horário da loja|Horário da loja|horario_loja|horarioLoja|Horário do combo|horarioCombo/, arq)
  }
  assert.match(ler('src/edicao/cartoon/textos.js'), /horarioFestival: 'Horário no festival'/)
  assert.match(ler('src/edicao/cartoon/paginas/Participante.jsx'), /M\.horarioNoFestival\(u\.combo\?\.disponibilidade, periodo\)/)
  assert.match(ler('src/edicao/cartoon/paginas/Participante.jsx'), /periodo=\{edicao\?\.edicao\}/, 'o período da edição chega à unidade')
})

test('site: as telas passam o período da edição a estadoAgora (dia sem linha DENTRO do festival é "sem combo hoje", não "fora do período")', () => {
  assert.match(ler('src/edicao/cartoon/paginas/Participante.jsx'), /M\.estadoAgora\(u, undefined, periodo\)/)
  assert.match(ler('src/edicao/cartoon/paginas/Mapa.jsx'), /M\.estadoAgora\(u, undefined, dados\?\.edicao\)/)
  assert.match(ler('src/edicao/cartoon/paginas/MinhaRota.jsx'), /M\.estadoAgora\(pa\.unidade, undefined, dados\?\.edicao\)/)
  for (const arq of ['Participante', 'Mapa', 'MinhaRota']) {
    assert.doesNotMatch(ler('src/edicao/cartoon/paginas/' + arq + '.jsx'), /estadoAgora\((u|pa\.unidade)\)/, arq + ' ainda chama estadoAgora sem o período')
  }
})
