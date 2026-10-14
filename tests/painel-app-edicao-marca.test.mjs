// Cadastro da marca na camada de edição (Cartoon 2026.2) — painel-app/src/lib/edicaoMarca.js.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as E from '../painel-app/src/lib/edicaoMarca.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const SQL_PUB = ler('supabase/migrations/20261014_cartoon_02_publicacao.sql')

const MODOS_OK = { consumo_local: 'sim', retirada: 'nao', delivery_combo: 'nao' }
const unidadeOk = (extra = {}) => ({
  _key: 'pu-1', id_publico: 'uabc123', participa: true, logradouro: 'Rua A', bairro: 'Tirol', cidade: 'Natal',
  ...MODOS_OK, canais: { aplicativo: '', whatsapp: '', site: '' }, disponibilidade: [{ id: 'd1', data: '2026-11-05', abre: '10:00', fecha: '18:00' }],
  ...extra,
})
const todas = (estado) => Object.fromEntries(E.ASPECTOS_ALERGENICOS.map((a) => [a, { id: a, estado }]))

test('a lista de alergênicos é a mesma do banco (pendencias_publicacao)', () => {
  const m = /alergenicos constant text\[\] := array\[([^\]]+)\]/.exec(SQL_PUB)
  assert.ok(m, 'array de alergênicos não encontrado no SQL')
  assert.deepEqual(m[1].split(',').map((s) => s.trim().replace(/'/g, '')), E.ASPECTOS_ALERGENICOS)
})

test('pendências: tudo respondido não pede nada', () => {
  const itens = [{ id: 'i1', posicao: 1 }]
  assert.deepEqual(E.pendenciasEdicao({ comboNome: 'Combo', unidades: [unidadeOk()], itens, declaracoes: { i1: todas('nao_informado') } }), [])
})

test('pendências: mesmos códigos e mesma ordem do servidor', () => {
  const itens = [{ id: 'i2', posicao: 2 }, { id: 'i1', posicao: 1 }]
  const u = unidadeOk({ bairro: '', retirada: 'nao_informado', delivery_combo: 'sim', disponibilidade: [] })
  const f = E.pendenciasEdicao({ comboNome: '  ', unidades: [u], itens, declaracoes: { i2: todas('contem') } })
  assert.deepEqual(f, ['combo_nome', 'unidade:uabc123:endereco', 'unidade:uabc123:modos', 'unidade:uabc123:canais', 'unidade:uabc123:horario', 'item:1:alimentar'])
})

test('pendências: sem unidade participando, e a que não participa não conta', () => {
  const fora = unidadeOk({ participa: false, logradouro: '' })
  assert.deepEqual(E.pendenciasEdicao({ comboNome: 'C', unidades: [fora] }), ['sem_unidade'])
  // Unidade ainda não gravada: usa a chave local no lugar do id público.
  const nova = unidadeOk({ id_publico: null, _key: 'novo-1', cidade: '' })
  assert.deepEqual(E.pendenciasEdicao({ comboNome: 'C', unidades: [nova] }), ['unidade:novo-1:endereco'])
})

test('alergênicos: 7 de 8 respondidos ainda pende; "não sei" é resposta; linha ausente nunca é "não contém"', () => {
  const d = todas('nao_contem')
  delete d.soja
  assert.equal(E.alergenicosRespondidos(d), 7)
  assert.deepEqual(E.pendenciasEdicao({ comboNome: 'C', unidades: [unidadeOk()], itens: [{ id: 'i', posicao: 3 }], declaracoes: { i: d } }), ['item:3:alimentar'])
  assert.equal(E.alergenicosRespondidos(todas('nao_informado')), 8)
  const porItem = E.declaracoesPorItem([{ id: 'x', item_id: 'i', aspecto: 'leite', estado: 'contem', observacao: null }])
  assert.deepEqual(porItem, { i: { leite: { id: 'x', estado: 'contem', observacao: '' } } })
  assert.equal(porItem.i.gluten, undefined) // sem linha = não respondido
})

test('"outro alergênico" respondido sem dizer qual não grava (check do banco)', () => {
  assert.equal(E.declaracaoGravavel('outro_alergenico', { estado: 'contem', observacao: ' ' }), false)
  assert.equal(E.declaracaoGravavel('outro_alergenico', { estado: 'contem', observacao: 'gergelim' }), true)
  assert.equal(E.declaracaoGravavel('outro_alergenico', { estado: 'nao_informado', observacao: '' }), true)
  assert.equal(E.declaracaoGravavel('leite', { estado: undefined }), false)
})

test('blocos das pendências: alimentar 5, atendimento 6, endereço 4, combo 3', () => {
  assert.equal(E.blocoDaPendencia('combo_nome'), 3)
  assert.equal(E.blocoDaPendencia('sem_unidade'), 4)
  assert.equal(E.blocoDaPendencia('unidade:u1:endereco'), 4)
  for (const x of ['modos', 'canais', 'horario']) assert.equal(E.blocoDaPendencia('unidade:u1:' + x), 6)
  assert.equal(E.blocoDaPendencia('item:2:alimentar'), 5)
  assert.equal(E.blocoDaPendencia('custo_delivery'), 3)
  assert.equal(E.blocoDaPendencia('inventado'), null)
  assert.deepEqual(E.contarPorBloco(['combo_nome', 'unidade:a:modos', 'unidade:a:horario', 'x']), { 3: 1, 6: 2 })
})

test('faltando traduzido: nome da unidade (nunca o id público) e o campo certo', () => {
  const unidades = [unidadeOk({ id_publico: 'u1', nome_unidade: 'Midway' }), unidadeOk({ id_publico: 'u2', nome_unidade: '', bairro: 'Ponta Negra' })]
  const itens = [{ id: 'i', posicao: 1, tipo: 'doce' }]
  const t = (c) => E.traduzirFaltando(c, { unidades, itens })
  assert.deepEqual(t('unidade:u1:endereco'), { texto: 'Completar o endereço de Midway (rua, bairro e cidade)', bloco: 4, campo: 'unidade-endereco' })
  const modos = t('unidade:u2:modos')
  assert.match(modos.texto, /Ponta Negra/)
  assert.doesNotMatch(modos.texto, /u2/)
  assert.equal(modos.campo, 'atendimento-modos-2')
  assert.equal(t('unidade:u2:horario').campo, 'atendimento-horario-2')
  assert.equal(t('item:1:alimentar').texto, 'Responder os alergênicos do doce')
  assert.equal(t('item:1:alimentar').campo, 'item-1-alimentar')
  assert.deepEqual(t('responsavel'), { texto: 'Responsável', bloco: 0, campo: 'responsavel' })
  assert.equal(t('combo_nome').campo, 'combo_nome')
})

test('unidade: corpo deixa de fora o que o banco recusaria e guarda só dígitos', () => {
  const u = { nome_unidade: ' Midway ', logradouro: 'Av. Bernardo Vieira', numero: '3775', bairro: 'Tirol', cidade: 'Natal',
    uf: 'rn', cep: '59015-900', whatsapp_publico: '(84) 99999-1234', whatsapp_autorizado: true }
  const c = E.corpoUnidade(u)
  assert.equal(c.nome_unidade, 'Midway')
  assert.equal(c.uf, 'RN')
  assert.equal(c.cep, '59015900')
  assert.equal(c.whatsapp_publico, '84999991234')
  assert.equal(c.complemento, null)
  const ruim = E.corpoUnidade({ ...u, cep: '5901', uf: 'R', whatsapp_publico: '(84) 1234' })
  assert.ok(!('cep' in ruim) && !('uf' in ruim) && !('whatsapp_publico' in ruim))
  assert.equal(E.erroCep('5901'), 'O CEP tem 8 dígitos.')
  assert.equal(E.erroCep(''), '')
  assert.equal(E.erroUf('RN'), '')
  // Ida e volta pela linha do banco não muda nada (foto do patchMudancas).
  const linha = { id: 'x', ...c }
  assert.deepEqual(E.corpoUnidade(E.unidadeDeLinhas(null, linha)), c)
})

test('participação da unidade: espelha endereço e faz_delivery para o legado, e a foto da linha bate', () => {
  const u = unidadeOk({ numero: '10', delivery_combo: 'sim', canais: { aplicativo: 'https://ifood.com.br/x', whatsapp: '', site: '' } })
  const c = E.corpoParticipacaoUnidade(u, 0)
  assert.equal(c.endereco, 'Rua A, 10')
  assert.equal(c.faz_delivery, true)
  assert.deepEqual(c.canais_delivery, [{ tipo: 'aplicativo', link: 'https://ifood.com.br/x' }])
  assert.ok(!('unidade_id' in c) && !('id_publico' in c) && !('mesas' in c))
  assert.deepEqual(E.corpoParticipacaoUnidadeDeLinha({ ...c, id: 'p' }), c)
})

test('unidade antiga: sem unidade permanente, o endereço vem da participação', () => {
  const u = E.unidadeDeLinhas({ id: 'p1', endereco: 'Rua B, 2', bairro: 'Lagoa Nova', participa: true }, undefined)
  assert.equal(u.logradouro, 'Rua B, 2')
  assert.equal(u.bairro, 'Lagoa Nova')
  assert.equal(u.consumo_local, 'nao_informado')
  assert.equal(u.verificada, false)
})

test('horário do combo: dias do festival, faixa válida e "mesmo horário todos os dias"', () => {
  const dias = E.diasDoFestival('2026-11-05', '2026-11-15')
  assert.equal(dias.length, 11)
  assert.equal(dias[0], '2026-11-05')
  assert.equal(dias[10], '2026-11-15')
  assert.deepEqual(E.diasDoFestival(null, '2026-11-15'), [])
  assert.equal(E.erroFaixa('10:00', '18:00'), '')
  assert.match(E.erroFaixa('18:00', '10:00'), /depois/)
  assert.match(E.erroFaixa('', '10:00'), /Informe/)
  assert.equal(E.hhmm('10:00:00'), '10:00')
  const l = E.linhasMesmoHorario('pu', dias.slice(0, 2), '10:00:00', '18:00', ' ')
  assert.deepEqual(l, [
    { participacao_unidade_id: 'pu', data: '2026-11-05', abre: '10:00', fecha: '18:00', observacao: null },
    { participacao_unidade_id: 'pu', data: '2026-11-06', abre: '10:00', fecha: '18:00', observacao: null },
  ])
})

test('troca: acréscimo vazio = não informado, 0 = sem custo', () => {
  const s = { original: 'Leite', alternativa: 'Bebida de aveia', disponibilidade: 'sempre', acrescimo: '', como_solicitar: '', modalidades: [], unidades: [] }
  assert.equal(E.corpoSubstituicao(s).acrescimo, null)
  assert.equal(E.corpoSubstituicao({ ...s, acrescimo: '0' }).acrescimo, 0)
  assert.equal(E.corpoSubstituicao({ ...s, acrescimo: '2,50' }).acrescimo, 2.5)
  assert.equal(E.substituicaoGravavel({ ...s, alternativa: ' ' }), false)
  const linha = { id: 's1', item_id: 'i', ...E.corpoSubstituicao({ ...s, acrescimo: '0' }) }
  assert.deepEqual(E.corpoSubstituicao(E.substituicaoDeLinha(linha)), E.corpoSubstituicao({ ...s, acrescimo: '0' }))
  assert.deepEqual(E.alternar(['delivery'], 'local', ['local', 'retirada', 'delivery']), ['local', 'delivery'])
  assert.deepEqual(E.alternar(['local', 'delivery'], 'local'), ['delivery'])
})

test('publicação: publicada com link; retirada com motivo; nunca inventa link sem slug', () => {
  const p = E.textoPublicacao({ estado: 'publicado', versao: 2, slug: 'bolomania' })
  assert.equal(p.texto, 'Sua página está publicada (versão 2).')
  assert.equal(p.link, 'https://www.sweetcoffeeweek.com.br/cartoon/participantes/bolomania')
  assert.match(E.textoPublicacao({ estado: 'retirado', motivo_retirada: 'foto errada' }).texto, /foto errada/)
  assert.equal(E.textoPublicacao({ estado: 'nao_publicado' }).link, null)
  assert.equal(E.linkPublico(null), null)
  assert.equal(E.textoPublicacao(null), null)
})

// RLS decide a linha, o grant decide a coluna: corpo com coluna fora do grant
// derruba o salvamento inteiro (mesma guarda de painel-infra para Cadastro.jsx).
test('os corpos da unidade só levam colunas que o grant da marca concede', () => {
  const sql = ler('supabase/migrations/20261014_cartoon_01_estrutura.sql')
  const grant = (tipo, tabela) => {
    const m = new RegExp('grant ' + tipo + ' [(]([^)]+)[)]\\s+on public[.]' + tabela + ' to authenticated').exec(sql)
    assert.ok(m, 'grant ' + tipo + ' de ' + tabela + ' não encontrado')
    return new Set(m[1].split(',').map((c) => c.trim()))
  }
  const u = unidadeOk({ numero: '1', uf: 'RN', cep: '59000000', whatsapp_publico: '84999991234' })
  const fora = (corpo, cols) => Object.keys(corpo).filter((k) => !cols.has(k))
  assert.deepEqual(fora(E.corpoUnidade(u), grant('update', 'unidades')), [])
  assert.deepEqual(fora({ participante_id: 'p', ...E.corpoUnidade(u) }, grant('insert', 'unidades')), [])
  assert.deepEqual(fora(E.corpoParticipacaoUnidade(u, 0), grant('update', 'participacao_unidades')), [])
})
