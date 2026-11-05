// Mapa da Doçura — carimbo pelo QR fixo (src/edicao/rota/carimbo.js; docs/cartoon-2026-2/14-mapa-da-docura.md §14.3).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as C from '../src/edicao/rota/carimbo.js'

const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } }
const CHAVE = 'AbCdEfGhIjKlMnOpQrStUvWxYz012-_9'

test('chave: só no formato do banco, guardada por edição, e só depois do #', () => {
  const s = memoria()
  assert.equal(C.gravarChave('2026.2', 'curta', s), false)
  assert.equal(C.gravarChave('2026.2', CHAVE, s), true)
  assert.equal(C.lerChave('2026.2', s), CHAVE)
  assert.equal(C.lerChave('2025.1', s), null)
  C.apagarChave('2026.2', s)
  assert.equal(C.lerChave('2026.2', s), null)
  assert.equal(C.lerChave('2026.2', { getItem () { throw new Error('bloqueado') } }), null)
  assert.equal(C.chaveDoHash(`#mapa=${CHAVE}`), CHAVE)
  assert.equal(C.chaveDoHash(`#x=1&mapa=${CHAVE}`), CHAVE)
  assert.equal(C.chaveDoHash('#mapa=nao'), null)
  assert.equal(C.chaveDoHash(`?mapa=${CHAVE}`), null, 'query string nunca vale')
  const link = C.linkDoMapa('https://exemplo.com', CHAVE)
  assert.match(link, /\/cartoon\/minha-rota#mapa=/)
  assert.equal(new URL(link).search, '', 'a chave não pode ir na query')
})

test('código do QR vem do caminho, em minúsculas, no formato do banco', () => {
  assert.equal(C.codigoDoCaminho('/cartoon/carimbo/abcd2345'), 'abcd2345')
  assert.equal(C.codigoDoCaminho('/cartoon/carimbo/ABCD2345/'), 'abcd2345')
  assert.equal(C.codigoDoCaminho('/cartoon/carimbo/abcd0123'), null, 'sem 0 e 1')
  assert.equal(C.codigoDoCaminho('/cartoon/carimbo/abc'), null)
  assert.equal(C.codigoDoCaminho('/cartoon/carimbo/abcd2345/x'), null)
  assert.equal(C.codigoDoCaminho('/cartoon/mapa'), null)
})

test('recusas explicam o que fazer, com a hora no fuso de Natal', () => {
  const agora = new Date('2026-11-06T15:00:00Z') // 12h00 em Natal
  assert.equal(C.quandoVolta('2026-11-06T23:40:00Z', agora), 'depois das 20h40')
  assert.equal(C.quandoVolta('2026-11-07T11:10:00Z', agora), 'amanhã, depois das 8h10')
  assert.equal(C.quandoVolta('2026-11-09T12:00:00Z', agora), 'em 09/11, depois das 9h00')
  assert.match(C.mensagemRecusa({ motivo: 'cedo', liberado_em: '2026-11-06T23:40:00Z' }, { agora }).texto, /Volte depois das 20h40\./)
  const longe = C.mensagemRecusa({ motivo: 'longe', distancia_m: 1234 }, { casa: 'Caroli Douces' })
  assert.equal(longe.titulo, 'Você não parece estar na Caroli Douces')
  assert.match(longe.texto, /1,2 km/)
  assert.equal(C.distanciaTexto(643), '640 m')
  for (const motivo of ['sem_localizacao', 'nao_aberta', 'encerrada', 'qr_invalido', 'mapa_desconhecido', 'qualquer']) {
    const m = C.mensagemRecusa({ motivo })
    assert.ok(m.titulo && m.texto, motivo)
    assert.doesNotMatch(m.titulo + m.texto, /\bSweet\b(?! (Lovers?|Awards|&))/, 'nunca "Sweet" sozinho')
  }
  assert.match(C.mensagemCriar('email_invalido'), /e-mail/)
  assert.match(C.mensagemCriar('erro_estranho'), /Tente de novo/)
})

test('álbum: cor no primeiro carimbo, ×N, avaliação pendente e ordem da edição', () => {
  const participantes = [{ slug: 'a', casa: { nome: 'Casa A' } }, { slug: 'b', casa: { nome: 'Casa B' } }, { slug: 'c' }]
  const mapa = { pontos: 5, posicao: 3, casas: [{ slug: 'b', carimbos: 2, avaliou: true }, { slug: 'c', carimbos: 1, avaliou: false }, { slug: 'fora', carimbos: 9 }] }
  const a = C.estadoAlbum(participantes, mapa)
  assert.deepEqual(a.casas.map((c) => c.slug), ['a', 'b', 'c'])
  assert.deepEqual(a.casas.map((c) => c.colorida), [false, true, true])
  assert.deepEqual(a.casas.map((c) => c.podeAvaliar), [false, false, true])
  assert.equal(a.casas[1].carimbos, 2)
  assert.equal(a.casas[2].nome, 'c')
  // Carimbo pendente (Caça aos Carimbos, 04/11): a casa sem avaliação não conta como validada.
  assert.deepEqual([a.visitadas, a.pendentes, a.total, a.pontos, a.posicao], [1, 1, 3, 5, 3])
  assert.deepEqual(C.estadoAlbum(participantes, null).visitadas, 0)
})

test('chamar: erro da função vira a mensagem do banco; posição negada vira motivo', async () => {
  const falha = async () => ({ ok: false, status: 400, json: async () => ({ message: 'email_invalido' }) })
  await assert.rejects(C.chamar('mapa_criar', {}, { buscar: falha }), /email_invalido/)
  const certo = async (url, op) => ({ ok: true, json: async () => ({ url, corpo: JSON.parse(op.body) }) })
  const r = await C.chamar('mapa_ler', { p_chave: 'x' }, { buscar: certo })
  assert.match(r.url, /\/rest\/v1\/rpc\/mapa_ler$/)
  assert.deepEqual(r.corpo, { p_chave: 'x' })
  assert.deepEqual(await C.pedirPosicao({ geo: null }), { erro: 'indisponivel' })
  assert.deepEqual(await C.pedirPosicao({ geo: { getCurrentPosition: (_, erro) => erro({ code: 1 }) } }), { erro: 'negada' })
  assert.deepEqual(await C.pedirPosicao({ geo: { getCurrentPosition: (ok) => ok({ coords: { latitude: -5.8, longitude: -35.2, accuracy: 12 } }) } }),
    { lat: -5.8, lng: -35.2, precisao: 12 })
})

test('rotas do carimbo e do regulamento; regulamento sem "Sweet" sozinho e com lacunas marcadas', async () => {
  const { resolverCena } = await import('../src/edicao/rotas.js')
  assert.deepEqual(resolverCena('/cartoon/carimbo/ABCD2345'), { cena: 'carimbo', codigo: 'abcd2345' })
  assert.deepEqual(resolverCena('/cartoon/carimbo/qualquer'), { cena: 'carimbo', codigo: 'qualquer' }, 'código ruim abre a página, que explica')
  assert.deepEqual(resolverCena('/cartoon/carimbo'), { cena: 'inexistente' })
  assert.deepEqual(resolverCena('/cartoon/carimbo/a/b'), { cena: 'inexistente' })
  assert.deepEqual(resolverCena('/cartoon/regulamento'), { cena: 'regulamento' })
  assert.deepEqual(resolverCena('/cartoon/patrocinador'), { cena: 'entrada', legado: true }, 'endereço antigo cai na entrada')
  const { REGULAMENTO } = await import('../src/edicao/cartoon/regulamento.js')
  const textos = REGULAMENTO.secoes.flatMap(([t, itens]) => [t, ...itens.map((x) => (typeof x === 'string' ? x : x.aDefinir))])
  for (const t of [REGULAMENTO.titulo, REGULAMENTO.apoio, ...textos]) assert.doesNotMatch(t, /\bSweet\b(?! (Lovers?|Awards|&))/, t)
  assert.ok(REGULAMENTO.secoes.some(([, itens]) => itens.some((x) => x.aDefinir)), 'o que falta decidir fica marcado')
  assert.ok(textos.some((t) => /12 horas/.test(t)) && textos.some((t) => /não é guardada/.test(t)))
})

test('QR do display carimba pela casa e o carimbo fica pendente até a avaliação (Caça aos Carimbos, 04/11)', async () => {
  const { readFileSync } = await import('node:fs')
  const { resolverCena } = await import('../src/edicao/rotas.js')
  const { destinoDoCodigo } = await import('../src/edicao/qrPontos.js')
  assert.equal(destinoDoCodigo('d1-cookitos'), '/cartoon/participantes/cookitos', 'com MAPA_PUBLICO desligado o QR abre a ficha; ligado, /cartoon/carimbo/<casa>')
  assert.deepEqual(resolverCena('/cartoon/carimbo/cookitos'), { cena: 'carimbo', codigo: 'cookitos' })
  const pagina = readFileSync(new URL('../src/edicao/cartoon/paginas/Carimbo.jsx', import.meta.url), 'utf8')
  assert.match(pagina, /mapa_carimbar_casa/)
  assert.match(pagina, /Ver o combo/)
  const sql = readFileSync(new URL('../supabase/migrations/20261202_carimbo_por_casa_pendente.sql', import.meta.url), 'utf8')
  assert.match(sql, /grant execute on function public\.mapa_carimbar_casa\(text, text, numeric, numeric, numeric\) to anon, authenticated/)
  assert.match(sql, /return public\.mapa_carimbar\(p_chave, v_qr/, 'a casa passa pela mesma regra do QR da unidade')
  assert.match(sql, /validadas as/, 'o placar só conta casas avaliadas')
})
