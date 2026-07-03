// Galerias de fotos da Home (institucional). Acervo: última edição dos combos.
// Derivado de PARTICIPANTS para garantir nomes/slugs corretos e referenciar
// apenas `main.jpg` (presente em toda pasta de combo) — sem caminho quebrado.
// Doc: src/design/SITE_DIRECTION.md (§ Fotos & galerias).
import { PARTICIPANTS } from './participants'

const ALT_FALLBACK = 'Combo participante do Sweet & Coffee Week'

const comboMain = (p) => ({
  src: `/images/combos/${p.slug}/main.jpg`,
  alt: `Combo da ${p.name} no Sweet & Coffee Week`,
  participant: p.name,
  type: 'combo',
})

const bySlug = (slug) => {
  const p = PARTICIPANTS.find((x) => x.slug === slug)
  return p ? comboMain(p) : null
}

// Acervo completo de combos (1 foto por participante) — base das galerias.
export const comboGalleryImages = PARTICIPANTS.map(comboMain)

// HERO — abre com a foto-assinatura (prioridade) e gira por combos fortes.
export const heroGalleryImages = [
  {
    src: '/images/hero-festival.jpg',
    alt: 'Sobremesa autoral do Sweet & Coffee Week',
    type: 'detalhe',
  },
  'douce-di-maria',
  'caffe-basilicos',
  'caroli-douces',
  'delicato-bolos',
  'jolie-cafe-patisserie',
  'bolomania',
]
  .map((it) => (typeof it === 'string' ? bySlug(it) : it))
  .filter(Boolean)

// "O QUE É" — subconjunto equilibrado (variedade de marcas), não o acervo todo.
export const aboutGalleryImages = [
  'douce-di-maria',
  'delicato-bolos',
  'caffe-basilicos',
  'caroli-douces',
  'adocee-doceria',
  'jolie-cafe-patisserie',
  'canutos',
  'bolomania',
]
  .map(bySlug)
  .filter(Boolean)

export { ALT_FALLBACK }
