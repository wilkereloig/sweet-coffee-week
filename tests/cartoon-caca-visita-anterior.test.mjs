// Carimbo de visita anterior (05/11/2026): prazo vem do servidor e é descrito sem data escrita à mão, o pedido nunca vira "conquistado"
// antes da validação, a lista de casas respeita carimbo e pedido existentes, a API só fala com o servidor, e a migration fecha as regras.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { casasDisponiveis, dataCurta, dataEmNatal, descreverPrazo, estadoDoPedido, pedidosDeVisita } from '../src/edicao/caca/visita/logica.js'
import { VISITA as T } from '../src/edicao/caca/visita/textos.js'
import { criarApi } from '../src/edicao/caca/api.js'

const raiz = path.resolve(import.meta.dirname, '..')
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8')
const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const CHAVE = 'A'.repeat(32)

test('prazo: o último segundo aceito é 23h59:59 de Natal, a partir do instante que o servidor manda', () => {
  assert.equal(descreverPrazo('2026-11-06T03:00:00Z'), '5 de novembro de 2026, 23h59:59 (horário de Natal)')
  assert.equal(descreverPrazo(''), '')
  assert.equal(descreverPrazo('lixo'), '')
})

test('a data de hoje é a de Natal, não a do relógio do aparelho em UTC', () => {
  assert.equal(dataEmNatal(new Date('2026-11-06T02:30:00Z')), '2026-11-05', '23h30 em Natal ainda é dia 5')
  assert.equal(dataEmNatal(new Date('2026-11-06T03:00:00Z')), '2026-11-06')
  assert.equal(dataCurta('2026-11-05'), '5/11/2026')
  assert.equal(dataCurta('x'), '')
})

test('estados: em análise não conta; aprovado sem avaliação pede a avaliação; só validada vira "validado"', () => {
  const mapa = { casas: [{ slug: 'a', estado: 'pendente', carimbos: 1 }, { slug: 'b', estado: 'validada', carimbos: 1 }] }
  assert.equal(estadoDoPedido({ slug: 'a', estado: 'pendente' }, mapa), 'analise')
  assert.equal(estadoDoPedido({ slug: 'a', estado: 'aprovado' }, mapa), 'aprovadoAvaliar')
  assert.equal(estadoDoPedido({ slug: 'b', estado: 'aprovado' }, mapa), 'aprovadoValido')
  assert.equal(estadoDoPedido({ slug: 'a', estado: 'negado' }, mapa), 'negado')
  assert.equal(estadoDoPedido({ slug: 'z', estado: 'aprovado' }, { casas: [] }), 'aprovadoAvaliar', 'sem a casa no mapa ainda não é validada')
  assert.equal(estadoDoPedido(null, null), 'analise')
})

test('só os pedidos de visita anterior entram na lista (os de GPS ficam de fora)', () => {
  assert.deepEqual(pedidosDeVisita([{ motivo: 'longe' }, { motivo: 'visita_anterior', slug: 'a' }]).map((p) => p.slug), ['a'])
  assert.deepEqual(pedidosDeVisita(null), [])
})

test('casas disponíveis: sem carimbo, sem pedido pendente ou aprovado; negado pode tentar de novo; ordem alfabética', () => {
  const dados = { participantes: [
    { slug: 'zeta', casa: { nome: 'Zeta' }, unidades: [{ id: 'u1', nome: '', endereco: { bairro: 'Tirol' } }] },
    { slug: 'alfa', casa: { nome: 'Alfa' }, unidades: [{ id: 'u2' }, { id: 'u3' }] },
    { slug: 'beta', casa: { nome: 'Beta' }, unidades: [{ id: 'u4' }] },
    { slug: 'gama', casa: { nome: 'Gama' }, unidades: [{ id: 'u5' }] },
    { slug: 'sem-endereco', casa: { nome: 'Sem' }, unidades: [] },
  ] }
  const mapa = { casas: [{ slug: 'beta', carimbos: 1 }, { slug: 'gama', carimbos: 0 }] }
  const pedidos = [{ motivo: 'visita_anterior', slug: 'alfa', estado: 'negado' }, { motivo: 'visita_anterior', slug: 'zeta', estado: 'pendente' }]
  const r = casasDisponiveis(dados, mapa, pedidos)
  assert.deepEqual(r.map((c) => c.slug), ['alfa', 'gama'])
  assert.equal(r[0].unidades.length, 2)
})

test('os textos não escrevem data, hora nem prometem aprovação ou carimbo conquistado', () => {
  const fonte = semComentarios(ler('src/edicao/caca/visita/textos.js'))
  assert.doesNotMatch(fonte, /\b\d{1,2}\s*(?:\/\s*\d{1,2}|de\s+(?:novembro|outubro))/i, 'nenhuma data escrita')
  assert.doesNotMatch(fonte, /\b\d{1,2}h\d{0,2}\b|23:59/, 'nenhuma hora escrita')
  assert.match(T.estadoTexto.analise, /n[ãa]o conta/i)
  assert.doesNotMatch(T.estadoTexto.analise, /conquist|ganh/i)
  assert.match(T.estadoTexto.aprovadoAvaliar, /avaliar o combo/i)
  assert.match(T.estadoTexto.aprovadoAvaliar, /mesmo e-mail/i)
  assert.doesNotMatch(T.estadoTexto.negado, /nota|motivo interno/i, 'a nota da organização nunca é exposta')
  assert.match(T.comoFunciona.join(' '), /n[ãa]o é aprova/i)
  assert.match(T.comprovante, /N[ãa]o é preciso comprovante/)
  assert.ok(T.semMapa('X').includes('X'), 'o prazo entra por parâmetro')
  for (const m of ['prazo_encerrado', 'email_nao_confirmado', 'data_futura', 'unidade_obrigatoria', 'ja_carimbou', 'ja_pedido', 'limite_pedidos', 'muitos_pendentes', 'fila_cheia', 'rede']) assert.ok(T.recusa[m], `recusa ${m}`)
})

