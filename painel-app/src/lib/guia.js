/*
 * Guia da marca (29/09/2026, spec acessos-e-guia-da-marca) — lógica pura,
 * sem DOM, testada em tests/painel-app-guia.test.mjs.
 *
 * Uma leitura só do estado da marca responde: quanto do cadastro está pronto,
 * o que falta, o que a organização pediu, qual é a próxima ação e quantas
 * pendências há em cada aba. A casca usa para os números das abas; o Início,
 * para tudo.
 */
import { TIPOS, unidadeTemEndereco, itensEmOrdem, custosFaltando, custosDeLinhas } from './cadastro.js'
import { interpretarLink } from './central.js'

// Meu cadastro = A marca (0) + Onde encontrar (4); Meu combo = tema, itens, preço.
export function vistaDoBloco(bloco) {
  return Number(bloco) === 0 || Number(bloco) === 4 ? 'cadastro' : 'combo'
}

export function linkDoCampo(bloco, campo) {
  return vistaDoBloco(bloco) + '/' + bloco + (campo ? '/' + campo : '')
}

// Bloco do formulário a partir do id do campo (`campo-<id>` em Cadastro.jsx).
export function blocoDoCampo(campo) {
  const c = String(campo || '')
  if (/^(nome_marca|responsavel|telefone|email|instagram|site|cnpj|razao_social|logo)$/.test(c)) return 0
  if (/^tema_/.test(c)) return 1
  if (/^item-/.test(c)) return 2
  if (/^(combo_|custo_)/.test(c)) return 3
  if (/^unidade-/.test(c)) return 4
  return null
}

// Campos que a organização pode apontar num pedido ou numa correção.
export const CAMPOS_APONTAVEIS = [
  ['nome_marca', 'A marca · Nome'], ['responsavel', 'A marca · Responsável'], ['telefone', 'A marca · WhatsApp'],
  ['email', 'A marca · E-mail'], ['instagram', 'A marca · Instagram'], ['logo', 'A marca · Logo do estabelecimento'],
  ['tema_combo', 'Tema · Tema escolhido'], ['tema_justificativa', 'Tema · Justificativa'],
  ...[1, 2, 3].flatMap((n) => [['item-' + n + '-nome', 'Item ' + n + ' · Nome'], ['item-' + n + '-descricao', 'Item ' + n + ' · Descrição'], ['item-' + n + '-ingredientes', 'Item ' + n + ' · Ingredientes']]),
  ['custo_embalagem', 'Custos · Embalagem para viagem'], ['custo_delivery', 'Custos · Delivery'],
  ['unidade-endereco', 'Onde encontrar · Endereço'],
]

const ROTULO_ITEM = { doce: 'do doce', salgado: 'do salgado', bebida: 'da bebida' }
const CAMPO_ITEM = { nome: 'Nome', descricao: 'Descrição', ingredientes: 'Ingredientes' }
const vazio = (v) => !String(v == null ? '' : v).trim()

/*
 * Os campos obrigatórios — a MESMA lista de `campos_cadastro` no banco
 * (migration 20261002_valor_combo_edicao.sql), que dá o % na lista da
 * organização. São 16 fixos + os custos que se aplicam (embalagem se o combo
 * pode ser para viagem, delivery se alguma unidade entrega). O valor do combo
 * saiu: é da organização. Mudou aqui, muda lá.
 */
export function camposObrigatorios({ marca = {}, tema = {}, itens = [], unidades = [], custos = {}, logo = false } = {}) {
  const c = (bloco, campo, rotulo, ok) => ({ bloco, campo, rotulo, ok: !!ok })
  const lista = [
    c(0, 'nome_marca', 'Nome da marca', !vazio(marca.nome_marca)),
    c(0, 'responsavel', 'Responsável', !vazio(marca.responsavel)),
    c(0, 'telefone', 'WhatsApp', !vazio(marca.telefone)),
    c(0, 'logo', 'Logo do estabelecimento', logo),
    c(1, 'tema_combo', 'Tema do combo', !vazio(tema.tema_combo)),
    c(1, 'tema_justificativa', 'Por que esse tema', !vazio(tema.tema_justificativa)),
  ]
  const ordenados = itensEmOrdem(itens)
  for (let i = 0; i < TIPOS.length; i++) {
    const it = ordenados[i]
    for (const k of ['nome', 'descricao', 'ingredientes']) {
      lista.push(it
        ? c(2, 'item-' + it.posicao + '-' + k, CAMPO_ITEM[k] + ' ' + (ROTULO_ITEM[it.tipo] || 'do item'), !vazio(it[k]))
        // Item que ainda não existe: só a organização cria (não há campo para abrir).
        : c(2, null, CAMPO_ITEM[k] + ' do item ' + (i + 1), false))
    }
  }
  const faltam = custosFaltando(custos)
  if (custos.viagem) lista.push(c(3, 'custo_embalagem', 'Custo da embalagem para viagem', !faltam.includes('custo_embalagem')))
  if (custos.delivery) lista.push(c(3, 'custo_delivery', 'Custo do delivery', !faltam.includes('custo_delivery')))
  lista.push(c(4, 'unidade-endereco', 'Endereço', unidades.some(unidadeTemEndereco)))
  return lista
}

