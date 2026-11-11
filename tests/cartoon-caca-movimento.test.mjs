// Movimento nas casas (docs/cartoon-2026-2/20-movimento-nas-casas.md): migration 20270125 e o resumo do painel.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resumoMovimento, NIVEL_MOVIMENTO } from '../painel-app/src/lib/caca.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const sql = ler('supabase/migrations/20270125_caca_movimento.sql')
const rev = ler('supabase/reverter/20270125_caca_movimento.sql')

test('só leitura, só para quem lê dados do painel', () => {
  assert.match(sql, /language plpgsql stable security definer/)
  assert.match(sql, /if not public\.pode\(p_secret, 'dado\.ler'\) then raise exception 'nao_autorizado'/)
  assert.doesNotMatch(sql, /\b(insert|update|delete)\b\s+(into|public\.)/i)
  assert.match(rev, /drop function if exists public\.caca_movimento_estado\(text, timestamptz\)/)
})

test('presença = só carimbo por GPS, anulado fora, janela de 2 h comparada com os dias anteriores', () => {
  assert.match(sql, /where origem = 'gps' and anulado_em is null/)
  assert.match(sql, /p_agora - interval '2 hours'/)
  assert.match(sql, /p_agora - make_interval\(days => k\) - interval '2 hours'/)
  assert.match(sql, /when l\.janela < 3 then 'sem_dado'/)
  assert.match(sql, /when l\.normal is null then 'sem_base'/)
})

test('painel: níveis conhecidos, desconhecido vira pouco dado, horas vazias fora', () => {
  const m = resumoMovimento({
    janela_horas: 2, dias_base: 5,
    unidades: [
      { id: 'a', nome: 'Casa A', janela: 12, normal: 2.7, nivel: 'agitado', pico_hora: 18, hoje: 20, total: 80 },
      { id: 'b', nome: '', janela: 0, normal: null, nivel: 'xyz', pico_hora: null, hoje: 0, total: 0 },
      null,
    ],
    horas: [{ hora: 7, hoje: 0, media: 0 }, { hora: 18, hoje: 9, media: 35.4 }, { hora: 'x', hoje: 3 }],
  })
  assert.equal(m.unidades.length, 2)
  assert.equal(m.unidades[1].nivel, 'sem_dado')
  assert.equal(m.unidades[1].nome, 'Casa sem nome')
  assert.equal(m.niveis.agitado, 1)
  assert.equal(m.niveis.sem_dado, 1)
  assert.deepEqual(m.horas.map((h) => h.hora), [18])
  assert.equal(m.maximo, 35.4)
  assert.equal(m.diasBase, 5)
  assert.deepEqual(resumoMovimento(undefined).unidades, [])
  assert.equal(Object.keys(NIVEL_MOVIMENTO).length, 5)
})
