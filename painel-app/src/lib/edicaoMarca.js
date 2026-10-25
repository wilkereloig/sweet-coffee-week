/*
 * Camada de edição no cadastro da marca (Cartoon 2026.2, fase 3) — lógica
 * pura, sem DOM, testada em tests/painel-app-edicao-marca.test.mjs.
 *
 * Plano: docs/cartoon-2026-2/04-painel.md §4.2–4.4 e 03-modelo-de-dados.md
 * §3.3–3.5. Contrato do banco: supabase/migrations/20261014_cartoon_0{1,2,3}.
 *
 * Três regras que não se negociam (as mesmas do site, src/edicao/dados/modelo.js):
 *  1. Declaração alimentar AUSENTE = "não respondido". Nunca vira "não contém".
 *  2. "Sem lactose" ≠ "sem leite": lactose é característica, leite é alergênico.
 *  3. Delivery aqui é delivery DO COMBO, nunca "a loja faz delivery".
 *
 * `pendenciasEdicao` espelha `pendencias_publicacao` do banco (mesmos códigos,
 * mesma ordem). Mudou lá, muda cá — o teste confere contra o SQL.
 */
import { ALERGENICOS, CARACTERISTICAS } from '../../../src/edicao/dados/modelo.js'
import { canaisParaObjeto, canaisParaArray, NOMES_FALTANDO } from './cadastro.js'
import { mascaraWhatsApp, validarWhatsApp, whatsappNormalizado } from './participantes.js'
import { linhasCanonicas } from './horarioFestival.js'

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const texto = (v) => String(v == null ? '' : v).trim()
const ouNulo = (v) => texto(v) || null

/* ── Vocabulário ─────────────────────────────────────────────────────────── */
export const ASPECTOS_ALERGENICOS = ALERGENICOS.map(([a]) => a)
export const ALERGENICOS_PAINEL = ALERGENICOS.map(([a, r]) => [a, cap(r)])
export const DICA_ALERGENICO = { gluten: 'trigo, centeio, cevada, aveia', leite: 'leite e derivados' }
export const ESTADOS_ALERGENICO = [
  ['contem', 'Contém'], ['nao_contem', 'Não contém'], ['pode_conter', 'Pode conter (contato cruzado)'], ['nao_informado', 'Não sei'],
]
export const CARACTERISTICAS_PAINEL = CARACTERISTICAS.map(([a]) => a)
export const PERGUNTA_CARACTERISTICA = {
  lactose: 'Contém lactose?', vegano: 'É vegano?', vegetariano: 'É vegetariano?', acucar_adicionado: 'Tem açúcar adicionado?',
}
// sim / nao / nao_informado: o mesmo trio da característica e do modo de atendimento.
export const ESTADOS_TRES = [['sim', 'Sim'], ['nao', 'Não'], ['nao_informado', 'Ainda não sei']]
export const ESTADOS_CARACTERISTICA = [['sim', 'Sim'], ['nao', 'Não'], ['nao_informado', 'Não sei']]
export const MODOS_SERVICO = [
  ['consumo_local', 'Consumo no local', 'A pessoa come o combo na loja.'],
  ['retirada', 'Retirada', 'A pessoa pede e leva o combo.'],
  ['delivery_combo', 'Delivery do combo', 'Vale só para entregar O COMBO, não para a loja em geral.'],
]
export const DISPONIBILIDADES = [['sempre', 'Sempre disponível'], ['sob_consulta', 'Sob consulta'], ['limitada', 'Limitada (até acabar)']]
export const MODALIDADES = [['local', 'Consumo no local'], ['retirada', 'Retirada'], ['delivery', 'Delivery']]

/* ── Unidade: permanente (unidades) + participação (participacao_unidades) ── */
const soDigitos = (v) => texto(v).replace(/\D/g, '')
export const whatsappDigitos = (v) => whatsappNormalizado(v).slice(2)

/** Validação junto ao campo, espelhando os `check` de `unidades`. '' = válido. */
export function erroCep(v) {
  const d = soDigitos(v)
  return !d || d.length === 8 ? '' : 'O CEP tem 8 dígitos.'
}
export function erroUf(v) {
  const t = texto(v)
  return !t || /^[A-Za-z]{2}$/.test(t) ? '' : 'Use a sigla do estado, com 2 letras (ex.: RN).'
}
export const erroWhatsappUnidade = (v) => validarWhatsApp(v)

