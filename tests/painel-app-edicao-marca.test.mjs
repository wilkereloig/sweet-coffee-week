// Cadastro da marca na camada de edição (Cartoon 2026.2) — painel-app/src/lib/edicaoMarca.js.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as E from '../painel-app/src/lib/edicaoMarca.js'
import { vistaDoBloco } from '../painel-app/src/lib/guia.js'

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
  assert.deepEqual([0, 4, 6].map(t), ['Dados da marca', 'Unidades participantes', 'Atendimento e horários do combo'])
  assert.deepEqual([1, 2, 3, 5].map(t), ['Tema e inspiração', 'Itens do combo', 'Apresentação e condições do combo', 'Informações alimentares e trocas'])
  for (const x of E.TITULOS_BLOCO) assert.doesNotMatch(x.titulo, /^\d/)
})

test('areaDoBloco é o mesmo corte de vistaDoBloco (guia.js)', () => {
  for (let b = 0; b <= 7; b++) assert.equal(E.areaDoBloco(b), vistaDoBloco(b), 'bloco ' + b)
})

test('revisão por área: a falta da OUTRA aba diz onde está ("Falta em Meu combo: …")', () => {
  const faltaCampos = [{ bloco: 0, campo: 'responsavel', rotulo: 'Responsável', ok: false }, { bloco: 2, campo: 'item-1-nome', rotulo: 'Nome do doce', ok: false }]
  const pendEdicao = ['combo_nome', 'unidade:u1:horario', 'item:2:alimentar']
  const unidades = [unidadeOk({ id_publico: 'u1', nome_unidade: 'Midway' })]
  const itens = [{ id: 'i1', posicao: 1, tipo: 'doce' }, { id: 'i2', posicao: 2, tipo: 'salgado' }]
  // Quem está em Meu cadastro (0 · 4 · 6)
  const r = E.revisaoPorArea({ faltaCampos, pendEdicao, unidades, itens, visiveis: [0, 4, 6] })
  assert.equal(r.faltam, 5)
  assert.equal(r.pronto, false)
  const [cad, com] = r.areas
  assert.deepEqual([cad.chave, cad.faltam, cad.texto], ['cadastro', 2, 'Meu cadastro: 2 faltam'])
  assert.deepEqual([com.chave, com.faltam, com.texto], ['combo', 3, 'Meu combo: 3 faltam'])
  assert.equal(cad.itens[0].textoCompleto, 'Responsável', 'na mesma aba o texto é curto')
  assert.equal(cad.itens[0].naOutraAba, false)
  assert.equal(cad.itens[1].textoCompleto, 'Informar o horário do combo em Midway')
  const nome = com.itens.find((f) => f.codigo === 'combo_nome')
  assert.equal(nome.textoCompleto, 'Falta em Meu combo: Dar um nome ao combo')
  assert.equal(nome.naOutraAba, true)
  assert.equal(nome.bloco, 3)
  assert.equal(nome.campo, 'combo_nome', 'o botão ainda leva ao campo')
  // ordem: por bloco dentro da área
  assert.deepEqual(com.itens.map((f) => f.bloco), [2, 3, 5])
  // A MESMA lista vista de Meu combo: o que é do cadastro passa a ser "da outra aba"
  const vistoDoCombo = E.revisaoPorArea({ faltaCampos, pendEdicao, unidades, itens, visiveis: [1, 2, 3, 5] })
  assert.equal(vistoDoCombo.areas[0].itens.find((f) => f.campo === 'responsavel').textoCompleto, 'Falta em Meu cadastro: Responsável')
  assert.equal(vistoDoCombo.areas[1].itens.find((f) => f.codigo === 'combo_nome').textoCompleto, 'Dar um nome ao combo')
})

