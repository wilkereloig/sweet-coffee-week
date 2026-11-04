/*
 * Regulamento do Mapa da Doçura (docs/cartoon-2026-2/14-mapa-da-docura.md §14.7).
 * Só o que está decidido. O que falta decidir vai como { aDefinir } e aparece marcado na página —
 * nada inventado (A4). Preencher aqui quando o Wilker definir; a página não muda.
 */
export const REGULAMENTO = {
  titulo: 'Regulamento do Mapa da Doçura',
  apoio: 'Sweet & Coffee Week · edição Cartoon · 5 a 15 de novembro de 2026',
  secoes: [
    ['Quem realiza', [
      'O Mapa da Doçura é uma ação do Sweet & Coffee Week, realizada pela F2 Experience.',
    ]],
    ['Período', [
      'Os carimbos valem de 5 a 15 de novembro de 2026, no mesmo período da avaliação dos combos da edição.',
    ]],
    ['Quem participa', [
      'Qualquer pessoa que crie um Mapa da Doçura no site, sem custo e sem senha.',
      { aDefinir: 'idade mínima para participar e receber prêmio.' },
    ]],
    ['Como carimbar', [
      'Cada unidade participante tem um QR do Mapa da Doçura no balcão. Você lê com a câmera do celular e toca em "Carimbar aqui".',
      'No momento da leitura o celular informa a sua localização, e o carimbo só vale perto da unidade.',
      'Na mesma casa vale uma leitura a cada 12 horas, contada pelo mapa e pelo e-mail dele. Casa com várias unidades conta junto. Casas diferentes no mesmo dia, à vontade.',
    ]],
    ['Pontos', [
      'Cada leitura aceita vale 1 ponto.',
      'Avaliar o combo de uma casa, com o mesmo e-mail do mapa e depois de ter carimbado nela, vale mais 2 pontos, uma vez por casa.',
    ]],
    ['Sorteio', [
      'Cada ponto é um número da sorte. Os números são distribuídos no encerramento, na ordem em que os pontos chegaram, e a lista sai antes do sorteio.',
      'Os prêmios são itens do evento: press kit, vouchers e outros. Nenhum prêmio é em dinheiro.',
      { aDefinir: 'lista e quantidade de prêmios.' },
      { aDefinir: 'data, local e método do sorteio.' },
      { aDefinir: 'prazo e forma de retirada dos prêmios.' },
    ]],
    ['Pódio', [
      'Os três mapas com mais pontos formam o pódio do Mapa da Doçura e recebem a plaquinha Sweet Lover.',
      'Empate: vence quem tem mais casas diferentes carimbadas; persistindo, quem chegou primeiro ao total.',
      'O ranking público mostra só o apelido, e só de quem marcou "quero aparecer no ranking".',
    ]],
    ['Fraude', [
      'Carimbo sem visita, localização falsa ou qualquer outra forma de burlar a regra anula os carimbos e desclassifica o mapa.',
      'A organização confere os sorteados e o pódio antes de divulgar.',
    ]],
    ['Seus dados', [
      'Guardamos apelido, e-mail, WhatsApp (se você informar) e os carimbos: casa, hora e a distância em metros até a unidade. A localização é usada só no momento da leitura e não é guardada.',
      'Usamos esses dados para contar os pontos, conferir fraude e avisar quem ganhar.',
      { aDefinir: 'por quanto tempo os mapas ficam guardados depois do sorteio.' },
      { aDefinir: 'como o nome dos ganhadores é divulgado.' },
      'Você pode apagar seu mapa a qualquer momento, em Minha rota › Apagar meu mapa.',
    ]],
    ['Contato', [
      'Dúvidas sobre o Mapa da Doçura: pelo canal oficial da página Contato do site.',
    ]],
  ],
}
