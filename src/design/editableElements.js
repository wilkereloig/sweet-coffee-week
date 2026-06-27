// Registro central dos elementos editáveis pelo Design Mode (MVP).
// IMPORTANTE: só elementos listados aqui podem ser ajustados pelo painel —
// não existe editor livre. Cada nó editável recebe data-editable-id={id} na página.
// Controles do MVP: X, Y, scale, rotate (apenas).

export const EDITABLE_ELEMENTS = [
  { id: 'home.hero.photo', page: 'home', label: 'Hero · Foto' },
  { id: 'home.hero.title', page: 'home', label: 'Hero · Título' },
  // Hero não tem bloco de CTA hoje → mapeado ao bloco de texto do hero.
  { id: 'home.hero.actions', page: 'home', label: 'Hero · Texto/CTA', note: 'mapeado ao bloco de texto do hero (sem CTA na página)' },
  { id: 'home.about.collage', page: 'home', label: 'O que é · Mídia' },
  { id: 'home.process.section', page: 'home', label: 'Como funciona · Seção' },
  { id: 'home.stats.section', page: 'home', label: 'Números · Seção' },
  { id: 'home.realizacao.section', page: 'home', label: 'Realização · Seção' },
]

export function elementsForPage(page) {
  return EDITABLE_ELEMENTS.filter((e) => e.page === page)
}

export function findElement(id) {
  return EDITABLE_ELEMENTS.find((e) => e.id === id) || null
}
