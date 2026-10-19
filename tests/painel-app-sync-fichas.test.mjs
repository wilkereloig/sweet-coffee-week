import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DOMINIOS, ehDominio } from '../painel-app/src/lib/sync/dominios.js'
import { iniciarRegistro, reduzirRegistro, registroSujo } from '../painel-app/src/lib/sync/mesclar.js'
import {
  DOMINIOS_VISTAS, mesclarFonte, valorOuAnterior, CAMPOS_EDICAO, numeroEmTexto, registroDaEdicao,
  dadosParaSalvarEdicao, registroSalvoDaEdicao, statusAEnviar, mensagensAMarcar,
} from '../painel-app/src/lib/syncFichas.js'
import { criarCarregadorFicha, FONTES_FICHA } from '../painel-app/src/lib/fichaGeral.js'
import { avisarSalvo, EVENTO_SALVO } from '../painel-app/src/lib/rascunhoOrg.js'

/*
 * Vistas da organização ligadas à camada de sincronização (19/10/2026): a lógica PURA que decide
 * (a) de quais domínios cada leitura depende, (b) o que uma releitura silenciosa que falha preserva,
 * (c) como o formulário da edição e a triagem de respostas resistem a alteração externa, e
 * (d) como a leitura de mensagens evita reiniciar o próprio ciclo.
 */

const espera = (ms = 0) => new Promise((r) => setTimeout(r, ms))
const adiado = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }

/* ── Domínios ─────────────────────────────────────────────────────────────── */
test('toda lista de domínios das vistas usa só o vocabulário fechado, sem repetir', () => {
  for (const [vista, lista] of Object.entries(DOMINIOS_VISTAS)) {
    assert.ok(lista.length > 0, vista + ': lista vazia — a tela nunca relê')
    assert.equal(new Set(lista).size, lista.length, vista + ': domínio repetido')
    for (const d of lista) assert.ok(ehDominio(d), vista + ': domínio fora do vocabulário (' + d + ')')
  }
  assert.ok(Object.values(DOMINIOS_VISTAS).flat().every((d) => DOMINIOS.includes(d)))
})

test('a lista de marcas e a visão do participante cobrem o que as leituras tocam', () => {
  // get_participantes conta cadastro, unidades, correções e pedidos; get_conversas = mensagens; get_logos = logos.
  for (const d of ['participantes', 'cadastro', 'unidades', 'correcoes', 'pedidos', 'logos', 'acessos', 'mensagens']) {
    assert.ok(DOMINIOS_VISTAS.listaMarcas.includes(d), 'listaMarcas sem ' + d)
  }
  // get_ficha_360 + get_publicacao + get_correcoes + get_edicoes.
  for (const d of ['participantes', 'cadastro', 'unidades', 'temas', 'correcoes', 'pedidos', 'fotos', 'arquivos', 'materiais', 'vendas', 'publicacao', 'edicao']) {
    assert.ok(DOMINIOS_VISTAS.fichaGeral.includes(d), 'fichaGeral sem ' + d)
  }
  // A ficha geral é um superconjunto da 360 (a visão relê o que a aba de operação relê).
  for (const d of DOMINIOS_VISTAS.ficha360) assert.ok(DOMINIOS_VISTAS.fichaGeral.includes(d))
  // Mesa: resume candidaturas, marcas, conversas, atividade, temas e edição.
  for (const d of ['respostas', 'participantes', 'mensagens', 'atividade', 'temas', 'edicao']) assert.ok(DOMINIOS_VISTAS.mesa.includes(d), 'mesa sem ' + d)
  // Nenhuma tela de contato/voucher pode ficar sem 'vouchers' (a contagem por pessoa muda com eles).
  assert.ok(DOMINIOS_VISTAS.contatos.includes('vouchers') && DOMINIOS_VISTAS.fichaContato.includes('vouchers'))
})

