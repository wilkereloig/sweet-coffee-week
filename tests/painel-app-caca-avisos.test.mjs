// Painel › Caça › Avisos: compor, validar, imprevisto confirmado, chamadas ao banco e travas do envio (migration 20261230).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as C from '../painel-app/src/lib/caca.js'

const mem = new Map()
globalThis.sessionStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) }
const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const ler = (rel) => readFileSync(join(raiz, rel), 'utf8')

function falsoFetch (resposta = {}) {
  const chamadas = []
  const f = async (url, op) => { chamadas.push({ url, corpo: JSON.parse(op.body) }); return { ok: true, status: 200, text: async () => JSON.stringify(resposta), json: async () => resposta } }
  return { f, chamadas }
}

const CASA = '22222222-2222-4222-8222-222222222222'

test('imprevisto: o texto sai só de fatos confirmados e nunca sem casa, dia e situação', () => {
  assert.equal(C.comporImprevisto({ casa: '', dia: '2026-11-08', situacao: 'não abre' }), null)
  assert.equal(C.comporImprevisto({ casa: 'Casa X', dia: '', situacao: 'não abre' }), null)
  assert.equal(C.comporImprevisto({ casa: 'Casa X', dia: '2026-11-08', situacao: '' }), null)
  const t = C.comporImprevisto({ casa: 'Casa X', unidade: 'Tirol', dia: '2026-11-08', situacao: 'não abre' })
  assert.equal(t.titulo, 'Aviso sobre Casa X')
  assert.equal(t.corpo, 'Casa X (Tirol): não abre em 08/11. Confirmado pela organização.')
  assert.equal(C.comporImprevisto({ casa: 'Casa X', dia: '2026-11-08', situacao: 'abre só à tarde' }).corpo, 'Casa X: abre só à tarde em 08/11. Confirmado pela organização.')
  const longo = C.comporImprevisto({ casa: 'C'.repeat(200), unidade: 'U', dia: '2026-11-08', situacao: 'S'.repeat(90) })
  assert.ok(longo.titulo.length <= C.AVISO_LIMITES.titulo && longo.corpo.length <= C.AVISO_LIMITES.corpo)
})

test('validar: título, texto, limites, contato proibido e imprevisto com casa e dia', () => {
  const ok = { categoria: 'edicao', titulo: 'Novidade', corpo: 'A rota abre às 10h.' }
  assert.deepEqual(C.validarAviso(ok), [])
  assert.ok(C.validarAviso({ ...ok, titulo: '' }).length)
  assert.ok(C.validarAviso({ ...ok, corpo: 'x'.repeat(241) }).length)
  assert.ok(C.validarAviso({ ...ok, titulo: 'x'.repeat(81) }).length)
  for (const ruim of ['fale com a@b.com', 'ligue 84 99999-1234', 'abra #mapa=abc']) assert.ok(C.validarAviso({ ...ok, corpo: ruim }).some((e) => /e-mail|telefone|link pessoal/.test(e)), ruim)
  assert.equal(C.validarAviso({ ...ok, categoria: 'imprevisto' }).length, 2, 'sem casa e sem dia')
  assert.deepEqual(C.validarAviso({ ...ok, categoria: 'imprevisto', casa: CASA, dia: '2026-11-08' }), [])
  assert.ok(C.validarAviso({ ...ok, enviar_em: 'lixo' }).length)
})

test('corpo da RPC: comunicado vai para todos ou só quem ligou o celular; imprevisto só para a casa na rota', () => {
  const base = { categoria: 'edicao', titulo: ' T ', corpo: ' C ', destino: '/cartoon/caca/metas', publico: 'com_push' }
  assert.deepEqual(C.corpoDoAviso(base), { categoria: 'edicao', titulo: 'T', corpo: 'C', destino: '/cartoon/caca/metas', publico: { tipo: 'com_push' } })
  assert.deepEqual(C.corpoDoAviso({ ...base, publico: 'qualquer' }).publico, { tipo: 'todos' }, 'público desconhecido nunca vira algo maior')
  const imp = C.corpoDoAviso({ categoria: 'imprevisto', titulo: 'T', corpo: 'C', casa: CASA, dia: '2026-11-08', publico: 'todos' })
  assert.deepEqual(imp.publico, { tipo: 'casa_na_rota' }, 'imprevisto ignora "todos"')
  assert.equal(imp.participacao_id, CASA); assert.equal(imp.dia, '2026-11-08')
  assert.match(C.corpoDoAviso({ ...base, enviar_em: '2999-01-01T12:00' }).enviar_em, /^2999-01-01T/)
  assert.ok(!('enviar_em' in C.corpoDoAviso(base)))
})

test('categorias manuais não incluem meta nem avaliação pendente (essas são automáticas)', () => {
  assert.deepEqual(C.CATEGORIAS_AVISO.map(([k]) => k), ['edicao', 'voucher', 'imprevisto'])
  for (const [, destino] of C.DESTINOS_AVISO.map((d) => [d[1], d[0]])) assert.ok(destino === '/cartoon/caca' || destino.startsWith('/cartoon/caca/'), destino)
  assert.equal(C.PUBLICOS_AVISO.length, 2)
})

