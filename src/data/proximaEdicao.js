/* Próxima edição — fonte única do que o site pode dizer sobre ela.
   Home, Participar e a central de dúvidas leem daqui (§5.2).
   Campo null = não confirmado publicamente: não exibir, não inventar (A4).
   Tema e período: divulgação pública autorizada pelo Wilker em 13/10/2026.
   Duração, valor do combo e participantes continuam null — não se deduzem do
   período nem de outra fonte. */
export const proximaEdicao = {
  // 'pre-cadastro' | 'em-breve' | 'em-cartaz' | 'encerrada'
  status: 'pre-cadastro',
  ano: 2026,
  mes: 'novembro',
  tema: 'Cartoon',
  periodo: '5 a 15 de novembro',  // datas exatas, sem o ano (ele está em `ano`)
  duracao: null,
  valorCombo: null,
  preCadastro: '/quero-participar/',  // barra final obrigatória (§10.4-b)
}

export default proximaEdicao
