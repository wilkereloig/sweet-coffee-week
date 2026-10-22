import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  diaDoFormulario, rotuloDoDia, textoDaVenda, msAteMeiaNoite, comVendaGravada,
  fotoDoPedido, mudancaDoPedido, textoDaMudanca, repartirPedidos, rascunhosSemPedido,
  idsParaMarcarLidas,
} from '../painel-app/src/lib/sincMarca.js'
import { iniciarRegistro, reduzirRegistro, registroSujo } from '../painel-app/src/lib/sync/mesclar.js'

// ── Início: venda do dia ─────────────────────────────────────────────────────

test('o campo de vendas acompanha o dia de hoje, salvo com número digitado e não salvo', () => {
  assert.equal(diaDoFormulario({ hoje: '2026-10-20', atual: '2026-10-19', sujo: false }), '2026-10-20', 'sem rascunho: vira o dia e o campo vira junto')
  assert.equal(diaDoFormulario({ hoje: '2026-10-20', atual: '2026-10-19', sujo: true }), '2026-10-19', 'com rascunho: a meia-noite não muda o dia da venda')
  assert.equal(diaDoFormulario({ hoje: '2026-10-20', atual: null, sujo: true }), '2026-10-20')
})

test('rótulo do campo: Hoje, Ontem ou dd/mm (inclusive na virada do mês)', () => {
  assert.equal(rotuloDoDia('2026-10-20', '2026-10-20'), 'Hoje')
  assert.equal(rotuloDoDia('2026-10-19', '2026-10-20'), 'Ontem')
  assert.equal(rotuloDoDia('2026-10-31', '2026-11-01'), 'Ontem')
  assert.equal(rotuloDoDia('2026-10-17', '2026-10-20'), '17/10')
})

test('quantidade do dia como texto de campo; sem lançamento = vazio', () => {
  const vendas = [{ id: 'a', dia: '2026-10-20', quantidade: 0 }, { id: 'b', dia: '2026-10-19', quantidade: 12 }]
  assert.equal(textoDaVenda(vendas, '2026-10-20'), '0', 'zero lançado não é "nada lançado"')
  assert.equal(textoDaVenda(vendas, '2026-10-19'), '12')
  assert.equal(textoDaVenda(vendas, '2026-10-18'), '')
  assert.equal(textoDaVenda(null, '2026-10-18'), '')
})

test('tempo até a virada do dia cai um segundo depois da meia-noite', () => {
  assert.equal(msAteMeiaNoite(new Date(2026, 9, 20, 23, 59, 30)), 31000)
  assert.equal(msAteMeiaNoite(new Date(2026, 9, 20, 0, 0, 0)), 24 * 3600 * 1000 + 1000)
  assert.ok(msAteMeiaNoite(new Date(2026, 9, 20, 23, 59, 59, 999)) >= 1000, 'nunca um laço de timers de 0 ms')
})

test('venda gravada entra no lugar certo (mais recente primeiro) e substitui a mesma linha', () => {
  const base = [{ id: 'b', dia: '2026-10-19', quantidade: 12 }, { id: 'c', dia: '2026-10-17', quantidade: 3 }]
  const nova = comVendaGravada(base, { id: 'a', dia: '2026-10-20', quantidade: 5 })
  assert.deepEqual(nova.map((v) => v.dia), ['2026-10-20', '2026-10-19', '2026-10-17'])
  const meio = comVendaGravada(base, { id: 'x', dia: '2026-10-18', quantidade: 1 })
  assert.deepEqual(meio.map((v) => v.dia), ['2026-10-19', '2026-10-18', '2026-10-17'])
  const corrigida = comVendaGravada(base, { id: 'b', dia: '2026-10-19', quantidade: 14 })
  assert.equal(corrigida.length, 2)
  assert.equal(corrigida[0].quantidade, 14)
  assert.equal(base[0].quantidade, 12, 'não altera a lista de entrada')
})

test('Início: o que a pessoa digitou sobrevive à releitura; a venda lançada pela organização vira escolha, não troca', () => {
  let r = iniciarRegistro({ quantidade: '' }, ['quantidade'])
  r = reduzirRegistro(r, { tipo: 'editar', campo: 'quantidade', valor: '14' })
  assert.equal(registroSujo(r), true)
  // releitura igual à anterior (sinal sem mudança): nada acontece
  r = reduzirRegistro(r, { tipo: 'servidor', servidor: { quantidade: '' } })
  assert.equal(r.local.quantidade, '14')
  assert.deepEqual(r.conflitos, {})
  // a organização lança 9 no mesmo dia enquanto a pessoa digita: conflito, e o 14 continua no campo
  r = reduzirRegistro(r, { tipo: 'servidor', servidor: { quantidade: '9' } })
  assert.equal(r.local.quantidade, '14')
  assert.deepEqual(r.conflitos, { quantidade: { meu: '14', deles: '9' } })
  // ela salva o dela (o servidor confirma 14): o conflito some e deixa de estar sujo
  r = reduzirRegistro(r, { tipo: 'salvou', servidor: { quantidade: '14' } })
  assert.deepEqual(r.conflitos, {})
  assert.equal(registroSujo(r), false)
})

test('Início: sem digitar, a venda lançada por outra pessoa aparece sozinha', () => {
  let r = iniciarRegistro({ quantidade: '7' }, ['quantidade'])
  r = reduzirRegistro(r, { tipo: 'servidor', servidor: { quantidade: '9' } })
  assert.equal(r.local.quantidade, '9')
  assert.deepEqual(r.adotados, ['quantidade'])
  assert.deepEqual(r.conflitos, {})
})

// ── Pedidos: rascunho de resposta ────────────────────────────────────────────

