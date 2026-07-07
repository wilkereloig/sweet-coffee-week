// Galerias de fotos da Home (institucional).
// Fonte: acervo fotográfico das 16 edições em /images/edicoes/<code>/NN.webp.
// A Home é a página-mãe: as galerias contam os 10 anos do festival — 1 foto
// (doce/combo, curada) por edição, cobrindo TODAS as 16 edições. Hero e "O que é"
// usam frames DIFERENTES da mesma edição, sem repetir a mesma imagem entre os dois.
// Doc: src/design/SITE_DIRECTION.md (§ Fotos & galerias).

const DIR = '/images/edicoes'

// Curadoria por edição: code · tema · frame do hero · frame do "O que é".
// Ordem cronológica (2016 → 2026.1) = narrativa de década.
const EDICOES = [
  { code: '2016',   theme: 'a primeira edição',        hero: '05.webp', about: '02.webp' },
  { code: '2017.1', theme: 'Páscoa',                   hero: '07.webp', about: '09.webp' },
  { code: '2017.2', theme: 'Doces do Mundo',           hero: '12.webp', about: '08.webp' },
  { code: '2018.1', theme: 'Namorados',                hero: '03.webp', about: '01.webp' },
  { code: '2018.2', theme: 'Sabores da Infância',      hero: '02.webp', about: '07.webp' },
  { code: '2019.1', theme: 'Pâtisserie Francesa',      hero: '02.webp', about: '11.webp' },
  { code: '2019.2', theme: 'Contos de Fadas',          hero: '07.webp', about: '01.webp' },
  { code: '2020.1', theme: 'No Ritmo da Música',       hero: '07.webp', about: '04.webp' },
  { code: '2020.2', theme: 'Heróis e Vilões',          hero: '08.webp', about: '07.webp' },
  { code: '2021.1', theme: 'Séries',                   hero: '08.webp', about: '07.webp' },
  { code: '2021.2', theme: 'Terras Potiguares',        hero: '12.webp', about: '04.webp' },
  { code: '2022',   theme: 'Movies',                   hero: '07.webp', about: '08.webp' },
  { code: '2023',   theme: 'Trip',                     hero: '02.webp', about: '01.webp' },
  { code: '2024',   theme: 'Books',                    hero: '02.webp', about: '08.webp' },
  { code: '2025',   theme: 'Celebration',              hero: '11.webp', about: '01.webp' },
  { code: '2026.1', theme: 'Lovers',                   hero: '05.webp', about: '04.webp' },
]

const shot = (code, file, theme) => ({
  src: `${DIR}/${code}/${file}`,
  alt: `Combo do Sweet & Coffee Week — edição ${theme}`,
  edition: code,
  type: 'combo',
})

// HERO — 1 doce por edição, das 16 edições, em ordem cronológica.
export const heroGalleryImages = EDICOES.map((e) => shot(e.code, e.hero, e.theme))

// "O QUE É" — outro frame por edição (não repete o do hero), mesma cobertura.
export const aboutGalleryImages = EDICOES.map((e) => shot(e.code, e.about, e.theme))

const ALT_FALLBACK = 'Combo de uma edição do Sweet & Coffee Week'
export { ALT_FALLBACK }
