// Aba Fotos da marca (22/10/2026) — a lógica pura (lib/fotosMarca.js) e o que a tela não pode perder:
// vagas por dia, data por extenso no fuso de quem abre, estados da sessão, erro de reserva em português,
// e falha de leitura que NUNCA vira "lista vazia".
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import {
  dataCompleta, horaCurta, diaChave, agruparVagasPorDia, detalhesDaSessao, estadoDaSessao, ESTADOS_SESSAO, sessaoCancelada,
  interpretarReserva, textoDeConfirmarReserva, situacaoDaLeitura, pendenciasDeFotos, ehImagem, detalheDaFoto, situacaoDaConferencia,
  A_CONFIRMAR, TEXTO_CONCORRENCIA, capitalizar, minuscula, fraseDaSessao, notaDoAgendamento,
} from '../painel-app/src/lib/fotosMarca.js'
import { notaDeAbertura } from '../painel-app/src/lib/arquivosMarca.js'
import { resumoMarca, fotosDaParticipacao } from '../painel-app/src/lib/guia.js'
import { TONS } from '../painel-app/src/lib/status.js'
import { existe } from './_icones.mjs'
import { carregar, html } from './_renderizar.mjs'

const VISTAS = 'painel-app/src/components/vistas-marca/'
const { Preparacao } = carregar(VISTAS + 'fotos/Preparacao.jsx')
const { Agendamento } = carregar(VISTAS + 'fotos/Agendamento.jsx')
const { PendenciasFotos } = carregar(VISTAS + 'fotos/PendenciasFotos.jsx')
const FZ = { fuso: 'America/Fortaleza' }
const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

/* ── Data e hora por extenso, no fuso de quem abre ───────────────────────── */

test('data completa traz o dia da semana certo e a data por extenso', () => {
  assert.equal(dataCompleta('2026-10-24T17:00:00Z', FZ), 'sábado, 24 de outubro de 2026')
  assert.equal(dataCompleta('2026-11-05T15:30:00Z', FZ), 'quinta-feira, 5 de novembro de 2026')
  assert.equal(dataCompleta('2026-10-24T17:00:00Z', { ...FZ, comAno: false }), 'sábado, 24 de outubro')
  assert.equal(capitalizar('sábado, 24 de outubro'), 'Sábado, 24 de outubro')
  assert.equal(minuscula('Sábado, 24 de outubro'), 'sábado, 24 de outubro')
})

test('o dia e a hora seguem o fuso de quem abre — a mesma sessão cai em dias diferentes', () => {
  const iso = '2026-10-24T02:30:00Z'
  assert.equal(dataCompleta(iso, FZ), 'sexta-feira, 23 de outubro de 2026')
  assert.equal(horaCurta(iso, FZ), '23:30')
  assert.equal(dataCompleta(iso, { fuso: 'Asia/Tokyo' }), 'sábado, 24 de outubro de 2026')
  assert.equal(horaCurta(iso, { fuso: 'Asia/Tokyo' }), '11:30')
  assert.equal(diaChave(iso, FZ), '2026-10-23')
  assert.equal(diaChave(iso, { fuso: 'Asia/Tokyo' }), '2026-10-24')
})

test('hora: 24 h com minutos, meia-noite é 00:00; sem data válida, nada', () => {
  assert.equal(horaCurta('2026-10-24T17:00:00Z', FZ), '14:00')
  assert.equal(horaCurta('2026-10-24T03:00:00Z', FZ), '00:00')
  assert.equal(horaCurta('2026-10-24T17:45:00Z', FZ), '14:45')
  for (const v of [null, undefined, '', 'não é data']) {
    assert.equal(dataCompleta(v), null)
    assert.equal(horaCurta(v), null)
    assert.equal(diaChave(v), null)
  }
})

/* ── Vagas por dia ───────────────────────────────────────────────────────── */

const vaga = (id, data_hora, local) => ({ id, status: 'aberto', data_hora, local })

test('vagas agrupadas por dia, dias e horas em ordem (mesmo que cheguem fora de ordem)', () => {
  const grupos = agruparVagasPorDia([
    vaga('c', '2026-10-27T18:00:00Z', 'Rua B'),
    vaga('a', '2026-10-26T17:00:00Z', 'Rua A'),
    vaga('d', '2026-10-27T13:00:00Z', 'Rua B'),
    vaga('b', '2026-10-26T12:30:00Z', 'Rua A'),
  ], { ...FZ, agora: new Date('2026-10-22T12:00:00Z') })
  assert.deepEqual(grupos.map((g) => g.rotulo), ['Segunda-feira, 26 de outubro', 'Terça-feira, 27 de outubro'])
  assert.deepEqual(grupos[0].vagas.map((v) => [v.id, v.hora]), [['b', '09:30'], ['a', '14:00']])
  assert.deepEqual(grupos[1].vagas.map((v) => [v.id, v.hora]), [['d', '10:00'], ['c', '15:00']])
  assert.equal(grupos[0].local, 'Rua A')
  assert.equal(grupos[1].local, 'Rua B')
  assert.equal(grupos[0].localPorVaga, false)
  assert.equal(grupos[0].vagas[0].data_hora, '2026-10-26T12:30:00Z', 'a vaga leva o instante original para reservar')
})

test('o dia do agrupamento é o do fuso, não o de UTC; o ano só aparece quando não é o atual', () => {
  // 02:30Z do dia 27 ainda é noite do dia 26 em Fortaleza: fica no grupo do 26.
  const g = agruparVagasPorDia([vaga('a', '2026-10-26T20:00:00Z'), vaga('b', '2026-10-27T02:30:00Z')], { ...FZ, agora: new Date('2026-10-22T12:00:00Z') })
  assert.equal(g.length, 1)
  assert.deepEqual(g[0].vagas.map((v) => v.hora), ['17:00', '23:30'])
  const outroAno = agruparVagasPorDia([vaga('a', '2027-01-05T14:00:00Z')], { ...FZ, agora: new Date('2026-10-22T12:00:00Z') })
  assert.equal(outroAno[0].rotulo, 'Terça-feira, 5 de janeiro de 2027')
})

