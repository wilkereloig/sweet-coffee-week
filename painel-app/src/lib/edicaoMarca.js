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
import { canaisParaObjeto, canaisParaArray, precoNumero, valorInformado, NOMES_FALTANDO } from './cadastro.js'
import { mascaraWhatsApp, validarWhatsApp, whatsappNormalizado } from './participantes.js'

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
export const hhmm = (t) => texto(t).slice(0, 5)
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

/** Linhas do banco → uma unidade na tela. `pu` ou `un` podem faltar (sugestão / nova). */
export function unidadeDeLinhas(pu, un, disp = []) {
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
    horario_loja_texto: u.horario_loja_texto || '',
    verificada: !!u.coordenada_verificada_em,
    consumo_local: (pu && pu.consumo_local) || 'nao_informado',
    retirada: (pu && pu.retirada) || 'nao_informado',
    delivery_combo: (pu && pu.delivery_combo) || 'nao_informado',
    canais: canaisParaObjeto(pu && pu.canais_delivery),
    delivery_regioes: (pu && pu.delivery_regioes) || '',
    delivery_taxa: (pu && pu.delivery_taxa) || '',
    observacao_combo: (pu && pu.observacao_combo) || '',
    disponibilidade: (disp || []).filter((d) => !pu || d.participacao_unidade_id === pu.id).map(disponibilidadeDeLinha)
      .sort((a, b) => (a.data + a.abre).localeCompare(b.data + b.abre)),
  }
}

/** Corpo do PATCH/POST em `unidades`. Valor inválido FICA DE FORA (o campo mostra o erro). */
export function corpoUnidade(u) {
  const corpo = {
    nome_unidade: ouNulo(u.nome_unidade), logradouro: ouNulo(u.logradouro), numero: ouNulo(u.numero),
    complemento: ouNulo(u.complemento), bairro: ouNulo(u.bairro), cidade: ouNulo(u.cidade),
    uf: ouNulo(u.uf) && texto(u.uf).toUpperCase(), cep: soDigitos(u.cep) || null, referencia: ouNulo(u.referencia),
    whatsapp_publico: whatsappDigitos(u.whatsapp_publico) || null, whatsapp_autorizado: !!u.whatsapp_autorizado,
    horario_loja_texto: ouNulo(u.horario_loja_texto),
  }
  if (erroCep(u.cep)) delete corpo.cep
  if (erroUf(u.uf)) delete corpo.uf
  if (erroWhatsappUnidade(u.whatsapp_publico)) delete corpo.whatsapp_publico
  return corpo
}

// Cópia de conveniência para quem ainda lê participacao_unidades.endereco/bairro
// (lista da organização, Início, campos_cadastro). A tela edita `unidades`.
export const enderecoLegado = (u) => [texto(u.logradouro), texto(u.numero)].filter(Boolean).join(', ') || null

/** Corpo do PATCH/POST em `participacao_unidades` (só colunas com grant da marca). */
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
  }
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
  }
}

/** Nome para mostrar: nome da unidade, senão bairro, senão a posição. */
export function nomeDaUnidade(u, i) {
  return texto(u && u.nome_unidade) || texto(u && u.bairro) || 'Unidade ' + ((i || 0) + 1)
}

/** id do campo de uma unidade: a 1ª usa o nome genérico (o que a organização aponta). */
export const idCampoUnidade = (base, i) => base + (i ? '-' + (i + 1) : '')

/* ── Horário DO COMBO por dia do festival ─────────────────────────────────── */
export function disponibilidadeDeLinha(d) {
  return { id: d.id, data: d.data, abre: hhmm(d.abre), fecha: hhmm(d.fecha), observacao: d.observacao || '' }
}
export const corpoDisponibilidade = (d) => ({ abre: hhmm(d.abre), fecha: hhmm(d.fecha), observacao: ouNulo(d.observacao) })

/** Dias do festival, 'AAAA-MM-DD', de início a fim (inclusive). */
export function diasDoFestival(inicio, fim) {
  const re = /^(\d{4})-(\d{2})-(\d{2})/
  const a = re.exec(texto(inicio)); const b = re.exec(texto(fim))
  if (!a || !b) return []
  const t0 = Date.UTC(+a[1], +a[2] - 1, +a[3]); const t1 = Date.UTC(+b[1], +b[2] - 1, +b[3])
  const dias = []
  for (let t = t0; t <= t1 && dias.length < 62; t += 86400000) dias.push(new Date(t).toISOString().slice(0, 10))
  return dias
}

export function rotuloDia(data) {
  const d = new Date(data + 'T12:00:00')
  return isNaN(d) ? data : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

/** '' quando a faixa vale; senão o motivo (espelha o check fecha > abre). */
export function erroFaixa(abre, fecha) {
  if (!/^\d{2}:\d{2}$/.test(hhmm(abre)) || !/^\d{2}:\d{2}$/.test(hhmm(fecha))) return 'Informe a hora de abrir e a de fechar.'
  return hhmm(fecha) > hhmm(abre) ? '' : 'O horário de fechar precisa ser depois do de abrir.'
}

/** "Mesmo horário todos os dias": as linhas que substituem as da unidade. */
export function linhasMesmoHorario(participacaoUnidadeId, dias, abre, fecha, observacao) {
  return dias.map((data) => ({ participacao_unidade_id: participacaoUnidadeId, data, abre: hhmm(abre), fecha: hhmm(fecha), observacao: ouNulo(observacao) }))
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
/** Acréscimo vazio = não informado (null); "0" = sem custo. Nunca confundir os dois. */
export function corpoSubstituicao(s) {
  return {
    original: texto(s.original), alternativa: texto(s.alternativa), disponibilidade: s.disponibilidade,
    acrescimo: valorInformado(s.acrescimo) ? precoNumero(s.acrescimo) : null,
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

/* ── O que falta para enviar / publicar ───────────────────────────────────── */
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
    if (!(u.disponibilidade || []).length) f.push('unidade:' + id + ':horario')
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
    return { texto: 'Informar o horário do combo em ' + nome, bloco: 6, campo: idCampoUnidade('atendimento-horario', pos) }
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
