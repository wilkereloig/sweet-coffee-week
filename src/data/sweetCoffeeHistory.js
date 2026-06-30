// Base geral histórica do Sweet & Coffee Week.
// Fonte principal: sweet_coffee_data.json + dados consolidados da edição Lovers no projeto.
// Não usar "Sweet" sozinho para se referir ao festival; usar Sweet & Coffee Week, SCW, o festival ou a edição.

// Mapa de rótulo/tom por status de premiação. Fonte de verdade única (antes vivia em
// sweetHistory.js, base legada de 15 edições). Consumido por Edicoes.jsx e HistoricoAwards.jsx.
export const AWARD_STATUS = {
  'nao-teve':       { label: 'Não teve premiação',        tone: 'muted'  },
  'nao-encontrada': { label: 'Premiação não encontrada',  tone: 'warn'   },
  'completa':       { label: 'Premiação completa',         tone: 'ok'     },
  'parcial':        { label: 'Premiação parcial',          tone: 'info'   },
  'a-conferir':     { label: 'A conferir',                 tone: 'info'   },
}

export const SWEET_COFFEE_HISTORY = {
  "meta": {
    "titulo": "Sweet & Coffee Week — Base Histórica Geral",
    "descricao": "Base geral com participantes, premiações (Sweet Awards), períodos e metadados das 16 edições do Sweet & Coffee Week, de 2016 a 2026.1.",
    "fontes": [
      "Instagram @sweetcoffeeweek",
      "Acervo de criação da agência (Experience)",
      "Dados consolidados no projeto ChatGPT/Claude para a edição Sweet & Coffee Week Lovers 2026.1",
      "src/data/participants.js",
      "src/data/sweetAwards.js"
    ],
    "observacoes": {
      "trilhas": "trilha pode ser 'juri_tecnico', 'sweet_lovers' ou null (quando a peça não distingue trilha).",
      "empates": "cada colocação tem um array 'nomes'; quando há empate, o array tem mais de um nome.",
      "status_premiacao": "'completa' | 'nao-teve' | 'nao-encontrada'",
      "lovers_2026_1": "A edição Lovers foi adicionada à base geral com participantes, período, conceito, categorias oficiais e links dos posts oficiais de resultado. Os pódios estruturados por categoria devem ser preenchidos a partir dos cards/posts oficiais caso ainda não estejam em fonte estruturada."
    }
  },
  "patrocinadoresFixos": {
    "realizacao": "Experience (F2 Experience)",
    "apoio": [
      "Espaço Reduzido (edições recentes, confirmado em 2025)"
    ],
    "plataformaVotacao": "Easy Menu (edições 2020–2021)",
    "fotografia": [
      "@andreylourenco",
      "@breno_sillva"
    ]
  },
  "edicoes": [
    {
      "id": "2016",
      "ordem": 1,
      "nome": "S&C / Início",
      "tema": null,
      "periodo": "01 a 11 de setembro de 2016",
      "participantesCount": 13,
      "participantes": [
        "LaSweets por Larissa Pio",
        "Bocaditos Doceria & Café",
        "Liliane Moura Confiserie",
        "Jolie Pâtisserie",
        "Margarita Café & Ateliê de Doces",
        "Realize Gourmet",
        "Rafaela Fontes Chocolateria",
        "Chapelatto Coffee Shop",
        "Jana's Cakes",
        "Cecilia Mindêlo Brownies",
        "Boca D'Água Delicatessen",
        "Rosa Lemos Chocolate & Café",
        "Barões do Café"
      ],
      "premiacao": {
        "status": "nao-teve",
        "observacao": "1ª edição — apenas circuito gastronômico.",
        "categorias": []
      },
      "patrocinadores": {
        "parceiros": []
      }
    },
    {
      "id": "2017.1",
      "ordem": 2,
      "nome": "S&C Páscoa",
      "tema": "Páscoa",
      "periodo": "03 a 12 de abril de 2017",
      "participantesCount": 17,
      "participantes": [
        "Realize Gourmet",
        "Engenho Doce",
        "Confeitaria Jana's Cakes",
        "Doce Arthe Confeitaria",
        "Barões do Café",
        "Boca D'Água Delicatessen",
        "Casa de Taipa Tapiocaria",
        "TuttiMac",
        "Berlin Cafeteria",
        "FitNeza Coffee",
        "Chocolateria Sandra Maia",
        "Bocaditos Confeitaria Artesanal",
        "Very Sugar",
        "Jolie Pâtisserie",
        "Cecilia Mindêlo",
        "Chapelatto Coffee Shop",
        "Chocolateria Rafaela Fontes"
      ],
      "premiacao": {
        "status": "nao-teve",
        "observacao": "Sem premiação (Sweet Awards começou em 2019).",
        "categorias": []
      },
      "patrocinadores": {
        "parceiros": []
      }
    },
    {
      "id": "2017.2",
      "ordem": 3,
      "nome": "S&C Doces do Mundo",
      "tema": "Doces do Mundo",
      "periodo": "05 a 15 de outubro de 2017",
      "participantesCount": 22,
      "participantes": [
        "Barões do Café",
        "Boca D'Água",
        "Café da Ordem",
        "Caroli",
        "Croasonho",
        "Daguia",
        "Suisse Brownie",
        "Berlin",
        "Bocaditos",
        "Bolo da Vovó",
        "Cecilia Mindêlo",
        "Crooks",
        "Engenho Doce",
        "Fritz",
        "Jana's Cake",
        "Jolie Parissiere",
        "La Sweets",
        "Pinga Fogo",
        "Rafaela Fontes",
        "Realize",
        "Sandra Maia",
        "Very Sugar"
      ],
      "premiacao": {
        "status": "nao-teve",
        "observacao": "Sem premiação.",
        "categorias": []
      },
      "patrocinadores": {
        "parceiros": []
      }
    },
    {
      "id": "2018.1",
      "ordem": 4,
      "nome": "S&C Namorados",
      "tema": "Namorados",
      "periodo": "07 a 16 de junho de 2018",
      "participantesCount": 21,
      "participantes": [
        "A Doceria",
        "Barões",
        "Berlim",
        "Bolo da Vovó",
        "Caroli",
        "Cecilia Brownie",
        "Chapelatto",
        "Crooks",
        "Daguia",
        "Fitneza",
        "Jana's Cake",
        "La Sweets",
        "Mr Brownie",
        "Paddy's",
        "Parma",
        "Rafaela Fontes",
        "Realize Gourmet",
        "Sandra Maia",
        "Swiss Brownie",
        "The Brownie Factory",
        "Very Sugar"
      ],
      "premiacao": {
        "status": "nao-teve",
        "observacao": "Sem premiação.",
        "categorias": []
      },
      "patrocinadores": {
        "parceiros": []
      }
    },
    {
      "id": "2018.2",
      "ordem": 5,
      "nome": "S&C Sabores da Infância",
      "tema": "Sabores da Infância",
      "periodo": "12 a 21 de outubro de 2018",
      "participantesCount": 25,
      "participantes": [
        "A Doceria",
        "Barões do Café",
        "Berlin Cafeteria",
        "Boca D'Água",
        "Bolo da Vovó",
        "Cacau Show",
        "Caroli Douces",
        "Cecilia Mindêlo",
        "Chapelatto",
        "Chocolateria Sandra Maia",
        "Crooks",
        "Daguia",
        "Das Melo",
        "Edileuza Doces Finos",
        "Fitneza",
        "Jana's Cakes",
        "Jolie Pâtisserie",
        "La Sweets",
        "Mr Cupcake",
        "Parma Doces",
        "Rafaela Fontes",
        "Realize Gourmet",
        "Sodiê",
        "Suisse Brownie",
        "Very Sugar"
      ],
      "premiacao": {
        "status": "nao-teve",
        "observacao": "Sem premiação.",
        "categorias": []
      },
      "patrocinadores": {
        "parceiros": []
      }
    },
    {
      "id": "2019.1",
      "ordem": 6,
      "nome": "S&C Pâtisserie Francesa",
      "tema": "Pâtisserie Francesa",
      "periodo": "15 a 25 de maio de 2019",
      "participantesCount": 28,
      "participantes": [
        "Siga Balzac Café",
        "Boca D'Água",
        "Bocaditos",
        "Bolo da Vovó",
        "Cacau Show",
        "Caffeina",
        "Café Brigadeiro",
        "Caroli",
        "Casa Nacre",
        "Cecília Mindelo",
        "Chapelatto",
        "Crooks Cookies",
        "Cuore di Panna",
        "Das Melo",
        "Fitneza",
        "Flor e Flor",
        "Flora Cafeteria",
        "Frans Café",
        "Jolie",
        "La Sweets",
        "Mr Cupcake",
        "Parma Doces",
        "Rafaela Fontes",
        "Realize Gourmet",
        "Sodiê",
        "Sonho de Brownie",
        "Suisse Brownie",
        "Very Sugar"
      ],
      "premiacao": {
        "status": "completa",
        "observacao": "Votação do público (categoria única: Melhor Combo).",
        "categorias": [
          {
            "categoria": "Melhor Combo",
            "trilha": null,
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Jolie"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Sonho de Brownie"
                ]
              }
            ]
          }
        ]
      },
      "patrocinadores": {
        "parceiros": []
      }
    },
    {
      "id": "2019.2",
      "ordem": 7,
      "nome": "S&C Contos de Fadas",
      "tema": "Contos de Fadas",
      "periodo": "05 a 15 de setembro de 2019",
      "participantesCount": 36,
      "participantes": [
        "Atelier Mine",
        "Siga Balzac",
        "Boca D'Água",
        "Bocaditos",
        "Bolo da Vovó",
        "Cacau Show",
        "Café Brigadeiro",
        "Caffeina",
        "Camila Melo",
        "Caroli",
        "Casa Nacre",
        "Casa de Taipa",
        "Cecilia Mindelo",
        "Chapelatto",
        "Chef Fits",
        "Cookorote",
        "Crooks",
        "Cuore di Panna",
        "Das Melo",
        "Edileuza Doces",
        "Flor e Flor",
        "Flora Café",
        "Frans Café",
        "Jana's Cake",
        "Jolie",
        "Mr Cupcake",
        "Nick Buffet",
        "Paneer",
        "Parma Doces",
        "Pinga Fogo Doceria",
        "Rafaela Fontes",
        "Realize Gourmet",
        "Sodiê Doces",
        "Sonho de Brownie",
        "Suisse Brownie",
        "Very Sugar"
      ],
      "premiacao": {
        "status": "completa",
        "observacao": "Votação do público (categoria única: Melhor Combo).",
        "categorias": [
          {
            "categoria": "Melhor Combo",
            "trilha": null,
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bocaditos"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Chapelatto"
                ]
              }
            ]
          }
        ]
      },
      "patrocinadores": {
        "parceiros": [
          {
            "nome": "Eloi Chaves",
            "tipo": "patrocínio"
          },
          {
            "nome": "Romance Brazil",
            "tipo": "patrocínio"
          },
          {
            "nome": "Adega Perlage",
            "tipo": "apoio"
          },
          {
            "nome": "Cia Era uma Vez",
            "tipo": "apoio"
          },
          {
            "nome": "Espaço Festejar",
            "tipo": "cerimônia"
          }
        ]
      }
    },
    {
      "id": "2020.1",
      "ordem": 8,
      "nome": "S&C No Ritmo da Música",
      "tema": "No Ritmo da Música",
      "periodo": "julho de 2020 (encerramento 19–20/jul; início aprox.)",
      "participantesCount": 18,
      "participantes": [
        "Petra Holanda",
        "Café Brigadeiro",
        "Papo de Anjo",
        "Atelier Mine Confeitaria",
        "Bella Pettit",
        "Bocaditos",
        "Cecília Mindêlo",
        "Momento Gourmet",
        "Caroli",
        "Casa Nacre",
        "Casa dos Salgados Gourmet",
        "Cuore di Panna",
        "Das Melo",
        "Kopenhagen",
        "Stephany Santos",
        "Macarons Cookorote",
        "Rafaela Fontes",
        "Very Sugar"
      ],
      "premiacao": {
        "status": "completa",
        "observacao": "Votação do público (categoria única: Melhor Combo).",
        "categorias": [
          {
            "categoria": "Melhor Combo",
            "trilha": null,
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bocaditos"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Rafaela Fontes"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Momento Gourmet"
                ]
              }
            ]
          }
        ]
      },
      "patrocinadores": {
        "parceiros": []
      }
    },
    {
      "id": "2020.2",
      "ordem": 9,
      "nome": "S&C Heróis & Vilões",
      "tema": "Heróis & Vilões",
      "periodo": "12 a 22 de novembro de 2020",
      "participantesCount": 27,
      "participantes": [
        "Bella Petit",
        "Bell's",
        "Bocaditos",
        "Café Brigadeiro",
        "Café com Bike",
        "Caroli",
        "Casa de Taipa",
        "Casa dos Salgados Gourmet",
        "Casa Nacre",
        "Cecilia Mindelo",
        "Chocolatudos",
        "Cookorote",
        "Das Melo",
        "Delizeu",
        "Dolce Gelato",
        "Edileuza Doces Finos",
        "Frans Café",
        "Jolie",
        "Mangai",
        "Mine Confeitaria",
        "Momento Gourmet",
        "Mr Cupcake",
        "Paneer",
        "Rafaela Fontes",
        "Realize Gourmet",
        "Suisse Brownie",
        "Very Sugar"
      ],
      "observacaoParticipantes": "O acervo também traz uma logo 'Kyara' (possível 28º participante / substituição) — a conferir.",
      "premiacao": {
        "status": "completa",
        "observacao": "Sweet Awards. Melhor Combo teve Júri Técnico e Sweet Lovers; demais categorias sem distinção de trilha nas peças.",
        "categorias": [
          {
            "categoria": "Melhor Combo",
            "trilha": "juri_tecnico",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bocaditos"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Cookorote",
                  "Paneer"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Combo",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Bocaditos"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Casa dos Salgados Gourmet"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Takeaway/Delivery",
            "trilha": null,
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Momento Gourmet"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Bocaditos"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Casa dos Salgados Gourmet"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Atendimento",
            "trilha": null,
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Casa dos Salgados Gourmet"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Jolie"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Mr Cupcake"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Sabor",
            "trilha": null,
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bocaditos"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Casa dos Salgados Gourmet"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Mr Cupcake"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Criatividade",
            "trilha": null,
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Bocaditos"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Jolie"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Apresentação",
            "trilha": null,
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Das Melo"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Jolie"
                ]
              }
            ]
          }
        ]
      },
      "patrocinadores": {
        "parceiros": []
      }
    },
    {
      "id": "2021.1",
      "ordem": 10,
      "nome": "S&C Séries",
      "tema": "Séries",
      "periodo": "22 de julho a 01 de agosto de 2021",
      "participantesCount": 30,
      "participantes": [
        "Lulu Café",
        "Bem Eu Confeitaria",
        "Aumer",
        "Bell's",
        "Café Leviz",
        "Casa dos Salgados",
        "Bendita Confeitaria",
        "Chocolatudo",
        "Cacau Show",
        "Marlon Gastronomia",
        "Bella Peti",
        "Cássia Ribeiro",
        "Paneer",
        "Casa Nacre",
        "Royal Trudel",
        "Franz Café",
        "Very Sugar",
        "Cecília Mindêlo",
        "Bocaditos",
        "Rafaela Fontes",
        "Caroli Douces",
        "Mine",
        "Das Melo",
        "Mangai",
        "Suisse",
        "Mr Cupcake",
        "Momento Gourmet",
        "Radio Café",
        "Carol Dantas",
        "Café Brigadeiro"
      ],
      "premiacao": {
        "status": "completa",
        "observacao": "Sweet Awards com Júri Técnico e Sweet Lovers + Menção Honrosa. Vencedores lidos nos cards do acervo (não foram postados no feed).",
        "categorias": [
          {
            "categoria": "Melhor Combo",
            "trilha": "juri_tecnico",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Cássia Ribeiro"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Atelier Mine Confeitaria"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Bocaditos"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Doce",
            "trilha": "juri_tecnico",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Cássia Ribeiro"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Cecília Mindêlo"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Das Melo"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Salgado",
            "trilha": "juri_tecnico",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Cássia Ribeiro"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Marlon Gastronomia"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Cecília Mindêlo"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Bebida",
            "trilha": "juri_tecnico",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Cássia Ribeiro"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Atelier Mine Confeitaria"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Very Sugar"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Criatividade",
            "trilha": "juri_tecnico",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bocaditos"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Atelier Mine Confeitaria"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Apresentação",
            "trilha": "juri_tecnico",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bell's Cafeteria"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Atelier Mine Confeitaria"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Das Melo"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Combo",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Atelier Mine Confeitaria",
                  "Bendita Confeitaria"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Bell's Cafeteria"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Sabor",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Cecília Mindêlo"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Bell's Cafeteria"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Apresentação",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Bell's Cafeteria"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Atelier Mine Confeitaria"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Atendimento",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bendita Confeitaria"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Atelier Mine Confeitaria"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Mr Cupcake"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Criatividade",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Atelier Mine Confeitaria"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Bocaditos"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Delivery",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bell's Cafeteria"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Bocaditos"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Casa dos Salgados"
                ]
              }
            ]
          }
        ],
        "mencaoHonrosa": {
          "categoria": "Envolvimento e Encantamento em Loja",
          "nomes": [
            "Mr Cupcake",
            "Rafaela Fontes",
            "Chocolatudos por Laís",
            "Atelier Mine Confeitaria"
          ]
        }
      },
      "patrocinadores": {
        "parceiros": []
      }
    },
    {
      "id": "2021.2",
      "ordem": 11,
      "nome": "S&C Terras Potiguares",
      "tema": "Terras Potiguares",
      "periodo": "18 a 28 de novembro de 2021",
      "participantesCount": 30,
      "participantes": [
        "Atelier Mine",
        "Aumer Restaurante",
        "Bell's Café",
        "Bem Eu",
        "Bendita",
        "Bocaditos",
        "Café Brigadeiro",
        "Carol Dantas",
        "Caroli",
        "Cássia Ribeiro",
        "Cecília Mindelo",
        "Chefit",
        "Chocolatudos",
        "Da Terra",
        "Delizeu",
        "Doce Lelê",
        "Douce Bien",
        "Duart's",
        "Frans Cidade Jardim",
        "Frans Cidade Verde",
        "Le Paradis",
        "Lulu Cake",
        "Marlon Doceria",
        "Mr Cupcake",
        "Paneer",
        "Parma Doces",
        "Recanto da Prosa",
        "Sandra Maia Chocolateria",
        "Suisse Brownie",
        "Very Sugar"
      ],
      "premiacao": {
        "status": "completa",
        "observacao": "Sweet Awards com Júri Técnico e Sweet Lovers.",
        "categorias": [
          {
            "categoria": "Melhor Combo",
            "trilha": "juri_tecnico",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bocaditos"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Caroli"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Doce",
            "trilha": "juri_tecnico",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Caroli"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Bocaditos"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Salgado",
            "trilha": "juri_tecnico",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bocaditos"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Sandra Maia"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Chocolatudos"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Bebida",
            "trilha": "juri_tecnico",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Very Sugar"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Cássia Ribeiro"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Recanto da Prosa"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Apresentação",
            "trilha": "juri_tecnico",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bocaditos"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Marlon"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Mine"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Criatividade",
            "trilha": "juri_tecnico",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bocaditos"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Marlon"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Mine"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Atendimento",
            "trilha": "juri_tecnico",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bem Eu"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Duart's"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Delizeu"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Combo",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Marlon"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Delizeu"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Sabor",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Marlon"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Chocolatudos"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Delizeu"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Apresentação",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Marlon"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Chocolatudos"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Criatividade",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Marlon"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Delizeu"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Atendimento",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Marlon"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Recanto da Prosa"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Envolvimento",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Mr Cupcake"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mine"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Delizeu"
                ]
              }
            ]
          }
        ]
      },
      "patrocinadores": {
        "parceiros": [
          {
            "nome": "Sebrae/RN",
            "tipo": "parceria"
          },
          {
            "nome": "Cecafés RN",
            "tipo": "fornecedor"
          },
          {
            "nome": "Primar Orgânica",
            "tipo": "fornecedor"
          },
          {
            "nome": "Ybiira",
            "tipo": "fornecedor"
          },
          {
            "nome": "Fazenda Caju",
            "tipo": "fornecedor"
          }
        ]
      }
    },
    {
      "id": "2022",
      "ordem": 12,
      "nome": "S&C Movies",
      "tema": "Movies",
      "periodo": "06 a 16 de outubro de 2022",
      "participantesCount": 33,
      "participantes": [
        "Adocee",
        "Aroma Café",
        "Aumer",
        "Bell's",
        "Bem Eu",
        "Bistrô NL",
        "Bocaditos",
        "Café Leviz",
        "Canuto's",
        "Caramel",
        "Caroli Douces",
        "Cecilia Mindêlo",
        "Chocolateria Sandra Maia",
        "Cássia Ribeiro",
        "Daniel Bezerra",
        "Dedo de Moça",
        "Delicato",
        "Doce Lelê",
        "Doce Suspiro",
        "Douce di Maria",
        "Duart's",
        "Kfé da Vila",
        "Mangai",
        "Marlon Vinicius",
        "Petit Poti",
        "Petra Holanda",
        "Recanto da Prosa",
        "Rádio Café",
        "Suisse Brownie",
        "Sweet Duo",
        "Verysugar",
        "Wanessa Cakes",
        "Woyla Pedrosa"
      ],
      "premiacao": {
        "status": "completa",
        "observacao": "Sweet Awards — votação Sweet Lovers.",
        "categorias": [
          {
            "categoria": "Melhor Combo",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Duart's"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Daniel Bezerra"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Marlon"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Doce",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Daniel Bezerra"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Canuto's"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Duart's"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Bebida",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Duart's"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Daniel Bezerra"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Canuto's"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Salgado",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Chocolateria Sandra Maia"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Douce di Maria"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Marlon"
                ]
              }
            ]
          },
          {
            "categoria": "Encantamento de Loja",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bistrô NL"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Adocee"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Marlon"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Criatividade",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Duart's"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Marlon"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Canuto's"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Apresentação",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Marlon"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Canuto's"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Duart's"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Atendimento",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Recanto da Prosa"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Dedo de Moça"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Daniel Bezerra"
                ]
              }
            ]
          }
        ]
      },
      "patrocinadores": {
        "parceiros": [
          {
            "nome": "Supernordestão",
            "tipo": "patrocínio/parceria"
          },
          {
            "nome": "Moviecom Cinemas",
            "tipo": "parceiro"
          },
          {
            "nome": "Eline",
            "tipo": "patrocínio"
          }
        ]
      }
    },
    {
      "id": "2023",
      "ordem": 13,
      "nome": "S&C Trip",
      "tema": "Trip",
      "periodo": "02 a 12 de novembro de 2023",
      "participantesCount": 32,
      "participantes": [
        "Adocee",
        "Aroma Café",
        "Bocaditos",
        "Canutos",
        "Caracol",
        "Carcará",
        "Caroli Douces",
        "Chocolateria Sandra Maia",
        "Daniel Bezerra",
        "Dedo de Moça",
        "Dekacau",
        "Delicato",
        "Douce di Maria",
        "Duarts",
        "Fabiana Melo",
        "Jefferson Albano",
        "Just Coffee",
        "Kale do Bem",
        "Lu Doces",
        "Mangai",
        "Marlon Vinicius",
        "Mint Coffee",
        "O Maestro",
        "Parma",
        "Petit Poti",
        "Pudinharia",
        "Radio Café",
        "Suisse",
        "Sweet Duo",
        "Wanessa Cakes",
        "Wow Cookies",
        "Xodó"
      ],
      "premiacao": {
        "status": "completa",
        "observacao": "Sweet Awards — votação Sweet Lovers.",
        "categorias": [
          {
            "categoria": "Melhor Combo",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "O Maestro"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Canutos"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Marlon"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Doce",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Canutos"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Adocee"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Marlon",
                  "Suisse"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Salgado",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Sweet Duo"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Douce di Maria"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Dedo de Moça",
                  "O Maestro"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Bebida",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Canutos"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Just Coffee"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Adocee",
                  "Marlon"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Encantamento",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "O Maestro"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Adocee"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Suisse",
                  "Duarts"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Atendimento",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Jefferson Albano"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "O Maestro"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Sweet Duo",
                  "Duarts"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Criatividade",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Canutos"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "O Maestro"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Duarts",
                  "Marlon"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Apresentação",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Canutos"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "O Maestro"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Douce di Maria",
                  "Marlon"
                ]
              }
            ]
          }
        ]
      },
      "patrocinadores": {
        "parceiros": []
      }
    },
    {
      "id": "2024",
      "ordem": 14,
      "nome": "S&C Books",
      "tema": "Books",
      "periodo": "14 a 24 de novembro de 2024",
      "participantesCount": 29,
      "participantes": [
        "Adocee",
        "Bella Douces",
        "Bell's",
        "Bocaditos",
        "Bolo Mania",
        "Canutos",
        "Caramel",
        "Carcará",
        "Caroli",
        "Casa Bauduco",
        "Casa Moscou",
        "Dedo de Moça",
        "Delicato",
        "Diva Café",
        "Duart's",
        "Fabiana Melo",
        "Jefferson Albano",
        "Just",
        "Lu Doces",
        "Mangai",
        "Marlon",
        "O Maestro",
        "Parma",
        "Puro Café",
        "Sol e Café",
        "Suisse Brownie",
        "Sweet Duo",
        "Wanessa Cake",
        "Wow Cookies"
      ],
      "premiacao": {
        "status": "completa",
        "observacao": "Sweet Awards — votação Sweet Lovers (vencedores lidos nos cards).",
        "categorias": [
          {
            "categoria": "Melhor Combo",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Delicato"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "O Maestro Café"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Bocaditos"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Doce",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bocaditos"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "O Maestro Café"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Sweet Duo"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Bebida",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Delicato"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Duart's"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "O Maestro Café"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Salgado",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bocaditos"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Delicato"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Just Food&Coffee"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Apresentação",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Delicato"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "O Maestro Café & Art"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Duart's Confeitaria",
                  "Just Food&Coffee"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Criatividade",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Delicato"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Just Food&Coffee"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Canuto's",
                  "Bocaditos"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Atendimento",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "O Maestro Café & Art"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Canuto's"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Bella Douces"
                ]
              }
            ]
          }
        ]
      },
      "patrocinadores": {
        "parceiros": [
          {
            "nome": "Book Club Natal",
            "tipo": "parceiro temático"
          }
        ]
      }
    },
    {
      "id": "2025",
      "ordem": 15,
      "nome": "S&C Celebration",
      "tema": "Celebration",
      "periodo": "06 a 16 de novembro de 2025",
      "participantesCount": 26,
      "participantes": [
        "Adocee",
        "Aroma Café",
        "Bella Douces",
        "Bolomania",
        "Canuto's",
        "Caramel",
        "Caroli",
        "Casa Baudocco",
        "Delicato",
        "Duart's",
        "Estação Açaí",
        "Fabiana Melo",
        "Jolie",
        "Just Food&Coffee",
        "Mangai",
        "Marlon Vinicius",
        "Mr. Cupcake",
        "O Maestro Café",
        "Padoca do Bosque",
        "Paneer",
        "Parma",
        "Rollab",
        "Suisse Brownie",
        "Sweet Duo",
        "Território Mexicano",
        "Wow Cookies"
      ],
      "premiacao": {
        "status": "completa",
        "observacao": "Sweet Awards — votação Sweet Lovers (vencedores lidos nos cards).",
        "categorias": [
          {
            "categoria": "Melhor Combo",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bolomania"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "O Maestro Café"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Delicato"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Doce",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Jolie"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Bolomania"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Marlon Vinicius"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Bebida",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "O Maestro Café"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Delicato"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Mr. Cupcake"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Salgado",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Rollab"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Bolomania"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "O Maestro Café"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Apresentação",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Marlon Vinicius"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Delicato"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "O Maestro Café"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Criatividade",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Marlon Vinicius"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Delicato"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Duart's"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Atendimento",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bolomania"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Marlon Vinicius"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Rollab"
                ]
              }
            ]
          }
        ]
      },
      "patrocinadores": {
        "parceiros": []
      }
    },
    {
      "id": "2026.1",
      "ordem": 16,
      "nome": "Sweet & Coffee Week Lovers",
      "tema": "Lovers",
      "slogan": "Feito de amor, recriando sabores.",
      "periodo": "04 a 14 de junho de 2026",
      "comboValor": "R$ 38,90",
      "participantesCount": 21,
      "participantes": [
        "Adocee Doceria",
        "Bolomania",
        "Caffè Basilico’s",
        "Canuto’s",
        "Caroli Douces",
        "Casa 1190 - Restaurant e Coffee",
        "Casa de Taipa Tapiocaria",
        "Delicato Bolos",
        "Douce di Maria",
        "Jolie Café Pâtisserie",
        "Just Food&Coffee",
        "Mangai",
        "Mr. Cupcake Confeitaria",
        "O Maestro Café",
        "Olí Gastrô",
        "Padoca do Bosque",
        "Paneer Pâtisserie",
        "Parma Doces",
        "Rollab Confeitaria",
        "Sweet Duo Confeitaria",
        "Wow Cookies"
      ],
      "conceito": "Edição comemorativa dos 10 anos do Sweet & Coffee Week, criada como homenagem aos Sweet Lovers e à memória construída pelo público, participantes, parceiros e cidade. A proposta convidou cada participante a escolher um tema já realizado na história do festival e recriá-lo com um combo inédito.",
      "formato": "1 doce + 1 salgado + 1 bebida",
      "premiacao": {
        "status": "completa_em_publicacoes_oficiais",
        "observacao": "Sweet Awards — avaliação do público. Categorias e posts oficiais registrados no projeto. Pódios estruturados por categoria devem ser preenchidos a partir dos cards/posts oficiais caso ainda não estejam em arquivo estruturado.",
        "trilhaPadrao": "sweet_lovers",
        "categorias": [
          {
            "categoria": "Melhor Combo",
            "key": "melhor_combo",
            "trilha": "sweet_lovers",
            "postResultado": "https://www.instagram.com/sweetcoffeeweek/p/DZ3chEuFJxX/",
            "descricao": "Reconhece o melhor combo da edição — média das notas de Doce, Salgado e Bebida.",
            "colocacoes": []
          },
          {
            "categoria": "Melhor Atendimento",
            "key": "atendimento",
            "trilha": "sweet_lovers",
            "postResultado": "https://www.instagram.com/sweetcoffeeweek/p/DZ22cPZlIw0/",
            "descricao": "Cuidado, simpatia e agilidade na recepção do público.",
            "colocacoes": []
          },
          {
            "categoria": "Melhor Criatividade",
            "key": "criatividade",
            "trilha": "sweet_lovers",
            "postResultado": "https://www.instagram.com/sweetcoffeeweek/p/DZ3HpCMFI9u/",
            "descricao": "A proposta mais original e autoral, conectada ao tema da edição.",
            "colocacoes": []
          },
          {
            "categoria": "Melhor Apresentação",
            "key": "apresentacao",
            "trilha": "sweet_lovers",
            "postResultado": "https://www.instagram.com/sweetcoffeeweek/p/DZ284XpFL5r/",
            "descricao": "Maior impacto visual, capricho de montagem e cuidado estético.",
            "colocacoes": []
          },
          {
            "categoria": "Melhor Doce",
            "key": "doce",
            "trilha": "sweet_lovers",
            "postResultado": "https://www.instagram.com/sweetcoffeeweek/p/DZ2wGJxFOOu/",
            "descricao": "O doce que mais se destacou em sabor, execução e conexão com a proposta.",
            "colocacoes": []
          },
          {
            "categoria": "Melhor Salgado",
            "key": "salgado",
            "trilha": "sweet_lovers",
            "postResultado": "https://www.instagram.com/sweetcoffeeweek/p/DZ2n4hrlgdI/",
            "descricao": "O salgado que mais brilhou dentro da composição do combo.",
            "colocacoes": []
          },
          {
            "categoria": "Melhor Bebida",
            "key": "bebida",
            "trilha": "sweet_lovers",
            "postResultado": "https://www.instagram.com/sweetcoffeeweek/p/DZ2hWvzFkT9/",
            "descricao": "A bebida com melhor sabor, harmonia e presença na experiência.",
            "colocacoes": []
          },
          {
            "categoria": "Encantamento em Loja",
            "key": "envolvimento",
            "trilha": "sweet_lovers",
            "postResultado": "https://www.instagram.com/sweetcoffeeweek/p/DZ3NQVsFF2p/",
            "descricao": "Quem mais envolveu o público no tema, pela ambientação e pela experiência no ponto de venda.",
            "colocacoes": []
          }
        ]
      },
      "patrocinadores": {
        "parceiros": []
      },
      "statusDados": {
        "participantes": "completo",
        "premiacaoCategorias": "completo",
        "premiacaoPodios": "pendente_estruturacao",
        "observacao": "Não inventar pódios de Lovers se ainda não estiverem estruturados; usar posts oficiais ou preencher manualmente com os dados validados."
      }
    }
  ],
  "dadosGerais": {
    "nomeOficial": "Sweet & Coffee Week",
    "sigla": "SCW",
    "criadoEm": 2016,
    "cidadeOrigem": "Natal/RN",
    "formatoClassico": "1 doce + 1 salgado + 1 bebida",
    "edicoesRealizadas": 16,
    "observacaoNomenclatura": "Quando se referir ao festival, usar Sweet & Coffee Week, SCW, o festival ou a edição. Não usar Sweet sozinho como apelido do festival."
  },
  "participantAliases": {
    "Mr. Cupcake": [
      "Mr Cupcake",
      "Mr. Cupcake",
      "Mr. Cupcake Confeitaria"
    ],
    "Canuto's": [
      "Canutos",
      "Canuto's",
      "Canuto’s"
    ],
    "Duart's": [
      "Duarts",
      "Duart's",
      "Duart’s",
      "Duart's Confeitaria",
      "Duart’s Confeitaria"
    ],
    "Suisse Brownie": [
      "Suisse",
      "Suisse Brownie",
      "Swiss Brownie"
    ],
    "O Maestro Café": [
      "O Maestro",
      "O Maestro Café",
      "O Maestro Café & Art"
    ],
    "Just Food&Coffee": [
      "Just",
      "Just Coffee",
      "Just Food&Coffee"
    ],
    "Bocaditos": [
      "Bocaditos",
      "Bocaditos Doceria & Café",
      "Bocaditos Confeitaria Artesanal"
    ],
    "Cecília Mindêlo": [
      "Cecilia Mindelo",
      "Cecília Mindêlo",
      "Cecilia Brownie",
      "Cecilia Mindêlo Brownies"
    ],
    "Caroli Douces": [
      "Caroli",
      "Caroli Douces"
    ],
    "Bella Douces": [
      "Bella Petit",
      "Bella Peti",
      "Bella Pettit",
      "Bella Douces"
    ],
    "Atelier Mine": [
      "Atelier Mine",
      "Atelier Mine Confeitaria",
      "Mine",
      "Mine Confeitaria"
    ],
    "Marlon Vinicius": [
      "Marlon",
      "Marlon Vinicius",
      "Marlon Gastronomia",
      "Marlon Doceria"
    ],
    "Bolomania": [
      "Bolo Mania",
      "Bolomania"
    ],
    "Very Sugar": [
      "Very Sugar",
      "Verysugar"
    ],
    "Chocolatudos": [
      "Chocolatudos",
      "Chocolatudo",
      "Chocolatudos por Laís"
    ],
    "Casa dos Salgados Gourmet": [
      "Casa dos Salgados",
      "Casa dos Salgados Gourmet"
    ],
    "Jolie": [
      "Jolie",
      "Jolie Pâtisserie",
      "Jolie Café Pâtisserie",
      "Jolie Parissiere"
    ],
    "Parma Doces": [
      "Parma",
      "Parma Doces"
    ],
    "Delicato": [
      "Delicato",
      "Delicato Bolos"
    ],
    "Rollab": [
      "Rollab",
      "Rollab Confeitaria"
    ],
    "Paneer": [
      "Paneer",
      "Paneer Pâtisserie",
      "Paneer Patisserie"
    ]
  },
  "categoryAliases": {
    "Melhor Combo": [
      "Melhor Combo"
    ],
    "Melhor Doce": [
      "Melhor Doce"
    ],
    "Melhor Salgado": [
      "Melhor Salgado"
    ],
    "Melhor Bebida": [
      "Melhor Bebida"
    ],
    "Melhor Atendimento": [
      "Melhor Atendimento",
      "Atendimento"
    ],
    "Melhor Criatividade": [
      "Melhor Criatividade",
      "Criatividade"
    ],
    "Melhor Apresentação": [
      "Melhor Apresentação",
      "Apresentação"
    ],
    "Encantamento em Loja": [
      "Encantamento em Loja",
      "Encantamento de Loja",
      "Melhor Encantamento",
      "Melhor Envolvimento",
      "Envolvimento e Encantamento em Loja"
    ],
    "Melhor Sabor": [
      "Melhor Sabor"
    ],
    "Delivery": [
      "Melhor Delivery",
      "Melhor Takeaway/Delivery"
    ]
  }
}

export default SWEET_COFFEE_HISTORY
