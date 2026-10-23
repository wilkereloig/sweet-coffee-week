/*
 * Início da marca — a ORDEM e as decisões da tela (22/10/2026), em lógica pura,
 * sem DOM: testada em tests/painel-app-inicio.test.mjs.
 *
 * O que fazer agora → pendências por assunto → acompanhamento → comunicação e
 * prazos → materiais e história. Quem decide o que é a próxima ação continua
 * sendo guia.js (`resumoMarca().proxima`); aqui se decide o que a TELA faz com
 * ela: se uma mensagem passa na frente, onde cada bloco entra conforme a fase
 * da edição, o que dizer quando não há tarefa, e como escrever o progresso sem
 * prometer mais do que os dados sabem.
 */
import { CAMPOS_APONTAVEIS, agruparPendencias } from './guia.js'
import { diasCalendario } from './painelFormat.js'
import { linkPublico } from './edicaoMarca.js'
import { itemDoCronograma, dataDoItem, diasAte, textoPrazo as textoPrazoDoItem } from './operacao.js'
import { PRAZO_URGENTE_DIAS } from './guia.js'

/*
 * Data para escrever na tela. Dia puro ("AAAA-MM-DD": festival, cronograma) não tem fuso e se lê como veio;
 * instante com hora (prazo de pedido, gravado em UTC) vira a data LOCAL — a mesma que `diasCalendario` usa
 * para contar os dias; senão "vence em 3 dias (25/10)" aparecia um dia depois do prazo.
 */
export function dataBr(iso) {
  if (!iso) return ''
  const s = String(iso)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.split('-').reverse().join('/')
  const d = new Date(s)
  return isNaN(d.getTime()) ? s.slice(0, 10).split('-').reverse().join('/') : d.toLocaleDateString('pt-BR')
}
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const texto = (v) => String(v == null ? '' : v).trim()
const mili = (agora) => (agora instanceof Date ? agora.getTime() : agora)

/* ── Identificação ───────────────────────────────────────────────────────── */

/** "Cartoon · 2026.2" — o nome legível da edição, com o código como complemento. */
export function nomeDaEdicao(edicao, codigo) {
  const nome = texto(edicao && (edicao.tema || edicao.nome))
  const cod = texto(codigo || (edicao && edicao.codigo))
  if (nome && cod) return nome.includes(cod) ? nome : nome + ' · ' + cod
  return nome || (cod ? 'Edição ' + cod : '')
}

/** Onde a edição está, em uma frase (vazio quando as datas não existem). */
export function fraseDaFase(edicao, momento) {
  if (!edicao || momento === 'indefinido') return ''
  if (momento === 'antes') return 'O festival começa em ' + dataBr(edicao.festival_inicio)
  if (momento === 'durante') return 'O festival está acontecendo, até ' + dataBr(edicao.festival_fim)
  if (momento === 'depois') return 'O festival terminou'
  return ''
}

/* ── O que fazer agora ───────────────────────────────────────────────────── */

export function mensagemNova(n) {
  const q = Number(n) || 0
  if (q <= 0) return null
  return {
    tipo: 'mensagens', link: 'mensagens', acao: 'Ler mensagens', texto: 'Leia e responda por aqui.',
    titulo: q === 1 ? '1 mensagem nova da organização' : q + ' mensagens novas da organização',
  }
}

const ehCritica = (p) => p.tipo === 'correcao' || (p.tipo === 'pedido' && (!!p.urgente || p.prioridade === 'importante'))

/*
 * `resumo.proxima` é a própria pendência da lista (guia.js só marca `critica` nela). Se a lista
 * foi filtrada (ex.: agenda de fotos depois do festival), a identidade cai para tipo + link + título.
 */
export function originalDaPendencia(pendencias = [], p) {
  if (!p) return null
  return pendencias.find((x) => x === p)
    || pendencias.find((x) => x.tipo === p.tipo && x.link === p.link && x.titulo === p.titulo)
    || null
}

/** Depois do festival não se cobra agendar sessão de fotos: só o que ainda está realmente aberto. */
export function pendenciasAbertas(pendencias = [], momento = 'indefinido') {
  return momento === 'depois' ? pendencias.filter((p) => p.tipo !== 'fotos') : pendencias.slice()
}

/**
 * Prazo de preenchimento da edição (cronograma da organização: chave `preenchimento`, senão `combo`).
 * `urgente` = vence em poucos dias ou já passou — aí o cadastro pendente conta como ação crítica.
 */
