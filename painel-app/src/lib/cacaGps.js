/*
 * Caça aos Carimbos no painel: pedidos de revisão de presença (GPS) e resumo dos carimbos sem GPS.
 * Contrato: docs/cartoon-2026-2/15-caca-contrato-gps.md. Funções puras; o banco decide permissão, regras e 12 h.
 * Quem aprova ou nega é a organização, nunca a casa, e aprovar cria o carimbo com origem "excecao_painel".
 */

export const ESTADO_PEDIDO = Object.freeze({
  pendente: ['Aguardando decisão', 'andamento'],
  aprovado: ['Aprovado', 'ok'],
  negado: ['Negado', 'encerrado'],
})
export const rotuloPedido = (e) => (ESTADO_PEDIDO[e] ? ESTADO_PEDIDO[e][0] : String(e || ''))
export const tomPedido = (e) => (ESTADO_PEDIDO[e] ? ESTADO_PEDIDO[e][1] : 'neutro')

export const MOTIVO_PEDIDO = Object.freeze({
  sem_localizacao: 'Sem localização (negada, indisponível ou demorou)',
  imprecisa: 'GPS impreciso (margem acima de 300 m)',
  longe: 'Longe do ponto da casa',
  visita_anterior: 'Visita anterior à Caça',
  delivery: 'Delivery (pedido recebido em casa)',
})
export const rotuloMotivoPedido = (m) => MOTIVO_PEDIDO[m] || String(m || '')

export const FILTROS_PEDIDO = Object.freeze([['pendente', 'Aguardando decisão'], ['aprovado', 'Aprovados'], ['negado', 'Negados'], ['todos', 'Todos']])
export const filtrarPedidos = (itens, estado) => (itens || []).filter((p) => !estado || estado === 'todos' || p.estado === estado)

/** O que o celular informou na hora: o servidor só guarda distância e margem, nunca a posição. */
export function descricaoDoSinal(p) {
  if (p?.motivo === 'delivery') {
    const d = p.pedido_data ? String(p.pedido_data).split('-').reverse().join('/') : 'sem data'
    return `pedido de ${d}${p.pedido_ref ? ` (ref. ${p.pedido_ref})` : ''}, informado pela pessoa (sem prova de local)`
  }
  if (p?.motivo === 'visita_anterior') return p.visita_data ? `visita em ${String(p.visita_data).split('-').reverse().join('/')}, data informada pela pessoa` : 'visita anterior, sem data'
  const d = Number.isFinite(p?.distancia_m) ? `a ${p.distancia_m} m do ponto conferido` : 'sem posição enviada'
  const m = Number.isFinite(p?.precisao_m) ? `, margem de ±${p.precisao_m} m` : ''
  return d + m
}

/** Só pedido pendente tem ação. */
export const podeDecidir = (p) => !!p && p.estado === 'pendente' && (!p.aguardando_casa || (p.motivo === 'delivery' && p.via_pretendida === 'imagem'))

/** Delivery com código: quem confirma é a CASA, não a organização. */
export const aguardandoACasa = (p) => !!p && p.estado === 'pendente' && p.motivo === 'delivery' && p.via === 'casa' && p.via_pretendida !== 'imagem'

/** Texto da confirmação antes de decidir (a decisão não se desfaz por aqui). */
export function textoDaDecisao(p, decisao) {
  const quem = `${p.apelido} em ${p.casa}`
  if (p.motivo === 'delivery') {
    return decisao === 'aprovar'
      ? `Aprovar cria agora um carimbo de ${quem}, marcado como delivery aprovado pela organização. Ele conta a partir de agora (não muda voucher já apurado) e só vira casa validada depois que a pessoa avaliar o combo com o e-mail do mapa. Confira o relato, a data e a referência; a imagem é opcional.`
      : `Negar registra o motivo; a pessoa vê só que o pedido não foi aprovado (${quem}). Nada é carimbado.`
  }
  if (p.motivo === 'visita_anterior') {
    return decisao === 'aprovar'
      ? `Aprovar cria agora um carimbo de ${quem}, marcado como visita anterior. Ele conta a partir de agora (não muda voucher já apurado) e só vira casa validada depois que a pessoa avaliar o combo com o e-mail do mapa. Confira o caso antes.`
      : `Negar registra o motivo; a pessoa vê só que o pedido não foi aprovado (${quem}). Nada é carimbado.`
  }
  if (decisao === 'aprovar') {
    return `Aprovar cria agora um carimbo de ${quem}, marcado como exceção do painel. Ele entra no placar depois da avaliação do combo, respeita as 12 horas da casa e fica na Revisão sem GPS. Confira antes se o caso faz sentido.`
  }
  return `Negar registra o motivo e a pessoa vê só que o pedido não foi aprovado (${quem}). Nada é carimbado. Ela só pode pedir de novo daqui a 12 horas.`
}

/** Faixa curta nas abas de apuração: quantos carimbos entram sem prova de GPS e quantos pedidos esperam. Vazio = nada a mostrar. */
export function textoSemGps(r) {
  if (!r) return ''
  const total = Number(r.total) || 0
  const contam = Number(r.contam) || 0
  const pend = Number(r.pedidos_pendentes) || 0
  const partes = []
  if (total > 0) partes.push(`${total} carimbo${total === 1 ? '' : 's'} sem prova de GPS (${contam} ${contam === 1 ? 'conta' : 'contam'} no progresso)`)
  if (pend > 0) partes.push(`${pend} pedido${pend === 1 ? '' : 's'} de presença aguardando decisão`)
  return partes.join(' · ')
}
