// Painel: pedidos de revisão de presença (GPS) e resumo de carimbos sem GPS (lib/cacaGps.js, Excecoes.jsx, SemGps.jsx).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as G from '../painel-app/src/lib/cacaGps.js'
import * as C from '../painel-app/src/lib/caca.js'
import { RPC_LEITURA, dominiosDeRpc } from '../painel-app/src/lib/sync/dominios.js'

const mem = new Map()
globalThis.sessionStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) }
const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const ler = (rel) => readFileSync(join(raiz, rel), 'utf8')

function falsoFetch(resposta = {}) {
  const chamadas = []
  const f = async (url, op) => {
    chamadas.push({ url, corpo: JSON.parse(op.body) })
    return { ok: true, status: 200, text: async () => JSON.stringify(resposta), json: async () => resposta }
  }
  return { f, chamadas }
}

test('estados e motivos do pedido têm rótulo e tom; desconhecido aparece cru', () => {
  assert.equal(G.rotuloPedido('pendente'), 'Aguardando decisão')
  assert.equal(G.tomPedido('aprovado'), 'ok')
  assert.equal(G.tomPedido('negado'), 'encerrado')
  assert.equal(G.rotuloPedido('x'), 'x')
  assert.match(G.rotuloMotivoPedido('imprecisa'), /300 m/)
  assert.equal(G.rotuloMotivoPedido('coisa'), 'coisa')
})

test('só pedido pendente tem ação; filtro por situação', () => {
  const itens = [{ id: 1, estado: 'pendente' }, { id: 2, estado: 'aprovado' }, { id: 3, estado: 'negado' }]
  assert.equal(G.podeDecidir(itens[0]), true)
  assert.equal(G.podeDecidir(itens[1]), false)
  assert.equal(G.podeDecidir(null), false)
  assert.deepEqual(G.filtrarPedidos(itens, 'pendente').map((x) => x.id), [1])
  assert.deepEqual(G.filtrarPedidos(itens, 'todos').map((x) => x.id), [1, 2, 3])
  assert.deepEqual(G.filtrarPedidos(null, 'pendente'), [])
  assert.ok(G.FILTROS_PEDIDO.some(([v]) => v === 'todos') && G.FILTROS_PEDIDO.every(([v]) => v !== ''), 'Escolha não aceita valor vazio')
})

test('o que o celular informou: distância e margem, nunca posição', () => {
  assert.equal(G.descricaoDoSinal({ distancia_m: 640, precisao_m: 50 }), 'a 640 m do ponto conferido, margem de ±50 m')
  assert.equal(G.descricaoDoSinal({}), 'sem posição enviada')
  assert.doesNotMatch(G.descricaoDoSinal({ distancia_m: 1, lat: -5.8, lng: -35.2 }), /-5\.8|-35/)
})

test('confirmação da decisão: aprovar cria carimbo de exceção; negar diz que nada é carimbado', () => {
  const p = { apelido: 'Ana', casa: 'Casa Um' }
  assert.match(G.textoDaDecisao(p, 'aprovar'), /cria agora um carimbo de Ana em Casa Um/)
  assert.match(G.textoDaDecisao(p, 'aprovar'), /12 horas/)
  assert.match(G.textoDaDecisao(p, 'negar'), /Nada é carimbado/)
})

test('faixa de aviso nas abas de apuração: só aparece com carimbo sem GPS ou pedido esperando', () => {
  assert.equal(G.textoSemGps(null), '')
  assert.equal(G.textoSemGps({ total: 0, contam: 0, pedidos_pendentes: 0 }), '')
  assert.equal(G.textoSemGps({ total: 3, contam: 1, pedidos_pendentes: 0 }), '3 carimbos sem prova de GPS (1 conta no progresso)')
  assert.equal(G.textoSemGps({ total: 1, contam: 1, pedidos_pendentes: 2 }), '1 carimbo sem prova de GPS (1 conta no progresso) · 2 pedidos de presença aguardando decisão')
  assert.equal(G.textoSemGps({ total: '2', contam: '0', pedidos_pendentes: '1' }), '2 carimbos sem prova de GPS (0 contam no progresso) · 1 pedido de presença aguardando decisão', 'contagem do banco pode chegar como texto')
})

