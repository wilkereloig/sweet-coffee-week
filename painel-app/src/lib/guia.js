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
import { traduzirFaltando } from './edicaoMarca.js'

// Meu cadastro = A marca (0) + Unidades (4) + Atendimento e horário do combo (6)
// + Fotos (7); Meu combo = tema (1), itens (2), combo (3), alimentar e trocas (5).
// Mesma divisão de link_campo_marca no banco (20261014_cartoon_03_revisao.sql).
export function vistaDoBloco(bloco) {
  return [0, 4, 6, 7].includes(Number(bloco)) ? 'cadastro' : 'combo'
}

export function linkDoCampo(bloco, campo) {
  return vistaDoBloco(bloco) + '/' + bloco + (campo ? '/' + campo : '')
}

// Bloco do formulário a partir do id do campo (`campo-<id>` em Cadastro.jsx).
export function blocoDoCampo(campo) {
  const c = String(campo || '')
  if (/^(nome_marca|responsavel|telefone|email|instagram|site|cnpj|razao_social|logo|apresentacao_publica)$/.test(c)) return 0
  if (/^tema_/.test(c)) return 1
  if (/^item-\d-(alimentar|trocas)$/.test(c)) return 5
  if (/^item-/.test(c)) return 2
  if (/^(combo_|custo_)/.test(c)) return 3
  if (/^unidade-/.test(c)) return 4
  if (/^atendimento-/.test(c)) return 6
  return null
}

// Campos que a organização pode apontar num pedido ou numa correção. Os de
// unidade apontam a 1ª unidade (o id genérico); as outras levam sufixo -2, -3…
export const CAMPOS_APONTAVEIS = [
  ['nome_marca', 'A marca · Nome'], ['responsavel', 'A marca · Responsável'], ['telefone', 'A marca · WhatsApp'],
  ['email', 'A marca · E-mail'], ['instagram', 'A marca · Instagram'], ['logo', 'A marca · Logo do estabelecimento'],
  ['apresentacao_publica', 'A marca · Apresentação no site'],
  ['tema_combo', 'Tema · Tema escolhido'], ['tema_justificativa', 'Tema · Justificativa'],
  ...[1, 2, 3].flatMap((n) => [['item-' + n + '-nome', 'Item ' + n + ' · Nome'], ['item-' + n + '-descricao', 'Item ' + n + ' · Descrição']]),
  ['combo_nome', 'Combo · Nome do combo'], ['combo_descricao', 'Combo · Descrição'], ['combo_condicoes', 'Combo · Condições'],
  ['custo_embalagem', 'Custos · Embalagem para viagem'], ['custo_delivery', 'Custos · Delivery'],
  ...[1, 2, 3].flatMap((n) => [['item-' + n + '-alimentar', 'Item ' + n + ' · Alergênicos e características'], ['item-' + n + '-trocas', 'Item ' + n + ' · Trocas']]),
  ['unidade-endereco', 'Unidades · Endereço'], ['unidade-whatsapp', 'Unidades · WhatsApp público'],
  ['unidade-horario-loja', 'Unidades · Horário da loja'],
  ['atendimento-modos', 'Atendimento · Local, retirada e delivery'], ['atendimento-canais', 'Atendimento · Canais do delivery'],
  ['atendimento-horario', 'Atendimento · Horário do combo'],
]

const ROTULO_ITEM = { doce: 'do doce', salgado: 'do salgado', bebida: 'da bebida' }
const CAMPO_ITEM = { nome: 'Nome', descricao: 'Descrição' }
const vazio = (v) => !String(v == null ? '' : v).trim()

