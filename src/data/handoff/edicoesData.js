/*
 * EDICOES_DADOS — dados da página Edições, uma entrada por edição.
 *
 * ⚠️ ISTO NÃO É MAIS UM SNAPSHOT. Até 07/08/2026 era uma cópia congelada do
 * handoff de design, mantida à mão. Envelheceu: mostrava 35 marcas em Movies e
 * 30 em Terras Potiguares (o certo é 34 e 29 — as duplicatas Caramel/KNVE e as
 * três unidades da Fran's contam uma vez cada), e carregava o campo `preco`,
 * que o site não exibe em lugar nenhum. Agora DERIVA da fonte a cada import:
 *
 *   src/data/sweetCoffeeHistory.js → período, participantes, contagem, premiação
 *   src/data/editionAssets.js      → marca de cada edição
 *   src/data/imageLibrary.js       → fotos de cada edição
 *
 * ⛔ O campo `preco` foi REMOVIDO e não volta: preço é dado volátil e não vai ao
 * ar (regra §2.2). As menções a valor dentro das curiosidades saíram junto.
 *
 * A única coisa escrita à mão aqui é CURIOSIDADES — curadoria editorial que não
 * deriva de dado nenhum.
 */
import { SWEET_COFFEE_HISTORY } from '../sweetCoffeeHistory.js'
import { editionMark } from '../editionAssets.js'
import { editionPhotos } from '../imageLibrary.js'

/* Curadoria editorial por edição. Não sai de dado — é texto escrito. */
const CURIOSIDADES = {
  '2016': [
    { t: 'Onde tudo começou', x: 'Idealizado pela jornalista e diretora criativa Eline Eulália, o festival nasceu para aproximar o público das novas docerias, confeitarias e cafeterias autorais de Natal.' },
    { t: 'Ainda sem tema', x: 'Era um circuito de preço único, sem universo temático — os temas só chegariam em 2017.' },
    { t: 'Treze endereços no começo', x: 'A primeira edição reuniu 13 estabelecimentos, em setembro de 2016.' },
  ],
  '2017.1': [
    { t: 'A primeira edição temática', x: 'A Páscoa estreou os temas: foi a primeira vez que as criações se organizaram em torno de um universo próprio.' },
    { t: 'O tema virou método', x: 'A organização percebeu que a narrativa aumentava o envolvimento — o tema passou a orientar receita, nome, apresentação e embalagem.' },
    { t: 'Estreia do Sweet Gift', x: 'Nasceu aqui o combo em versão presente ou viagem: o Bolo da Vovó lançou o "Petit Bolo da Vovó" já nesta edição de Páscoa.' },
  ],
  '2017.2': [
    { t: 'Viagem sem sair de Natal', x: 'Cada marca escolheu um país ou cultura e traduziu essas referências em doce, salgado e bebida.' },
    { t: 'A semente do Trip', x: 'O conceito de viagem gastronômica voltaria, ampliado, na edição Trip de 2023.' },
    { t: 'Combo a preço único', x: 'Mais de vinte marcas participaram, com combo a preço único.' },
  ],
  '2018.1': [
    { t: 'Programa a dois', x: 'A edição ampliou o lado social do festival: virou programa para casais, amigos e grupos, não apenas degustação.' },
    { t: 'Roteiros afetivos', x: 'Em vez de escolher uma só loja, muita gente passou a visitar vários participantes ao longo dos dias.' },
    { t: 'Combo da data', x: 'Doce, salgado e café a preço único, de 7 a 16 de junho.' },
  ],
  '2018.2': [
    { t: 'Memória como ingrediente', x: 'Lanche da escola, almoço de domingo e receita de avó foram reinterpretados pela confeitaria contemporânea.' },
    { t: 'Brincadeira na loja', x: 'Alguns participantes criaram ativações, brindes e surpresas para que a experiência passasse do prato.' },
  ],
  '2019.1': [
    { t: 'A premiação nasceu aqui', x: 'O Sweet Awards estreou nesta edição, com uma categoria única: Melhor Combo.' },
    { t: 'Salto técnico', x: 'Releituras de gâteau, quiche Lorraine e cafés com acabamento especial elevaram o padrão de execução e apresentação.' },
    { t: 'Efeito permanente', x: 'Em algumas marcas, a edição influenciou não só o combo temporário, mas a ambientação e o cardápio fixo.' },
  ],
  '2019.2': [
    { t: 'A loja virou cenário', x: 'Cenografia, figurino, embalagem e nomes criativos entraram de vez no repertório do festival.' },
    { t: 'Chá de Desaniversário', x: 'Entre as releituras divulgadas estavam propostas inspiradas em Alice no País das Maravilhas e em Chapeuzinho Vermelho.' },
    { t: 'Os primeiros parceiros', x: 'Foi a primeira edição a reunir patrocinadores e apoios.' },
  ],
  '2020.1': [
    { t: 'Festival em plena pandemia', x: 'Com a circulação restrita, delivery e take-away deixaram de ser alternativa e passaram a ser essenciais para os participantes.' },
    { t: 'O Sweet Awards cresceu', x: 'A premiação saltou de uma para sete categorias.' },
    { t: 'O abraço adiado', x: 'Na Páscoa de 2020, a campanha do festival usou um coelho entregador de motocicleta para falar de adaptação.' },
  ],
  '2020.2': [
    { t: 'Júri e público lado a lado', x: 'Primeira edição a separar duas trilhas de avaliação: Júri Técnico e Sweet Lovers.' },
    { t: 'A narrativa dentro da caixa', x: 'Embalagem, transporte e retirada passaram a fazer parte da experiência temática.' },
  ],
  '2021.1': [
    { t: 'Doce, salgado e bebida', x: 'As categorias Melhor Doce, Melhor Salgado e Melhor Bebida entraram no Sweet Awards.' },
    { t: 'A única Menção Honrosa', x: 'É a única edição com Menção Honrosa registrada, em Envolvimento e Encantamento em Loja.' },
    { t: 'Temporada, catálogo, maratona', x: 'A campanha adotou a linguagem do streaming e o lançamento foi ao vivo no Instagram.' },
    { t: 'Trinta pontos na rota', x: 'Trinta endereços na rota, de 22 de julho a 1º de agosto.' },
  ],
  '2021.2': [
    { t: 'Parceria com o Sebrae-RN', x: 'A edição aproximou lojas urbanas de pequenos produtores e da cadeia agroindustrial do estado.' },
    { t: 'Ingredientes do território', x: 'Castanha de caju, mel de Jandaíra, queijos artesanais, nata, coco e frutas regionais entraram nas receitas.' },
    { t: 'Lançamento na Festa do Boi', x: 'A abertura ligada à Festa do Boi reforçou o vínculo com o setor produtivo potiguar.' },
  ],
  '2022': [
    { t: 'Cinema de verdade', x: 'A Moviecom Cinemas entrou como parceira da edição.' },
    { t: 'Cada loja, uma sessão', x: 'Pipoca, doces de sessão, bebidas temáticas e cenas icônicas viraram ponto de partida das criações.' },
  ],
  '2023': [
    { t: '33 endereços, dois municípios', x: 'A edição reuniu 33 estabelecimentos de Natal e Parnamirim, de 2 a 12 de novembro.' },
    { t: 'O mapa virou viagem', x: 'O contorno do Rio Grande do Norte foi usado na comunicação como ponto de partida da volta ao mundo.' },
    { t: 'Combo da rota', x: 'Doce, salgado e bebida a preço único, em Natal e Parnamirim.' },
  ],
  '2024': [
    { t: 'Livros como ponto de partida', x: '29 combos inspirados em obras literárias, de 14 a 24 de novembro, em Natal e Parnamirim.' },
    { t: 'Parceria literária', x: 'O Book Club Natal foi parceiro temático da edição.' },
    { t: 'O começo relembrado', x: 'Em depoimento na edição, Eline Eulália relembrou a primeira edição, de 2016, que reuniu 13 estabelecimentos.' },
  ],
  '2025': [
    { t: 'Festa como tema', x: 'Carnaval, São João, aniversários e premiações viraram ponto de partida dos combos, de 6 a 16 de novembro.' },
    { t: '15ª edição, não 15 anos', x: 'A contagem é de edições realizadas — nos primeiros ciclos havia duas por ano.' },
  ],
  '2026.1': [
    { t: 'Especial de 10 anos', x: 'Em vez de um tema novo, cada marca revisitou um tema antigo do festival e produziu uma nova leitura.' },
    { t: 'Combo de aniversário', x: 'Doce, salgado e bebida a preço único, de 4 a 14 de junho.' },
    { t: 'Oito categorias no Sweet Awards', x: 'Maestro Café levou Melhor Combo, Melhor Salgado e Melhor Criatividade; Jolie Café Pâtisserie, Melhor Doce; Sweet Duo, Melhor Bebida; Rollab, Melhor Atendimento; Just Food&Coffee, Melhor Apresentação; Mr. Cupcake, Encantamento em Loja.' },
  ],
}

