/*
 * Caça aos Carimbos — textos do GPS e do pedido de revisão de presença (docs/cartoon-2026-2/15-caca-gps-excecao.md).
 * Regras que os textos repetem: o carimbo confere que a pessoa está na casa e não guarda a posição; o servidor aceita até
 * 200 m + a margem do GPS (no máximo 300 m); o pedido de revisão NÃO conta nada até a organização aprovar.
 */
export const GPS = {
  buscando: (i, n) => `Procurando o sinal de GPS (tentativa ${i} de ${n})…`,
  buscandoDica: 'Fique parado, perto da entrada ou do balcão. Dentro de shopping o sinal chega devagar.',
  dicas: {
    titulo: 'Para o GPS pegar melhor',
    itens: [
      'Ligue a localização do celular e a precisão alta: "Localização de alta precisão" no Android, "Localização precisa" no iPhone.',
      'Se estiver dentro de shopping ou de um andar fechado, saia para perto da fachada, da porta ou de uma janela e tente de novo.',
      'Espere uns segundos parado antes de tocar em "Carimbar".',
    ],
  },
  // Antes do toque em "Carimbar aqui": o celular vai perguntar. Quem não sabe por quê costuma tocar em "Bloquear".
  antes: {
    titulo: 'O celular vai perguntar sobre a localização.',
    texto: 'Toque em "Permitir": é só para conferir que você está na casa, e a sua posição não é guardada.',
  },
  // Localização já bloqueada neste navegador (descoberto antes do toque): a ajuda aparece de cara, sem gastar o toque.
  jaBloqueada: 'Este navegador está com a localização bloqueada para o site.',
  liberada: 'Localização liberada. Toque em "Carimbar aqui".',
  outroAparelho: 'Estou em outro aparelho',
  longeAjuda: (casa, dist, prec) => `Seu celular está a ${dist} da ${casa}${prec ? `, com margem de cerca de ${prec}` : ''}. Chegue perto do balcão e tente de novo.`,
  pedido: {
    abrir: 'Estou na casa e o GPS não funciona',
    titulo: 'Peça uma revisão de presença',
    leadSemPonto: 'O ponto desta casa ainda não foi conferido no mapa, então o QR sozinho não vale carimbo. A organização pode conferir a sua visita: nada é contado até alguém aprovar.',
    lead: 'Se o GPS não deixa carimbar mesmo com você na casa, a organização pode olhar o seu caso. O pedido não vale carimbo por si só: nada é contado até alguém da organização aprovar.',
    quemDecide: 'Quem decide é a organização do festival, nunca a casa. O funcionário da loja não precisa fazer nada.',
    notaRotulo: 'Quer contar algo? (opcional)',
    notaAjuda: 'Até 200 caracteres. Exemplo: "Estou no segundo piso do shopping, sem sinal."',
    notaMax: 200,
    enviar: 'Enviar pedido à organização',
    enviando: 'Enviando…',
    cancelar: 'Voltar',
    enviadoTitulo: 'Pedido enviado',
    enviadoTexto: (casa) => `A organização vai olhar o seu pedido para a ${casa}. Enquanto isso, nada foi carimbado. Se for aprovado, o carimbo aparece no seu mapa (ainda é preciso avaliar o combo para ele valer).`,
    emAnalise: (casa) => `Seu pedido de revisão para a ${casa} está em análise. Nada foi carimbado ainda.`,
    aprovadoNota: (casa) => `Seu pedido para a ${casa} foi aprovado: o carimbo está no seu mapa.`,
    negadoNota: (casa) => `Seu pedido para a ${casa} não foi aprovado. Se você está na casa, tente carimbar de novo com o GPS ligado.`,
    privacidade: 'O pedido leva só a distância e a margem do GPS, que o servidor calcula agora. A sua posição não é guardada.',
  },
  // Motivos de recusa do pedido (caca_excecao_pedir).
  pedidoRecusa: {
    email_nao_confirmado: 'Para pedir revisão, confirme o seu e-mail primeiro. O pedido vira carimbo se a organização aprovar, e isso só vale para quem provou o e-mail. Confirmar leva um minuto, na central.',
    nao_precisa: 'Neste caso o carimbo normal funciona: toque em "Tentar de novo".',
    ja_pedido: (quando) => `Você já pediu revisão para esta casa há pouco. ${quando ? `Dá para pedir de novo ${quando}.` : ''}`.trim(),
    cedo: (quando) => `Você já carimbou aqui. ${quando ? `Dá para carimbar de novo ${quando}.` : ''}`.trim(),
    limite_dia: 'Você já fez os pedidos de hoje para esta casa.',
    muitos_pendentes: 'Você já tem vários pedidos esperando resposta. Aguarde a organização.',
    fila_cheia: 'A fila da organização está cheia agora. Tente de novo mais tarde.',
    nao_aberta: 'Os carimbos ainda não abriram.',
    encerrada: 'Os carimbos já encerraram.',
    casa_sem_combo: 'Esta casa ainda não tem combo para avaliar, então não dá para carimbar.',
    mapa_desconhecido: 'Não achamos o seu mapa neste aparelho. Abra pelo seu link pessoal.',
    rede: 'Sem conexão agora. Confira a internet e tente de novo.',
    generico: 'Não deu para enviar o pedido agora. Tente de novo em instantes.',
  },
}

export const mensagemDoPedido = (motivo, quando = '') => {
  const t = GPS.pedidoRecusa[motivo] ?? GPS.pedidoRecusa.generico
  return typeof t === 'function' ? t(quando) : t
}