/*
 * Os campos obrigatórios — a MESMA lista de `campos_cadastro` no banco
 * (migration 20261002_valor_combo_edicao.sql), que dá o % na lista da
 * organização. São 13 fixos + os custos que se aplicam (embalagem se o combo
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
    for (const k of ['nome', 'descricao']) {
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
  // 6 (atendimento) e 5 (alimentar) não têm campo na contagem de 17, mas uma
  // correção pedida neles acende a etapa certa.
  { chave: 'estabelecimento', rotulo: 'Dados, unidades e atendimento', blocos: [0, 4, 6] },
  { chave: 'tema', rotulo: 'Tema e inspiração', blocos: [1] },
  { chave: 'itens', rotulo: 'Itens e informações alimentares', blocos: [2, 5] },
  { chave: 'preco', rotulo: 'Apresentação e condições do combo', blocos: [3] },
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
    return { semParticipacao: true, progresso: { feitos: 0, total: 13, pct: 0 }, envio: { faltam: 0, itens: [], pronto: false, conhecido: false, podeEnviar: false },
      etapas: [], pendencias: [], proxima: null, contagem: {}, campo: () => null, combo: null }
  }
  const dados = dadosDeLinhas(d)
  const campos = camposObrigatorios(dados)
  const progresso = progressoCampos(dados)
  const correcoes = d.correcoes || []
  const abertas = correcoes.filter((c) => c.estado === 'aberta')
  const comboStatus = participacao.combo_status || 'rascunho'
  const statusCadastro = participacao.status_cadastro || 'em_preenchimento'
  const alteradoAposAprovacao = !!(d.publicacao && d.publicacao.alterado_apos_aprovacao)
  const agora = d.agora ? new Date(d.agora) : new Date()

  // O que a página pública exige além dos campos (pendencias_publicacao, lida pelo
  // servidor). `null` = a leitura não existe neste banco: não sabemos, não afirmamos.
  const conhecido = Array.isArray(d.faltandoEdicao)
  // A mesma falta de endereço vem dos dois lados (campo obrigatório e `unidade:<id>:endereco`/`sem_unidade`
  // do servidor): quando o servidor já a lista, vale a dele (leva à unidade certa) e o campo básico não conta de novo.
  const enderecoNoServidor = conhecido && d.faltandoEdicao.some((c) => c === 'sem_unidade' || /^unidade:.+:endereco$/.test(c))
  const duplicado = (x) => enderecoNoServidor && x.campo === 'unidade-endereco'
  const faltasEdicao = (conhecido ? d.faltandoEdicao : [])
    .map((c) => ({ codigo: c, ...traduzirFaltando(c, { unidades: d.unidades || [], itens: d.itens || [] }) }))
  // A logo não trava o envio (marca_concluir_cadastro); o resto, sim.
  const faltasBasicas = campos.filter((x) => !x.ok && x.campo !== 'logo' && !duplicado(x))
  const envio = {
    faltam: faltasBasicas.length + faltasEdicao.length,
    itens: faltasEdicao, conhecido,
    pronto: faltasBasicas.length === 0 && faltasEdicao.length === 0,
  }

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
  const pedidoItem = (p) => {
    const dias = p.prazo_em ? (new Date(p.prazo_em).getTime() - agora.getTime()) / 86400000 : null
    return { tipo: 'pedido', titulo: p.titulo,
      texto: p.prazo_em ? (dias < 0 ? 'Prazo vencido em ' : 'Prazo: ') + new Date(p.prazo_em).toLocaleDateString('pt-BR') : 'Solicitação da organização',
      acao: 'Responder', vista: vistaDoPedido(p.bloco), link: 'pedidos/' + p.id, prioridade: p.prioridade || 'normal',
      prazo_em: p.prazo_em || null, vencido: dias !== null && dias < 0, urgente: dias !== null && dias <= PRAZO_URGENTE_DIAS }
  }
  for (const p of pedidos.filter((x) => x.prioridade === 'importante')) pendencias.push(pedidoItem(p))
  // Campo vazio: uma pendência por campo (a mais precisa possível).
  for (const c of campos.filter((x) => !x.ok && !duplicado(x))) {
    if (abertas.some((a) => a.campo === c.campo)) continue
    pendencias.push({ tipo: 'campo', titulo: c.rotulo, texto: c.campo === 'logo' ? 'Envie a logo oficial da marca em alta resolução.' : c.campo ? 'Ainda não preenchido.' : 'O combo ainda não tem os três itens: fale com a organização.',
      acao: c.campo ? 'Completar agora' : null, vista: vistaDoBloco(c.bloco), link: c.campo ? linkDoCampo(c.bloco, c.campo) : null,
      bloco: c.bloco, campo: c.campo })
  }
  // O que a página pública exige e ainda falta (blocos 3 a 6): uma pendência por item, com o nome da unidade.
  for (const f of faltasEdicao) {
    pendencias.push({ tipo: 'campo', titulo: f.texto, texto: 'Falta para enviar o cadastro.', acao: f.campo ? 'Completar agora' : null,
      vista: vistaDoBloco(f.bloco), link: f.campo ? linkDoCampo(f.bloco, f.campo) : null, bloco: f.bloco, campo: f.campo, codigo: f.codigo })
  }
  for (const p of pedidos.filter((x) => x.prioridade !== 'importante')) pendencias.push(pedidoItem(p))
  const sessao = (d.sessoes || []).find((s) => s.status === 'agendada' || s.status === 'remarcada') || null
  const fotosFeitas = (d.sessoes || []).some((s) => s.status === 'realizada')
  if (!sessao && !fotosFeitas && Number(d.vagasAbertas) > 0 && participacao.foto_liberacao === 'liberado') {
    pendencias.push({ tipo: 'fotos', titulo: 'Marque a sessão de fotos', texto: d.vagasAbertas + (d.vagasAbertas === 1 ? ' horário livre' : ' horários livres') + ' na agenda.',
      acao: 'Escolher horário', vista: 'fotos', link: 'fotos' })
  }
  // Leitura confirmada de arquivo: só pede ciência, não é aceite de termo.
  if (Number(d.arquivosParaLer) > 0) {
    pendencias.push({ tipo: 'arquivo', qtd: Number(d.arquivosParaLer), titulo: d.arquivosParaLer === 1 ? 'Um arquivo para ler' : d.arquivosParaLer + ' arquivos para ler',
      texto: 'A organização pediu que você confirme a leitura.', acao: 'Ver arquivos', vista: 'arquivos', link: 'arquivos' })
  }
  if (Number(d.fotosParaLer) > 0) {
    pendencias.push({ tipo: 'arquivo', qtd: Number(d.fotosParaLer), titulo: d.fotosParaLer === 1 ? 'Uma foto oficial para conferir' : d.fotosParaLer + ' fotos oficiais para conferir',
      texto: 'A organização pediu que você confirme que conferiu.', acao: 'Ver fotos', vista: 'fotos', link: 'fotos' })
  }

  // Enviar para a organização: só quando o servidor aceitaria e há algo a analisar.
  //  - em análise: quem age é a organização, não há o que cobrar;
  //  - encerrada: a participação acabou;
  //  - aprovado: só se mudou depois da aprovação (enviar alterações);
  //  - rascunho/ajuste pedido: enquanto o cadastro não foi marcado como completo.
  const reenvio = abertas.length > 0 || correcoes.some((c) => c.estado === 'corrigida') || comboStatus === 'correcao_solicitada'
  const podeEnviar = statusCadastro !== 'encerrado' && comboStatus !== 'em_analise'
    && (comboStatus === 'aprovado' ? alteradoAposAprovacao : (comboStatus === 'correcao_solicitada' || statusCadastro !== 'cadastro_completo'))
  envio.podeEnviar = podeEnviar
  if (podeEnviar && envio.pronto) {
    const soLogo = campos.some((x) => !x.ok && x.campo === 'logo')
    pendencias.push({ tipo: 'enviar',
      titulo: comboStatus === 'aprovado' ? 'Enviar as alterações para análise' : reenvio ? 'Enviar novamente para análise' : 'Enviar o cadastro para análise',
      texto: (reenvio ? 'Conferiu o que foi pedido? ' : 'O que a organização exige para analisar está pronto. ') + (soLogo ? 'A logo pode ser enviada depois.' : 'Falta só enviar.'),
      acao: 'Enviar', vista: 'combo', link: 'combo' })
  }

  // O que cada etapa diz em palavras (nunca só "falta"): o Início escreve este texto ao lado do selo.
  const etapas = ETAPAS.map((e) => {
    const doBloco = campos.filter((x) => e.blocos.includes(x.bloco))
    const corr = abertas.some((c) => e.blocos.includes(c.bloco))
    const faltamAqui = doBloco.filter((x) => !x.ok).length + faltasEdicao.filter((f) => e.blocos.includes(f.bloco)).length
    const estado = corr ? 'atencao' : faltamAqui === 0 ? 'feito' : 'pendente'
    return { chave: e.chave, rotulo: e.rotulo, vista: vistaDoBloco(e.blocos[0]), estado, faltam: faltamAqui,
      detalhe: corr ? 'ajuste pedido' : faltamAqui === 0 ? 'preenchido' : faltamAqui === 1 ? 'falta 1 informação' : 'faltam ' + faltamAqui + ' informações' }
  })
  const liberadoFotos = participacao.foto_liberacao === 'liberado'
  etapas.push({ chave: 'fotos', rotulo: 'Fotos', vista: 'fotos',
    estado: fotosFeitas ? 'feito' : sessao ? 'andamento' : 'pendente', faltam: 0,
    detalhe: fotosFeitas ? 'sessão realizada' : sessao ? 'sessão marcada'
      : !liberadoFotos ? 'aguardando liberação da organização' : Number(d.vagasAbertas) > 0 ? 'escolher um horário' : 'sem horários livres por enquanto' })
  etapas.push({ chave: 'analise', rotulo: 'Aprovação', vista: 'combo',
    estado: comboStatus === 'aprovado' ? 'feito' : comboStatus === 'correcao_solicitada' ? 'atencao'
      : comboStatus === 'em_analise' ? 'andamento' : 'pendente', faltam: 0,
    detalhe: comboStatus === 'aprovado' ? (alteradoAposAprovacao ? 'aprovado, com alterações a enviar' : 'aprovado')
      : comboStatus === 'correcao_solicitada' ? 'ajuste pedido pela organização'
      : comboStatus === 'em_analise' ? 'em análise pela organização'
      : statusCadastro === 'encerrado' ? 'participação encerrada'
      : podeEnviar && envio.pronto ? 'pronto para enviar' : 'depois de preencher e enviar' })

  // Por aba: cada pendência conta 1 (arquivos e fotos para ler contam quantos são).
  const contagem = { inicio: 0, cadastro: 0, combo: 0, fotos: 0, arquivos: 0 }
  for (const p of pendencias) if (p.tipo !== 'enviar') contagem[p.vista in contagem ? p.vista : 'inicio'] += p.qtd || 1

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

  // Próxima ação: correção pedida > pedido importante ou com prazo curto/vencido > campo que falta > enviar > o resto.
  // `critica` = não pode ser coberta por um aviso só informativo (mensagem nova).
  const ordem = (p) => (p.tipo === 'correcao' ? 0 : p.tipo === 'pedido' && (p.urgente || p.prioridade === 'importante') ? 1
    : p.tipo === 'campo' ? 2 : p.tipo === 'enviar' ? 3 : 4)
  // Mesma referência da pendência (agruparPendencias exclui o destaque por identidade).
  let proxima = null
  for (const p of pendencias) if (p.link && (!proxima || ordem(p) < ordem(proxima))) proxima = p
  if (proxima) proxima.critica = ordem(proxima) <= 1

  return {
    semParticipacao: false, progresso, envio, etapas, pendencias, proxima, contagem, campo, sessao,
    combo: { status: comboStatus, nota: participacao.combo_revisao_nota || null, desde: participacao.updated_at || null,
      alteradoAposAprovacao },
  }
}

/** Pedido que vence em até tantos dias (ou já venceu) sobe na frente do preenchimento. */
export const PRAZO_URGENTE_DIAS = 3

