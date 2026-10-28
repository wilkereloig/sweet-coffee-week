// Cadastro da marca na camada de edição (Cartoon 2026.2) — painel-app/src/lib/edicaoMarca.js.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import * as E from '../painel-app/src/lib/edicaoMarca.js'
import { vistaDoBloco } from '../painel-app/src/lib/guia.js'
import { datasDoFestival } from '../painel-app/src/lib/horarioFestival.js'
import { carregar, html } from './_renderizar.mjs'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const SQL_PUB = ler('supabase/migrations/20261014_cartoon_02_publicacao.sql')

const MODOS_OK = { consumo_local: 'sim', retirada: 'nao', delivery_combo: 'nao' }
const unidadeOk = (extra = {}) => ({
  _key: 'pu-1', id_publico: 'uabc123', participa: true, logradouro: 'Rua A', numero: '10', bairro: 'Tirol', cidade: 'Natal', cep: '59000000',
  ...MODOS_OK, canais: { aplicativo: '', whatsapp: '', site: '' }, horario_festival: [{ data: '2026-11-05', abre: '10:00', fecha: '18:00' }],
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
  const u = unidadeOk({ bairro: '', retirada: 'nao_informado', delivery_combo: 'sim', horario_festival: [] })
  const f = E.pendenciasEdicao({ comboNome: '  ', unidades: [u], itens, declaracoes: { i2: todas('contem') } })
  assert.deepEqual(f, ['combo_nome', 'unidade:uabc123:endereco', 'unidade:uabc123:modos', 'unidade:uabc123:canais', 'unidade:uabc123:horario', 'item:1:alimentar'])
})

