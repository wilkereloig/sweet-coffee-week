/*
 * App instalável da Caça (spec 15 §14): manifest e service worker PRÓPRIOS, com id e escopo disjuntos do Painel SCW (/painel/).
 * O manifest global do site (public/manifest.webmanifest) é CÓPIA do da Caça (teste trava): o iPhone lê o manifest uma vez por
 * carregamento e ignora a troca feita depois, então só o padrão certo instala a Caça. Nas páginas /cartoon/caca* o <link rel=manifest> é trocado em tempo de
 * execução e restaurado ao sair. Nada aqui lê chave pessoal, token ou código de recuperação.
 */
import { EDICAO } from '../../config.js'
import { IMG_CACA } from '../imagens.js'

const ESCOPO = `${EDICAO.caminho}/caca`

export const CACA_PWA = {
  manifesto: '/caca/manifest.webmanifest',
  sw: '/caca-sw.js',
  escopo: ESCOPO,
  inicio: `${ESCOPO}?origem=app`,
  titulo: 'Caça aos Carimbos',
}

/** `/cartoon/caca` e tudo dentro dele; `/cartoon/cacaxyz` não conta. */
export const emPaginaDaCaca = (caminho) => caminho === ESCOPO || String(caminho || '').startsWith(`${ESCOPO}/`)

/** O que muda no <head> quando a Caça está aberta: [seletor, atributo, valor, tag a criar se não existir]. */
export const AJUSTES_DO_HEAD = [
  ['link[rel="manifest"]', 'href', CACA_PWA.manifesto, 'link', { rel: 'manifest' }],
  ['link[rel="apple-touch-icon"]', 'href', IMG_CACA.iconeApple180, 'link', { rel: 'apple-touch-icon' }],
  ['meta[name="apple-mobile-web-app-title"]', 'content', CACA_PWA.titulo, 'meta', { name: 'apple-mobile-web-app-title' }],
]

/** Aplica os ajustes e devolve a função que desfaz (restaura o valor antigo ou remove o que foi criado). */
export function trocarHead (doc = globalThis.document, ajustes = AJUSTES_DO_HEAD) {
  if (!doc?.head) return () => {}
  const desfazer = []
  for (const [seletor, atributo, valor, tag, fixos] of ajustes) {
    let el = doc.querySelector(seletor)
    if (el) {
      const antigo = el.getAttribute(atributo)
      el.setAttribute(atributo, valor)
      desfazer.push(() => { if (antigo === null) el.removeAttribute(atributo); else el.setAttribute(atributo, antigo) })
    } else {
      el = doc.createElement(tag)
      for (const [k, v] of Object.entries(fixos)) el.setAttribute(k, v)
      el.setAttribute(atributo, valor)
      doc.head.appendChild(el)
      desfazer.push(() => el.remove())
    }
  }
  return () => desfazer.reverse().forEach((f) => f())
}

/** Registra o service worker da Caça. Sem suporte ou com erro: devolve null (a Caça funciona igual, só não recebe push). */
export function registrarSw (nav = globalThis.navigator) {
  if (!nav || !('serviceWorker' in nav)) return Promise.resolve(null)
  return nav.serviceWorker.register(CACA_PWA.sw, { scope: CACA_PWA.escopo }).catch(() => null)
}
