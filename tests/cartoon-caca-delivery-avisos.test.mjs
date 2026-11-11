// Avisos de delivery (pedido do Wilker, 11/11/2026): migration 20270130, a contagem do painel e o destino do clique.
// O ensaio com dados reais (ROLLBACK) está no histórico; aqui ficam as regras que não podem mudar sem alguém perceber.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { deliveryPorDia } from '../painel-app/src/lib/caca.js'
import { destinoSeguro } from '../src/edicao/caca/notificacoes/logica.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const sql = ler('supabase/migrations/20270130_caca_delivery_avisos.sql')
const rev = ler('supabase/reverter/20270130_caca_delivery_avisos.sql')

test('nasce desligado, 17h–19h, uma rodada por dia, trava de 1000 pessoas', () => {
  assert.match(sql, /values \('delivery_aviso', '\{"ligado":false,"hora":17,"janela_horas":2,"max_por_dia":1000\}'::jsonb/)
  assert.match(sql, /a\.chave_dedupe like 'delivery:' \|\| v_dia \|\| ':%'[\s\S]*?'ja_gerado', true/)
  assert.match(sql, /if v_cand > v_max then[\s\S]*?'excedeu'/)
})

test('só dado do cadastro: combo aprovado, unidade que participa com delivery do combo; grátis só se todas dizem grátis', () => {
  assert.match(sql, /u\.participa and u\.delivery_combo = 'sim'/)
  assert.match(sql, /pa\.combo_status = 'aprovado'/)
  assert.match(sql, /bool_and\(coalesce\(u\.delivery_taxa, ''\) ~\* 'gr\[aá\]tis'\)/)
})

test('cada pessoa recebe uma casa que falta no mapa, sem repetir casa já avisada; texto não promete carimbo', () => {
  assert.match(sql, /not exists \(select 1 from public\.carimbos k where k\.mapa_id = m\.id and k\.participacao_id = c\.participacao_id and k\.anulado_em is null\)/)
  assert.match(sql, /a\.chave_dedupe like 'delivery:%:' \|\| c\.slug\),\s*md5\(/)
  assert.match(sql, /quando receber, peça o carimbo do delivery na Caça/)
  assert.ok(!/ganh|garant/i.test(sql.match(/left\('Ainda falta[^)]*\)/)[0]), 'sem promessa')
  assert.match(sql, /'\/cartoon\/combos\/' \|\| r\.slug/)
})

test('o clique abre a ficha do combo, e só ela (site e service worker)', () => {
  assert.equal(destinoSeguro('/cartoon/combos/vivianne-castro-doces'), '/cartoon/combos/vivianne-castro-doces')
  for (const ruim of ['/cartoon/combos/', '/cartoon/combos/a/b', '/cartoon/combos/X', '/cartoon/combos/a?b=1', '/cartoon/combos/a--b']) assert.equal(destinoSeguro(ruim), null, ruim)
  const sw = ler('public/caca-sw.js')
  assert.ok(sw.includes(String.raw`var COMBO = /^\/cartoon\/combos\/[a-z0-9]+(?:-[a-z0-9]+)*$/;`), 'o service worker aceita a ficha do combo')
})

test('painel: por dia, casas com mais pessoas primeiro, nome da casa no lugar do slug', () => {
  const r = deliveryPorDia([
    { dia: '2026-11-11', casa: 'a', geradas: 3, enviadas: 1 },
    { dia: '2026-11-11', casa: 'b', geradas: 5, enviadas: 0 },
    { dia: '2026-11-12', casa: 'a', geradas: 2, enviadas: 2 },
    null, { dia: 3 },
  ], [{ slug: 'a', nome: 'Casa A' }])
  assert.equal(r[0].dia, '2026-11-12')
  assert.deepEqual(r[1].casas.map((c) => c.nome), ['b', 'Casa A'])
  assert.equal(r[1].geradas, 8); assert.equal(r[1].enviadas, 1)
  assert.deepEqual(deliveryPorDia(undefined), [])
})

test('reverter apaga só o delivery e devolve ciclo, push e preferências', () => {
  assert.match(rev, /delete from public\.caca_aviso where categoria = 'delivery'/)
  assert.match(rev, /create or replace function public\.caca_avisos_ciclo\(\)/)
  assert.match(rev, /v_padrao := a\.categoria = 'disputa';/)
  assert.ok(!/delivery_gerar\(\)/.test(rev.replace(/drop function[^\n]*/g, '')))
})