export function prazoDoCadastro(cronograma = [], hoje = '') {
  const item = itemDoCronograma(cronograma, 'preenchimento', hoje) || itemDoCronograma(cronograma, 'combo', hoje)
  if (!item || item.visivel_participante === false) return null
  const dia = dataDoItem(item)
  const dias = diasAte(dia, hoje)
  if (dias === null) return null
  const frase = textoPrazoDoItem(item, hoje)
  return {
    texto: 'Prazo do cadastro: ' + (frase === 'já passou' ? 'venceu em ' + dataBr(dia) : frase + ' (' + dataBr(dia) + ')'),
    urgente: dias <= PRAZO_URGENTE_DIAS, vencido: dias < 0, dias,
  }
}
const TIPOS_DO_CADASTRO = ['campo', 'correcao']

/**
 * Decide o destaque e o que sobra para a lista.
 *  - Mensagem nova só é o destaque quando NÃO há ação crítica (correção, pedido importante ou
 *    com prazo curto/vencido, ou cadastro pendente com o prazo de preenchimento em cima);
 *    com crítica, ela vira `mensagemAparte` e o prazo fica no destaque.
 *  - O destaque nunca se repete na lista: `fora` é a pendência ORIGINAL (a que está em `abertas`).
 *  - Não há "enviar" (23/10/2026): a marca só salva, e o cadastro completo vai sozinho para a organização.
 */
export function planejarAgora({ proxima = null, pendencias = [], msgsNovas = 0, momento = 'indefinido', prazoCadastro = null } = {}) {
  const abertas = pendenciasAbertas(pendencias, momento)
  const cadastroUrgente = !!(prazoCadastro && prazoCadastro.urgente)
  const critica = (p) => !!(p.critica || ehCritica(p) || (cadastroUrgente && TIPOS_DO_CADASTRO.includes(p.tipo)))
  let prox = proxima
  let origem = originalDaPendencia(abertas, proxima)
  if (proxima && !origem) {
    // A próxima ação saiu da lista (ex.: agenda de fotos depois do festival): a seguinte com destino assume.
    origem = abertas.find((p) => p.link) || null
    prox = origem ? { ...origem, critica: ehCritica(origem) } : null
  }
  if (prox && !prox.critica && critica(prox)) prox = { ...prox, critica: true }
  if (!prox) {
    // Pendência sem destino na tela (ex.: o combo ainda não tem os três itens): quem resolve é a organização.
    // Dizer "nada pendente" com isso aberto na lista seria mentir.
    origem = abertas[0] || null
    prox = origem ? { ...origem, link: 'mensagens', vista: 'mensagens', acao: 'Falar com a organização', critica: false } : null
  }
  const mensagem = mensagemNova(msgsNovas)
  const mensagemEhDestaque = !!mensagem && !(prox && prox.critica)
  const destaque = mensagemEhDestaque ? mensagem : prox
  const fora = mensagemEhDestaque ? null : origem
  return {
    destaque,
    tipoDestaque: !destaque ? null : mensagemEhDestaque ? 'mensagem' : 'pendencia',
    mensagemAparte: mensagem && !mensagemEhDestaque ? mensagem : null,
    abertas,
    // A pendência ORIGINAL que o destaque ocupa (a lista não a repete); com mensagem no destaque, nenhuma sai.
    fora,
  }
}

/** Nome legível de um campo apontado pela organização ("Bolo · Descrição", "Unidades · Endereço (unidade 2)"). */
export function rotuloDoCampo(campo, itens = []) {
  const c = texto(campo)
  if (!c) return ''
  const it = /^item-(\d)-(nome|descricao|alimentar|trocas)$/.exec(c)
  if (it) {
    const item = (itens || []).find((i) => Number(i.posicao) === Number(it[1]))
    const parte = { nome: 'Nome', descricao: 'Descrição', alimentar: 'Alergênicos e características', trocas: 'Trocas' }[it[2]]
    return (texto(item && item.nome) || 'Item ' + it[1]) + ' · ' + parte
  }
  const base = c.replace(/-(\d+)$/, '')
  const achado = CAMPOS_APONTAVEIS.find(([k]) => k === c) || CAMPOS_APONTAVEIS.find(([k]) => k === base)
  if (!achado) return ''
  return achado[1] + (base !== c ? ' (unidade ' + /-(\d+)$/.exec(c)[1] + ')' : '')
}