/**
 * Linhas do banco → uma unidade na tela. `pu` ou `un` podem faltar (sugestão / nova).
 * `horario_festival` = como a unidade funciona em cada dia do festival (linhas COMPLETAS e canônicas, [] = ainda não
 * respondido); `horarios_antigo` = o texto livre de antes (`participacao_unidades.horarios`), só para o seletor dizer "Hoje está: …".
 */
export function unidadeDeLinhas(pu, un) {
  const u = un || {}
  return {
    _key: pu ? 'pu-' + pu.id : un ? 'un-' + un.id : null,
    puId: pu ? pu.id : null,
    unId: (un && un.id) || (pu && pu.unidade_id) || null,
    id_publico: (pu && pu.id_publico) || null,
    participa: pu ? pu.participa !== false : true,
    nome_unidade: u.nome_unidade || '',
    // Legado: antes da unidade permanente o endereço morava na participação.
    logradouro: u.logradouro ?? (pu && pu.endereco) ?? '',
    numero: u.numero || '', complemento: u.complemento || '',
    bairro: u.bairro ?? (pu && pu.bairro) ?? '',
    cidade: u.cidade || '', uf: u.uf || '', cep: u.cep || '', referencia: u.referencia || '',
    whatsapp_publico: u.whatsapp_publico ? mascaraWhatsApp(u.whatsapp_publico) : '',
    whatsapp_autorizado: !!u.whatsapp_autorizado,
    verificada: !!u.coordenada_verificada_em,
    consumo_local: (pu && pu.consumo_local) || 'nao_informado',
    retirada: (pu && pu.retirada) || 'nao_informado',
    delivery_combo: (pu && pu.delivery_combo) || 'nao_informado',
    canais: canaisParaObjeto(pu && pu.canais_delivery),
    delivery_regioes: (pu && pu.delivery_regioes) || '',
    delivery_taxa: (pu && pu.delivery_taxa) || '',
    observacao_combo: (pu && pu.observacao_combo) || '',
    horario_festival: linhasCanonicas(pu && pu.horario_festival),
    horarios_antigo: texto(pu && pu.horarios),
  }
}

/** O que `corpoUnidade` deixa de fora por inválido — para o "Salvo" dizer a verdade (auditoria de 21/10/2026). */
export function camposInvalidosDaUnidade(u) {
  const r = []
  if (erroCep(u.cep)) r.push('o CEP')
  if (erroUf(u.uf)) r.push('a UF')
  if (erroWhatsappUnidade(u.whatsapp_publico)) r.push('o WhatsApp da loja')
  return r
}

/** Corpo do PATCH/POST em `unidades`. Valor inválido FICA DE FORA (o campo mostra o erro). */
export function corpoUnidade(u) {
  const corpo = {
    nome_unidade: ouNulo(u.nome_unidade), logradouro: ouNulo(u.logradouro), numero: ouNulo(u.numero),
    complemento: ouNulo(u.complemento), bairro: ouNulo(u.bairro), cidade: ouNulo(u.cidade),
    uf: ouNulo(u.uf) && texto(u.uf).toUpperCase(), cep: soDigitos(u.cep) || null, referencia: ouNulo(u.referencia),
    whatsapp_publico: whatsappDigitos(u.whatsapp_publico) || null, whatsapp_autorizado: !!u.whatsapp_autorizado,
  }
  if (erroCep(u.cep)) delete corpo.cep
  if (erroUf(u.uf)) delete corpo.uf
  // Número pela metade: nem ele nem a liberação vão (senão o número ANTIGO iria para o site).
  if (erroWhatsappUnidade(u.whatsapp_publico)) { delete corpo.whatsapp_publico; delete corpo.whatsapp_autorizado }
  return corpo
}

/*
 * WhatsApp da loja (23/10/2026, pedido do Wilker): preenchido = vai para o site; não há mais caixa de
 * autorização (`whatsapp_autorizado` passa a dizer "a marca salvou sob a regra nova"). O número que foi
 * digitado sob a regra antiga sem autorizar (`whatsappLegado`) só vai ao site quando a marca salvar a
 * unidade de novo — nunca porque a tela abriu.
 */
export const whatsappLegado = (u) => !!(u && soDigitos(u.whatsapp_publico) && !u.whatsapp_autorizado && !erroWhatsappUnidade(u.whatsapp_publico))

