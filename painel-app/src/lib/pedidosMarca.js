/*
 * Lógica pura da vista Pedidos (marca) — porta fiel de
 * public/painel/index.html: dataCurta (~4688), diasAte/prazoTexto
 * (~4708-4723) e o filtro/estado de desenharSolicitacoes (~5112-5144).
 * Sem DOM: devolve dados, o componente decide o JSX.
 */

import { diasCalendario } from './painelFormat.js'

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
