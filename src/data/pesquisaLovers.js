// Pesquisa Sweet Lovers — versão simplificada (3 seções, 8 perguntas).
// tipo: 'multi' (checkbox), 'single' (radio), 'texto' (campo livre).
// outro: true => acrescenta opção "Outro" com campo de texto.
// max: limite de seleções para 'multi'. obrigatoria: exige resposta.

export const PESQUISA_INTRO = {
  titulo: 'Pesquisa Sweet Lovers',
  texto:
    'Ei, Sweet Lover! Queremos te conhecer melhor para tornar o Sweet & Coffee Week cada vez mais especial para você. São só 3 minutinhos!',
}

export const PESQUISA_SECOES = [
  {
    id: 'estilo',
    titulo: 'Seu estilo',
    perguntas: [
      {
        id: 'q1', tipo: 'multi', obrigatoria: true, outro: true,
        label: 'Nos seus momentos livres, o que você mais curte fazer?',
        opcoes: [
          'Sair para comer ou tomar café',
          'Ouvir música',
          'Ir ao cinema ou teatro',
          'Passear ao ar livre (praia, parque ou praça)',
          'Explorar shoppings e lojas',
          'Eventos culturais e festivais',
          'Praticar esportes',
          'Ficar em casa (séries, jogos, livros)',
          'Viajar e explorar lugares novos',
        ],
      },
      {
        id: 'q2', tipo: 'multi', obrigatoria: true, outro: true, max: 3,
        label: 'Quais desses lugares você frequenta? (escolha até 3)',
        opcoes: [
          'Cafeterias',
          'Docerias e confeitarias',
          'Restaurantes',
          'Bares e pubs',
          'Praças ou Parques',
          'Food parks e mercados gastronômicos',
          'Praias e orla',
        ],
      },
    ],
  },
  {
    id: 'gastronomia',
    titulo: 'Gastronomia',
    perguntas: [
      {
        id: 'q6', tipo: 'multi', obrigatoria: true, outro: true,
        label: 'Quando o assunto é salgado, o que você não resiste?',
        opcoes: [
          'Coxinha',
          'Croissant e folhado',
          'Pão de queijo',
          'Tapioca salgada',
          'Sanduíche artesanal',
          'Empada e esfiha',
          'Quiche',
          'Tábua de frios e bruschetta',
          'Wrap e crepe salgado',
        ],
      },
      {
        id: 'q7', tipo: 'multi', obrigatoria: true, outro: true,
        label: 'E na hora do doce, qual é o seu fraco?',
        opcoes: [
          'Bolo e torta',
          'Brigadeiro e docinhos',
          'Cheesecake',
          'Macaron e petit four',
          'Açaí com granola',
          'Sorvete e gelato',
          'Crepe doce',
          'Brownie e cookies',
          'Bolo no pote',
        ],
      },
    ],
  },
  {
    id: 'scw',
    titulo: 'Cafeterias & SCW',
    perguntas: [
      {
        id: 'q10', tipo: 'single', obrigatoria: true,
        label: 'Com que frequência você vai a cafeterias?',
        opcoes: [
          'Todo dia',
          'Algumas vezes por semana',
          'Uma vez por semana',
          'A cada 15 dias',
          'Raramente',
          'Só em eventos especiais como o SCW',
        ],
      },
      {
        id: 'q11', tipo: 'multi', obrigatoria: true, outro: true, max: 5,
        label: 'O que mais te atrai numa cafeteria ou doceria? (selecione até 5)',
        opcoes: [
          'Qualidade do café',
          'Qualidade do doce',
          'Qualidade do salgado',
          'Ambiente e decoração',
          'Variedade do cardápio',
          'Preço acessível',
          'Localização',
          'Experiência e conceito diferente',
          'Bom atendimento',
        ],
      },
      {
        id: 'q14', tipo: 'multi', obrigatoria: true, outro: true,
        label: 'Qual canal você prefere para ficar por dentro do SCW?',
        opcoes: [
          'Instagram',
          'WhatsApp',
          'E-mail',
          'TikTok',
          'Cartaz e divulgação física',
        ],
      },
      {
        id: 'q15', tipo: 'texto', obrigatoria: false,
        label: 'Deixa um recado pra gente: o que você gostaria de ver na próxima edição?',
      },
    ],
  },
]
