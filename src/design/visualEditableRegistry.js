// Registro central do Visual Refinement Mode.
// Só elementos listados aqui são editáveis. Cada tipo libera um conjunto fixo
// de controles (allowedControls) — não há edição livre de qualquer propriedade.

// Controles permitidos por tipo de elemento.
export const TYPE_CONTROLS = {
  text: ['align', 'maxWidth', 'marginTop', 'marginBottom'],
  media: ['x', 'y', 'scale', 'rotate', 'zIndex', 'align'],
  block: ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'align', 'maxWidth'],
  decorative: ['x', 'y', 'scale', 'rotate', 'opacity', 'zIndex'],
}

// Breakpoints do projeto (px). desktop > 1024, tablet 641–1024, mobile <= 640.
export const BREAKPOINTS = [
  { key: 'desktop', label: 'Desktop' },
  { key: 'tablet', label: 'Tablet' },
  { key: 'mobile', label: 'Mobile' },
]

export function breakpointForWidth(w) {
  if (w <= 640) return 'mobile'
  if (w <= 1024) return 'tablet'
  return 'desktop'
}

// Defaults de cada controle. Valor igual ao default = "não aplicar" (layout base intacto).
export const CONTROL_DEFAULTS = {
  x: 0, y: 0, scale: 1, rotate: 0,
  zIndex: 0, opacity: 1, align: null, maxWidth: null,
  marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0,
}

// Lista crua: id, label, type. allowedControls e breakpoints são derivados abaixo.
// `allowedControls` pode ser sobrescrito por elemento (ex.: liberar rotate em texto).
const RAW = [
  { id: 'home.hero.title', label: 'Hero · Título', type: 'text' },
  { id: 'home.hero.text', label: 'Hero · Texto', type: 'text' },
  { id: 'home.hero.photo', label: 'Hero · Foto', type: 'media' },
  { id: 'home.hero.actions', label: 'Hero · Ações', type: 'block', note: 'sem bloco de CTA na página hoje' },
  { id: 'home.about.title', label: 'O que é · Título', type: 'text' },
  { id: 'home.about.text', label: 'O que é · Texto', type: 'text' },
  { id: 'home.about.collage', label: 'O que é · Mídia', type: 'media' },
  { id: 'home.process.section', label: 'Como funciona · Seção', type: 'block' },
  { id: 'home.stats.section', label: 'Números · Seção', type: 'block' },
  { id: 'home.realizacao.section', label: 'Realização · Seção', type: 'block' },
]

export const VISUAL_ELEMENTS = RAW.map((e) => ({
  page: 'home',
  breakpoints: ['desktop', 'tablet', 'mobile'],
  allowedControls: e.allowedControls || TYPE_CONTROLS[e.type] || [],
  ...e,
}))

export function elementsForPage(page) {
  return VISUAL_ELEMENTS.filter((e) => e.page === page)
}

export function findVisualElement(id) {
  return VISUAL_ELEMENTS.find((e) => e.id === id) || null
}

// Controles posicionais (habilitam drag por mouse).
export function canDrag(el) {
  return !!el && el.allowedControls.includes('x') && el.allowedControls.includes('y')
}
