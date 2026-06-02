// Título e descrição dinâmicos por rota (hash routing).
// Melhora a aba do navegador e deixa os relatórios do GA4 legíveis
// (cada página com page_title próprio em vez de tudo igual).
//
// Observação: previews de compartilhamento social (WhatsApp/Instagram/Facebook)
// leem o HTML estático e NÃO executam JS — esses crawlers usam as meta tags
// fixas de index.html, não as definidas aqui.

import { PARTICIPANTS } from '../data/participants'

const BASE = 'Sweet & Coffee Week'

function participantBySlug(slug) {
  if (!slug) return null
  return PARTICIPANTS.find(p => p.slug === slug || p.id === slug) || null
}

// Retorna { title, description } para um caminho (sem o '#').
export function metaForPath(path) {
  const p = path || '/'

  if (p.startsWith('/lovers/combos/')) {
    const slug = p.split('/').pop()
    const part = participantBySlug(slug)
    if (part) {
      return {
        title: `${part.name} · ${BASE}`,
        description: `Combo de ${part.name} no ${BASE} Lovers${part.neighborhood ? ` — ${part.neighborhood}` : ''}.`,
      }
    }
    return { title: `Combo · ${BASE}`, description: `Combo participante do ${BASE} Lovers.` }
  }

  if (p.startsWith('/lovers/combos') || p === '/participantes' || p.startsWith('/lovers/participantes'))
    return { title: `Participantes · ${BASE}`, description: 'Todas as lojas participantes do Sweet & Coffee Week Lovers.' }
  if (p.startsWith('/lovers/mapa') || p === '/mapa' || p === '/rota')
    return { title: `Mapa da Doçura · ${BASE}`, description: 'Rota da doçura: o mapa de todas as lojas participantes.' }
  if (p.startsWith('/lovers/votar'))
    return { title: `Votar · ${BASE} Awards`, description: 'Vote no seu combo favorito do Sweet & Coffee Week Awards.' }
  if (p.startsWith('/lovers/awards') || p.startsWith('/lovers/premiacao') || p === '/premiacao')
    return { title: `Awards · ${BASE}`, description: 'A premiação do Sweet & Coffee Week Lovers.' }
  if (p.startsWith('/lovers'))
    return { title: `${BASE} Lovers`, description: 'A edição Lovers do Sweet & Coffee Week.' }

  return { title: BASE, description: 'A próxima edição do Sweet & Coffee Week está chegando.' }
}

// Aplica title + meta description no documento.
export function applyPageMeta(path) {
  if (typeof document === 'undefined') return
  const { title, description } = metaForPath(path)
  document.title = title
  let tag = document.querySelector('meta[name="description"]')
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', 'description')
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', description)
}