/* ── Releitura silenciosa que falha ───────────────────────────────────────── */
test('mesclarFonte: releitura silenciosa que falha por erro de rede mantém o que estava na tela', () => {
  const ok = { estado: 'ok', dados: { marca: 'A' }, erro: null }
  const erro = { estado: 'erro', dados: null, erro: 'Failed to fetch' }
  assert.equal(mesclarFonte(ok, erro, { manter: true }), ok, 'dado antigo vale mais que bloco de erro')
  assert.equal(mesclarFonte(ok, erro, { manter: false }), erro, 'leitura comum mostra o erro')
  assert.equal(mesclarFonte(undefined, erro, { manter: true }), erro, 'sem nada na tela não há o que manter')
  assert.equal(mesclarFonte({ estado: 'carregando', dados: null, erro: null }, erro, { manter: true }), erro, 'carregando não é conteúdo')
  // Perda de permissão NÃO é mantida: o dado some, como deve.
  const sem = { estado: 'sem_permissao', dados: null, erro: null }
  assert.equal(mesclarFonte(ok, sem, { manter: true }), sem)
  // Resposta boa sempre substitui.
  const novo = { estado: 'ok', dados: { marca: 'B' }, erro: null }
  assert.equal(mesclarFonte(ok, novo, { manter: true }), novo)
  assert.equal(mesclarFonte(ok, erro), erro, 'sem opções = leitura comum')
})

test('valorOuAnterior: uma perna que cai não apaga o que já estava, nem as outras', async () => {
  const [a, b] = await Promise.allSettled([Promise.resolve([1, 2]), Promise.reject(new Error('x'))])
  assert.deepEqual(valorOuAnterior(a, ['velho']), { valor: [1, 2], falhou: false })
  assert.deepEqual(valorOuAnterior(b, ['velho']), { valor: ['velho'], falhou: true })
  assert.deepEqual(valorOuAnterior(a, [], (v) => v.length), { valor: 2, falhou: false })
})

test('o carregador da ficha: releitura silenciosa devolve as fontes que FALHARAM e o hook mantém o conteúdo', async () => {
  // Simula o hook: estado por fonte, atualizado por mesclarFonte exatamente como useFichaGeral faz.
  const estado = {}
  const aoMudar = (fonte, s, deQuem, opcoes) => { estado[fonte] = mesclarFonte(estado[fonte], s, opcoes) }
  let falhar = new Set()
  const chamar = async (rpc) => {
    await espera(1)
    const fonte = Object.entries(FONTES_FICHA).find(([, d]) => d.rpc === rpc)[0]
    if (falhar.has(fonte)) throw new Error('Failed to fetch')
    return { v: fonte + ':ok' }
  }
  const carregar = criarCarregadorFicha(chamar, aoMudar)
  assert.deepEqual(await carregar('P1').pronto, [])
  assert.equal(estado.nucleo.estado, 'ok')
  assert.equal(estado.publicacao.dados.v, 'publicacao:ok')

  // Outra pessoa mexeu; a releitura silenciosa perde duas leituras.
  falhar = new Set(['nucleo', 'correcoes'])
  const falhas = await carregar('P1', { manter: true }).pronto
  assert.deepEqual(falhas.sort(), ['correcoes', 'nucleo'])
  assert.equal(estado.nucleo.estado, 'ok', 'o cadastro continua na tela')
  assert.equal(estado.nucleo.dados.v, 'nucleo:ok')
  assert.equal(estado.correcoes.estado, 'ok')

  // A mesma falha numa leitura comum (primeira vez / trocar de marca) é mostrada.
  const estado2 = {}
  const carregar2 = criarCarregadorFicha(chamar, (f, s, q, o) => { estado2[f] = mesclarFonte(estado2[f], s, o) })
  await carregar2('P2').pronto
  assert.equal(estado2.nucleo.estado, 'erro')

  // Permissão negada não é "falha" para o indicador.
  const negada = criarCarregadorFicha(async () => { throw new Error('nao_autorizado') }, () => {})
  assert.deepEqual(await negada('P3', { manter: true }).pronto, [])
})