/**
 * A unidade depois de a marca mexer nela: o número decide a liberação; qualquer outra edição DOS DADOS DA UNIDADE (bloco 4, onde o
 * aviso "este número vai para o site" aparece) libera o número antigo. Atendimento, canais e horário (bloco 6) passam
 * `liberaLegado: false`: quem só confirma o horário não pode publicar, sem ver, um número que ela digitou sob a regra antiga.
 */
export function editarUnidade(u, mudanca, { liberaLegado = true } = {}) {
  const novo = { ...u, ...mudanca }
  if ('whatsapp_publico' in mudanca) novo.whatsapp_autorizado = !!soDigitos(novo.whatsapp_publico)
  else if (liberaLegado && whatsappLegado(u)) novo.whatsapp_autorizado = true
  return novo
}

// Cópia de conveniência para quem ainda lê participacao_unidades.endereco/bairro
// (lista da organização, Início, campos_cadastro). A tela edita `unidades`.
export const enderecoLegado = (u) => [texto(u.logradouro), texto(u.numero)].filter(Boolean).join(', ') || null

/**
 * Corpo do PATCH em `participacao_unidades` (só colunas com grant da marca). O horário no festival vai canônico
 * (`linhasCanonicas`): o jsonb volta do banco com as chaves em outra ordem, e a comparação de `patchMudancas` é por
 * texto — só linhas completas chegam aqui (o rascunho incompleto do seletor nunca entra em `u.horario_festival`).
 */
export function corpoParticipacaoUnidade(u, ordem) {
  return {
    ordem, participa: u.participa !== false,
    endereco: enderecoLegado(u), bairro: ouNulo(u.bairro),
    consumo_local: u.consumo_local, retirada: u.retirada, delivery_combo: u.delivery_combo,
    // faz_delivery é legado: espelha o delivery DO COMBO para quem ainda o lê.
    faz_delivery: u.delivery_combo === 'sim',
    canais_delivery: canaisParaArray(u.canais),
    delivery_regioes: ouNulo(u.delivery_regioes), delivery_taxa: ouNulo(u.delivery_taxa),
    observacao_combo: ouNulo(u.observacao_combo),
    horario_festival: linhasCanonicas(u.horario_festival),
  }
}

/** Corpo do INSERT: `horario_festival` só tem grant de UPDATE por coluna — o horário de uma unidade nova entra num PATCH em seguida. */
export function corpoNovaParticipacaoUnidade(u, ordem) {
  const { horario_festival: _depois, ...corpo } = corpoParticipacaoUnidade(u, ordem)
  return corpo
}

/** A mesma forma, lida da linha que o servidor gravou (foto para patchMudancas). */
export function corpoParticipacaoUnidadeDeLinha(row) {
  return {
    ordem: row.ordem, participa: row.participa !== false,
    endereco: ouNulo(row.endereco), bairro: ouNulo(row.bairro),
    consumo_local: row.consumo_local || 'nao_informado', retirada: row.retirada || 'nao_informado',
    delivery_combo: row.delivery_combo || 'nao_informado', faz_delivery: !!row.faz_delivery,
    canais_delivery: canaisParaArray(canaisParaObjeto(row.canais_delivery)),
    delivery_regioes: ouNulo(row.delivery_regioes), delivery_taxa: ouNulo(row.delivery_taxa),
    observacao_combo: ouNulo(row.observacao_combo),
    horario_festival: linhasCanonicas(row.horario_festival),
  }
}

/** Nome para mostrar: nome da unidade, senão bairro, senão a posição. */
export function nomeDaUnidade(u, i) {
  return texto(u && u.nome_unidade) || texto(u && u.bairro) || 'Unidade ' + ((i || 0) + 1)
}

/** id do campo de uma unidade: a 1ª usa o nome genérico (o que a organização aponta). */
export const idCampoUnidade = (base, i) => base + (i ? '-' + (i + 1) : '')

/* ── Horário NO FESTIVAL (23/10/2026) ──────────────────────────────────────────
 * Uma pergunta só: como a unidade funciona em cada dia do festival — sem o par de perguntas de antes.
 * Mora em participacao_unidades.horario_festival (jsonb). A regra — modos, períodos, validação, texto — é de
 * src/edicao/dados/horarioFestival.js e a tela é components/HorarioFestival.jsx; aqui ficam só as ligações do cadastro.
 * A unidade na tela guarda as linhas COMPLETAS (`horario_festival`) e, enquanto o seletor está incompleto, só um
 * marcador (`_horarioPendente`) que o salvamento usa para avisar. O marcador não vai ao banco nem à mesclagem.
 */
