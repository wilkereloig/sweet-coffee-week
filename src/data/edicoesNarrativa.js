/* ============================================================================
   NARRATIVA DAS EDIÇÕES — texto editorial da página Edições
   ----------------------------------------------------------------------------
   Fonte: "A história do Sweet & Coffee Week", texto institucional escrito pelo
   Wilke (jul/2026). Transcrito aqui como fonte única do texto longo da página.

   Duas regras aplicadas na transcrição:

   1. **Números vêm do acervo, não do texto.** O texto de origem cita "cerca de
      11 estabelecimentos" na primeira edição, "mais de trinta pontos" em 2021.1
      e "32 estabelecimentos" em 2023; a base registra 13, 30 e 33. Onde houve
      divergência, vale `src/data/sweetCoffeeHistory.js`. O teste
      tests/redesign-2026.test.mjs quebra se um número aqui contrariar a base.
   2. **Sem valor de combo.** Preço não entra na página (decisão do Wilke,
      jul/2026) — nem no texto, nem na ficha da edição.

   Campos por edição:
   · `lead`    — frase de abertura da cena, o que a edição propôs;
   · `marco`   — por que a edição marcou a história do festival;
   · `curiosidade` — o detalhe que o público não sabe;
   · `legado`  — o que ficou depois dela.
   ========================================================================= */

