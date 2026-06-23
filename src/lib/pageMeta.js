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
    return { title: `Edições · ${BASE}`, description: 'Linha do tempo das edições do Sweet & Coffee Week desde 2016.' }
  if (p.startsWith('/vencedores') || p.startsWith('/premiacao'))
    return { title: `Sweet Awards · ${BASE}`, description: 'Resultado da premiação do Sweet & Coffee Week Awards.' }
  if (p.startsWith('/curiosidades'))
    return { title: `Curiosidades · ${BASE}`, description: 'Termos, tradições, bastidores e dinâmicas do festival.' }
  if (p.startsWith('/participar'))
    return { title: `Participar · ${BASE}`, description: 'Pré-cadastro para marcas gastronômicas interessadas nas próximas edições.' }
  if (p.startsWith('/apoiar'))
    return { title: `Apoiar · ${BASE}`, description: 'Patrocínio, apoio, ativações e parcerias com o festival.' }
  if (p.startsWith('/contato'))
    return { title: `Contato · ${BASE}`, description: 'Canais de contato do Sweet & Coffee Week.' }

  return { title: BASE, description: 'Festival gastronômico de doces e cafés em Natal/RN. A temporada mais doce da cidade.' }
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