export function progressoCampos(dados) {
  const lista = camposObrigatorios(dados)
  const feitos = lista.filter((x) => x.ok).length
  return { feitos, total: lista.length, pct: Math.round((feitos / lista.length) * 100) }
}

// Dados do formulário a partir das linhas do banco (mesma conversão de cadastro.js).
export function dadosDeLinhas({ participante = {}, participacao = {}, itens = [], unidades = [] } = {}) {
  return {
    marca: { nome_marca: participante.nome_marca, responsavel: participante.responsavel, telefone: participante.telefone },
    tema: { tema_combo: participacao.tema_combo, tema_justificativa: participacao.tema_justificativa },
    itens, unidades,
    logo: !!participacao.logo_id,
    custos: custosDeLinhas(participacao, unidades),
  }
}

// Pedido da organização (solicitacoes.bloco) → aba onde ele conta.
const VISTA_DO_PEDIDO = {
  estabelecimento: 'cadastro', combo: 'combo', item_doce: 'combo', item_salgado: 'combo',
  item_bebida: 'combo', fotos: 'fotos', arquivo: 'arquivos', livre: 'inicio',
}
export const vistaDoPedido = (bloco) => VISTA_DO_PEDIDO[bloco] || 'inicio'

/*
 * Sessões de fotos DESTA participação e vagas abertas da edição dela. A RLS
 * devolve as sessões de todas as edições da marca: uma sessão de edição
 * passada não pode esconder as vagas nem dar a etapa Fotos por feita.
 */
export function fotosDaParticipacao(sessoes, participacao, agora = new Date()) {
  if (!participacao) return { minhas: [], vagas: [] }
  const lista = sessoes || []
  return {
    minhas: lista.filter((s) => s.participante_id && s.status !== 'aberto' && s.participacao_id === participacao.id),
    // Vaga vencida não se reserva (o banco também recusa): sai da lista.
    vagas: lista.filter((s) => s.status === 'aberto' && !s.participante_id && s.edicao_codigo === participacao.edicao_codigo
      && (!s.data_hora || new Date(s.data_hora) > agora)),
  }
}

const ETAPAS = [
  { chave: 'estabelecimento', rotulo: 'Dados do estabelecimento', blocos: [0, 4] },
  { chave: 'tema', rotulo: 'Tema', blocos: [1] },
  { chave: 'itens', rotulo: 'Os três itens', blocos: [2] },
  { chave: 'preco', rotulo: 'Custos e detalhes', blocos: [3] },
]

/*
 * @param {object} d
 *   participante, participacao, itens, unidades — linhas do banco
 *   correcoes   — correcoes_campo da participação
 *   pedidos     — solicitações publicadas para a marca, cada uma com `estado`
 *   sessoes     — sessoes_fotos da participação
 *   arquivosParaLer — nº de arquivos que pedem confirmação e não foram lidos
 *   vagasAbertas — horários livres na agenda de fotos
 *   tema        — última proposta de tema ({status, observacao})
 */
