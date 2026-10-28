/*
 * Lógica pura da vista Pedidos (marca) — porta fiel de
 * public/painel/index.html: dataCurta (~4688), diasAte/prazoTexto
 * (~4708-4723) e o filtro/estado de desenharSolicitacoes (~5112-5144).
 * Sem DOM: devolve dados, o componente decide o JSX.
 */

import { diasCalendario } from './painelFormat.js'
import { dataBr, textoDoPrazo, rotuloDoCampo, resumoSolicitacoes } from './inicioMarca.js'
import { PRAZO_URGENTE_DIAS, blocoDoCampo, linkDoCampo, vistaDoBloco, vistaDoPedido } from './guia.js'

export function dataCurta(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function prazoTexto(iso, agora = Date.now()) {
  const n = diasCalendario(iso, agora)
  if (n === null) return { texto: '', classe: '' }
  if (n < 0) return { texto: 'venceu em ' + dataCurta(iso), classe: 'vencido' }
  if (n === 0) return { texto: 'vence hoje', classe: 'vencido' }
  if (n === 1) return { texto: 'falta 1 dia', classe: 'andamento' }
  if (n <= 7) return { texto: 'faltam ' + n + ' dias', classe: 'andamento' }
  return { texto: 'até ' + dataCurta(iso), classe: '' }
}

// Um pedido geral de OUTRA edição não é meu. `edicao_codigo` nulo é aviso que
// vale sempre (regulamento, canal de contato). Pedido individual é de UMA
// participação: a RLS devolve os de todas as edições da marca, e o de uma
// edição passada não pode aparecer como pendência desta.
export function minhasSolicitacoes(lista, participacao) {
  return (lista || []).filter((s) => {
    if (s.escopo === 'geral' && s.edicao_codigo && s.edicao_codigo !== (participacao && participacao.edicao_codigo)) return false
    if (s.escopo !== 'geral' && s.participacao_id !== (participacao && participacao.id)) return false
    return true
  })
}

export function mapaRespondidas(estados) {
  const mapa = {}
  ;(estados || []).forEach((e) => { if (e.estado === 'respondido') mapa[e.solicitacao_id] = true })
  return mapa
}

/*
 * Tela de Solicitações da marca (22/10/2026) — o que a TELA decide, em lógica pura.
 * O prazo e o resumo vêm de inicioMarca.js (os mesmos do Início); os destinos, de guia.js.
 * `prazoTexto` acima fica para quem já o usa; a tela nova escreve o prazo por `descreverPrazo`.
 */
const mili = (agora) => (agora instanceof Date ? agora.getTime() : agora)
const respondido = (estados, id) => !!(estados && estados[id] && estados[id].estado === 'respondido')

/**
 * O prazo em palavras, com a data no fuso do aparelho: "vence amanhã (23/10/2026)",
 * "prazo vencido em 20/10/2026", "vence em 5 dias (27/10/2026)". `tom`: o que o selo e o ícone dizem.
 */
export function descreverPrazo(iso, agora = new Date()) {
  const t = mili(agora)
  const dias = diasCalendario(iso, t)
  if (dias === null) return { tem: false, texto: 'sem prazo definido', data: '', dias: null, vencido: false, urgente: false, tom: 'neutro' }
  const data = dataBr(iso)
  const texto = textoDoPrazo(iso, t) + (dias === 0 || dias === 1 ? ' (' + data + ')' : '')
  return { tem: true, texto, data, dias, vencido: dias < 0, urgente: dias <= PRAZO_URGENTE_DIAS, tom: dias <= PRAZO_URGENTE_DIAS ? 'atencao' : dias <= 7 ? 'andamento' : 'neutro' }
}

/**
 * Onde o pedido está na vida da marca: respondido (o banco diz), em andamento (há resposta começada
 * e NÃO enviada, só neste aparelho — o banco não tem esse estado) ou pendente.
 */
export function situacaoDoPedido(estado, rascunho) {
  if (estado && estado.estado === 'respondido') return 'respondido'
  return rascunho && String(rascunho.texto || '').trim() ? 'andamento' : 'pendente'
}
export const SITUACAO = {
  pendente: { texto: 'Pendente', tom: 'atencao' },
  andamento: { texto: 'Resposta em andamento', tom: 'andamento' },
  respondido: { texto: 'Respondido', tom: 'ok' },
}

/**
 * Para responder: importantes e os de prazo curto (ou vencido) primeiro, do prazo mais próximo ao mais longe;
 * depois os demais pelo prazo; sem prazo por último, os mais novos antes.
 */
export function ordenarPendentes(lista, agora = new Date()) {
  const t = mili(agora)
  return (lista || [])
    .map((s) => { const dias = diasCalendario(s.prazo_em, t); return { s, dias, alta: s.prioridade === 'importante' || (dias !== null && dias <= PRAZO_URGENTE_DIAS) } })
    .sort((a, b) => (b.alta - a.alta)
      || ((a.dias ?? Infinity) - (b.dias ?? Infinity))
      || ((Date.parse(b.s.created_at) || 0) - (Date.parse(a.s.created_at) || 0)))
    .map((x) => x.s)
}

/** Respondidas: a resposta mais recente primeiro (pedido dado como resolvido por fora usa a data de criação). */
export function ordenarRespondidas(lista, estados) {
  const t = (s) => Date.parse((estados && estados[s.id] && estados[s.id].respondido_em) || s.created_at) || 0
  return [...(lista || [])].sort((a, b) => t(b) - t(a))
}

/** "2 solicitações abertas" + a de prazo mais próximo; `null` se não há nenhuma aberta. A conta é a do Início (estado ≠ respondido). */
export const resumoDaLista = (minhas, estados, agora = new Date()) =>
  resumoSolicitacoes((minhas || []).map((s) => ({ ...s, estado: respondido(estados, s.id) ? 'respondido' : 'pendente' })), agora)

const AREA_DO_BLOCO = {
  estabelecimento: 'Meu cadastro (dados da marca)', combo: 'Meu combo', item_doce: 'Meu combo (o doce)',
  item_salgado: 'Meu combo (o salgado)', item_bebida: 'Meu combo (a bebida)', fotos: 'Fotos', arquivo: 'Arquivos',
}
const NOME_DA_VISTA = { cadastro: 'Meu cadastro', combo: 'Meu combo', fotos: 'Fotos', arquivos: 'Arquivos' }

/** Em que parte do painel o pedido mexe, em português: "Meu combo › Bolo · Descrição" ou "Fotos". Pedido geral: vazio. */
export function ondeNoPainel(s, itens = []) {
  const campo = rotuloDoCampo(s && s.campo, itens)
  if (campo) {
    const bloco = blocoDoCampo(s.campo)
    return (bloco === null ? '' : NOME_DA_VISTA[vistaDoBloco(bloco)] + ' › ') + campo
  }
  return AREA_DO_BLOCO[s && s.bloco] || ''
}

/** Para onde o botão leva (o link é o que `interpretarLinkMarca` entende). Pedido geral não tem destino. */
export function destinoDoPedido(s) {
  const bloco = blocoDoCampo(s && s.campo)
  if (s && s.campo && bloco !== null) return { link: linkDoCampo(bloco, s.campo), rotulo: 'Ir para o campo' }
  const vista = vistaDoPedido(s && s.bloco)
  return vista === 'inicio' ? null : { link: vista, rotulo: 'Abrir ' + NOME_DA_VISTA[vista] }
}

/** `pedidos/<id>`: onde o pedido está — 'pendente', 'respondido' (a tela abre a gaveta das respondidas) ou 'ausente'. */
export function lugarDoPedido(id, pendentes, feitos) {
  if ((pendentes || []).some((s) => s.id === id)) return 'pendente'
  return (feitos || []).some((s) => s.id === id) ? 'respondido' : 'ausente'
}

/* ── Resposta começada e ainda não enviada: fica NESTE aparelho ──────────────────────────────────────────────────
 * O texto mora em Pedidos.jsx (por id do pedido) e se perdia ao sair da tela — o botão "Ir para o campo" leva a outra
 * vista, que desmonta esta. Guardamos no sessionStorage DA ABA (some ao fechar; nada vai ao banco), numa chave por
 * participação: um pedido GERAL tem o mesmo id para todas as marcas, então a chave sem a participação deixaria a
 * resposta de uma marca à vista de outra que entrasse na mesma aba. Só entra o que tem texto; ao enviar, apagar o
 * campo apaga a entrada. Tudo em try/catch: armazenamento bloqueado = a tela funciona, só sem a memória.
 */
export const PREFIXO_RASCUNHO_PEDIDOS = 'scw_marca_rascunho_pedidos_'
export const chaveDosRascunhos = (participacaoId) => PREFIXO_RASCUNHO_PEDIDOS + participacaoId
const LIMITE_RESPOSTA = 4000   // o mesmo `maxLength` do campo (e o teto do banco)
const armazem = () => { try { return typeof sessionStorage === 'undefined' ? null : sessionStorage } catch { return null } }
const comTexto = (r) => !!r && typeof r.texto === 'string' && r.texto.trim() !== ''

/** Há alguma resposta escrita e não enviada? (é o que o painel declara como trabalho pendente) */
export const temRascunho = (rascunhos) => Object.values(rascunhos || {}).some(comTexto)

/** Rascunhos guardados desta chave: `{ [id do pedido]: { texto, visto } }`, só o que tem texto. Ilegível = nenhum. */
export function lerRascunhos(chave, st = armazem()) {
  if (!st || !chave) return {}
  try {
    const bruto = JSON.parse(st.getItem(chave) || 'null')
    if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return {}
    const saida = {}
    for (const [id, r] of Object.entries(bruto)) {
      if (comTexto(r)) saida[id] = { texto: r.texto.slice(0, LIMITE_RESPOSTA), visto: r.visto && typeof r.visto === 'object' ? r.visto : null }
    }
    return saida
  } catch { return {} }
}

/** Guarda os rascunhos com texto; nenhum = apaga a chave (sem lixo no armazenamento). */
export function guardarRascunhos(chave, rascunhos, st = armazem()) {
  if (!st || !chave) return
  try {
    const saida = {}
    for (const [id, r] of Object.entries(rascunhos || {})) if (comTexto(r)) saida[id] = { texto: r.texto, visto: r.visto || null }
    if (Object.keys(saida).length) st.setItem(chave, JSON.stringify(saida))
    else st.removeItem(chave)
  } catch { /* cota cheia ou bloqueado: a resposta segue na tela */ }
}

/** "Sair" / troca de conta: tira todos os rascunhos de resposta deste navegador (mesma ideia de `limparRascunhosSocial`). */
export function limparRascunhosPedidos(st = armazem()) {
  if (!st) return
  try { for (const k of Object.keys(st)) if (k.startsWith(PREFIXO_RASCUNHO_PEDIDOS)) st.removeItem(k) } catch { /* nada a limpar */ }
}