test('local do dia: comum, diferente por horário, ou nenhum — nunca inventado', () => {
  const opts = { ...FZ, agora: new Date('2026-10-22T12:00:00Z') }
  const comum = agruparVagasPorDia([vaga('a', '2026-10-26T12:00:00Z', ' Rua A '), vaga('b', '2026-10-26T15:00:00Z', 'Rua A')], opts)[0]
  assert.equal(comum.local, 'Rua A')
  const mistos = agruparVagasPorDia([vaga('a', '2026-10-26T12:00:00Z', 'Rua A'), vaga('b', '2026-10-26T15:00:00Z', 'Rua B')], opts)[0]
  assert.equal(mistos.local, null)
  assert.equal(mistos.localPorVaga, true)
  assert.deepEqual(mistos.vagas.map((v) => v.local), ['Rua A', 'Rua B'])
  const nenhum = agruparVagasPorDia([vaga('a', '2026-10-26T12:00:00Z', ''), vaga('b', '2026-10-26T15:00:00Z', null)], opts)[0]
  assert.equal(nenhum.local, null)
  assert.equal(nenhum.localPorVaga, false, 'sem local em nenhuma: a tela diz que a organização confirma')
  const umaSem = agruparVagasPorDia([vaga('a', '2026-10-26T12:00:00Z', 'Rua A'), vaga('b', '2026-10-26T15:00:00Z', null)], opts)[0]
  assert.equal(umaSem.localPorVaga, true, 'local em uma e não na outra: mostra por horário')
})

test('vaga sem data válida não entra; lista vazia ou nula dá nenhum grupo', () => {
  assert.deepEqual(agruparVagasPorDia([vaga('a', null), vaga('b', 'x')]), [])
  assert.deepEqual(agruparVagasPorDia([]), [])
  assert.deepEqual(agruparVagasPorDia(null), [])
})

test('vaga vencida não chega à lista (guia.js já filtra, e a tela agrupa o que sobra)', () => {
  const agora = new Date('2026-10-26T15:00:00Z')
  const { vagas } = fotosDaParticipacao([
    vaga('passou', '2026-10-26T12:00:00Z'), vaga('futura', '2026-10-26T18:00:00Z'),
  ].map((v) => ({ ...v, edicao_codigo: '2026.2' })), { id: 'pa', edicao_codigo: '2026.2' }, agora)
  assert.deepEqual(agruparVagasPorDia(vagas, FZ).flatMap((g) => g.vagas.map((v) => v.id)), ['futura'])
})

/* ── Dia, hora e local da sessão ─────────────────────────────────────────── */

test('sessão completa: dia da semana + data, hora e local', () => {
  const d = detalhesDaSessao({ data_hora: '2026-11-05T15:30:00Z', local: 'Estúdio da F2, Rua X 100', observacoes: ' Levar o combo ' }, FZ)
  assert.equal(d.dia, 'Quinta-feira, 5 de novembro de 2026')
  assert.equal(d.hora, '12:30')
  assert.equal(d.local, 'Estúdio da F2, Rua X 100')
  assert.equal(d.observacoes, 'Levar o combo')
  assert.deepEqual(d.faltando, [])
})

test('sessão sem local, sem hora ou sem data: volta null (a tela escreve "a organização ainda vai confirmar")', () => {
  const semLocal = detalhesDaSessao({ data_hora: '2026-11-05T15:30:00Z', local: '   ' }, FZ)
  assert.equal(semLocal.local, null)
  assert.deepEqual(semLocal.faltando, ['o local'])
  assert.ok(semLocal.dia && semLocal.hora)
  const semData = detalhesDaSessao({ data_hora: null, local: 'Rua X' })
  assert.equal(semData.dia, null)
  assert.equal(semData.hora, null)
  assert.deepEqual(semData.faltando, ['o dia', 'a hora'])
  const nada = detalhesDaSessao(null)
  assert.deepEqual(nada.faltando, ['o dia', 'a hora', 'o local'])
  assert.equal(nada.observacoes, null)
  assert.match(A_CONFIRMAR, /organização ainda vai confirmar/)
})

/* ── Estados da sessão: sempre em palavras ───────────────────────────────── */

const liberada = { id: 'pa', edicao_codigo: '2026.2', foto_liberacao: 'liberado' }
const sessao = (status, extra = {}) => ({ id: 's-' + status, status, data_hora: '2026-11-05T15:30:00Z', local: 'Rua X', ...extra })

test('seis estados, cada um com rótulo, texto e tom válido', () => {
  assert.deepEqual(Object.keys(ESTADOS_SESSAO), ['aguardando_liberacao', 'sem_horarios', 'escolher', 'agendada', 'remarcada', 'realizada'])
  const pedidos = [
    [{ participacao: { ...liberada, foto_liberacao: 'pendente' } }, 'aguardando_liberacao', 'Aguardando liberação'],
    [{ participacao: liberada, vagas: [] }, 'sem_horarios', 'Sem horários disponíveis'],
    [{ participacao: liberada, vagas: [vaga('a', '2026-11-05T15:30:00Z')] }, 'escolher', 'Escolha um horário'],
    [{ participacao: liberada, minhas: [sessao('agendada')] }, 'agendada', 'Sessão agendada'],
    [{ participacao: liberada, minhas: [sessao('remarcada')] }, 'remarcada', 'Sessão remarcada'],
    [{ participacao: liberada, minhas: [sessao('realizada')] }, 'realizada', 'Sessão realizada'],
  ]
  for (const [entrada, chave, rotulo] of pedidos) {
    const e = estadoDaSessao(entrada)
    assert.equal(e.chave, chave)
    assert.equal(e.rotulo, rotulo)
    assert.ok(e.texto.length > 30, 'o estado explica em uma frase: ' + chave)
    assert.ok(TONS.includes(e.tom), 'tom do dicionário (selo com ícone): ' + e.tom)
  }
})

test('"aguardando liberação" é tudo que não é liberado — e vale mesmo havendo vagas abertas', () => {
  for (const foto_liberacao of ['pendente', 'nao_liberado', null, undefined]) {
    const e = estadoDaSessao({ participacao: { ...liberada, foto_liberacao }, vagas: [vaga('a', '2026-11-05T15:30:00Z')] })
    assert.equal(e.chave, 'aguardando_liberacao', String(foto_liberacao))
  }
  assert.equal(estadoDaSessao({ participacao: null }).chave, 'aguardando_liberacao')
})

