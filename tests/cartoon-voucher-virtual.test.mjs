// Voucher virtual — página do link (src/edicao/rota/voucherVirtual.js; decisões do Wilker, 04/11/2026).
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as V from '../src/edicao/rota/voucherVirtual.js'
import { COR_DO_VOUCHER, CARTAO, VERSO_QR, VERSO_CODIGO, arteDoVoucher } from '../src/data/voucherArteEdicao.js'

const PUB = fileURLToPath(new URL('../public/', import.meta.url))
const noDisco = (src) => existsSync(PUB + src.replace(/^\//, ''))

const TOKEN = 'abcdefgh2345'

test('token: 12 letras sem 0/o/1/l/i, só no caminho exato', () => {
  assert.equal(V.tokenDoCaminho(`/cartoon/voucher/${TOKEN}`), TOKEN)
  assert.equal(V.tokenDoCaminho(`/cartoon/voucher/${TOKEN.toUpperCase()}/`), TOKEN)
  assert.equal(V.tokenDoCaminho('/cartoon/voucher/abcdefgh0123'), null, 'sem 0 e 1')
  assert.equal(V.tokenDoCaminho('/cartoon/voucher/abc'), null)
  assert.equal(V.tokenDoCaminho(`/cartoon/voucher/${TOKEN}/x`), null)
  assert.equal(V.tokenDoCaminho(`/cartoon/carimbo/${TOKEN}`), null)
})

test('rota: token ruim abre a página (que explica); sem token é inexistente', async () => {
  const { resolverCena } = await import('../src/edicao/rotas.js')
  assert.deepEqual(resolverCena(`/cartoon/voucher/${TOKEN.toUpperCase()}`), { cena: 'voucher', token: TOKEN })
  assert.deepEqual(resolverCena('/cartoon/voucher/qualquer'), { cena: 'voucher', token: 'qualquer' })
  assert.deepEqual(resolverCena('/cartoon/voucher'), { cena: 'inexistente' })
  assert.deepEqual(resolverCena(`/cartoon/voucher/${TOKEN}/x`), { cena: 'inexistente' })
})

test('situação: usado e cancelado vencem a data; antes de 5/11 e depois de 15/11 não vale', () => {
  const dentro = new Date('2026-11-08T15:00:00-03:00')
  assert.equal(V.situacao({ estado: 'valido' }, dentro), 'valido')
  assert.equal(V.situacao({ estado: 'valido' }, new Date('2026-11-04T23:59:00-03:00')), 'antes')
  assert.equal(V.situacao({ estado: 'valido' }, new Date('2026-11-05T00:00:00-03:00')), 'valido')
  assert.equal(V.situacao({ estado: 'valido' }, new Date('2026-11-15T23:59:00-03:00')), 'valido', 'o último dia vale até a meia-noite de Natal')
  assert.equal(V.situacao({ estado: 'valido' }, new Date('2026-11-16T00:00:01-03:00')), 'vencido')
  assert.equal(V.situacao({ estado: 'usado' }, new Date('2026-11-20T00:00:00-03:00')), 'usado')
  assert.equal(V.situacao({ estado: 'cancelado' }, dentro), 'cancelado')
  assert.equal(V.situacao(null, dentro), 'desconhecido')
})

test('mensagens: nenhum estado fica sem título e sem "Sweet" sozinho', () => {
  for (const e of ['valido', 'antes', 'vencido', 'usado', 'cancelado', 'desconhecido']) {
    const m = V.mensagem(e, { casa: 'Adocee' })
    assert.ok(m.titulo && m.texto, e)
    assert.doesNotMatch(`${m.titulo} ${m.texto}`, /\bSweet\b(?! (Lovers?|Awards|&))/, e)
  }
  assert.match(V.mensagem('valido', { casa: 'Adocee' }).texto, /Adocee/)
})

test('links: o QR leva ao painel da marca com o código; o link do cliente leva o token', () => {
  assert.equal(V.linkDoVoucher('https://x.com', TOKEN), `https://x.com/cartoon/voucher/${TOKEN}`)
  assert.equal(V.linkDaBaixa('https://x.com', 'SCW-2ZMRN'), 'https://x.com/painel/?voucher=SCW-2ZMRN')
})

test('consultar: formato ruim nem chega à rede; resposta vazia vira null; erro propaga', async () => {
  let chamadas = 0
  const buscar = (corpo) => async () => { chamadas++; return { ok: true, json: async () => corpo } }
  assert.equal(await V.consultar('curto', { buscar: buscar({}) }), null)
  assert.equal(chamadas, 0)
  assert.deepEqual(await V.consultar(TOKEN, { buscar: buscar({ codigo: 'SCW-2ZMRN', estado: 'valido' }) }), { codigo: 'SCW-2ZMRN', estado: 'valido' })
  assert.equal(await V.consultar(TOKEN, { buscar: buscar(null) }), null)
  await assert.rejects(V.consultar(TOKEN, { buscar: async () => ({ ok: false, status: 500, json: async () => null }) }))
})

test('arte do voucher: 27 casas, 9 por cor, toda imagem existe no disco; casa sem cartão não ganha arte', () => {
  const slugs = Object.keys(COR_DO_VOUCHER)
  assert.equal(slugs.length, 27)
  for (const cor of ['amarelo', 'turquesa', 'roxo']) assert.equal(slugs.filter((s) => COR_DO_VOUCHER[s] === cor).length, 9, cor)
  for (const s of slugs) {
    const a = arteDoVoucher(s)
    assert.ok(noDisco(a.frente), `frente ausente: ${a.frente}`)
    assert.ok(noDisco(a.verso), `verso ausente: ${a.verso}`)
    assert.equal(a.largura / a.altura, CARTAO.largura / CARTAO.altura, 'proporção do cartão')
  }
  assert.equal(arteDoVoucher('delas-cafe-bistro'), null)
  assert.equal(arteDoVoucher(undefined), null)
})

test('arte do voucher: QR e código cabem dentro do cartão, e o QR fica à direita do texto do verso', () => {
  assert.ok(VERSO_QR.x >= 0 && VERSO_QR.x + VERSO_QR.lado <= CARTAO.largura)
  assert.ok(VERSO_QR.y >= 0 && VERSO_QR.y + VERSO_QR.lado < VERSO_CODIGO.y, 'o código fica abaixo do QR')
  assert.ok(VERSO_CODIGO.y < CARTAO.altura && Math.abs(VERSO_CODIGO.x - (VERSO_QR.x + VERSO_QR.lado / 2)) < 0.5, 'código centrado sob o QR')
})