/* Aplica os aliases oficiais para não contar a mesma casa duas vezes: a Fran's
   com três unidades em Terras Potiguares e a Caramel escrita como "KNVE Casa
   Café" em Movies. A lista `participantes` preserva o registro histórico (as
   unidades aparecem); `n` conta MARCAS, que é o número que o site exibe. */
const { edicoes = [], participantAliases = {} } = SWEET_COFFEE_HISTORY

const norm = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/\p{Mn}/gu, '')
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const CANON = {}
for (const [canon, vars] of Object.entries(participantAliases)) {
  CANON[norm(canon)] = canon
  for (const v of vars) CANON[norm(v)] = canon
}
const marca = (n) => CANON[norm(n)] || (n || '').trim()

export const EDICOES_DADOS = Object.fromEntries(
  edicoes.map((ed) => {
    /* Nomes canônicos, sem repetir marca — é o que a página lista e conta. */
    const participantes = [...new Set((ed.participantes || []).map(marca))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    )
    return [ed.id, {
      periodo: ed.periodo || '',
      n: participantes.length,
      participantes,
      cats: ((ed.premiacao && ed.premiacao.categorias) || []).length,
      premiacao: (ed.premiacao && ed.premiacao.status) || 'nao-encontrada',
      logo: editionMark(ed.id).logo,
      fotos: editionPhotos(ed.id).slice(0, 3),
      curiosidades: CURIOSIDADES[ed.id] || [],
    }]
  }),
)

export default EDICOES_DADOS