/** Correção sem título próprio ("Alteração solicitada") passa a dizer QUAL item. */
export function tituloDaPendencia(p, itens = []) {
  if (p && p.tipo === 'correcao' && p.titulo === 'Alteração solicitada') {
    const r = rotuloDoCampo(p.campo, itens)
    if (r) return 'Corrigir: ' + r
  }
  return p ? p.titulo : ''
}

/** "vence amanhã", "prazo vencido em 20/10"… a partir de uma data de prazo. */
export function textoDoPrazo(iso, agora = new Date()) {
  const n = diasCalendario(iso, mili(agora))
  if (n === null) return ''
  const d = dataBr(iso)
  if (n < 0) return 'prazo vencido em ' + d
  if (n === 0) return 'vence hoje'
  if (n === 1) return 'vence amanhã'
  if (n <= 14) return 'vence em ' + n + ' dias (' + d + ')'
  return 'prazo: ' + d
}

// Só onde o texto da pendência NÃO diz o porquê (pedido tem o seu, abaixo; o resto já se explica).
const MOTIVO = {
  correcao: 'A organização pediu um ajuste neste ponto.',
  campo: 'É obrigatório para a página no site.',
}

/** O destaque pronto para desenhar: título, prazo, por que está aí e o que fazer. */
export function apresentarDestaque(d, { itens = [], agora = new Date(), prazoCadastro = null } = {}) {
  if (!d) return null
  const pedido = d.tipo === 'pedido'
  let prazo = pedido && d.prazo_em ? { texto: cap(textoDoPrazo(d.prazo_em, agora)), urgente: !!(d.vencido || d.urgente) } : null
  // Cadastro pendente (campo, correção): o prazo de preenchimento da edição acompanha a ação.
  if (!prazo && prazoCadastro && TIPOS_DO_CADASTRO.includes(d.tipo)) prazo = { texto: prazoCadastro.texto, urgente: !!prazoCadastro.urgente }
  let motivo = MOTIVO[d.tipo] || ''
  if (pedido) motivo = d.prioridade === 'importante' ? 'A organização marcou esta solicitação como importante.' : d.vencido ? 'O prazo já passou.' : d.urgente ? 'O prazo está perto.' : 'A organização pediu uma resposta.'
  if (d.tipo === 'campo' && d.campo === 'logo') motivo = 'A logo não trava o cadastro, mas a organização precisa dela para o site.'
  else if (d.tipo === 'campo' && (d.codigo || !d.link)) motivo = ''   // o texto da pendência já diz
  return {
    tipo: d.tipo,
    rotulo: d.tipo === 'mensagens' ? 'Mensagem nova' : d.critica ? 'Precisa de você agora' : d.tipo === 'campo' ? 'Continue de onde parou' : 'Próxima ação',
    critica: !!d.critica,
    titulo: tituloDaPendencia(d, itens),
    // Pedido com prazo: o texto do guia só repete a data que o chip já mostra.
    texto: prazo ? '' : texto(d.texto),
    citacao: d.tipo === 'correcao' && !!texto(d.texto),
    prazo, motivo,
    acao: d.acao || 'Abrir', link: d.link || null, vista: d.vista || 'inicio',
  }
}

/** Quando não há tarefa: aguardando a organização (com o quê), edição encerrada ou nada pendente. */
export function semAcao({ momento = 'indefinido', esperas = [], vendaFeita = true } = {}) {
  // Durante o festival a rotina do dia é a tarefa: não dizer "nada a fazer" com a venda de hoje por lançar.
  if (momento === 'durante' && !vendaFeita) {
    return { tipo: 'livre', titulo: 'Falta lançar os combos de hoje', texto: 'Registre os combos vendidos hoje logo abaixo.' + (esperas.length ? ' A organização está cuidando de:' : ''), itens: esperas }
  }
  if (esperas.length) {
    return { tipo: 'espera', titulo: 'Aguardando a organização', texto: 'Você não tem nada a fazer agora. A organização está cuidando de:', itens: esperas }
  }
  if (momento === 'depois') return { tipo: 'encerrada', titulo: 'A edição terminou', texto: 'Obrigado por fazer parte. Não há nada pendente.', itens: [] }
  if (momento === 'durante') {
    return { tipo: 'livre', titulo: 'Nada pendente', texto: vendaFeita ? 'Os combos de hoje já foram lançados.' : 'Registre os combos vendidos hoje logo abaixo.', itens: [] }
  }
  return { tipo: 'livre', titulo: 'Nada pendente', texto: 'Quando a organização pedir algo, aparece aqui e no sino.', itens: [] }
}