export const EDICOES_NARRATIVA = {
  '2016': {
    lead: 'O começo: um circuito reunindo docerias, confeitarias e cafeterias com combos especiais e preço único, para aproximar do público as marcas que estavam surgindo na cidade.',
    marco: 'Aqui nasceram as características que o festival mantém até hoje: marcas diferentes reunidas em um mesmo circuito, produtos criados especialmente para a edição, preço único, duração limitada e público circulando por várias regiões da cidade.',
    curiosidade: 'A ideia partiu da jornalista e diretora criativa Eline Eulália, que percebeu que muitos lugares interessantes estavam nascendo em Natal sem que o público os conhecesse.',
    legado: 'Visitar uma cafeteria ou uma doceria virou programa. Em vez de escolher um lugar só, o público começou a montar roteiros e comparar experiências.',
  },
  '2017.1': {
    lead: 'A Páscoa estreou os temas: chocolate, símbolos da data e a ideia de presente inspiraram as criações de cada casa.',
    marco: 'Foi a primeira vez que o festival trabalhou com um tema central — e ficou claro que o tema podia ir muito além da decoração: inspirava ingrediente, apresentação, nome do produto, embalagem e comunicação.',
    curiosidade: 'O público deixou de encontrar apenas combos promocionais e passou a encontrar várias interpretações de uma mesma celebração.',
    legado: 'O Sweet & Coffee Week deixou de ser um circuito de produtos e virou um festival de experiências temáticas.',
  },
  '2017.2': {
    lead: 'Uma viagem pelo mundo através dos sabores: cada casa escolheu um país, uma cultura ou uma tradição gastronômica como ponto de partida.',
    marco: 'Doces do Mundo ampliou o repertório criativo do festival. Os participantes precisaram pesquisar receitas, conhecer outras culturas e adaptar essas referências à identidade da própria casa.',
    curiosidade: 'A ideia de viajar pela gastronomia voltaria anos depois, muito maior, na edição Trip.',
    legado: 'Ficou claro que comida também conta história sobre lugares, costumes e culturas.',
  },
  '2018.1': {
    lead: 'Perto do Dia dos Namorados, combos pensados para dividir ou presentear — o encontro entrou na proposta junto com o sabor.',
    marco: 'O festival passou a ser visto como programa para casais, amigos e grupos: não só uma chance de experimentar produtos, mas um motivo para sair e encontrar gente.',
    curiosidade: 'Foi quando muita gente passou a aproveitar os dias do festival para visitar vários estabelecimentos, criando roteiros afetivos pela cidade.',
    legado: 'O combo é só uma parte da experiência. O lugar, o atendimento e a memória criada ao redor da mesa também contam.',
  },
  '2018.2': {
    lead: 'Receita de família, lanche da escola, festa de aniversário e almoço de domingo viraram ponto de partida — a lembrança como ingrediente.',
    marco: 'Sabores da Infância mostrou a força emocional da comida: as pessoas escolhiam o combo pela lembrança que ele despertava, não só pelo ingrediente ou pela aparência.',
    curiosidade: 'Alguns participantes criaram brincadeiras, brindes e pequenas surpresas dentro das lojas, aproximando a visita do universo da infância.',
    legado: 'A memória afetiva entrou de vez na identidade do festival.',
  },
  '2019.1': {
    lead: 'A tradição da confeitaria francesa como inspiração: massas delicadas, cremes, tortas e apresentações cuidadosas.',
    marco: 'A edição elevou o cuidado com receita e apresentação. Os participantes passaram a olhar com mais atenção para acabamento, combinação e para a forma como o combo chega à mesa.',
    curiosidade: 'Entre as criações estavam releituras de gâteau, quiche Lorraine e cafés com apresentação especial. Em algumas casas, a inspiração francesa não acabou com o festival: decoração e produtos continuaram no cardápio.',
    legado: 'O festival também virou um convite a aprender, testar técnica nova e melhorar o produto.',
  },
  '2019.2': {
    lead: 'Cafeterias, docerias e confeitarias viraram cenário encantado — histórias clássicas inspiraram nome, cor, formato, ingrediente e embalagem.',
    marco: 'Foi uma das edições que mais exploraram o lado visual do festival: decoração temática, cenário, figurino, embalagem e apresentação pensada para fotografia. A experiência começava antes de provar o combo.',
    curiosidade: 'Entre as criações divulgadas estavam o “Chá de Desaniversário”, inspirado em Alice no País das Maravilhas, e cestas ligadas à história de Chapeuzinho Vermelho. Foi também a edição que estreou o Sweet Gift, o formato para viagem ou presente.',
    legado: 'A força das redes sociais ficou evidente: o público não só consumia, fotografava, gravava e compartilhava.',
  },
  '2020.1': {
    lead: 'A música virou sabor — gêneros, artistas e canções inspiraram cor, textura, ingrediente e apresentação.',
    marco: 'A edição aconteceu em um dos períodos mais difíceis do setor. Com a circulação restrita pela pandemia, delivery e retirada deixaram de ser alternativa e viraram essenciais. O festival ganhou a missão de manter as marcas visíveis e o público perto delas.',
    curiosidade: 'Na Páscoa daquele ano, antes da edição, a campanha do festival falava do “abraço adiado” e mostrava um coelho fazendo entregas de motocicleta — a adaptação daquele momento contada com leveza.',
    legado: 'O Sweet & Coffee Week provou ser mais do que um evento dentro das lojas: virou também rede de divulgação e conexão entre marcas e consumidores.',
  },
  '2020.2': {
    lead: 'Cultura pop no centro da mesa: doce e amargo, claro e escuro, força e delicadeza traduzidos em sabor e apresentação.',
    marco: 'Ainda sob os efeitos da pandemia, os participantes precisaram cuidar de tudo ao mesmo tempo — segurança, embalagem, transporte, retirada e a apresentação nas redes. O combo tinha de chegar bonito também na casa de quem pediu.',
    curiosidade: 'Reunir todos os participantes em uma campanha só ajudou cada marca a alcançar mais gente, e o público era incentivado a variar os pedidos e conhecer casas fora da sua rotina.',
    legado: 'A experiência do festival passou a caber também em caixas, sacolas e entregas.',
  },
  '2021.1': {
    lead: 'O universo das séries e do streaming: personagens, episódios e cenários viraram combo, no ano em que maratonar fazia parte da rotina.',
    marco: 'A edição conversou diretamente com o hábito daquele momento. O público reconhecia as referências, escolhia pelo que gostava de assistir e isso puxava comentário, foto e compartilhamento.',
    curiosidade: 'Toda a comunicação brincava com o streaming: o festival virou “temporada”, os combos formavam um “catálogo” e o público era chamado para uma “maratona”. O lançamento foi ao vivo no Instagram.',
    legado: 'O festival mostrou que consegue transformar em experiência gastronômica qualquer assunto que esteja no dia a dia das pessoas.',
  },
  '2021.2': {
    lead: 'Ingredientes, paisagens, costumes e memórias do Rio Grande do Norte no centro da criação, em parceria com o Sebrae-RN.',
    marco: 'A edição aproximou as lojas urbanas de pequenos produtores e da cadeia agroindustrial do estado: apresentou produtos regionais a novos consumidores, incentivou o uso de ingrediente local e fortaleceu o orgulho pela gastronomia potiguar.',
    curiosidade: 'Castanha de caju, mel de abelha Jandaíra, queijos do Seridó, camarão, nata, coco e frutas regionais entraram nas receitas. O lançamento foi ligado à Festa do Boi, reforçando o vínculo com o setor produtivo.',
    legado: 'Ficou claro que o festival beneficia muito mais gente do que as casas participantes — produtores, fornecedores e artesãos também fazem parte da história.',
  },
  '2022': {
    lead: 'Depois das séries, o cinema: filmes, personagens e cenas marcantes viraram ponto de partida das criações.',
    marco: 'Movies reuniu tudo o que o festival havia desenvolvido até ali — história, força visual, referência conhecida, decoração temática e produto exclusivo. Cada casa criou a sua própria sessão.',
    curiosidade: 'O tema permitiu trabalhar a experiência inteira de ir ao cinema: pipoca, doces de sessão, bebida temática, ingresso e cena icônica.',
    legado: 'O Sweet & Coffee Week se firmou como experiência que mistura gastronomia e entretenimento — parte da graça era reconhecer as referências.',
  },
  '2023': {
    lead: 'Uma volta ao mundo pelo sabor: cada casa escolheu um destino e traduziu sua cultura, sua cozinha ou sua paisagem em combo.',
    marco: 'Trip ampliou a ideia de circuito. O público percorria endereços de Natal e Parnamirim e, ao mesmo tempo, conhecia referências de vários lugares do mundo. A edição também fortaleceu a presença do festival em Parnamirim.',
    curiosidade: 'Os destinos misturavam Brasil e exterior, das praias do Havaí às ruas de Paris. O contorno do Rio Grande do Norte, que lembra um elefante, virou ponto de partida da viagem na comunicação.',
    legado: 'Visitar os participantes virou coleção: destinos, carimbos e descobertas.',
  },
  '2024': {
    lead: 'A Livraria da Doçura: obras literárias viraram combo — clássicos, romances, aventuras e histórias infantis em nova versão.',
    marco: 'Books aprofundou a capacidade do festival de contar história. Cada combo funcionava quase como um livro: o nome era o título, os ingredientes contavam a trama, a apresentação criava o cenário e o público completava a experiência.',
    curiosidade: 'Durante a edição, Eline Eulália relembrou a primeira, de 2016, que reuniu 13 estabelecimentos — e destacou como a criação de temas tornou o festival mais criativo e reconhecível.',
    legado: 'O Sweet & Coffee Week já tinha um jeito próprio de transformar assunto cultural em experiência gastronômica.',
  },
  '2025': {
    lead: 'Festas, cerimônias e momentos de encontro como inspiração: carnaval, São João, aniversários, premiações e celebrações imaginárias.',
    marco: 'Celebration preparou o festival para o ciclo dos dez anos, celebrando a continuidade, a criatividade dos participantes, a presença dos Sweet Lovers e as marcas que cresceram junto.',
    curiosidade: 'Apesar de ser a 15ª edição, o festival ainda não completava quinze anos: nos primeiros ciclos houve mais de uma edição por ano.',
    legado: 'A edição transformou em tema aquilo que o festival sempre fez — criar motivo para as pessoas saírem de casa e sentarem à mesa juntas.',
  },
  '2026.1': {
    lead: 'Dez anos: em vez de um tema novo, cada marca revisitou um universo marcante da história do festival e apresentou uma nova leitura. Não era repetir, era recriar.',
    marco: 'Lovers colocou no centro quem construiu o festival: as pessoas que acompanham as edições, montam roteiros, dividem combos, visitam bairros diferentes, fotografam, avaliam e indicam. Em dez anos o Sweet & Coffee Week construiu memória, comunidade e uma ligação forte com a cidade.',
    curiosidade: 'Cinema, séries, música, viagens, contos de fadas, celebrações e referências potiguares voltaram em novas versões. Ao longo dos anos, grupos de amigos passaram a montar agenda para aproveitar melhor o festival, e dividir os combos virou estratégia comum para provar mais sabores.',
    legado: 'A edição dos dez anos fechou uma etapa e abriu outra: o festival chegou a 2026 como encontro entre gastronomia, cultura, criatividade, marcas locais e pessoas.',
  },
}

/* Abertura da página — a história do festival em três parágrafos. */
export const ABERTURA = {
  titulo: 'Dez anos transformando sabores em histórias.',
  paragrafos: [
    'O Sweet & Coffee Week nasceu em Natal, em 2016, quando novas docerias, confeitarias e cafeterias começavam a ganhar espaço na cidade. Faltava uma iniciativa que ajudasse o público a conhecê-las — daí a ideia de reunir estabelecimentos diferentes em um circuito, com preço único, e convidar as pessoas a explorar novos sabores e endereços.',
    'A combinação de um doce, um salgado e uma bebida virou a marca do festival. Com o tempo, cada edição passou a ter um tema próprio, que inspirava os sabores, os nomes dos combos, as embalagens, a decoração das lojas e toda a experiência oferecida ao público.',
    'A cada edição, Natal ganha uma nova rota de descobertas: as pessoas escolhem os combos que querem provar, organizam os passeios, dividem experiências com amigos, fotografam, avaliam os participantes e compartilham seus momentos. O que começou em 2016 com 13 estabelecimentos formou uma comunidade apaixonada pelo festival — os Sweet Lovers.',
  ],
}

export default EDICOES_NARRATIVA