test('sessão marcada vale mais que realizada antiga; cancelada não conta como marcada', () => {
  const e = estadoDaSessao({ participacao: liberada, minhas: [sessao('realizada', { id: 'velha', data_hora: '2026-09-01T15:00:00Z' }), sessao('agendada')] })
  assert.equal(e.chave, 'agendada')
  assert.equal(e.sessao.id, 's-agendada')
  const cancelada = estadoDaSessao({ participacao: liberada, minhas: [sessao('cancelada')], vagas: [vaga('a', '2026-11-05T15:30:00Z')] })
  assert.equal(cancelada.chave, 'escolher')
  assert.equal(cancelada.sessao, null)
  assert.equal(sessaoCancelada([sessao('cancelada', { id: 'x1', data_hora: '2026-10-01T10:00:00Z' }), sessao('cancelada', { id: 'x2', data_hora: '2026-10-09T10:00:00Z' })]).id, 'x2')
  assert.equal(sessaoCancelada([sessao('agendada')]), null)
})

test('coerente com o guia: o que o Início escreve da etapa Fotos é o mesmo estado desta aba', () => {
  const base = {
    participante: { nome_marca: 'Casa', responsavel: 'Ana', telefone: '(84) 99999-8888' },
    itens: [], unidades: [{ endereco: 'Rua A' }],
  }
  const caso = (foto_liberacao, sessoes, vagasAbertas) => {
    const participacao = { ...liberada, foto_liberacao, logo_id: 'l', tema_combo: 't', tema_justificativa: 'j' }
    const etapa = resumoMarca({ ...base, participacao, sessoes, vagasAbertas }).etapas.find((x) => x.chave === 'fotos')
    const nossas = estadoDaSessao({ participacao, minhas: sessoes, vagas: Array.from({ length: vagasAbertas }, (_, i) => vaga('v' + i, '2026-11-05T15:30:00Z')) })
    return [etapa.detalhe, nossas.chave]
  }
  assert.deepEqual(caso('pendente', [], 3), ['aguardando liberação da organização', 'aguardando_liberacao'])
  assert.deepEqual(caso('liberado', [], 0), ['sem horários livres por enquanto', 'sem_horarios'])
  assert.deepEqual(caso('liberado', [], 2), ['escolher um horário', 'escolher'])
  assert.deepEqual(caso('liberado', [sessao('agendada')], 2), ['sessão marcada', 'agendada'])
  assert.deepEqual(caso('liberado', [sessao('realizada')], 0), ['sessão realizada', 'realizada'])
})

test('"Sua sessão é…" só para sessão por vir: realizada (ou com data passada) não vira frase no presente', () => {
  const agora = new Date('2026-10-22T12:00:00Z')
  const futura = estadoDaSessao({ participacao: liberada, minhas: [sessao('agendada')] })        // 5/nov
  assert.equal(fraseDaSessao(futura, { ...FZ, agora }), 'Sua sessão é quinta-feira, 5 de novembro de 2026, às 12:30.')
  assert.equal(fraseDaSessao(estadoDaSessao({ participacao: liberada, minhas: [sessao('remarcada')] }), { ...FZ, agora }), 'Sua sessão é quinta-feira, 5 de novembro de 2026, às 12:30.')
  // Já aconteceu: o bloco ao lado diz "A sessão já aconteceu"; este não pode dizer o contrário.
  const feita = estadoDaSessao({ participacao: liberada, minhas: [sessao('realizada', { data_hora: '2026-10-13T17:00:00Z' })] })
  assert.equal(feita.chave, 'realizada')
  assert.equal(fraseDaSessao(feita, { ...FZ, agora }), '')
  // Marcada, mas a data passou sem a organização dar baixa: também não é "é" no presente.
  const passou = estadoDaSessao({ participacao: liberada, minhas: [sessao('agendada', { data_hora: '2026-10-13T17:00:00Z' })] })
  assert.equal(fraseDaSessao(passou, { ...FZ, agora }), '')
  // Sem sessão, sem estado ou sem data válida: nada (a tela não inventa).
  assert.equal(fraseDaSessao(null, FZ), '')
  assert.equal(fraseDaSessao(estadoDaSessao({ participacao: liberada, vagas: [vaga('a', '2026-11-05T15:30:00Z')] }), FZ), '')
  assert.equal(fraseDaSessao({ chave: 'agendada', sessao: { data_hora: null } }, FZ), '')
  // A tela passa o ESTADO (não só a sessão) ao bloco de preparação.
  assert.match(ler('painel-app/src/components/vistas-marca/Fotos.jsx'), /<Preparacao irPara=\{irPara\} estado=\{sessao\} \/>/)
  assert.match(ler('painel-app/src/components/vistas-marca/fotos/Preparacao.jsx'), /fraseDaSessao\(estado\)/)
})

test('o subtítulo do agendamento segue o ESTADO: liberada com horários não lê "quando a organização liberar"', () => {
  const notas = Object.fromEntries(Object.keys(ESTADOS_SESSAO).map((chave) => [chave, notaDoAgendamento({ chave })]))
  assert.match(notas.aguardando_liberacao, /Quando a organização liberar/)
  for (const chave of ['sem_horarios', 'escolher', 'agendada', 'remarcada', 'realizada']) assert.doesNotMatch(notas[chave], /Quando a organização liberar/, chave)
  assert.match(notas.escolher, /Escolha aqui o dia e a hora/)
  assert.match(notas.sem_horarios, /liberada/)
  assert.equal(notas.agendada, notas.realizada)
  // Carregando ou erro (sem estado): a frase de quem ainda espera, como antes.
  assert.equal(notaDoAgendamento(null), notas.aguardando_liberacao)
  assert.equal(notaDoAgendamento(undefined), notas.aguardando_liberacao)
  // Cada estado que o bloco mostra tem a sua nota, vinda do estado real.
  assert.equal(notaDoAgendamento(estadoDaSessao({ participacao: liberada, vagas: [vaga('a', '2026-11-05T15:30:00Z')] })), notas.escolher)
  assert.match(ler('painel-app/src/components/vistas-marca/fotos/Agendamento.jsx'), /nota=\{notaDoAgendamento\(estado\)\}/)
})

