import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  momentoEdicao, diasAte, itemDoCronograma, proximosDoCronograma, textoPrazo, resumoTrajetoria,
  filtrarContatos, agruparTemas, resumoVendas, diasDoFestival,
} from '../painel-app/src/lib/operacao.js'
import { proximosPassos } from '../painel-app/src/lib/hoje.js'

// Cronograma da 2026.2 como veio da organização (vira linha no banco, não
// constante no código — aqui é só o fixture do teste).
const EDICAO = { festival_inicio: '2026-11-05', festival_fim: '2026-11-15' }
const CRONO = [
  { chave: 'tema', tipo: 'prazo', fim: '2026-09-30', ordem: 20, visivel_participante: true },
  { chave: 'combo', tipo: 'prazo', fim: '2026-10-05', ordem: 30, visivel_participante: true },
  { chave: 'fotos', tipo: 'periodo', inicio: '2026-10-01', fim: '2026-10-04', ordem: 40, visivel_participante: true },
  { chave: 'fotos', tipo: 'periodo', inicio: '2026-10-13', fim: '2026-10-18', ordem: 41, visivel_participante: true },
  { chave: 'interno', tipo: 'marco', inicio: '2026-10-02', ordem: 45, visivel_participante: false },
  { chave: 'festival', tipo: 'periodo', inicio: '2026-11-05', fim: '2026-11-15', ordem: 60, visivel_participante: true },
]

test('momento da edição vem das datas, e sem datas não afirma nada', () => {
  assert.equal(momentoEdicao(EDICAO, '2026-09-28'), 'antes')
  assert.equal(momentoEdicao(EDICAO, '2026-11-05'), 'durante')
  assert.equal(momentoEdicao(EDICAO, '2026-11-15'), 'durante')
  assert.equal(momentoEdicao(EDICAO, '2026-11-16'), 'depois')
  assert.equal(momentoEdicao({ festival_inicio: null }, '2026-11-10'), 'indefinido')
})

test('diasAte conta dias de calendário, sem fuso', () => {
  assert.equal(diasAte('2026-09-30', '2026-09-28'), 2)
  assert.equal(diasAte('2026-09-28', '2026-09-28'), 0)
  assert.equal(diasAte('2026-10-01', '2026-09-30'), 1)
  assert.equal(diasAte(null, '2026-09-28'), null)
})

test('cronograma: o próximo período de fotos e o que a marca vê', () => {
  assert.equal(itemDoCronograma(CRONO, 'fotos', '2026-10-02').inicio, '2026-10-01')
  assert.equal(itemDoCronograma(CRONO, 'fotos', '2026-10-06').inicio, '2026-10-13')
  const prox = proximosDoCronograma(CRONO, '2026-10-01', 10)
  assert.ok(!prox.some((i) => i.chave === 'interno'), 'item escondido da marca vazou')
  assert.ok(!prox.some((i) => i.chave === 'tema'), 'prazo vencido continua na lista')
  assert.equal(textoPrazo(CRONO[0], '2026-09-30'), 'vence hoje')
  assert.equal(textoPrazo(CRONO[0], '2026-09-29'), 'vence amanhã')
  assert.equal(textoPrazo(CRONO[2], '2026-10-02'), 'acontecendo agora')
})

test('trajetória: recorrente e primeira edição só com confirmação', () => {
  assert.equal(resumoTrajetoria({ status: 'sem_correspondencia_no_acervo', participacoes: 1 }).tipo, 'neutro',
    'ausência no acervo NÃO é primeira edição')
  assert.equal(resumoTrajetoria({ status: 'possivel_correspondencia', participacoes: 5 }).tipo, 'neutro',
    'sugestão não confirmada não vira história')
  assert.equal(resumoTrajetoria({ status: 'novo_confirmado', participacoes: 1 }).tipo, 'primeira')
  const r = resumoTrajetoria({ status: 'recorrente_confirmado', participacoes: 6, podios: 2, primeiros_lugares: 1,
    primeira: { codigo: '2022', nome: 'Movies' } })
  assert.equal(r.tipo, 'recorrente')
  assert.equal(r.participacoes, 6)
  assert.equal(r.desdeCodigo, '2022')
  assert.equal(r.premios, 2)
})

