// AUTO-GERADO a partir de public/images/fotos-combos-site/ — não editar à mão.
// Regra de nomeação: por loja, menor número = foto do combo; depois doce,
// salgado, bebida. Exceções com 2 opções: Caroli e Paneer (2 bebidas),
// Jolie (2 salgados) — o card que tiver 2 fotos alterna em loop.
const BASE = '/images/fotos-combos-site'
// encodeURI (não encodeURIComponent): encoda espaço (%20) e acentos, mas mantém
// "&" cru no path — Vite serve estático com "&", mas trata "%26" como rota inexistente.
const url = (f) => `${BASE}/${encodeURI(f)}`

const RAW = {
    "adocee-doceria":  {
                           "combo":  "site-Adocee Doceria  1.png",
                           "doce":  "site-Adocee Doceria  2.png",
                           "salgado":  [
                                           "site-Adocee Doceria  3.png"
                                       ],
                           "bebida":  [
                                          "site-Adocee Doceria  4.png"
                                      ]
                       },
    "bolomania":  {
                      "combo":  "site-Bolomania 5.png",
                      "doce":  "site-Bolomania 6.png",
                      "salgado":  [
                                      "site-Bolomania 7.png"
                                  ],
                      "bebida":  [
                                     "site-Bolomania 8.png"
                                 ]
                  },
    "caffe-basilicos":  {
                            "combo":  "site-Caffè Basilico’s  9.png",
                            "doce":  "site-Caffè Basilico’s  10.png",
                            "salgado":  [
                                            "site-Caffè Basilico’s  11.png"
                                        ],
                            "bebida":  [
                                           "site-Caffè Basilico’s  12.png"
                                       ]
                        },
    "canutos":  {
                    "combo":  "site-Canuto’s 13.png",
                    "doce":  "site-Canuto’s 14.png",
                    "salgado":  [
                                    "site-Canuto’s 15.png"
                                ],
                    "bebida":  [
                                   "site-Canuto’s 16.png"
                               ]
                },
    "caroli-douces":  {
                          "combo":  "site-Caroli Douces 17.png",
                          "doce":  "site-Caroli Douces 18.png",
                          "salgado":  [
                                          "site-Caroli Douces 19.png"
                                      ],
                          "bebida":  [
                                         "site-Caroli Douces 20.png",
                                         "site-Caroli Douces 37.png"
                                     ]
                      },
    "casa-1190":  {
                      "combo":  "site-Casa 1190 Restaurant e Coffee 21.png",
                      "doce":  "site-Casa 1190 Restaurant e Coffee 22.png",
                      "salgado":  [
                                      "site-Casa 1190 Restaurant e Coffee 23.png"
                                  ],
                      "bebida":  [
                                     "site-Casa 1190 Restaurant e Coffee 24.png"
                                 ]
                  },
    "casa-de-taipa-tapiocaria":  {
                                     "combo":  "site-Casa de Taipa Tapiocaria 25.png",
                                     "doce":  "site-Casa de Taipa Tapiocaria 26.png",
                                     "salgado":  [
                                                     "site-Casa de Taipa Tapiocaria 27.png"
                                                 ],
                                     "bebida":  [
                                                    "site-Casa de Taipa Tapiocaria 28.png"
                                                ]
                                 },
    "delicato-bolos":  {
                           "combo":  "site-Delicato Bolos 29.png",
                           "doce":  "site-Delicato Bolos 30.png",
                           "salgado":  [
                                           "site-Delicato Bolos 31.png"
                                       ],
                           "bebida":  [
                                          "site-Delicato Bolos 32.png"
                                      ]
                       },
    "douce-di-maria":  {
                           "combo":  "site-Douce di Maria 33.png",
                           "doce":  "site-Douce di Maria 34.png",
                           "salgado":  [
                                           "site-Douce di Maria 35.png"
                                       ],
                           "bebida":  [
                                          "site-Douce di Maria 36.png"
                                      ]
                       },
    "jolie-cafe-patisserie":  {
                                  "combo":  "site-Jolie Café Pâtisserie 38.png",
                                  "doce":  "site-Jolie Café Pâtisserie 39.png",
                                  "salgado":  [
                                                  "site-Jolie Café Pâtisserie 40.png",
                                                  "site-Jolie Café Pâtisserie 41.png"
                                              ],
                                  "bebida":  [
                                                 "site-Jolie Café Pâtisserie 50.png"
                                             ]
                              },
    "just-food-coffee":  {
                             "combo":  "site-Just Food\u0026Coffee 42.png",
                             "doce":  "site-Just Food\u0026Coffee 43.png",
                             "salgado":  [
                                             "site-Just Food\u0026Coffee 44.png"
                                         ],
                             "bebida":  [
                                            "site-Just Food\u0026Coffee 45.png"
                                        ]
                         },
    "mangai":  {
                   "combo":  "site-Mangai 46.png",
                   "doce":  "site-Mangai 47.png",
                   "salgado":  [
                                   "site-Mangai 48.png"
                               ],
                   "bebida":  [
                                  "site-Mangai 49.png"
                              ]
               },
    "mr-cupcake-confeitaria":  {
                                   "combo":  "site-Mr. Cupcake Confeitaria 1.png",
                                   "doce":  "site-Mr. Cupcake Confeitaria 2.png",
                                   "salgado":  [
                                                   "site-Mr. Cupcake Confeitaria 3.png"
                                               ],
                                   "bebida":  [
                                                  "site-Mr. Cupcake Confeitaria 4.png"
                                              ]
                               },
    "oli-gastro":  {
                       "combo":  "site-Olí Gastrô 9.png",
                       "doce":  "site-Olí Gastrô 10.png",
                       "salgado":  [
                                       "site-Olí Gastrô 11.png"
                                   ],
                       "bebida":  [
                                      "site-Olí Gastrô 12.png"
                                  ]
                   },
    "o-maestro-cafe":  {
                           "combo":  "site-O Maestro Café 5.png",
                           "doce":  "site-O Maestro Café 6.png",
                           "salgado":  [
                                           "site-O Maestro Café 7.png"
                                       ],
                           "bebida":  [
                                          "site-O Maestro Café 8.png"
                                      ]
                       },
    "padoca-do-bosque":  {
                             "combo":  "site-Padoca do Bosque 13.png",
                             "doce":  "site-Padoca do Bosque 14.png",
                             "salgado":  [
                                             "site-Padoca do Bosque 15.png"
                                         ],
                             "bebida":  [
                                            "site-Padoca do Bosque 16.png"
                                        ]
                         },
    "paneer-patisserie":  {
                              "combo":  "site-Paneer Pâtisserie 17.png",
                              "doce":  "site-Paneer Pâtisserie 18.png",
                              "salgado":  [
                                              "site-Paneer Pâtisserie 19.png"
                                          ],
                              "bebida":  [
                                             "site-Paneer Pâtisserie 20.png",
                                             "site-Paneer Pâtisserie 37.png"
                                         ]
                          },
    "parma-doces":  {
                        "combo":  "site-Parma Doces 21.png",
                        "doce":  "site-Parma Doces 22.png",
                        "salgado":  [
                                        "site-Parma Doces 23.png"
                                    ],
                        "bebida":  [
                                       "site-Parma Doces 24.png"
                                   ]
                    },
    "rollab-confeitaria":  {
                               "combo":  "site-Rollab Confeitaria 25.png",
                               "doce":  "site-Rollab Confeitaria 26.png",
                               "salgado":  [
                                               "site-Rollab Confeitaria 27.png"
                                           ],
                               "bebida":  [
                                              "site-Rollab Confeitaria 28.png"
                                          ]
                           },
    "sweet-duo-confeitaria":  {
                                  "combo":  "site-Sweet Duo Confeitaria 29.png",
                                  "doce":  "site-Sweet Duo Confeitaria 30.png",
                                  "salgado":  [
                                                  "site-Sweet Duo Confeitaria 31.png"
                                              ],
                                  "bebida":  [
                                                 "site-Sweet Duo Confeitaria 32.png"
                                             ]
                              },
    "wow-cookies":  {
                        "combo":  "site-WOW Cookies 33.png",
                        "doce":  "site-WOW Cookies 34.png",
                        "salgado":  [
                                        "site-WOW Cookies 35.png"
                                    ],
                        "bebida":  [
                                       "site-WOW Cookies 36.png"
                                   ]
                    }
}

export const COMBO_PHOTOS = Object.fromEntries(
  Object.entries(RAW).map(([slug, p]) => {
    const main = url(p.combo)
    const doce = url(p.doce)
    const savoryImages = (p.salgado || []).map(url)
    const drinkImages = (p.bebida || []).map(url)
    const gallery = [main, doce, ...savoryImages, ...drinkImages]
    return [slug, {
      mainImage: main,
      gallery,
      sweetImage: doce,
      sweetImages: [doce],
      savoryImage: savoryImages[0] || null,
      savoryImages,
      drinkImage: drinkImages[0] || null,
      drinkImages,
    }]
  })
)