test('chamadas: nomes e corpos do contrato; decisão leva a nota ou null', async () => {
  mem.set('scw_org', 'senha-de-teste')
  const { f, chamadas } = falsoFetch({ ok: true })
  await C.cacaApi.excecoes('2026.2', undefined, f)
  await C.cacaApi.excecoes('2026.2', 'pendente', f)
  await C.cacaApi.decidirExcecao('id1', 'negar', 'sem sinal', f)
  await C.cacaApi.decidirExcecao('id1', 'aprovar', '', f)
  await C.cacaApi.gpsResumo('2026.2', f)
  const sem = ({ p_secret, ...resto }) => resto
  assert.deepEqual(chamadas.map((c) => [c.url.split('/rpc/')[1], sem(c.corpo)]), [
    ['caca_excecao_listar', { p_edicao: '2026.2', p_estado: null }],
    ['caca_excecao_listar', { p_edicao: '2026.2', p_estado: 'pendente' }],
    ['caca_excecao_decidir', { p_id: 'id1', p_decisao: 'negar', p_nota: 'sem sinal' }],
    ['caca_excecao_decidir', { p_id: 'id1', p_decisao: 'aprovar', p_nota: null }],
    ['caca_gps_resumo', { p_edicao: '2026.2' }],
  ])
  mem.clear()
})

test('erros do banco em português: 12 h, janela, motivo obrigatório', () => {
  assert.match(C.mensagemCaca(new Error('cedo')), /12 horas/)
  assert.match(C.mensagemCaca(new Error('nota_obrigatoria')), /motivo/)
  assert.match(C.mensagemCaca(new Error('nao_aberta')), /janela/)
  assert.match(C.mensagemCaca(new Error('encerrada')), /encerrou/)
  assert.match(C.mensagemCaca(new Error('pedido_nao_encontrado')), /não existe mais/)
  assert.match(C.mensagemCaca(new Error('transicao_invalida')), /já mudou/)
})

test('sincronização: leituras classificadas, decisão avisa o domínio carimbos', () => {
  assert.ok(RPC_LEITURA.has('caca_excecao_listar') && RPC_LEITURA.has('caca_gps_resumo'))
  assert.ok(!RPC_LEITURA.has('caca_excecao_decidir'), 'decidir grava')
  assert.deepEqual(dominiosDeRpc('caca_excecao_decidir'), ['carimbos'])
  assert.equal(C.rotuloEvento('excecao_aprovada'), 'Presença aprovada')
  assert.equal(C.rotuloEvento('excecao_pedida'), 'Pedido de presença')
})

test('aba nova existe e a tela só aprova/nega com permissão, motivo e confirmação', () => {
  assert.match(ler('painel-app/src/components/vistas/caca/PainelCaca.jsx'), /chave: 'presenca', rotulo: 'Pedidos de presença'/)
  assert.match(ler('painel-app/src/components/vistas/caca/PainelCaca.jsx'), /case 'presenca': return <Excecoes/)
  const tela = ler('painel-app/src/components/vistas/caca/Excecoes.jsx')
  assert.match(tela, /pode\('producao\.gerir'\)/, 'ação só para quem pode gerir')
  assert.match(tela, /pedirTexto\(/, 'confirmação antes de decidir')
  assert.match(tela, /nota\.trim\(\)\) \{ await avisar/, 'negar exige motivo')
  assert.match(tela, /podeDecidir\(p\)/)
  assert.doesNotMatch(tela, /console\.|localStorage/)
  for (const aba of ['VouchersDia', 'PremioFinal']) assert.match(ler(`painel-app/src/components/vistas/caca/${aba}.jsx`), /<AvisoSemGps edicao=\{edicao\} \/>/)
  assert.match(ler('painel-app/src/components/vistas/caca/Revisao.jsx'), /<ResumoSemGps edicao=\{edicao\} \/>/)
})