export function resumoMarca(d = {}) {
  const participacao = d.participacao || null
  if (!participacao) {
    return { semParticipacao: true, progresso: { feitos: 0, total: 17, pct: 0 }, etapas: [], pendencias: [], proxima: null,
      contagem: {}, campo: () => null, combo: null }
  }
  const dados = dadosDeLinhas(d)
  const campos = camposObrigatorios(dados)
  const progresso = progressoCampos(dados)
  const correcoes = d.correcoes || []
  const abertas = correcoes.filter((c) => c.estado === 'aberta')
  const comboStatus = participacao.combo_status || 'rascunho'

  const pendencias = []
  for (const c of abertas) {
    pendencias.push({ tipo: 'correcao', titulo: 'Alteração solicitada', texto: c.comentario, acao: 'Corrigir agora',
      vista: vistaDoBloco(c.bloco), link: linkDoCampo(c.bloco, c.campo), bloco: c.bloco, campo: c.campo })
  }
  // Tema recusado é uma correção do campo do tema, com a observação da organização.
  if (d.tema && d.tema.status === 'recusado' && !abertas.some((c) => c.campo === 'tema_combo')) {
    pendencias.push({ tipo: 'correcao', titulo: 'Escolha outro tema', texto: d.tema.observacao || 'O tema proposto não foi aprovado.',
      acao: 'Corrigir agora', vista: 'combo', link: linkDoCampo(1, 'tema_combo'), bloco: 1, campo: 'tema_combo' })
  }
  const pedidos = (d.pedidos || []).filter((p) => p.estado !== 'respondido')
  const pedidoItem = (p) => ({ tipo: 'pedido', titulo: p.titulo, texto: p.prazo_em ? 'Prazo: ' + new Date(p.prazo_em).toLocaleDateString('pt-BR') : 'Pedido da organização',
    acao: 'Responder', vista: vistaDoPedido(p.bloco), link: 'pedidos/' + p.id, prioridade: p.prioridade || 'normal' })
  for (const p of pedidos.filter((x) => x.prioridade === 'importante')) pendencias.push(pedidoItem(p))
  // Campo vazio: uma pendência por campo (a mais precisa possível).
  for (const c of campos.filter((x) => !x.ok)) {
    if (abertas.some((a) => a.campo === c.campo)) continue
    pendencias.push({ tipo: 'campo', titulo: c.rotulo, texto: c.campo === 'logo' ? 'Envie a logo oficial da marca em alta resolução.' : c.campo ? 'Ainda não preenchido.' : 'O combo ainda não tem os três itens: fale com a organização.',
      acao: c.campo ? 'Completar agora' : null, vista: vistaDoBloco(c.bloco), link: c.campo ? linkDoCampo(c.bloco, c.campo) : null,
      bloco: c.bloco, campo: c.campo })
  }
  for (const p of pedidos.filter((x) => x.prioridade !== 'importante')) pendencias.push(pedidoItem(p))
  const sessao = (d.sessoes || []).find((s) => s.status === 'agendada' || s.status === 'remarcada') || null
  const fotosFeitas = (d.sessoes || []).some((s) => s.status === 'realizada')
  if (!sessao && !fotosFeitas && Number(d.vagasAbertas) > 0 && participacao.foto_liberacao === 'liberado') {
    pendencias.push({ tipo: 'fotos', titulo: 'Marque a sessão de fotos', texto: d.vagasAbertas + (d.vagasAbertas === 1 ? ' horário livre' : ' horários livres') + ' na agenda.',
      acao: 'Escolher horário', vista: 'fotos', link: 'fotos' })
  }
  if (Number(d.arquivosParaLer) > 0) {
    pendencias.push({ tipo: 'arquivo', titulo: d.arquivosParaLer === 1 ? 'Um arquivo para ler' : d.arquivosParaLer + ' arquivos para ler',
      texto: 'A organização pediu confirmação de leitura.', acao: 'Ver arquivos', vista: 'arquivos', link: 'arquivos' })
  }
  if (Number(d.fotosParaLer) > 0) {
    pendencias.push({ tipo: 'arquivo', titulo: d.fotosParaLer === 1 ? 'Uma foto oficial para conferir' : d.fotosParaLer + ' fotos oficiais para conferir',
      texto: 'A organização pediu confirmação de leitura.', acao: 'Ver fotos', vista: 'fotos', link: 'fotos' })
  }

  const cadastroCompleto = campos.every((x) => x.ok)
  // Tudo preenchido mas ainda não enviado: enviar é a próxima ação.
  if (cadastroCompleto && participacao.status_cadastro !== 'cadastro_completo' && comboStatus !== 'aprovado') {
    pendencias.push({ tipo: 'enviar', titulo: abertas.length || correcoes.some((c) => c.estado === 'corrigida') ? 'Enviar novamente para análise' : 'Enviar o cadastro para análise',
      texto: 'Tudo preenchido. Falta enviar para a organização conferir.', acao: 'Enviar', vista: 'combo', link: 'combo' })
  }

  const etapas = ETAPAS.map((e) => {
    const doBloco = campos.filter((x) => e.blocos.includes(x.bloco))
    const corr = abertas.some((c) => e.blocos.includes(c.bloco))
    return { chave: e.chave, rotulo: e.rotulo, vista: vistaDoBloco(e.blocos[0]),
      estado: corr ? 'atencao' : doBloco.every((x) => x.ok) ? 'feito' : 'pendente',
      faltam: doBloco.filter((x) => !x.ok).length }
  })
  etapas.push({ chave: 'fotos', rotulo: 'Fotos', vista: 'fotos',
    estado: fotosFeitas ? 'feito' : sessao ? 'andamento' : 'pendente', faltam: 0 })
  etapas.push({ chave: 'analise', rotulo: 'Aprovação', vista: 'combo',
    estado: comboStatus === 'aprovado' ? 'feito' : comboStatus === 'correcao_solicitada' ? 'atencao'
      : comboStatus === 'em_analise' ? 'andamento' : 'pendente', faltam: 0 })

  const contagem = { inicio: 0, cadastro: 0, combo: 0, fotos: 0, arquivos: 0 }
  for (const p of pendencias) if (p.tipo !== 'enviar') contagem[p.vista in contagem ? p.vista : 'inicio']++

  // Estado de cada campo para o formulário: ícone + texto, nunca só cor.
  const porCampo = {}
  for (const c of campos) if (c.campo) porCampo[c.campo] = { estado: c.ok ? 'completo' : 'falta' }
  for (const c of correcoes) {
    if (c.estado === 'aberta') porCampo[c.campo] = { estado: 'alteracao', comentario: c.comentario }
    else if (c.estado === 'corrigida' && (!porCampo[c.campo] || porCampo[c.campo].estado !== 'alteracao')) porCampo[c.campo] = { estado: 'analise' }
  }
  const campo = (id) => {
    const e = porCampo[id]
    if (!e) return null
    if (e.estado === 'completo' && comboStatus === 'aprovado') return { estado: 'aprovado' }
    if (e.estado === 'completo' && comboStatus === 'em_analise') return { estado: 'analise' }
    return e
  }

  const proxima = pendencias.find((p) => p.link && (p.tipo === 'correcao' || p.tipo === 'campo' || p.tipo === 'enviar'))
    || pendencias.find((p) => p.link) || null

  return {
    semParticipacao: false, progresso, etapas, pendencias, proxima, contagem, campo, sessao,
    combo: { status: comboStatus, nota: participacao.combo_revisao_nota || null, desde: participacao.updated_at || null },
  }
}