/*
 * Pendências por assunto, para o Início: um grupo por área, com poucas linhas à vista e o resto
 * recolhido. Mesmos itens de `resumoMarca().pendencias`, só reunidos — nada some nem se repete.
 * `fora` = itens que já aparecem no destaque (a próxima ação) e não devem se repetir na lista.
 */
const AREAS = [
  { chave: 'cadastro', rotulo: 'Meu cadastro', vista: 'cadastro' },
  { chave: 'combo', rotulo: 'Meu combo', vista: 'combo' },
  { chave: 'fotos', rotulo: 'Fotos', vista: 'fotos' },
  { chave: 'solicitacoes', rotulo: 'Solicitações', vista: 'pedidos' },
  { chave: 'documentos', rotulo: 'Documentos', vista: 'arquivos' },
]
const areaDaPendencia = (p) => {
  if (p.tipo === 'pedido') return 'solicitacoes'
  if (p.tipo === 'fotos') return 'fotos'
  if (p.tipo === 'arquivo') return p.vista === 'fotos' ? 'fotos' : 'documentos'
  return p.vista === 'cadastro' ? 'cadastro' : 'combo'
}
export function agruparPendencias(pendencias = [], { fora = null, visiveis = 3 } = {}) {
  const mapa = new Map(AREAS.map((a) => [a.chave, { ...a, itens: [] }]))
  for (const p of pendencias) {
    if (p === fora || p.tipo === 'enviar') continue
    mapa.get(areaDaPendencia(p)).itens.push(p)
  }
  return AREAS.map((a) => mapa.get(a.chave)).filter((g) => g.itens.length)
    .map((g) => {
      const total = g.itens.reduce((n, p) => n + (p.qtd || 1), 0)
      return { ...g, total, aVista: g.itens.slice(0, visiveis), recolhidas: g.itens.slice(visiveis) }
    })
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
