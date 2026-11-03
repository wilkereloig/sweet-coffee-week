// GERADO por scripts/edicao/logos-desenhadas.py — não editar à mão. Sem dependências: a camada de
// dados (publico.js) importa daqui; componentes usam o reexport de src/data/imageLibrary.js.
const PASTA = '/images/marcas-edicoes/2026.2/logos-desenhadas'
export const LOGOS_DESENHADAS_EDICAO = [
  "adocee-doceria",
  "boldfood-confeitaria-inclusiva",
  "bolomania",
  "caffe-basilicos",
  "canutos",
  "carcara",
  "caroli-douces",
  "casa-1190-restaurante-e-coffee",
  "casa-alice-doceria",
  "cookitos",
  "delas-cafe-bistro",
  "delicato-bolos",
  "diva-do-cafe",
  "docinhos-da-lala",
  "jolie-cafe-patisserie",
  "just-food-e-coffee",
  "maison-julie-douceur",
  "mangai",
  "marianas-confeitaria",
  "marlon-vinicius-confeitaria-e-cafe",
  "mr-cupcake-confeitaria",
  "o-maestro-cafe",
  "padoca-do-bosque",
  "paneer-patisserie",
  "parma-doces",
  "sabor-de-pao",
  "sweet-duo-confeitaria",
  "vivianne-castro-doces",
  "wow-cookies"
]

/** Logo desenhada da casa (P&B + colorida, 480 px; pin do mapa: a colorida aparada, 96 px de altura), ou null. */
export function logoDesenhadaEdicao (slug) {
  if (!LOGOS_DESENHADAS_EDICAO.includes(slug)) return null
  return {
    pb: `${PASTA}/${slug}-pb.webp`, cor: `${PASTA}/${slug}-cor.webp`, largura: 480, altura: 480,
    pin: { src: `${PASTA}/${slug}-pin.webp` },
  }
}