function montar (respostas = {}) {
  const chamadas = []
  const chamar = async (nome, corpo) => { chamadas.push([nome, corpo]); const r = respostas[nome]; if (r instanceof Error) throw r; return r }
  return { chamadas, api: criarApi({ chamar, edicao: '2026.2' }) }
}

test('API: o prazo vem do servidor (público) e resposta estranha vira falha', async () => {
  const bom = montar({ caca_visita_anterior_prazo: { aberto: true, ate: '2026-11-06T03:00:00Z', fuso: 'America/Fortaleza' } })
  const r = await bom.api.visitaAnteriorPrazo()
  assert.equal(r.ok, true); assert.equal(r.prazo.aberto, true)
  assert.deepEqual(bom.chamadas[0], ['caca_visita_anterior_prazo', {}])
  assert.equal((await montar({ caca_visita_anterior_prazo: { nada: 1 } }).api.visitaAnteriorPrazo()).ok, false)
  assert.equal((await montar({ caca_visita_anterior_prazo: new Error('x') }).api.visitaAnteriorPrazo()).ok, false)
})

test('API: o pedido manda só a chave, a casa, a unidade, a data e a nota; valida antes de sair', async () => {
  const { api, chamadas } = montar({ caca_visita_anterior_pedir: { ok: true, id: 'i', estado: 'pendente', slug: 'carcara' } })
  const r = await api.visitaAnteriorPedir(CHAVE, { slug: 'carcara', unidade: 'u-1', data: '2026-11-05', nota: '  fui cedo ' })
  assert.equal(r.ok, true); assert.equal(r.estado, 'pendente')
  assert.deepEqual(chamadas[0], ['caca_visita_anterior_pedir', { p_chave: CHAVE, p_slug: 'carcara', p_unidade: 'u-1', p_data: '2026-11-05', p_nota: 'fui cedo' }])
  assert.equal((await api.visitaAnteriorPedir('curta', { slug: 'carcara', data: '2026-11-05' })).motivo, 'mapa_desconhecido')
  assert.equal((await api.visitaAnteriorPedir(CHAVE, { slug: 'Casa Torta', data: '2026-11-05' })).motivo, 'qr_invalido')
  assert.equal((await api.visitaAnteriorPedir(CHAVE, { slug: 'carcara', data: '05/11' })).motivo, 'data_invalida')
  assert.equal(chamadas.length, 1, 'pedido inválido não sai do aparelho')
  const recusa = montar({ caca_visita_anterior_pedir: { ok: false, motivo: 'prazo_encerrado' } })
  assert.equal((await recusa.api.visitaAnteriorPedir(CHAVE, { slug: 'carcara', data: '2026-11-05' })).motivo, 'prazo_encerrado')
  assert.equal((await montar({ caca_visita_anterior_pedir: new Error('queda de rede') }).api.visitaAnteriorPedir(CHAVE, { slug: 'carcara', data: '2026-11-05' })).motivo, 'rede')
})

test('migration: prazo no servidor (23h59:59 de Natal), uma por casa, origem própria e sem expor nota interna', () => {
  const sql = ler('supabase/migrations/20261226_caca_visita_anterior.sql')
  assert.match(sql, /timestamp '2026-11-06 00:00:00' at time zone 'America\/Fortaleza'/, 'o prazo acaba à meia-noite de Natal do dia 6')
  assert.match(sql, /prazo_encerrado/)
  assert.match(sql, /ja_carimbou/); assert.match(sql, /ja_pedido/); assert.match(sql, /limite_pedidos/)
  assert.match(sql, /'visita_anterior'/); assert.match(sql, /origem in \('gps', 'unidade_sem_coordenada', 'excecao_painel', 'visita_anterior'\)/)
  assert.match(sql, /carimbos_origem_definir/, 'o gatilho de origem preserva visita_anterior')
  const minhas = sql.slice(sql.indexOf('function public.caca_excecao_minhas'), sql.indexOf('function public.caca_excecao_listar'))
  assert.doesNotMatch(minhas, /'decisao_nota'|'nota'|'email'|'whatsapp'|'decidido_por'/, 'a pessoa nunca vê nota interna nem contato')
  assert.match(sql, /grant execute on function public\.caca_visita_anterior_prazo\(\), public\.caca_visita_anterior_pedir\(text, text, text, date, text\) to anon, authenticated/)
  assert.doesNotMatch(sql, /festival_fim|voucher_dias|corte_hora_local/, 'não mexe nas datas gerais da edição nem dos vouchers')
})

test('a central monta o cartão (com mapa e sem mapa) e o painel decide pela mesma fila', () => {
  const central = ler('src/edicao/caca/Central.jsx')
  assert.equal((central.match(/<VisitaAnterior /g) || []).length, 2)
  const painel = ler('painel-app/src/components/vistas/caca/Excecoes.jsx')
  assert.match(painel, /visita_anterior/)
})