/* ── Quem age em cada etapa ──────────────────────────────────────────────── */

/**
 * 'feito' · 'marca' (sua vez) · 'organizacao' (com a organização) · 'marcado' (agendado) · 'depois' · 'atencao'.
 * Se a etapa já vier com `quem` (guia.js), vale o dela. Senão se deduz do estado e dos dados — nunca do texto.
 */
export function quemDaEtapa(e, { fotoLiberada = false, vagasAbertas = 0, alteradoAposAprovacao = false } = {}) {
  if (e.quem) return e.quem
  // Aprovado e alterado depois: a marca já salvou; quem age é a organização (confere e atualiza o site).
  if (e.chave === 'analise' && alteradoAposAprovacao) return 'organizacao'
  if (e.estado === 'feito') return 'feito'
  if (e.estado === 'atencao') return 'marca'
  // Não há "enviar": enquanto o cadastro não está completo, a aprovação é "mais adiante".
  if (e.chave === 'analise') return e.estado === 'andamento' ? 'organizacao' : 'depois'
  if (e.chave === 'fotos') {
    if (e.estado === 'andamento') return 'marcado'
    return fotoLiberada && vagasAbertas > 0 ? 'marca' : 'organizacao'
  }
  return 'marca'
}

/** O selo de "quem age": ícone + texto (o tom só reforça). */
export function etiquetaDeQuem(quem) {
  return ({
    feito: { tom: 'ok', texto: 'Concluído' },
    // Preenchido ≠ aprovado: o que a marca preencheu não é decisão da organização.
    preenchido: { tom: 'neutro', texto: 'Preenchido' },
    marca: { tom: 'atencao', texto: 'Sua vez' },
    organizacao: { tom: 'andamento', texto: 'Com a organização' },
    marcado: { tom: 'andamento', texto: 'Marcada' },
    atencao: { tom: 'atencao', texto: 'Atenção' },
    depois: { tom: 'neutro', texto: 'Mais adiante' },
  })[quem] || { tom: 'neutro', texto: '' }
}

function contexto(resumo, dados) {
  const pa = (dados && dados.participacao) || {}
  return {
    fotoLiberada: pa.foto_liberacao === 'liberado',
    vagasAbertas: Number(dados && dados.vagasAbertas) || 0,
    alteradoAposAprovacao: !!(resumo.combo && resumo.combo.alteradoAposAprovacao),
  }
}

function linhaDoTema(dados) {
  const t = dados && dados.tema
  if (!t) return null
  const nome = texto(dados.participacao && dados.participacao.tema_combo)
  const [detalhe, quem] = t.status === 'aprovado' ? ['aprovado pela organização', 'feito']
    : t.status === 'recusado' ? ['a organização pediu outro tema', 'marca']
    : ['em análise pela organização', 'organizacao']
  return { chave: 'tema', rotulo: 'Tema', detalhe: (nome ? '“' + nome + '”: ' : '') + detalhe, vista: 'combo', quem, nota: t.status === 'recusado' ? texto(t.observacao) : '' }
}

function linhaDaPagina(dados, comboStatus) {
  const pub = dados && dados.publicacao
  if (!pub) return null
  if (pub.estado === 'publicado') {
    return { chave: 'pagina', rotulo: 'Página no site', detalhe: 'publicada' + (pub.versao ? ' (versão ' + pub.versao + ')' : ''), vista: null, quem: 'feito',
      link: linkPublico(pub.slug), nota: pub.alterado_apos_aprovacao ? 'A versão publicada continua no ar até a organização revisar as alterações.' : '' }
  }
  if (pub.estado === 'retirado') {
    return { chave: 'pagina', rotulo: 'Página no site', detalhe: 'fora do site' + (texto(pub.motivo_retirada) ? ': ' + texto(pub.motivo_retirada) : ''), vista: null, quem: 'atencao', link: null, nota: '' }
  }
  return { chave: 'pagina', rotulo: 'Página no site', detalhe: 'ainda não publicada', vista: null, quem: comboStatus === 'aprovado' ? 'organizacao' : 'depois', link: null,
    nota: 'A organização publica depois de aprovar o cadastro.' }
}

