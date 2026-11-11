// Avisos de disputa (docs/cartoon-2026-2/19, etapa 3): migration 20270124 e a contagem do painel. O ensaio com dados reais (ROLLBACK)
// está registrado no doc 19; aqui ficam as regras que não podem mudar sem alguém perceber.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { disputaPorDia, ROTULO_TIPO_DISPUTA } from '../painel-app/src/lib/caca.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const sql = ler('supabase/migrations/20270124_caca_disputa_avisos.sql')
const rev = ler('supabase/reverter/20270124_caca_disputa_avisos.sql')

test('nasce desligado, com trava de 300 por ciclo e retomada espalhada em 150', () => {
  assert.match(sql, /values \('disputa_aviso', '\{"ligado":false,"max_por_ciclo":300,"retomada_por_ciclo":150\}'::jsonb/)
  assert.match(sql, /if v_cand > v_max then[\s\S]*?return jsonb_build_object\('ok', false, 'excedeu'/)
  assert.match(sql, /where c2\.tipo = 'retomada' order by f2\.casas desc, f2\.ultimo asc, c2\.mapa_id offset v_ret/)
})

test('a zona é a mesma conta da apuração: ranking v2, fora quem já ganhou ou perdeu o voucher de hoje, vagas do dia', () => {
  assert.match(sql, /from public\.caca_ranking_v2\(p_ed, null\) r/)
  assert.match(sql, /'expirado', 'substituido', 'cancelado'/)
  assert.match(sql, /public\.caca_voucher_qtd\(p_dia\)/)
  assert.match(sql, /when e\.rk - 1 \+ e\.cnt <= cfg\.q then 'dentro'/)
  assert.match(sql, /v_corte := public\.caca_corte\(v_dia\)/) // 12h no dia 14 quando a 20270122 estiver aplicada
})

test('avisos do voucher do dia só antes do corte e vencem no corte; cada tipo 1 vez por dia por pessoa', () => {
  for (const t of ['ultrapassagem', 'reta_final', 'perto']) assert.match(sql, new RegExp(`when v_antes and[\\s\\S]*?then '${t}'`))
  assert.match(sql, /case when r\.tipo = 'retomada' then \(\(v_dia \+ 1\)::timestamp at time zone v_fuso\) else v_corte end/)
  assert.match(sql, /a\.chave_dedupe like 'disputa:' \|\| v_dia \|\| ':' \|\| x\.tipo \|\| ':%'/)
})

test('textos: sem número exato não há aviso, e nenhum promete voucher', () => {
  assert.match(sql, /if p_estado = 'fora' and not coalesce\(p_faltam > 0, false\) then return; end if;/)
  assert.match(sql, /if p_pos is null or p_pos < 1 then return; end if;/)
  const corpo = sql.slice(sql.indexOf('create or replace function public.caca_disputa_texto'), sql.indexOf('create or replace function public.caca_disputa_gerar'))
  assert.doesNotMatch(corpo, /você ganh|garant|vai ganhar/i)
  assert.match(corpo, /a seleção só vale depois da apuração/)
})

test('push: disputa ligada por padrão e abaixo de prêmio e avaliação pendente', () => {
  assert.match(sql, /coalesce\(\(c\.prefs ->> a\.categoria\)::boolean, v_padrao\)/)
  assert.match(sql, /y\.categoria in \('premio', 'avaliacao_pendente'\)/)
  assert.match(sql, /when 'disputa' then 5 else 6 end pri/)
})

test('retomada tira o incentivo neutro e o ciclo gera a disputa antes da programação', () => {
  assert.match(sql, /where g\.n < v_total and not \(g\.retomou and g\.tipo = 'incentivo'\)/)
  const ciclo = sql.slice(sql.indexOf('create or replace function public.caca_avisos_ciclo'))
  assert.ok(ciclo.indexOf('caca_disputa_gerar') < ciclo.indexOf('caca_programacao_gerar'))
})

test('reverter desfaz tudo e volta a constraint antiga', () => {
  for (const f of ['caca_disputa_aviso_definir', 'caca_disputa_aviso_estado', 'caca_disputa_gerar', 'caca_disputa_texto', 'caca_disputa_foto']) assert.match(rev, new RegExp(`drop function if exists public\\.${f}`))
  assert.match(rev, /drop table if exists public\.caca_disputa_estado/)
  assert.doesNotMatch(rev.slice(rev.lastIndexOf('add constraint caca_aviso_categoria_check')), /'disputa'/)
})

test('painel: contagem por dia, mais recente primeiro, tipos na ordem e linhas estranhas fora', () => {
  const dias = disputaPorDia([
    { dia: '2026-11-11', tipo: 'retomada', geradas: '393', enviadas: 2 },
    { dia: '2026-11-11', tipo: 'perto', geradas: 6, enviadas: 1 },
    { dia: '2026-11-12', tipo: 'reta_final', geradas: 6, enviadas: 0 },
    { dia: '2026-11-12', tipo: 'xyz', geradas: 99 },
    null,
  ])
  assert.deepEqual(dias.map((d) => d.dia), ['2026-11-12', '2026-11-11'])
  assert.equal(dias[1].geradas, 399)
  assert.equal(dias[1].enviadas, 3)
  assert.deepEqual(dias[1].tipos.map((t) => t.tipo), ['perto', 'retomada'])
  assert.equal(dias[0].tipos.length, 1)
  assert.deepEqual(disputaPorDia(undefined), [])
  assert.equal(Object.keys(ROTULO_TIPO_DISPUTA).length, 4)
})