test('filtros de relacionamento mostram contexto, não escolhem', () => {
  const L = [
    { nome: 'A', tipo: 'influenciador', recebimentos: 2, recebeu_ultima: true, incompleto: false },
    { nome: 'B', tipo: 'convidado', recebimentos: 0, recebeu_ultima: false, incompleto: true },
    { nome: 'C', tipo: 'influenciador', recebimentos: 1, recebeu_ultima: false, incompleto: false, atual: { status: 'selecionado' } },
  ]
  assert.deepEqual(filtrarContatos(L, 'nunca_receberam').map((c) => c.nome), ['B'])
  assert.deepEqual(filtrarContatos(L, 'ja_receberam').map((c) => c.nome), ['A', 'C'])
  assert.deepEqual(filtrarContatos(L, 'receberam_ultima').map((c) => c.nome), ['A'])
  assert.deepEqual(filtrarContatos(L, 'selecionados').map((c) => c.nome), ['C'])
  assert.deepEqual(filtrarContatos(L, 'todos').map((c) => c.nome), ['A', 'B', 'C'], 'a ordem é a do banco (nome), sem ranking')
})

test('temas iguais viram conflito, na ordem de prioridade do banco', () => {
  const g = agruparTemas([
    { tema: 'Pica-Pau', tema_norm: 'pica pau', prioridade: 2, status: 'proposto' },
    { tema: 'Pica Pau', tema_norm: 'pica pau', prioridade: 1, status: 'proposto' },
    { tema: 'Popeye', tema_norm: 'popeye', prioridade: 1, status: 'aprovado' },
  ])
  assert.equal(g[0].chave, 'pica pau')
  assert.equal(g[0].conflito, true)
  assert.equal(g[0].itens[0].prioridade, 1)
  assert.equal(g[1].aprovado.tema, 'Popeye')
})

test('vendas: quem falta hoje conta só marca com conta', () => {
  const r = resumoVendas({ hoje: '2026-11-06', marcas: [
    { tem_conta: true, registrou_hoje: true, total: 30, dias: { '2026-11-06': 12 } },
    { tem_conta: true, registrou_hoje: false, total: 10, dias: {} },
    { tem_conta: false, registrou_hoje: false, total: 0, dias: {} },
  ] })
  assert.deepEqual(r, { total: 40, registraramHoje: 1, faltamHoje: 1, totalHoje: 12 })
  assert.equal(diasDoFestival('2026-11-05', '2026-11-15').length, 11)
})

test('próxima ação: sem os dados novos, o resultado é o mesmo de antes', () => {
  const r = proximosPassos({ faltam: ['o tema'], statusCadastro: 'em_preenchimento' })
  assert.deepEqual(r.passos.map((p) => p.chave), ['cadastro'])
})

test('próxima ação: durante o festival, venda do dia é urgente', () => {
  const r = proximosPassos({ statusCadastro: 'cadastro_completo', momento: 'durante', vendaHojeRegistrada: false })
  assert.equal(r.passos[0].chave, 'venda')
  assert.equal(r.passos[0].tom, 'urgente')
  const ok = proximosPassos({ statusCadastro: 'cadastro_completo', momento: 'durante', vendaHojeRegistrada: true })
  assert.ok(!ok.passos.some((p) => p.chave === 'venda'))
})

test('próxima ação: correção pedida leva direto ao cadastro, com a nota', () => {
  const r = proximosPassos({ statusCadastro: 'em_preenchimento', combo: { status: 'correcao_solicitada', nota: 'Trocar a bebida' } })
  const p = r.passos.find((x) => x.chave === 'combo')
  assert.equal(p.destino, 'cadastro')
  assert.equal(p.detalhe, 'Trocar a bebida')
  assert.ok(!r.passos.some((x) => x.chave === 'cadastro' || x.chave === 'concluir'), 'dois passos para o mesmo lugar')
})

test('próxima ação: tema recusado é urgente; aprovado vira feito', () => {
  assert.equal(proximosPassos({ tema: { status: 'recusado', tema: 'X' } }).passos[0].chave, 'tema')
  assert.ok(proximosPassos({ tema: { status: 'aprovado', tema: 'X' } }).feitos.some((f) => f.chave === 'tema'))
})

test('próxima ação: prazo do combo apertado deixa o cadastro urgente', () => {
  const agora = new Date('2026-10-03T12:00:00').getTime()
  const r = proximosPassos({ faltam: ['o preço'], prazoCombo: '2026-10-05', agora })
  assert.equal(r.passos[0].tom, 'urgente')
  assert.match(r.passos[0].detalhe, /vence em 2 dias/)
})

test('próxima ação: foto não liberada não inventa motivo', () => {
  const r = proximosPassos({ fotoLiberacao: 'nao_liberado' })
  const p = r.passos.find((x) => x.chave === 'foto_liberacao')
  assert.ok(p)
  assert.doesNotMatch(p.texto + ' ' + p.detalhe, /pagamento|taxa/i)
})
