// "Tinha fila?" (docs/cartoon-2026-2/20-movimento-nas-casas.md, parte C): migration 20270126, textos e o painel.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { textoFila, resumoMovimento } from '../painel-app/src/lib/caca.js'
import { CACA } from '../src/edicao/caca/textos.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const sql = ler('supabase/migrations/20270126_caca_fila_resposta.sql')
const rev = ler('supabase/reverter/20270126_caca_fila_resposta.sql')
const tela = ler('src/edicao/cartoon/paginas/Carimbo.jsx')

test('uma resposta por carimbo, tabela fechada, só o dono e só carimbo por GPS recente', () => {
  assert.match(sql, /carimbo_id uuid primary key references public\.carimbos\(id\)/)
  assert.match(sql, /check \(resposta in \('sem_fila', 'pequena', 'grande'\)\)/)
  assert.match(sql, /revoke all on table public\.caca_fila_resposta from anon, authenticated/)
  assert.match(sql, /chave_hash = public\.mapa_hash\(p_chave\)/)
  assert.match(sql, /c\.origem = 'gps' and c\.anulado_em is null\s+and c\.criado_em > now\(\) - interval '3 hours'/)
  assert.match(sql, /on conflict \(carimbo_id\) do update/)
})

test('não toca pontuação: nada em carimbos, ranking ou prêmio', () => {
  assert.doesNotMatch(sql, /(insert into|update|delete from) public\.(carimbos|caca_premio|mapas_lover)\b/)
  assert.match(sql, /'fila', l\.fila/)
  assert.match(rev, /drop table if exists public\.caca_fila_resposta/)
  assert.doesNotMatch(rev.slice(rev.indexOf('create or replace function')), /caca_fila_resposta f join/)
})

test('site: pergunta opcional na tela do carimbo validado, 3 respostas', () => {
  assert.match(tela, /<FilaPergunta chave=\{chave\} unidade=\{r\.unidade\} \/>/)
  assert.deepEqual(CACA.fila.opcoes.map(([v]) => v), ['sem_fila', 'pequena', 'grande'])
  assert.match(CACA.fila.nota, /não muda seus pontos/)
})

test('painel: texto da fila e resposta estranha vira zero', () => {
  assert.equal(textoFila({ grande: 2, pequena: 0, sem_fila: 1 }), '2 fila grande · 1 sem fila')
  assert.equal(textoFila(undefined), '')
  const m = resumoMovimento({ unidades: [{ id: 'a', nivel: 'normal', fila: { grande: 'x', pequena: 3 } }] })
  assert.deepEqual(m.unidades[0].fila, { sem_fila: 0, pequena: 3, grande: 0 })
})
