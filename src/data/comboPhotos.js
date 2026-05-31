const PHOTO_COUNTS = {
  'adocee-doceria': 10,
  bolomania: 11,
  'caffe-basilicos': 10,
  canutos: 16,
  'caroli-douces': 11,
  'casa-1190': 13,
  'delicato-bolos': 13,
  'douce-di-maria': 13,
  'jolie-cafe-patisserie': 12,
  'just-food-coffee': 10,
  mangai: 11,
  'mr-cupcake-confeitaria': 10,
  'o-maestro-cafe': 11,
  'padoca-do-bosque': 8,
  'paneer-patisserie': 13,
  'parma-doces': 12,
  'rollab-confeitaria': 14,
  'sweet-duo-confeitaria': 10,
  'wow-cookies': 13,
}

function buildPhotoSet(slug, count) {
  const base = `/images/combos/${slug}`
  const gallery = Array.from({ length: count }, (_, index) =>
    index === 0 ? `${base}/main.jpg` : `${base}/photo-${String(index + 1).padStart(2, '0')}.jpg`
  )

  return {
    mainImage: gallery[0],
    gallery,
  }
}

export const COMBO_PHOTOS = Object.fromEntries(
  Object.entries(PHOTO_COUNTS).map(([slug, count]) => [slug, buildPhotoSet(slug, count)])
)