test('o carregador da ficha: leitura superada por outra mais nova não grava nem conta como falha', async () => {
  const demoradas = []
  const gravou = []
  const carregar = criarCarregadorFicha(
    (rpc, args) => { const d = adiado(); demoradas.push({ rpc, args, d }); return d.promise },
    (fonte, s, id) => gravou.push([fonte, id, s.estado, s.dados && s.dados.de]),
  )
  const primeira = carregar('A', { manter: true })
  const segunda = carregar('A', { manter: true })
  await espera() // as chamadas só saem na rodada seguinte (microtarefa): 4 de cada leitura
  assert.equal(demoradas.length, 8)
  // a velha falha E a nova responde bem (ordem de chegada trocada)
  demoradas.filter((x) => x.rpc === 'get_ficha_360').forEach((x, i) => { if (i === 0) x.d.reject(new Error('rede')); else x.d.resolve({ de: 'nova' }) })
  demoradas.filter((x) => x.rpc !== 'get_ficha_360').forEach((x) => x.d.resolve({ de: 'ok' }))
  assert.deepEqual(await primeira.pronto, [], 'a velha foi superada: o erro dela não vale')
  assert.deepEqual(await segunda.pronto, [])
  const nucleo = gravou.filter(([f]) => f === 'nucleo')
  assert.equal(nucleo.length, 1)
  assert.equal(nucleo[0][3], 'nova')
  // E sair da tela cancela a mais nova: nada é gravado depois.
  const gravou2 = []
  const pend = []
  const c2 = criarCarregadorFicha((rpc) => { const d = adiado(); pend.push(d); return d.promise }, (f, s) => gravou2.push(f))
  const cancelar = c2('B', { manter: true })
  await espera()
  cancelar()
  pend.forEach((d) => d.resolve({}))
  await cancelar.pronto
  assert.equal(gravou2.length, 0, 'depois de cancelar (desmontar), nada grava')
})

/* ── Edição: formulário que resiste a alteração externa ───────────────────── */
test('registroDaEdicao: texto onde o input é texto, número em forma canônica, hora sem segundos', () => {
  const r = registroDaEdicao({ nome: 'Cartoon', tema: null, festival_inicio: '2026-11-05', taxa_inscricao: null, valor_combo: 35, foto_exige_pagamento: 1, lembrete_vendas_hora: '18:30:00' })
  assert.deepEqual(r, {
    nome: 'Cartoon', tema: '', festival_inicio: '2026-11-05', festival_fim: '', taxa_inscricao: '', valor_combo: '35',
    foto_exige_pagamento: true, lembrete_vendas_hora: '18:30',
  })
  assert.deepEqual(Object.keys(r).sort(), [...CAMPOS_EDICAO].sort(), 'todos os campos do formulário, nem mais nem menos')
  assert.equal(numeroEmTexto('35.50'), '35.5')
  assert.equal(numeroEmTexto(0), '0', 'zero é um valor, não vazio')
  assert.equal(numeroEmTexto(''), '')
  assert.equal(numeroEmTexto(null), '')
  assert.deepEqual(registroDaEdicao(null), registroDaEdicao({}))
})

test('dadosParaSalvarEdicao leva a edição inteira, com vazio virando null e número virando número', () => {
  const f = registroDaEdicao({ nome: 'X', valor_combo: 35, taxa_inscricao: 0, festival_inicio: '', lembrete_vendas_hora: '' })
  const d = dadosParaSalvarEdicao('2026.2', f)
  assert.equal(d.codigo, '2026.2')
  assert.equal(d.valor_combo, 35)
  assert.equal(d.taxa_inscricao, 0, 'zero não vira null')
  assert.equal(d.festival_inicio, null)
  assert.equal(d.lembrete_vendas_hora, null)
  assert.equal(d.foto_exige_pagamento, false)
})