test('a tela desenhada: Preparação sem "Sua sessão é" depois de realizada; Agendamento coerente e com o aviso antes das vagas', () => {
  // Datas no futuro distante: `Preparacao` usa o relógio de verdade para saber o que está "por vir".
  const futuro = (status, extra = {}) => ({ id: 's-' + status, status, data_hora: '2099-11-05T15:30:00Z', local: 'Rua X', ...extra })
  const marcada = estadoDaSessao({ participacao: liberada, minhas: [futuro('agendada')] })
  const realizada = estadoDaSessao({ participacao: liberada, minhas: [futuro('realizada', { data_hora: '2026-10-13T17:00:00Z' })] })
  assert.match(html(Preparacao, { irPara() {}, estado: marcada }), /Sua sessão é quinta-feira, 5 de novembro de 2099, às \d\d:\d\d\./)
  assert.doesNotMatch(html(Preparacao, { irPara() {}, estado: realizada }), /Sua sessão é/)
  assert.doesNotMatch(html(Preparacao, { irPara() {}, estado: null }), /Sua sessão é/)
  assert.match(html(Preparacao, { irPara() {}, estado: realizada }), /Abrir o guia de fotos/, 'o caminho até o guia continua')

  // Liberada, com horários à vista: o subtítulo e o corpo concordam, e o aviso da reserva vem ANTES da grade de vagas.
  const vagas = [{ id: 'v1', status: 'aberto', data_hora: '2099-11-05T15:30:00Z', local: 'R' }, { id: 'v2', status: 'aberto', data_hora: '2099-11-05T17:30:00Z', local: 'R' }]
  const escolher = estadoDaSessao({ participacao: liberada, vagas })
  const h = html(Agendamento, { situacao: 'pronto', estado: escolher, minhas: [], vagas, reservando: null, aviso: { tom: 'erro', texto: TEXTO_CONCORRENCIA }, onReservar() {}, onTentar() {} })
  assert.match(h, /Escolha aqui o dia e a hora da sua sessão\./)
  assert.doesNotMatch(h, /Quando a organização liberar/)
  assert.match(h, /<p tabindex="-1" class="ui-nota ui-nota--erro" role="alert">Esse horário acabou de ser escolhido por outra marca/)
  assert.ok(h.indexOf('role="alert"') < h.indexOf('class="fm-dias"'), 'o aviso aparece antes das vagas')
  // Sucesso: papel "status" (anunciado), e o módulo já mostra a sessão agendada.
  const agendada = estadoDaSessao({ participacao: liberada, minhas: [futuro('agendada')], vagas: [] })
  const ok = html(Agendamento, { situacao: 'pronto', estado: agendada, minhas: [futuro('agendada')], vagas: [], reservando: null, aviso: { tom: 'ok', texto: 'Horário reservado. A organização é avisada.' }, onReservar() {}, onTentar() {} })
  assert.match(ok, /<p tabindex="-1" class="ui-nota ui-nota--ok" role="status">Horário reservado/)
  assert.match(ok, /Sessão agendada/)
  assert.doesNotMatch(ok, /class="fm-dias"/, 'agendada: nenhuma vaga clicável')
  // Ainda não liberada: aí sim "quando a organização liberar".
  const espera = estadoDaSessao({ participacao: { ...liberada, foto_liberacao: 'pendente' }, vagas })
  assert.match(html(Agendamento, { situacao: 'pronto', estado: espera, minhas: [], vagas, reservando: null, aviso: null, onReservar() {}, onTentar() {} }), /Quando a organização liberar/)
  // Sem aviso, nada é desenhado no lugar dele.
  assert.doesNotMatch(html(Agendamento, { situacao: 'pronto', estado: escolher, minhas: [], vagas, reservando: null, aviso: null, onReservar() {}, onTentar() {} }), /role="(alert|status)"/)
})

test('a lista "O que falta nas fotos" desenha a solicitação com o botão "Responder"', () => {
  const h = html(PendenciasFotos, { itens: [{ tipo: 'pedido', titulo: 'Mandar o cardápio fotografado', texto: 'Prazo: 30/10/2026', link: 'pedidos/p1', acao: 'Responder' }], abrirLink() {} })
  assert.match(h, /O que falta nas fotos/)
  assert.match(h, /data-tipo="pedido"/)
  assert.match(h, /Mandar o cardápio fotografado/)
  assert.match(h, />Responder<\/button>/)
  assert.equal(html(PendenciasFotos, { itens: [] }), '', 'sem pendência o bloco nem aparece')
})

test('as pendências da aba vêm do guia, sem recalcular: marcar a sessão e conferir as fotos oficiais', () => {
  const resumo = resumoMarca({
    participante: { nome_marca: 'Casa', responsavel: 'Ana', telefone: '(84) 99999-8888' },
    participacao: { ...liberada, logo_id: 'l', tema_combo: 't', tema_justificativa: 'j' },
    itens: [], unidades: [{ endereco: 'Rua A' }], sessoes: [], vagasAbertas: 2, fotosParaLer: 1, arquivosParaLer: 3,
  })
  const itens = pendenciasDeFotos(resumo)
  assert.deepEqual(itens.map((p) => p.tipo).sort(), ['arquivo', 'fotos'])
  assert.ok(itens.every((p) => p.vista === 'fotos'), 'os documentos para ler são da aba Arquivos, não desta')
  assert.deepEqual(pendenciasDeFotos(null), [])
  assert.deepEqual(pendenciasDeFotos({}), [])
})