const listaTexto = (l) => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1])

/** Por que o horário que a pessoa está montando ainda não pode ser salvo (vem do `onChange` do seletor). '' = nada falta. */
export function motivoHorarioIncompleto({ faltando = [], semDiaAberto = false } = {}) {
  if (faltando.length) return 'falta responder ' + listaTexto(faltando)
  return semDiaAberto ? 'marque pelo menos um dia em que a unidade abre' : ''
}

/** As frases do salvamento para os horários que ficaram de fora: uma por unidade que participa com horário incompleto na tela. */
export function frasesHorarioNaoSalvo(unidades = []) {
  const frases = []
  unidades.forEach((u, i) => {
    if (u.participa === false || !u._horarioPendente) return
    frases.push('O horário de ' + nomeDaUnidade(u, i) + ' não foi salvo: ' + (motivoHorarioIncompleto(u._horarioPendente) || 'falta terminar') + '.')
  })
  return frases
}

/* ── Declarações alimentares ──────────────────────────────────────────────── */
/** Linhas → { [item_id]: { [aspecto]: {id, estado, observacao} } }. Só o que tem linha. */
export function declaracoesPorItem(rows) {
  const m = {}
  for (const d of rows || []) {
    if (!d.item_id) continue
    ;(m[d.item_id] = m[d.item_id] || {})[d.aspecto] = { id: d.id, estado: d.estado, observacao: d.observacao || '' }
  }
  return m
}
export const corpoDeclaracao = (d) => ({ estado: d.estado, observacao: ouNulo(d.observacao) })

/** O check do banco: "outro" respondido sem dizer qual não grava. */
export const declaracaoGravavel = (aspecto, d) => !!(d && d.estado) && !(aspecto === 'outro_alergenico' && d.estado !== 'nao_informado' && !texto(d.observacao))

export function alergenicosRespondidos(porAspecto) {
  return ASPECTOS_ALERGENICOS.filter((a) => porAspecto && porAspecto[a] && porAspecto[a].estado).length
}

/* ── Substituições ────────────────────────────────────────────────────────── */
const paraStr = (n) => (n == null ? '' : String(n).replace('.', ','))
export function substituicaoDeLinha(s) {
  return {
    _key: 'sub-' + s.id, id: s.id, item_id: s.item_id, original: s.original || '', alternativa: s.alternativa || '',
    disponibilidade: s.disponibilidade || 'sob_consulta', acrescimo: paraStr(s.acrescimo), como_solicitar: s.como_solicitar || '',
    modalidades: [...(s.modalidades || [])], unidades: [...(s.unidades || [])],
  }
}
/** A troca não muda o valor do combo (24/10/2026, decisão do Wilker): o acréscimo sai da tela e vai sempre 0
 *  — o mesmo que o /preencher grava. A coluna fica no banco só pelo dado antigo. */
export function corpoSubstituicao(s) {
  return {
    original: texto(s.original), alternativa: texto(s.alternativa), disponibilidade: s.disponibilidade,
    acrescimo: 0,
    como_solicitar: ouNulo(s.como_solicitar), modalidades: [...s.modalidades], unidades: [...s.unidades],
  }
}
export const substituicaoGravavel = (s) => !!(texto(s.original) && texto(s.alternativa))

/** Liga/desliga um valor numa lista, mantendo a ordem de uma lista de referência. */
export function alternar(lista, valor, referencia) {
  const tem = lista.includes(valor)
  const nova = tem ? lista.filter((x) => x !== valor) : [...lista, valor]
  return referencia ? referencia.filter((x) => nova.includes(x)) : nova
}

/* ── O que falta para completar / publicar ─────────────────────────────────── */
/*
 * Espelho de pendencias_publicacao (20261014_cartoon_02_publicacao.sql):
 * combo_nome · sem_unidade · unidade:<id>:endereco|modos|canais|horario ·
 * item:<posicao>:alimentar. Unidade ainda não gravada usa a chave local no
 * lugar do id público (o servidor nem a vê ainda).
 */
