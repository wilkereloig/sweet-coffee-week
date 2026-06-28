/*
 * BASE HISTÓRICA — Sweet & Coffee Week (2016–2025, 15 edições).
 * Fonte: sweet_coffee_data.json (Instagram @sweetcoffeeweek + acervo da Experience).
 * NÃO inclui a edição 2026.1 Lovers.
 *
 * Honestidade dos dados (regra: não inventar):
 * - Vencedores são os CONFIRMADOS no acervo. Empate = colocação repetida (ex.: dois
 *   "3º"), nunca um "4º" inventado.
 * - `track` (trilha): 'Júri Técnico' | 'Sweet Lovers' | undefined (quando a peça não
 *   distingue). Categoria pode repetir entre trilhas.
 * - 2016–2018 não tiveram premiação (o Sweet Awards começou em 2019) → 'nao-teve'.
 *
 * Status: 'nao-teve' | 'nao-encontrada' | 'completa' | 'parcial' | 'a-conferir'
 */

export const AWARD_STATUS = {
  'nao-teve':       { label: 'Não teve premiação',        tone: 'muted'  },
  'nao-encontrada': { label: 'Premiação não encontrada',  tone: 'warn'   },
  'completa':       { label: 'Premiação completa',         tone: 'ok'     },
  'parcial':        { label: 'Premiação parcial',          tone: 'info'   },
  'a-conferir':     { label: 'A conferir',                 tone: 'info'   },
}

// Patrocínios/serviços fixos do festival (não por edição).
export const sweetFixedPartners = {
  realizacao: 'Experience (F2 Experience)',
  apoio: ['Espaço Reduzido (edições recentes, confirmado em 2025)'],
  plataformaVotacao: 'Easy Menu (edições 2020–2021)',
  fotografia: ['@andreylourenco', '@breno_sillva'],
}

// Helper: monta winners a partir de colocações [pos, [nomes...]] preservando empates
// (cada nome do empate vira uma entrada com a MESMA colocação).
const places = (...rows) =>
  rows.flatMap(([pos, names]) => names.map((name) => ({ place: `${pos}º`, name })))