test('solicitação da organização sobre as fotos (bloco "fotos") entra na lista da aba — a lista e o selo são o mesmo número', () => {
  const base = {
    participante: { nome_marca: 'Casa', responsavel: 'Ana', telefone: '(84) 99999-8888' },
    participacao: { ...liberada, logo_id: 'l', tema_combo: 't', tema_justificativa: 'j' },
    itens: [], unidades: [{ endereco: 'Rua A' }], sessoes: [sessao('agendada')], vagasAbertas: 0,
  }
  const pedidoFotos = { id: 'p1', titulo: 'Mandar o cardápio fotografado', bloco: 'fotos', prioridade: 'normal', estado: 'pendente', prazo_em: null }
  const pedidoCombo = { id: 'p2', titulo: 'Rever a descrição', bloco: 'combo', prioridade: 'normal', estado: 'pendente', prazo_em: null }
  const r = resumoMarca({ ...base, pedidos: [pedidoFotos, pedidoCombo] })
  const itens = pendenciasDeFotos(r)
  assert.deepEqual(itens.map((p) => [p.tipo, p.link]), [['pedido', 'pedidos/p1']], 'a de bloco combo é da aba Meu combo')
  assert.equal(itens.length, r.contagem.fotos, 'o selo da aba conta exatamente o que a lista mostra')
  // Misturado com sessão por marcar e foto por conferir: tudo o que o selo conta aparece, e "enviar" nunca.
  const tudo = resumoMarca({ ...base, sessoes: [], vagasAbertas: 2, fotosParaLer: 1, pedidos: [pedidoFotos] })
  assert.deepEqual(pendenciasDeFotos(tudo).map((p) => p.tipo).sort(), ['arquivo', 'fotos', 'pedido'])
  assert.equal(pendenciasDeFotos(tudo).reduce((n, p) => n + (p.qtd || 1), 0), tudo.contagem.fotos)
  assert.ok(pendenciasDeFotos(tudo).every((p) => p.tipo !== 'enviar'))
  // A tela leva a solicitação à tela Solicitações pelo link que o guia já gravou.
  const pend = ler('painel-app/src/components/vistas-marca/fotos/PendenciasFotos.jsx')
  assert.match(pend, /pedido: 'Responder'/)
  assert.match(pend, /abrirLink && p\.link && abrirLink\(p\.link\)/)
  assert.match(ler('painel-app/src/components/vistas-marca/Fotos.jsx'), /<PendenciasFotos itens=\{pendenciasDeFotos\(resumo\)\} abrirLink=\{abrirLink\} \/>/)
})

/* ── Reservar: o que o banco respondeu, em português ─────────────────────── */

const v1 = { id: 'v1', data_hora: '2026-11-05T15:30:00Z' }
const AGORA = new Date('2026-10-22T12:00:00Z')

test('reserva confirmada só quando o servidor devolve a linha', () => {
  const r = interpretarReserva({ linhas: [{ id: 'v1', status: 'agendada' }], vaga: v1, agora: AGORA })
  assert.equal(r.tom, 'ok')
  assert.equal(r.reservou, true)
  assert.match(r.texto, /Horário reservado\. A organização é avisada\./)
})

test('erro de concorrência: nenhuma linha mudou = outra marca pegou antes; a vaga sai da tela', () => {
  const r = interpretarReserva({ linhas: [], vaga: v1, agora: AGORA })
  assert.equal(r.tom, 'erro')
  assert.equal(r.texto, 'Esse horário acabou de ser escolhido por outra marca. Escolha outro.')
  assert.equal(r.texto, TEXTO_CONCORRENCIA)
  assert.equal(r.tirarVaga, true)
  assert.equal(r.reservou, undefined)
  // Resposta sem corpo (null) é a mesma coisa: nada foi gravado.
  assert.equal(interpretarReserva({ linhas: null, vaga: v1, agora: AGORA }).texto, TEXTO_CONCORRENCIA)
})

test('horário que passou enquanto a tela estava aberta tem recado próprio', () => {
  const r = interpretarReserva({ linhas: [], vaga: v1, agora: new Date('2026-11-05T16:00:00Z') })
  assert.equal(r.texto, 'Esse horário já passou. Escolha outro.')
  assert.equal(r.tirarVaga, true)
})

test('erros do servidor viram frase: já tem sessão, modo visualização, sem liberação, sem conexão, genérico', () => {
  const t = (erro) => interpretarReserva({ erro, vaga: v1, agora: AGORA })
  assert.equal(t(Object.assign(new Error('duplicate key value violates unique constraint'), { codigo: '23505' })).texto, 'Sua marca já tem uma sessão marcada.')
  assert.equal(t(new Error('modo_visualizacao')).texto, 'Modo visualização: você está vendo como a marca, e nada é gravado.')
  assert.match(t(Object.assign(new Error('new row violates row-level security policy'), { codigo: '42501' })).texto, /ainda não liberou/)
  assert.match(t(new Error('Failed to fetch')).texto, /Sem conexão/)
  assert.match(t(Object.assign(new Error('The operation timed out'), { name: 'TimeoutError' })).texto, /Sem conexão/)
  const generico = t(new Error('http_500'))
  assert.equal(generico.texto, 'Não deu para reservar agora. Tente de novo.')
  assert.equal(generico.tom, 'erro')
  assert.equal(generico.tirarVaga, undefined, 'erro de rede não prova que a vaga se foi')
})

test('a pergunta antes de reservar diz o quê, quando e onde — e não inventa o que falta', () => {
  const t = textoDeConfirmarReserva({ id: 'v1', data_hora: '2026-11-05T15:30:00Z', local: 'Rua X, 100' }, FZ)
  assert.match(t, /^Reservar quinta-feira, 5 de novembro de 2026, às 12:30\?/)
  assert.match(t, /Local: Rua X, 100/)
  assert.match(t, /falar com a organização/)
  const semLocal = textoDeConfirmarReserva({ id: 'v1', data_hora: '2026-11-05T15:30:00Z', local: null }, FZ)
  assert.match(semLocal, /Local: a organização ainda vai confirmar\./)
})

/* ── Falha de leitura nunca vira "vazio" ─────────────────────────────────── */

test('sem dado e com erro: erro (nunca "vazio"); lista vazia só depois de ler de verdade', () => {
  assert.equal(situacaoDaLeitura({ dados: null, erro: 'http_500' }), 'erro')
  assert.equal(situacaoDaLeitura({ dados: undefined, erro: 'Failed to fetch' }), 'erro')
  assert.equal(situacaoDaLeitura({ dados: null, erro: null }), 'carregando')
  assert.equal(situacaoDaLeitura({}), 'carregando')
  assert.equal(situacaoDaLeitura({ dados: [], erro: null }), 'pronto', 'lista vazia lida com sucesso')
  assert.equal(situacaoDaLeitura({ dados: [{ id: 1 }], erro: 'releitura falhou' }), 'pronto', 'o dado anterior fica na tela')
  assert.equal(situacaoDaLeitura({ dados: [], erro: 'releitura falhou' }), 'pronto')
})

