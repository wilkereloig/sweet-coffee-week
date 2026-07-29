/*
 * RESOLVEDOR DE MARCAS → ASSETS (regra global de acervo).
 * Conecta nomes históricos (que variam de grafia ao longo dos anos) à logo real
 * do participante. Fonte única: src/data/participants.js (PARTICIPANTS). Quando a
 * logo não existe no acervo, devolve fallback textual (iniciais) — nunca inventa.
 *
 * Uso:
 *   const m = resolveParticipant('Mr Cupcake')
 *   // → { name:'Mr Cupcake', slug:'mr-cupcake-confeitaria', logo:'/logos/...png',
 *   //     brandColor:'var(--lovers-purple)', fallback:'MC' }
 *   const m2 = resolveParticipant('Sonho de Brownie')
 *   // → { name:'Sonho de Brownie', slug:null, logo:null, brandColor:null, fallback:'SB' }
 */
import { PARTICIPANTS } from './participants.js'

// Normaliza p/ casar grafias: minúsculas, sem acento, "&"/"e" unificados,
// pontuação/espacos colapsados.
const norm = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

// Iniciais (fallback textual) — ignora conectores; máx. 2 letras.
export function initialsOf(name) {
  return (name || '')
    .split(/[\s&]+/)
    .filter((w) => w && !/^(de|do|da|e|the|cafe|café|confeitaria|patisserie|pâtisserie|doces|doceria)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || (name || '?').slice(0, 2).toUpperCase()
}

const BY_SLUG = Object.fromEntries(PARTICIPANTS.map((p) => [p.slug, p]))
const BY_NORM = {}
for (const p of PARTICIPANTS) {
  BY_NORM[norm(p.name)] = p
  BY_NORM[norm(p.slug)] = p
}

// Aliases manuais: grafias históricas / nomes de card → slug do participante.
// (Só marcas que TÊM logo no acervo. Nomes sem logo caem no fallback.)
const ALIASES = {
  'mr cupcake': 'mr-cupcake-confeitaria',
  'o maestro': 'o-maestro-cafe',
  'o maestro cafe': 'o-maestro-cafe',
  'o maestro cafe e art': 'o-maestro-cafe',
  'just': 'just-food-coffee',
  'just food coffee': 'just-food-coffee',
  'canuto s': 'canutos',
  'caroli': 'caroli-douces',
  'caffe basilico s': 'caffe-basilicos',
  'casa 1190': 'casa-1190',
  'casa de taipa': 'casa-de-taipa-tapiocaria',
  'oli gastro': 'oli-gastro',
  'paneer': 'paneer-patisserie',
  'parma': 'parma-doces',
  'rollab': 'rollab-confeitaria',
  'sweet duo': 'sweet-duo-confeitaria',
  'wow cookies': 'wow-cookies',
  'adocee': 'adocee-doceria',
  'delicato': 'delicato-bolos',
  'jolie': 'jolie-cafe-patisserie',
  'douce di maria': 'douce-di-maria',
}

export function resolveParticipant(name) {
  const key = norm(name)
  const direct = BY_NORM[key]
  const slug = direct ? direct.slug : ALIASES[key] || null
  const p = slug ? BY_SLUG[slug] : null
  return {
    name,
    slug: p ? p.slug : null,
    logo: p ? p.logo : null,
    brandColor: p ? p.brandColor : null,
    fallback: initialsOf(name),
  }
}

// Lista de marcas do acervo (para muros de logos), derivada da fonte única.
export const BRAND_LIST = PARTICIPANTS.map((p) => ({ name: p.name, slug: p.slug, logo: p.logo }))