/* ── Avisos (sino) ──────────────────────────────────────────────────────── */
export const NIVEIS = {
  informacao: { rotulo: 'Informação', acao: 'Abrir' },
  atencao: { rotulo: 'Atenção', acao: 'Ver' },
  pendencia: { rotulo: 'Pendência', acao: 'Resolver' },
  alteracao: { rotulo: 'Alteração solicitada', acao: 'Corrigir agora' },
  aprovado: { rotulo: 'Aprovado', acao: 'Ver' },
  arquivo: { rotulo: 'Arquivo disponível', acao: 'Ver arquivo' },
}
const NIVEL_DO_TIPO = {
  correcao: 'alteracao', aprovado: 'aprovado', arquivo: 'arquivo',
  pedido: 'pendencia', prazo: 'pendencia', venda: 'pendencia',
  fotos: 'atencao', tema: 'atencao', combo: 'atencao', mensagem: 'informacao',
}
export function nivelDoAviso(n) {
  let nivel = NIVEL_DO_TIPO[n && n.tipo] || 'informacao'
  // Avisos antigos de combo: o título diz se foi aprovação ou ajuste.
  if (n && n.tipo === 'combo') nivel = /aprovad/i.test(n.titulo || '') ? 'aprovado' : 'alteracao'
  if (n && n.tipo === 'tema') nivel = /aprovad/i.test(n.titulo || '') ? 'aprovado' : 'atencao'
  return nivel
}

/* ── Links da marca ─────────────────────────────────────────────────────── */
/*
 * Os links gravados no banco antes da navegação nova ("hoje", "cadastro",
 * "cadastro/2/item-1-nome", "cadastro/fotos") seguem abrindo o lugar certo.
 * `tipo` (do aviso, quando há) desfaz o link genérico: o lembrete de vendas
 * grava só "hoje" e vai ao lançamento; prazo, tema e combo gravam só
 * "cadastro" e falam do combo, não do estabelecimento.
 */
export function interpretarLinkMarca(link, tipo) {
  if (!link || typeof link !== 'string') return null
  const [seg, a, b] = link.split('/').filter(Boolean)
  if (seg === 'hoje' || seg === 'inicio') return a === 'venda' || (!a && tipo === 'venda') ? { vista: 'inicio', id: 'venda' } : { vista: 'inicio' }
  if (seg === 'cadastro' && a === undefined && ['prazo', 'combo', 'tema'].includes(tipo)) return { vista: 'combo' }
  if (seg === 'cadastro' && a === 'fotos') return { vista: 'fotos' }
  if ((seg === 'cadastro' || seg === 'combo') && a !== undefined && /^\d$/.test(a)) {
    return b ? { vista: vistaDoBloco(a), sub: a, campo: b } : { vista: vistaDoBloco(a), sub: a }
  }
  if (seg === 'combo') return { vista: 'combo' }
  return interpretarLink(link)
}
