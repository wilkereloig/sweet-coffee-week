// Configuração da votação do Sweet Awards (Sweet & Coffee Week Lovers).
// Textos, categorias, perguntas e janela de votação. Os participantes vêm de
// participants.js (slug + nome) para manter a lista sempre sincronizada.

import { PARTICIPANTS } from './participants'

// Janela oficial da votação (fuso de Natal/RN). Inclusivo: abre 04/06, fecha fim do dia 16/06.
export const AWARDS_VOTING = {
  opensAt: '2026-06-03T00:00:00-03:00',
  closesAt: '2026-06-16T23:59:59-03:00',
}

// Categorias oficiais. `key` casa com get_rankings(); `field` = coluna de nota em `votos`.
// Categorias avaliadas no formulário (7). O prêmio "Melhor Combo" NÃO é uma
// pergunta: é derivado da média de Doce + Salgado + Bebida (calculado no banco).
export const AWARDS_CATEGORIES = [
  { key: 'atendimento',  field: 'nota_atendimento',  label: 'Atendimento',          question: 'Qual nota você dá para o atendimento?',           help: 'Simpatia, agilidade e cuidado da equipe.' },
  { key: 'criatividade', field: 'nota_criatividade', label: 'Criatividade',         question: 'Qual nota você dá para a criatividade do combo?', help: 'Originalidade e ousadia na criação do combo.' },
  { key: 'apresentacao', field: 'nota_apresentacao', label: 'Apresentação',         question: 'Qual nota você dá para a apresentação do combo?', help: 'Capricho e beleza visual na montagem.' },
  { key: 'doce',         field: 'nota_doce',         label: 'Doce',                 question: 'Qual nota você dá para o doce?',                   help: 'Sabor e qualidade do item doce.' },
  { key: 'salgado',      field: 'nota_salgado',      label: 'Salgado',              question: 'Qual nota você dá para o salgado?',                help: 'Sabor e qualidade do item salgado.' },
  { key: 'bebida',       field: 'nota_bebida',       label: 'Bebida',               question: 'Qual nota você dá para a bebida?',                 help: 'Sabor e harmonia da bebida.' },
  { key: 'envolvimento', field: 'nota_encantamento', label: 'Envolvimento em Loja', question: 'Qual nota você dá para o envolvimento da loja com o tema?', help: 'Como a loja viveu o tema: ativação, ações, cenários, vestimenta diferenciada, espaço instagramável — tudo que envolveu o tema dentro da loja.' },
]

// Escala de notas: 5 (menor) a 10 (maior).
export const AWARDS_SCALE = [5, 6, 7, 8, 9, 10]

export const GENDER_OPTIONS = ['Feminino', 'Masculino', 'Prefiro não informar', 'Outro']

// Captação de público (obrigatórios na etapa "Seus dados").
export const ESCOLARIDADE_OPTIONS = ['Ensino básico', 'Ensino médio', 'Ensino superior', 'Pós-graduação ou mais', 'Prefiro não informar']
export const FAIXA_ETARIA_OPTIONS = ['Até 17', '18–24', '25–39', '40–59', '60+']

// Participantes para o select, em ordem alfabética (slug = chave no banco).
export const AWARDS_PARTICIPANTS = PARTICIPANTS
  .map(p => ({ slug: p.slug, name: p.name }))
  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

export const AWARDS_TEXTS = {
  hero: {
    eyebrow: 'Sweet Awards',
    title: 'Aqui você é o jurado!',
    intro:
      'O Sweet & Coffee Week Lovers quer saber quais foram os grandes destaques desta edição. ' +
      'Depois de experimentar um combo, avalie o participante nas categorias do Sweet Awards: ' +
      'Atendimento, Criatividade, Apresentação, Doce, Salgado, Bebida e Envolvimento em Loja. ' +
      'O prêmio de Melhor Combo sai da média entre Doce, Salgado e Bebida.',
    sub:
      'Em cada categoria são reconhecidos os participantes em 1º, 2º e 3º lugar, de acordo com as avaliações do público. ' +
      'Participe, avalie seus combos favoritos e concorra a vouchers, brindes oficiais e prêmios surpresa. ' +
      'A divulgação dos prêmios surpresa acontece nos stories do @sweetcoffeeweek.',
  },
  cta: 'Votar no Sweet Awards',
  regulamento: [
    'Siga o perfil oficial @sweetcoffeeweek no Instagram.',
    'Preencha corretamente os dados solicitados no formulário.',
    'Avalie apenas combos que você experimentou.',
    'Válido só para combos da edição Sweet & Coffee Week Lovers (04 a 16 de junho).',
    'Você pode avaliar todos os estabelecimentos que visitar.',
    'Apenas 1 voto por estabelecimento, por participante.',
    'Havendo mais de um envio para o mesmo estabelecimento com o mesmo nome, e-mail, telefone ou Instagram, vale o último voto registrado.',
    'O participante deve morar no Brasil.',
    'Não participam dos sorteios pessoas ligadas à organização, aos estabelecimentos, colaboradores das marcas e parentes de 1º grau.',
    'As avaliações compõem o ranking do Sweet Awards (1º, 2º e 3º lugar por categoria).',
    'A organização pode desconsiderar votos inconsistentes, duplicados, incompletos ou suspeitos.',
  ],
  followNote: 'Para participar, siga @sweetcoffeeweek no Instagram.',
  success: {
    title: 'Voto recebido!',
    body:
      'Obrigado por participar do Sweet Awards. Sua avaliação foi registrada e vai ajudar a escolher os grandes ' +
      'destaques do Sweet & Coffee Week Lovers. Você pode votar em todos os estabelecimentos que visitar. ' +
      'Acompanhe o @sweetcoffeeweek para novidades, sorteios e resultados.',
  },
  closed: {
    title: 'Votação encerrada',
    body: 'A votação do Sweet Awards aconteceu de 04 a 16 de junho. Em breve divulgamos os vencedores.',
  },
  results: {
    eyebrow: 'Sweet Awards',
    title: 'Os melhores da edição Lovers',
    intro:
      'O Sweet Awards reconhece os grandes destaques do Sweet & Coffee Week Lovers, a partir das avaliações do público. ' +
      'Foram oito categorias, cada uma com 1º, 2º e 3º lugar.',
  },
}

// Descrição curta de cada categoria para a página de resultado.
export const AWARDS_CATEGORY_BLURB = {
  melhor_combo: 'Reconhece o melhor combo da edição — média das notas de Doce, Salgado e Bebida.',
  envolvimento: 'Reconhece a loja que mais viveu o tema: ativações, cenários, vestimenta e espaços instagramáveis.',
  apresentacao: 'Reconhece o combo com melhor montagem, estética e impacto visual.',
  atendimento: 'Reconhece o estabelecimento com melhor atendimento ao público.',
  criatividade: 'Reconhece o combo com proposta mais criativa e conectada ao tema da edição.',
  salgado: 'Reconhece o melhor item salgado entre os combos avaliados.',
  doce: 'Reconhece o melhor item doce entre os combos avaliados.',
  bebida: 'Reconhece a melhor bebida entre os combos avaliados.',
}