export const sweetEditions = [
  {
    id: '2016', number: 1, year: '2016', code: '2016', label: 'S&C / Início', theme: 'Início',
    periodo: '01 a 11 de setembro de 2016', participantsCount: 13,
    participants: ['LaSweets por Larissa Pio', 'Bocaditos Doceria & Café', 'Liliane Moura Confiserie', 'Jolie Pâtisserie', 'Margarita Café & Ateliê de Doces', 'Realize Gourmet', 'Rafaela Fontes Chocolateria', 'Chapelatto Coffee Shop', "Jana's Cakes", 'Cecilia Mindêlo Brownies', "Boca D'Água Delicatessen", 'Rosa Lemos Chocolate & Café', 'Barões do Café'],
    awardsStatus: 'nao-teve', awardsNote: '1ª edição — apenas circuito gastronômico.', awards: [],
  },
  {
    id: '2017-1', number: 2, year: '2017', code: '2017.1', label: 'S&C Páscoa', theme: 'Páscoa',
    periodo: '03 a 12 de abril de 2017', participantsCount: 17,
    participants: ['Realize Gourmet', 'Engenho Doce', "Confeitaria Jana's Cakes", 'Doce Arthe Confeitaria', 'Barões do Café', "Boca D'Água Delicatessen", 'Casa de Taipa Tapiocaria', 'TuttiMac', 'Berlin Cafeteria', 'FitNeza Coffee', 'Chocolateria Sandra Maia', 'Bocaditos Confeitaria Artesanal', 'Very Sugar', 'Jolie Pâtisserie', 'Cecilia Mindêlo', 'Chapelatto Coffee Shop', 'Chocolateria Rafaela Fontes'],
    awardsStatus: 'nao-teve', awardsNote: 'Sem premiação (Sweet Awards começou em 2019).', awards: [],
  },
  {
    id: '2017-2', number: 3, year: '2017', code: '2017.2', label: 'S&C Doces do Mundo', theme: 'Doces do Mundo',
    periodo: '05 a 15 de outubro de 2017', participantsCount: 22,
    participants: ['Barões do Café', "Boca D'Água", 'Café da Ordem', 'Caroli', 'Croasonho', 'Daguia', 'Suisse Brownie', 'Berlin', 'Bocaditos', 'Bolo da Vovó', 'Cecilia Mindêlo', 'Crooks', 'Engenho Doce', 'Fritz', "Jana's Cake", 'Jolie Parissiere', 'La Sweets', 'Pinga Fogo', 'Rafaela Fontes', 'Realize', 'Sandra Maia', 'Very Sugar'],
    awardsStatus: 'nao-teve', awardsNote: 'Sem premiação.', awards: [],
  },
  {
    id: '2018-1', number: 4, year: '2018', code: '2018.1', label: 'S&C Namorados', theme: 'Namorados',
    periodo: '07 a 16 de junho de 2018', participantsCount: 21,
    participants: ['A Doceria', 'Barões', 'Berlim', 'Bolo da Vovó', 'Caroli', 'Cecilia Brownie', 'Chapelatto', 'Crooks', 'Daguia', 'Fitneza', "Jana's Cake", 'La Sweets', 'Mr Brownie', "Paddy's", 'Parma', 'Rafaela Fontes', 'Realize Gourmet', 'Sandra Maia', 'Swiss Brownie', 'The Brownie Factory', 'Very Sugar'],
    awardsStatus: 'nao-teve', awardsNote: 'Sem premiação.', awards: [],
  },
  {
    id: '2018-2', number: 5, year: '2018', code: '2018.2', label: 'S&C Sabores da Infância', theme: 'Sabores da Infância',
    periodo: '12 a 21 de outubro de 2018', participantsCount: 25,
    participants: ['A Doceria', 'Barões do Café', 'Berlin Cafeteria', "Boca D'Água", 'Bolo da Vovó', 'Cacau Show', 'Caroli Douces', 'Cecilia Mindêlo', 'Chapelatto', 'Chocolateria Sandra Maia', 'Crooks', 'Daguia', 'Das Melo', 'Edileuza Doces Finos', 'Fitneza', "Jana's Cakes", 'Jolie Pâtisserie', 'La Sweets', 'Mr Cupcake', 'Parma Doces', 'Rafaela Fontes', 'Realize Gourmet', 'Sodiê', 'Suisse Brownie', 'Very Sugar'],
    awardsStatus: 'nao-teve', awardsNote: 'Sem premiação.', awards: [],
  },
  {
    id: '2019-1', number: 6, year: '2019', code: '2019.1', label: 'S&C Pâtisserie Francesa', theme: 'Pâtisserie Francesa',
    periodo: '15 a 25 de maio de 2019', participantsCount: 28,
    participants: ['Siga Balzac Café', "Boca D'Água", 'Bocaditos', 'Bolo da Vovó', 'Cacau Show', 'Caffeina', 'Café Brigadeiro', 'Caroli', 'Casa Nacre', 'Cecília Mindelo', 'Chapelatto', 'Crooks Cookies', 'Cuore di Panna', 'Das Melo', 'Fitneza', 'Flor e Flor', 'Flora Cafeteria', 'Frans Café', 'Jolie', 'La Sweets', 'Mr Cupcake', 'Parma Doces', 'Rafaela Fontes', 'Realize Gourmet', 'Sodiê', 'Sonho de Brownie', 'Suisse Brownie', 'Very Sugar'],
    awardsStatus: 'completa', awardsNote: 'Primeira premiação do festival — votação do público (categoria única: Melhor Combo).',
    awards: [
      { category: 'Melhor Combo', winners: places([1, ['Jolie']], [2, ['Mr Cupcake']], [3, ['Sonho de Brownie']]) },
    ],
  },
  {
    id: '2019-2', number: 7, year: '2019', code: '2019.2', label: 'S&C Contos de Fadas', theme: 'Contos de Fadas',
    periodo: '05 a 15 de setembro de 2019', participantsCount: 36,
    participants: ['Atelier Mine', 'Siga Balzac', "Boca D'Água", 'Bocaditos', 'Bolo da Vovó', 'Cacau Show', 'Café Brigadeiro', 'Caffeina', 'Camila Melo', 'Caroli', 'Casa Nacre', 'Casa de Taipa', 'Cecilia Mindelo', 'Chapelatto', 'Chef Fits', 'Cookorote', 'Crooks', 'Cuore di Panna', 'Das Melo', 'Edileuza Doces', 'Flor e Flor', 'Flora Café', 'Frans Café', "Jana's Cake", 'Jolie', 'Mr Cupcake', 'Nick Buffet', 'Paneer', 'Parma Doces', 'Pinga Fogo Doceria', 'Rafaela Fontes', 'Realize Gourmet', 'Sodiê Doces', 'Sonho de Brownie', 'Suisse Brownie', 'Very Sugar'],
    awardsStatus: 'completa', awardsNote: 'Votação do público (categoria única: Melhor Combo).',
    awards: [
      { category: 'Melhor Combo', winners: places([1, ['Bocaditos']], [2, ['Mr Cupcake']], [3, ['Chapelatto']]) },
    ],
    sponsors: [
      { name: 'Eloi Chaves', type: 'patrocínio' }, { name: 'Romance Brazil', type: 'patrocínio' },
      { name: 'Adega Perlage', type: 'apoio' }, { name: 'Cia Era uma Vez', type: 'apoio' }, { name: 'Espaço Festejar', type: 'cerimônia' },
    ],
  },
  {
    id: '2020-1', number: 8, year: '2020', code: '2020.1', label: 'S&C No Ritmo da Música', theme: 'No Ritmo da Música',
    periodo: 'julho de 2020 (encerramento 19–20/jul)', participantsCount: 18,
    participants: ['Petra Holanda', 'Café Brigadeiro', 'Papo de Anjo', 'Atelier Mine Confeitaria', 'Bella Pettit', 'Bocaditos', 'Cecília Mindêlo', 'Momento Gourmet', 'Caroli', 'Casa Nacre', 'Casa dos Salgados Gourmet', 'Cuore di Panna', 'Das Melo', 'Kopenhagen', 'Stephany Santos', 'Macarons Cookorote', 'Rafaela Fontes', 'Very Sugar'],
    awardsStatus: 'completa', awardsNote: 'Votação do público (categoria única: Melhor Combo).',
    awards: [
      { category: 'Melhor Combo', winners: places([1, ['Bocaditos']], [2, ['Rafaela Fontes']], [3, ['Momento Gourmet']]) },
    ],
  },
  {
    id: '2020-2', number: 9, year: '2020', code: '2020.2', label: 'S&C Heróis & Vilões', theme: 'Heróis & Vilões',
    periodo: '12 a 22 de novembro de 2020', participantsCount: 27,
    participants: ['Bella Petit', "Bell's", 'Bocaditos', 'Café Brigadeiro', 'Café com Bike', 'Caroli', 'Casa de Taipa', 'Casa dos Salgados Gourmet', 'Casa Nacre', 'Cecilia Mindelo', 'Chocolatudos', 'Cookorote', 'Das Melo', 'Delizeu', 'Dolce Gelato', 'Edileuza Doces Finos', 'Frans Café', 'Jolie', 'Mangai', 'Mine Confeitaria', 'Momento Gourmet', 'Mr Cupcake', 'Paneer', 'Rafaela Fontes', 'Realize Gourmet', 'Suisse Brownie', 'Very Sugar'],
    participantsNote: "O acervo também traz uma logo 'Kyara' (possível 28º participante / substituição) — a conferir.",
    awardsStatus: 'completa', awardsNote: 'Sweet Awards. Melhor Combo teve Júri Técnico e Sweet Lovers; demais categorias sem distinção de trilha nas peças.',
    awards: [
      { category: 'Melhor Combo', track: 'Júri Técnico', winners: places([1, ['Bocaditos']], [2, ['Mr Cupcake']], [3, ['Cookorote', 'Paneer']]) },
      { category: 'Melhor Combo', track: 'Sweet Lovers', winners: places([1, ['Mr Cupcake']], [2, ['Bocaditos']], [3, ['Casa dos Salgados Gourmet']]) },
      { category: 'Melhor Takeaway/Delivery', winners: places([1, ['Momento Gourmet']], [2, ['Bocaditos']], [3, ['Casa dos Salgados Gourmet']]) },
      { category: 'Melhor Atendimento', winners: places([1, ['Casa dos Salgados Gourmet']], [2, ['Jolie']], [3, ['Mr Cupcake']]) },
      { category: 'Melhor Sabor', winners: places([1, ['Bocaditos']], [2, ['Casa dos Salgados Gourmet']], [3, ['Mr Cupcake']]) },
      { category: 'Melhor Criatividade', winners: places([1, ['Mr Cupcake']], [2, ['Bocaditos']], [3, ['Jolie']]) },
      { category: 'Melhor Apresentação', winners: places([1, ['Mr Cupcake']], [2, ['Das Melo']], [3, ['Jolie']]) },
    ],
  },
  {
    id: '2021-1', number: 10, year: '2021', code: '2021.1', label: 'S&C Séries', theme: 'Séries',
    periodo: '22 de julho a 01 de agosto de 2021', participantsCount: 30,
    participants: ['Lulu Café', 'Bem Eu Confeitaria', 'Aumer', "Bell's", 'Café Leviz', 'Casa dos Salgados', 'Bendita Confeitaria', 'Chocolatudo', 'Cacau Show', 'Marlon Gastronomia', 'Bella Peti', 'Cássia Ribeiro', 'Paneer', 'Casa Nacre', 'Royal Trudel', 'Franz Café', 'Very Sugar', 'Cecília Mindêlo', 'Bocaditos', 'Rafaela Fontes', 'Caroli Douces', 'Mine', 'Das Melo', 'Mangai', 'Suisse', 'Mr Cupcake', 'Momento Gourmet', 'Radio Café', 'Carol Dantas', 'Café Brigadeiro'],
    awardsStatus: 'completa', awardsNote: 'Sweet Awards com Júri Técnico e Sweet Lovers. Vencedores lidos nos cards do acervo (não foram postados no feed).',
    awards: [
      { category: 'Melhor Combo', track: 'Júri Técnico', winners: places([1, ['Cássia Ribeiro']], [2, ['Atelier Mine Confeitaria']], [3, ['Bocaditos']]) },
      { category: 'Melhor Doce', track: 'Júri Técnico', winners: places([1, ['Cássia Ribeiro']], [2, ['Cecília Mindêlo']], [3, ['Das Melo']]) },
      { category: 'Melhor Salgado', track: 'Júri Técnico', winners: places([1, ['Cássia Ribeiro']], [2, ['Marlon Gastronomia']], [3, ['Cecília Mindêlo']]) },
      { category: 'Melhor Bebida', track: 'Júri Técnico', winners: places([1, ['Cássia Ribeiro']], [2, ['Atelier Mine Confeitaria']], [3, ['Very Sugar']]) },
      { category: 'Melhor Criatividade', track: 'Júri Técnico', winners: places([1, ['Bocaditos']], [2, ['Mr Cupcake']], [3, ['Atelier Mine Confeitaria']]) },
      { category: 'Melhor Apresentação', track: 'Júri Técnico', winners: places([1, ["Bell's Cafeteria"]], [2, ['Atelier Mine Confeitaria']], [3, ['Das Melo']]) },
      { category: 'Melhor Combo', track: 'Sweet Lovers', winners: places([1, ['Mr Cupcake']], [2, ['Atelier Mine Confeitaria', 'Bendita Confeitaria']], [3, ["Bell's Cafeteria"]]) },
      { category: 'Melhor Sabor', track: 'Sweet Lovers', winners: places([1, ['Mr Cupcake']], [2, ['Cecília Mindêlo']], [3, ["Bell's Cafeteria"]]) },
      { category: 'Melhor Apresentação', track: 'Sweet Lovers', winners: places([1, ['Mr Cupcake']], [2, ["Bell's Cafeteria"]], [3, ['Atelier Mine Confeitaria']]) },
      { category: 'Melhor Atendimento', track: 'Sweet Lovers', winners: places([1, ['Bendita Confeitaria']], [2, ['Atelier Mine Confeitaria']], [3, ['Mr Cupcake']]) },
      { category: 'Melhor Criatividade', track: 'Sweet Lovers', winners: places([1, ['Mr Cupcake']], [2, ['Atelier Mine Confeitaria']], [3, ['Bocaditos']]) },
      { category: 'Melhor Delivery', track: 'Sweet Lovers', winners: places([1, ["Bell's Cafeteria"]], [2, ['Bocaditos']], [3, ['Casa dos Salgados']]) },
    ],
    honorableMention: { category: 'Envolvimento e Encantamento em Loja', names: ['Mr Cupcake', 'Rafaela Fontes', 'Chocolatudos por Laís', 'Atelier Mine Confeitaria'] },
  },
  {
    id: '2021-2', number: 11, year: '2021', code: '2021.2', label: 'S&C Terras Potiguares', theme: 'Terras Potiguares',
    periodo: '18 a 28 de novembro de 2021', participantsCount: 30,
    participants: ['Atelier Mine', 'Aumer Restaurante', "Bell's Café", 'Bem Eu', 'Bendita', 'Bocaditos', 'Café Brigadeiro', 'Carol Dantas', 'Caroli', 'Cássia Ribeiro', 'Cecília Mindelo', 'Chefit', 'Chocolatudos', 'Da Terra', 'Delizeu', 'Doce Lelê', 'Douce Bien', "Duart's", 'Frans Cidade Jardim', 'Frans Cidade Verde', 'Le Paradis', 'Lulu Cake', 'Marlon Doceria', 'Mr Cupcake', 'Paneer', 'Parma Doces', 'Recanto da Prosa', 'Sandra Maia Chocolateria', 'Suisse Brownie', 'Very Sugar'],
    awardsStatus: 'completa', awardsNote: 'Sweet Awards com Júri Técnico e Sweet Lovers. Edição em parceria com o Sebrae/RN, com foco em produtos regionais.',
    awards: [
      { category: 'Melhor Combo', track: 'Júri Técnico', winners: places([1, ['Bocaditos']], [2, ['Mr Cupcake']], [3, ['Caroli']]) },
      { category: 'Melhor Doce', track: 'Júri Técnico', winners: places([1, ['Caroli']], [2, ['Mr Cupcake']], [3, ['Bocaditos']]) },
      { category: 'Melhor Salgado', track: 'Júri Técnico', winners: places([1, ['Bocaditos']], [2, ['Sandra Maia']], [3, ['Chocolatudos']]) },
      { category: 'Melhor Bebida', track: 'Júri Técnico', winners: places([1, ['Very Sugar']], [2, ['Cássia Ribeiro']], [3, ['Recanto da Prosa']]) },
      { category: 'Melhor Apresentação', track: 'Júri Técnico', winners: places([1, ['Bocaditos']], [2, ['Marlon']], [3, ['Mine']]) },
      { category: 'Melhor Criatividade', track: 'Júri Técnico', winners: places([1, ['Bocaditos']], [2, ['Marlon']], [3, ['Mine']]) },
      { category: 'Melhor Atendimento', track: 'Júri Técnico', winners: places([1, ['Bem Eu']], [2, ["Duart's"]], [3, ['Delizeu']]) },
      { category: 'Melhor Combo', track: 'Sweet Lovers', winners: places([1, ['Marlon']], [2, ['Mr Cupcake']], [3, ['Delizeu']]) },
      { category: 'Melhor Sabor', track: 'Sweet Lovers', winners: places([1, ['Marlon']], [2, ['Chocolatudos']], [3, ['Delizeu']]) },
      { category: 'Melhor Apresentação', track: 'Sweet Lovers', winners: places([1, ['Marlon']], [2, ['Mr Cupcake']], [3, ['Chocolatudos']]) },
      { category: 'Melhor Criatividade', track: 'Sweet Lovers', winners: places([1, ['Marlon']], [2, ['Mr Cupcake']], [3, ['Delizeu']]) },
      { category: 'Melhor Atendimento', track: 'Sweet Lovers', winners: places([1, ['Marlon']], [2, ['Mr Cupcake']], [3, ['Recanto da Prosa']]) },
      { category: 'Melhor Envolvimento', track: 'Sweet Lovers', winners: places([1, ['Mr Cupcake']], [2, ['Mine']], [3, ['Delizeu']]) },
    ],
    sponsors: [
      { name: 'Sebrae/RN', type: 'parceria' }, { name: 'Cecafés RN', type: 'fornecedor' }, { name: 'Primar Orgânica', type: 'fornecedor' },
      { name: 'Ybiira', type: 'fornecedor' }, { name: 'Fazenda Caju', type: 'fornecedor' },
    ],
  },
  {
    id: '2022', number: 12, year: '2022', code: '2022', label: 'S&C Movies', theme: 'Movies',
    periodo: '06 a 16 de outubro de 2022', participantsCount: 33,
    participants: ['Adocee', 'Aroma Café', 'Aumer', "Bell's", 'Bem Eu', 'Bistrô NL', 'Bocaditos', 'Café Leviz', "Canuto's", 'Caramel', 'Caroli Douces', 'Cecilia Mindêlo', 'Chocolateria Sandra Maia', 'Cássia Ribeiro', 'Daniel Bezerra', 'Dedo de Moça', 'Delicato', 'Doce Lelê', 'Doce Suspiro', 'Douce di Maria', "Duart's", 'Kfé da Vila', 'Mangai', 'Marlon Vinicius', 'Petit Poti', 'Petra Holanda', 'Recanto da Prosa', 'Rádio Café', 'Suisse Brownie', 'Sweet Duo', 'Verysugar', 'Wanessa Cakes', 'Woyla Pedrosa'],
    awardsStatus: 'completa', awardsNote: 'Sweet Awards — votação Sweet Lovers.',
    awards: [
      { category: 'Melhor Combo', track: 'Sweet Lovers', winners: places([1, ["Duart's"]], [2, ['Daniel Bezerra']], [3, ['Marlon']]) },
      { category: 'Melhor Doce', track: 'Sweet Lovers', winners: places([1, ['Daniel Bezerra']], [2, ["Canuto's"]], [3, ["Duart's"]]) },
      { category: 'Melhor Bebida', track: 'Sweet Lovers', winners: places([1, ["Duart's"]], [2, ['Daniel Bezerra']], [3, ["Canuto's"]]) },
      { category: 'Melhor Salgado', track: 'Sweet Lovers', winners: places([1, ['Chocolateria Sandra Maia']], [2, ['Douce di Maria']], [3, ['Marlon']]) },
      { category: 'Encantamento de Loja', track: 'Sweet Lovers', winners: places([1, ['Bistrô NL']], [2, ['Adocee']], [3, ['Marlon']]) },
      { category: 'Melhor Criatividade', track: 'Sweet Lovers', winners: places([1, ["Duart's"]], [2, ['Marlon']], [3, ["Canuto's"]]) },
      { category: 'Melhor Apresentação', track: 'Sweet Lovers', winners: places([1, ['Marlon']], [2, ["Canuto's"]], [3, ["Duart's"]]) },
      { category: 'Melhor Atendimento', track: 'Sweet Lovers', winners: places([1, ['Recanto da Prosa']], [2, ['Dedo de Moça']], [3, ['Daniel Bezerra']]) },
    ],
    sponsors: [
      { name: 'Supernordestão', type: 'patrocínio/parceria' }, { name: 'Moviecom Cinemas', type: 'parceiro' }, { name: 'Eline', type: 'patrocínio' },
    ],
  },
  {
    id: '2023', number: 13, year: '2023', code: '2023', label: 'S&C Trip', theme: 'Trip',
    periodo: '02 a 12 de novembro de 2023', participantsCount: 32,
    participants: ['Adocee', 'Aroma Café', 'Bocaditos', 'Caracol', 'Carcará', 'Caroli Douces', 'Chocolateria Sandra Maia', 'Daniel Bezerra', 'Dedo de Moça', 'Dekacau', 'Delicato', 'Douce di Maria', 'Duarts', 'Fabiana Melo', 'Jefferson Albano', 'Just Coffee', 'Kale do Bem', 'Lu Doces', 'Mangai', 'Marlon Vinicius', 'Mint Coffee', 'O Maestro', 'Parma', 'Petit Poti', 'Pudinharia', 'Radio Café', 'Suisse', 'Sweet Duo', 'Wanessa Cakes', 'Wow Cookies', 'Xodó', 'Canutos'],
    awardsStatus: 'completa', awardsNote: 'Sweet Awards — votação Sweet Lovers.',
    awards: [
      { category: 'Melhor Combo', track: 'Sweet Lovers', winners: places([1, ['O Maestro']], [2, ['Canutos']], [3, ['Marlon']]) },
      { category: 'Melhor Doce', track: 'Sweet Lovers', winners: places([1, ['Canutos']], [2, ['Adocee']], [3, ['Marlon', 'Suisse']]) },
      { category: 'Melhor Salgado', track: 'Sweet Lovers', winners: places([1, ['Sweet Duo']], [2, ['Douce di Maria']], [3, ['Dedo de Moça', 'O Maestro']]) },
      { category: 'Melhor Bebida', track: 'Sweet Lovers', winners: places([1, ['Canutos']], [2, ['Just Coffee']], [3, ['Adocee', 'Marlon']]) },
      { category: 'Melhor Encantamento', track: 'Sweet Lovers', winners: places([1, ['O Maestro']], [2, ['Adocee']], [3, ['Suisse', 'Duarts']]) },
      { category: 'Melhor Atendimento', track: 'Sweet Lovers', winners: places([1, ['Jefferson Albano']], [2, ['O Maestro']], [3, ['Sweet Duo', 'Duarts']]) },
      { category: 'Melhor Criatividade', track: 'Sweet Lovers', winners: places([1, ['Canutos']], [2, ['O Maestro']], [3, ['Duarts', 'Marlon']]) },
      { category: 'Melhor Apresentação', track: 'Sweet Lovers', winners: places([1, ['Canutos']], [2, ['O Maestro']], [3, ['Douce di Maria', 'Marlon']]) },
    ],
  },
  {
    id: '2024', number: 14, year: '2024', code: '2024', label: 'S&C Books', theme: 'Books',
    periodo: '14 a 24 de novembro de 2024', participantsCount: 29,
    participants: ['Adocee', 'Bella Douces', "Bell's", 'Bocaditos', 'Bolo Mania', 'Canutos', 'Caramel', 'Carcará', 'Caroli', 'Casa Bauduco', 'Casa Moscou', 'Dedo de Moça', 'Delicato', 'Diva Café', "Duart's", 'Fabiana Melo', 'Jefferson Albano', 'Just', 'Lu Doces', 'Mangai', 'Marlon', 'O Maestro', 'Parma', 'Puro Café', 'Sol e Café', 'Suisse Brownie', 'Sweet Duo', 'Wanessa Cake', 'Wow Cookies'],
    awardsStatus: 'completa', awardsNote: 'Sweet Awards — votação Sweet Lovers (vencedores lidos nos cards).',
    awards: [
      { category: 'Melhor Combo', track: 'Sweet Lovers', winners: places([1, ['Delicato']], [2, ['O Maestro Café']], [3, ['Bocaditos']]) },
      { category: 'Melhor Doce', track: 'Sweet Lovers', winners: places([1, ['Bocaditos']], [2, ['O Maestro Café']], [3, ['Sweet Duo']]) },
      { category: 'Melhor Bebida', track: 'Sweet Lovers', winners: places([1, ['Delicato']], [2, ["Duart's"]], [3, ['O Maestro Café']]) },
      { category: 'Melhor Salgado', track: 'Sweet Lovers', winners: places([1, ['Bocaditos']], [2, ['Delicato']], [3, ['Just Food&Coffee']]) },
      { category: 'Melhor Apresentação', track: 'Sweet Lovers', winners: places([1, ['Delicato']], [2, ['O Maestro Café & Art']], [3, ["Duart's Confeitaria", 'Just Food&Coffee']]) },
      { category: 'Melhor Criatividade', track: 'Sweet Lovers', winners: places([1, ['Delicato']], [2, ['Just Food&Coffee']], [3, ["Canuto's", 'Bocaditos']]) },
      { category: 'Melhor Atendimento', track: 'Sweet Lovers', winners: places([1, ['O Maestro Café & Art']], [2, ["Canuto's"]], [3, ['Bella Douces']]) },
    ],
    sponsors: [{ name: 'Book Club Natal', type: 'parceiro temático' }],
  },
  {
    id: '2025', number: 15, year: '2025', code: '2025', label: 'S&C Celebration', theme: 'Celebration',
    periodo: '06 a 16 de novembro de 2025', participantsCount: 26,
    participants: ['Adocee', 'Aroma Café', 'Bella Douces', 'Bolomania', "Canuto's", 'Caramel', 'Caroli', 'Casa Baudocco', 'Delicato', "Duart's", 'Estação Açaí', 'Fabiana Melo', 'Jolie', 'Just Food&Coffee', 'Mangai', 'Marlon Vinicius', 'Mr. Cupcake', 'O Maestro Café', 'Padoca do Bosque', 'Paneer', 'Parma', 'Rollab', 'Suisse Brownie', 'Sweet Duo', 'Território Mexicano', 'Wow Cookies'],
    awardsStatus: 'completa', awardsNote: 'Sweet Awards — votação Sweet Lovers (vencedores lidos nos cards).',
    awards: [
      { category: 'Melhor Combo', track: 'Sweet Lovers', winners: places([1, ['Bolomania']], [2, ['O Maestro Café']], [3, ['Delicato']]) },
      { category: 'Melhor Doce', track: 'Sweet Lovers', winners: places([1, ['Jolie']], [2, ['Bolomania']], [3, ['Marlon Vinicius']]) },
      { category: 'Melhor Bebida', track: 'Sweet Lovers', winners: places([1, ['O Maestro Café']], [2, ['Delicato']], [3, ['Mr. Cupcake']]) },
      { category: 'Melhor Salgado', track: 'Sweet Lovers', winners: places([1, ['Rollab']], [2, ['Bolomania']], [3, ['O Maestro Café']]) },
      { category: 'Melhor Apresentação', track: 'Sweet Lovers', winners: places([1, ['Marlon Vinicius']], [2, ['Delicato']], [3, ['O Maestro Café']]) },
      { category: 'Melhor Criatividade', track: 'Sweet Lovers', winners: places([1, ['Marlon Vinicius']], [2, ['Delicato']], [3, ["Duart's"]]) },
      { category: 'Melhor Atendimento', track: 'Sweet Lovers', winners: places([1, ['Bolomania']], [2, ['Marlon Vinicius']], [3, ['Rollab']]) },
    ],
  },
]

// ---- Derivações (calculadas a partir do array — sem números hardcoded soltos) ----
export const historyStats = (() => {
  const total = sweetEditions.reduce((s, e) => s + (e.participantsCount || 0), 0)
  const biggest = sweetEditions.reduce((a, b) => (b.participantsCount > a.participantsCount ? b : a))
  const completa = sweetEditions.filter((e) => e.awardsStatus === 'completa').length
  const semResultado = sweetEditions.filter((e) => e.awardsStatus === 'nao-encontrada').length
  const firstAward = sweetEditions.find((e) => e.awards && e.awards.length > 0)
  return {
    editions: sweetEditions.length,
    range: '2016–2025',
    totalParticipations: total,
    biggest,
    completa,
    semResultado,
    firstAwardYear: firstAward ? firstAward.year : null,
  }
})()

// Top edições por nº de participantes (desc).
export const biggestEditions = [...sweetEditions]
  .sort((a, b) => b.participantsCount - a.participantsCount)
  .slice(0, 6)

// Só edições com algum vencedor carregado (para a página de histórico destacar).
export const editionsWithResults = sweetEditions.filter((e) => e.awards && e.awards.length > 0)
