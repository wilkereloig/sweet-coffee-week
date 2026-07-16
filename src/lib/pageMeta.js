// Título e descrição dinâmicos por rota (hash routing).
// Melhora a aba do navegador e deixa os relatórios do GA4 legíveis
// (cada página com page_title próprio em vez de tudo igual).
//
// Observação: previews de compartilhamento social (WhatsApp/Instagram/Facebook)
// leem o HTML estático e NÃO executam JS — esses crawlers usam as meta tags
// fixas de index.html, não as definidas aqui.

const BASE = 'Sweet & Coffee Week'

// Retorna { title, description } para um caminho (sem o '#').
export function metaForPath(path) {
  const p = path || '/'

  if (p.startsWith('/edicoes'))
    return { title: `Edições | ${BASE}`, description: 'Veja a linha do tempo das edições do Sweet & Coffee Week, com temas, períodos, participantes e memórias do festival desde 2016.' }
  if (p.startsWith('/curiosidades'))
    return { title: `Edições | ${BASE}`, description: 'Veja a linha do tempo das edições do Sweet & Coffee Week, com temas, períodos, participantes e memórias do festival desde 2016.' }
  if (p.startsWith('/sweet-awards') || p.startsWith('/historico-sweet-awards'))
    return { title: `Histórico do Sweet Awards | ${BASE}`, description: 'Veja o histórico de vencedores do Sweet Awards por edição, trilha e categoria, com os destaques premiados de cada ano do Sweet & Coffee Week desde as primeiras premiações registradas.' }
  if (p.startsWith('/participar'))
    return { title: `Participar | Inscreva sua marca no ${BASE}`, description: 'Docerias, cafeterias, confeitarias, restaurantes e marcas gastronômicas podem demonstrar interesse em participar das próximas edições do Sweet & Coffee Week.' }
  if (p.startsWith('/apoiar'))
    return { title: `Apoiar | Patrocínio e parcerias ${BASE}`, description: 'Conheça oportunidades de apoio, patrocínio e ativação de marca no Sweet & Coffee Week, festival gastronômico que movimenta Natal e conecta marcas aos Sweet Lovers.' }
  if (p.startsWith('/contato'))
    return { title: `Contato | ${BASE}`, description: 'Fale com a organização do Sweet & Coffee Week para dúvidas, imprensa, participação, patrocínio, parcerias e informações gerais.' }

  return { title: `${BASE} | Festival gastronômico em Natal/RN`, description: 'Conheça o Sweet & Coffee Week, festival gastronômico criado em Natal que reúne marcas locais em uma rota de combos exclusivos, temas criativos e experiências por tempo limitado.' }
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
