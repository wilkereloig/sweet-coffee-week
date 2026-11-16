/* Próxima edição — fonte única do que o site pode dizer sobre ela.
   Home, Participar e a central de dúvidas leem daqui (§5.2).
   Campo null = não confirmado publicamente: não exibir, não inventar (A4).

   16/11/2026: a edição Cartoon (5 a 15 de novembro de 2026) ENCERROU e passou
   ao acervo (Edições, código 2026.2). A edição seguinte ainda não tem tema nem
   data divulgados: ano, mês, tema e período voltam a null. O registro de
   interesse das casas segue aberto o ano inteiro (`status: 'pre-cadastro'`).
   O que a Home diz sobre o encerramento mora em destaqueEdicao.js e em
   conteudo/home.js (ENCERRAMENTO), não aqui. */
export const proximaEdicao = {
  // 'pre-cadastro' | 'em-breve' | 'em-cartaz' | 'encerrada'
  status: 'pre-cadastro',
  ano: null,
  mes: null,
  tema: null,
  periodo: null,  // datas exatas, sem o ano (ele está em `ano`)
  duracao: null,
  valorCombo: null,
  preCadastro: '/quero-participar/',  // barra final obrigatória (§10.4-b)
}

export default proximaEdicao