test('sem a leitura da conferência não se afirma que a pessoa ainda não conferiu', () => {
  const a = { id: 'f1', exige_leitura: true }
  assert.equal(situacaoDaConferencia(a, {}, true), 'pendente')
  assert.equal(situacaoDaConferencia(a, {}, false), 'desconhecida')
  assert.equal(situacaoDaConferencia(a, { f1: '2026-10-22T10:00:00Z' }, false), 'lido')
  assert.equal(situacaoDaConferencia({ id: 'f2', exige_leitura: false }, {}, true), 'nao_exige')
  assert.equal(situacaoDaConferencia(null, {}, true), 'nao_exige')
})

/* ── Fotos oficiais ──────────────────────────────────────────────────────── */

test('miniatura só para imagem; detalhe mostra formato e tamanho quando o dado existe', () => {
  assert.equal(ehImagem({ mime: 'image/jpeg', path: 'x/a.jpg' }), true)
  assert.equal(ehImagem({ mime: '', path: 'x/a.WEBP' }), true)
  assert.equal(ehImagem({ mime: 'application/pdf', path: 'x/a.pdf' }), false)
  assert.equal(ehImagem({ path: 'x/a' }), false)
  assert.match(detalheDaFoto({ mime: 'image/jpeg', path: 'x/a.jpg', tamanho: 2457600, versao: 2, publicado_em: '2026-10-21T12:00:00Z' }), /^Imagem JPG · 2,3 MB · versão 2 · 21\/10\/(20)?26$/)
  assert.equal(detalheDaFoto({ mime: 'image/png', path: 'x/a.png' }).startsWith('Imagem PNG'), true)
  assert.doesNotMatch(detalheDaFoto({ mime: 'image/png', path: 'x/a.png' }), /undefined|null|NaN/)
})

/* ── A tela (texto-fonte) ────────────────────────────────────────────────── */

const PASTA = 'painel-app/src/components/vistas-marca/fotos/'
const pecas = () => readdirSync(new URL('../' + PASTA, import.meta.url)).filter((f) => /\.(jsx?|js)$/.test(f))

test('Fotos.jsx monta os três blocos na ordem do pedido e mantém o consumo do alvo', () => {
  const f = ler('painel-app/src/components/vistas-marca/Fotos.jsx')
  const ordem = ['<Agendamento', '<Preparacao', '<FotosOficiais'].map((t) => f.indexOf(t))
  assert.ok(ordem.every((i) => i > 0) && ordem[0] < ordem[1] && ordem[1] < ordem[2], 'agendamento, preparação, fotos oficiais')
  assert.match(f, /fotos-marca\.css/)
  assert.match(f, /!alvo\.id && consumirAlvo/, 'alvo sem id é consumido aqui; o com id, nas fotos oficiais')
  assert.match(f, /irPara=\{irPara\}/, 'o guia segue a um toque (irPara)')
  assert.doesNotMatch(f, /window\.(confirm|prompt|alert)|setInterval/)
  assert.match(f, /erroResumo/, 'sem os dados da marca: erro com "tentar de novo", não tela vazia')
})

