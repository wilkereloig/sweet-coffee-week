/*
 * Carimbo de delivery — lado da CASA (painel da participante). Lógica pura (testada em tests/painel-app-delivery.test.mjs).
 * A casa digita o código temporário que o cliente mandou, vê o essencial do pedido e confirma que entregou. Vale só para a
 * PRÓPRIA casa (o banco procura o código só entre as participações da conta logada) e nunca aprova presença nem voucher.
 * O servidor devolve `{ ok:false, motivo }` (não exceção) para falhas esperadas; tentativas erradas são limitadas (8 em 15 min).
 */

/** O que a pessoa digitou → 6 caracteres de A–Z e 0–9 (maiúsculos; hífen e espaço somem). */
export const normalizarCodigoDelivery = (t) => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)

/** 'ABC123' → 'ABC-123' (só para exibir no campo). */
export const formatarCodigoDelivery = (c) => (c.length > 3 ? `${c.slice(0, 3)}-${c.slice(3)}` : c)

export const codigoDeliveryCompleto = (t) => normalizarCodigoDelivery(t).length === 6

export const RECADO_DELIVERY = Object.freeze({
  codigo_invalido: 'Este código não é desta casa ou não existe. Confira com o cliente e digite de novo.',
  codigo_usado: 'Este código já foi usado: o carimbo desse pedido já foi registrado.',
  codigo_expirado: 'Este código venceu. Peça ao cliente para gerar um novo no mapa dele.',
  bloqueado: 'Muitas tentativas com código errado. Aguarde alguns minutos e tente de novo.',
  nao_autorizado: 'Entre no painel com a conta da casa para confirmar.',
  nao_aberta: 'A Caça ainda não está aberta para carimbos.',
  encerrada: 'A avaliação da edição já terminou; não dá mais para registrar carimbos.',
  casa_sem_combo: 'Esta casa não está com o combo disponível na Caça, então o carimbo não pode ser registrado.',
  cedo: 'Este cliente já tem carimbo recente nesta casa (intervalo de 12 horas). Tente de novo depois do prazo.',
})

const SEM_CONEXAO = /failed to fetch|network|rede|offline|timeout|abort/i

/** Motivo do servidor (ou erro de rede) → texto para o balcão. Desconhecido = nada foi registrado. */
export function recadoDoDelivery(motivo) {
  const m = String(motivo || '')
  if (RECADO_DELIVERY[m]) return RECADO_DELIVERY[m]
  if (SEM_CONEXAO.test(m)) return 'Sem conexão agora. Nada foi registrado: confira o sinal e tente de novo.'
  return 'Não deu para concluir agora. Nada foi registrado; tente de novo.'
}

/** Linhas do resumo do pedido (só o essencial; nunca e-mail, telefone ou endereço do cliente). */
export function linhasDoPedido(p) {
  if (!p) return []
  const data = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(p.pedido_data || ''))
  return [
    ['Cliente', p.apelido || '—'],
    ['Unidade', p.unidade || 'Única da casa'],
    ['Data do pedido', data ? `${Number(data[3])}/${Number(data[2])}/${data[1]}` : '—'],
    ['Referência', p.pedido_ref || 'Não informada'],
    ['Avaliação do combo', p.avaliou ? 'Já avaliou' : 'Ainda não avaliou (o carimbo só vale depois)'],
  ]
}
