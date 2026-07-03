/*
 * KIT DE LAYOUT institucional — ponto único de import da casca e das seções.
 * Ajuste global de estrutura (hero, seções, títulos, cards, fechamento) começa
 * nestes componentes + src/styles/layout.css + src/styles/layout-tokens.css.
 *
 * PageHero é a face pública do <Hero> (mesma peça — fonte única do hero, §4/§4.1).
 * O nome Hero segue exportado durante a migração gradual das páginas.
 */
export { Hero as PageHero, Hero, HeroHL } from './Hero'
export { PageShell } from './PageShell'
export { PageSection } from './PageSection'
export { SectionHeader } from './SectionHeader'
export { CTASection } from './CTASection'
export { CardsGrid } from './CardsGrid'