test('revisão por área: tudo pronto e item sem campo (só a organização cria)', () => {
  const pronta = E.revisaoPorArea({ visiveis: [0, 4, 6] })
  assert.equal(pronta.pronto, true)
  assert.deepEqual(pronta.areas.map((a) => a.texto), ['Meu cadastro: pronto', 'Meu combo: pronto'])
  const semItem = E.revisaoPorArea({ faltaCampos: [{ bloco: 2, campo: null, rotulo: 'Nome do item 3', ok: false }], visiveis: [1, 2, 3, 5] })
  assert.equal(semItem.areas[1].itens[0].texto, 'Nome do item 3 (fale com a organização)')
  assert.equal(semItem.areas[1].texto, 'Meu combo: 1 falta')
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
  assert.deepEqual(e({ bloco: 2, comboStatus: 'aprovado', alterado: true }), { estado: 'completo', texto: 'Preenchido · alterações a enviar' })
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
  const unid = (x) => ({ participa: true, logradouro: 'Rua A', disponibilidade: [], ...x })
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
  assert.equal(r(6, { unidades: [unid({ disponibilidade: [{ id: 'd' }] }), unid()] }), 'Horário do combo em 1 de 2 unidades')
  assert.equal(r(6, { unidades: [] }), '')
  assert.equal(r(9, {}), '')
  assert.ok(r(1, { tema: { tema_combo: 'x'.repeat(200) } }).length <= 'Tema: '.length + 48)
})

test('situação da marca: envio e aprovação são coisas diferentes; "preenchido" não é "aprovado"', () => {
  const s = E.situacaoDaMarca
  const texto = (x) => s(x).texto
  assert.equal(texto({ faltam: 3 }), 'Rascunho')
  assert.equal(texto({ faltam: 0 }), 'Pronto para enviar')
  assert.equal(texto({ statusCadastro: 'em_preenchimento', faltam: 0 }), 'Pronto para enviar')
  assert.equal(texto({ statusCadastro: 'cadastro_completo', comboStatus: 'em_analise' }), 'Enviado · em análise')
  assert.match(s({ comboStatus: 'em_analise' }).nota, /Aguardando a organização/)
  assert.equal(texto({ comboStatus: 'correcao_solicitada', statusCadastro: 'cadastro_completo' }), 'Ajuste pedido')
  assert.equal(texto({ comboStatus: 'aprovado' }), 'Combo aprovado')
  assert.equal(texto({ comboStatus: 'aprovado', alterado: true }), 'Aprovado, com alterações a enviar')
  assert.equal(texto({ comboStatus: 'aprovado', publicada: true }), 'Combo aprovado · página no ar')
  assert.equal(texto({ statusCadastro: 'encerrado', comboStatus: 'aprovado' }), 'Participação encerrada')
  assert.equal(texto({ semParticipacao: true }), 'Sem edição aberta')
  // cadastro enviado sem aprovação NUNCA diz "completo" nem "aprovado"
  const enviado = s({ statusCadastro: 'cadastro_completo' })
  assert.equal(enviado.texto, 'Enviado para a organização')
  assert.doesNotMatch(enviado.texto, /completo|aprovad/i)
  // o tom é sempre um dos do <Selo>
  for (const x of [{}, { faltam: 1 }, { comboStatus: 'aprovado' }, { comboStatus: 'em_analise' }, { comboStatus: 'correcao_solicitada' }, { statusCadastro: 'encerrado' }, { semParticipacao: true }]) {
    assert.ok(['neutro', 'andamento', 'atencao', 'ok', 'encerrado'].includes(s(x).tom), JSON.stringify(x))
  }
})

test('linha de envio: quanto falta; em análise mostra "Aguardando a organização" e não cobra envio', () => {
  const t = E.textoEnvio
  assert.equal(t({ faltam: 1 }), 'Falta 1 item para enviar')
  assert.equal(t({ faltam: 4 }), 'Faltam 4 itens para enviar')
  assert.equal(t({ faltam: 0, chave: 'pronto' }), 'Tudo pronto para enviar')
  assert.equal(t({ faltam: 0, chave: 'em_analise' }), 'Aguardando a organização')
  assert.equal(t({ faltam: 0, chave: 'enviado' }), 'Aguardando a organização')
  assert.equal(t({ faltam: 0, chave: 'aprovado' }), 'Nada a enviar agora')
  assert.equal(t({ faltam: 0, chave: 'encerrada' }), '')
  // mesmo em análise, faltar dado obrigatório continua aparecendo
  assert.equal(t({ faltam: 2, chave: 'em_analise' }), 'Faltam 2 itens para enviar')
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
  assert.match(c, /E\.revisaoPorArea\(/)
  // "Salvando…" liga e desliga no mesmo voo do salvamento (sem segundo mecanismo)
  assert.match(c, /emVoo\(1\)[\s\S]*?finally \{[^}]*emVoo\(-1\)/)
  // o botão de enviar fica explicado e é descrito pela nota
  assert.match(c, /aria-describedby="nota-envio"/)
  assert.match(c, /passo à parte e leva o cadastro inteiro/)
})
