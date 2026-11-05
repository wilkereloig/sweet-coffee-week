/*
 * Regulamento da Caça aos Carimbos (docs/cartoon-2026-2/14-mapa-da-docura.md §14.14; regras do Wilker de 04/11/2026,
 * documento interno 04_SINALIZACAO/caca-aos-carimbos/caca-aos-carimbos-regras.pdf).
 * Só o que está decidido. O que falta decidir vai como { aDefinir } e aparece marcado na página —
 * nada inventado (A4). A surpresa NÃO é revelada aqui (só na entrega).
 */
export const REGULAMENTO = {
  titulo: 'Regulamento da Caça aos Carimbos',
  apoio: 'Sweet & Coffee Week · edição Cartoon · 5 a 15 de novembro de 2026',
  secoes: [
    ['O que é', [
      'A Caça aos Carimbos é o jogo do Mapa da Doçura. A cada combo da edição que você come numa casa participante, ganha um carimbo no seu mapa, no site.',
      'Juntando carimbos, você concorre a vouchers durante o festival e, completando o mapa, ao prêmio final.',
      'É uma ação do Sweet & Coffee Week, realizada pela F2 Experience.',
    ]],
    ['Quem participa', [
      'Qualquer pessoa que crie o seu mapa no site, sem custo e sem senha: apelido, e-mail e, se quiser, WhatsApp. São os mesmos dados da avaliação dos combos — preencheu um, o outro já vem pronto.',
      { aDefinir: 'idade mínima para participar e receber prêmio.' },
    ]],
    ['Como ganhar um carimbo', [
      'Comeu o combo? Escaneie o QR Code do display da casa (ou o QR do balcão) e toque em "Carimbar". Nas casas com o ponto já conferido, o celular informa a sua localização só nesse momento, para provar que você está lá. Nas casas com o ponto ainda em conferência o carimbo não exige localização; em qualquer caso a organização confere e pode anular carimbos suspeitos.',
      'Primeira vez na casa: o carimbo fica pendente até você avaliar o combo daquela casa, com o mesmo e-mail do mapa. Avaliou, o carimbo vale. A ordem não importa: se já avaliou antes, o carimbo vale na hora.',
      'Voltou e comeu de novo? Escaneie de novo: é mais um carimbo, sem nova avaliação (cada combo é avaliado uma vez só).',
      'Na mesma casa vale um carimbo a cada 12 horas, contado pelo mapa e pelo e-mail. Casa com várias unidades conta junto. Casas diferentes no mesmo dia, à vontade.',
    ]],
    ['Como o progresso conta', [
      'O progresso é o número de casas diferentes com carimbo válido, de 0 até o total de casas participantes. Carimbo pendente (casa ainda sem avaliação) não conta.',
      'Carimbo válido numa casa que você já validou, depois das 12 horas, é um carimbo extra: ele não soma casa, só serve de desempate e de peso no sorteio final.',
      'No ranking e nas apurações, vence quem tem mais casas diferentes; em empate, quem tem mais carimbos extras. Se ainda empatar, ficam na mesma posição.',
      'A pessoa é identificada pelo e-mail do mapa: se você tem mais de um mapa com o mesmo e-mail, o progresso deles conta junto, como uma pessoa só.',
      'Mapa completo é ter carimbo válido em todas as casas participantes (27), em qualquer unidade de cada uma.',
    ]],
    ['Vouchers (5, um por dia)', [
      'Nos dias 7, 8, 9, 10 e 11 de novembro, às 23h59 (horário de Natal), a organização confere quem tem mais casas diferentes validadas desde o início do festival (5/11). Em empate, vale quem tem mais carimbos extras; persistindo, sorteio entre os empatados. Essa pessoa ganha um voucher digital.',
      'Cada pessoa ganha no máximo um voucher: quem já ganhou não entra nas apurações seguintes, e o voucher do dia vai para quem vem a seguir na ordem acima.',
      'O e-mail do mapa precisa estar confirmado. Quem for selecionado e ainda não confirmou tem até o meio-dia do dia seguinte para confirmar; passado o prazo, a organização chama a próxima pessoa.',
      'O voucher é enviado pelo contato do mapa (WhatsApp ou e-mail) depois da apuração e vale até 15/11.',
    ]],
    ['Prêmio final', [
      'Concorre quem completar o mapa até o fim do festival (15/11).',
      'São 3 ganhadores, cada um leva o press kit oficial da edição e uma surpresa.',
      'Mais de 3 pessoas com todas as casas: sorteio em que todas entram com o mesmo peso base e cada carimbo extra soma um pouco mais de peso. Quem comeu mais combos repetidos tem uma vantagem pequena, não uma chance garantida. Saem 3 ganhadores, e quem foi sorteado não volta para o mesmo sorteio. A lista dos concorrentes (apelido e peso) é publicada antes do sorteio.',
      'Até 3 pessoas com todas as casas: todas ganham, e as vagas que sobrarem vão para quem tem mais casas diferentes (empate: mais carimbos extras; persistindo, sorteio). Nenhum prêmio fica sem dono.',
      'Ganhar voucher não tira ninguém do prêmio final.',
      { aDefinir: 'data e forma de entrega do prêmio final.' },
    ]],
    ['Ranking', [
      'O ranking público mostra só o apelido, e só de quem marcou "quero aparecer no ranking".',
    ]],
    ['Fraude', [
      'Carimbo sem visita, localização falsa ou qualquer outra forma de burlar as regras anula os carimbos e desclassifica o mapa.',
      'A organização confere os ganhadores antes de divulgar e pode anular carimbos suspeitos.',
    ]],
    ['Seus dados', [
      'Guardamos apelido, e-mail, WhatsApp (se você informar) e os carimbos: casa, hora e a distância em metros até a unidade. A localização é usada só no momento da leitura e não é guardada.',
      'Usamos esses dados para contar as casas e os carimbos, confirmar o seu e-mail, recuperar o seu mapa, conferir fraude e avisar quem ganhar.',
      { aDefinir: 'por quanto tempo os mapas ficam guardados depois do festival.' },
      'Você pode apagar seu mapa a qualquer momento, em Minha rota › Apagar meu mapa.',
    ]],
    ['Contato', [
      'Dúvidas sobre a Caça aos Carimbos: pelo canal oficial da página Contato do site.',
    ]],
  ],
}
