/*
 * Textos do pedido de "carimbo de visita anterior" (05/11/2026). Nenhuma data ou hora é escrita aqui: o prazo vem do servidor
 * (`caca_visita_anterior_prazo`) e entra por parâmetro. O pedido NUNCA é prometido como aprovado: "em análise" não conta nada.
 */
export const VISITA = {
  titulo: 'Visitei uma casa antes de conhecer a Caça',
  lead: 'Se você foi a uma casa participante e não carimbou na hora, peça que a organização analise a sua visita. É uma exceção, só neste prazo.',
  prazo: (quando) => `Pedidos aceitos só até ${quando}.`,
  prazoEncerrado: (quando) => `O prazo para novos pedidos terminou em ${quando}. Os pedidos já enviados continuam aqui.`,
  comoFunciona: [
    'A organização analisa cada pedido. Enviar não é aprovação e nada é contado enquanto o pedido estiver em análise.',
    'Se for aprovado, o carimbo entra no seu mapa a partir da aprovação. A casa só passa a valer depois que você avaliar o combo dela com o mesmo e-mail do mapa.',
    'Um pedido por casa. Quem já tem carimbo na casa não precisa pedir.',
  ],
  abrir: 'Pedir carimbo de visita anterior',
  fechar: 'Fechar',
  // Formulário
  formTitulo: 'Qual casa você visitou?',
  maisDeUma: 'Visitou mais de uma casa? Adicione cada uma, com o endereço, a data e o horário aproximados.',
  casaN: (n, total) => (total > 1 ? `Casa ${n} de ${total}` : 'Casa visitada'),
  adicionar: '+ Adicionar outra casa',
  remover: 'Remover esta casa',
  hora: 'Horário aproximado (opcional)',
  horarioNota: 'Horário aproximado',
  parcial: (ok, falta) => `${ok === 1 ? '1 pedido foi enviado' : `${ok} pedidos foram enviados`}. ${falta === 1 ? 'Ficou 1 casa' : `Ficaram ${falta} casas`} para ajustar abaixo.`,
  casa: 'Casa',
  casaEscolha: 'Escolha a casa',
  unidade: 'Endereço visitado',
  unidadeEscolha: 'Escolha o endereço',
  data: 'Data aproximada da visita',
  dataAjuda: 'Pode ser aproximada, mas dentro do festival e sem data futura.',
  nota: 'Observação (opcional)',
  notaAjuda: 'Ajuda a organização a analisar: com quem foi, o que pediu, que horas. Não escreva dados pessoais além do necessário.',
  notaMax: 200,
  comprovante: 'Não é preciso comprovante. Se você tiver o recibo, guarde: a organização pode pedir para conferir.',
  privacidade: 'A organização vê o apelido do mapa, o contato do mapa (e-mail e WhatsApp), a casa, o endereço, a data e a observação. A casa não participa da análise.',
  enviar: 'Enviar pedido à organização',
  enviarN: (n) => (n > 1 ? `Enviar ${n} pedidos à organização` : 'Enviar pedido à organização'),
  enviando: 'Enviando…',
  semCasas: 'Você já tem carimbo ou pedido em todas as casas disponíveis.',
  // Resultado do envio
  enviadoTitulo: 'Pedido recebido, em análise',
  enviadoTexto: (casas) => {
    const lista = Array.isArray(casas) ? casas : [casas]
    const nomes = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' }).format(lista)
    return `A organização vai olhar ${lista.length > 1 ? 'os seus pedidos' : 'o seu pedido'} para ${nomes}. Nada foi carimbado ainda. Se for aprovado, ainda falta avaliar o combo de cada casa para ela valer.`
  },
  // Estados
  estado: { analise: 'Em análise', aprovadoAvaliar: 'Aprovado · falta avaliar', aprovadoValido: 'Aprovado · validado', negado: 'Não aprovado' },
  estadoTexto: {
    analise: 'Pedido recebido. Ainda não conta nada.',
    aprovadoAvaliar: 'Aprovado. O carimbo está no seu mapa, mas só vira casa validada depois que você avaliar o combo com o mesmo e-mail do mapa.',
    aprovadoValido: 'Aprovado e validado: a casa já conta no seu progresso.',
    negado: 'A organização não aprovou este pedido. Se quiser entender o caso, fale com a organização pelo canal de contato do festival.',
  },
  avaliar: 'Avaliar o combo',
  contato: 'Falar com a organização',
  seusPedidos: 'Seus pedidos de visita anterior',
  dataDaVisita: (d) => `Visita em ${d}`,
  carregando: 'Carregando…',
  // Sem mapa
  semMapa: (quando) => `Visitou uma casa antes de conhecer a Caça? Crie ou abra o seu mapa e peça o carimbo de visita anterior, só até ${quando}. A organização analisa cada pedido.`,
  // Recusas do servidor
  recusa: {
    mapa_desconhecido: 'Não reconhecemos o seu mapa neste aparelho. Abra ou recupere o mapa e tente de novo.',
    email_nao_confirmado: 'Confirme o e-mail do mapa primeiro: o carimbo e a avaliação usam o mesmo e-mail. Confirmar leva um minuto, na central.',
    prazo_encerrado: 'O prazo para novos pedidos terminou.',
    qr_invalido: 'Não encontramos essa casa. Escolha de novo.',
    casa_sem_combo: 'Essa casa ainda não tem combo disponível na Caça.',
    encerrada: 'A Caça já terminou.',
    data_invalida: 'Escolha uma data dentro do festival.',
    data_futura: 'A data da visita não pode estar no futuro.',
    unidade_obrigatoria: 'Essa casa tem mais de um endereço. Escolha qual você visitou.',
    unidade_invalida: 'Esse endereço não é desta casa. Escolha de novo.',
    ja_carimbou: 'Você já tem carimbo nesta casa, então não precisa deste pedido.',
    ja_pedido: 'Você já enviou um pedido para esta casa.',
    limite_pedidos: 'Você já fez os pedidos possíveis para esta casa.',
    muitos_pendentes: 'Você já tem vários pedidos esperando resposta. Aguarde a organização.',
    fila_cheia: 'A fila de análise desta casa está cheia agora. Tente de novo em instantes.',
    rede: 'Sem conexão agora. Seu pedido não foi enviado: tente de novo.',
    padrao: 'Não deu para enviar agora. Tente de novo em instantes.',
  },
}
