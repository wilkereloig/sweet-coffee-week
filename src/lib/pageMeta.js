// Título e descrição dinâmicos por rota (hash routing).
// Melhora a aba do navegador e deixa os relatórios do GA4 legíveis
// (cada página com page_title próprio em vez de tudo igual).
//
// Observação: previews de compartilhamento social (WhatsApp/Instagram/Facebook)
// leem o HTML estático e NÃO executam JS — esses crawlers usam as meta tags
// fixas de index.html, não as definidas aqui.

import { CENAS } from '../data/conteudo/edicoes.js'

const BASE = 'Sweet & Coffee Week'

// Retorna { title, description } para um caminho (sem o '#').
export function metaForPath(path) {
  const p = path || '/'

  const edicao = /^\/edicoes\/([^/?#]+)/.exec(p)
  const cena = edicao && CENAS.find((c) => c.code === edicao[1])
  if (cena)
    return { title: `${cena.tema} (${cena.code.slice(0, 4)}) · Edições | ${BASE}`, description: `Fotos, história e marcas participantes da edição ${cena.tema} do Sweet & Coffee Week.` }
  if (p === '/cartoon' || p.startsWith('/cartoon/'))
    return { title: `Cartoon · 5 a 15 de novembro | ${BASE}`, description: 'A edição Cartoon do Sweet & Coffee Week: as casas participantes, os combos e onde encontrar cada uma, de 5 a 15 de novembro em Natal.' }
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
  if (p.startsWith('/privacidade'))
    return { title: `Política de Privacidade | ${BASE}`, description: 'Como o Sweet & Coffee Week trata os dados enviados nos formulários e a análise de acesso, e como pedir acesso, correção ou exclusão.' }
  if (p.startsWith('/cookies'))
    return { title: `Política de Cookies | ${BASE}`, description: 'O que o site do Sweet & Coffee Week guarda no seu navegador e como aceitar, recusar ou mudar a sua escolha.' }
  if (p.startsWith('/uso-de-imagem'))
    return { title: `Uso de imagem | ${BASE}`, description: 'Fotos de pessoas no site do Sweet & Coffee Week e como pedir a retirada da sua imagem.' }
  if (p.startsWith('/termos'))
    return { title: `Termos de Uso | ${BASE}`, description: 'Regras de uso do site institucional do Sweet & Coffee Week.' }
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
