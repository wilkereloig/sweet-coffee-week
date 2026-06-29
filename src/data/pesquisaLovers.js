// Fonte única da Pesquisa Sweet Lovers (réplica do Google Form).
// tipo: 'multi' (checkbox), 'single' (radio), 'texto' (campo livre).
// outro: true => acrescenta opção "Outro" com campo de texto.
// max: limite de seleções para 'multi'. obrigatoria: exige resposta.

export const PESQUISA_INTRO = {
  titulo: 'Pesquisa Sweet Lovers',
  texto:
    'Ei, Sweet Lover! Queremos te conhecer melhor e de quebra você concorre a brindes especiais do Sweet & Coffee Week. São só alguns minutinhos!',
}

export const PESQUISA_SECOES = [
  {
    id: 'lazer',
    titulo: 'Perfil de lazer',
    perguntas: [
      {
        id: 'q1', tipo: 'multi', obrigatoria: true, outro: true,
        label: 'Nos seus momentos livres, o que você mais curte fazer?',
        opcoes: [
          'Sair para comer ou tomar café', 'Ouvir música', 'Ir ao cinema ou teatro',
          'Passear ao ar livre (praia, parque ou praça)', 'Explorar shoppings e lojas',
          'Eventos culturais e festivais', 'Praticar esportes',
          'Ficar em casa (séries, jogos, livros)', 'Viajar e explorar lugares novos',
        ],
      },
      {
        id: 'q2', tipo: 'multi', obrigatoria: true, outro: true, max: 3,
        label: 'Quais desses lugares você frequenta? (escolha até 3)',
        opcoes: [
          'Cafeterias', 'Docerias e confeitarias', 'Restaurantes', 'Bares e pubs',
          'Praças ou Parques', 'Food parks e mercados gastronômicos', 'Praias e orla',
        ],
      },
    ],
  },
  {
    id: 'esportes',
    titulo: 'Esportes',
    perguntas: [
      {
        id: 'q3', tipo: 'single', obrigatoria: true,
        label: 'Você pratica algum esporte ou atividade física?',
        opcoes: ['Sim, regularmente', 'Sim, mas de vez em quando', 'Não pratico no momento'],
      },
      {
        id: 'q4', tipo: 'multi', obrigatoria: false, outro: true,
        label: 'Se sim, quais?',
        opcoes: [
          'Musculação e academia', 'Corrida e caminhada', 'Futebol e futsal',
          'Vôlei e beach vôlei', 'Natação', 'Yoga e pilates', 'Ciclismo',
          'Artes marciais e luta', 'Dança', 'Crossfit e funcional',
        ],
      },
    ],
  },
  {
    id: 'musica',
    titulo: 'Música',
    perguntas: [
      {
        id: 'q5', tipo: 'multi', obrigatoria: true, outro: true,
        label: 'Que estilo de música embala o seu dia a dia?',
        opcoes: [
          'Pop brasileiro', 'Sertanejo', 'MPB e Bossa Nova', 'Rock e Indie',
          'Eletrônico e Lo-fi', 'Forró e Baião', 'Internacional (Pop, R&B, K-pop)',
          'Jazz e Blues', 'Reggae e Soul',
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
          'Coxinha', 'Croissant e folhado', 'Pão de queijo', 'Tapioca salgada',
          'Sanduíche artesanal', 'Empada e esfiha', 'Quiche',
          'Tábua de frios e bruschetta', 'Wrap e crepe salgado',
        ],
      },
      {
        id: 'q7', tipo: 'multi', obrigatoria: true, outro: true,
        label: 'E na hora do doce, qual é o seu fraco?',
        opcoes: [
          'Bolo e torta', 'Brigadeiro e docinhos', 'Cheesecake', 'Macaron e petit four',
          'Açaí com granola', 'Sorvete e gelato', 'Crepe doce', 'Brownie e cookies',
          'Bolo no pote',
        ],
      },
      {
        id: 'q8', tipo: 'single', obrigatoria: true, outro: true,
        label: 'Quando vai a um restaurante, que tipo de comida você mais pede?',
        opcoes: [
          'Brasileira (tradicional)', 'Italiana', 'Japonesa e asiática',
          'Árabe e mediterrânea', 'Hamburguer artesanal', 'Mexicana', 'Frutos do mar',
          'Vegana e vegetariana',
        ],
      },
      {
        id: 'q9', tipo: 'single', obrigatoria: true,
        label: 'Como você se define na hora de comer?',
        opcoes: [
          'Aventureiro: adoro experimentar coisas novas',
          'Fiel: tenho meus favoritos e fico neles',
          'Equilibrado: depende do dia',
          'Saudável: sempre buscando opções leves',
        ],
      },
    ],
  },
  {
    id: 'sweet-lovers',
    titulo: 'Sweet Lovers',
    perguntas: [
      {
        id: 'q10', tipo: 'single', obrigatoria: true,
        label: 'Com que frequência você vai a cafeterias?',
        opcoes: [
          'Todo dia', 'Algumas vezes por semana', 'Uma vez por semana',
          'A cada 15 dias', 'Raramente', 'Só em eventos especiais como o SCW',
        ],
      },
      {
        id: 'q11', tipo: 'multi', obrigatoria: true, outro: true, max: 5,
        label: 'O que mais te atrai numa cafeteria ou doceria? (selecione até 5)',
        opcoes: [
          'Qualidade do café', 'Qualidade do doce', 'Qualidade do salgado',
          'Ambiente e decoração', 'Variedade do cardápio', 'Preço acessível',
          'Localização', 'Experiência e conceito diferente', 'Bom atendimento',
        ],
      },
    ],
  },
  {
    id: 'brindes',
    titulo: 'Brindes e prêmios',
    perguntas: [
      {
        id: 'q12', tipo: 'multi', obrigatoria: true, outro: true,
        label: 'Que tipo de brinde seria realmente útil pra você no dia a dia?',
        opcoes: [
          'Copo e caneca temática', 'Kit de café em casa',
          'Voucher em estabelecimentos parceiros', 'Necessaire ou acessório de bolsa',
          'Voucher de experiência gastronômica', 'Livro ou planner', 'Ecobag estilosa',
          'Fone de ouvido e acessório tech',
        ],
      },
      {
        id: 'q13', tipo: 'single', obrigatoria: true, outro: true,
        label: 'E se fosse um prêmio maior, o que você escolheria?',
        opcoes: [
          'Viagem curta (passagem e hospedagem)', 'Experiência gastronômica premium',
          'Kit de equipamentos de café', 'Vale-presente em loja de lifestyle',
          'Curso ou workshop de café e gastronomia',
        ],
      },
    ],
  },
  {
    id: 'conexao',
    titulo: 'Conexão com o SCW',
    perguntas: [
      {
        id: 'q14', tipo: 'multi', obrigatoria: true, outro: true,
        label: 'Qual canal você prefere para ficar por dentro do SCW?',
        opcoes: ['Instagram', 'WhatsApp', 'E-mail', 'TikTok', 'Cartaz e divulgação física'],
      },
      {
        id: 'q15', tipo: 'texto', obrigatoria: false,
        label: 'Deixa um recado pra gente: o que você gostaria de ver no próximo Sweet?',
      },
    ],
  },
]
