// Galerias de fotos da Home (institucional).
// Fonte: acervo fotográfico das 16 edições em /images/edicoes/<code>/NN.webp.
// A Home é a página-mãe: as galerias contam os 10 anos do festival — 1 foto
// (doce/combo, curada) por edição, cobrindo TODAS as 16 edições. Hero e "O que é"
// usam frames DIFERENTES da mesma edição, sem repetir a mesma imagem entre os dois.
// Doc: src/design/SITE_DIRECTION.md (§ Fotos & galerias).

const DIR = '/images/edicoes'

// Curadoria por edição: code · tema · frames do hero · frame do "O que é".
// Ordem cronológica (2016 → 2026.1) = narrativa de década.
// `hero` = lista curada de frames HORIZONTAIS (paisagem enche melhor a hero
// full-bleed, menos crop). Orientação medida no acervo (scripts/webp header);
// edições sem frame paisagem (2016, 2017.1, 2022) mantêm o melhor retrato.
const EDICOES = [
  { code: '2016',   theme: 'a primeira edição',   hero: ['05.webp'],            about: '02.webp' },
  { code: '2017.1', theme: 'Páscoa',              hero: ['07.webp'],            about: '09.webp' },
  { code: '2017.2', theme: 'Doces do Mundo',      hero: ['03.webp', '10.webp'], about: '08.webp' },
  { code: '2018.1', theme: 'Namorados',           hero: ['03.webp', '09.webp'], about: '01.webp' },
  { code: '2018.2', theme: 'Sabores da Infância', hero: ['05.webp', '10.webp'], about: '07.webp' },
  { code: '2019.1', theme: 'Pâtisserie Francesa', hero: ['02.webp', '08.webp'], about: '11.webp' },
  { code: '2019.2', theme: 'Contos de Fadas',     hero: ['04.webp', '11.webp'], about: '01.webp' },
  { code: '2020.1', theme: 'No Ritmo da Música',  hero: ['05.webp', '09.webp'], about: '04.webp' },
  { code: '2020.2', theme: 'Heróis e Vilões',     hero: ['04.webp', '11.webp'], about: '07.webp' },
  { code: '2021.1', theme: 'Séries',              hero: ['03.webp'],            about: '07.webp' },
  { code: '2021.2', theme: 'Terras Potiguares',   hero: ['04.webp', '11.webp'], about: '05.webp' },
  { code: '2022',   theme: 'Movies',              hero: ['07.webp'],            about: '08.webp' },
  { code: '2023',   theme: 'Trip',                hero: ['04.webp', '08.webp'], about: '01.webp' },
  { code: '2024',   theme: 'Books',               hero: ['08.webp', '09.webp'], about: '11.webp' },
  { code: '2025',   theme: 'Celebration',         hero: ['03.webp', '09.webp'], about: '01.webp' },
  { code: '2026.1', theme: 'Lovers',              hero: ['04.webp', '06.webp'], about: '02.webp' },
]

const shot = (code, file, theme) => ({
  src: `${DIR}/${code}/${file}`,
  alt: `Combo do Sweet & Coffee Week — edição ${theme}`,
  edition: code,
  type: 'combo',
})

// MOMENTOS — fotos de público/edição (não-combo) do acervo geral, curadoria
// "edit 01", pra intercalar com os combos na hero e mostrar gente no festival.
const MOMENTOS_DIR = '/images/momentos'
const momento = (n) => ({
  src: `${MOMENTOS_DIR}/${String(n).padStart(2, '0')}.jpg`,
  alt: 'Momento do público no Sweet & Coffee Week',
  type: 'momento',
})
const heroMomentos = Array.from({ length: 12 }, (_, i) => momento(i + 1))

// Intercala dois arrays distribuindo `extra` ao longo de `base` (sem empilhar
// tudo no fim quando `extra` é menor que `base`).
function interleave(base, extra) {
  const out = []
  let ei = 0
  base.forEach((item, i) => {
    out.push(item)
    if (ei < extra.length && (i + 1) * extra.length >= (ei + 1) * base.length) {
      out.push(extra[ei])
      ei++
    }
  })
  while (ei < extra.length) out.push(extra[ei++])
  return out
}

// HERO — frames horizontais das 16 edições (ordem cronológica), intercalados
// com os momentos de público curados acima (~40 no total).
const heroComboImages = EDICOES.flatMap((e) =>
  e.hero.map((file) => shot(e.code, file, e.theme))
)
export const heroGalleryImages = interleave(heroComboImages, heroMomentos)

// "O QUE É" — outro frame por edição (não repete o do hero), mesma cobertura.
export const aboutGalleryImages = EDICOES.map((e) => shot(e.code, e.about, e.theme))

const ALT_FALLBACK = 'Combo de uma edição do Sweet & Coffee Week'
export { ALT_FALLBACK }
