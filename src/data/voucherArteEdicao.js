// GERADO por _bastidores/arte_voucher_virtual.py (pasta da edição 2026.2, 07_VOUCHERS/04_CARTAO_SICREDI) — não editar à mão.
// Sem dependências. Arte do voucher virtual = a do cartão impresso: a frente de cada casa (com o nome) e o verso da cor dela,
// sem QR e sem código (a página desenha os dois por cima, em SVG, na escala do cartão em milímetros).
const PASTA = '/images/marcas-edicoes/2026.2/voucher'

/** Cor do cartão de cada casa que tem voucher (a mesma do impresso). */
export const COR_DO_VOUCHER = {
  "adocee-doceria": "amarelo",
  "boldfood-confeitaria-inclusiva": "turquesa",
  "bolomania": "roxo",
  "caffe-basilicos": "amarelo",
  "canutos": "turquesa",
  "carcara": "roxo",
  "caroli-douces": "amarelo",
  "casa-1190-restaurante-e-coffee": "turquesa",
  "casa-alice-doceria": "roxo",
  "cookitos": "amarelo",
  "delicato-bolos": "turquesa",
  "diva-do-cafe": "roxo",
  "jolie-cafe-patisserie": "amarelo",
  "just-food-e-coffee": "turquesa",
  "maison-julie-douceur": "roxo",
  "mangai": "amarelo",
  "marianas-confeitaria": "turquesa",
  "marlon-vinicius-confeitaria-e-cafe": "roxo",
  "mr-cupcake-confeitaria": "amarelo",
  "o-maestro-cafe": "turquesa",
  "padoca-do-bosque": "roxo",
  "paneer-patisserie": "amarelo",
  "parma-doces": "turquesa",
  "sabor-de-pao": "roxo",
  "sweet-duo-confeitaria": "amarelo",
  "vivianne-castro-doces": "turquesa",
  "wow-cookies": "roxo"
}

/** Cartão 84 x 54 mm, canto de 3,15 mm; o QR (só os módulos, 33 x 16,42 mm) e o código ficam onde estão no impresso. */
export const CARTAO = { largura: 84, altura: 54, raio: 3.15, pxPorMm: 12 }
export const VERSO_QR = { x: 58.63, y: 6.9, lado: 16.42 }
export const VERSO_CODIGO = { x: 66.835, y: 27.43, corpo: 1.69 }

/** Arte do voucher da casa — `{ cor, frente, verso, largura, altura }` — ou null se a casa não tem cartão impresso. */
export function arteDoVoucher (slug) {
  const cor = COR_DO_VOUCHER[slug]
  if (!cor) return null
  return { cor, frente: `${PASTA}/frente-${slug}.webp`, verso: `${PASTA}/verso-${cor}.webp`, largura: CARTAO.largura * CARTAO.pxPorMm, altura: CARTAO.altura * CARTAO.pxPorMm }
}
