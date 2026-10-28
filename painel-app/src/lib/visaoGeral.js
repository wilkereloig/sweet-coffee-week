/*
 * Visão geral da organização (22/10/2026) — lógica PURA, sem DOM nem rede. Testada em
 * tests/painel-app-visao-geral.test.mjs.
 *
 * A tela tem três assuntos, nesta ordem: AÇÕES DA EQUIPE (o que pede decisão ou ação agora), SITUAÇÃO DAS
 * MARCAS (a esteira) e ATIVIDADE RECENTE. Aqui moram as decisões do primeiro e o que é comum aos três:
 *
 *   · quais cartões de ação existem, quanto cada um conta e para QUAL LISTA ele leva;
 *   · a ordem por urgência;
 *   · o que a função da pessoa permite ver (cartão que exige ação sem permissão nem aparece);
 *   · o texto de "vazio" e de "não consegui ler" — leitura incompleta NUNCA diz "em dia".
 *
 * REGRA DO NÚMERO: o número de um cartão é o tamanho da lista que ele abre. Para isso cada contagem usa a MESMA
 * expressão do filtro da tela de destino (os predicados abaixo espelham, palavra por palavra, os de
 * vistas/Marcas.jsx e de lib/respostas.js — o teste confere o texto de lá). Exceção declarada: "Pedidos sem
 * resposta" soma as respostas que faltam (`soma: true`); a lista de destino mostra "N de M responderam" por
 * pedido e, quando há um pedido só, o cartão abre direto o "Quem falta" dele — que lista TODAS as marcas do
 * pedido (`get_pendentes_solicitacao`, ordenada por estado: quem falta primeiro, depois quem já respondeu).
 * Ali o N são as primeiras linhas, não o total de linhas: nenhum texto pode prometer "o mesmo número".
 */
import { participaDaEdicao } from './mesa.js'
import { combosDoCartao, cobreAsMarcas, detalheDosCombos } from './combosAnalise.js'
import { agruparTemas, diasAte, dataDoItem, textoPrazo } from './operacao.js'

// ── Leituras ────────────────────────────────────────────────────────────────

/** O nome de cada leitura extra da Mesa, como aparece em "Faltou ler …". Um lugar só: a Mesa e o texto concordam. */
export const LEITURA = Object.freeze({
  marcas: 'as marcas',
  apoiar: 'as respostas do Apoiar',
  contato: 'as mensagens do Contato',
  pedidos: 'os pedidos',
  sessoes: 'as sessões de fotos',
  conversas: 'as mensagens das marcas',
  atividade: 'a atividade recente',
  revisao: 'a revisão de dados',
  temas: 'os temas',
  edicao: 'a edição atual',
  redes: 'o planejamento do Social media', // redes_resumo, só com redes.ver
})

// Quais leituras alimentam cada bloco da tela (a falha de uma não condena os outros blocos).
const LEITURAS_DO_BLOCO = Object.freeze({
  acoes: Object.freeze([LEITURA.marcas, LEITURA.apoiar, LEITURA.contato, LEITURA.pedidos, LEITURA.sessoes, LEITURA.conversas, LEITURA.revisao, LEITURA.temas, LEITURA.edicao, LEITURA.redes]),
  marcas: Object.freeze([LEITURA.marcas, LEITURA.edicao]),
  atividade: Object.freeze([LEITURA.atividade]),
})

/** "a, b e c" */
export function porExtenso(lista) {
  const l = (lista || []).filter(Boolean)
  if (l.length <= 1) return l.join('')
  return l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]
}

/** Aviso de leitura parcial DO BLOCO, ou null quando nada que o alimenta falhou. */
export function avisoDeLeitura(falhas, bloco) {
  const quais = (falhas || []).filter((f) => (LEITURAS_DO_BLOCO[bloco] || []).includes(f))
  if (!quais.length) return null
  return 'Faltou ler ' + porExtenso(quais) + '. O que aparece aqui pode estar incompleto.'
}

// ── Predicados: o MESMO texto dos filtros das telas de destino ───────────────

// vistas/Marcas.jsx, filtro `situacao`:  aguardando_aprovacao · sem_conta · mensagens  (+ `edicao`).
// (com_conta e cadastro_completo — as barras da edição — são `resumoDaEdicao`, em lib/mesa.js.)
// Marca encerrada (desistiu) não está esperando decisão da curadoria: fica de fora, como nos outros números (Marcas.jsx igual).
export const aguardandoAprovacao = (p) => p.combo_status === 'em_analise' && participaDaEdicao(p)
export const semAcessoNaEdicao = (p) => !p.user_id && participaDaEdicao(p)
const daEdicao = (codigo) => (p) => !codigo || p.edicao_codigo === codigo
// lib/respostas.js `filtrados`: `reg.status !== status` — o status que o cartão põe no endereço é 'novo'.
export const respostaNova = (r) => r.status === 'novo'

