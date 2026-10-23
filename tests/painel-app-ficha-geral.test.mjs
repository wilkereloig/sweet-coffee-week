// Ficha geral do participante (15/10/2026) — composição pura da "Visão do
// participante" (painel-app/src/lib/fichaGeral.js) e invariantes da tela.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import { carregar, html } from './_renderizar.mjs'
import { datasDoFestival } from '../painel-app/src/lib/horarioFestival.js'
import {
  FONTES_FICHA, criarCarregadorFicha, lerResposta, lerFalha, situacaoTema, textoCusto, textoAcrescimo,
  alimentarDoItem, componentesDaFicha, unidadesDaFicha, fotosDaFicha, fotosIniciais, fotosPublicadas,
  resumoPublicacao, pendenciasDaFicha, acoesDaSecao, processosDaFicha, edicaoDaFicha,
} from '../painel-app/src/lib/fichaGeral.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const espera = () => new Promise((r) => setTimeout(r, 0))
function adiado() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }

/* ── Exemplo: uma participação Cartoon com duas unidades (uma fora) ───────── */
const ITENS = [
  { id: 'i3', posicao: 3, tipo: 'bebida', nome: 'Café gelado', descricao: 'Café coado frio', ingredientes: 'café, gelo' },
  { id: 'i1', posicao: 1, tipo: 'doce', nome: 'Brigadeiro', descricao: 'Brigadeiro de pote', ingredientes: 'leite condensado, cacau', vegano: true },
  { id: 'i2', posicao: 2, tipo: 'doce', nome: 'Bolo', descricao: 'Bolo de rolo', ingredientes: 'trigo, ovos, goiabada', tem_substituicao: true, substituicao: 'sem goiabada' },
]
// Os dias do festival vêm do cadastro da edição (get_edicoes); aqui, os da Cartoon 2026.2 como dado de teste.
const FESTIVAL = datasDoFestival('2026-11-05', '2026-11-15')
const TODOS_OS_DIAS = FESTIVAL.map((data) => ({ data, abre: '10:00', fecha: '22:00' }))
const LINHAS_UNIDADES = [
  { id: 'pu1', unidade_id: 'u1', id_publico: 'a1', participa: true, consumo_local: 'sim', retirada: 'sim', delivery_combo: 'sim',
    canais_delivery: [{ tipo: 'aplicativo', link: 'https://ifood.com.br/x' }], delivery_taxa: 'R$ 5', delivery_regioes: 'Zona Sul', observacao_combo: '', endereco: 'Rua A', bairro: 'Tirol', horarios: '10h às 22h', horario_festival: TODOS_OS_DIAS },
  { id: 'pu2', unidade_id: 'u2', id_publico: 'a2', participa: false, consumo_local: 'nao_informado', retirada: 'nao_informado', delivery_combo: 'nao_informado', canais_delivery: [] },
]
const PUB = {
  estado: 'publicado', combo_status: 'aprovado', alterado_apos_aprovacao: true, slug: 'cafe-da-praca',
  pendencias: [],
  vigente: { versao: 2, nivel: 'marca_e_combo', publicado_em: '2026-10-10T12:00:00Z', publicado_por: 'Dani',
    conteudo: { casa: { nome: 'Café da Praça' }, combo: { nome: 'Combo Antigo', fotos: { principal: { path: 'ed/p/foto-no-ar.webp' } }, itens: [] }, unidades: [] } },
  ultima: { versao: 2 },
  atual: {
    casa: { nome: 'Café da Praça' },
    combo: { nome: 'Combo Novo', preco: 39.9, itens: [
      { posicao: 1, tipo: 'doce', alimentar: [{ aspecto: 'leite', estado: 'contem' }, { aspecto: 'gluten', estado: 'nao_contem' }, { aspecto: 'lactose', estado: 'nao' }],
        substituicoes: [{ original: 'Leite', alternativa: 'Leite vegetal', disponibilidade: 'sob_consulta', acrescimo: 0, modalidades: ['retirada'], unidades: ['a1'] },
          { original: 'Cacau', alternativa: 'Alfarroba', disponibilidade: 'limitada' }] },
      { posicao: 2, tipo: 'doce', alimentar: [] },
    ] },
    unidades: [{ id: 'a1', nome: 'Loja Tirol', endereco: { logradouro: 'Rua A', numero: '10', bairro: 'Tirol', cidade: 'Natal', uf: 'RN', referencia: 'ao lado da praça' },
      whatsapp: '84999990000',
      combo: { modos: { local: 'sim', retirada: 'sim', delivery: 'sim' }, disponibilidade: [
        { data: '2026-11-05', abre: '10:00', fecha: '18:00' }, { data: '2026-11-06', abre: '10:00', fecha: '18:00' }] } }],
  },
  midias: [
    { id: 'm3', papel: 'combo_galeria', estado: 'aprovada', path: 'ed/p/galeria.webp', ordem: 1 },
    { id: 'm1', papel: 'combo_principal', estado: 'aprovada', path: 'ed/p/foto-no-ar.webp', ordem: 1, alt: 'Combo na mesa' },
    { id: 'm2', papel: 'item', item_id: 'i1', estado: 'enviada', path: 'ed/p/loja.webp', ordem: 1 },
    { id: 'm4', papel: 'loja', participacao_unidade_id: 'pu1', estado: 'recusada', path: 'ed/p/x.webp', ordem: 1 },
  ],
  unidades: [
    { participacao_unidade_id: 'pu1', unidade_id: 'u1', id_publico: 'a1', participa: true, nome: 'Loja Tirol', logradouro: 'Rua A', numero: '10', bairro: 'Tirol', cidade: 'Natal', lat: -5.8, lng: -35.2, coordenada_verificada_em: '2026-10-11T10:00:00Z', coordenada_verificada_por: 'Cesar' },
    { participacao_unidade_id: 'pu2', unidade_id: 'u2', id_publico: 'a2', participa: false, nome: 'Loja Centro', logradouro: 'Rua B', bairro: 'Centro', cidade: 'Natal', lat: null, lng: null },
  ],
}

