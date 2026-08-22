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
        "Bocaditos",
        "Liliane Moura Confiserie",
        "Jolie Café Pâtisserie",
        "Margarita Café & Ateliê de Doces",
        "Realize Gourmet",
        "Rafaela Fontes Chocolateria",
        "Chapelatto Coffee Shop",
        "Jana's Cakes",
        "Cecília Mindêlo",
        "Boca D'Água",
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
        "Jana's Cakes",
        "Doce Arthe Confeitaria",
        "Barões do Café",
        "Boca D'Água",
        "Casa de Taipa Tapiocaria",
        "TuttiMac",
        "Berlin Cafeteria",
        "FitNeza Coffee",
        "Chocolateria Sandra Maia",
        "Bocaditos",
        "Very Sugar",
        "Jolie Café Pâtisserie",
        "Cecília Mindêlo",
        "Chapelatto Coffee Shop",
        "Rafaela Fontes Chocolateria"
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
        "Caroli Douces",
        "Croasonho",
        "Daguia Tortas Finas",
        "Suisse Brownie",
        "Berlin Cafeteria",
        "Bocaditos",
        "Bolo da Vovó",
        "Cecília Mindêlo",
        "Crooks Cookies",
        "Engenho Doce",
        "Fritz",
        "Jana's Cakes",
        "Jolie Café Pâtisserie",
        "LaSweets por Larissa Pio",
        "Pinga Fogo Doceria",
        "Rafaela Fontes Chocolateria",
        "Realize Gourmet",
        "Chocolateria Sandra Maia",
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
      "participantesCount": 19,
      "participantes": [
        "A Doceria",
        "Barões do Café",
        "Berlin Cafeteria",
        "Bolo da Vovó",
        "Caroli Douces",
        "Cecília Mindêlo",
        "Chapelatto Coffee Shop",
        "Crooks Cookies",
        "Daguia Tortas Finas",
        "FitNeza Coffee",
        "Jana's Cakes",
        "LaSweets por Larissa Pio",
        "Mr. Cupcake Confeitaria",
        "Parma Doces",
        "Rafaela Fontes Chocolateria",
        "Realize Gourmet",
        "Chocolateria Sandra Maia",
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
        "Cecília Mindêlo",
        "Chapelatto Coffee Shop",
        "Chocolateria Sandra Maia",
        "Crooks Cookies",
        "Daguia Tortas Finas",
        "Das Melo",
        "Edileuza Doces Finos",
        "FitNeza Coffee",
        "Jana's Cakes",
        "Jolie Café Pâtisserie",
        "LaSweets por Larissa Pio",
        "Mr. Cupcake Confeitaria",
        "Parma Doces",
        "Rafaela Fontes Chocolateria",
        "Realize Gourmet",
        "Sodiê Doces",
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
        "Balzac Café",
        "Boca D'Água",
        "Bocaditos",
        "Bolo da Vovó",
        "Cacau Show",
        "Caffeina",
        "Café Brigadeiro",
        "Caroli Douces",
        "Casa Nacre",
        "Cecília Mindêlo",
        "Chapelatto Coffee Shop",
        "Crooks Cookies",
        "Cuore di Panna",
        "Das Melo",
        "FitNeza Coffee",
        "Flor e Flor",
        "Flora Cafeteria",
        "Frans Café",
        "Jolie Café Pâtisserie",
        "LaSweets por Larissa Pio",
        "Mr. Cupcake Confeitaria",
        "Parma Doces",
        "Rafaela Fontes Chocolateria",
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
                  "Jolie Café Pâtisserie"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr. Cupcake Confeitaria"
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
      "participantesCount": 37,
      "participantes": [
        "LaSweets por Larissa Pio",
        "Atelier Mine Confeitaria",
        "Balzac Café",
        "Boca D'Água",
        "Bocaditos",
        "Bolo da Vovó",
        "Cacau Show",
        "Café Brigadeiro",
        "Caffeina",
        "Camila Melo",
        "Caroli Douces",
        "Casa Nacre",
        "Casa de Taipa Tapiocaria",
        "Cecília Mindêlo",
        "Chapelatto Coffee Shop",
        "Chef Fits",
        "Cookorote",
        "Crooks Cookies",
        "Cuore di Panna",
        "Das Melo",
        "Edileuza Doces Finos",
        "Flor e Flor",
        "Flora Cafeteria",
        "Frans Café",
        "Jana's Cakes",
        "Jolie Café Pâtisserie",
        "Mr. Cupcake Confeitaria",
        "Nick Buffet",
        "Paneer Pâtisserie",
        "Parma Doces",
        "Pinga Fogo Doceria",
        "Rafaela Fontes Chocolateria",
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
                  "Mr. Cupcake Confeitaria"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Chapelatto Coffee Shop"
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
      "periodo": "09 a 19 de julho de 2020", // acervo oficial (ACERVO-OFICIAL.md §4, 8ª edição)
      "participantesCount": 20,
      "participantes": [
        "Petra Holanda",
        "Café Brigadeiro",
        "Papo de Anjo",
        "Atelier Mine Confeitaria",
        "Bella Petit",
        "Bocaditos",
        "Cecília Mindêlo",
        "Momento Gourmet",
        "Caroli Douces",
        "Casa Nacre",
        "Casa dos Salgados Gourmet",
        "Cuore di Panna",
        "Das Melo",
        "Kopenhagen",
        "Stephany Santos",
        "Cookorote",
        "Rafaela Fontes Chocolateria",
        "Very Sugar",
        "Crooks Cookie Shop",
        "Realize Gourmet"
      ],
      "premiacao": {
        "status": "completa",
        "observacao": "Votação do público (Sweet Awards) em 7 categorias.",
        "categorias": [
          {
            "categoria": "Melhor Combo",
            "trilha": "sweet_lovers",
            "colocacoes": [
              { "pos": 1, "nomes": ["Bocaditos"] },
              { "pos": 2, "nomes": ["Rafaela Fontes Chocolateria"] },
              { "pos": 3, "nomes": ["Momento Gourmet"] }
            ]
          },
          {
            "categoria": "Melhor Atendimento",
            "trilha": "sweet_lovers",
            "colocacoes": [
              { "pos": 1, "nomes": ["Casa dos Salgados Gourmet"] },
              { "pos": 2, "nomes": ["Momento Gourmet"] },
              { "pos": 3, "nomes": ["Bocaditos"] }
            ]
          },
          {
            "categoria": "Melhor Criatividade",
            "trilha": "sweet_lovers",
            "colocacoes": [
              { "pos": 1, "nomes": ["Cookorote"] },
              { "pos": 2, "nomes": ["Bocaditos"] },
              { "pos": 3, "nomes": ["Caroli Douces"] }
            ]
          },
          {
            "categoria": "Melhor Sabor",
            "trilha": "sweet_lovers",
            "colocacoes": [
              { "pos": 1, "nomes": ["Bocaditos"] },
              { "pos": 2, "nomes": ["Atelier Mine Confeitaria", "Rafaela Fontes Chocolateria"] },
              { "pos": 3, "nomes": ["Momento Gourmet"] }
            ]
          },
          {
            "categoria": "Melhor Apresentação",
            "trilha": "sweet_lovers",
            "colocacoes": [
              { "pos": 1, "nomes": ["Rafaela Fontes Chocolateria"] },
              { "pos": 2, "nomes": ["Bocaditos"] },
              { "pos": 3, "nomes": ["Momento Gourmet"] }
            ]
          },
          {
            "categoria": "Melhor Take Away",
            "trilha": "sweet_lovers",
            "colocacoes": [
              { "pos": 1, "nomes": ["Cuore di Panna"] },
              { "pos": 2, "nomes": ["Rafaela Fontes Chocolateria"] },
              { "pos": 3, "nomes": ["Atelier Mine Confeitaria"] }
            ]
          },
          {
            "categoria": "Melhor Delivery",
            "trilha": "sweet_lovers",
            "colocacoes": [
              { "pos": 1, "nomes": ["Café Brigadeiro"] },
              { "pos": 2, "nomes": ["Casa dos Salgados Gourmet"] },
              { "pos": 3, "nomes": ["Bocaditos"] }
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
        "Bell's Café",
        "Bocaditos",
        "Café Brigadeiro",
        "Café com Bike",
        "Caroli Douces",
        "Casa de Taipa Tapiocaria",
        "Casa dos Salgados Gourmet",
        "Casa Nacre",
        "Cecília Mindêlo",
        "Chocolatudos",
        "Cookorote",
        "Das Melo",
        "Delizeu",
        "Dolce Gelato",
        "Edileuza Doces Finos",
        "Frans Café",
        "Jolie Café Pâtisserie",
        "Mangai",
        "Atelier Mine Confeitaria",
        "Momento Gourmet",
        "Mr. Cupcake Confeitaria",
        "Paneer Pâtisserie",
        "Rafaela Fontes Chocolateria",
        "Realize Gourmet",
        "Suisse Brownie",
        "Very Sugar"
      ],
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
                  "Mr. Cupcake Confeitaria"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Cookorote",
                  "Paneer Pâtisserie"
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
                  "Mr. Cupcake Confeitaria"
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
            "trilha": "sweet_lovers",
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
            "trilha": "sweet_lovers",
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
                  "Jolie Café Pâtisserie"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Mr. Cupcake Confeitaria"
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
                  "Mr. Cupcake Confeitaria"
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
                  "Mr. Cupcake Confeitaria"
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
                  "Jolie Café Pâtisserie"
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
                  "Mr. Cupcake Confeitaria"
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
                  "Jolie Café Pâtisserie"
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
        "Aumer Restaurante",
        "Bell's Café",
        "Café Leviz",
        "Casa dos Salgados Gourmet",
        "Bendita Confeitaria",
        "Chocolatudos",
        "Cacau Show",
        "Marlon Vinicius",
        "Bella Petit",
        "Cássia Ribeiro",
        "Paneer Pâtisserie",
        "Casa Nacre",
        "Royal Trudel",
        "Frans Café",
        "Very Sugar",
        "Cecília Mindêlo",
        "Bocaditos",
        "Rafaela Fontes Chocolateria",
        "Caroli Douces",
        "Atelier Mine Confeitaria",
        "Das Melo",
        "Mangai",
        "Suisse Brownie",
        "Mr. Cupcake Confeitaria",
        "Momento Gourmet",
        "Rádio Café",
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
                  "Marlon Vinicius"
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
                  "Mr. Cupcake Confeitaria"
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
                  "Bell's Café"
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
                  "Mr. Cupcake Confeitaria"
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
                  "Bell's Café"
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
                  "Mr. Cupcake Confeitaria"
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
                  "Bell's Café"
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
                  "Mr. Cupcake Confeitaria"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Bell's Café"
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
                  "Mr. Cupcake Confeitaria"
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
                  "Mr. Cupcake Confeitaria"
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
                  "Bell's Café"
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
          }
        ],
        "mencaoHonrosa": {
          "categoria": "Envolvimento e Encantamento em Loja",
          "nomes": [
            "Mr. Cupcake Confeitaria",
            "Rafaela Fontes Chocolateria",
            "Chocolatudos",
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
      "participantesCount": 29,
      "participantes": [
        "Atelier Mine Confeitaria",
        "Aumer Restaurante",
        "Bell's Café",
        "Bem Eu Confeitaria",
        "Bendita Confeitaria",
        "Bocaditos",
        "Café Brigadeiro",
        "Carol Dantas",
        "Caroli Douces",
        "Cássia Ribeiro",
        "Cecília Mindêlo",
        "Chefit",
        "Chocolatudos",
        "Da Terra",
        "Delizeu",
        "Doce Lelê",
        "Douce Bien",
        "Duart's Confeitaria",
        "Frans Cidade Jardim",
        "Frans Cidade Verde",
        "Le Paradis",
        "Lulu Café",
        "Marlon Vinicius",
        "Mr. Cupcake Confeitaria",
        "Paneer Pâtisserie",
        "Parma Doces",
        "Recanto da Prosa",
        "Chocolateria Sandra Maia",
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
                  "Mr. Cupcake Confeitaria"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Caroli Douces"
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
                  "Caroli Douces"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr. Cupcake Confeitaria"
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
                  "Chocolateria Sandra Maia"
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
                  "Marlon Vinicius"
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
                  "Marlon Vinicius"
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
            "trilha": "juri_tecnico",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Bem Eu Confeitaria"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Duart's Confeitaria"
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
                  "Marlon Vinicius"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr. Cupcake Confeitaria"
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
                  "Marlon Vinicius"
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
                  "Marlon Vinicius"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr. Cupcake Confeitaria"
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
                  "Marlon Vinicius"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr. Cupcake Confeitaria"
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
                  "Marlon Vinicius"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr. Cupcake Confeitaria"
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
                  "Mr. Cupcake Confeitaria"
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
                  "Delizeu"
                ]
              }
            ]
          },
          {
            "categoria": "Melhor Envolvimento/Encantamento em Loja",
            "trilha": "juri_tecnico",
            "colocacoes": [
              { "pos": 1, "nomes": ["Bocaditos"] },
              { "pos": 2, "nomes": ["Atelier Mine Confeitaria"] },
              { "pos": 3, "nomes": ["Mr. Cupcake Confeitaria"] }
            ]
          },
          {
            "categoria": "Melhor Delivery/Takeaway",
            "trilha": "sweet_lovers",
            "colocacoes": [
              { "pos": 1, "nomes": ["Bell's Café"] },
              { "pos": 2, "nomes": ["Delizeu"] },
              { "pos": 3, "nomes": ["Marlon Vinicius"] }
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
      "participantesCount": 34,
      "participantes": [
        "Adocee Doceria",
        "Aroma Café",
        "Aumer Restaurante",
        "KNVE Casa Café",
        "Supermercado Nordestão",
        "Bell's Café",
        "Bem Eu Confeitaria",
        "Bistrô NL",
        "Bocaditos",
        "Café Leviz",
        "Canuto's",
        "Caramel Healthy Food",
        "Caroli Douces",
        "Cecília Mindêlo",
        "Chocolateria Sandra Maia",
        "Cássia Ribeiro",
        "Daniel Bezerra",
        "Dedo de Moça",
        "Delicato",
        "Doce Lelê",
        "Doce Suspiro",
        "Douce di Maria",
        "Duart's Confeitaria",
        "Kfé da Vila",
        "Mangai",
        "Marlon Vinicius",
        "Petit Poti",
        "Petra Holanda",
        "Recanto da Prosa",
        "Rádio Café",
        "Suisse Brownie",
        "Sweet Duo Confeitaria",
        "Very Sugar",
        "Wanessa Cakes",
        "Wolya Pedrosa"
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
                  "Duart's Confeitaria"
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
                  "Marlon Vinicius"
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
                  "Duart's Confeitaria"
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
                  "Duart's Confeitaria"
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
                  "Marlon Vinicius"
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
                  "Adocee Doceria"
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
            "categoria": "Melhor Criatividade",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Duart's Confeitaria"
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
                  "Marlon Vinicius"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Canuto's",
                  "Daniel Bezerra"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Duart's Confeitaria"
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
            "nome": "Supermercado Nordestão",
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
      "participantesCount": 33,
      "participantes": [
        "Adocee Doceria",
        "Aroma Café",
        "Bocaditos",
        "Canuto's",
        "Caracol",
        "Carcará",
        "Doce Lelê",
        "Caroli Douces",
        "Chocolateria Sandra Maia",
        "Daniel Bezerra",
        "Dedo de Moça",
        "Dekacau",
        "Delicato",
        "Douce di Maria",
        "Duart's Confeitaria",
        "Fabiana Melo",
        "Jefferson Albano",
        "Just Food&Coffee",
        "Kale do Bem",
        "Lu Doces",
        "Mangai",
        "Marlon Vinicius",
        "Mint Coffee",
        "O Maestro Café",
        "Parma Doces",
        "Petit Poti",
        "Pudinharia",
        "Rádio Café",
        "Suisse Brownie",
        "Sweet Duo Confeitaria",
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
                  "O Maestro Café"
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
                  "Marlon Vinicius"
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
                  "Canuto's"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Adocee Doceria"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Marlon Vinicius",
                  "Suisse Brownie"
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
                  "Sweet Duo Confeitaria"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Douce di Maria",
                  "Dedo de Moça"
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
            "categoria": "Melhor Bebida",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Canuto's"
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
                  "Adocee Doceria",
                  "Marlon Vinicius"
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
                  "O Maestro Café"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Adocee Doceria"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Suisse Brownie",
                  "Duart's Confeitaria"
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
                  "O Maestro Café"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Sweet Duo Confeitaria",
                  "Duart's Confeitaria"
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
                  "Canuto's"
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
                  "Duart's Confeitaria",
                  "Marlon Vinicius"
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
                  "Canuto's"
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
                  "Douce di Maria",
                  "Marlon Vinicius"
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
        "Adocee Doceria",
        "Bella Douces",
        "Bell's Café",
        "Bocaditos",
        "Bolomania",
        "Canuto's",
        "Caramel Healthy Food",
        "Carcará",
        "Caroli Douces",
        "Casa Bauducco",
        "Casa Moscou",
        "Dedo de Moça",
        "Delicato",
        "Diva Café",
        "Duart's Confeitaria",
        "Fabiana Melo",
        "Jefferson Albano",
        "Just Food&Coffee",
        "Lu Doces",
        "Mangai",
        "Marlon Vinicius",
        "O Maestro Café",
        "Parma Doces",
        "Puro Café",
        "Sol e Café",
        "Suisse Brownie",
        "Sweet Duo Confeitaria",
        "Wanessa Cakes",
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
                  "Bocaditos",
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
                  "Sweet Duo Confeitaria"
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
                  "Duart's Confeitaria"
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
                  "Bolomania"
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
                  "Delicato",
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
                  "O Maestro Café"
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
                  "O Maestro Café"
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
          },
          {
            "categoria": "Melhor Encantamento em Loja",
            "trilha": "sweet_lovers",
            "colocacoes": [
              { "pos": 1, "nomes": ["O Maestro Café"] },
              { "pos": 2, "nomes": ["Delicato"] },
              { "pos": 3, "nomes": ["Marlon Vinicius"] }
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
        "Adocee Doceria",
        "Aroma Café",
        "Bella Douces",
        "Bolomania",
        "Canuto's",
        "Caramel Healthy Food",
        "Caroli Douces",
        "Casa Bauducco",
        "Delicato",
        "Duart's Confeitaria",
        "Estação Açaí",
        "Fabiana Melo",
        "Jolie Café Pâtisserie",
        "Just Food&Coffee",
        "Mangai",
        "Marlon Vinicius",
        "Mr. Cupcake Confeitaria",
        "O Maestro Café",
        "Padoca do Bosque",
        "Paneer Pâtisserie",
        "Parma Doces",
        "Rollab Confeitaria",
        "Suisse Brownie",
        "Sweet Duo Confeitaria",
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
                  "Marlon Vinicius"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "O Maestro Café",
                  "Bolomania"
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
                  "Jolie Café Pâtisserie"
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
                  "Mr. Cupcake Confeitaria"
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
                  "Rollab Confeitaria"
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
                  "Duart's Confeitaria"
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
                  "Rollab Confeitaria"
                ]
              }
            ]
          },
          {
            "categoria": "Encantamento em Loja",
            "trilha": "sweet_lovers",
            "colocacoes": [
              {
                "pos": 1,
                "nomes": [
                  "Just Food&Coffee",
                  "O Maestro Café"
                ]
              },
              {
                "pos": 2,
                "nomes": [
                  "Mr. Cupcake Confeitaria",
                  "Adocee"
                ]
              },
              {
                "pos": 3,
                "nomes": [
                  "Marlon Vinicius",
                  "Bolomania"
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
        "Caffè Basilico's",
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
    "Mr. Cupcake Confeitaria": [
      "Mr Cupcake",
      "Mr. Cupcake",
      "Mr. Cupcake Confeitaria"
    ],
    "Canuto's": [
      "Canutos",
      "Canuto's",
      "Canuto’s"
    ],
    "Duart's Confeitaria": [
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
      "Cecilia Mindêlo Brownies",
      "Cecilia Mindêlo"
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
    "Atelier Mine Confeitaria": [
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
    "Chocolatudos por Laís": [
      "Chocolatudos",
      "Chocolatudo",
      "Chocolatudos por Laís"
    ],
    "Casa dos Salgados Gourmet": [
      "Casa dos Salgados",
      "Casa dos Salgados Gourmet"
    ],
    "Jolie Café Pâtisserie": [
      "Jolie",
      "Jolie Pâtisserie",
      "Jolie Café Pâtisserie",
      "Jolie Parissiere"
    ],
    "Parma Doces": [
      "Parma",
      "Parma Doces"
    ],
    "Delicato Bolos": [
      "Delicato",
      "Delicato Bolos"
    ],
    "Rollab Confeitaria": [
      "Rollab",
      "Rollab Confeitaria"
    ],
    "Paneer Pâtisserie": [
      "Paneer",
      "Paneer Pâtisserie",
      "Paneer Patisserie"
    ],
    "Bell's Café": [
      "Bell's",
      "Bell's Café",
      "Bell's Cafeteria"
    ],
    "LaSweets por Larissa Pio": [
      "La Sweets",
      "LaSweets",
      "LaSweets por Larissa Pio"
    ],
    "Jana's Cakes": [
      "Jana's Cakes",
      "Jana's Cake",
      "Jona's Cakes"
    ],
    "Boca D'Água": [
      "Boca D'Água",
      "Boca D'Água Delicatessen"
    ],
    "Rafaela Fontes Chocolateria": [
      "Rafaela Fontes",
      "Rafaela Fontes Chocolateria",
      "Chocolateria Rafaela Fontes"
    ],
    "Chocolateria Sandra Maia": [
      "Sandra Maia",
      "Chocolateria Sandra Maia"
    ],
    "Berlin Cafeteria": [
      "Berlin",
      "Berlim",
      "Berlin Cafeteria"
    ],
    "FitNeza Coffee": [
      "Fitneza",
      "FitNeza Coffee"
    ],
    "Realize Gourmet": [
      "Realize",
      "Realize Gourmet"
    ],
    "Daguia Tortas Finas": [
      "Daguia",
      "Daguia Tortas Finas"
    ],
    "Crooks Cookie Shop": [
      "Crooks",
      "Crooks Cookies"
    ],
    "Fran's Café": [
      "Frans Café",
      "Franz Café",
      "Frans Cidade Jardim",
      "Frans Cidade Verde"
    ],
    "Balzac Café": [
      "Balzac Café",
      "Siga Balzac",
      "Siga Balzac Café"
    ],
    "Flora Cafeteria": [
      "Flora Cafeteria",
      "Flora Café"
    ],
    "Casa de Taipa Tapiocaria": [
      "Casa de Taipa",
      "Casa de Taipa Tapiocaria"
    ],
    "Lulu Café": [
      "Lulu Café",
      "Lulu Cake"
    ],
    "Caramel Healthy Food": [
      "Caramel",
      "Caramel Healthy Food",
      "Café Casa Verde by Caramel",
      "KNVE Casa Café"
    ],
    "Casa Bauducco": [
      "Casa Bauduco",
      "Casa Baudocco",
      "Casa Bauducco"
    ],
    "Adocee Doceria": [
      "Adocee",
      "Adocee Doceria"
    ],
    "Sweet Duo Confeitaria": [
      "Sweet Duo",
      "Sweet Duo Confeitaria"
    ],
    "Wanessa Cakes": [
      "Wanessa Cake",
      "Wanessa Cakes"
    ],
    "Chefit": [
      "Chefit",
      "Chef Fits"
    ],
    "Bem Eu Confeitaria": [
      "Bem Eu",
      "Bem Eu Confeitaria"
    ],
    "Sodiê Doces": [
      "Sodiê",
      "Sodiê Doces"
    ],
    "Edileuza Doces Finos": [
      "Edileuza Doces",
      "Edileuza Doces Finos"
    ],
    "Pinga Fogo Doceria": [
      "Pinga Fogo",
      "Pinga Fogo Doceria"
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
      "Melhor Encantamento em Loja",
      "Melhor Envolvimento",
      "Melhor Envolvimento/Encantamento em Loja",
      "Envolvimento e Encantamento em Loja"
    ],
    "Melhor Sabor": [
      "Melhor Sabor"
    ],
    "Delivery/Takeaway": [
      "Delivery/Takeaway",
      "Melhor Delivery",
      "Melhor Delivery/Takeaway",
      "Melhor Takeaway/Delivery",
      "Melhor Take Away"
    ]
  }
}

export default SWEET_COFFEE_HISTORY