test('edição aberta: o que a pessoa digitou fica, o que ela não tocou acompanha o servidor, o mesmo campo pede escolha', () => {
  const servidor0 = registroDaEdicao({ nome: 'Cartoon', tema: 'Desenhos', valor_combo: 35, taxa_inscricao: 100 })
  let e = iniciarRegistro(servidor0, CAMPOS_EDICAO)
  // a pessoa digita no nome e no tema
  e = reduzirRegistro(e, { tipo: 'editar', campo: 'nome', valor: 'Cartoon 2026' })
  e = reduzirRegistro(e, { tipo: 'editar', campo: 'tema', valor: 'Cartoons' })
  assert.equal(registroSujo(e), true)
  // outra pessoa muda o valor do combo (campo não tocado) e o tema (campo tocado)
  e = reduzirRegistro(e, { tipo: 'servidor', servidor: registroDaEdicao({ nome: 'Cartoon', tema: 'Animações', valor_combo: 40, taxa_inscricao: 100 }) })
  assert.equal(e.local.nome, 'Cartoon 2026', 'o que foi digitado não muda')
  assert.equal(e.local.valor_combo, '40', 'campo que ela não tocou acompanha')
  assert.deepEqual(e.adotados, ['valor_combo'])
  assert.deepEqual(Object.keys(e.conflitos), ['tema'], 'o mesmo campo dos dois lados vira conflito')
  assert.equal(e.local.tema, 'Cartoons', 'e o dela continua na tela')
  assert.equal(e.conflitos.tema.deles, 'Animações')
  // escolhe: manter o dela
  e = reduzirRegistro(e, { tipo: 'manter', campo: 'tema' })
  assert.deepEqual(Object.keys(e.conflitos), [])
  assert.equal(e.local.tema, 'Cartoons')
})

test('salvar a edição: "35.50" digitado não vira "atualizado por outra pessoa" quando o servidor devolve 35.5', () => {
  let e = iniciarRegistro(registroDaEdicao({ nome: 'C', valor_combo: 30 }), CAMPOS_EDICAO)
  e = reduzirRegistro(e, { tipo: 'editar', campo: 'valor_combo', valor: '35.50' })
  const enviado = e.local
  const salvo = registroSalvoDaEdicao(enviado)
  assert.equal(salvo.valor_combo, '35.5')
  assert.equal(dadosParaSalvarEdicao('c', enviado).valor_combo, 35.5)
  e = reduzirRegistro(e, { tipo: 'salvou', servidor: salvo })
  e = reduzirRegistro(e, { tipo: 'editar', campo: 'valor_combo', valor: salvo.valor_combo }) // o formulário adota a forma canônica
  assert.equal(registroSujo(e), false, 'salvo é salvo')
  // a releitura traz o número do banco
  const antes = e
  e = reduzirRegistro(e, { tipo: 'servidor', servidor: registroDaEdicao({ nome: 'C', valor_combo: 35.5 }) })
  assert.equal(e.mudouExterno, false, 'nada mudou por fora')
  assert.deepEqual(e.adotados, [])
  assert.equal(e.local.valor_combo, antes.local.valor_combo)
})

test('trocar de edição recomeça do zero, sem herdar o rascunho da anterior', () => {
  let e = iniciarRegistro(registroDaEdicao({ nome: 'A' }), CAMPOS_EDICAO)
  e = reduzirRegistro(e, { tipo: 'editar', campo: 'nome', valor: 'rascunho da A' })
  e = reduzirRegistro(e, { tipo: 'reiniciar', servidor: registroDaEdicao({ nome: 'B' }) })
  assert.equal(e.local.nome, 'B')
  assert.equal(registroSujo(e), false)
})

/* ── Triagem de respostas ─────────────────────────────────────────────────── */
test('triagem: um status que mudou por fora nunca é reenviado velho; só vai o que a pessoa mudou', () => {
  const campos = ['status', 'nota']
  let e = iniciarRegistro({ status: 'novo', nota: '' }, campos)
  assert.equal(statusAEnviar(e), null, 'não mexeu: não manda status')
  // outra pessoa aprova enquanto a ficha está aberta; a pessoa só estava lendo
  e = reduzirRegistro(e, { tipo: 'servidor', servidor: { status: 'aprovado', nota: '' } })
  assert.equal(e.local.status, 'aprovado', 'a tela acompanha')
  assert.equal(statusAEnviar(e), null, 'o select não manda "novo" de volta nem reenvia "aprovado"')
  // ela escreve só a nota: o status continua fora do envio
  e = reduzirRegistro(e, { tipo: 'editar', campo: 'nota', valor: 'ligar amanhã' })
  assert.equal(statusAEnviar(e), null)
  assert.equal(e.local.nota, 'ligar amanhã')
  // ela escolhe outro status: agora vai
  e = reduzirRegistro(e, { tipo: 'editar', campo: 'status', valor: 'em_analise' })
  assert.equal(statusAEnviar(e), 'em_analise')
})

