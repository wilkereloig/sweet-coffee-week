/*
 * Press Kit da edição — lógica pura da lista (Contatos › Press Kit e a ficha da pessoa).
 * Sem DOM nem rede; testada em tests/painel-app-presskit.test.mjs.
 *
 * "Retirar da lista" = status `cancelado`: nada se apaga (o registro, as datas e o endereço ficam), a pessoa
 * sai da lista e dos contadores, aparece em "Retirado da lista" e dá para colocar de volta.
 */

// A ordem do trabalho: da sugestão à entrega. A lista é mostrada nesta ordem.
export const ORDEM = ['constou_na_lista', 'selecionado', 'confirmado', 'enviado', 'entregue', 'nao_entregue', 'cancelado']

export const RETIRADO = 'cancelado'

// O PRÓXIMO passo de cada status: [status, texto do botão].
export const PROXIMO = {
  constou_na_lista: ['selecionado', 'Selecionar'],
  selecionado: ['confirmado', 'Preparar'],
  confirmado: ['enviado', 'Saiu para entrega'],
  enviado: ['entregue', 'Entregue'],
  nao_entregue: ['enviado', 'Reenviar'],
}

// Um passo atrás, para corrigir clique errado. Sugerido e Selecionado não voltam: saem pela retirada.
export const ANTERIOR = {
  confirmado: 'selecionado',
  enviado: 'confirmado',
  entregue: 'enviado',
  nao_entregue: 'enviado',
}

// O kit já saiu da mão da organização: retirar daí pede confirmação.
export const jaSaiu = (status) => ['enviado', 'entregue', 'nao_entregue'].includes(status)

// Na lista desta edição = tem registro e não foi retirado.
export const estaNaLista = (c) => !!(c && c.atual && c.atual.status !== RETIRADO)

// Quem recebeu em edições anteriores, ainda não tem registro nesta e não está arquivado. Retirar uma sugestão cria o
// registro `cancelado`, então ela sai daqui sem sumir (fica em "Retirado da lista").
export const sugestoesDaLista = (lista) => (lista || []).filter((c) => !c.atual && Number(c.recebimentos) > 0 && c.ativo !== false)

// `situacao`: 'ativos' (na lista) · 'todos' · um status.
export function filtrarLista(lista, situacao) {
  return (lista || [])
    .filter((c) => c.atual)
    .filter((c) => situacao === 'todos' || (situacao === 'ativos' ? c.atual.status !== RETIRADO : c.atual.status === situacao))
    .sort((a, b) => ORDEM.indexOf(a.atual.status) - ORDEM.indexOf(b.atual.status) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
}

export const contarSituacao = (lista, status) => (lista || []).filter((c) => c.atual && c.atual.status === status).length