test('chamadas: cada ação vai para a RPC certa com a senha da sessão; o push do aviso é por id', async () => {
  mem.set('scw_org', 'senha-de-teste')
  const { f, chamadas } = falsoFetch({ ok: true })
  await C.cacaApi.avisosListar('2026.2', f)
  await C.cacaApi.avisosCasas('2026.2', f)
  await C.cacaApi.criarAviso({ categoria: 'edicao', titulo: 'T', corpo: 'C' }, f)
  await C.cacaApi.estimarAviso('id-1', f)
  await C.cacaApi.enviarAviso('id-1', f)
  await C.cacaApi.cancelarAviso('id-2', f)
  await C.cacaApi.pushDoAvisoSimular('id-1', f)
  await C.cacaApi.enviarPushDoAviso('id-1', f)
  const nomes = chamadas.map((c) => c.url.split('/').pop())
  assert.deepEqual(nomes, ['caca_aviso_listar', 'caca_avisos_casas', 'caca_aviso_criar', 'caca_aviso_estimar', 'caca_aviso_enviar', 'caca_aviso_cancelar', 'caca-push', 'caca-push'])
  assert.equal(chamadas[0].corpo.p_edicao, '2026.2')
  assert.equal(chamadas[2].corpo.p_dados.categoria, 'edicao')
  assert.equal(chamadas[6].corpo.dry_run, true); assert.equal(chamadas[6].corpo.aviso_id, 'id-1')
  assert.equal(chamadas[7].corpo.dry_run, false); assert.equal(chamadas[7].corpo.aviso_id, 'id-1')
  assert.ok(!('titulo' in chamadas[7].corpo) && !('corpo' in chamadas[7].corpo), 'o conteúdo do push vem do banco')
})

test('envio real: confirmação antes, central antes do celular, e só quem pode enviar vê os botões', () => {
  const src = ler('painel-app/src/components/vistas/caca/Avisos.jsx')
  assert.ok(src.indexOf("await confirmar(texto") < src.indexOf('cacaApi.enviarAviso('), 'confirma antes de enviar')
  assert.ok(src.indexOf('cacaApi.enviarAviso(') < src.indexOf('cacaApi.enviarPushDoAviso('), 'central antes do celular')
  assert.match(src, /podeEnviar = pode\('producao\.gerir'\)/)
  assert.match(src, /podeEnviar && \(a\.estado === 'rascunho' \|\| a\.estado === 'agendado'\)/, 'cancelar/enviar só antes do envio')
  assert.match(src, /perigo: true/)
  assert.ok(!/p_simular|dry_run/.test(src))
  // a lista não mostra e-mail, telefone nem apelido
  assert.ok(!/(email|whatsapp|apelido)/i.test(src.replace(/Nenhum nome, e-mail ou telefone de participante aparece aqui\./, '').replace(/não coloque e-mail[^'`]*/gi, '')), 'tela sem dado pessoal')
})

test('mensagens de erro novas existem em português', () => {
  for (const k of ['conteudo_com_dado_pessoal', 'destino_invalido', 'vigencia_passada', 'agendamento_passado', 'imprevisto_so_para_quem_tem_a_casa', 'aviso_ja_enviado', 'so_antes_do_envio', 'aviso_nao_enviado']) {
    assert.notEqual(C.mensagemCaca(new Error(k)), k, k)
  }
})

test('resumo do envio só tem contagens', () => {
  assert.equal(C.resumoDoEnvio({ estado: 'rascunho' }), '')
  assert.equal(C.resumoDoEnvio({ estado: 'enviado', alvos: 10, vistos: 1, push_enviados: 3, push_falhas: 0 }), '10 na central · 1 viu · 3 no celular')
  assert.equal(C.resumoDoEnvio({ estado: 'enviado', alvos: 10, vistos: 2, push_enviados: 3, push_falhas: 2 }), '10 na central · 2 viram · 3 no celular · 2 falhas')
})

test('avisos automáticos: o interruptor pede confirmação e fala com as RPCs certas', async () => {
  mem.set('scw_org', 'senha-de-teste')
  const { f, chamadas } = falsoFetch({ ligado: false })
  await C.cacaApi.avisosAutoEstado(f); await C.cacaApi.avisosAutoDefinir(true, f); await C.cacaApi.avisosAutoDefinir(0, f)
  assert.deepEqual(chamadas.map((c) => c.url.split('/').pop()), ['caca_avisos_auto_estado', 'caca_avisos_auto_definir', 'caca_avisos_auto_definir'])
  assert.equal(chamadas[1].corpo.p_ligado, true); assert.equal(chamadas[2].corpo.p_ligado, false)
  const src = ler('painel-app/src/components/vistas/caca/Avisos.jsx')
  const f2 = src.slice(src.indexOf('async function trocar()'))
  assert.ok(f2.indexOf('await confirmar(') < f2.indexOf('cacaApi.avisosAutoDefinir('), 'confirma antes de ligar')
})
