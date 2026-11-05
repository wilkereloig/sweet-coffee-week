/*
 * Regulamento da Caça aos Carimbos (docs/cartoon-2026-2/14-mapa-da-docura.md §14.14; regra: docs/cartoon-2026-2/15-caca-especificacao.md;
 * contratos do banco: docs/cartoon-2026-2/15-caca-contrato-*.md). Conferido em 05/11/2026 contra as migrations 20261203 a 20261220:
 * cada frase abaixo descreve o que o servidor FAZ hoje. Se uma regra do banco mudar, este texto muda no mesmo commit.
 *
 * Só o que está decidido. O que falta decidir vai como { aDefinir } e aparece marcado na página — nada inventado (A4):
 * forma e data de entrega do prêmio final e prazo de guarda dos dados não são decisão técnica.
 * Lista do que ainda precisa de decisão e o que bloqueia a publicação: docs/cartoon-2026-2/15-caca-publicacao-pendencias.md.
 * A surpresa NÃO é revelada aqui (só na entrega). "Avaliam", nunca "votam". Nenhum número de marco, nenhuma pontuação.
 */
export const REGULAMENTO = {
  titulo: 'Regulamento da Caça aos Carimbos',
  apoio: 'Sweet & Coffee Week · edição Cartoon · 5 a 15 de novembro de 2026',
  secoes: [
    ['O que é', [
      'A Caça aos Carimbos é o jogo do Mapa da Doçura. A cada combo da edição que você come numa casa participante, ganha um carimbo no seu mapa, no site.',
      'Quanto mais casas diferentes você conhece, mais longe você vai: elas valem vouchers durante o festival e, completando o mapa, o prêmio final.',
      'É uma ação do Sweet & Coffee Week, realizada pela F2 Experience.',
    ]],
    ['Quem participa', [
      'Qualquer pessoa que crie o seu mapa no site, sem custo e sem senha: apelido, e-mail e, se quiser, WhatsApp. São os mesmos dados da avaliação dos combos: preencheu um, o outro já vem pronto.',
      'Você é identificado pelo e-mail do mapa. Se tiver mais de um mapa com o mesmo e-mail, o progresso deles conta junto, como uma pessoa só, e o mapa principal (o que tem o e-mail confirmado; havendo um único mapa, ele mesmo) é o que tem apelido no ranking, grupos, contato do prêmio e recuperação. Com dois ou mais mapas e nenhum e-mail confirmado, ninguém é principal: cada mapa mostra só os próprios carimbos e fica fora do ranking e dos grupos até alguém confirmar o e-mail. Digitar o código de outra pessoa não confirma o seu mapa: o código vale só para o mapa de quem o pediu.',
      'Para participar e receber o prêmio é preciso ter 18 anos ou mais.',
    ]],
    ['Seu mapa, seu e-mail e a recuperação', [
      'Não há senha. O mapa abre pela chave guardada no seu navegador e pelo link pessoal, que funciona como uma senha: quem tiver o link abre o seu mapa. Não poste nem mande para outras pessoas.',
      'Confirme o seu e-mail no próprio app: enviamos um código de 6 dígitos para o e-mail do mapa. O código vale 10 minutos e só funciona uma vez; depois de poucos erros ele deixa de valer e é preciso pedir outro. Há um limite de pedidos por hora para o mesmo e-mail. Se o código não chegar, veja o spam e tente de novo depois de um minuto.',
      'Perdeu o acesso, ou abriu em outro celular ou no app instalado? Peça o código e recupere o mapa pelo e-mail. A recuperação gera uma chave nova e o aparelho antigo deixa de abrir o mapa.',
      'O envio do código depende de um serviço de e-mail e não é garantido: a entrega pode atrasar ou falhar.',
    ]],
    ['Como ganhar um carimbo', [
      'Comeu o combo? Escaneie o QR Code do display da casa: ele abre a página da casa, com o combo, e o aviso da Caça traz o botão "Carimbar" (o QR do balcão leva direto à tela do carimbo). O celular informa a sua localização só nesse momento, para conferir que você está na casa. O QR sozinho não vale carimbo, porque uma foto dele poderia circular.',
      'Em casas que ainda estão com o ponto em conferência, o QR sozinho não vale carimbo: o app avisa e você pode pedir à organização que confira a sua visita (pedido de revisão, abaixo), sem precisar tentar o GPS antes. Nenhum funcionário da casa valida carimbo.',
      'Primeira vez na casa: o carimbo fica pendente até você avaliar o combo daquela casa, com o mesmo e-mail do mapa. Avaliou, o carimbo vale. A ordem não importa: se já avaliou antes, o carimbo vale na hora. Avaliar sozinho não cria carimbo.',
      'Voltou e comeu de novo? Escaneie de novo: é mais um carimbo, sem nova avaliação (cada combo conta uma avaliação por e-mail; se você reenviar, a nova substitui a anterior).',
      'Na mesma casa vale um carimbo a cada 12 horas, contado pelo mapa e pelo e-mail. Casa com várias unidades conta junto. Casas diferentes no mesmo dia, à vontade.',
      'A localização falhou e você está na casa? O app tenta de novo e explica como ligar a precisão. Se mesmo assim não der, depois de duas falhas seguidas ele oferece o pedido de revisão de presença. O pedido não carimba nada por si só: quem decide é a organização, nunca a casa. Se for aprovado, o carimbo nasce na hora da aprovação, respeita as 12 horas e ainda depende da avaliação do combo. Se for negado, a organização registra o motivo. Só quem confirmou o e-mail do mapa pode pedir revisão. Há limites de pedidos por pessoa e por casa para que o pedido não vire atalho.',
      'Os carimbos só existem enquanto a avaliação dos combos está aberta.',
    ]],
    ['Como o progresso conta', [
      'O progresso é o número de casas diferentes com carimbo válido, de 0 até o total de casas da Caça (o número aparece no seu mapa). Carimbo pendente (casa ainda sem avaliação) não conta, e marcar "quero ir" ou "já fui" também não.',
      'Carimbo válido numa casa que você já validou, depois das 12 horas, é um carimbo extra: ele não soma casa, só serve de desempate e de peso no sorteio final.',
      'No ranking e nas apurações, vence quem tem mais casas diferentes; em empate, quem tem mais carimbos extras. Se ainda empatar, ficam na mesma posição.',
      'Mapa completo é ter carimbo válido em todas as casas da Caça, em qualquer unidade de cada uma.',
      'A organização pode anular carimbos suspeitos; carimbo anulado sai da conta.',
    ]],
    ['Vouchers digitais, um por dia', [
      'Nos dias 7, 8, 9, 10 e 11 de novembro, às 23h59 (horário de Natal), a organização confere quem tem mais casas diferentes validadas, contando o que foi carimbado e avaliado até aquele horário. Em empate, vale quem tem mais carimbos extras; persistindo, sorteio entre os empatados. Essa pessoa ganha um voucher digital.',
      'Carimbo ou avaliação feitos depois do horário de corte só contam nas apurações seguintes.',
      'Cada pessoa ganha no máximo um voucher: quem já ganhou não entra nas apurações seguintes, e o voucher do dia vai para quem vem a seguir na ordem acima.',
      'O e-mail do mapa precisa estar confirmado. Quem for selecionado e ainda não confirmou tem até o meio-dia do dia seguinte (horário de Natal) para confirmar; passado o prazo, a organização chama a próxima pessoa. Por isso, confirme o e-mail assim que criar o mapa. Quem perdeu o prazo de um dia ainda pode concorrer nos outros.',
      'A seleção é conferida pela organização antes de valer. A organização entrega o voucher pelo contato do mapa (WhatsApp, se você informou, ou e-mail) depois da apuração; ele vale até 15/11.',
    ]],
    ['Prêmio final', [
      'Concorre quem completar o mapa até o encerramento dos carimbos e das avaliações, no fim do festival (15/11).',
      'São 3 ganhadores, cada um leva o press kit oficial da edição e uma surpresa.',
      'Mais de 3 pessoas com todas as casas: sorteio em que cada uma entra com o mesmo peso base e cada carimbo extra soma 1 ao peso. Quem comeu mais combos repetidos tem uma vantagem pequena, não uma chance garantida. Saem 3 ganhadores, e quem foi sorteado não volta para o mesmo sorteio.',
      'Até 3 pessoas com todas as casas: todas ganham, e as vagas que sobrarem vão para quem tem mais casas diferentes (empate: mais carimbos extras; persistindo, sorteio). Nenhum prêmio fica sem dono.',
      'O sorteio é verificável. Antes de a avaliação fechar, a organização registra o código de verificação da semente do sorteio; o sorteio real só roda depois do fechamento e só com a semente que bate com esse código. Com a mesma semente e os mesmos dados o resultado é sempre o mesmo. A organização divulga o código antes do fim da avaliação e, junto com o resultado, a semente e a lista dos concorrentes (apelido e peso).',
      'Para receber o prêmio final o e-mail do mapa também precisa estar confirmado. Ganhar voucher não tira ninguém do prêmio final. A organização confere os ganhadores antes de divulgar.',
      { aDefinir: 'data e forma de entrega do prêmio final.' },
    ]],
    ['Ranking, grupos e metas', [
      'O ranking público mostra só o apelido, as casas e os carimbos extras, e só de quem marcou "quero aparecer no ranking". A posição considera todas as pessoas, apareçam ou não, e, depois da sua primeira casa validada, você vê a sua própria posição no seu mapa, mesmo fora do recorte do ranking.',
      'Grupos de amigos são privados. Quem cria o grupo gera um link de convite; quem recebe o link precisa ter o próprio mapa e aceitar que o apelido e o progresso serão vistos pelos integrantes. O convite não torna nada público, e entrar num grupo não cria carimbo para ninguém. O grupo tem ranking só entre os integrantes, o progresso coletivo (cada casa conta uma vez) e uma rota de planejamento que todos podem editar; a rota é só uma lista e nunca marca visita. O número de integrantes e de grupos por pessoa tem limite.',
      'As metas do app comemoram o seu caminho, de acordo com as casas que você validou. Elas não dão prêmio: o que vale como benefício são os vouchers e o prêmio final.',
    ]],
    ['Avisos e app instalável', [
      'Os avisos no celular são opcionais e só chegam se você ativar. A organização os envia quando há o que dizer; não há garantia de que cheguem na hora, ou de que cheguem, e o que importa também aparece na central da Caça. Você desliga quando quiser.',
      'O app instalável é opcional e precisa de internet para abrir e atualizar o mapa. No iPhone o app instalado guarda os dados separados do Safari: se abrir sem o seu mapa, recupere pelo e-mail.',
    ]],
    ['Fraude', [
      'Carimbo sem visita, localização falsa, pedido de revisão sem estar na casa ou qualquer outra forma de burlar as regras anula os carimbos e desclassifica o mapa.',
      'A organização confere os ganhadores antes de divulgar e pode anular carimbos suspeitos.',
    ]],
    ['Seus dados', [
      'Guardamos apelido, e-mail, WhatsApp (se você informar), a escolha de aparecer no ranking e os carimbos: casa, unidade, hora, a distância em metros até a unidade e a margem de erro do GPS. A localização é usada só no momento da leitura e não é guardada.',
      'Se você pedir revisão de presença, guardamos o motivo, a distância e a margem calculadas na hora, a nota que escrever e a decisão da organização. Se criar ou entrar num grupo, guardamos o apelido e o e-mail do integrante e as casas da rota. Se ativar os avisos, guardamos a assinatura do seu navegador. Se for selecionado para um prêmio, guardamos o registro dele (apelido e e-mail) para entregar e conferir.',
      'Usamos esses dados para contar as casas e os carimbos, confirmar o seu e-mail, recuperar o seu mapa, conferir fraude, apurar vouchers e o prêmio final e avisar quem ganhar. A chave do mapa e os códigos de confirmação ficam guardados só de forma embaralhada.',
      { aDefinir: 'por quanto tempo os mapas ficam guardados depois do festival.' },
      'Você pode apagar seu mapa a qualquer momento, em Mapa › Carimbos › Apagar meu mapa. Isso apaga o mapa, os carimbos, os pedidos de revisão e os avisos. Se era o seu último mapa com esse e-mail, você também sai dos grupos: o registro de integrante (e-mail e apelido) é apagado, a posse passa ao integrante mais antigo e o grupo sem ninguém some; a rota que você adicionou fica no grupo, sem o seu nome. A sua avaliação dos combos e o registro de um prêmio já sorteado não são apagados com o mapa; para pedir a retirada, fale com a organização.',
    ]],
    ['Contato', [
      'Dúvidas sobre a Caça aos Carimbos: pelo canal oficial da página Contato do site.',
    ]],
  ],
}