/** Marcas (da lista de Marcas, não arquivadas) com mensagem não lida — a lista `situacao=mensagens` tem estas. */
export function marcasComMensagem(participantes = [], conversas = []) {
  const nao = new Map()
  for (const c of conversas || []) {
    const n = Number(c.nao_lidas || 0)
    if (n > 0) nao.set(c.participante_id, { n, nome: c.nome_marca })
  }
  // Sem a lista de marcas lida (a leitura caiu), vale o que as conversas dizem; a Mesa avisa que faltou ler.
  if (!(participantes || []).length) return [...nao].map(([id, v]) => ({ id, nome: v.nome, n: v.n }))
  return participantes.filter((p) => nao.has(p.id)).map((p) => ({ id: p.id, nome: p.nome_marca, n: nao.get(p.id).n }))
}

// ── Pequenos ajudantes de texto ─────────────────────────────────────────────

const plural = (n, um, varios) => (Number(n) === 1 ? um : varios)
const semNome = (s) => String(s || '').trim() || '(sem nome)'

/** "A", "A e B", "A, B e mais 3". */
export function resumoNomes(nomes, max = 2) {
  const lista = (nomes || []).map(semNome)
  if (!lista.length) return ''
  if (lista.length <= max) return porExtenso(lista)
  return lista.slice(0, max).join(', ') + ' e mais ' + (lista.length - max)
}

// ── Ordem ───────────────────────────────────────────────────────────────────

/*
 * Menor número = mais urgente. Primeiro o que tem uma pessoa esperando resposta ou trava a publicação; depois
 * a cobrança de quem não respondeu; depois a triagem; por último a organização interna. A agenda sobe sozinha
 * quando um prazo vence hoje ou amanhã e desce quando não há prazo à vista. Mudar a ordem é mexer SÓ aqui.
 */
export const URGENCIA = Object.freeze({
  agendaHoje: 5,
  mensagens: 10,
  aprovacao: 20,
  temas: 30,
  agendaPrazo: 35,
  pedidos: 40,
  candidaturas: 50,
  revisao: 60,
  respostasSite: 70,
  semAcesso: 80,
  agendaSemPrazo: 90,
})

/** Mais urgente primeiro; empate: o maior número, depois o título. Não muda a lista recebida. */
export function ordenarAcoes(cartoes) {
  return [...(cartoes || [])].sort((a, b) =>
    (a.urgencia - b.urgencia) || ((b.n || 0) - (a.n || 0)) || String(a.titulo || '').localeCompare(String(b.titulo || ''), 'pt-BR'))
}

// ── Permissão ───────────────────────────────────────────────────────────────

/** `permissao` é um código ou uma lista (qualquer uma vale). Sem exigência = todos com acesso à Visão geral. */
export function permitida(pode, permissao) {
  if (!permissao) return true
  return [].concat(permissao).some((a) => !!pode && pode(a))
}

// ── Agenda e prazos ─────────────────────────────────────────────────────────

export const JANELA_PRAZO_DIAS = 5
const ROTA_EDICAO = Object.freeze({ vista: 'edicao', aba: 'configuracao', filtros: {} })
export const ROTA_AGENDA_FOTOS = Object.freeze({ vista: 'operacao', aba: 'fotos', filtros: {} })

/*
 * Prazos do cronograma que vencem nos próximos 5 dias (mais cedo primeiro) e, depois, os avisos de agenda de
 * fotos (vagas abertas, sessões da semana — `notificacoesOrg` já os deriva). `urgente` = algum prazo vence
 * hoje ou amanhã.
 */
export function agendaDaEquipe({ cronograma = [], hoje, avisosAgenda = [], limite = 6 } = {}) {
  const prazos = (cronograma || [])
    .filter((i) => i && i.tipo === 'prazo')
    .map((i) => ({ i, dias: diasAte(dataDoItem(i), hoje) }))
    .filter(({ dias }) => dias !== null && dias >= 0 && dias <= JANELA_PRAZO_DIAS)
    .sort((a, b) => a.dias - b.dias)
  const itens = [
    ...prazos.map(({ i, dias }) => ({ chave: 'prazo:' + i.id, titulo: i.titulo, texto: textoPrazo(i, hoje), dias, rota: ROTA_EDICAO })),
    ...(avisosAgenda || []).map((a, k) => ({ chave: 'agenda:' + k, titulo: '', texto: a.texto, dias: null, rota: a.rota || ROTA_AGENDA_FOTOS })),
  ]
  const primeiro = prazos[0]
  const urgente = !!primeiro && primeiro.dias <= 1
  return {
    itens: itens.slice(0, limite),
    total: itens.length,
    mais: Math.max(0, itens.length - limite),
    prazos: prazos.length,
    urgente,
    urgenteTexto: urgente ? (primeiro.dias === 0 ? 'Vence hoje' : 'Vence amanhã') : '',
  }
}