export function pendenciasEdicao({ comboNome = '', unidades = [], itens = [], declaracoes = {} } = {}) {
  const f = []
  if (!texto(comboNome)) f.push('combo_nome')
  const participam = unidades.filter((u) => u.participa !== false)
  if (!participam.length) f.push('sem_unidade')
  for (const u of participam) {
    const id = u.id_publico || u._key
    if (!texto(u.logradouro) || !texto(u.bairro) || !texto(u.cidade)) f.push('unidade:' + id + ':endereco')
    if ([u.consumo_local, u.retirada, u.delivery_combo].some((m) => !m || m === 'nao_informado')) f.push('unidade:' + id + ':modos')
    if (u.delivery_combo === 'sim' && !canaisParaArray(u.canais).length) f.push('unidade:' + id + ':canais')
    // Horário no festival: [] = ainda não respondido (dia que não abre é uma resposta; o banco usa a mesma regra).
    if (!(u.horario_festival || []).length) f.push('unidade:' + id + ':horario')
  }
  for (const i of [...itens].sort((a, b) => a.posicao - b.posicao)) {
    if (alergenicosRespondidos(declaracoes[i.id]) < ASPECTOS_ALERGENICOS.length) f.push('item:' + i.posicao + ':alimentar')
  }
  return f
}

const BLOCO_DO_LEGADO = {
  nome_marca: 0, responsavel: 0, telefone: 0, tema_combo: 1, tema_justificativa: 1, combo_preco: 3,
  custo_embalagem: 3, custo_delivery: 3, unidades: 4, item_doce: 2, item_salgado: 2, item_bebida: 2, item_segundo: 2,
}
const CAMPO_DO_LEGADO = {
  nome_marca: 'nome_marca', responsavel: 'responsavel', telefone: 'telefone', tema_combo: 'tema_combo',
  tema_justificativa: 'tema_justificativa', custo_embalagem: 'custo_embalagem', custo_delivery: 'custo_delivery', unidades: 'unidade-endereco',
}

/** Bloco do formulário onde um código de `faltando` se resolve (null = nenhum). */
export function blocoDaPendencia(codigo) {
  const c = String(codigo || '')
  if (c in BLOCO_DO_LEGADO) return BLOCO_DO_LEGADO[c]
  if (c === 'combo_nome') return 3
  if (c === 'sem_unidade') return 4
  if (/^unidade:.+:endereco$/.test(c)) return 4
  if (/^unidade:.+:(modos|canais|horario)$/.test(c)) return 6
  if (/^item:\d+:alimentar$/.test(c)) return 5
  return null
}

export function contarPorBloco(codigos) {
  const n = {}
  for (const c of codigos || []) { const b = blocoDaPendencia(c); if (b !== null) n[b] = (n[b] || 0) + 1 }
  return n
}

const ROTULO_ITEM = { doce: 'do doce', salgado: 'do salgado', bebida: 'da bebida' }

/**
 * Código de `faltando` (envio, prévia) → { texto, bloco, campo } em português,
 * com o NOME da unidade (nunca o id público) e o campo para onde levar.
 */
export function traduzirFaltando(codigo, { unidades = [], itens = [] } = {}) {
  const c = String(codigo || '')
  if (c in NOMES_FALTANDO) return { texto: cap(NOMES_FALTANDO[c]), bloco: BLOCO_DO_LEGADO[c] ?? null, campo: CAMPO_DO_LEGADO[c] || null }
  if (c === 'combo_nome') return { texto: 'Dar um nome ao combo', bloco: 3, campo: 'combo_nome' }
  if (c === 'sem_unidade') return { texto: 'Marcar ao menos uma unidade que participa da edição', bloco: 4, campo: 'unidade-endereco' }
  let m = /^unidade:(.+):(endereco|modos|canais|horario)$/.exec(c)
  if (m) {
    const i = unidades.findIndex((u) => u.id_publico === m[1] || u._key === m[1])
    const nome = i >= 0 ? nomeDaUnidade(unidades[i], i) : 'uma unidade'
    const pos = Math.max(i, 0)
    if (m[2] === 'endereco') return { texto: 'Completar o endereço de ' + nome + ' (rua, bairro e cidade)', bloco: 4, campo: idCampoUnidade('unidade-endereco', pos) }
    if (m[2] === 'modos') return { texto: 'Responder como ' + nome + ' atende o combo: no local, retirada e delivery', bloco: 6, campo: idCampoUnidade('atendimento-modos', pos) }
    if (m[2] === 'canais') return { texto: 'Informar onde pedir o delivery do combo em ' + nome, bloco: 6, campo: idCampoUnidade('atendimento-canais', pos) }
    return { texto: 'Informar o horário no festival de ' + nome, bloco: 6, campo: idCampoUnidade('atendimento-horario', pos) }
  }
  m = /^item:(\d+):alimentar$/.exec(c)
  if (m) {
    const it = itens.find((x) => String(x.posicao) === m[1])
    return { texto: 'Responder os alergênicos ' + ((it && ROTULO_ITEM[it.tipo]) || 'do item ' + m[1]), bloco: 5, campo: 'item-' + m[1] + '-alimentar' }
  }
  return { texto: c, bloco: null, campo: null }
}

