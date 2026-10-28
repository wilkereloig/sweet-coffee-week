/*
 * Campanhas do Social media (21/10/2026) — lógica pura de painel-app/src/lib/campanhas.js e contrato da migration 20261031.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as C from '../painel-app/src/lib/campanhas.js'
import { CORES_PASTA } from '../painel-app/src/lib/pastas.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('progresso: com meta conta contra a meta, sem meta conta contra o planejado', () => {
  assert.deepEqual(C.progressoCampanha({ n_publicadas: 12, n_total: 18, meta: 20 }), { feitas: 12, alvo: 20, pct: 60, rotulo: '12 de 20 publicadas' })
  assert.equal(C.progressoCampanha({ n_publicadas: 1, n_total: 3, meta: 20 }).rotulo, '1 de 20 publicada')
  assert.deepEqual(C.progressoCampanha({ n_publicadas: 12, n_total: 18, meta: null }), { feitas: 12, alvo: 18, pct: 67, rotulo: '12 publicadas de 18 planejadas' })
  assert.equal(C.progressoCampanha({ n_publicadas: 0, n_total: 1, meta: 0 }).rotulo, '0 publicadas de 1 planejada', 'meta 0 = sem meta')
  assert.deepEqual(C.progressoCampanha({ n_publicadas: 0, n_total: 0, meta: null }), { feitas: 0, alvo: 0, pct: 0, rotulo: 'Nenhuma postagem ainda' })
  assert.equal(C.progressoCampanha({ n_publicadas: 25, n_total: 25, meta: 20 }).pct, 100, 'passou da meta não passa de 100%')
  assert.equal(C.progressoCampanha({ n_publicadas: '4', n_total: '5', meta: '8' }).pct, 50, 'contagem do banco pode chegar como texto')
})

test('validação do formulário: antecipa o que o banco recusa', () => {
  const ok = { nome: 'Confirmados', cor: 'roxo', descricao: '', inicio: '2026-10-20', fim: '2026-11-04', meta: '20' }
  assert.deepEqual(C.validarCampanha(ok), { ok: true, erros: {} })
  assert.match(C.validarCampanha({ ...ok, nome: '   ' }).erros.nome, /nome/i)
  assert.match(C.validarCampanha({ ...ok, nome: 'x'.repeat(61) }).erros.nome, /60/)
  assert.ok(C.validarCampanha({ ...ok, cor: 'rosa' }).erros.cor)
  assert.match(C.validarCampanha({ ...ok, inicio: '2026-11-10', fim: '2026-11-01' }).erros.fim, /depois/)
  assert.ok(C.validarCampanha({ ...ok, meta: '-1' }).erros.meta)
  assert.ok(C.validarCampanha({ ...ok, meta: '2.5' }).erros.meta)
  assert.ok(C.validarCampanha({ ...ok, meta: 'abc' }).erros.meta)
  assert.equal(C.validarCampanha({ ...ok, meta: '' }).ok, true, 'meta é opcional')
  assert.equal(C.validarCampanha({ ...ok, inicio: '', fim: '' }).ok, true, 'período é opcional')
  assert.ok(C.validarCampanha({ ...ok, descricao: 'x'.repeat(301) }).erros.descricao)
})

test('payload do salvamento: texto aparado, meta como número ou vazia', () => {
  assert.deepEqual(C.dadosParaSalvar({ nome: '  Confirmados ', cor: 'roxo', descricao: ' um por casa ', inicio: '2026-10-20', fim: '', meta: '20' }),
    { nome: 'Confirmados', cor: 'roxo', descricao: 'um por casa', inicio: '2026-10-20', fim: '', meta: 20 })
  assert.equal(C.dadosParaSalvar({ ...C.CAMPANHA_VAZIA, nome: 'A' }).meta, '')
})

test('cores da campanha = as da pasta (uma paleta só)', () => {
  assert.equal(C.CAMPANHA_VAZIA.cor, 'amarelo')
  const migration = ler('supabase/migrations/20261031_social_campanhas.sql')
  const noBanco = migration.match(/cor in \(([^)]*)\)/)[1].split(',').map((x) => x.trim().replace(/'/g, ''))
  assert.deepEqual(noBanco, CORES_PASTA.map((c) => c.chave), 'o CHECK do banco e a paleta do painel divergiram')
})

test('ordem: ativas pelo início (sem início depois, por nome), arquivadas por último', () => {
  const l = [
    { id: 'a', nome: 'Zeta', inicio: null, arquivada: false },
    { id: 'b', nome: 'Beta', inicio: '2026-11-01', arquivada: false },
    { id: 'c', nome: 'Alfa', inicio: '2026-10-01', arquivada: false },
    { id: 'd', nome: 'Antiga', inicio: '2026-01-01', arquivada: true },
    { id: 'e', nome: 'Ômega', inicio: null, arquivada: false },
  ]
  assert.deepEqual(C.ordenarCampanhas(l).map((x) => x.id), ['c', 'b', 'e', 'a', 'd'])
})

test('rótulos curtos: nome cortado, período legível, campanha da postagem', () => {
  assert.equal(C.nomeCurto('Contagem regressiva Cartoon', 18), 'Contagem regressi…')
  assert.equal(C.nomeCurto('Curta', 18), 'Curta')
  assert.equal(C.periodoTexto({ inicio: '2026-10-20', fim: '2026-11-04' }), '20/10 a 04/11')
  assert.equal(C.periodoTexto({ inicio: '2026-10-20', fim: null }), 'a partir de 20/10')
  assert.equal(C.periodoTexto({ inicio: null, fim: '2026-11-04' }), 'até 04/11')
  assert.equal(C.periodoTexto({ inicio: null, fim: null }), '')
  assert.deepEqual(C.campanhaDaPostagem({ campanha_id: 'x', campanha_nome: 'Confirmados', campanha_cor: 'roxo' }), { id: 'x', nome: 'Confirmados', cor: 'roxo' })
  assert.equal(C.campanhaDaPostagem({ campanha_id: null }), null)
})

test('erros do banco viram frase em português', () => {
  for (const c of ['nome_obrigatorio', 'nome_longo', 'nome_repetido', 'cor_invalida', 'periodo_invalido', 'meta_invalida', 'descricao_longa', 'campanha_nao_encontrada', 'campanha_invalida']) {
    assert.ok(C.traduzirErroCampanha(c), c)
  }
  assert.equal(C.traduzirErroCampanha('erro_desconhecido'), null)
})

test('migration: trocar a campanha não entra na tupla que desfaz a aprovação', () => {
  const sql = ler('supabase/migrations/20261031_social_campanhas.sql')
  assert.match(sql, /\(p\.legenda, p\.mencoes, p\.formato\) is distinct from \(antes\.legenda, antes\.mencoes, antes\.formato\), 'conteudo'\)/)
  assert.match(sql, /\('campanha', p\.campanha_id is distinct from antes\.campanha_id\)/, 'a troca entra no histórico da postagem')
  assert.doesNotMatch(sql, /drop |delete from/i, 'só acrescenta')
})
