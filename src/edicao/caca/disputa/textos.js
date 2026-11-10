/*
 * Textos do pop-up "O que você disputa". A regra do voucher, o prêmio final e a campanha NÃO são reescritos aqui: vêm de
 * premios/textos.js e de campanha/terComQuemContar.js, para a regra ter uma fonte só. Só entra texto novo onde o pop-up
 * precisa de uma voz própria (título, "hoje"/"amanhã", chamadas dos botões).
 */
export const DISPUTA = {
  titulo: 'O que você disputa',
  fechar: 'Fechar',
  voucherTitulo: {
    hoje: 'Hoje tem voucher em disputa',
    amanha: 'Amanhã tem voucher em disputa',
    depois: (d) => `${d.semana[0].toUpperCase()}${d.semana.slice(1)}, ${d.curta}: voucher em disputa`,
  },
  voucherChamada: {
    hoje: 'A disputa de hoje já está aberta: cada casa nova que você validar te põe na frente.',
    amanha: 'Os carimbos que você validar a partir de agora já contam para a disputa de amanhã.',
    depois: 'Os carimbos que você validar já contam para esse dia.',
  },
  voucherSemCasa: 'Quem valida a primeira casa já entra na disputa dos vouchers.',
  voucherComCasa: (feitas, total) => `Você tem ${feitas} de ${total} casas validadas.`,
  emailTitulo: 'Confirme o e-mail do seu mapa',
  emailTexto: 'Quem é selecionado sem o e-mail confirmado tem só até o meio-dia do dia seguinte para confirmar; passado o prazo, a vez vai para a próxima pessoa.',
  finalTitulo: 'Prêmio final',
  acao: {
    'criar-mapa': 'Criar meu mapa',
    'confirmar-email': 'Confirmar meu e-mail',
    seguir: 'Entendi, vamos carimbar',
  },
  depois: 'Agora não',
  regulamento: 'Ler o regulamento',
}
