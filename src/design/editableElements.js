// Registro central dos elementos editáveis pelo Design Mode.
// IMPORTANTE: só elementos listados aqui podem ser ajustados pelo painel.
// `selector` = seletor CSS usado no "Copiar CSS" (deve casar com o nó real).
// `controls` = quais controles o painel mostra para este elemento.

export const EDITABLE_ELEMENTS = [
  {
    id: 'home.hero.photo',
    page: 'home',
    label: 'Hero · Foto',
    selector: '.hm .swc-hero__photo',
    controls: ['x', 'y', 'scale', 'rotate', 'z'],
  },
  {
    id: 'home.hero.title',
    page: 'home',
    label: 'Hero · Título',
    selector: '.hm .swc-hero__title',
    controls: ['x', 'y', 'scale', 'rotate'],
  },
  {
    id: 'home.about.collage',
    page: 'home',
    label: 'O que é · Mídia',
    selector: '.hm-about__media',
    controls: ['x', 'y', 'scale', 'rotate', 'width', 'z'],
  },
  {
    id: 'home.stats.section',
    page: 'home',
    label: 'Números · Seção',
    selector: '.hm .hm-numbers',
    controls: ['x', 'y'],
  },
  {
    id: 'home.steps.section',
    page: 'home',
    label: 'Como funciona · Seção',
    selector: '.hm .hm-steps-section',
    controls: ['x', 'y'],
  },
  {
    id: 'home.realizacao.section',
    page: 'home',
    label: 'Realização · Seção',
    selector: '.hm .hm-cta-section',
    controls: ['x', 'y'],
  },
]

export function elementsForPage(page) {
  return EDITABLE_ELEMENTS.filter((e) => e.page === page)
}

export function findElement(id) {
  return EDITABLE_ELEMENTS.find((e) => e.id === id) || null
}
