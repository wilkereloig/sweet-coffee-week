// Caça aos Carimbos — wrappers de RPC e da edge function (src/edicao/caca/api.js) com cliente simulado.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { criarApi, motivoDoErro } from '../src/edicao/caca/api.js'

const CHAVE = 'AbCdEfGhIjKlMnOpQrStUvWxYz012-_9'
const UUID = '3f2b8c1e-5a4d-4e7f-9b6a-1c2d3e4f5a6b'
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz012-_9'

/** Cliente simulado: guarda as chamadas e responde com `respostas[nome]` (valor ou função; Error = exceção). */
function mock (respostas = {}) {
  const chamadas = []
  const chamar = async (nome, corpo) => {
    chamadas.push([nome, corpo])
    const r = typeof respostas[nome] === 'function' ? respostas[nome](corpo) : respostas[nome]
    if (r instanceof Error) throw r
    return r === undefined ? null : r
  }
  return { chamadas, api: criarApi({ chamar, edicao: '2026.2' }) }
}

test('erros viram motivo e nunca vazam texto livre', () => {
  assert.equal(motivoDoErro(new Error('muitos_pedidos')), 'muitos_pedidos')
  assert.equal(motivoDoErro(new Error('Failed to fetch')), 'rede')
  assert.equal(motivoDoErro(new Error(`chave ${CHAVE} inválida`)), 'rede')
  assert.equal(motivoDoErro(null), 'rede')
})

test('mapaCriar usa mapa_criar_v2, exige chave válida e traduz as exceções', async () => {
  const { api, chamadas } = mock({ mapa_criar_v2: { chave: CHAVE } })
  const r = await api.mapaCriar({ apelido: 'Ana', email: 'a@b.co', whatsapp: '', ranking: true, aceite: true })
  assert.deepEqual(r, { ok: true, chave: CHAVE })
  assert.deepEqual(chamadas[0], ['mapa_criar_v2', { p_edicao: '2026.2', p_apelido: 'Ana', p_email: 'a@b.co', p_whatsapp: null, p_ranking: true, p_aceite: true }])
  assert.equal((await mock({ mapa_criar_v2: { chave: 'curta' } }).api.mapaCriar({})).motivo, 'resposta_invalida')
  assert.equal((await mock({ mapa_criar_v2: new Error('muitos_pedidos') }).api.mapaCriar({})).motivo, 'muitos_pedidos')
})

test('mapaLer: chave ruim nem chama o banco; null do banco = mapa_desconhecido', async () => {
  const { api, chamadas } = mock({ mapa_ler_v2: { total_casas: 27, casas_validadas: 3, casas: [] } })
  assert.deepEqual(await api.mapaLer('lixo'), { ok: false, motivo: 'mapa_desconhecido' })
  assert.equal(chamadas.length, 0)
  const r = await api.mapaLer(CHAVE)
  assert.equal(r.ok, true)
  assert.equal(r.mapa.total_casas, 27)
  assert.deepEqual(await mock({}).api.mapaLer(CHAVE), { ok: false, motivo: 'mapa_desconhecido' })
})

test('emailStatus: confirmado e chave trocada', async () => {
  assert.deepEqual(await mock({ mapa_confirmar_email_status: { confirmado: true, valido: true } }).api.emailStatus(CHAVE), { ok: true, confirmado: true, valido: true })
  assert.deepEqual(await mock({ mapa_confirmar_email_status: { confirmado: false, valido: false } }).api.emailStatus(CHAVE), { ok: true, confirmado: false, valido: false })
})