function urgenciaDaAgenda(agenda) {
  if (agenda.urgente) return URGENCIA.agendaHoje
  return agenda.prazos > 0 ? URGENCIA.agendaPrazo : URGENCIA.agendaSemPrazo
}

// ── Os cartões de ação ──────────────────────────────────────────────────────

const rotaMarcas = (filtros) => ({ vista: 'participantes', aba: 'lista', filtros })

function cartaoMensagens({ participantes, conversas }) {
  const marcas = marcasComMensagem(participantes, conversas)
  if (!marcas.length) return null
  const total = marcas.reduce((s, m) => s + m.n, 0)
  return {
    chave: 'mensagens', n: marcas.length, itens: marcas, urgencia: URGENCIA.mensagens, permissao: 'mensagem.enviar',
    titulo: 'Mensagens das marcas', icone: 'mensagens', destino: 'marcas com mensagem',
    frase: plural(marcas.length, 'marca com mensagem não lida', 'marcas com mensagem não lida'),
    detalhe: resumoNomes(marcas.map((m) => m.nome)) + (total !== marcas.length ? ' · ' + total + ' mensagens no total' : ''),
    rota: rotaMarcas({ situacao: 'mensagens' }),
  }
}

/*
 * O que espera a curadoria é o COMBO (combo_status = 'em_analise'), não o cadastro: o cadastro já está completo.
 * Com os combos lidos (get_combos_em_analise) e cobrindo TODAS as marcas que o cartão conta, o cartão diz qual combo,
 * de quem, com que tema e desde quando, e abre a folha onde se aprova (`abrir: 'aprovacao'`). Sem eles (leitura que
 * caiu ou ainda não chegou), volta ao texto simples e à lista de marcas — nunca uma meia lista.
 */
function cartaoAprovacao({ participantes, edicaoCodigo, combos }) {
  if (!edicaoCodigo) return null
  const marcas = (participantes || []).filter((p) => aguardandoAprovacao(p) && daEdicao(edicaoCodigo)(p))
  if (!marcas.length) return null
  const lidos = combosDoCartao(combos, marcas)
  const comCombo = cobreAsMarcas(lidos, marcas)
  return {
    chave: 'aprovacao', n: marcas.length, itens: marcas, urgencia: URGENCIA.aprovacao, permissao: 'curadoria.decidir',
    titulo: 'Combos para aprovar', icone: 'ficha', destino: 'marcas aguardando aprovação',
    frase: plural(marcas.length, 'combo esperando a sua decisão', 'combos esperando a sua decisão'),
    detalhe: comCombo ? detalheDosCombos(lidos) : resumoNomes(marcas.map((p) => p.nome_marca)),
    rota: rotaMarcas({ edicao: edicaoCodigo, situacao: 'aguardando_aprovacao' }),
    ...(comCombo ? { abrir: 'aprovacao', combos: lidos } : {}),
  }
}

function cartaoTemas(temas) {
  const propostos = (temas || []).filter((t) => t.status === 'proposto')
  if (!propostos.length) return null
  const conflitos = agruparTemas(temas).filter((g) => g.conflito && !g.aprovado).length
  return {
    chave: 'temas', n: propostos.length, itens: propostos, urgencia: URGENCIA.temas, permissao: 'curadoria.decidir',
    titulo: 'Temas para decidir', icone: 'tema', destino: 'temas',
    frase: plural(propostos.length, 'proposta de tema esperando decisão', 'propostas de tema esperando decisão'),
    detalhe: conflitos ? conflitos + ' ' + plural(conflitos, 'tema pedido', 'temas pedidos') + ' por mais de uma marca' : '',
    rota: { vista: 'participantes', aba: 'temas', filtros: {} },
  }
}

