// Cartão "Sua disputa hoje" (docs/cartoon-2026-2/19): estados, corte lido do servidor, depois do corte e migration da RPC.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cartaoDaDisputa, horaDoCorte, faltaParaCorte, T } from '../src/edicao/caca/disputa/hoje.js'

const CORTE_17 = '2026-11-10T20:01:00+00:00' // 17:01 em Natal
const CORTE_12 = '2026-11-14T15:01:00+00:00' // dia 14: 12:01 em Natal
const antes = Date.parse('2026-11-10T17:45:00Z') // 14h45 em Natal
const base = { corte: CORTE_17, posicao: 8, faltam_mapa: 20, ja_ganhou: false }

test('hora do corte vem do servidor: 17h nos dias comuns, 12h no dia 14', () => {
  assert.equal(horaDoCorte(CORTE_17), '17h')
  assert.equal(horaDoCorte(CORTE_12), '12h')
  assert.equal(horaDoCorte('2026-11-10T20:31:00+00:00'), '17h30')
  assert.equal(horaDoCorte('lixo'), null)
})

test('contagem regressiva até o corte, e nada depois dele', () => {
  assert.equal(faltaParaCorte(CORTE_17, antes), '2 h 15 min')
  assert.equal(faltaParaCorte(CORTE_12, Date.parse('2026-11-14T14:30:00Z')), '30 min')
  assert.equal(faltaParaCorte(CORTE_17, Date.parse('2026-11-10T20:00:30Z')), null) // 17:00:30: o minuto das 17h ainda conta no servidor, mas a contagem já zerou
})

test('fora da zona: faltam N casas, contagem e botão perto de mim', () => {
  const c = cartaoDaDisputa({ ...base, estado: 'fora', faltam: 2 }, antes)
  assert.equal(c.tipo, 'fora')
  assert.equal(T.fora(c.faltam), 'Faltam 2 casas para a zona de voucher de hoje.')
  assert.equal(T.fora(1), 'Falta 1 casa para a zona de voucher de hoje.')
  assert.equal(c.corte, '17h')
  assert.equal(c.contagem, '2 h 15 min')
  assert.equal(c.perto, true)
})

test('fora sem número exato não aparece', () => {
  assert.equal(cartaoDaDisputa({ ...base, estado: 'fora', faltam: null }, antes), null)
  assert.equal(cartaoDaDisputa({ ...base, estado: 'fora', faltam: 0 }, antes), null)
})

test('na zona: segura a posição até a hora do corte do dia (12h no dia 14)', () => {
  const c = cartaoDaDisputa({ ...base, corte: CORTE_12, estado: 'dentro' }, Date.parse('2026-11-14T13:00:00Z'))
  assert.equal(c.tipo, 'dentro')
  assert.equal(T.dentro(c.corte), 'Você está na zona de voucher. Segure a posição até as 12h.')
  assert.equal(c.perto, false)
})

test('empate na última vaga é estado próprio, nunca "dentro"', () => {
  const c = cartaoDaDisputa({ ...base, estado: 'empate', faltam: 1, empatados: 3 }, antes)
  assert.equal(c.tipo, 'empate')
  assert.equal(c.empatados, 3)
  assert.match(T.empate, /sorteio/)
})

test('sem carimbo: uma casa já coloca na disputa', () => {
  const c = cartaoDaDisputa({ ...base, posicao: null, estado: 'sem_carimbo' }, antes)
  assert.equal(c.tipo, 'sem_carimbo')
  assert.equal(c.posicao, null)
})

test('depois do corte o cartão não promete o voucher do dia: vira disputa final, sem contagem', () => {
  const depois = Date.parse('2026-11-10T20:05:00Z')
  for (const estado of ['fora', 'dentro', 'empate', 'sem_carimbo']) {
    const c = cartaoDaDisputa({ ...base, estado, faltam: 1 }, depois)
    assert.equal(c.tipo, 'final', estado)
    assert.equal(c.contagem, null)
    assert.equal(c.corte, null)
    assert.equal(c.perto, false)
  }
})

test('quem já ganhou voucher vê a disputa final', () => {
  const c = cartaoDaDisputa({ ...base, estado: 'final', ja_ganhou: true, corte: null, vouchers: null }, antes)
  assert.equal(c.tipo, 'final')
  assert.equal(c.jaGanhou, true)
  assert.equal(T.mapa(c.faltamMapa), 'Faltam 20 casas para completar o mapa.')
  assert.equal(T.mapa(0), 'Seu mapa está completo. Agora é manter a posição.')
})

test('Caça encerrada, estado desconhecido ou sem leitura: sem cartão', () => {
  assert.equal(cartaoDaDisputa({ ...base, estado: 'encerrada' }, antes), null)
  assert.equal(cartaoDaDisputa({ ...base, estado: 'xyz' }, antes), null)
  assert.equal(cartaoDaDisputa(null, antes), null)
})

test('nenhum texto promete voucher nem cita o sorteio como ganho', () => {
  const tudo = [T.fora(2), T.dentro('17h'), T.empate, T.semCarimbo, T.foto, T.jaGanhou, T.mapa(3)].join(' ')
  assert.doesNotMatch(tudo, /você ganh|garant/i)
})

test('migration da RPC: só leitura, mesma ordem da apuração, corte de caca_corte', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20270123_caca_minha_disputa.sql', import.meta.url), 'utf8')
  assert.match(sql, /language plpgsql stable security definer/)
  assert.doesNotMatch(sql, /\b(insert|update|delete)\s+(into\s+)?public\./i)
  assert.match(sql, /caca_ranking_v2\(m\.edicao_codigo, null\)/)
  assert.match(sql, /public\.caca_corte\(v_hoje\)/)
  assert.match(sql, /caca_voucher_qtd\(v_hoje\)/)
  assert.match(sql, /'expirado', 'substituido', 'cancelado'/) // como caca_escolher_dia
  assert.match(sql, /grant execute on function public\.caca_minha_disputa\(text\) to anon, authenticated/)
})