test('pendências: o endereço só está completo com rua, número, bairro, cidade e CEP (28/10/2026)', () => {
  const pend = (extra) => E.pendenciasEdicao({ comboNome: 'C', unidades: [unidadeOk(extra)] }).filter((c) => c.endsWith(':endereco'))
  assert.deepEqual(pend({}), [])
  for (const campo of ['logradouro', 'numero', 'bairro', 'cidade', 'cep']) {
    assert.deepEqual(pend({ [campo]: '  ' }), ['unidade:uabc123:endereco'], campo + ' vazio deixa o endereço incompleto')
  }
  assert.deepEqual(pend({ numero: 'S/N' }), [], 'sem número vale se a marca escreve S/N')
  // O banco exige o mesmo (pendencias_publicacao em 20261120): rua, número, bairro, cidade e CEP não vazios.
  const sql = readFileSync(new URL('../supabase/migrations/20261120_endereco_completo_e_fila_de_localizacao.sql', import.meta.url), 'utf8')
  for (const campo of ['r.logradouro', 'r.u_numero', 'r.u_bairro', 'r.cidade', 'r.u_cep']) assert.ok(sql.includes("coalesce(btrim(" + campo + "), '') = ''"), campo + ' não é conferido no SQL')
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
  assert.deepEqual(t('unidade:u1:endereco'), { texto: 'Completar o endereço de Midway (rua, número, bairro, cidade e CEP)', bloco: 4, campo: 'unidade-endereco' })
  const modos = t('unidade:u2:modos')
  assert.match(modos.texto, /Ponta Negra/)
  assert.doesNotMatch(modos.texto, /u2/)
  assert.equal(modos.campo, 'atendimento-modos-2')
  assert.equal(t('unidade:u2:horario').campo, 'atendimento-horario-2')
  assert.equal(t('unidade:u2:horario').texto, 'Informar o horário no festival de Ponta Negra')
  assert.equal(t('unidade:u1:horario').campo, 'atendimento-horario')
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

/* ── Horário no festival (23/10/2026): uma pergunta só, coluna participacao_unidades.horario_festival ────── */
const H = (data, abre, fecha) => ({ data, abre, fecha })

test('horário no festival: a unidade na tela traz as linhas canônicas e o texto antigo; sem horário da loja nem tabela de dias', () => {
  // jsonb/PostgREST devolvem as chaves em outra ordem e, às vezes, HH:MM:SS
  const pu = { id: 'p1', participacao_id: 'pa', horarios: ' Seg a sáb 10h às 22h ', horario_festival: [
    { fecha: '22:00:00', data: '2026-11-06', abre: '10:00:00' }, { abre: '10:00', data: '2026-11-05', fecha: '22:00' }] }
  const u = E.unidadeDeLinhas(pu, { id: 'u1', logradouro: 'Rua A', horario_loja_texto: 'seg a sex' })
  assert.deepEqual(u.horario_festival, [H('2026-11-05', '10:00', '22:00'), H('2026-11-06', '10:00', '22:00')])
  assert.equal(u.horarios_antigo, 'Seg a sáb 10h às 22h')
  assert.ok(!('horario_loja_texto' in u) && !('disponibilidade' in u), 'a unidade não carrega mais o horário da loja nem os dias da tabela antiga')
  const vazia = E.unidadeDeLinhas(null, null)
  assert.deepEqual([vazia.horario_festival, vazia.horarios_antigo], [[], ''])
  // a unidade permanente não grava mais o horário da loja
  assert.ok(!('horario_loja_texto' in E.corpoUnidade({ logradouro: 'Rua A', horario_loja_texto: 'x' })))
})

test('horário no festival: vai no corpo da unidade da edição, canônico — o jsonb do banco não vira "mudou"', () => {
  const u = unidadeOk({ horario_festival: [H('2026-11-06', '18:00', '24:00'), H('2026-11-05', '10:00', '22:00')] })
  const c = E.corpoParticipacaoUnidade(u, 0)
  assert.deepEqual(c.horario_festival, [H('2026-11-05', '10:00', '22:00'), H('2026-11-06', '18:00', '24:00')], 'ordenado por dia e hora')
  // o que o PostgREST devolve (chaves em outra ordem, HH:MM:SS) é o MESMO corpo, texto a texto: patchMudancas não manda nada
  const doBanco = E.corpoParticipacaoUnidadeDeLinha({ id: 'p', ...c, horario_festival: [
    { fecha: '22:00:00', data: '2026-11-05', abre: '10:00:00' }, { abre: '18:00', data: '2026-11-06', fecha: '24:00' }] })
  assert.equal(JSON.stringify(doBanco.horario_festival), JSON.stringify(c.horario_festival))
  assert.deepEqual(doBanco, c, 'ida e volta pela linha do banco não muda nada')
  // outro horário é outro texto (é o que faz o PATCH levar a coluna)
  const outro = E.corpoParticipacaoUnidade(unidadeOk({ horario_festival: [H('2026-11-05', '10:00', '23:00')] }), 0)
  assert.notEqual(JSON.stringify(outro.horario_festival), JSON.stringify(c.horario_festival))
  // INSERT: a coluna só tem grant de UPDATE, então o corpo de uma unidade nova não a leva
  const novo = E.corpoNovaParticipacaoUnidade(u, 0)
  assert.ok(!('horario_festival' in novo))
  assert.deepEqual({ ...novo, horario_festival: c.horario_festival }, c)
  // sem resposta ainda: lista vazia, e a linha do banco sem a coluna (migration não aplicada) também
  assert.deepEqual(E.corpoParticipacaoUnidade(unidadeOk({ horario_festival: [] }), 0).horario_festival, [])
  assert.deepEqual(E.corpoParticipacaoUnidadeDeLinha({ id: 'p', ordem: 0 }).horario_festival, [])
})

test('horário no festival: [] = ainda não respondido e pende; qualquer horário respondido (até um dia só) não pende', () => {
  const itens = []
  const pende = (u) => E.pendenciasEdicao({ comboNome: 'C', unidades: [u], itens }).includes('unidade:uabc123:horario')
  assert.equal(pende(unidadeOk({ horario_festival: [] })), true)
  assert.equal(pende(unidadeOk({ horario_festival: undefined })), true)
  assert.equal(pende(unidadeOk({ horario_festival: [H('2026-11-05', '10:00', '22:00')] })), false)
  // o texto antigo sozinho NÃO conta como resposta: a marca confirma pelo seletor
  assert.equal(pende(unidadeOk({ horario_festival: [], horarios_antigo: 'Seg a sex 10h às 22h' })), true)
})

test('horário incompleto no seletor: o salvamento diz de qual unidade e o que falta, e o marcador nunca vai ao banco', () => {
  const u1 = unidadeOk({ nome_unidade: 'Midway', _horarioPendente: { faltando: ['Sábado', 'Domingo'], semDiaAberto: false } })
  const u2 = unidadeOk({ nome_unidade: '', bairro: 'Ponta Negra', _horarioPendente: { faltando: [], semDiaAberto: true } })
  const u3 = unidadeOk({ _horarioPendente: null })
  const u4 = unidadeOk({ participa: false, _horarioPendente: { faltando: ['Sábado'], semDiaAberto: false } })
  assert.deepEqual(E.frasesHorarioNaoSalvo([u1, u2, u3, u4]), [
    'O horário de Midway não foi salvo: falta responder Sábado e Domingo.',
    'O horário de Ponta Negra não foi salvo: marque pelo menos um dia em que a unidade abre.',
  ])
  assert.deepEqual(E.frasesHorarioNaoSalvo([]), [])
  assert.deepEqual(E.frasesHorarioNaoSalvo([unidadeOk()]), [])
  assert.equal(E.motivoHorarioIncompleto({ faltando: ['Segunda a sexta', 'Sábado', 'Domingo'] }), 'falta responder Segunda a sexta, Sábado e Domingo')
  assert.equal(E.motivoHorarioIncompleto({ faltando: ['Todos os dias'] }), 'falta responder Todos os dias')
  assert.equal(E.motivoHorarioIncompleto({}), '')
  // rascunho incompleto nunca é gravado: o corpo é o do horário COMPLETO que a unidade já tem, com ou sem marcador
  for (const corpo of [E.corpoParticipacaoUnidade(u1, 0), E.corpoNovaParticipacaoUnidade(u1, 0), E.corpoUnidade(u1)]) {
    assert.ok(!JSON.stringify(corpo).includes('Pendente') && !JSON.stringify(corpo).includes('Sábado'))
  }
  assert.deepEqual(E.corpoParticipacaoUnidade(u1, 0), E.corpoParticipacaoUnidade(unidadeOk({ nome_unidade: 'Midway' }), 0))
  // a voz do salvamento: não é "Alterações salvas"
  const r = E.rotuloSalvamento({ texto: 'O horário de Midway não foi salvo: falta responder Sábado.' })
  assert.deepEqual([r.estado, r.texto], ['corrigir', 'Há campos que precisam ser corrigidos'])
  assert.match(r.detalhe, /falta responder Sábado/)
  assert.equal(E.rotuloSalvamento({ texto: 'Salvo, menos o CEP (corrija o campo para gravar). O horário de Midway não foi salvo: falta responder Sábado.' }).estado, 'corrigir')
})

test('troca: não muda o valor do combo — o acréscimo vai sempre 0 (24/10/2026)', () => {
  const s = { original: 'Leite', alternativa: 'Bebida de aveia', disponibilidade: 'sempre', acrescimo: '', como_solicitar: '', modalidades: [], unidades: [] }
  assert.equal(E.corpoSubstituicao(s).acrescimo, 0)
  assert.equal(E.corpoSubstituicao({ ...s, acrescimo: '0' }).acrescimo, 0)
  assert.equal(E.corpoSubstituicao({ ...s, acrescimo: '2,50' }).acrescimo, 0)
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
  const sqlHorario = ler('supabase/migrations/20261107_horario_festival.sql')
  const grant = (tipo, tabela, fonte = sql) => {
    const m = new RegExp('grant ' + tipo + ' [(]([^)]+)[)]\\s+on public[.]' + tabela + ' to authenticated').exec(fonte)
    assert.ok(m, 'grant ' + tipo + ' de ' + tabela + ' não encontrado')
    return new Set(m[1].split(',').map((c) => c.trim()))
  }
  const u = unidadeOk({ numero: '1', uf: 'RN', cep: '59000000', whatsapp_publico: '84999991234' })
  const fora = (corpo, cols) => Object.keys(corpo).filter((k) => !cols.has(k))
  assert.deepEqual(fora(E.corpoUnidade(u), grant('update', 'unidades')), [])
  assert.deepEqual(fora({ participante_id: 'p', ...E.corpoUnidade(u) }, grant('insert', 'unidades')), [])
  // participacao_unidades: as colunas de 14/10 + horario_festival (migration de 23/10, só UPDATE por coluna)
  const updatePu = new Set([...grant('update', 'participacao_unidades'), ...grant('update', 'participacao_unidades', sqlHorario)])
  assert.ok(updatePu.has('horario_festival'), 'o horário no festival precisa de grant de UPDATE para a marca')
  assert.deepEqual(fora(E.corpoParticipacaoUnidade(u, 0), updatePu), [])
  // INSERT: sem grant da coluna do horário, então o corpo de uma unidade nova não a leva (grava depois, por PATCH)
  assert.doesNotMatch(sqlHorario, /grant insert[^;]*horario_festival/i)
  assert.ok(!('horario_festival' in E.corpoNovaParticipacaoUnidade(u, 0)))
})

/* ── Clareza do formulário (22/10/2026) ─────────────────────────────────────── */
test('numeração LOCAL por aba: Meu cadastro 1·2·3, Meu combo 1·2·3·4 — os índices dos blocos não mudam', () => {
  const cadastro = [0, 4, 6]; const combo = [1, 2, 3, 5]
  assert.deepEqual(cadastro.map((b) => E.numeroLocalDoBloco(b, cadastro)), [1, 2, 3])
  assert.deepEqual(combo.map((b) => E.numeroLocalDoBloco(b, combo)), [1, 2, 3, 4])
  // bloco que não é da aba não tem número; ordem de entrada não importa
  assert.equal(E.numeroLocalDoBloco(5, cadastro), null)
  assert.equal(E.numeroLocalDoBloco(4, [6, 0, 4]), 2)
  // os sete blocos continuam existindo, na mesma ordem de índice
  assert.equal(E.TITULOS_BLOCO.length, 7)
})

test('títulos claros por aba, sem número escrito à mão (o número vem da aba)', () => {
  const t = (n) => E.TITULOS_BLOCO[n].titulo
  assert.deepEqual([0, 4, 6].map(t), ['Dados da marca', 'Unidades participantes', 'Atendimento e horário no festival'])
  assert.doesNotMatch(E.TITULOS_BLOCO[6].titulo + ' ' + E.TITULOS_BLOCO[6].sub, /horário (da loja|do combo)/)
  assert.deepEqual([1, 2, 3, 5].map(t), ['Tema e inspiração', 'Itens do combo', 'Apresentação e condições do combo', 'Informações alimentares e trocas'])
  for (const x of E.TITULOS_BLOCO) assert.doesNotMatch(x.titulo, /^\d/)
})

test('areaDoBloco é o mesmo corte de vistaDoBloco (guia.js)', () => {
  for (let b = 0; b <= 7; b++) assert.equal(E.areaDoBloco(b), vistaDoBloco(b), 'bloco ' + b)
})

test('o que falta no cadastro: a da aba aberta primeiro; a da OUTRA aba diz onde está ("Falta em Meu combo: …")', () => {
  const faltaCampos = [{ bloco: 0, campo: 'responsavel', rotulo: 'Responsável', ok: false }, { bloco: 2, campo: 'item-1-nome', rotulo: 'Nome do doce', ok: false }]
  const pendEdicao = ['combo_nome', 'unidade:u1:horario', 'item:2:alimentar']
  const unidades = [unidadeOk({ id_publico: 'u1', nome_unidade: 'Midway' })]
  const itens = [{ id: 'i1', posicao: 1, tipo: 'doce' }, { id: 'i2', posicao: 2, tipo: 'salgado' }]
  // Quem está em Meu cadastro (0 · 4 · 6)
  const l = E.faltasDoCadastro({ faltaCampos, pendEdicao, unidades, itens, visiveis: [0, 4, 6] })
  assert.equal(l.length, 5)
  assert.deepEqual(l.map((f) => f.bloco), [0, 6, 2, 3, 5], 'primeiro o desta aba, depois o da outra, por bloco')
  assert.equal(l[0].textoCompleto, 'Responsável', 'na mesma aba o texto é curto')
  assert.equal(l[0].naOutraAba, false)
  assert.equal(l[1].textoCompleto, 'Informar o horário no festival de Midway')
  const nome = l.find((f) => f.codigo === 'combo_nome')
  assert.equal(nome.textoCompleto, 'Falta em Meu combo: Dar um nome ao combo')
  assert.equal(nome.naOutraAba, true)
  assert.equal(nome.area, 'combo')
  assert.equal(nome.campo, 'combo_nome', 'o botão ainda leva ao campo')
  // A MESMA lista vista de Meu combo: o que é do cadastro passa a ser "da outra aba" e vai para o fim
  const doCombo = E.faltasDoCadastro({ faltaCampos, pendEdicao, unidades, itens, visiveis: [1, 2, 3, 5] })
  assert.equal(doCombo[0].campo, 'item-1-nome')
  assert.equal(doCombo.find((f) => f.campo === 'responsavel').textoCompleto, 'Falta em Meu cadastro: Responsável')
  assert.equal(doCombo.find((f) => f.codigo === 'combo_nome').textoCompleto, 'Dar um nome ao combo')
})

test('o que falta: nada → lista vazia; item sem campo (só a organização cria) pede para falar com ela', () => {
  assert.deepEqual(E.faltasDoCadastro({ visiveis: [0, 4, 6] }), [])
  const semItem = E.faltasDoCadastro({ faltaCampos: [{ bloco: 2, campo: null, rotulo: 'Nome do item 3', ok: false }], visiveis: [1, 2, 3, 5] })
  assert.equal(semItem[0].texto, 'Nome do item 3 (fale com a organização)')
  assert.equal(semItem[0].campo, null)
})

test('comOnde nunca marca como "outra aba" o que não tem bloco', () => {
  const f = E.comOnde({ texto: 'x', bloco: null, campo: null }, [0, 4, 6])
  assert.equal(f.naOutraAba, false)
  assert.equal(f.textoCompleto, 'x')
})

test('estado do bloco: correção > falta > análise/aprovado > preenchido; preenchido nunca é aprovado', () => {
  const e = E.estadoDoBloco
  assert.deepEqual(e({ bloco: 2, faltam: 3, correcao: true }), { estado: 'alteracao', texto: 'Correção solicitada' })
  assert.deepEqual(e({ bloco: 2, faltam: 1 }), { estado: 'falta', texto: 'Falta 1 informação' })
  assert.equal(e({ bloco: 2, faltam: 4 }).texto, 'Faltam 4 informações')
  assert.deepEqual(e({ bloco: 2 }), { estado: 'completo', texto: 'Preenchido' })
  assert.equal(e({ bloco: 2, comboStatus: 'em_analise' }).texto, 'Em análise')
  assert.equal(e({ bloco: 2, comboStatus: 'aprovado' }).texto, 'Aprovado')
  // com falta, nem "em análise" nem "aprovado": falta vence
  assert.equal(e({ bloco: 2, faltam: 1, comboStatus: 'aprovado' }).estado, 'falta')
  // aprovado + mexeu depois: não finge que o que mudou está aprovado
  assert.deepEqual(e({ bloco: 2, comboStatus: 'aprovado', alterado: true }), { estado: 'completo', texto: 'Preenchido · alterações salvas' })
  // tema aprovado ≠ combo aprovado
  assert.deepEqual(e({ bloco: 1, temaStatus: 'aprovado' }), { estado: 'aprovado', texto: 'Tema aprovado' })
  assert.equal(e({ bloco: 1, temaStatus: 'aprovado', comboStatus: 'aprovado' }).texto, 'Aprovado')
  assert.equal(e({ bloco: 2, temaStatus: 'aprovado' }).texto, 'Preenchido', 'tema aprovado só vale para o bloco do tema')
  assert.equal(e({ bloco: 1, temaStatus: 'proposto' }).texto, 'Tema em análise')
  // combo aprovado não faz de um tema ainda proposto um tema aprovado
  assert.equal(e({ bloco: 1, temaStatus: 'proposto', comboStatus: 'aprovado' }).texto, 'Tema em análise')
  assert.equal(e({ bloco: 1, temaStatus: 'proposto', comboStatus: 'em_analise' }).texto, 'Tema em análise')
  assert.equal(e({ bloco: 1, temaStatus: 'aprovado', comboStatus: 'aprovado', alterado: true }).texto, 'Tema aprovado')
  assert.equal(e({ bloco: 3, temaStatus: 'proposto', comboStatus: 'aprovado' }).texto, 'Aprovado', 'só o bloco do tema segue o tema')
  // bloco da camada de edição que ainda não abriu (sem as migrations)
  assert.deepEqual(e({ bloco: 5, pronto: false }), { estado: 'espera', texto: 'Abre quando a organização liberar' })
})

test('resumo do bloco recolhido: poucas palavras, e vazio quando não há o que dizer', () => {
  const r = E.resumoDoBloco
  const unid = (x) => ({ participa: true, logradouro: 'Rua A', horario_festival: [], ...x })
  assert.equal(r(0, { marca: { nome_marca: 'Casa Doce', telefone: '(84) 99999-1234' } }), 'Casa Doce · (84) 99999-1234')
  assert.equal(r(0, { marca: { nome_marca: 'Casa Doce', telefone: '' } }), 'Casa Doce')
  assert.equal(r(1, { tema: { tema_combo: 'Moana' } }), 'Tema: Moana')
  assert.equal(r(1, { tema: { tema_combo: '  ' } }), '')
  const tres = [{ nome: 'Bolo' }, { nome: 'Coxinha' }, { nome: 'Café' }]
  assert.equal(r(2, { itens: tres }), '3 itens')
  assert.equal(r(2, { itens: [{ nome: 'Bolo' }, { nome: '' }, { nome: ' ' }] }), '1 de 3 itens com nome')
  assert.equal(r(3, { combo: { combo_nome: 'Combo Lagoa' } }), 'Combo: Combo Lagoa')
  assert.equal(r(4, { unidades: [unid(), unid({ logradouro: 'Rua B' })] }), '2 unidades')
  assert.equal(r(4, { unidades: [unid()] }), '1 unidade')
  // a unidade em branco que a tela sempre mostra não conta, e a que não participa também não
  assert.equal(r(4, { unidades: [unid({ logradouro: '' }), unid({ participa: false })] }), '')
  assert.equal(r(5, { itens: [{ id: 'a' }, { id: 'b' }], declaracoes: { a: todas('nao_contem') } }), '1 de 2 itens respondidos')
  assert.equal(r(6, { unidades: [unid({ horario_festival: [H('2026-11-05', '10:00', '22:00')] }), unid()] }), 'Horário no festival em 1 de 2 unidades')
  assert.equal(r(6, { unidades: [] }), '')
  assert.equal(r(9, {}), '')
  assert.ok(r(1, { tema: { tema_combo: 'x'.repeat(200) } }).length <= 'Tema: '.length + 48)
})

test('situação da marca: só "salvar" — completo vai para a organização; "completo" não é "aprovado"', () => {
  const s = E.situacaoDaMarca
  const texto = (x) => s(x).texto
  assert.equal(texto({ faltam: 3 }), 'Em preenchimento')
  assert.equal(texto({ faltam: 0 }), 'Completo · a organização vai conferir')
  assert.equal(texto({ statusCadastro: 'cadastro_completo', comboStatus: 'em_analise' }), 'Completo · a organização está conferindo')
  assert.match(s({ comboStatus: 'em_analise' }).nota, /É só salvar/)
  assert.equal(texto({ comboStatus: 'correcao_solicitada', statusCadastro: 'em_preenchimento' }), 'Ajuste pedido · corrija e salve')
  assert.match(s({ comboStatus: 'correcao_solicitada' }).nota, /salve/)
  assert.equal(texto({ comboStatus: 'aprovado' }), 'Combo aprovado')
  assert.equal(texto({ comboStatus: 'aprovado', alterado: true }), 'Alterações salvas · a organização vai atualizar o site')
  assert.equal(texto({ comboStatus: 'aprovado', publicada: true }), 'Combo aprovado · página no ar')
  assert.equal(texto({ statusCadastro: 'encerrado', comboStatus: 'aprovado' }), 'Participação encerrada')
  assert.equal(texto({ semParticipacao: true }), 'Sem edição aberta')
  // cadastro completo (dado de antes do gatilho, combo em rascunho) está com a organização, e não é "aprovado"
  const completo = s({ statusCadastro: 'cadastro_completo' })
  assert.equal(completo.chave, 'em_analise')
  assert.doesNotMatch(completo.texto, /aprovad|Cadastro completo/i)
  // nenhum texto manda "enviar"; o tom é sempre um dos do <Selo>
  const todos = [{}, { faltam: 1 }, { comboStatus: 'aprovado' }, { comboStatus: 'aprovado', alterado: true }, { comboStatus: 'em_analise' },
    { comboStatus: 'correcao_solicitada' }, { statusCadastro: 'cadastro_completo' }, { statusCadastro: 'encerrado' }, { semParticipacao: true }]
  for (const x of todos) {
    assert.doesNotMatch(s(x).texto + ' ' + s(x).nota, /envi/i, JSON.stringify(x))
    assert.ok(['neutro', 'andamento', 'atencao', 'ok', 'encerrado'].includes(s(x).tom), JSON.stringify(x))
  }
})

test('linha do que falta: quantas informações; sem falta, diz isso (e nada de "enviar")', () => {
  const t = E.textoFaltam
  assert.equal(t({ faltam: 1 }), 'Falta 1 informação')
  assert.equal(t({ faltam: 4 }), 'Faltam 4 informações')
  assert.equal(t({ faltam: 0, chave: 'pronto' }), 'Nenhuma informação faltando')
  assert.equal(t({ faltam: 0, chave: 'em_analise' }), 'Nenhuma informação faltando')
  assert.equal(t({ faltam: 0, chave: 'encerrada' }), '')
  // mesmo em análise, faltar dado obrigatório continua aparecendo
  assert.equal(t({ faltam: 2, chave: 'em_analise' }), 'Faltam 2 informações')
})

test('WhatsApp da loja: preenchido vai ao site; o antigo (sem autorização) só vai quando a marca mexe na unidade', () => {
  const antigo = E.unidadeDeLinhas(null, { id: 'u1', logradouro: 'Rua A', whatsapp_publico: '84999991234', whatsapp_autorizado: false })
  assert.equal(antigo.whatsapp_autorizado, false, 'abrir a tela não libera nada')
  assert.equal(E.whatsappLegado(antigo), true)
  // a foto do que está gravado bate com a tela recém-aberta: o salvamento não vê diferença
  assert.equal(E.corpoUnidade(antigo).whatsapp_autorizado, false)
  // mexer em outro campo da unidade libera o número antigo
  const mexida = E.editarUnidade(antigo, { bairro: 'Tirol' })
  assert.equal(mexida.whatsapp_autorizado, true)
  assert.equal(mexida.bairro, 'Tirol')
  assert.equal(E.whatsappLegado(mexida), false)
  // digitar o número decide: preenchido = vai; apagado = não vai
  assert.equal(E.editarUnidade(antigo, { whatsapp_publico: '(84) 98888-7777' }).whatsapp_autorizado, true)
  assert.equal(E.editarUnidade({ ...antigo, whatsapp_autorizado: true }, { whatsapp_publico: '' }).whatsapp_autorizado, false)
  // sem número, não há o que liberar
  const sem = E.unidadeDeLinhas(null, { id: 'u2', logradouro: 'Rua B' })
  assert.equal(E.whatsappLegado(sem), false)
  assert.equal(E.editarUnidade(sem, { numero: '5' }).whatsapp_autorizado, false)
  // número pela metade: nem ele nem a liberação vão no PATCH (senão o número antigo iria ao site)
  const metade = E.editarUnidade(antigo, { whatsapp_publico: '(84) 9999' })
  assert.equal(E.whatsappLegado(metade), false)
  const corpo = E.corpoUnidade(metade)
  assert.ok(!('whatsapp_publico' in corpo) && !('whatsapp_autorizado' in corpo))
})

test('rótulo do salvamento: "Salvando…" só em voo, "Alterações salvas" só depois do servidor, erro com uma voz só', () => {
  const r = E.rotuloSalvamento
  assert.deepEqual(r({ salvando: true, texto: 'Informações salvas.' }), { estado: 'salvando', texto: 'Salvando…', detalhe: '' })
  assert.equal(r({ texto: 'Informações salvas.' }).texto, 'Alterações salvas')
  assert.equal(r({ texto: '' }).texto, '', 'sem salvamento ainda, nada a dizer')
  assert.deepEqual(r({ erro: true, texto: 'Informações salvas.' }), { estado: 'erro', texto: 'Não foi possível salvar', detalhe: '' })
  const campo = r({ texto: 'Salvo, menos o CEP (corrija o campo para gravar).' })
  assert.equal(campo.texto, 'Há campos que precisam ser corrigidos')
  assert.match(campo.detalhe, /menos o CEP/)
  assert.equal(r({ texto: 'Salvo, menos o que aguarda a sua escolha.' }).estado, 'parcial')
})

// O Cadastro.jsx liga o que as funções acima decidem. Só o que, se sumir, desfaz a clareza sem ninguém notar.
test('Cadastro.jsx: sem "Cadastro completo" como aprovação, sem número escrito à mão, salvamento por UM mecanismo', () => {
  const c = ler('painel-app/src/components/vistas-marca/Cadastro.jsx')
  assert.doesNotMatch(c, /Cadastro completo|% concluído/)
  assert.doesNotMatch(c, /0[1-7] · /, 'o número do bloco é local (numeroLocalDoBloco)')
  assert.match(c, /E\.numeroLocalDoBloco\(n, visiveis\)/)
  assert.match(c, /E\.situacaoDaMarca\(/)
  assert.match(c, /E\.faltasDoCadastro\(/)
  // "Salvando…" liga e desliga no mesmo voo do salvamento (sem segundo mecanismo)
  assert.match(c, /emVoo\(1\)[\s\S]*?finally \{[^}]*emVoo\(-1\)/)
  // um "Salvar" só, explicado pela nota
  assert.match(c, /aria-describedby="nota-salvar">Salvar</)
  assert.match(c, /Tudo o que você salva chega para a organização, que atualiza o site\./)
})

test('Cadastro.jsx: só "Salvar" — sem enviar, sem revisão antes do envio, sem "Ver como fica no site"', () => {
  const c = ler('painel-app/src/components/vistas-marca/Cadastro.jsx')
  const sem = c.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  assert.doesNotMatch(sem, /Enviar para|Enviar alterações|Enviar novamente|Revisar e enviar|Revisar antes de enviar|Ver como fica no site/)
  assert.doesNotMatch(sem, /marca_concluir_cadastro|marca_previa_publica|FichaPrevia|<Previa|<Revisao/)
  assert.match(c, /E\.editarUnidade\(u, \{ \[campo\]: valor \}\)/, 'mexer na unidade decide o WhatsApp da loja')
  assert.match(c, /unidades\.some\(E\.whatsappLegado\)/, '"Salvar" leva o WhatsApp antigo ao site')
  const envio = ler('painel-app/src/components/vistas-marca/edicao/Envio.jsx')
  assert.doesNotMatch(envio, /Previa|Revisao|FichaPrevia|Enviar alterações/)
  assert.ok(!existsSync(new URL('../painel-app/src/components/vistas-marca/edicao/FichaPrevia.jsx', import.meta.url)), 'a prévia saiu')
  const unidades = ler('painel-app/src/components/vistas-marca/edicao/Unidades.jsx')
  assert.doesNotMatch(unidades, /Autorizo publicar|whatsapp_autorizado/)
  assert.match(unidades, /WhatsApp da loja/)
  assert.match(unidades, /Este número vai para o site quando você salvar esta unidade\./)
  const css = ler('painel-app/src/styles/edicao-marca.css')
  assert.doesNotMatch(css, /em-previa|em-revisao|em-envio/)
})

/* ── Horário no festival na tela da marca (23/10/2026) ──────────────────────────────────────────────────────── */
const { Atendimento } = carregar('painel-app/src/components/vistas-marca/edicao/Atendimento.jsx')
const DIAS = datasDoFestival('2026-11-05', '2026-11-15')
const desenharAtendimento = (u, extra = {}) =>
  html(Atendimento, { unidades: [u], dias: DIAS, est: () => null, alterar() {}, alterarCanal() {}, alterarHorario() {}, ...extra })

test('Atendimento: o seletor do horário no festival ocupa o lugar do horário do combo, com a âncora de sempre', () => {
  const u = unidadeOk({ puId: 'pu1', horario_festival: [], horarios_antigo: 'Seg a sex, 10h às 18h' })
  const h = desenharAtendimento(u)
  assert.match(h, /id="campo-atendimento-horario"/, 'âncora para onde a pendência e a correção levam')
  assert.match(h, /Como esta unidade funciona nos dias do festival\?/)
  assert.match(h, /De 5 a 15 de novembro\./, 'as datas vêm do cadastro da edição')
  assert.match(h, /Hoje está: <b>Seg a sex, 10h às 18h<\/b>/, 'o texto de antes só aparece enquanto não há horário')
  assert.ok(!/horário (da loja|do combo)|Mesmo horário todos os dias|Incluir um dia/i.test(h), 'uma pergunta só')
  // com horário gravado, abre já no modo certo e o texto antigo some
  const gravado = desenharAtendimento({ ...u, horario_festival: DIAS.map((d) => H(d, '10:00', '22:00')) })
  assert.match(gravado, /Fica assim: <b>Todos os dias, das 10h às 22h<\/b>/)
  assert.ok(!/Hoje está/.test(gravado))
  // a âncora da 2ª unidade leva o sufixo
  const duas = html(Atendimento, { unidades: [u, { ...u, _key: 'pu-2', puId: 'pu2' }], dias: DIAS, est: () => null, alterar() {}, alterarCanal() {}, alterarHorario() {} })
  assert.match(duas, /id="campo-atendimento-horario-2"/)
})

test('Atendimento: sem a linha da unidade no banco não há onde gravar — pede o endereço; sem datas, o seletor espera a organização', () => {
  const sem = desenharAtendimento(unidadeOk({ puId: null }))
  assert.match(sem, /Preencha o endereço da unidade para liberar o horário\./)
  assert.ok(!/Como esta unidade funciona/.test(sem))
  assert.match(sem, /id="campo-atendimento-horario"/, 'a âncora existe mesmo assim')
  const semDatas = desenharAtendimento(unidadeOk({ puId: 'pu1' }), { dias: [] })
  assert.match(semDatas, /As datas do festival ainda não foram definidas pela organização\./)
})

test('Atendimento: "Ver como participante" só lê — o seletor vem desabilitado', () => {
  const u = unidadeOk({ puId: 'pu1' })
  assert.match(desenharAtendimento(u, { desabilitado: true }), /<fieldset class="hf__modos" disabled=""/)
  assert.ok(!/<fieldset class="hf__modos" disabled=""/.test(desenharAtendimento(u)))
  const c = ler('painel-app/src/components/vistas-marca/Cadastro.jsx')
  assert.match(c, /desabilitado=\{emVerComo\(\)\}/, 'o Cadastro desabilita o seletor no modo de visualização')
})

// Varre os arquivos onde a marca lê: nenhum texto, comentário ou chave pode voltar a separar o horário da loja do horário do combo.
function arquivosDe(dir, achados = []) {
  for (const nome of readdirSync(new URL('../' + dir + '/', import.meta.url))) {
    const rel = dir + '/' + nome
    if (statSync(new URL('../' + rel, import.meta.url)).isDirectory()) arquivosDe(rel, achados)
    else if (/\.(jsx?|css)$/.test(nome)) achados.push(rel)
  }
  return achados
}
test('o cadastro da marca não fala em "horário da loja" nem em "horário do combo", e não usa mais a tabela de dias', () => {
  const alvos = [
    ...arquivosDe('painel-app/src/components/vistas-marca'),
    ...['edicaoMarca', 'guia', 'ajuda', 'inicioMarca', 'cadastroMescla'].map((n) => 'painel-app/src/lib/' + n + '.js'),
    'painel-app/src/styles/edicao-marca.css',
  ]
  assert.ok(alvos.length > 20, 'a varredura achou os arquivos')
  for (const rel of alvos) {
    const src = ler(rel)
    assert.doesNotMatch(src, /horário (da loja|do combo)|horarios? do combo|horario_loja|horario_combo|unidade-horario-loja/i, rel)
    assert.doesNotMatch(src, /unidade_disponibilidade|dispRows|HorarioCombo|em-dias|em-dia__|em-horario__/, rel + ' (tabela e tela antigas)')
  }
  // as pontas do novo desenho estão ligadas
  const c = ler('painel-app/src/components/vistas-marca/Cadastro.jsx')
  assert.match(c, /alterarHorario=\{alterarHorario\}/)
  assert.match(c, /datasDoFestival\(festival\.inicio, festival\.fim\)/, 'os dias vêm de edicoes.festival_inicio/fim')
  assert.match(c, /E\.corpoNovaParticipacaoUnidade\(u, ordem\)/, 'o INSERT da unidade não leva a coluna do horário')
  assert.match(c, /E\.frasesHorarioNaoSalvo\(unidades\)/, 'o salvamento avisa do horário que ficou de fora')
  assert.match(c, /E\.editarUnidade\(u, \{ horario_festival: linhasCanonicas\(r\.linhas\), _horarioPendente: null \}, \{ liberaLegado: false \}\)/, 'só o horário completo vira dado da unidade (e não publica o WhatsApp antigo)')
  assert.match(c, /: \{ \.\.\.u, _horarioPendente: \{/, 'o incompleto só deixa o marcador (mexer em horario_festival refaria o rascunho)')
})

test('WhatsApp antigo (sem autorização): só a edição dos DADOS da unidade o libera; atendimento, canais e horário não', () => {
  const antigo = { whatsapp_publico: '84999998888', whatsapp_autorizado: false, consumo_local: 'nao_informado', canais: {} }
  assert.equal(E.whatsappLegado(antigo), true)
  // bloco 4 (dados da unidade): salvar a unidade libera o número, como avisa a tela
  assert.equal(E.editarUnidade(antigo, { bairro: 'Centro' }).whatsapp_autorizado, true)
  // bloco 6 (atendimento, canais, horário): confirmar o horário NÃO publica um número que ela digitou sob a regra antiga
  assert.equal(E.editarUnidade(antigo, { consumo_local: 'sim' }, { liberaLegado: false }).whatsapp_autorizado, false)
  assert.equal(E.editarUnidade(antigo, { horario_festival: [] }, { liberaLegado: false }).whatsapp_autorizado, false)
  // digitar o número continua decidindo a liberação, em qualquer bloco
  assert.equal(E.editarUnidade(antigo, { whatsapp_publico: '' }, { liberaLegado: false }).whatsapp_autorizado, false)
  const c = ler('painel-app/src/components/vistas-marca/Cadastro.jsx')
  assert.match(c, /alterar=\{alterarAtendimento\} alterarCanal=\{alterarCanal\}/, 'o Atendimento usa o handler que não libera')
  assert.match(c, /function alterarCanal[\s\S]*?\{ liberaLegado: false \}/)
})

test('situação da marca: cadastro já com a organização mas com informação nova a preencher não diz "Completo"', () => {
  const dentro = E.situacaoDaMarca({ statusCadastro: 'cadastro_completo', comboStatus: 'rascunho', faltam: 1 })
  assert.equal(dentro.texto, 'A organização está conferindo · falta informação')
  assert.equal(dentro.tom, 'atencao')
  assert.equal(E.situacaoDaMarca({ comboStatus: 'em_analise', faltam: 2 }).texto, 'A organização está conferindo · falta informação')
  // sem nada faltando, a frase de sempre
  assert.equal(E.situacaoDaMarca({ statusCadastro: 'cadastro_completo', faltam: 0 }).texto, 'Completo · a organização está conferindo')
  assert.equal(E.situacaoDaMarca({ comboStatus: 'em_analise', faltam: 0 }).tom, 'andamento')
})

test('conclusão sozinha: a marca que já estava completa é concluída ao abrir, sem esperar uma escrita', async () => {
  const c = ler('painel-app/src/components/vistas-marca/Cadastro.jsx')
  assert.match(c, /import \{ ConcluirSozinho \} from '\.\/edicao\/ConcluirSozinho'/)
  assert.match(c, /faltam === 0 && comboStatus === 'rascunho'\s*\n\s*&& \['aguardando_cadastro', 'em_preenchimento'\]\.includes\(statusCadastro\) && !pendenteRef\.current && !vooRef\.current/)
  assert.match(c, /!emVerComo\(\) && faltam === 0/, '"Ver como" não escreve nada')
  const cs = ler('painel-app/src/components/vistas-marca/edicao/ConcluirSozinho.jsx')
  assert.match(cs, /tentou\.current/, 'uma tentativa por vez que fica verdadeiro')
  // A decisão, com a API trocada por uma falsa (carregar() empacota o componente como os outros testes de tela).
  const { concluirSeFaltar } = carregar('painel-app/src/components/vistas-marca/edicao/ConcluirSozinho.jsx')
  const chamadas = []
  const api = (status, ok = true, combo = 'rascunho') => async (caminho, o) => {
    chamadas.push(caminho)
    if (caminho.startsWith('participacoes')) return status === null ? [] : [{ status_cadastro: status, combo_status: combo }]
    return { ok }
  }
  assert.equal(await concluirSeFaltar(api('em_preenchimento'), 'pa1'), 'cadastro_completo')
  assert.deepEqual(chamadas, ['participacoes?select=status_cadastro,combo_status&id=eq.pa1', 'rpc/marca_concluir_cadastro'], 'lê o servidor e só então conclui')
  chamadas.length = 0
  assert.equal(await concluirSeFaltar(api('aguardando_cadastro'), 'pa1'), 'cadastro_completo')
  chamadas.length = 0
  assert.equal(await concluirSeFaltar(api('cadastro_completo'), 'pa1'), 'cadastro_completo', 'já concluída por fora (o gatilho): só a tela se atualiza')
  assert.deepEqual(chamadas, ['participacoes?select=status_cadastro,combo_status&id=eq.pa1'], 'e NÃO chama a RPC de novo (cada chamada deixaria uma linha na auditoria)')
  chamadas.length = 0
  assert.equal(await concluirSeFaltar(api('em_preenchimento', true, 'correcao_solicitada'), 'pa1'), 'em_preenchimento', 'combo com ajuste pedido não é "rascunho": não conclui')
  assert.equal(chamadas.length, 1)
  assert.equal(await concluirSeFaltar(api('em_preenchimento', false), 'pa1'), null, 'o servidor diz que ainda falta algo: nada muda')
  assert.equal(await concluirSeFaltar(api(null), 'pa1'), null, 'participação não encontrada')
})

test('horário incompleto conta como trabalho pela metade (atualizar versão, convite e fechar a aba perguntam)', () => {
  const c = ler('painel-app/src/components/vistas-marca/Cadastro.jsx')
  assert.match(c, /horarioPendenteRef\.current = unidades\.some\(\(u\) => u\._horarioPendente\)/)
  assert.match(c, /registrarPendencia\('cadastro-horario', \{[\s\S]*?ativo: \(\) => horarioPendenteRef\.current/)
  assert.match(c, /tirarHorario\(\)/, 'sai do registro ao desmontar')
})

test('troca na tela da marca: sem campo de acréscimo, passos 1-2-3 e "não muda o valor do combo"', () => {
  const src = ler('painel-app/src/components/vistas-marca/edicao/Alimentar.jsx')
  assert.doesNotMatch(src, /Acréscimo em reais|campo\('acrescimo'\)/)
  assert.match(src, /A troca não muda o valor do combo/)
  assert.match(src, /1\. O que pode ser trocado\?/)
  assert.match(src, /Mais detalhes/)
})

test('troca renderizada: passos, "Mais detalhes" recolhido quando vazio e aberto quando há detalhe', () => {
  const { Alimentar } = carregar('painel-app/src/components/vistas-marca/edicao/Alimentar.jsx')
  const itens = [{ id: 'i1', posicao: 1, tipo: 'doce', nome: 'Croissant' }]
  const vazia = { _key: 'k1', item_id: 'i1', original: '', alternativa: '', disponibilidade: 'sob_consulta', acrescimo: '', como_solicitar: '', modalidades: [], unidades: [] }
  const sub = { alterar() {}, remover() {}, adicionar() {} }
  const props = (lista) => ({ itens, declaracoes: {}, substituicoes: lista, unidades: [], est: () => ({}), alterarDeclaracao() {}, sub })
  const h = html(Alimentar, props([vazia]))
  assert.match(h, /1\. O que pode ser trocado\?/)
  assert.match(h, /3\. Está disponível/)
  assert.match(h, /A troca não muda o valor do combo/)
  assert.doesNotMatch(h, /Acréscimo/)
  assert.match(h, /<details class="em-troca__mais">/)
  assert.match(html(Alimentar, props([{ ...vazia, como_solicitar: 'Peça no caixa' }])), /<details class="em-troca__mais" open="">/)
})
