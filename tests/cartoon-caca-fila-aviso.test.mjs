// "Estamos com fila agora" (docs/cartoon-2026-2/20-movimento-nas-casas.md, parte B): migration 20270127, marca, painel e mapa.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MAPA } from '../src/edicao/cartoon/textos.js'
import { RPC_LEITURA, RPC_ESCRITA } from '../painel-app/src/lib/sync/dominios.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const sql = ler('supabase/migrations/20270127_caca_fila_aviso.sql')
const rev = ler('supabase/reverter/20270127_caca_fila_aviso.sql')

test('vence em 1 h, uma linha por unidade, tabela fechada', () => {
  assert.match(sql, /participacao_unidade_id uuid primary key references public\.participacao_unidades\(id\)/)
  assert.match(sql, /now\(\) \+ interval '1 hour'/)
  assert.match(sql, /revoke all on table public\.caca_fila_aviso from public, anon, authenticated/)
  assert.match(rev, /drop table if exists public\.caca_fila_aviso/)
})

test('permissões: marca só na própria casa e no festival, organização com producao.gerir, gravar só por dentro', () => {
  assert.match(sql, /marca_fila_definir[\s\S]*?marca_dona_participacao\(p_participacao\)[\s\S]*?participacao_id = p_participacao[\s\S]*?fora_do_festival/)
  assert.match(sql, /caca_fila_definir[\s\S]*?public\.pode\(p_secret, 'producao\.gerir'\)/)
  assert.match(sql, /revoke all on function public\.caca_fila_gravar\(uuid, boolean, text\) from public, anon, authenticated/)
  assert.doesNotMatch(sql, /grant execute on function public\.caca_fila_gravar/)
})

test('público: só slug e id público, só casa com combo publicado e aviso valendo', () => {
  const pub = sql.slice(sql.indexOf('function public.filas_agora_publico'))
  assert.match(pub, /select pa\.slug_publico, u\.id_publico/)
  assert.match(pub, /pb\.vigente and pb\.nivel = 'marca_e_combo'/)
  assert.match(pub, /f\.ate > now\(\)/)
})

test('telas: marca no Início, aba Movimento, selo no cartão do mapa; funções classificadas no painel', () => {
  assert.match(ler('painel-app/src/components/vistas-marca/Hoje.jsx'), /<FilaAgora participacaoId=\{participacaoId\} hoje=\{hoje\} \/>/)
  assert.match(ler('painel-app/src/components/vistas/caca/Movimento.jsx'), /cacaApi\.filaDefinir\(u\.id, !filaDe\.has\(u\.id\)\)/)
  assert.match(ler('src/edicao/cartoon/paginas/mapa/Cartao.jsx'), /filaAgora && !esgotadoHoje && <p className="ct-agora ct-agora--fila/)
  assert.ok(MAPA.filaAgora)
  for (const f of ['caca_fila_avisos', 'marca_fila_estado']) assert.ok(RPC_LEITURA.has(f), f)
  for (const f of ['caca_fila_definir', 'marca_fila_definir']) assert.ok(RPC_ESCRITA[f], f)
})