test('reserva: o mesmo caminho de antes (PATCH só na vaga aberta, confirmado pela linha devolvida), com pergunta e sem gravar em "Ver como"', () => {
  const h = ler(PASTA + 'useSessoesFotos.js')
  assert.match(h, /api\('sessoes_fotos\?id=eq\.' \+ vaga\.id \+ '&status=eq\.aberto'/)
  assert.match(h, /metodo: 'PATCH'/)
  assert.match(h, /prefer: 'return=representation'/)
  assert.match(h, /status: 'agendada', participacao_id: participacao\.id, participante_id: participante\.id/)
  assert.match(h, /emVerComo\(\)/)
  assert.match(h, /await confirmar\(textoDeConfirmarReserva\(vaga\)/)
  // A pergunta vem antes de qualquer gravação.
  assert.ok(h.indexOf('await confirmar(') < h.indexOf("metodo: 'PATCH'"))
  // Releitura que falha mantém a lista e rejeita; sem dado nenhum, o erro aparece (nunca lista vazia).
  assert.match(h, /if \(!temDados\.current\) setErro\(/)
  assert.match(h, /useSincronizar\(\['fotos', 'participantes'\], carregar\)/)
  assert.match(h, /useGuarda\(\)/)
  // A vaga perdida sai da lista mesmo que a releitura falhe.
  assert.match(h, /if \(res\.tirarVaga\) tirar\(\)/)
})

test('fotos oficiais: usa só as leituras e o endereço assinado que já existiam; confirma depois de gravar', () => {
  const fo = ler(PASTA + 'FotosOficiais.jsx')
  const mini = ler(PASTA + 'Miniatura.jsx')
  assert.match(fo, /useSincronizar\(\['arquivos', 'participantes'\], carregar\)/)
  assert.match(fo, /api\('arquivo_leitura'/)
  // O endereço assinado vem do mesmo hook da aba Arquivos (que chama `assinarDownload(a.path)`).
  assert.match(fo, /useAcessoArquivo\(setAviso\)/)
  assert.match(ler('painel-app/src/components/vistas-marca/arquivos/useAcessoArquivo.js'), /assinarDownload\(a\.path\)/)
  assert.match(mini, /assinarDownload\(arquivo\.path\)/)
  for (const t of [fo, mini]) assert.doesNotMatch(t, /storage\/v1\/object\/public|chamarFuncao|arquivo-url|SUPABASE_URL/, 'nada público, nenhum caminho novo')
  // Download individual e "Conferi as fotos" continuam.
  assert.match(fo, /Conferi as fotos/)
  assert.match(fo, /Confirme que conferiu/)
  assert.match(fo, /Conferência confirmada em/)
  // `setLidos` só DEPOIS da gravação confirmada, dentro do mesmo try (falha de gravação não marca como conferido).
  const c = fo.slice(fo.indexOf('async function conferir'), fo.indexOf('const situacao'))
  assert.ok(c.indexOf("await api('arquivo_leitura'") < c.indexOf('setLidos('))
  assert.ok(c.indexOf('setLidos(') < c.indexOf('} catch'))
  assert.match(c.slice(c.indexOf('} catch')), /setAviso\(/)
  // Falha de leitura: erro com "tentar de novo"; vazio só dentro de "pronto".
  assert.match(fo, /situacao === 'erro' && <Erro/)
  assert.match(fo, /situacao === 'pronto' && arquivos\.length === 0/)
  // Aviso de foto oficial (`irPara('fotos', { id })`): destaca e consome.
  assert.match(fo, /alvo\.id/)
  assert.match(fo, /consumirAlvo\(\)/)
})

test('reserva confirmada entra na lista pela linha que o servidor devolveu — releitura fora do ar não deixa a vaga à vista', () => {
  const h = ler(PASTA + 'useSessoesFotos.js')
  assert.match(h, /const aplicar = \(linha\) => setSessoes\(\(l\) => \(l \? l\.map\(\(x\) => \(x\.id === linha\.id \? \{ \.\.\.x, \.\.\.linha \} : x\)\) : l\)\)/)
  assert.match(h, /if \(res\.tirarVaga\) tirar\(\)\s*else if \(res\.reservou\) aplicar\(r\[0\]\)/)
  // E aplicar antes da releitura (que pode falhar): a ordem no código.
  assert.ok(h.indexOf('aplicar(r[0])') < h.indexOf('await carregar().catch(() => {})'))
  // Efeito, com as funções puras de verdade: a vaga reservada sai de `vagas`, entra em `minhas` e o estado vira "agendada".
  const participacao = liberada
  const abertas = [{ id: 'v1', status: 'aberto', participante_id: null, participacao_id: null, edicao_codigo: '2026.2', data_hora: '2099-11-05T15:30:00Z' },
    { id: 'v2', status: 'aberto', participante_id: null, participacao_id: null, edicao_codigo: '2026.2', data_hora: '2099-11-05T17:30:00Z' }]
  assert.equal(estadoDaSessao({ participacao, ...fotosDaParticipacao(abertas, participacao) }).chave, 'escolher')
  const linha = { ...abertas[0], status: 'agendada', participacao_id: participacao.id, participante_id: 'pe' }   // o que o PATCH devolve
  const depois = abertas.map((x) => (x.id === linha.id ? { ...x, ...linha } : x))                                   // o que `aplicar` faz
  const { minhas, vagas } = fotosDaParticipacao(depois, participacao)
  assert.deepEqual([minhas.map((s) => s.id), vagas.map((s) => s.id)], [['v1'], ['v2']])
  const e = estadoDaSessao({ participacao, minhas, vagas })
  assert.equal(e.chave, 'agendada')
  assert.equal(e.sessao.id, 'v1')
  // Sem aplicar (o defeito), a tela seguiria em "escolher" com a vaga dela clicável.
  assert.equal(estadoDaSessao({ participacao, ...fotosDaParticipacao(abertas, participacao) }).chave, 'escolher')
})

test('agendamento: o resultado da reserva nasce junto do estado (não depois da grade de vagas) e recebe o foco', () => {
  const a = ler(PASTA + 'Agendamento.jsx')
  assert.match(a, /<AvisoComFoco aviso=\{aviso\} \/>/)
  assert.ok(a.indexOf('<AvisoComFoco') < a.indexOf('<Vagas grupos'), 'o aviso vem antes das vagas, ao lado do estado')
  assert.ok(a.indexOf('<AvisoComFoco') < a.indexOf('<DadosDaSessao'), 'e antes dos dados da sessão')
  assert.doesNotMatch(a, /role=\{aviso\.tom/, 'o papel (alert/status) é de AvisoComFoco, não de um <p> solto no fim')
  const comp = ler('painel-app/src/components/vistas-marca/AvisoComFoco.jsx')
  assert.match(comp, /tabIndex=\{-1\}/)
  assert.match(comp, /ref\.current\.focus\(\)/)
  assert.match(comp, /role=\{erro \? 'alert' : 'status'\}/)
})

test('fotos oficiais: Baixar baixa de verdade (link com `download`), Abrir mostra, e a nota diz o que acontece em cada aparelho', () => {
  const fo = ler(PASTA + 'FotosOficiais.jsx')
  const hook = ler('painel-app/src/components/vistas-marca/arquivos/useAcessoArquivo.js')
  // Mesmas peças da aba Arquivos: nome com extensão + `download`; nada de "salvo".
  assert.match(hook, /urlParaBaixar\(url, nomeArquivo\(a\.nome, a\.mime, a\.path\)\)/)
  assert.match(fo, /notaDeAbertura\(plat, \{ fotos: true \}\)/)
  assert.match(fo, /plat = React\.useMemo\(\(\) => plataforma\(\), \[\]\)/)
  assert.match(fo, /acessar\(a, 'baixar'\)/)
  assert.match(fo, /acessar\(a, 'abrir'\)/)
  assert.match(fo, /acoesDoArquivo\(a\)\.abrir/, 'o "Abrir" só para o que o navegador sabe mostrar')
  assert.doesNotMatch(fo, /function baixar|window\.open|location\.href/, 'a mecânica não foi copiada para cá')
  // O botão não promete o que não faz: "Abrindo…" é do Abrir; o Baixar diz "Preparando…".
  assert.match(fo, /ocupado\.modo === 'baixar' \? 'Preparando…' : 'Baixar'/)
  assert.doesNotMatch(fo, /Não deu para abrir a foto/)
  // A nota que o iPhone lê existe, para foto: Compartilhar › Salvar imagem.
  assert.match(notaDeAbertura({ ios: true, safari: true }, { fotos: true }), /Compartilhar › Salvar imagem/)
})

test('fotos oficiais, acessibilidade: nome nos dois botões, resultado dentro do cartão com foco, sem aviso solto no fim da lista', () => {
  const fo = ler(PASTA + 'FotosOficiais.jsx')
  assert.match(fo, /aria-label=\{'Baixar ' \+ a\.nome\}/)
  assert.match(fo, /aria-label=\{'Abrir ' \+ a\.nome\}/)
  assert.match(fo, /aria-label=\{'Conferi as fotos: ' \+ a\.nome\}/)
  // O aviso é por foto ({ id, tom, texto }) e mora no <li> dela, com role/foco do componente comum.
  assert.match(fo, /<AvisoComFoco aviso=\{aviso && aviso\.id === a\.id \? aviso : null\} \/>/)
  const li = fo.slice(fo.indexOf('<li key={a.id}'), fo.indexOf('</li>'))
  assert.ok(li.includes('<AvisoComFoco'), 'dentro do cartão')
  assert.doesNotMatch(fo, /<p className="ui-nota ui-nota--erro" role="alert">\{aviso\}<\/p>/, 'o <p role="alert"> solto depois da lista saiu')
  assert.doesNotMatch(fo, /setAviso\('/, 'o aviso sempre leva o id da foto')
  // O resultado de "Conferi as fotos" é dito (o botão some depois de gravar).
  assert.match(fo, /setAviso\(\{ id: a\.id, tom: 'ok', texto: 'Conferência registrada\.' \}\)/)
  assert.ok(fo.indexOf("await api('arquivo_leitura'") < fo.indexOf("tom: 'ok', texto: 'Conferência registrada.'"), 'só diz depois de gravar')
})

test('fotos oficiais em "Ver como participante": a gravação recusada diz a frase do modo, não "tente de novo"', () => {
  const fo = ler(PASTA + 'FotosOficiais.jsx')
  assert.match(fo, /import \{[^}]*traduzirErro[^}]*\} from '\.\.\/\.\.\/ui'/)
  const c = fo.slice(fo.indexOf('async function conferir'), fo.indexOf('const situacao'))
  assert.match(c.slice(c.indexOf('} catch')), /e && e\.message === 'modo_visualizacao' \? traduzirErro\(e\.message\) : 'Não deu para registrar a conferência agora\. Tente de novo\.'/)
  assert.doesNotMatch(c.slice(c.indexOf('} catch')), /setLidos\(/, 'a falha nunca marca como conferido')
  // A frase que o aviso mostra é a do modo (traduzida), a mesma da reserva e dos Arquivos.
  assert.equal(interpretarReserva({ erro: new Error('modo_visualizacao') }).texto, 'Modo visualização: você está vendo como a marca, e nada é gravado.')
})

test('miniatura: preguiçosa, com texto alternativo, uma nova tentativa e queda para ícone + nome', () => {
  const m = ler(PASTA + 'Miniatura.jsx')
  assert.match(m, /IntersectionObserver/)
  assert.match(m, /loading="lazy"/)
  // O nome da foto já está em texto ao lado: o alt vazio evita o leitor de tela dizê-lo duas vezes.
  assert.match(m, /<img src=\{url\} alt=""/)
  assert.doesNotMatch(m, /alt=\{'Prévia da foto/)
  assert.match(m, /tentouDeNovo/)
  assert.match(m, /fm-mini__sem/)
  assert.match(m, /<span>\{arquivo\.nome\}<\/span>/)
})

test('os ícones das peças existem (literais, mapas e ternários)', () => {
  const arquivos = pecas().filter((f) => f.endsWith('.jsx'))
  assert.ok(arquivos.length >= 5)
  let vistos = 0
  for (const f of arquivos) {
    const txt = ler(PASTA + f)
    for (const m of txt.matchAll(/(?:nome|icone)="([a-z0-9/-]+)"/g)) { vistos++; assert.ok(existe(m[1]), f + ': ícone inexistente "' + m[1] + '"') }
    for (const m of txt.matchAll(/(?:nome|icone)=\{[^}]*?\?\s*'([a-z0-9/-]+)'\s*:\s*'([a-z0-9/-]+)'/g)) {
      vistos += 2
      assert.ok(existe(m[1]) && existe(m[2]), f + ': ícone inexistente em ' + m[0])
    }
  }
  assert.ok(vistos >= 12)
})

test('alvos de toque e peças: todo botão é da família de 44px+ (og-btn--mini, mc-vaga) e não há barra presa', () => {
  for (const f of pecas().filter((x) => x.endsWith('.jsx'))) {
    const txt = ler(PASTA + f)
    for (const m of txt.matchAll(/<button\b[^>]*>/g)) assert.match(m[0], /og-btn|mc-vaga/, f + ': botão fora da família de alvo grande: ' + m[0])
    assert.doesNotMatch(txt, /position:\s*sticky|position:\s*fixed/)
  }
  const css = ler('painel-app/src/styles/fotos-marca.css')
  assert.doesNotMatch(css, /position\s*:\s*(sticky|fixed)/)
  // Nenhuma altura desta aba derruba o alvo de toque: tudo que declara altura tem 44px ou mais.
  for (const m of css.matchAll(/(?:min-)?height\s*:\s*(\d+)px/g)) assert.ok(Number(m[1]) >= 44, 'altura abaixo de 44px: ' + m[0])
})

test('estilo da aba: só tokens (sem hex, raio ou fonte literal), sem caixa-alta, sem animação, sem rolagem horizontal', () => {
  const css = ler('painel-app/src/styles/fotos-marca.css')
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, 'cor literal')
  assert.doesNotMatch(css, /rgba?\(/, 'cor literal')
  assert.doesNotMatch(css, /text-transform\s*:\s*uppercase/)
  assert.doesNotMatch(css, /@keyframes|animation\s*:|transition\s*:/)
  assert.doesNotMatch(css, /overflow-x\s*:\s*scroll|width\s*:\s*\d{4,}px/)
  for (const m of css.matchAll(/border-radius:([^;}]+)/g)) {
    const v = m[1].trim()
    assert.ok(v.startsWith('var(--r-') || ['999px', '50%'].includes(v), 'raio solto: ' + v)
  }
  for (const m of css.matchAll(/font:[^;}]*?\d+(?:\.\d+)?px\/[\d.]+\s+([^;}]+)/g)) assert.match(m[1].trim(), /^var\(--f-/, 'família literal: ' + m[1])
  for (const m of css.matchAll(/font:\s*(\d{3})\b/g)) assert.ok(['400', '700'].includes(m[1]), 'peso fora de 400/700: ' + m[1])
})
