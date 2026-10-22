/*
 * Checklist por postagem (21/10/2026) — lógica pura de painel-app/src/lib/checklist.js e contrato da migration 20261101.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as K from '../painel-app/src/lib/checklist.js'
import { FORMATOS } from '../painel-app/src/lib/redes.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const it = (id, texto, feito = false, ordem = 0) => ({ id, texto, feito, ordem })

test('contagem: feitos, abertos na ordem e rótulo "3/5"', () => {
  const l = [it('a', 'Arte', true, 1), it('b', 'Legenda', false, 2), it('c', 'Marcas', false, 3)]
  const c = K.contagem(l)
  assert.equal(c.total, 3)
  assert.equal(c.feitos, 1)
  assert.deepEqual(c.abertos.map((x) => x.id), ['b', 'c'])
  assert.equal(K.rotuloContagem(l), '1/3')
  assert.equal(K.rotuloContagem([]), '')
  assert.equal(K.rotuloContagem(undefined), '')
  assert.deepEqual(K.contagem(null), { total: 0, feitos: 0, abertos: [] })
})

test('cartão: usa as contagens que o banco devolve, só em postagem aberta e que tenha checklist', () => {
  assert.deepEqual(K.contagemDoCartao({ situacao: 'rascunho', checklist_total: '5', checklist_feitos: '3' }), { total: 5, feitos: 3, texto: '3/5', completo: false })
  assert.equal(K.contagemDoCartao({ situacao: 'aprovacao', checklist_total: 4, checklist_feitos: 4 }).completo, true)
  assert.equal(K.contagemDoCartao({ situacao: 'rascunho', checklist_total: 0, checklist_feitos: 0 }), null)
  assert.equal(K.contagemDoCartao({ situacao: 'publicado', checklist_total: 5, checklist_feitos: 5 }), null)
  assert.equal(K.contagemDoCartao({ situacao: 'cancelado', checklist_total: 5, checklist_feitos: 1 }), null)
  assert.equal(K.contagemDoCartao({ situacao: 'rascunho' }), null, 'banco antigo, sem os campos')
})

test('confirmação do envio: nada aberto = sem pergunta; aberto lista até 4 e resume o resto', () => {
  assert.equal(K.textoConfirmacaoEnvio([]), null)
  assert.equal(K.textoConfirmacaoEnvio([it('a', 'Arte', true)]), null)
  assert.equal(K.textoConfirmacaoEnvio([it('a', 'Arte'), it('b', 'Legenda', true)]), 'Falta 1 item do checklist: Arte. Enviar para aprovação mesmo assim?')
  const seis = Array.from({ length: 6 }, (_, i) => it('i' + i, 'Item ' + i, false, i))
  assert.equal(K.textoConfirmacaoEnvio(seis), 'Faltam 6 itens do checklist: Item 0, Item 1, Item 2, Item 3 e mais 2. Enviar para aprovação mesmo assim?')
})

test('item novo: aparado, 1 a 80 caracteres, até 30 itens', () => {
  assert.deepEqual(K.validarItem('  Conferir o link  '), { ok: true, erro: '', texto: 'Conferir o link' })
  assert.equal(K.validarItem('   ').ok, false)
  assert.equal(K.validarItem('x'.repeat(81)).ok, false)
  assert.equal(K.validarItem('x'.repeat(80)).ok, true)
  assert.equal(K.validarItem('ok', Array.from({ length: K.LIMITE_ITENS }, (_, i) => it('i' + i, 't'))).ok, false, 'checklist cheio')
  assert.equal(K.validarItem('ok', Array.from({ length: K.LIMITE_ITENS - 1 }, (_, i) => it('i' + i, 't'))).ok, true)
})

test('quem marcou e quando', () => {
  assert.equal(K.rotuloFeito(it('a', 'x'), () => 'x'), '')
  assert.equal(K.rotuloFeito({ ...it('a', 'x', true), feito_por_rotulo: 'Micka', feito_em: '2026-10-21T15:00:00Z' }, () => 'hoje 12h00'), 'Micka · hoje 12h00')
  assert.equal(K.rotuloFeito({ ...it('a', 'x', true), feito_por_rotulo: null, feito_em: '2026-10-21T15:00:00Z' }, () => 'hoje 12h00'), 'hoje 12h00')
})

test('modelos agrupados por formato, na ordem, sem item removido', () => {
  const lista = [
    { id: 1, formato: 'reels', ordem: 2, texto: 'B', ativo: true }, { id: 2, formato: 'reels', ordem: 1, texto: 'A', ativo: true },
    { id: 3, formato: 'feed', ordem: 1, texto: 'C', ativo: false }, { id: 4, formato: 'feed', ordem: 2, texto: 'X', ativo: true, removido_em: '2026-10-21T00:00:00Z' },
  ]
  const g = K.agruparModelos(lista)
  assert.deepEqual(Object.keys(g), FORMATOS.map((f) => f.chave), 'um grupo por formato do painel, mesmo vazio')
  assert.deepEqual(g.reels.map((m) => m.texto), ['A', 'B'])
  assert.deepEqual(g.feed.map((m) => m.texto), ['C'], 'inativo aparece (dá para reativar); removido não')
  assert.deepEqual(g.story, [])
  assert.deepEqual(K.modelosParaSalvar([{ texto: ' A ', ativo: true }, { texto: 'B', ativo: false }]), [{ texto: 'A', ativo: true }, { texto: 'B', ativo: false }])
})

test('erros do banco viram frase em português', () => {
  for (const c of ['texto_vazio', 'texto_longo', 'checklist_cheio', 'item_nao_encontrado', 'formato_invalido', 'post_fechado']) assert.ok(K.traduzirErroChecklist(c), c)
  assert.equal(K.traduzirErroChecklist('qualquer_outra'), null)
})

test('contrato com o banco: formatos e remoção lógica', () => {
  const sql = ler('supabase/migrations/20261101_social_checklist.sql')
  const noBanco = sql.match(/formato in \(([^)]*)\)/)[1].split(',').map((x) => x.trim().replace(/'/g, ''))
  assert.deepEqual(noBanco, FORMATOS.map((f) => f.chave), 'os formatos do CHECK e do painel divergiram')
  assert.doesNotMatch(sql, /delete from|drop /i, 'nada se apaga: remover é removido_em')
  assert.match(sql, /update public\.redes_checklist_itens set removido_em = now\(\) where id = p_item/)
  assert.match(sql, /n >= 30 then raise exception 'checklist_cheio'/)
  assert.equal(K.LIMITE_ITENS, 30)
  assert.equal(K.LIMITE_TEXTO, 80)
  // marcar não mexe na postagem: nenhuma das funções do checklist atualiza redes_posts
  const funcoes = sql.slice(sql.indexOf('create or replace function public.redes_checklist_itens_json'), sql.indexOf('create or replace function public.redes_json'))
  assert.doesNotMatch(funcoes, /update public\.redes_posts|redes_carimbar|redes_gravar/, 'o checklist não sobe a versão da postagem')
})