/**
 * Duas listas, sem sobreposição:
 *  - preenchimento: o que a marca preenche (estabelecimento, tema, itens, custos);
 *  - organizacao: o que a organização decide — tema, combo, fotos e página no site, ESTADOS DISTINTOS
 *    (tema aprovado ≠ combo aprovado ≠ página publicada).
 */
export function linhasDeAcompanhamento({ resumo, dados }) {
  const ctx = contexto(resumo, dados)
  const comEtiqueta = (l) => ({ ...l, etiqueta: etiquetaDeQuem(l.quem) })
  const linhaDaEtapa = (e, rotulo) => ({ chave: e.chave, rotulo: rotulo || e.rotulo, detalhe: cap(e.detalhe), vista: e.vista, quem: quemDaEtapa(e, ctx), nota: '' })
  const etapa = (k) => resumo.etapas.find((e) => e.chave === k)

  const preenchimento = resumo.etapas.filter((e) => e.chave !== 'fotos' && e.chave !== 'analise').map((e) => linhaDaEtapa(e))
    .map((l) => (l.quem === 'feito' ? { ...l, quem: 'preenchido' } : l))
  const organizacao = [linhaDoTema(dados)]
  const an = etapa('analise')
  if (an) organizacao.push(linhaDaEtapa(an, 'Combo'))
  const fo = etapa('fotos')
  if (fo) organizacao.push(linhaDaEtapa(fo))
  organizacao.push(linhaDaPagina(dados, resumo.combo && resumo.combo.status))
  const nota = resumo.combo && resumo.combo.status === 'correcao_solicitada' ? texto(resumo.combo.nota) : ''
  return {
    preenchimento: preenchimento.map(comEtiqueta),
    organizacao: organizacao.filter(Boolean).map((l) => comEtiqueta(l.chave === 'analise' && nota ? { ...l, nota } : l)),
  }
}

/** O que está nas mãos da organização agora (para dizer "aguardando", sem inventar tarefa). */
export function esperandoOrganizacao({ resumo, dados, momento = 'indefinido' }) {
  if (!resumo || resumo.semParticipacao) return []
  const { organizacao } = linhasDeAcompanhamento({ resumo, dados })
  const alterado = !!(resumo.combo && resumo.combo.alteradoAposAprovacao)
  const frase = {
    tema: 'A aprovação do tema escolhido',
    analise: alterado ? 'A atualização da sua página com as alterações salvas' : 'A análise do seu cadastro e do combo',
    fotos: (dados && dados.participacao && dados.participacao.foto_liberacao === 'liberado') ? 'Novos horários na agenda de fotos' : 'A liberação da sessão de fotos',
    pagina: 'A publicação da sua página no site',
  }
  // Depois do festival não há mais sessão de fotos a esperar (nem agenda nova).
  return organizacao.filter((l) => l.quem === 'organizacao' && !(momento === 'depois' && l.chave === 'fotos')).map((l) => frase[l.chave]).filter(Boolean)
}

/* ── Progresso ───────────────────────────────────────────────────────────── */

/**
 * "NN% dos dados básicos" (o alcance dito) + a situação do cadastro inteiro (23/10/2026: a marca só salva; completo,
 * ele vai sozinho para a conferência da organização). Sem a leitura do servidor (`envio.conhecido` falso), não afirma nada.
 */
export function textoProgresso(resumo) {
  const { progresso, envio, combo } = resumo
  let linha = null
  if (envio.conhecido) {
    if (combo.status === 'correcao_solicitada') linha = { estado: 'falta', texto: 'Ajuste pedido · corrija e salve' }
    else if (!envio.pronto) linha = { estado: 'falta', texto: envio.faltam === 1 ? 'Falta 1 informação' : 'Faltam ' + envio.faltam + ' informações' }
    else if (combo.status === 'em_analise') linha = { estado: 'conferindo', texto: 'Completo · a organização está conferindo' }
    else if (combo.status === 'aprovado') {
      linha = combo.alteradoAposAprovacao
        ? { estado: 'conferindo', texto: 'Alterações salvas · a organização vai atualizar o site' }
        : { estado: 'ok', texto: 'Combo aprovado' }
    } else linha = { estado: 'conferindo', texto: 'Completo · a organização vai conferir' }
  }
  return {
    pct: progresso.pct,
    dados: progresso.pct + '% dos dados básicos',
    contagem: progresso.feitos + ' de ' + progresso.total + ' informações básicas',
    envio: linha,
  }
}