// `pedidos` chega JÁ filtrado: publicados e não arquivados (a Mesa faz o filtro; a tela de pedidos não mostra o resto).
function cartaoPedidos(pedidos) {
  const comFalta = (pedidos || []).filter((s) => Number(s.pendentes || 0) > 0)
  const n = comFalta.reduce((s, x) => s + Number(x.pendentes), 0)
  if (!n) return null
  const unico = comFalta.length === 1 ? comFalta[0] : null
  return {
    chave: 'pedidos', n, itens: comFalta, soma: true, urgencia: URGENCIA.pedidos, permissao: 'producao.gerir',
    titulo: 'Pedidos sem resposta', icone: 'pedido', destino: unico ? '“Quem falta” do pedido' : 'pedidos',
    frase: plural(n, 'resposta de pedido faltando', 'respostas de pedidos faltando'),
    detalhe: unico ? '“' + semNome(unico.titulo) + '”' : 'em ' + comFalta.length + ' pedidos',
    rota: { vista: 'operacao', aba: 'pedidos', filtros: unico ? { item: unico.id } : {} },
  }
}

function cartaoCandidaturas(candidaturas) {
  const novas = (candidaturas || []).filter(respostaNova)
  if (!novas.length) return null
  return {
    chave: 'candidaturas', n: novas.length, itens: novas, urgencia: URGENCIA.candidaturas, permissao: 'triagem.editar',
    titulo: 'Candidaturas novas', icone: 'pessoas', destino: 'candidaturas novas',
    frase: plural(novas.length, 'candidatura do Quero participar sem triagem', 'candidaturas do Quero participar sem triagem'),
    detalhe: resumoNomes(novas.map((r) => r.empresa || r.nome)),
    rota: { vista: 'participantes', aba: 'candidaturas', filtros: { status: 'novo' } },
  }
}

function cartaoRevisao(revisao) {
  const abertas = revisao || []
  if (!abertas.length) return null
  return {
    chave: 'revisao', n: abertas.length, itens: abertas, urgencia: URGENCIA.revisao, permissao: 'curadoria.decidir',
    titulo: 'Dados para revisar', icone: 'atencao', destino: 'revisão de dados',
    frase: plural(abertas.length, 'ponto apontado pelo sistema esperando decisão', 'pontos apontados pelo sistema esperando decisão'),
    detalhe: '',
    rota: { vista: 'admin', aba: 'revisao', filtros: {} },
  }
}

function cartaoRespostasSite({ apoiar = [], contato = [] }) {
  const doApoiar = (apoiar || []).filter(respostaNova)
  const doContato = (contato || []).filter(respostaNova)
  const n = doApoiar.length + doContato.length
  if (!n) return null
  return {
    chave: 'respostasSite', n, itens: [...doApoiar, ...doContato], urgencia: URGENCIA.respostasSite, permissao: 'triagem.editar',
    titulo: 'Respostas do site', icone: 'email', destino: 'recebidos do site',
    frase: plural(n, 'resposta do Apoiar ou do Contato sem triagem', 'respostas do Apoiar e do Contato sem triagem'),
    detalhe: [doApoiar.length ? doApoiar.length + ' do Apoiar' : '', doContato.length ? doContato.length + ' do Contato' : ''].filter(Boolean).join(' · '),
    rota: { vista: 'contatos', aba: 'recebidos', filtros: { status: 'novo' } },
  }
}

function cartaoSemAcesso({ participantes, edicaoCodigo }) {
  if (!edicaoCodigo) return null
  const marcas = (participantes || []).filter((p) => semAcessoNaEdicao(p) && daEdicao(edicaoCodigo)(p))
  if (!marcas.length) return null
  return {
    chave: 'semAcesso', n: marcas.length, itens: marcas, urgencia: URGENCIA.semAcesso, permissao: 'marca.liberar',
    titulo: 'Marcas sem acesso ao painel', icone: 'chave', destino: 'marcas sem acesso',
    frase: plural(marcas.length, 'marca da edição ainda sem acesso', 'marcas da edição ainda sem acesso'),
    detalhe: resumoNomes(marcas.map((p) => p.nome_marca)),
    rota: rotaMarcas({ edicao: edicaoCodigo, situacao: 'sem_conta' }),
  }
}

/**
 * Os cartões da área "Ações da equipe", já na ordem de urgência.
 *   · cada cartão de CONTAGEM (`tipo: 'contagem'`) só existe se conta algo e se a função da pessoa pode agir nele;
 *   · `ocultas` = quantos cartões abertos ficaram de fora por falta de permissão (só para o texto de vazio);
 *   · a AGENDA (`tipo: 'agenda'`) está sempre aí, na posição que a urgência dela pede.
 * `pedidos` = só os publicados e não arquivados.
 */