test('triagem: status mudado dos dois lados vira conflito e só envia depois da escolha', () => {
  let e = iniciarRegistro({ status: 'novo', nota: '' }, ['status', 'nota'])
  e = reduzirRegistro(e, { tipo: 'editar', campo: 'status', valor: 'em_analise' })
  e = reduzirRegistro(e, { tipo: 'servidor', servidor: { status: 'aprovado', nota: '' } })
  assert.deepEqual(Object.keys(e.conflitos), ['status'])
  assert.equal(e.local.status, 'em_analise', 'o dela continua')
  const adotando = reduzirRegistro(e, { tipo: 'adotar', campo: 'status' })
  assert.equal(statusAEnviar(adotando), null, 'adotou a nova: nada a enviar')
  const mantendo = reduzirRegistro(e, { tipo: 'manter', campo: 'status' })
  assert.equal(statusAEnviar(mantendo), 'em_analise', 'manteve a dela: ela decidiu sobrescrever')
  // depois de salvar, a base acompanha: o próximo salvamento não reenvia o mesmo status
  const salvo = reduzirRegistro(mantendo, { tipo: 'salvou', servidor: { status: 'em_analise', nota: '' } })
  assert.equal(statusAEnviar(salvo), null)
})

/* ── Mensagens: ler não reinicia o próprio ciclo ──────────────────────────── */
test('mensagensAMarcar: só as da marca, não lidas e ainda não pedidas', () => {
  const m = [
    { id: 1, de: 'marca', lida_em: null },
    { id: 2, de: 'marca', lida_em: '2026-10-19T10:00:00Z' },
    { id: 3, de: 'organizacao', lida_em: null },
    { id: 4, de: 'marca', lida_em: null },
  ]
  assert.deepEqual(mensagensAMarcar(m).map((x) => x.id), [1, 4])
  assert.deepEqual(mensagensAMarcar(m, new Set([1])).map((x) => x.id), [4])
  assert.deepEqual(mensagensAMarcar(m, new Set([1, 4])), [])
  assert.deepEqual(mensagensAMarcar(null), [])
})

test('ler a conversa anuncia "mensagens" e relê: se o servidor não marcasse a mensagem, o ciclo parava na segunda volta', () => {
  // Simulação do laço da tela: relê → pede "lida" para as novas → o aviso volta a reler.
  const pedidas = new Set()
  const servidorNaoMarca = [{ id: 7, de: 'marca', lida_em: null }]
  let pedidosDeLida = 0
  for (let volta = 0; volta < 5; volta++) {
    const novas = mensagensAMarcar(servidorNaoMarca, pedidas)
    if (!novas.length) break
    novas.forEach((x) => pedidas.add(x.id))
    pedidosDeLida += 1
  }
  assert.equal(pedidosDeLida, 1, 'a mesma mensagem é pedida uma vez só, mesmo que o servidor não a marque')
  // Se o pedido falhar a tela esquece a mensagem e tenta de novo na próxima releitura (não fica "lida" só no papel).
  pedidas.delete(7)
  assert.equal(mensagensAMarcar(servidorNaoMarca, pedidas).length, 1)
})

/* ── Editor da seção: salvar só limpa quando o formulário avisa ───────────── */
test('avisarSalvo dispara o evento no formulário ligado e fica calado fora da página', () => {
  const eventos = []
  const form = { isConnected: true, dispatchEvent: (ev) => { eventos.push(ev); return true } }
  avisarSalvo(form)
  assert.equal(eventos.length, 1)
  assert.equal(eventos[0].type, EVENTO_SALVO)
  assert.equal(eventos[0].bubbles, true, 'sobe até o editor da seção')
  avisarSalvo({ isConnected: false, dispatchEvent: (ev) => eventos.push(ev) }) // formulário que já saiu da tela
  avisarSalvo(null)
  avisarSalvo(undefined)
  assert.equal(eventos.length, 1)
})
