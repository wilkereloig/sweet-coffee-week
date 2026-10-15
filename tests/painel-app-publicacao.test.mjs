// Publicação da edição Cartoon 2026.2, lado da organização — lógica pura
// (painel-app/src/lib/publicacao.js). O banco decide; aqui se confere a
// tradução, a diferença campo a campo e o espelho das regras de coerência.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  estadoPublicacao, textoPublicacao, filtrarPublicacoes, podePublicarCombo, traduzirPendencia,
  camposPublicos, diferencas, problemaChaves, bloqueioMudanca, paraLocalFortaleza, deLocalFortaleza,
  lerCoordenada, linkMapa, validarSlug, caminhoMidia, motivoNaoAprovar, traduzirErroPublicacao,
  criteriosDe, rotuloCriterio, media, urlPublicaParticipante,
} from '../painel-app/src/lib/publicacao.js'

const vigente = {
  slug: 'cafe-da-praca', nivel: 'marca_e_combo',
  casa: { nome: 'Café da Praça', apresentacao: 'Desde 2010.', instagram: '@cafedapraca' },
  unidades: [{ id: 'u1a2b3c', nome: 'Lagoa Nova', endereco: { logradouro: 'Rua A', numero: '10', bairro: 'Lagoa Nova', cidade: 'Natal', uf: 'RN' },
    combo: { modos: { local: 'sim', retirada: 'nao', delivery: 'nao' }, disponibilidade: [{ data: '2026-11-06', abre: '14:00', fecha: '20:00' }] } }],
  combo: { nome: 'Combo Toon', descricao: 'Doce e café', preco: 39.9,
    itens: [{ tipo: 'doce', posicao: 1, nome: 'Bolo', ingredientes: 'farinha, ovo',
      alimentar: [{ aspecto: 'gluten', estado: 'contem' }, { aspecto: 'leite', estado: 'nao_informado' }] }] },
}

test('estado e texto da publicação', () => {
  assert.equal(estadoPublicacao({ estado_publicacao: 'nao_publicado' }), 'nao_publicado')
  assert.equal(estadoPublicacao({ estado_publicacao: 'publicado', alterado_apos_aprovacao: true }), 'alteracao_em_analise')
  assert.equal(estadoPublicacao({ estado: 'retirado', alterado_apos_aprovacao: true }), 'retirado')
  assert.equal(textoPublicacao({ estado_publicacao: 'publicado', versao: 3, nivel: 'marca_e_combo' }), 'Publicada v3')
  assert.equal(textoPublicacao({ estado_publicacao: 'publicado', versao: 1, nivel: 'marca' }), 'Publicada v1 (só a casa)')
  assert.equal(textoPublicacao({ estado_publicacao: 'retirado', versao: 2 }), 'Retirada do site (v2)')
  assert.equal(textoPublicacao(null), 'Não publicada')
  assert.equal(urlPublicaParticipante('x-y'), 'https://www.sweetcoffeeweek.com.br/cartoon/participantes/x-y')
})

test('filtros da lista', () => {
  const l = [
    { nome_marca: 'A', combo_status: 'em_analise', estado_publicacao: 'nao_publicado' },
    { nome_marca: 'B', combo_status: 'aprovado', estado_publicacao: 'publicado', nivel: 'marca', alterado_apos_aprovacao: true },
    { nome_marca: 'C', combo_status: 'aprovado', estado_publicacao: 'publicado', nivel: 'marca_e_combo' },
    { nome_marca: 'D', combo_status: 'aprovado', estado_publicacao: 'retirado', nivel: 'marca_e_combo' },
  ]
  const nomes = (f) => filtrarPublicacoes(l, f).map((x) => x.nome_marca).join('')
  assert.equal(nomes(''), 'ABCD')
  assert.equal(nomes('em_analise'), 'A')
  assert.equal(nomes('alterado'), 'B')
  assert.equal(nomes('aprovado_sem_publicar'), 'BD')
  assert.equal(nomes('publicado'), 'BC')
  assert.equal(nomes('retirado'), 'D')
})

test('publicar o combo só com combo aprovado e sem pendências', () => {
  assert.equal(podePublicarCombo({ combo_status: 'aprovado', pendencias: [] }), true)
  assert.equal(podePublicarCombo({ combo_status: 'aprovado', pendencias: ['combo_nome'] }), false)
  assert.equal(podePublicarCombo({ combo_status: 'em_analise', pendencias: [] }), false)
})