test('enviarLink pede o link pessoal à edge function (finalidade link), com a chave e só entrada válida', async () => {
  const pedidos = []
  const com = (corpo, ok = true) => criarApi({
    edicao: '2026.2', urlBase: 'https://x.supabase.co',
    buscar: async (url, init) => { pedidos.push([url, JSON.parse(init.body)]); return { ok, json: async () => corpo } },
  })
  assert.deepEqual(await com({ ok: true }).enviarLink({ email: ' ana@b.co ', chave: CHAVE }), { ok: true })
  assert.deepEqual(pedidos[0], ['https://x.supabase.co/functions/v1/caca-email', { edicao: '2026.2', email: 'ana@b.co', finalidade: 'link', chave: CHAVE }])
  assert.deepEqual(await com({ ok: true, limitado: true }).enviarLink({ email: 'a@b.co', chave: CHAVE }), { ok: true, limitado: true })
  assert.deepEqual(await com({ ok: false, motivo: 'email_indisponivel' }).enviarLink({ email: 'a@b.co', chave: CHAVE }), { ok: false, motivo: 'email_indisponivel' })
  assert.equal((await com({ ok: false, motivo: 'Texto Livre!' }, false).enviarLink({ email: 'a@b.co', chave: CHAVE })).motivo, 'rede')
  const antes = pedidos.length
  assert.equal((await com({}).enviarLink({ email: 'a@b.co', chave: 'curta' })).motivo, 'pedido_invalido')
  assert.equal((await com({}).enviarLink({ email: 'a@b.co', chave: null })).motivo, 'pedido_invalido')
  for (const ruim of ['sem-arroba', 'a,b@x.co', 'a"b@x.co', '<a>@x.co', '']) assert.equal((await com({}).enviarLink({ email: ruim, chave: CHAVE })).motivo, 'email_invalido', ruim)
  assert.equal(pedidos.length, antes, 'entrada ruim não chega à rede')
})

test('pedirCodigo fala com a edge function e respeita os códigos do contrato', async () => {
  const pedidos = []
  const com = (corpo, ok = true) => criarApi({
    edicao: '2026.2', urlBase: 'https://x.supabase.co',
    buscar: async (url, init) => { pedidos.push([url, JSON.parse(init.body)]); return { ok, json: async () => corpo } },
  })
  assert.deepEqual(await com({ ok: true }).pedirCodigo({ email: ' ana@b.co ', finalidade: 'recuperar' }), { ok: true })
  assert.deepEqual(pedidos[0], ['https://x.supabase.co/functions/v1/caca-email', { edicao: '2026.2', email: 'ana@b.co', finalidade: 'recuperar' }])
  // A chave do mapa só viaja em 'confirmar' (o código sai para o mapa de quem pediu); 'recuperar' nunca leva chave.
  await com({ ok: true }).pedirCodigo({ email: 'ana@b.co', finalidade: 'recuperar', chave: CHAVE })
  assert.equal(pedidos.at(-1)[1].chave, undefined)
  await com({ ok: true }).pedirCodigo({ email: 'ana@b.co', finalidade: 'confirmar', chave: CHAVE })
  assert.equal(pedidos.at(-1)[1].chave, CHAVE)
  assert.deepEqual(await com({ ok: true, limitado: true }).pedirCodigo({ email: 'a@b.co', finalidade: 'confirmar', chave: CHAVE }), { ok: true, limitado: true })
  assert.deepEqual(await com({ ok: false, motivo: 'email_indisponivel' }).pedirCodigo({ email: 'a@b.co', finalidade: 'recuperar' }), { ok: false, motivo: 'email_indisponivel' })
  assert.deepEqual(await com({ ok: false, motivo: 'falha_temporaria' }).pedirCodigo({ email: 'a@b.co', finalidade: 'recuperar' }), { ok: false, motivo: 'falha_temporaria' })
  assert.equal((await com({ ok: false, motivo: 'Texto Livre!' }, false).pedirCodigo({ email: 'a@b.co', finalidade: 'recuperar' })).motivo, 'rede')
  const antes = pedidos.length
  assert.equal((await com({}).pedirCodigo({ email: 'a@b.co', finalidade: 'outra' })).motivo, 'pedido_invalido')
  assert.equal((await com({}).pedirCodigo({ email: 'sem-arroba', finalidade: 'recuperar' })).motivo, 'email_invalido')
  // SEC-07: vírgula, aspas ou <> nunca saem para a edge function (o valor vai ao campo "to" do provedor)
  for (const ruim of ['a,b@x.co', 'a"b@x.co', '<a>@x.co', 'a b@x.co']) assert.equal((await com({}).pedirCodigo({ email: ruim, finalidade: 'recuperar' })).motivo, 'email_invalido', ruim)
  assert.equal(pedidos.length, antes, 'entrada ruim não chega à rede')
  const quebrada = criarApi({ buscar: async () => { throw new Error('offline') } })
  assert.equal((await quebrada.pedirCodigo({ email: 'a@b.co', finalidade: 'recuperar' })).motivo, 'rede')
})

