// Ficha geral do participante (15/10/2026) — composição pura da "Visão do
// participante" (painel-app/src/lib/fichaGeral.js) e invariantes da tela.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
const LINHAS_UNIDADES = [
  { id: 'pu1', unidade_id: 'u1', id_publico: 'a1', participa: true, consumo_local: 'sim', retirada: 'sim', delivery_combo: 'sim',
    canais_delivery: [{ tipo: 'aplicativo', link: 'https://ifood.com.br/x' }], delivery_taxa: 'R$ 5', delivery_regioes: 'Zona Sul', observacao_combo: '', endereco: 'Rua A', bairro: 'Tirol', horarios: '10h às 22h' },
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
      horario_loja: 'seg a sáb, 8h–20h', whatsapp: '84999990000',
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
  const u = unidadesDaFicha(LINHAS_UNIDADES, PUB)
  assert.equal(u.length, 2)
  const [tirol, centro] = u
  assert.equal(tirol.participa, true)
  assert.match(tirol.enderecoTexto, /Rua A, 10 — Tirol, Natal\/RN/)
  assert.equal(tirol.endereco.referencia, 'ao lado da praça')
  assert.equal(tirol.horarioLoja, 'seg a sáb, 8h–20h')
  assert.equal(tirol.horarioCombo.length, 1) // dois dias iguais viram uma faixa
  assert.deepEqual(tirol.modos, { local: 'sim', retirada: 'sim', delivery: 'sim' })
  assert.equal(tirol.canais[0].rotulo, 'Aplicativo de entrega')
  assert.equal(tirol.coordenada.estado, 'conferida')
  assert.match(tirol.mapa, /query=-5\.8%2C-35\.2/)
  assert.match(tirol.trajeto, /dir\/\?api=1&destination=/)
  assert.equal(tirol.anterior.horarios, '10h às 22h')
  assert.equal(centro.participa, false)
  assert.equal(centro.horarioCombo, null) // não se aplica
  assert.equal(centro.coordenada.estado, 'sem')
  assert.match(centro.mapa, /Rua%20B/) // endereço com rua e bairro abre o mapa
})

test('unidade sem rua não ganha link de mapa; sem get_publicacao cai no cadastro anterior', () => {
  const u = unidadesDaFicha([{ id: 'x', participa: true, endereco: '', bairro: 'Tirol' }], null)
  assert.equal(u[0].mapa, '')
  assert.equal(u[0].origemCompleta, false)
  assert.equal(u[0].horarioCombo, null)
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
