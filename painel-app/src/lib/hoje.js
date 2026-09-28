/*
 * Lógica pura da vista Hoje (marca) — porte de public/painel/index.html:
 * blocosPendentes (~5299) e chaveDia (~5250). Sem import de DOM/rede, pra dar
 * pra testar com node --test.
 *
 * `blocosPendentes` agora é `blocosPendentesDeLinhas` de lib/cadastro.js —
 * a mesma regra dos 5 blocos que a vista Cadastro usa para editar, aqui só
 * lida (CLAUDE.md §5.2: uma fonte só para "o que falta no cadastro").
 */
import { blocosPendentesDeLinhas } from './cadastro.js'

export function naoVazio(s) {
  return !!(s && String(s).trim())
}

export const blocosPendentes = blocosPendentesDeLinhas

// yyyy-mm-dd LOCAL, não toISOString() (UTC vira o dia errado à noite, perto
// da virada).
export function chaveDia(d) {
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

/*
 * "Próximos passos" do Hoje — o que a marca precisa fazer agora, em ordem de
 * urgência, cada um com o destino exato no painel. E o que já foi feito, para
 * a pessoa ver o caminho andado. Pura: recebe os números, devolve a lista.
 */
export function proximosPassos({
  semParticipacao = false, faltam = [], statusCadastro = '', pedidosPendentes = 0,
  prazoMaisProximo = null, msgsNaoLidas = 0, sessao = null, vagasAbertas = 0,
  arquivosParaLer = 0, agora = Date.now(),
  // Desde a evolução de 29/09/2026 (tudo opcional — sem estes dados o
  // resultado é o mesmo de antes):
  momento = 'indefinido', vendaHojeRegistrada = true, tema = null, combo = null,
  fotoLiberacao = null, prazoCombo = null,
} = {}) {
  const passos = []
  const feitos = []
  if (semParticipacao) {
    passos.push({ chave: 'espera', texto: 'Aguarde a organização abrir a sua participação', detalhe: 'O formulário do cadastro aparece aqui quando abrir. Você não precisa fazer nada agora.', tom: 'normal' })
    if (msgsNaoLidas) passos.unshift({ chave: 'msg', texto: msgsNaoLidas === 1 ? 'Ler a mensagem da organização' : 'Ler ' + msgsNaoLidas + ' mensagens da organização', tom: 'urgente', destino: 'mensagens' })
    return { passos, feitos }
  }

  if (msgsNaoLidas) passos.push({ chave: 'msg', texto: msgsNaoLidas === 1 ? 'Ler a mensagem da organização' : 'Ler ' + msgsNaoLidas + ' mensagens da organização', tom: 'urgente', destino: 'mensagens' })

  if (pedidosPendentes) {
    const vence = prazoMaisProximo ? Math.ceil((new Date(prazoMaisProximo).getTime() - agora) / 864e5) : null
    passos.push({
      chave: 'pedidos',
      texto: pedidosPendentes === 1 ? 'Responder 1 pedido da organização' : 'Responder ' + pedidosPendentes + ' pedidos da organização',
      detalhe: vence === null ? null : vence < 0 ? 'Há prazo vencido.' : vence === 0 ? 'Um prazo vence hoje.' : vence <= 3 ? 'O prazo mais próximo vence em ' + vence + (vence === 1 ? ' dia.' : ' dias.') : null,
      tom: vence !== null && vence <= 3 ? 'urgente' : 'normal',
      destino: 'pedidos',
    })
  }

  // Durante o festival, a venda do dia vem antes de tudo o que não é conversa.
  if (momento === 'durante' && !vendaHojeRegistrada) {
    passos.push({ chave: 'venda', texto: 'Registrar os combos vendidos hoje', detalhe: 'Leva menos de um minuto, logo abaixo.', tom: 'urgente', destino: 'hoje/venda' })
  }

  if (tema && tema.status === 'recusado') {
    passos.push({ chave: 'tema', texto: 'Escolher outro tema', detalhe: tema.observacao || 'A organização pediu outro tema para o seu combo.', tom: 'urgente', destino: 'cadastro' })
  } else if (tema && tema.status === 'aprovado') {
    feitos.push({ chave: 'tema', texto: 'Tema aprovado: ' + tema.tema })
  } else if (tema && tema.status === 'proposto') {
    feitos.push({ chave: 'tema', texto: 'Tema enviado — em análise pela organização' })
  }

  if (combo && combo.status === 'correcao_solicitada') {
    passos.push({ chave: 'combo', texto: 'Ajustar o combo', detalhe: combo.nota || 'A organização pediu um ajuste.', tom: 'urgente', destino: 'cadastro' })
  }

  // Prazo do combo (vem do cronograma da edição, nunca de constante).
  const prazoDias = prazoCombo ? Math.round((new Date(prazoCombo + 'T23:59:00').getTime() - agora) / 864e5) : null
  const detalhePrazo = prazoDias === null ? '' : prazoDias < 0 ? ' O prazo do combo já passou.' : prazoDias === 0 ? ' O prazo do combo vence hoje.' : prazoDias <= 5 ? ' O prazo do combo vence em ' + prazoDias + (prazoDias === 1 ? ' dia.' : ' dias.') : ''
  const prazoApertado = prazoDias !== null && prazoDias <= 3

  if (combo && combo.status === 'correcao_solicitada') {
    // o passo do ajuste já cobre o cadastro
  } else if (faltam.length) {
    passos.push({ chave: 'cadastro', texto: 'Completar o cadastro', detalhe: 'Falta: ' + faltam.join(', ') + '.' + detalhePrazo, tom: prazoApertado ? 'urgente' : 'normal', destino: 'cadastro' })
  } else if (statusCadastro !== 'cadastro_completo') {
    passos.push({ chave: 'concluir', texto: 'Concluir o cadastro', detalhe: 'Está tudo preenchido. Toque em "Concluir cadastro" para entregar à organização.', tom: 'urgente', destino: 'cadastro' })
  } else {
    feitos.push({ chave: 'cadastro', texto: 'Cadastro entregue à organização' })
    if (combo && combo.status === 'aprovado') feitos.push({ chave: 'combo', texto: 'Combo aprovado' })
    else if (combo && combo.status === 'em_analise') feitos.push({ chave: 'combo', texto: 'Combo em análise pela organização' })
  }

  if (sessao && sessao.status !== 'cancelada' && sessao.status !== 'aberto') {
    const futura = new Date(sessao.data_hora).getTime() >= agora
    if (sessao.status === 'realizada' || !futura) feitos.push({ chave: 'fotos', texto: 'Sessão de fotos realizada' })
    else passos.push({ chave: 'fotos', texto: 'Preparar o combo para a sessão de fotos', detalhe: null, quando: sessao.data_hora, local: sessao.local || null, tom: 'normal', destino: 'fotos' })
  } else if (vagasAbertas) {
    passos.push({ chave: 'vaga', texto: 'Escolher o horário da sessão de fotos', detalhe: vagasAbertas + (vagasAbertas === 1 ? ' horário disponível.' : ' horários disponíveis.'), tom: 'urgente', destino: 'cadastro/fotos' })
  } else if (fotoLiberacao === 'nao_liberado' || fotoLiberacao === 'pendente') {
    // Não diz o motivo: a regra de liberação é da organização (instrução de
    // 28/09/2026 — não presumir que é só pagamento).
    passos.push({ chave: 'foto_liberacao', texto: 'Sessão de fotos aguardando liberação', detalhe: 'A organização libera o agendamento. Dúvidas? Escreva em Mensagens.', tom: 'normal', destino: 'mensagens' })
  }

  if (arquivosParaLer) passos.push({ chave: 'ler', texto: arquivosParaLer === 1 ? 'Confirmar a leitura de 1 documento' : 'Confirmar a leitura de ' + arquivosParaLer + ' documentos', tom: 'normal', destino: 'arquivos' })

  const ordem = { urgente: 0, normal: 1 }
  passos.sort((a, b) => ordem[a.tom] - ordem[b.tom])
  return { passos, feitos }
}