test('codigoValidar: só 6 dígitos saem; recuperar devolve a chave nova; toda falha é codigo_invalido', async () => {
  const { api, chamadas } = mock({ mapa_codigo_validar: (c) => (c.p_finalidade === 'recuperar' ? { ok: true, finalidade: 'recuperar', chave: CHAVE, apelido: 'Ana' } : { ok: true, finalidade: 'confirmar' }) })
  assert.equal((await api.codigoValidar({ email: 'a@b.co', codigo: '12345', finalidade: 'recuperar' })).motivo, 'codigo_invalido')
  assert.equal((await api.codigoValidar({ email: 'a@b.co', codigo: 'abcdef', finalidade: 'recuperar' })).motivo, 'codigo_invalido')
  assert.equal(chamadas.length, 0)
  assert.deepEqual(await api.codigoValidar({ email: 'a@b.co', codigo: '123 456', finalidade: 'recuperar' }), { ok: true, finalidade: 'recuperar', chave: CHAVE, apelido: 'Ana' })
  assert.equal(chamadas[0][1].p_codigo, '123456')
  // 20261216: confirmar só valida com a chave do mapa de quem digita (o código vale para o mapa que o pediu).
  assert.equal((await api.codigoValidar({ email: 'a@b.co', codigo: '123456', finalidade: 'confirmar' })).motivo, 'codigo_invalido')
  assert.deepEqual(await api.codigoValidar({ email: 'a@b.co', codigo: '123456', finalidade: 'confirmar', chave: CHAVE }), { ok: true, finalidade: 'confirmar' })
  assert.equal((await mock({ mapa_codigo_validar: { ok: false, motivo: 'codigo_invalido' } }).api.codigoValidar({ email: 'a@b.co', codigo: '123456', finalidade: 'recuperar' })).motivo, 'codigo_invalido')
  assert.equal((await mock({ mapa_codigo_validar: { ok: true, finalidade: 'recuperar', chave: 'ruim' } }).api.codigoValidar({ email: 'a@b.co', codigo: '123456', finalidade: 'recuperar' })).motivo, 'resposta_invalida')
  assert.equal((await mock({ mapa_codigo_validar: new Error('Failed to fetch') }).api.codigoValidar({ email: 'a@b.co', codigo: '123456', finalidade: 'recuperar' })).motivo, 'rede')
})

test('ranking e metas', async () => {
  const { api, chamadas } = mock({ caca_ranking_publico: [{ posicao: 1, apelido: 'Ana', casas: 3, extras: 1 }], caca_metas_ler: { total_casas: 27, metas: [] } })
  assert.equal((await api.ranking(999)).ranking.length, 1)
  assert.equal(chamadas[0][1].p_limite, 50)
  await api.ranking(0)
  assert.equal(chamadas[1][1].p_limite, 10)
  assert.equal((await mock({ caca_ranking_publico: { nao: 'lista' } }).api.ranking()).motivo, 'resposta_invalida')
  assert.equal((await api.metasLer(CHAVE)).metas.total_casas, 27)
  assert.equal((await mock({}).api.metasLer(CHAVE)).motivo, 'mapa_desconhecido')
})