export function acoesDaEquipe({
  candidaturas = [], participantes = [], conversas = [], revisao = [], pedidos = [], temas = [], combos = [],
  respostasSite = {}, edicaoCodigo, agenda, pode = () => false,
} = {}) {
  const todos = [
    cartaoMensagens({ participantes, conversas }),
    cartaoAprovacao({ participantes, edicaoCodigo, combos }),
    cartaoTemas(temas),
    cartaoPedidos(pedidos),
    cartaoCandidaturas(candidaturas),
    cartaoRevisao(revisao),
    cartaoRespostasSite(respostasSite),
    cartaoSemAcesso({ participantes, edicaoCodigo }),
  ].filter(Boolean).map((c) => ({ tipo: 'contagem', ...c }))
  const visiveis = todos.filter((c) => permitida(pode, c.permissao))
  const a = agenda || { itens: [], total: 0, mais: 0, prazos: 0, urgente: false, urgenteTexto: '' }
  return {
    cartoes: ordenarAcoes([...visiveis, { tipo: 'agenda', chave: 'agenda', urgencia: urgenciaDaAgenda(a), agenda: a }]),
    ocultas: todos.length - visiveis.length,
  }
}

// ── Vazio e erro ────────────────────────────────────────────────────────────

/**
 * O que dizer na área de ações. NUNCA "em dia" antes de ler tudo nem com leitura caída:
 *   tem cartão → 'abertas' · não leu ainda → 'conferindo' · alguma leitura falhou → 'incompleta' ·
 *   o Social media tem algo para este perfil (`redes` = R.totalAlertas: atrasadas, ajuste, aprovação ou a
 *   publicar) → 'redes' (sem texto: o resumo do Social media, logo abaixo, mostra os números — "nada
 *   precisa" ao lado de "2 atrasadas" seria falso; e vem antes de 'outras-funcoes', que também seria) ·
 *   há pendência, mas de outra função → 'outras-funcoes' · prazo vencendo hoje/amanhã → 'agenda-urgente'
 *   (sem texto: o cartão da agenda, no topo, já diz o que fazer; "nada precisa" ao lado dele seria falso) ·
 *   leu tudo e não há nada → 'vazio'. A agenda e o Social media não são cartões de contagem, por isso entram aqui à parte.
 */
export function estadoDasAcoes({ lidas = false, falhas = [], contagens = 0, ocultas = 0, agendaUrgente = false, redes = 0 } = {}) {
  if (contagens > 0) return { tipo: 'abertas', texto: '' }
  if (!lidas) return { tipo: 'conferindo', texto: 'Conferindo o que está pendente…' }
  if ((falhas || []).length) return { tipo: 'incompleta', texto: 'Não consegui ler tudo, então não dá para dizer que está em dia.' }
  if (redes > 0) return { tipo: 'redes', texto: '' }
  if (ocultas > 0) return { tipo: 'outras-funcoes', texto: 'Nada que a sua função possa resolver agora.' }
  if (agendaUrgente) return { tipo: 'agenda-urgente', texto: '' }
  return { tipo: 'vazio', texto: 'Nada precisa da equipe agora.' }
}

/**
 * O que a caixa "A edição" (Situação das marcas) pode afirmar. Leitura que NUNCA deu certo não vira "nenhuma
 * edição aberta" nem "0 marcas": `edicaoLida` / `marcasLidas` = a leitura funcionou ao menos uma vez (releitura
 * que falha mantém o que já estava na tela, e o aviso do bloco diz que faltou ler).
 *   ainda lendo → 'conferindo' · edição nunca lida → 'edicao-nao-lida' · lida e sem edição atual → 'sem-edicao' ·
 *   marcas nunca lidas → 'marcas-nao-lidas' · senão 'ok' (sem texto: a caixa mostra os números).
 */
export function estadoDaEdicao({ codigo, lidas = false, edicaoLida = false, marcasLidas = false } = {}) {
  if (!lidas) return { tipo: 'conferindo', texto: 'Conferindo a edição…' }
  if (!edicaoLida) return { tipo: 'edicao-nao-lida', texto: 'Não consegui ler a edição atual agora, então não dá para dizer qual está aberta.' }
  if (!codigo) return { tipo: 'sem-edicao', texto: 'Nenhuma edição está aberta agora. A edição atual se define em Edição › Configuração.' }
  if (!marcasLidas) return { tipo: 'marcas-nao-lidas', texto: 'Não consegui ler as marcas agora, então não dá para dizer quantas participam.' }
  return { tipo: 'ok', texto: '' }
}