/* ── Publicação ───────────────────────────────────────────────────────────── */
export const linkPublico = (slug) => (slug ? 'https://www.sweetcoffeeweek.com.br/cartoon/participantes/' + encodeURIComponent(slug) : null)

/** Estado de `marca_minha_publicacao` → a linha que a marca lê. */
export function textoPublicacao(pub) {
  if (!pub) return null
  if (pub.estado === 'publicado') {
    return { tom: 'ok', texto: 'Sua página está publicada' + (pub.versao ? ' (versão ' + pub.versao + ')' : '') + '.', link: linkPublico(pub.slug) }
  }
  if (pub.estado === 'retirado') {
    return { tom: 'erro', texto: 'Sua página saiu do site' + (texto(pub.motivo_retirada) ? ': ' + texto(pub.motivo_retirada) : '.'), link: null }
  }
  return { tom: 'neutro', texto: 'Sua página ainda não está publicada. A organização publica depois de aprovar o cadastro.', link: null }
}

/* ── Clareza do formulário da marca (22/10/2026) ─────────────────────────────
 * Tudo puro, testado em tests/painel-app-edicao-marca.test.mjs. Os ÍNDICES dos
 * blocos (0 a 7), `data-bloco`, `bloco-N`, `campo-*` e os links NÃO mudam: só o
 * rótulo que a pessoa lê.
 */
const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios)

export const ROTULO_AREA = { cadastro: 'Meu cadastro', combo: 'Meu combo' }

/** Título e subtítulo de cada bloco, por índice. O número que aparece é LOCAL da aba (numeroLocalDoBloco). */
export const TITULOS_BLOCO = [
  { titulo: 'Dados da marca', sub: 'Nome, logo, contatos e apresentação da casa' },
  { titulo: 'Tema e inspiração', sub: 'Sua leitura do tema da edição' },
  { titulo: 'Itens do combo', sub: 'Dois itens de comer e uma bebida' },
  { titulo: 'Apresentação e condições do combo', sub: 'Nome, descrição, condições, valor e custos' },
  { titulo: 'Unidades participantes', sub: 'Endereço, WhatsApp e quais participam' },
  { titulo: 'Informações alimentares e trocas', sub: 'Alergênicos, características e trocas de cada item' },
  { titulo: 'Atendimento e horário no festival', sub: 'Local, retirada, delivery e o horário de cada unidade nos dias do festival' },
]

/** Meu cadastro = 0 · 4 · 6 · 7; Meu combo = 1 · 2 · 3 · 5. O mesmo corte de vistaDoBloco (guia.js) — o teste confere. */
export function areaDoBloco(bloco) {
  if (bloco === null || bloco === undefined) return 'cadastro'
  return [0, 4, 6, 7].includes(Number(bloco)) ? 'cadastro' : 'combo'
}

/** Posição do bloco na aba (1, 2, 3…), ou null se ele não está nela. `visiveis` = blocos da aba. */
export function numeroLocalDoBloco(bloco, visiveis = []) {
  const i = [...visiveis].sort((a, b) => a - b).indexOf(Number(bloco))
  return i < 0 ? null : i + 1
}

/**
 * Diz ONDE a falta está: `naOutraAba` quando o bloco não é da aba aberta, e o texto completo
 * ("Falta em Meu combo: Dar um nome ao combo") para quem está no outro lado.
 */
export function comOnde(f, visiveis = []) {
  const area = areaDoBloco(f.bloco)
  const naOutraAba = f.bloco !== null && f.bloco !== undefined && !visiveis.includes(Number(f.bloco))
  return { ...f, area, naOutraAba, textoCompleto: naOutraAba ? 'Falta em ' + ROTULO_AREA[area] + ': ' + f.texto : f.texto }
}