test('grupos: as 12 RPCs, com nomes e argumentos do contrato', async () => {
  const ok = { ok: true }
  const nomes = ['caca_grupo_criar', 'caca_grupo_entrar', 'caca_grupo_convite_novo', 'caca_grupo_convite_revogar', 'caca_grupo_sair', 'caca_grupo_remover_membro',
    'caca_grupo_listar', 'caca_grupo_ler', 'caca_grupo_rota_adicionar', 'caca_grupo_rota_remover', 'caca_grupo_rota_mover']
  const { api, chamadas } = mock({ ...Object.fromEntries(nomes.map((n) => [n, ok])), caca_grupo_convite_ver: { valido: true, nome_do_grupo: 'Doces', membros_qtd: 3 } })
  await api.grupoCriar(CHAVE, 'Doces', true)
  await api.grupoEntrar(CHAVE, TOKEN, true)
  await api.grupoConviteNovo(CHAVE, UUID)
  await api.grupoConviteRevogar(CHAVE, UUID)
  await api.grupoSair(CHAVE, UUID)
  await api.grupoRemoverMembro(CHAVE, UUID, UUID)
  await api.grupoListar(CHAVE)
  await api.grupoLer(CHAVE, UUID)
  await api.grupoRotaAdicionar(CHAVE, UUID, 'casa-a', 6)
  await api.grupoRotaRemover(CHAVE, UUID, 'casa-a')
  await api.grupoRotaMover(CHAVE, UUID, 'casa-a', 2, 7)
  const v = await api.grupoConviteVer(TOKEN)
  assert.deepEqual(chamadas.map((c) => c[0]), [...nomes, 'caca_grupo_convite_ver'])
  assert.deepEqual(chamadas[0][1], { p_chave: CHAVE, p_nome: 'Doces', p_aceite_visibilidade: true })
  assert.deepEqual(chamadas[10][1], { p_chave: CHAVE, p_grupo: UUID, p_slug: 'casa-a', p_posicao: 2, p_versao: 7 })
  assert.deepEqual(v, { ok: true, valido: true, nome_do_grupo: 'Doces', membros_qtd: 3 })
})

test('grupos: id, token e chave ruins nem chegam ao banco; falha de negócio passa com motivo', async () => {
  const { api, chamadas } = mock({ caca_grupo_ler: { ok: false, motivo: 'negado' }, caca_grupo_convite_ver: { valido: false, motivo: 'convite_revogado' } })
  assert.equal((await api.grupoLer(CHAVE, 'nao-e-uuid')).motivo, 'negado')
  assert.equal((await api.grupoLer('lixo', UUID)).motivo, 'mapa_desconhecido')
  assert.equal((await api.grupoEntrar(CHAVE, 'curto', true)).motivo, 'convite_invalido')
  assert.equal((await api.grupoRemoverMembro(CHAVE, UUID, 'x')).motivo, 'membro_desconhecido')
  assert.deepEqual(await api.grupoConviteVer('curto'), { ok: true, valido: false, nome_do_grupo: null, membros_qtd: null, motivo: 'convite_invalido' })
  assert.equal(chamadas.length, 0)
  assert.deepEqual(await api.grupoLer(CHAVE, UUID), { ok: false, motivo: 'negado' })
  const inv = await api.grupoConviteVer(TOKEN)
  assert.deepEqual([inv.valido, inv.motivo, inv.nome_do_grupo], [false, 'convite_revogado', null])
})

test('resposta sem a forma do contrato vira falha, nunca ok', async () => {
  assert.equal((await mock({ caca_grupo_listar: null }).api.grupoListar(CHAVE)).ok, false)
  assert.equal((await mock({ caca_grupo_listar: [] }).api.grupoListar(CHAVE)).motivo, 'resposta_invalida')
  assert.equal((await mock({ caca_grupo_listar: { ok: 'sim' } }).api.grupoListar(CHAVE)).ok, false)
})

test('push: registrar, preferências e remover', async () => {
  const sub = { endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'a', auth: 'b' } }
  const { api, chamadas } = mock({ caca_push_registrar: { ok: true, prefs: {}, dispositivos: 1 }, caca_push_prefs: { ok: false, motivo: 'sem_assinatura' }, caca_push_remover: { ok: true, removidos: 2 } })
  assert.equal((await api.pushRegistrar(CHAVE, sub, { meta: true })).dispositivos, 1)
  assert.deepEqual(chamadas[0], ['caca_push_registrar', { p_chave: CHAVE, p_subscription: sub, p_prefs: { meta: true } }])
  assert.equal((await api.pushPrefs(CHAVE, { grupo: false })).motivo, 'sem_assinatura')
  assert.equal((await api.pushRemover(CHAVE)).removidos, 2)
  assert.equal(chamadas[2][1].p_endpoint, null)
  assert.equal((await api.pushRegistrar('lixo', sub)).motivo, 'mapa_desconhecido')
})

test('mapaApagar chama mapa_apagar', async () => {
  const { api, chamadas } = mock({ mapa_apagar: true })
  assert.deepEqual(await api.mapaApagar(CHAVE), { ok: true })
  assert.equal(chamadas[0][0], 'mapa_apagar')
})