/* ── Leituras: só GET, com descarte de resposta velha ─────────────────────── */
test('a visão geral só LÊ: quatro fontes, todas get_*', () => {
  const nomes = Object.values(FONTES_FICHA).map((f) => f.rpc)
  assert.deepEqual(nomes.sort(), ['get_correcoes', 'get_edicoes', 'get_ficha_360', 'get_publicacao'])
  // get_ficha_360 já contém get_ficha_participacao: os dois juntos duplicariam a leitura.
  assert.ok(!nomes.includes('get_ficha_participacao'))
  // A visão não chama RPC por nome próprio (só pelas fontes) e não grava nada ao abrir.
  const visao = ler('painel-app/src/components/vistas/FichaVisao.jsx')
  for (const m of visao.matchAll(/rpc\('([a-z_]+)'/g)) assert.match(m[1], /^get_/, 'escrita na visão: ' + m[1])
  // A conversa (que marca como lida) só monta na vista Comunicação.
  const casco = ler('painel-app/src/components/vistas/FichaMarcaPagina.jsx')
  assert.match(casco, /vista === 'comunicacao' && \([\s\S]{0,120}<AbaMensagens/)
  assert.doesNotMatch(casco, /AbaResumo/)
})

test('trocar de participante descarta as respostas que ainda estavam em voo', async () => {
  const pend = {}
  const chamadas = []
  const chamar = (rpc, args) => { chamadas.push([rpc, args.p_participacao]); const d = adiado(); pend[rpc + ':' + (args.p_participacao || '-')] = d; return d.promise }
  const estados = []
  const carregar = criarCarregadorFicha(chamar, (fonte, s, id) => estados.push({ fonte, id, ...s }))
  carregar('A')
  await espera()
  carregar('B')
  await espera()
  pend['get_ficha_360:A'].resolve({ marca: { nome_marca: 'Marca A' } }) // chega DEPOIS da troca
  pend['get_ficha_360:B'].resolve({ marca: { nome_marca: 'Marca B' } })
  await espera()
  const ok = estados.filter((e) => e.estado === 'ok' && e.fonte === 'nucleo')
  assert.equal(ok.length, 1)
  assert.equal(ok[0].id, 'B')
  assert.equal(ok[0].dados.marca.nome_marca, 'Marca B')
  assert.ok(chamadas.every(([r]) => /^get_/.test(r)))
})

test('recarregar depois de salvar mantém o conteúdo até a resposta nova', async () => {
  const estados = []
  const carregar = criarCarregadorFicha(async () => ({ v: 1 }), (fonte, s) => estados.push({ fonte, ...s }))
  carregar('A'); await espera(); await espera()
  estados.length = 0
  carregar('A', { manter: true }); await espera(); await espera()
  assert.ok(!estados.some((e) => e.estado === 'carregando'), 'recarga não volta ao esqueleto')
  assert.ok(estados.some((e) => e.estado === 'ok'))
})

test('estados de fonte: sem permissão, erro e sem participação são coisas diferentes', async () => {
  assert.equal(lerResposta(null).estado, 'sem_permissao')
  assert.equal(lerResposta({}).estado, 'ok')
  assert.equal(lerFalha(new Error('nao_autorizado')).estado, 'sem_permissao')
  const e = lerFalha(new Error('Failed to fetch'))
  assert.equal(e.estado, 'erro'); assert.match(e.erro, /fetch/)
  const estados = []
  criarCarregadorFicha(async () => [], (f, s) => estados.push([f, s.estado]))(null)
  await espera(); await espera()
  const porFonte = Object.fromEntries(estados.filter(([, s]) => s !== 'carregando'))
  assert.equal(porFonte.nucleo, 'sem_participacao')
  assert.equal(porFonte.publicacao, 'sem_participacao')
  assert.equal(porFonte.edicoes, 'ok') // a edição é global
})

/* ── Tema: duas fontes, duas etapas ───────────────────────────────────────── */
test('tema da marca: proposta, aprovação, divergência e ausência', () => {
  assert.equal(situacaoTema({}, []).estado, 'sem_tema')
  assert.equal(situacaoTema({ tema_combo: 'Pica-Pau' }, []).estado, 'sem_analise')
  const prop = [{ tema: 'Pica-Pau', status: 'proposto', justificativa: 'cor' }]
  assert.equal(situacaoTema({ tema_combo: 'pica pau' }, prop).estado, 'proposto') // grafia não conta
  assert.equal(situacaoTema({ tema_combo: 'Pica-Pau' }, [{ tema: 'Pica-Pau', status: 'aprovado' }]).estado, 'aprovado')
  // Substituída não conta; a mais nova ativa decide.
  assert.equal(situacaoTema({ tema_combo: 'Tom' }, [{ tema: 'Tom', status: 'recusado' }, { tema: 'Jerry', status: 'substituido' }]).estado, 'recusado')
  const d = situacaoTema({ tema_combo: 'Scooby-Doo' }, [{ tema: 'Pica-Pau', status: 'aprovado' }])
  assert.equal(d.estado, 'divergente'); assert.equal(d.tema, 'Scooby-Doo'); assert.equal(d.temaProposta, 'Pica-Pau')
  assert.equal(situacaoTema({}, prop).tema, 'Pica-Pau')
})

test('tema GERAL vem da edição, não do tema da marca; edição antiga é sinalizada', () => {
  const eds = [{ codigo: '2026.2', nome: '17ª edição', tema: 'Cartoon', atual: true }, { codigo: '2026.1', nome: '16ª', tema: 'Lovers', atual: false }]
  assert.deepEqual(edicaoDaFicha('2026.2', eds).temaGeral, 'Cartoon')
  assert.equal(edicaoDaFicha('2026.1', eds).atual, false)
  assert.equal(edicaoDaFicha(null, eds), null)
})

/* ── Dinheiro: zero ≠ não informado ───────────────────────────────────────── */
test('custo e acréscimo: zero é "sem custo", vazio é "não informado"', () => {
  assert.equal(textoCusto(null), 'Não informado')
  assert.equal(textoCusto(''), 'Não informado')
  assert.match(textoCusto(0), /Sem custo/)
  assert.match(textoCusto('3.5'), /3,50/)
  assert.equal(textoAcrescimo(undefined), 'Acréscimo não informado')
  assert.equal(textoAcrescimo(0), 'Sem acréscimo')
  assert.match(textoAcrescimo(2), /^\+ R\$/)
})

/* ── Componentes e informações alimentares ────────────────────────────────── */
test('componentes na ordem real, com a classificação gravada (item 2 pode ser doce)', () => {
  const c = componentesDaFicha(ITENS, PUB.atual.combo.itens)
  assert.deepEqual(c.map((x) => x.posicao), [1, 2, 3])
  assert.equal(c[1].tipo, 'doce')
  assert.equal(c[1].rotuloTipo, 'Doce')
})

test('alimentar: sem resposta ≠ não contém; leite ≠ lactose; legado não vira declaração', () => {
  const [doce, bolo, bebida] = componentesDaFicha(ITENS, PUB.atual.combo.itens)
  const leite = doce.alimentar.alergenicos.find((x) => x.aspecto === 'leite')
  const ovo = doce.alimentar.alergenicos.find((x) => x.aspecto === 'ovo')
  const lactose = doce.alimentar.caracteristicas.find((x) => x.aspecto === 'lactose')
  assert.equal(leite.estado, 'contem')
  assert.equal(ovo.estado, null); assert.equal(ovo.texto, 'Sem resposta')
  assert.equal(lactose.estado, 'nao') // característica separada do alergênico
  assert.equal(doce.alimentar.respondidos, 2)
  assert.equal(bolo.alimentar.respondidos, 0)
  // Componente sem linha na camada pública: tudo "Sem resposta", nunca "não contém".
  assert.ok(bebida.alimentar.alergenicos.every((x) => x.estado === null))
  // Selo vegano antigo fica como registro antigo, não como declaração.
  assert.deepEqual(doce.legado.selos, ['vegano'])
  assert.ok(!doce.alimentar.caracteristicas.find((x) => x.aspecto === 'vegano').estado)
  assert.equal(bolo.legado.substituicao, 'sem goiabada')
  // "não sei" gravado é diferente de "sem resposta".
  const ns = alimentarDoItem([{ aspecto: 'soja', estado: 'nao_informado' }])
  assert.equal(ns.alergenicos.find((x) => x.aspecto === 'soja').texto, 'A marca não soube informar')
  assert.equal(ns.respondidos, 1)
})

test('camada Cartoon não lida: alimentar e trocas ficam null (erro, não vazio)', () => {
  const c = componentesDaFicha(ITENS, null)
  assert.equal(c[0].alimentar, null)
  assert.equal(c[0].trocas, null)
})

test('trocas: acréscimo zero, ausente, modalidades e unidades', () => {
  const [doce] = componentesDaFicha(ITENS, PUB.atual.combo.itens, (id) => (id === 'a1' ? 'Loja Tirol' : id))
  const [leite, cacau] = doce.trocas
  assert.equal(leite.acrescimo, 'Sem acréscimo')
  assert.equal(leite.modalidades, 'retirada')
  assert.equal(leite.unidades, 'Loja Tirol')
  assert.equal(cacau.acrescimo, 'Acréscimo não informado')
  assert.equal(cacau.unidades, 'todas as unidades')
  assert.equal(cacau.disponibilidade, 'Limitada (até acabar)')
})

/* ── Unidades ─────────────────────────────────────────────────────────────── */
test('várias unidades: todas aparecem, inclusive a que não participa, cada dado da sua origem', () => {
  const u = unidadesDaFicha(LINHAS_UNIDADES, PUB, FESTIVAL)
  assert.equal(u.length, 2)
  const [tirol, centro] = u
  assert.equal(tirol.participa, true)
  assert.match(tirol.enderecoTexto, /Rua A, 10 — Tirol, Natal\/RN/)
  assert.equal(tirol.endereco.referencia, 'ao lado da praça')
  // Uma pergunta só (23/10/2026): como a unidade funciona nos dias do festival. Nada de horário da loja × do combo.
  assert.equal(tirol.horarioFestival, 'Todos os dias, das 10h às 22h')
  assert.ok(!('horarioLoja' in tirol) && !('horarioCombo' in tirol))
  assert.deepEqual(tirol.modos, { local: 'sim', retirada: 'sim', delivery: 'sim' })
  assert.equal(tirol.canais[0].rotulo, 'Aplicativo de entrega')
  assert.equal(tirol.coordenada.estado, 'conferida')
  assert.match(tirol.mapa, /query=-5\.8%2C-35\.2/)
  assert.match(tirol.trajeto, /dir\/\?api=1&destination=/)
  assert.equal(tirol.anterior.horarios, '', 'com horário gravado, o texto antigo não aparece mais')
  assert.equal(centro.participa, false)
  assert.equal(centro.horarioFestival, null) // não participa e a leitura não trouxe: não se aplica
  assert.equal(centro.coordenada.estado, 'sem')
  assert.match(centro.mapa, /Rua%20B/) // endereço com rua e bairro abre o mapa
})

test('unidade sem rua não ganha link de mapa; sem get_publicacao cai no cadastro anterior', () => {
  const u = unidadesDaFicha([{ id: 'x', participa: true, endereco: '', bairro: 'Tirol' }], null)
  assert.equal(u[0].mapa, '')
  assert.equal(u[0].origemCompleta, false)
  assert.equal(u[0].horarioFestival, null, 'nenhuma fonte trouxe o horário: não é "não respondido"')
})

/* ── Fotos ────────────────────────────────────────────────────────────────── */
test('fotos: recebida, aprovada e publicada são situações distintas; papel é o gravado', () => {
  const comps = componentesDaFicha(ITENS, null)
  const unis = unidadesDaFicha(LINHAS_UNIDADES, PUB)
  const f = fotosDaFicha(PUB.midias, PUB, comps, unis)
  assert.deepEqual(f.map((x) => x.papel), ['combo_principal', 'item', 'loja', 'combo_galeria'])
  const [principal, item, loja, galeria] = f
  assert.equal(principal.publicada, true); assert.equal(principal.situacao, 'No ar'); assert.ok(principal.principal)
  assert.equal(galeria.publicada, false); assert.equal(galeria.situacao, 'Aprovada, ainda não publicada')
  assert.equal(item.situacao, 'Recebida, aguardando revisão')
  // O arquivo se chama "loja.webp", mas o papel gravado é "item": nada é deduzido do nome.
  assert.equal(item.papel, 'item'); assert.equal(item.itemId, 'i1'); assert.match(item.alvo, /Brigadeiro/)
  assert.equal(loja.situacao, 'Recusada'); assert.equal(loja.alvo, 'Loja Tirol')
  assert.equal(fotosIniciais(f), 4)
  assert.equal(fotosIniciais(Array.from({ length: 20 }, () => ({ papel: 'combo_galeria' }))), 6)
  assert.equal(fotosPublicadas(null).size, 0)
})

/* ── Publicação ───────────────────────────────────────────────────────────── */
test('versão publicada diferente do cadastro atual: conta a diferença e o link é o do ar', () => {
  const r = resumoPublicacao(PUB)
  assert.equal(r.estado, 'alteracao_em_analise')
  assert.equal(r.versao, 2)
  assert.ok(r.diferencas > 0)
  assert.equal(r.link, 'https://www.sweetcoffeeweek.com.br/cartoon/participantes/cafe-da-praca')
  assert.equal(r.reservado, '')
  const nunca = resumoPublicacao({ estado: 'nao_publicado', slug: 'x', pendencias: ['combo_nome'], atual: {} })
  assert.equal(nunca.link, '') // sem versão no ar não há link público
  assert.match(nunca.reservado, /\/x$/)
  assert.equal(nunca.diferencas, null)
  assert.equal(nunca.pendencias, 1)
})

/* ── Pendências ───────────────────────────────────────────────────────────── */
const ok = (dados) => ({ estado: 'ok', dados, erro: null })
const NUCLEO = {
  marca: { nome_marca: 'Café da Praça', responsavel: 'Ana', telefone: '84999990000' },
  participacao: { id: 'pa1', tema_combo: 'Pica-Pau', tema_justificativa: 'x', combo_status: 'em_analise', logo_id: 'l1' },
  itens: ITENS, unidades: [],
  temas: [{ tema: 'Pica-Pau', status: 'proposto' }],
  solicitacoes: [{ id: 's1', titulo: 'Mandar foto', estado: 'pendente' }, { id: 's2', titulo: 'Ok', estado: 'respondido' }],
  pendencias: [],
}
const P = { id: 'p1', participacao_id: 'pa1', status_cadastro: 'em_preenchimento', combo_status: 'em_analise' }

test('pendências: concretas, com seção, e a mesma falta conta uma vez', () => {
  const fontes = {
    nucleo: ok(NUCLEO),
    publicacao: ok({ ...PUB, alterado_apos_aprovacao: false, pendencias: ['sem_unidade', 'combo_nome', 'item:2:alimentar'], unidades: [], midias: [{ estado: 'enviada' }, { estado: 'enviada' }] }),
    correcoes: ok([{ id: 'c1', campo: 'tema_combo', estado: 'aberta' }, { id: 'c2', campo: 'email', estado: 'resolvida' }]),
  }
  const l = pendenciasDaFicha({ participante: P, fontes, naoLidas: 2 })
  const chaves = l.map((x) => x.chave)
  // Sem unidade: o cadastro antigo ("Endereço") e a camada Cartoon ("sem_unidade") viram UMA.
  assert.ok(chaves.includes('pub:sem_unidade'))
  assert.ok(!l.some((x) => (x.campos || []).includes('Endereço')))
  assert.equal(new Set(chaves).size, chaves.length)
  const por = Object.fromEntries(l.map((x) => [x.chave, x]))
  assert.equal(por['pub:sem_unidade'].secao, 'unidades')
  assert.equal(por['pub:combo_nome'].secao, 'combo')
  assert.equal(por['pub:item:2:alimentar'].secao, 'combo')
  assert.equal(por['pedido:s1'].secao, 'operacao')
  assert.ok(!por['pedido:s2'])
  assert.equal(por['tema:analise'].secao, 'combo')
  assert.equal(por['combo:revisao'].secao, 'operacao')
  assert.match(por['fotos:revisao'].texto, /^2 fotos/)
  assert.equal(por['correcao:c1'].secao, 'combo')
  assert.ok(!por['correcao:c2'])
  assert.equal(por.mensagens.secao, 'comunicacao')
})

test('falha parcial: fonte com erro vira "não consegui verificar", nunca "nada pendente"', () => {
  const fontes = { nucleo: ok(NUCLEO), publicacao: { estado: 'erro', dados: null, erro: 'Failed to fetch' }, correcoes: ok([]) }
  const l = pendenciasDaFicha({ participante: P, fontes })
  const erro = l.find((x) => x.chave === 'erro:publicacao')
  assert.ok(erro && erro.erro)
  // Sem a camada Cartoon, o endereço do cadastro antigo volta a ser cobrado.
  assert.ok(l.some((x) => (x.campos || []).includes('Endereço')))
  // O cadastro continua sendo lido: a pendência do tema segue lá.
  assert.ok(l.some((x) => x.chave === 'tema:analise'))
})

test('sem participação ou cadastro incompleto', () => {
  assert.deepEqual(pendenciasDaFicha({ participante: { id: 'p', participacao_id: null }, fontes: {} }), [])
  const vazio = { ...NUCLEO, marca: { nome_marca: 'X' }, participacao: { id: 'pa1' }, itens: [], temas: [], solicitacoes: [] }
  const l = pendenciasDaFicha({ participante: P, fontes: { nucleo: ok(vazio), publicacao: { estado: 'carregando' }, correcoes: ok([]) } })
  const textos = l.map((x) => x.texto).join(' | ')
  assert.match(textos, /Responsável/)
  assert.match(textos, /Tema do combo/)
  // Campos vazios viram UMA pendência por seção, com os nomes: lista curta.
  const combo = l.find((x) => x.chave === 'campos:combo')
  assert.ok(combo.campos.length >= 6) // 3 itens × 2 campos (ingredientes saíram em 19/10/2026) + tema
  assert.match(combo.texto, /^Faltam \d+ campos: .+ e mais \d+$/)
  assert.equal(l.filter((x) => x.chave.startsWith('campos:')).length, new Set(l.filter((x) => x.chave.startsWith('campos:')).map((x) => x.secao)).size)
})

/* ── Permissões e processos ───────────────────────────────────────────────── */
test('ações por função: leitura não oferece edição; cada ação abre um editor existente', () => {
  const nada = () => false
  const tudo = () => true
  assert.deepEqual(acoesDaSecao('cadastro', nada), [])
  assert.deepEqual(acoesDaSecao('combo', nada, { temaEstado: 'proposto', comboStatus: 'em_analise' }), [])
  assert.deepEqual(acoesDaSecao('fotos', nada, { temPublicacao: true }), [])
  assert.equal(acoesDaSecao('operacao', nada)[0].rotulo, 'Ver detalhes da operação')
  assert.equal(acoesDaSecao('publicacao', nada, { temPublicacao: true })[0].rotulo, 'Ver publicação e diferenças')
  const combo = acoesDaSecao('combo', tudo, { temaEstado: 'proposto', comboStatus: 'em_analise' })
  assert.deepEqual(combo.map((a) => a.editor), ['combo', 'operacao', 'operacao'])
  const so = (perm) => (x) => x === perm
  assert.deepEqual(acoesDaSecao('unidades', so('producao.gerir'), { temPublicacao: true }).map((a) => a.editor), ['coordenadas'])
  const editores = new Set(['cadastro', 'combo', 'unidades', 'coordenadas', 'fotos', 'operacao', 'publicacao'])
  for (const s of ['cadastro', 'combo', 'unidades', 'fotos', 'operacao', 'publicacao']) for (const a of acoesDaSecao(s, tudo, { temPublicacao: true, temaEstado: 'proposto', comboStatus: 'em_analise' })) assert.ok(editores.has(a.editor), a.editor)
})

test('cabeçalho: cadastro, tema, combo e site são quatro processos, não um status', () => {
  const pr = processosDaFicha(P, { nucleo: ok(NUCLEO), publicacao: ok(PUB) })
  assert.deepEqual(pr.map((x) => x.chave), ['cadastro', 'tema', 'combo', 'publicacao'])
  assert.equal(pr[1].texto, 'Proposto, aguardando análise')
  assert.match(pr[3].texto, /^Publicada v2/)
  const lendo = processosDaFicha(P, { nucleo: { estado: 'carregando' }, publicacao: { estado: 'erro' } })
  assert.equal(lendo[1].texto, 'Carregando…')
  assert.equal(lendo[3].texto, 'Não verificado')
})

/* ── Horário no festival (23/10/2026): uma pergunta só, na ficha da equipe ─────────────────────────────────────────────── */
const SEMANA_COM_DOMINGO_FECHADO = FESTIVAL.flatMap((data) => {
  const dow = new Date(data + 'T12:00:00Z').getUTCDay() // 0 = domingo · 6 = sábado
  if (dow === 0) return []
  return [dow === 6 ? { data, abre: '12:00', fecha: '20:00' } : { data, abre: '10:00', fecha: '22:00' }]
})

test('horário na ficha: a frase do que está GRAVADO; sem resposta é vazio (nunca "fechada"); o texto antigo só sobra até haver resposta', () => {
  const unico = (linha, pub = null, datas = FESTIVAL) => unidadesDaFicha([{ id: 'x', participa: true, ...linha }], pub, datas)[0]
  assert.equal(unico({ horario_festival: SEMANA_COM_DOMINGO_FECHADO }).horarioFestival,
    'Segunda a sexta, das 10h às 22h · Sábado, das 12h às 20h · Domingo, não abre')
  const sem = unico({ horario_festival: [], horarios: 'Seg a sáb 10h às 22h' })
  assert.equal(sem.horarioFestival, '', 'sem resposta não é "não abre"')
  assert.equal(sem.anterior.horarios, 'Seg a sáb 10h às 22h', 'o que a marca disse antes aparece para ela confirmar')
  assert.equal(unico({ horario_festival: TODOS_OS_DIAS, horarios: 'Seg a sáb 10h às 22h' }).anterior.horarios, '', 'com resposta, o texto antigo some')
  // Dois períodos no dia e meia-noite; os dias sem linha não abrem.
  const dois = unico({ horario_festival: [{ data: '2026-11-05', abre: '12:00', fecha: '15:00' }, { data: '2026-11-05', abre: '18:00', fecha: '24:00' }] })
  assert.match(dois.horarioFestival, /Qui 5\/11: das 12h às 15h e das 18h à meia-noite · Sex 6 a Dom 15\/11: não abre/)
})

test('sem a coluna na linha vale a versão pública; sem as datas do festival a frase lista as datas (nunca "todos os dias")', () => {
  const daPublica = unidadesDaFicha([{ id: 'pu1', participa: true }], PUB, FESTIVAL)[0]
  assert.match(daPublica.horarioFestival, /Qui 5 a Sex 6\/11: das 10h às 18h/)
  const semDatas = unidadesDaFicha(LINHAS_UNIDADES, PUB)[0]
  assert.equal(semDatas.horarioFestival, 'Qui 5 a Dom 15/11: das 10h às 22h')
  assert.ok(!/todos os dias/i.test(semDatas.horarioFestival))
})

/* ── O card da unidade na edição da ficha: o seletor da marca, com "Salvar horário" próprio ─────────────────────────── */
const { HorarioDaUnidade, Bloco, estadoDoRascunho } = carregar('painel-app/src/components/vistas/FichaCadastro.jsx')
const propsHorario = (unidade, extra = {}) => ({ unidade, rotuloUnidade: 'Unidade 1', datas: FESTIVAL, podeEditar: true, onSalvar: async () => {}, ...extra })
const desenharHorario = (unidade, extra) => html(HorarioDaUnidade, propsHorario(unidade, extra))

test('card da unidade: a frase, "Editar horário" só com cadastro.editar, e nada de horário da loja × do combo', () => {
  const unidade = { id: 'pu1', horario_festival: TODOS_OS_DIAS }
  const lido = desenharHorario(unidade)
  assert.match(lido, /<dt>Horário no festival<\/dt><dd>Todos os dias, das 10h às 22h<\/dd>/)
  assert.match(lido, /aria-label="Editar horário da unidade 1"/)
  assert.match(lido, />Editar horário<\/button>/)
  const soLeitura = desenharHorario(unidade, { podeEditar: false })
  assert.match(soLeitura, /Todos os dias, das 10h às 22h/)
  assert.ok(!/<button|<form|<select|type="radio"/.test(soLeitura), 'quem não tem cadastro.editar só lê')
  for (const h of [lido, soLeitura]) assert.ok(!/horário da loja|horário do combo/i.test(h))
})

test('card da unidade: sem resposta diz isso, oferece "Preencher horário" e mostra o texto de antes sem tratá-lo como resposta', () => {
  const h = desenharHorario({ id: 'pu1', horario_festival: [], horarios: 'Seg a sáb 10h às 22h' })
  assert.match(h, /Ainda não respondido/)
  assert.match(h, />Preencher horário<\/button>/)
  assert.match(h, /Cadastro anterior, não confirmado: Seg a sáb 10h às 22h/)
  assert.ok(!/Todos os dias/.test(h))
  const fora = desenharHorario({ id: 'pu1', participa: false, horario_festival: [] })
  assert.match(fora, /não participa desta edição/)
  assert.ok(!/<button|<form/.test(fora), 'unidade que não participa não pede horário')
})

test('card da unidade aberto: o seletor num formulário PRÓPRIO, com "Salvar horário" parado até haver mudança completa', () => {
  const h = desenharHorario({ id: 'pu1', horario_festival: TODOS_OS_DIAS }, { abertoInicial: true })
  assert.match(h, /^<form class="ui-form" data-salva-por-evento="1">/, 'o editor da ficha sabe que há digitação não salva')
  assert.match(h, /data-hf/)
  assert.match(h, /Como esta unidade funciona nos dias do festival\?/)
  assert.match(h, /id="hf-pu1"/)
  assert.match(h, /<button class="og-btn og-btn--mini" type="submit" disabled="">Salvar horário<\/button>/)
  assert.match(h, />Cancelar<\/button>/)
  // Datas que não vieram (leitura que falhou): não há seletor para preencher, e o erro diz por quê.
  const semDatas = desenharHorario({ id: 'pu1', horario_festival: [] }, { abertoInicial: true, datas: [], datasFalharam: true })
  assert.match(semDatas, /Não consegui ler as datas do festival/)
  assert.ok(!/data-hf/.test(semDatas))
})

test('no card da unidade o horário fica FORA do formulário da unidade: dois formulários irmãos, nunca aninhados', () => {
  const card = html(Bloco, {
    titulo: 'Unidade 1', campos: [{ chave: 'endereco', rotulo: 'Endereço' }], valores: { endereco: 'Rua A' }, podeEditar: true, abertoInicial: true,
    onSalvar: async () => {}, children: React.createElement(HorarioDaUnidade, propsHorario({ id: 'pu1', horario_festival: TODOS_OS_DIAS }, { abertoInicial: true })),
  })
  assert.equal((card.match(/<form/g) || []).length, 2)
  assert.ok(!/<form[^>]*>(?:(?!<\/form>)[\s\S])*<form/.test(card), 'formulário dentro de formulário')
  assert.ok(card.indexOf('data-salva-por-evento="1"', card.indexOf('</form>')) > 0, 'o do horário vem depois do da unidade')
})

test('Salvar horário: só com o horário COMPLETO e diferente do gravado; pela metade é "sujo" mas não salva', () => {
  const gravado = [{ data: '2026-11-05', abre: '10:00', fecha: '22:00' }]
  assert.deepEqual(estadoDoRascunho(null, gravado), { sujo: false, salvavel: false })
  assert.deepEqual(estadoDoRascunho({ linhas: null, completo: false }, gravado), { sujo: true, salvavel: false })
  // O banco devolve o jsonb com as chaves em outra ordem (e a hora com segundos): é o mesmo horário.
  const eco = [{ fecha: '22:00:00', abre: '10:00:00', data: '2026-11-05' }]
  assert.deepEqual(estadoDoRascunho({ linhas: gravado, completo: true }, eco), { sujo: false, salvavel: false })
  assert.deepEqual(estadoDoRascunho({ linhas: [{ ...gravado[0], fecha: '23:00' }], completo: true }, gravado), { sujo: true, salvavel: true })
  assert.deepEqual(estadoDoRascunho({ linhas: gravado, completo: true }, []), { sujo: true, salvavel: true }, 'a primeira resposta')
})

test('ficha da equipe: grava só por org_salvar_horario_unidade, com os dias da edição, e o texto livre antigo não é mais enviado', () => {
  const fonte = ler('painel-app/src/components/vistas/FichaCadastro.jsx')
  assert.match(fonte, /rpc\('org_salvar_horario_unidade', \{ p_secret: lerSenha\(\), p_participacao: pa\.id, p_unidade: u\.id, p_linhas: linhas \}\)/)
  const semComentario = (t) => t.replace(/\/\/.*$/gm, '')
  const campos = semComentario(fonte.slice(fonte.indexOf('const CAMPOS_UNIDADE'), fonte.indexOf('function unidadeParaValores')))
  assert.ok(!/horarios/.test(campos), 'o horário não é campo do formulário da unidade')
  const valores = semComentario(fonte.slice(fonte.indexOf('function valoresParaUnidade'), fonte.indexOf('export function useFichaParticipacao')))
  assert.ok(!/horarios/.test(valores), 'o PATCH da unidade não manda o texto antigo (o banco guarda o que já estava)')
  // Os dias do festival são do cadastro da edição, nunca escritos no código.
  assert.match(fonte, /import \{ useDatasDoFestival \} from '\.\.\/\.\.\/lib\/festivalReact'/)
  const hook = readFileSync(new URL('../painel-app/src/lib/festivalReact.js', import.meta.url), 'utf8')
  assert.match(hook, /rpc\('get_edicoes'/)
  assert.ok(!/2026-1[01]-\d\d/.test(fonte) && !/2026-1[01]-\d\d/.test(hook))
  // Enquanto as datas carregam, não diz "não foram definidas"; se falharem, há "Tentar de novo" (fechar e abrir não relê).
  assert.match(fonte, /datasCarregando && !datas\.length/)
  assert.match(fonte, /onTentarDatas/)
})

test('Visão do participante: UM item "Horário no festival" por unidade, com os dias da edição; e ninguém mais fala em horário da loja ou do combo', () => {
  const visao = ler('painel-app/src/components/vistas/FichaVisao.jsx')
  assert.equal((visao.match(/\['Horário no festival'/g) || []).length, 1)
  assert.match(visao, /unidadesDaFicha\([^)]*datasDoFestival\(ed\.inicio, ed\.fim\)/)
  const social = ler('painel-app/src/components/vistas/SocialParticipantes.jsx')
  assert.match(social, /Horário no festival: \{textoHorarioFestival\(u\.combo && u\.combo\.disponibilidade\) \|\| 'pendente'\}/)
  const obsoleto = /horário (da loja|do combo)|horario_loja|horario_combo|horarioLoja|horarioCombo/i
  for (const a of ['components/vistas/FichaCadastro.jsx', 'components/vistas/FichaVisao.jsx', 'components/vistas/SocialParticipantes.jsx', 'lib/fichaGeral.js', 'lib/publicacao.js']) {
    assert.ok(!obsoleto.test(ler('painel-app/src/' + a)), a)
  }
})