/**
 * O que falta no cadastro inteiro (as duas áreas), em ordem: primeiro o da aba aberta, depois o da outra, por bloco.
 * `faltaCampos` = campos obrigatórios vazios (sem a logo); `pendEdicao` = códigos de pendenciasEdicao. É só leitura:
 * o servidor continua decidindo quando o cadastro está completo. O primeiro item é o "Ir para o que falta".
 */
export function faltasDoCadastro({ faltaCampos = [], pendEdicao = [], unidades = [], itens = [], visiveis = [] } = {}) {
  return [
    ...faltaCampos.map((c) => ({ texto: c.campo ? c.rotulo : c.rotulo + ' (fale com a organização)', bloco: c.bloco, campo: c.campo || null })),
    ...pendEdicao.map((codigo) => ({ ...traduzirFaltando(codigo, { unidades, itens }), codigo })),
  ].map((f) => comOnde(f, visiveis))
    .sort((a, b) => Number(a.naOutraAba) - Number(b.naOutraAba) || (a.bloco ?? 99) - (b.bloco ?? 99))
}

/**
 * Situação de UM bloco, em palavras, para o cabeçalho recolhido. Ordem: correção pedida > falta >
 * em análise / aprovado > preenchido. "Preenchido" NUNCA é "aprovado": só a organização aprova, e o
 * tema tem aprovação própria (temas_propostos), à parte da do combo.
 */
export function estadoDoBloco({ bloco, faltam = 0, pronto = true, correcao = false, comboStatus = 'rascunho', temaStatus = null, alterado = false } = {}) {
  if (correcao) return { estado: 'alteracao', texto: 'Correção solicitada' }
  if (faltam > 0) return { estado: 'falta', texto: faltam === 1 ? 'Falta 1 informação' : 'Faltam ' + faltam + ' informações' }
  if (!pronto) return { estado: 'espera', texto: 'Abre quando a organização liberar' }
  // O tema tem decisão própria (temas_propostos): vale para o bloco 1 mesmo com o combo em outro estado
  // (tema aprovado ≠ combo aprovado; combo aprovado não faz de um tema ainda proposto um tema aprovado).
  if (Number(bloco) === 1 && temaStatus === 'aprovado') return { estado: 'aprovado', texto: comboStatus === 'aprovado' && !alterado ? 'Aprovado' : 'Tema aprovado' }
  if (Number(bloco) === 1 && temaStatus === 'proposto') return { estado: 'analise', texto: 'Tema em análise' }
  if (comboStatus === 'aprovado' && alterado) return { estado: 'completo', texto: 'Preenchido · alterações salvas' }
  if (comboStatus === 'aprovado') return { estado: 'aprovado', texto: 'Aprovado' }
  if (comboStatus === 'em_analise') return { estado: 'analise', texto: 'Em análise' }
  return { estado: 'completo', texto: 'Preenchido' }
}

const curto = (s, n) => { const t = texto(s); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t }
const unidadeConta = (u) => u.participa !== false && !!(texto(u.logradouro) || u.unId || u.puId)

/** O que o bloco já tem, em poucas palavras ("3 itens", "2 unidades"). '' = nada para resumir. */
export function resumoDoBloco(bloco, { marca = {}, tema = {}, combo = {}, itens = [], unidades = [], declaracoes = {} } = {}) {
  switch (Number(bloco)) {
    case 0: return [curto(marca.nome_marca, 32), texto(marca.telefone)].filter(Boolean).join(' · ')
    case 1: return texto(tema.tema_combo) ? 'Tema: ' + curto(tema.tema_combo, 48) : ''
    case 2: {
      const n = itens.filter((i) => texto(i.nome)).length
      if (!n) return ''
      return n === itens.length ? plural(n, 'item', 'itens') : n + ' de ' + itens.length + ' itens com nome'
    }
    case 3: return texto(combo.combo_nome) ? 'Combo: ' + curto(combo.combo_nome, 48) : ''
    case 4: { const n = unidades.filter(unidadeConta).length; return n ? plural(n, 'unidade', 'unidades') : '' }
    case 5: {
      if (!itens.length) return ''
      const n = itens.filter((i) => alergenicosRespondidos(declaracoes[i.id]) === ASPECTOS_ALERGENICOS.length).length
      return n + ' de ' + itens.length + ' itens respondidos'
    }
    case 6: {
      const participam = unidades.filter(unidadeConta)
      if (!participam.length) return ''
      return 'Horário no festival em ' + participam.filter((u) => (u.horario_festival || []).length).length + ' de ' + plural(participam.length, 'unidade', 'unidades')
    }
    default: return ''
  }
}

