// Aviso "<marca> alterou o cadastro" com o NOME DO CAMPO e o toque que leva até ele (27/10/2026):
// supabase/migrations/20261118_alteracao_marca_campos.sql, lib/rota.js, lib/central.js, FichaVisao.jsx, FichaMarcaPagina.jsx.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { rotaDoLink, montarRota, lerRota } from '../painel-app/src/lib/rota.js'
import { interpretarLink, lerIrDaUrl } from '../painel-app/src/lib/central.js'

const ler = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')
const sql = ler('supabase/migrations/20261118_alteracao_marca_campos.sql')
const visao = ler('painel-app/src/components/vistas/FichaVisao.jsx')
const pagina = ler('painel-app/src/components/vistas/FichaMarcaPagina.jsx')
const ID = '50d9f5d2-01c3-4106-b55f-fa802d1d6a98'

test('o link marcas/<id>/<seção>/<campo> vira a rota da ficha com o campo no endereço', () => {
  const r = rotaDoLink('marcas/' + ID + '/combo/combo_nome')
  assert.deepEqual(r, { vista: 'participantes', aba: 'lista', filtros: { item: ID, sub: 'combo', campo: 'combo_nome' } })
  assert.equal(montarRota(r), '#participantes/lista?campo=combo_nome&item=' + ID + '&sub=combo')
  assert.equal(lerRota(montarRota(r)).filtros.campo, 'combo_nome', 'recarregar volta ao mesmo campo')
  // sem campo (aviso antigo): como sempre foi
  assert.deepEqual(rotaDoLink('marcas/' + ID + '/publicacao'), { vista: 'participantes', aba: 'lista', filtros: { item: ID, sub: 'publicacao' } })
  assert.deepEqual(rotaDoLink('marcas/' + ID), { vista: 'participantes', aba: 'lista', filtros: { item: ID } })
})

test('o toque no push (?ir=) aceita o link com campo; a central o interpreta', () => {
  assert.equal(lerIrDaUrl('?ir=marcas/' + ID + '/unidades/uni-619911ac-aa57-43b4-9ecd-e59ca50e02c3'), 'marcas/' + ID + '/unidades/uni-619911ac-aa57-43b4-9ecd-e59ca50e02c3')
  assert.equal(lerIrDaUrl('?ir=marcas/' + ID + '/a/b/c'), null, 'mais que 4 segmentos continua recusado')
  assert.deepEqual(interpretarLink('marcas/' + ID + '/combo/item-1'), { vista: 'participantes', id: ID, sub: 'combo', campo: 'item-1' })
  assert.deepEqual(interpretarLink('marcas/' + ID + '/mensagens'), { vista: 'participantes', id: ID, sub: 'mensagens' })
})

test('banco: o aviso lista os campos, o link leva ao primeiro, e a marca continua a única que dispara', () => {
  assert.match(sql, /campo_alterado_marca\(p_tabela text, p_coluna text, r jsonb, p_pa uuid\)/)
  assert.match(sql, /avisar_alteracao_marca_campo\(p_participante uuid, p_rotulo text, p_secao text, p_chave text\)/)
  assert.match(sql, /'marcas\/' \|\| p_participante::text \|\| '\/' \|\| coalesce\(nullif\(p_secao, ''\), 'cadastro'\)/)
  assert.match(sql, /meu_participante\(\)/)
  assert.match(sql, /pg_trigger_depth\(\) <> 1/)
  assert.match(sql, /marca_concluir_cadastro\(v_pa\)/, 'a conclusão automática do cadastro continua')
  assert.ok(!/\bdelete from\b/i.test(sql.replace(/--.*$/gm, '')), 'sem delete from')
  assert.ok(sql.includes("'^[A-Za-z0-9_-]{1,80}$'"), 'a âncora do link só tem os caracteres que o ?ir= aceita')
})

test('toda âncora de campo que o banco manda existe na ficha', () => {
  const chaves = new Set()
  for (const m of sql.matchAll(/array\['[^']+', '(cadastro|combo)', '([a-z_]+)'\]/g)) chaves.add(m[2])
  assert.ok(chaves.size >= 18, 'catálogo de campos de cadastro e combo: ' + chaves.size)
  for (const c of chaves) assert.ok(visao.includes("id: '" + c + "'"), 'FichaVisao sem a âncora do campo ' + c)
  // itens e unidades: o bloco inteiro (ids que já existiam)
  assert.ok(visao.includes("id={'fg-item-' + c.posicao}") && sql.includes("'item-' || coalesce(v_pos, '')"), 'âncora do item')
  assert.ok(visao.includes("id={'fg-uni-' + u.id}") && sql.includes("'uni-' || v_pu::text"), 'âncora da unidade')
  assert.ok(visao.includes("id={op.id ? 'fg-campo-' + op.id : undefined}"), 'a linha de dados leva o id')
})

test('a ficha rola até o campo e o destaca; mudar de seção solta o campo', () => {
  assert.match(pagina, /function rolarParaCampo\(chave\)/)
  assert.match(pagina, /document\.getElementById\('fg-campo-' \+ chave\) \|\| document\.getElementById\('fg-' \+ chave\)/)
  assert.match(pagina, /classList\.add\('fg-alvo'\)/)
  assert.match(pagina, /if \(vista === 'visao' && secao && !campo\)/, 'com campo, não rola também até a seção')
  const marcas = ler('painel-app/src/components/vistas/Marcas.jsx')
  assert.match(marcas, /campo=\{ficha\.campo \|\| ''\}/)
  assert.match(marcas, /mudar\(\{ sub: s, campo: '' \}/, 'trocar de seção solta o campo')
  assert.match(ler('painel-app/src/styles/painel.css'), /\.fg-alvo\{/)
})