test('pendências traduzidas com o nome da unidade e do componente', () => {
  const ctx = { unidades: [{ id_publico: 'u1a2b3c', nome: 'Lagoa Nova' }], itens: vigente.combo.itens }
  assert.equal(traduzirPendencia('combo_nome'), 'O combo ainda não tem nome.')
  assert.match(traduzirPendencia('sem_unidade'), /Nenhuma unidade/)
  assert.match(traduzirPendencia('unidade:u1a2b3c:endereco', ctx), /^Unidade Lagoa Nova: endereço incompleto/)
  assert.match(traduzirPendencia('unidade:u1a2b3c:modos', ctx), /sim ou não/)
  assert.match(traduzirPendencia('unidade:u1a2b3c:canais', ctx), /canal/)
  assert.match(traduzirPendencia('unidade:u1a2b3c:horario', ctx), /horário do combo/)
  assert.match(traduzirPendencia('unidade:uzzz:horario', ctx), /^Unidade uzzz:/)
  assert.match(traduzirPendencia('item:1:alimentar', ctx), /^Doce "Bolo": faltam respostas sobre alergênicos/)
  assert.match(traduzirPendencia('item:2:alimentar', ctx), /^Componente 2:/)
  assert.equal(traduzirPendencia('algo_novo'), 'algo novo')
})

test('campos públicos legíveis: preço, alergênicos, endereço e horário', () => {
  const c = Object.fromEntries(camposPublicos(vigente).map((x) => [x.chave, x.valor]))
  assert.match(c['combo.preco'], /39,90/)
  assert.equal(c['item.1.alimentar'], 'glúten: contém; leite: não informado')
  assert.equal(c['unidade.u1a2b3c.endereco'], 'Rua A, 10 — Lagoa Nova, Natal/RN')
  assert.equal(c['unidade.u1a2b3c.modos'], 'Consumo no local: sim · Retirada: não · Delivery: não')
  assert.match(c['unidade.u1a2b3c.disponibilidade'], /6\/11 14:00–20:00/)
  assert.deepEqual(camposPublicos(null), [])
})

test('diferença campo a campo entre a versão no ar e a atual', () => {
  assert.deepEqual(diferencas(vigente, vigente), [])
  const atual = structuredClone(vigente)
  atual.combo.nome = 'Combo Toon 2'
  atual.combo.itens[0].alimentar[1].estado = 'pode_conter'
  atual.unidades[0].combo.modos.delivery = 'sim'
  atual.unidades.push({ id: 'u9', nome: 'Ponta Negra', endereco: { logradouro: 'Av. B', bairro: 'Ponta Negra', cidade: 'Natal' } })
  delete atual.casa.instagram
  const d = diferencas(vigente, atual)
  const por = Object.fromEntries(d.map((x) => [x.chave, x]))
  assert.equal(por['combo.nome'].antes, 'Combo Toon')
  assert.equal(por['combo.nome'].depois, 'Combo Toon 2')
  assert.match(por['item.1.alimentar'].depois, /leite: pode conter/)
  assert.match(por['unidade.u1a2b3c.modos'].depois, /Delivery: sim/)
  assert.equal(por['unidade.u9.nome'].antes, '')
  assert.equal(por['unidade.u9.nome'].depois, 'Ponta Negra')
  assert.equal(por['casa.instagram'].depois, '')
  assert.ok(!por['casa.nome'], 'campo igual não aparece')
  assert.ok(!por['unidade.u9.whatsapp'], 'vazio dos dois lados não aparece')
  // Versão "só a casa" no ar: o combo inteiro aparece como novo.
  const soCasa = { ...vigente, nivel: 'marca', combo: undefined, unidades: vigente.unidades.map(({ combo, ...u }) => u) }
  assert.ok(diferencas(soCasa, vigente).some((x) => x.chave === 'combo.nome' && x.antes === ''))
})

