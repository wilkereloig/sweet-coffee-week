/*
 * Resolução de rota do site institucional — função pura (13/10/2026).
 *
 * Saiu de dentro do App.jsx para poder ser testada com cada flag de
 * publicação ligada (tests/consentimento.test.mjs). Os VALORES das flags
 * continuam no App.jsx; aqui só a regra.
 *
 * Os documentos legais vêm ANTES de qualquer gate: com o site restrito a uma
 * página (só Participar, só Awards, em breve, aguarde), /privacidade, /cookies,
 * /termos e /uso-de-imagem seguem abrindo. Só eles — nenhuma outra rota passa por aqui.
 */

export const DOCUMENTOS_LEGAIS = ['privacidade', 'cookies', 'termos', 'uso-de-imagem']

/** 'privacidade' | 'cookies' | 'termos' | 'uso-de-imagem' | null, para um caminho (sem '#'). */
export function documentoLegal (path = '') {
  const m = /^\/(privacidade|cookies|termos|uso-de-imagem)\/?$/.exec(String(path).split(/[?#]/)[0])
  return m ? m[1] : null
}

/**
 * @param {string} path  caminho cru (hash sem '#', ou pathname)
 * @param {object} f     { awardsOnly, comingSoon, soParticipar, aguarde, preview }
 */
export function resolverRota (path, f = {}) {
  if (documentoLegal(path)) return 'legal'
  // Modo Awards-only: qualquer rota pública renderiza a página de vencedores.
  if (f.awardsOnly && !f.preview) return 'historico-awards'
  // Modo "em breve": toda rota pública renderiza a landing.
  if (f.comingSoon && !f.preview) return 'em-breve'
  // Modo "só Participar": toda rota pública renderiza Participar.
  if (f.soParticipar) return 'participar'
  // Rota direta p/ revisar a landing em DEV/preview.
  if (path.startsWith('/em-breve')) return 'em-breve'
  // Lançamento parcial: Contato e Participar (link direto) saem livres;
  // qualquer outra rota pública vira a espera (inclusive a home).
  if (
    f.aguarde && !f.preview &&
    !path.startsWith('/contato') && !path.startsWith('/participar')
  ) return 'aguarde'
  if (path === '/' || path === '') return 'home'
  if (path.startsWith('/edicoes'))      return 'edicoes'
  if (path.startsWith('/sweet-awards') || path.startsWith('/historico-sweet-awards')) return 'historico-awards'
  // Curiosidades foi descontinuada; o endereço antigo continua seguro via Edições.
  if (path.startsWith('/curiosidades')) return 'edicoes'
  if (path.startsWith('/participar'))   return 'participar'
  if (path.startsWith('/apoiar'))       return 'apoiar'
  if (path.startsWith('/contato'))      return 'contato'
  return 'home'
}
