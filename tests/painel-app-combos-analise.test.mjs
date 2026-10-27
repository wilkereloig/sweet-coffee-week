// Cartão "Combos para aprovar" + folha de decisão (27/10/2026): lib/combosAnalise.js, lib/visaoGeral.js e a migration
// 20261117_combos_em_analise.sql.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { combosDoCartao, cobreAsMarcas, linhaDoCombo, detalheDosCombos, textoCusto, notaValida, erroDaDecisao, NOTA_MAX } from '../painel-app/src/lib/combosAnalise.js'
import { acoesDaEquipe } from '../painel-app/src/lib/visaoGeral.js'

const AGORA = new Date('2026-10-27T17:00:00-03:00').getTime()
const marca = (id, nome, extra = {}) => ({ id, nome_marca: nome, participacao_id: 'pa-' + id, edicao_codigo: '2026.2', combo_status: 'em_analise', status_cadastro: 'cadastro_completo', ...extra })
const combo = (id, nome, extra = {}) => ({ participacao_id: 'pa-' + id, participante_id: id, nome_marca: nome, edicao_codigo: '2026.2', combo_nome: 'Era uma vez', tema_combo: 'Cinderela', desde: '2026-10-27T17:00:00-03:00', itens: [], ...extra })
const pode = () => true
const cartao = (participantes, combos) => acoesDaEquipe({ participantes, combos, edicaoCodigo: '2026.2', pode }).cartoes.find((c) => c.chave === 'aprovacao')

test('linha do combo: marca, nome do combo, tema e há quanto tempo espera', () => {
  const c = combo('1', 'Jolie Café Pâtisserie', { desde: new Date(AGORA - 2 * 3600e3).toISOString(), combo_nome: 'Era uma vez na Jolie' })
  assert.equal(linhaDoCombo(c, AGORA), 'Jolie Café Pâtisserie · “Era uma vez na Jolie” · tema Cinderela · enviado há 2 h')
  assert.match(linhaDoCombo(combo('2', 'X', { combo_nome: null, tema_combo: null }), AGORA), /^X · combo sem nome/)
})

test('vários combos: os dois que esperam há mais tempo e "mais N"', () => {
  const l = [combo('1', 'A'), combo('2', 'B'), combo('3', 'C'), combo('4', 'D')]
  assert.equal(detalheDosCombos(l, AGORA), 'A · “Era uma vez” | B · “Era uma vez” | mais 2')
  assert.equal(detalheDosCombos([], AGORA), '')
})

test('o cartão mostra o combo só quando leu TODOS que ele conta; senão cai no texto simples e na lista', () => {
  const marcas = [marca('1', 'Jolie'), marca('2', 'Padoca')]
  const completo = cartao(marcas, [combo('1', 'Jolie'), combo('2', 'Padoca')])
  assert.equal(completo.abrir, 'aprovacao')
  assert.equal(completo.combos.length, 2)
  assert.equal(completo.n, 2)
  assert.match(completo.detalhe, /Jolie · “Era uma vez”/)
  assert.equal(completo.frase, 'combos esperando a sua decisão')
  // só um dos dois lido → sem meia lista: texto simples + rota da lista, sem abrir a folha
  const parcial = cartao(marcas, [combo('1', 'Jolie')])
  assert.equal(parcial.abrir, undefined)
  assert.equal(parcial.detalhe, 'Jolie e Padoca')
  assert.equal(parcial.rota.filtros.situacao, 'aguardando_aprovacao')
  // leitura que não veio
  assert.equal(cartao(marcas, undefined).abrir, undefined)
  assert.equal(cartao([marca('1', 'Jolie')], []).frase, 'combo esperando a sua decisão')
})

test('o número do cartão continua sendo o tamanho da lista que ele abre (marca encerrada não conta)', () => {
  const marcas = [marca('1', 'Jolie'), marca('2', 'Desistiu', { status_cadastro: 'encerrado' })]
  const c = cartao(marcas, [combo('1', 'Jolie'), combo('2', 'Desistiu')])
  assert.equal(c.n, 1)
  assert.deepEqual(combosDoCartao([combo('1', 'Jolie'), combo('2', 'Desistiu')], marcas.slice(0, 1)).map((x) => x.nome_marca), ['Jolie'])
  assert.ok(cobreAsMarcas([combo('1', 'Jolie')], marcas.slice(0, 1)))
  assert.ok(!cobreAsMarcas([], marcas.slice(0, 1)))
})

test('permissão: sem curadoria.decidir o cartão nem aparece', () => {
  const r = acoesDaEquipe({ participantes: [marca('1', 'Jolie')], combos: [combo('1', 'Jolie')], edicaoCodigo: '2026.2', pode: () => false })
  assert.equal(r.cartoes.find((c) => c.chave === 'aprovacao'), undefined)
})

test('custos: vazio é "não informado", zero é "sem custo"', () => {
  assert.equal(textoCusto(null), 'não informado')
  assert.equal(textoCusto(''), 'não informado')
  assert.equal(textoCusto('0.00'), 'sem custo')
  assert.match(textoCusto('5.00'), /5,00/)
})

test('pedir ajuste exige texto; o erro do banco vira português', () => {
  assert.ok(!notaValida('   '))
  assert.ok(!notaValida(''))
  assert.ok(notaValida('Trocar o nome do combo'))
  assert.ok(!notaValida('x'.repeat(NOTA_MAX + 1)))
  assert.match(erroDaDecisao('nota_obrigatoria'), /o que a marca precisa ajustar/)
  assert.equal(erroDaDecisao('qualquer outra'), null)
})

test('banco: só leitura, trava curadoria.decidir, só combo em análise de marca ativa', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261117_combos_em_analise.sql', import.meta.url), 'utf8')
  assert.match(sql, /get_combos_em_analise\(p_secret text\)/)
  assert.match(sql, /pode\(p_secret, 'curadoria\.decidir'\)/)
  assert.match(sql, /combo_status = 'em_analise'/)
  assert.match(sql, /status_cadastro is distinct from 'encerrado'/)
  assert.match(sql, /alvo_id = pa\.id::text/, 'auditoria.alvo_id é texto')
  assert.ok(!/\binsert\b|\bupdate\b public|\bdelete\b/i.test(sql.replace(/--.*$/gm, '')), 'só lê')
})

test('telas ligadas: a Visão geral lê os combos, o cartão abre a folha, a folha usa revisar_combo', () => {
  const ler = (f) => readFileSync(new URL('../painel-app/src/' + f, import.meta.url), 'utf8')
  assert.match(ler('components/vistas/Mesa.jsx'), /get_combos_em_analise/)
  assert.match(ler('components/vistas/Mesa.jsx'), /<FolhaDecidirCombo/)
  assert.match(ler('components/vistas/mesa/CartaoAcao.jsx'), /acao\.abrir/)
  const folha = ler('components/vistas/mesa/FolhaDecidirCombo.jsx')
  assert.match(folha, /'revisar_combo'/)
  assert.match(folha, /'aprovado'/)
  assert.match(folha, /'correcao_solicitada'/)
})
