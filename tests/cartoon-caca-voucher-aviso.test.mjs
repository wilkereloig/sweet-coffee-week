// Aviso diário do voucher em disputa (migration 20270105): o arquivo existe, entra no ciclo, volta atrás e não promete o que o regulamento não promete.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const raiz = path.resolve(import.meta.dirname, '..')
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8')
const migration = ler('supabase/migrations/20270105_caca_voucher_aviso_diario.sql')
const semComentarios = (t) => t.replace(/^\s*--.*$/gm, '')
const sql = semComentarios(migration)

test('o ciclo de 15 min chama o gerador, com erro isolado como os outros', () => {
  assert.match(sql, /begin perform public\.caca_voucher_aviso_gerar\(\); exception when others then v_erros := v_erros \|\| jsonb_build_object\('voucher_aviso', sqlerrm\); end;/)
  for (const antigo of ['caca_avisos_gerar_automaticos', 'caca_avisos_gerar_premios', 'caca_programacao_gerar', 'caca_campanha_gerar']) {
    assert.match(sql, new RegExp(`perform public\\.${antigo}\\(\\)`), `o ciclo não pode perder ${antigo}`)
  }
})

test('gerador: só com avisos automáticos E interruptor próprio ligados, dentro da janela, uma vez por dia', () => {
  assert.match(sql, /avisos_auto/)
  assert.match(sql, /chave = 'voucher_aviso'/)
  assert.match(sql, /'voucher:aviso:' \|\| v_dia/, 'dedupe por dia')
  assert.match(sql, /categoria|values \(v_ed, 'voucher'/, 'categoria voucher (já existe no check)')
  assert.match(sql, /'\/cartoon\/mapa\?painel=premios'/, 'destino permitido pelo check e pelo service worker')
  assert.match(sql, /revoke all on function public\.caca_voucher_aviso_gerar\(timestamptz\) from public, anon, authenticated;/, 'ninguém de fora chama o gerador')
})

test('texto: nunca diz que todos concorrem nem fala em sorteio', () => {
  const textos = sql.match(/v_titulo := '[^']*'|v_corpo := '[^']*'(\s*\|\|[^;]*)?/g).join(' ')
  assert.doesNotMatch(textos, /sorteio|todo mundo|todos (concorrem|ganham)/i)
  assert.match(textos, /mais casas diferentes validadas/, 'diz a regra do regulamento')
})

test('reverter existe e desfaz o ciclo, o gerador e os avisos', () => {
  const rev = semComentarios(ler('supabase/reverter/20270105_caca_voucher_aviso_diario.sql'))
  assert.doesNotMatch(rev, /caca_voucher_aviso_gerar\(\); exception/, 'o ciclo restaurado não chama o gerador')
  assert.match(rev, /drop function if exists public\.caca_voucher_aviso_gerar\(timestamptz\)/)
  assert.match(rev, /delete from public\.caca_aviso where chave_dedupe like 'voucher:aviso:%'/)
})

test('teste SQL com rollback acompanha a migration', () => {
  const t = ler('supabase/testes/caca-voucher-aviso.sql')
  assert.match(t, /raise exception 'TESTE_OK/, 'termina em exceção: nada fica no banco')
})