const pedido = { id: 'p1', titulo: 'Enviar o cardápio', texto: 'Mande o PDF do cardápio.', prazo_em: '2026-10-25T12:00:00Z', prioridade: 'normal' }

test('pedido igual ao que a pessoa viu: nenhum aviso', () => {
  const visto = fotoDoPedido(pedido, undefined)
  assert.equal(mudancaDoPedido(visto, { ...pedido }, undefined), null)
  assert.equal(mudancaDoPedido(null, pedido, undefined), null, 'sem rascunho não há o que comparar')
  assert.equal(textoDaMudanca(null), '')
})

test('organização deu o pedido como resolvido enquanto a marca escrevia: aviso claro e o texto fica', () => {
  const visto = fotoDoPedido(pedido, undefined)
  const m = mudancaDoPedido(visto, pedido, { estado: 'respondido', resposta: null })
  assert.equal(m.fechado, true)
  const t = textoDaMudanca(m)
  assert.match(t, /A organização deu esta solicitação como resolvida/)
  assert.match(t, /O que você escreveu continua aqui/)
  assert.match(t, /complemento/)
})

test('pedido respondido em outro aparelho: o aviso manda olhar a resposta, sem culpar a organização', () => {
  const visto = fotoDoPedido(pedido, undefined)
  const m = mudancaDoPedido(visto, pedido, { estado: 'respondido', resposta: 'Enviado ontem.' })
  assert.equal(m.fechado, true)
  assert.match(textoDaMudanca(m), /já foi respondida/)
  assert.doesNotMatch(textoDaMudanca(m), /deu esta solicitação como resolvida/)
})

test('organização mudou prazo e texto do pedido: aviso diz o quê, sem inventar fechamento', () => {
  const visto = fotoDoPedido(pedido, undefined)
  const m = mudancaDoPedido(visto, { ...pedido, prazo_em: '2026-10-30T12:00:00Z', texto: 'Mande o PDF e as fotos.' }, undefined)
  assert.equal(m.fechado, false)
  assert.deepEqual(m.campos.sort(), ['prazo_em', 'texto'])
  const t = textoDaMudanca(m)
  assert.match(t, /o texto e o prazo|o prazo e o texto/)
  assert.match(t, /Releia antes de enviar/)
  assert.doesNotMatch(t, /complemento/)
})

test('repartir pedidos: o que a marca está respondendo não muda de lista no meio da frase', () => {
  const a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' }
  const minhas = [a, b, c]
  const estados = { a: { estado: 'respondido' }, b: { estado: 'respondido' } }
  const rascunhos = {
    a: { texto: 'escrevendo…', visto: { respondido: false } },   // começou pendente; a organização deu como respondido
    b: { texto: 'complemento', visto: { respondido: true } },    // começou já respondido (complemento): fica em Respondidos
  }
  const { pendentes, feitos } = repartirPedidos(minhas, estados, rascunhos)
  assert.deepEqual(pendentes.map((s) => s.id), ['a', 'c'], 'a fica onde a pessoa estava digitando')
  assert.deepEqual(feitos.map((s) => s.id), ['b'])
  // sem rascunho (ou só espaços), respondido vai para Respondidos
  const sem = repartirPedidos(minhas, estados, { a: { texto: '   ', visto: { respondido: false } } })
  assert.deepEqual(sem.feitos.map((s) => s.id), ['a', 'b'])
  assert.deepEqual(sem.pendentes.map((s) => s.id), ['c'])
})

test('rascunho de pedido que saiu da lista não se perde', () => {
  const rascunhos = {
    p1: { texto: 'minha resposta', visto: { titulo: 'Enviar o cardápio' } },
    p2: { texto: '  ', visto: { titulo: 'Outro' } },
    p3: { texto: 'ainda existe', visto: { titulo: 'Existe' } },
  }
  const orfaos = rascunhosSemPedido([{ id: 'p3' }], rascunhos)
  assert.deepEqual(orfaos, [{ id: 'p1', titulo: 'Enviar o cardápio', texto: 'minha resposta' }])
})

// ── Mensagens ────────────────────────────────────────────────────────────────

test('marcar como lidas: só as da organização, só as sem leitura e só uma tentativa por mensagem', () => {
  const msgs = [
    { id: 'm1', de: 'organizacao', lida_em: null },
    { id: 'm2', de: 'organizacao', lida_em: '2026-10-19T10:00:00Z' },
    { id: 'm3', de: 'marca', lida_em: null },
    { id: 'm4', de: 'organizacao', lida_em: null },
  ]
  assert.deepEqual(idsParaMarcarLidas(msgs, new Set()), ['m1', 'm4'])
  assert.deepEqual(idsParaMarcarLidas(msgs, new Set(['m1'])), ['m4'])
  assert.deepEqual(idsParaMarcarLidas(null, new Set()), [])
})

test('marcar como lida nunca vira laço, mesmo se o banco não aceitar a leitura', () => {
  // O servidor "teimoso": a RPC responde ok mas a mensagem continua sem leitura.
  const servidor = [{ id: 'm1', de: 'organizacao', lida_em: null }]
  const tentadas = new Set()
  let chamadasDaRpc = 0
  for (let releitura = 0; releitura < 10; releitura++) {
    const novas = idsParaMarcarLidas(servidor, tentadas)
    if (!novas.length) continue
    novas.forEach((id) => tentadas.add(id))
    chamadasDaRpc += 1
  }
  assert.equal(chamadasDaRpc, 1)
  // falha da RPC: a tela devolve o id, e a próxima releitura tenta de novo
  tentadas.delete('m1')
  assert.deepEqual(idsParaMarcarLidas(servidor, tentadas), ['m1'])
})