test('coerência das chaves espelha os CHECKs de edicao_publicacao', () => {
  const base = { fase: 'em_andamento', participantes_publicos: true, combos_publicos: false, avaliacao_aberta: false,
    avaliacao_abre_em: '2026-11-05T12:00:00Z', avaliacao_fecha_em: '2026-11-15T23:00:00Z', resultados_publicos: false }
  assert.equal(problemaChaves(base), null)
  assert.match(bloqueioMudanca({ ...base, participantes_publicos: false }, { combos_publicos: true }), /participantes/)
  assert.match(bloqueioMudanca({ ...base, combos_publicos: true }, { participantes_publicos: false }), /combos/)
  assert.match(bloqueioMudanca({ ...base, fase: 'pre_lancamento' }, { avaliacao_aberta: true }), /em andamento/)
  assert.match(bloqueioMudanca({ ...base, avaliacao_fecha_em: null }, { avaliacao_aberta: true }), /Defina/)
  assert.match(bloqueioMudanca({ ...base, avaliacao_fecha_em: '2026-11-01T00:00:00Z' }, { avaliacao_aberta: true }), /depois do início/)
  assert.equal(bloqueioMudanca(base, { avaliacao_aberta: true }), null)
  assert.match(bloqueioMudanca({ ...base, avaliacao_aberta: true }, { resultados_publicos: true }), /fechada/)
  assert.match(bloqueioMudanca({ ...base, avaliacao_aberta: true }, { fase: 'encerrada' }), /em andamento/)
  assert.equal(bloqueioMudanca({ ...base, avaliacao_aberta: true }, { avaliacao_aberta: false, fase: 'encerrada' }), null)
})

test('datas da avaliação no horário de Fortaleza', () => {
  assert.equal(paraLocalFortaleza('2026-11-05T12:00:00+00:00'), '2026-11-05T09:00')
  assert.equal(paraLocalFortaleza(null), '')
  assert.equal(deLocalFortaleza('2026-11-05T09:00'), '2026-11-05T09:00:00-03:00')
  assert.equal(deLocalFortaleza(''), null)
  assert.equal(paraLocalFortaleza(deLocalFortaleza('2026-11-15T23:30')), '2026-11-15T23:30')
})

test('coordenada: números de Natal, vírgula decimal e par colado', () => {
  assert.deepEqual(lerCoordenada('-5.8123', '-35.2012'), { lat: -5.8123, lng: -35.2012 })
  assert.deepEqual(lerCoordenada('-5,8123', '-35,2012'), { lat: -5.8123, lng: -35.2012 })
  assert.deepEqual(lerCoordenada('-5.8123, -35.2012', ''), { lat: -5.8123, lng: -35.2012 })
  assert.match(lerCoordenada('-35.2012', '-5.8123').erro, /fora da região/)
  assert.match(lerCoordenada('-23.5', '-46.6').erro, /fora da região/)
  assert.match(lerCoordenada('abc', '').erro, /números/)
  assert.match(linkMapa({ logradouro: 'Rua A', numero: '10', bairro: 'Tirol', cidade: 'Natal' }), /query=Rua%20A%2C%2010%2C%20Tirol%2C%20Natal%2C%20RN$/)
  assert.match(linkMapa({ lat: -5.8, lng: -35.2 }), /query=-5\.8%2C-35\.2$/)
})

test('slug, caminho da foto e aprovação com texto alternativo', () => {
  assert.equal(validarSlug('cafe-da-praca'), null)
  assert.ok(validarSlug('Café da Praça'))
  assert.ok(validarSlug('cafe--praca'))
  assert.equal(caminhoMidia('2026.2', 'pa-1', 'abc'), '2026.2/pa-1/abc.webp')
  assert.ok(motivoNaoAprovar({ alt: '  ' }))
  assert.equal(motivoNaoAprovar({ alt: 'Bolo de chocolate com cobertura' }), null)
})

test('erros do banco em português', () => {
  assert.match(traduzirErroPublicacao('combo_nao_aprovado'), /não foi aprovado/)
  assert.match(traduzirErroPublicacao('motivo_obrigatorio'), /motivo/)
  assert.match(traduzirErroPublicacao('nada_publicado'), /não tem versão no ar/)
  assert.match(traduzirErroPublicacao('nome_sem_slug'), /endereço/)
  assert.equal(traduzirErroPublicacao('new row for relation "edicao_publicacao" violates check constraint "edicao_publicacao_check1"'), 'Combinação de chaves não permitida.')
  assert.match(traduzirErroPublicacao('bucket_invalido'), /arquivo-url/)
  assert.equal(traduzirErroPublicacao('nao_autorizado'), 'nao_autorizado', 'o genérico fica com o traduzirErro do ui.jsx')
})

test('resumo das avaliações: critérios, rótulo e média', () => {
  const l = [{ medias: { sabor: 8.5, apresentacao_visual: null } }, { medias: { sabor: 7, atendimento: 9 } }, { medias: null }]
  assert.deepEqual(criteriosDe(l), ['sabor', 'apresentacao_visual', 'atendimento'])
  assert.equal(rotuloCriterio('apresentacao_visual'), 'Apresentacao visual')
  assert.equal(media(8.5), '8,50')
  assert.equal(media(null), '—')
})
