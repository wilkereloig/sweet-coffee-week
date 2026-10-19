/*
 * Lógica pura das telas da marca ligadas à sincronização (19/10/2026). Sem DOM,
 * sem rede, sem React: o que uma releitura silenciosa NÃO pode estragar de quem
 * está digitando, decidido em funções que dão para testar com node --test.
 *   · Início: de que dia é o campo "combos vendidos" (a virada da meia-noite);
 *   · Pedidos: rascunho de resposta que sobrevive a mudança feita pela organização;
 *   · Mensagens: o que ainda falta marcar como lido (e nunca em laço).
 */
import { chaveDia } from './hoje.js'

// ── Início: venda do dia ─────────────────────────────────────────────────────

/**
 * O formulário acompanha o dia de hoje. Só fica preso a outro dia enquanto há
 * número digitado e não salvo: se a meia-noite passar nesse intervalo, o que a
 * pessoa digitou continua sendo do dia em que ela começou (não vira venda de outro).
 */
export function diaDoFormulario({ hoje, atual, sujo }) {
  return sujo && atual ? atual : hoje
}

/** "Hoje", "Ontem" ou dd/mm — o dia a que o campo se refere. */
export function rotuloDoDia(dia, hoje) {
  if (!dia || dia === hoje) return 'Hoje'
  const ontem = new Date(hoje + 'T00:00:00')
  ontem.setDate(ontem.getDate() - 1)
  if (chaveDia(ontem) === dia) return 'Ontem'
  return dia.slice(8, 10) + '/' + dia.slice(5, 7)
}

/** Quantidade lançada naquele dia, como texto de campo ('' = nada lançado). */
export function textoDaVenda(vendas, dia) {
  const v = (vendas || []).find((x) => x.dia === dia)
  return v ? String(v.quantidade) : ''
}

/** Milissegundos até a próxima virada de dia (um segundo depois, para cair no dia novo). */
export function msAteMeiaNoite(agora) {
  const proxima = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 0, 0, 1)
  return Math.max(1000, proxima.getTime() - agora.getTime())
}

/** Lista de vendas com a linha gravada no lugar certo (mais recente primeiro). */
export function comVendaGravada(vendas, linha) {
  const outras = (vendas || []).filter((v) => v.id !== linha.id)
  return [...outras, linha].sort((a, b) => (a.dia < b.dia ? 1 : a.dia > b.dia ? -1 : 0))
}

// ── Pedidos: rascunho de resposta ────────────────────────────────────────────

const feito = (estado) => !!estado && estado.estado === 'respondido'
const temTexto = (r) => !!r && String(r.texto || '').trim() !== ''

/** O que da solicitação (e do estado dela) a pessoa tinha diante dos olhos ao começar a escrever. */
export function fotoDoPedido(s, estado) {
  return {
    titulo: (s && s.titulo) || '',
    texto: (s && s.texto) || '',
    prazo_em: (s && s.prazo_em) || null,
    prioridade: (s && s.prioridade) || null,
    respondido: feito(estado),
    resposta: (estado && estado.resposta) || '',
  }
}

const CAMPO_PEDIDO = { titulo: 'o título', texto: 'o texto', prazo_em: 'o prazo', prioridade: 'a prioridade' }

/**
 * Comparação entre o que a pessoa via ao começar a escrever (`visto`) e o que o
 * servidor mostra agora. null = nada mudou.
 */
export function mudancaDoPedido(visto, s, estado) {
  if (!visto) return null
  const agora = fotoDoPedido(s, estado)
  const campos = Object.keys(CAMPO_PEDIDO).filter((c) => agora[c] !== visto[c])
  const fechado = agora.respondido && !visto.respondido
  const respostaMudou = !fechado && agora.respondido && agora.resposta !== visto.resposta
  if (!fechado && !respostaMudou && !campos.length) return null
  return { fechado, respostaMudou, campos, comResposta: !!agora.resposta }
}

const listar = (itens) => (itens.length <= 1 ? itens.join('') : itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1])

/** Frase para a pessoa, sem jargão. O texto que ela digitou nunca é tocado. */
export function textoDaMudanca(m) {
  if (!m) return ''
  const partes = []
  if (m.fechado) {
    partes.push(m.comResposta
      ? 'Este pedido já foi respondido enquanto você escrevia — veja a resposta acima.'
      : 'A organização deu este pedido como resolvido enquanto você escrevia.')
  } else if (m.respostaMudou) {
    partes.push('A resposta deste pedido foi atualizada enquanto você escrevia — veja acima.')
  }
  if (m.campos.length) partes.push('A organização alterou ' + listar(m.campos.map((c) => CAMPO_PEDIDO[c])) + ' do pedido. Releia antes de enviar.')
  partes.push('O que você escreveu continua aqui' + (m.fechado ? ': envie como complemento, se ainda fizer sentido, ou apague.' : '.'))
  return partes.join(' ')
}

/**
 * Para responder × respondidos. Pedido que foi dado como respondido por fora
 * ENQUANTO a pessoa escrevia nele fica onde estava: trocar de lista desmonta o
 * campo, e a pessoa perderia o foco (e as letras seguintes) no meio da frase.
 * Rascunho começado já numa resposta feita (complemento) não muda de lugar.
 */
export function repartirPedidos(minhas, estados, rascunhos) {
  const pendentes = []
  const feitos = []
  for (const s of minhas || []) {
    const r = rascunhos && rascunhos[s.id]
    const preso = temTexto(r) && !!r.visto && !r.visto.respondido
    ;(feito(estados && estados[s.id]) && !preso ? feitos : pendentes).push(s)
  }
  return { pendentes, feitos }
}

/** Rascunhos com texto cujo pedido saiu da lista (retirado pela organização, outra edição). */
export function rascunhosSemPedido(minhas, rascunhos) {
  const ids = new Set((minhas || []).map((s) => s.id))
  return Object.entries(rascunhos || {})
    .filter(([id, r]) => !ids.has(id) && temTexto(r))
    .map(([id, r]) => ({ id, titulo: (r.visto && r.visto.titulo) || 'Pedido', texto: r.texto }))
}

// ── Mensagens ────────────────────────────────────────────────────────────────

/**
 * Mensagens da organização que ainda estão sem leitura e que esta tela AINDA não
 * tentou marcar. Sem o filtro `tentadas`, uma leitura que o banco não aceitasse
 * (mensagem que a RPC não alcança) viraria laço: marcar → anunciar → reler → marcar.
 */
export function idsParaMarcarLidas(msgs, tentadas) {
  return (msgs || [])
    .filter((m) => m.de === 'organizacao' && !m.lida_em && !(tentadas && tentadas.has(m.id)))
    .map((m) => m.id)
}