/* ── Pendências por assunto ──────────────────────────────────────────────── */

const BOTAO = {
  cadastro: ['Continuar meu cadastro', 'Corrigir meu cadastro'],
  combo: ['Continuar meu combo', 'Corrigir meu combo'],
  fotos: ['Abrir fotos', 'Abrir fotos'],
  solicitacoes: ['Ver solicitações', 'Ver solicitações'],
  documentos: ['Ver arquivos', 'Ver arquivos'],
}

/** "faltam 3 informações · 1 alteração pedida" — a linha que resume o grupo. */
export function resumoDoGrupo(g) {
  const n = (f) => g.itens.filter(f).length
  const qtd = (f) => g.itens.filter(f).reduce((s, p) => s + (p.qtd || 1), 0)
  const partes = []
  const correcoes = n((p) => p.tipo === 'correcao')
  const campos = n((p) => p.tipo === 'campo')
  const pedidos = n((p) => p.tipo === 'pedido')
  const arquivos = qtd((p) => p.tipo === 'arquivo')
  if (correcoes) partes.push(correcoes === 1 ? '1 alteração pedida' : correcoes + ' alterações pedidas')
  if (campos) partes.push(campos === 1 ? 'falta 1 informação' : 'faltam ' + campos + ' informações')
  if (pedidos) partes.push(pedidos === 1 ? '1 solicitação aberta' : pedidos + ' solicitações abertas')
  if (arquivos) {
    const foto = g.chave === 'fotos'
    partes.push(foto ? (arquivos === 1 ? '1 foto para conferir' : arquivos + ' fotos para conferir') : (arquivos === 1 ? '1 arquivo para ler' : arquivos + ' arquivos para ler'))
  }
  if (n((p) => p.tipo === 'fotos')) partes.push('escolher um horário')
  return partes.join(' · ')
}

/** Os grupos do Início: mesmos itens de `resumo.pendencias`, sem o destaque, com resumo e botão principal. */
export function gruposDoInicio(plano) {
  return agruparPendencias(plano.abertas, { fora: plano.fora, visiveis: 3 }).map((g) => ({
    ...g,
    resumo: resumoDoGrupo(g),
    botao: BOTAO[g.chave][g.itens.some((p) => p.tipo === 'correcao') ? 1 : 0],
  }))
}

/* ── Comunicação e prazos ────────────────────────────────────────────────── */

/** Solicitações abertas, em uma linha: quantas e o prazo mais próximo (os itens moram no grupo "Solicitações"). */
export function resumoSolicitacoes(pedidos = [], agora = new Date()) {
  const abertas = (pedidos || []).filter((p) => p.estado !== 'respondido')
  if (!abertas.length) return null
  const comPrazo = abertas.map((p) => ({ p, dias: diasCalendario(p.prazo_em, mili(agora)) })).filter((x) => x.dias !== null).sort((a, b) => a.dias - b.dias)
  const prox = comPrazo[0] || null
  return {
    total: abertas.length,
    titulo: abertas.length === 1 ? '1 solicitação aberta' : abertas.length + ' solicitações abertas',
    prazo: prox ? 'a mais próxima: ' + prox.p.titulo + ' (' + textoDoPrazo(prox.p.prazo_em, agora) + ')' : '',
    urgente: !!prox && prox.dias <= 3,
  }
}

/* ── Ordem dos blocos conforme a fase da edição ──────────────────────────── */

/**
 * Antes: preparação em primeiro lugar. Durante: as vendas do dia sobem para logo abaixo do destaque
 * (o destaque crítico continua em cima). Depois (e sem datas): a rotina diária desce.
 * Os blocos são desenhados com `key` — mudar a ordem MOVE, não remonta (o digitado nas vendas fica).
 */
export function ordemDoInicio(momento) {
  const corpo = ['pendencias', 'acompanhamento', 'comunicacao']
  if (momento === 'durante') return ['identificacao', 'agora', 'venda', 'vouchers', ...corpo, 'materiais']
  if (momento === 'antes') return ['identificacao', 'agora', ...corpo, 'vouchers', 'materiais']
  return ['identificacao', 'agora', ...corpo, 'venda', 'vouchers', 'materiais']
}

/** A venda do dia só sai da tela ANTES do festival (as datas desconhecidas não a escondem). */
export const vendaVisivel = (momento) => momento !== 'antes'