/**
 * A situação da participação num rótulo só. A marca só SALVA (23/10/2026, pedido do Wilker): o cadastro que
 * fica completo vai sozinho para a conferência da organização, e toda alteração salva chega a ela. "Completo"
 * não é "aprovado": só a organização aprova. `tom` é o do <Selo> (neutro · andamento · atencao · ok · encerrado).
 */
export function situacaoDaMarca({ semParticipacao = false, statusCadastro = '', comboStatus = 'rascunho', alterado = false, publicada = false, faltam = 0 } = {}) {
  if (semParticipacao) return { chave: 'sem_edicao', texto: 'Sem edição aberta', tom: 'encerrado', nota: '' }
  if (statusCadastro === 'encerrado') return { chave: 'encerrada', texto: 'Participação encerrada', tom: 'encerrado', nota: '' }
  if (comboStatus === 'aprovado') {
    if (alterado) {
      return { chave: 'aprovado_alterado', texto: 'Alterações salvas · a organização vai atualizar o site', tom: 'andamento',
        nota: 'A versão aprovada continua no ar até a organização conferir o que você mudou.' }
    }
    return publicada
      ? { chave: 'publicada', texto: 'Combo aprovado · página no ar', tom: 'ok', nota: '' }
      : { chave: 'aprovado', texto: 'Combo aprovado', tom: 'ok', nota: '' }
  }
  if (comboStatus === 'correcao_solicitada') {
    return { chave: 'ajuste', texto: 'Ajuste pedido · corrija e salve', tom: 'atencao',
      nota: 'A organização pediu ajustes. Corrija os campos marcados (em Meu cadastro e em Meu combo) e salve: ela recebe a alteração.' }
  }
  if (comboStatus === 'em_analise' || statusCadastro === 'cadastro_completo') {
    // O cadastro já foi para a organização, mas a edição passou a pedir mais (ex.: o horário no festival): não se diz "completo".
    if (faltam > 0) {
      return { chave: 'em_analise', texto: 'A organização está conferindo · falta informação', tom: 'atencao',
        nota: 'A organização já recebeu o seu cadastro, mas há informação nova a preencher. Complete o que falta e salve: ela recebe a alteração.' }
    }
    return { chave: 'em_analise', texto: 'Completo · a organização está conferindo', tom: 'andamento',
      nota: 'Ela confere e avisa aqui. Mudou alguma coisa? É só salvar: a organização recebe a alteração.' }
  }
  return faltam ? { chave: 'rascunho', texto: 'Em preenchimento', tom: 'neutro', nota: '' }
    : { chave: 'pronto', texto: 'Completo · a organização vai conferir', tom: 'andamento', nota: '' }
}

/** A linha de baixo do progresso: quantas informações faltam no cadastro inteiro (não é o mesmo que "% preenchido"). */
export function textoFaltam({ faltam = 0, chave = 'rascunho' } = {}) {
  if (faltam > 0) return faltam === 1 ? 'Falta 1 informação' : 'Faltam ' + faltam + ' informações'
  if (['encerrada', 'sem_edicao'].includes(chave)) return ''
  return 'Nenhuma informação faltando'
}

/**
 * O rótulo do salvamento automático. `texto` é o que o salvamento deixou ('' = nada ainda; "Salvo, menos …" = ficou
 * campo inválido de fora; o resto = gravado). O erro tem UMA voz só (o aviso com role="alert"): aqui é só o rótulo.
 */
export function rotuloSalvamento({ salvando = false, erro = false, texto: salvo = '' } = {}) {
  if (salvando) return { estado: 'salvando', texto: 'Salvando…', detalhe: '' }
  if (erro) return { estado: 'erro', texto: 'Não foi possível salvar', detalhe: '' }
  if (!salvo) return { estado: 'vazio', texto: '', detalhe: '' }
  if (/^Salvo, menos o que aguarda/.test(salvo)) return { estado: 'parcial', texto: salvo, detalhe: '' }
  // "Salvo, menos o CEP …" e "O horário de X não foi salvo: falta responder Sábado." (horário incompleto no seletor).
  if (/^Salvo, menos |não foi salvo: /.test(salvo)) return { estado: 'corrigir', texto: 'Há campos que precisam ser corrigidos', detalhe: salvo }
  return { estado: 'salvo', texto: 'Alterações salvas', detalhe: '' }
}
