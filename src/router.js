import React from 'react'
import { trackPageView } from './lib/analytics'
import { applyPageMeta } from './lib/pageMeta'

/*
 * Roteador do site — endereço limpo desde 14/10/2026 (D-14, docs/cartoon-2026-2/).
 *
 * A rota mora no `pathname` (/edicoes, /cartoon/participantes/x). Navegar usa
 * `history.pushState`; o servidor serve o SPA nesses caminhos pelos rewrites do
 * vercel.json (e pelo fallback do Vite em DEV/preview).
 *
 * Links antigos com hash continuam valendo: `#/edicoes` (QR impresso, link
 * salvo, `href="#/..."` nos componentes) é lido e trocado no lugar pelo caminho
 * limpo. Um clique num `<a href="#/...">` sem onClick próprio também vira
 * pushState (ouvinte único no documento). Hash que não começa com `#/` — o
 * "pular para o conteúdo" (#conteudo), âncoras dos documentos legais — NÃO é
 * rota e não troca de página.
 */

const rotaDoHash = () => {
  const h = window.location.hash
  return h.startsWith('#/') ? h.slice(1) : ''
}

const caminhoAtual = () => rotaDoHash().split('?')[0] || window.location.pathname || '/'

// `?preview` liga a revisão em *.vercel.app; precisa sobreviver à navegação.
function buscaPreservada(busca = '') {
  const q = new URLSearchParams(busca)
  const atual = new URLSearchParams(window.location.search)
  if (atual.has('preview') && !q.has('preview')) q.set('preview', atual.get('preview'))
  const s = q.toString()
  return s ? `?${s}` : ''
}

/** Troca `/#/x?y` por `/x?y` sem nova entrada no histórico. */
function normalizarHash() {
  const h = rotaDoHash()
  if (!h) return
  const [caminho, busca = ''] = h.split('?')
  const q = new URLSearchParams(window.location.search)
  new URLSearchParams(busca).forEach((v, k) => q.set(k, v))
  const s = q.toString()
  window.history.replaceState(window.history.state, '', caminho + (s ? `?${s}` : ''))
}

/** Navega para um caminho do site (com ou sem '#', com ou sem query). */
export function irPara(to) {
  const destino = String(to).replace(/^#/, '')
  const [caminho, busca = ''] = (destino.startsWith('/') ? destino : '/' + destino).split('?')
  const url = caminho + buscaPreservada(busca)
  if (url === window.location.pathname + window.location.search && !window.location.hash) return
  window.history.pushState(null, '', url)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute() {
  const [path, setPath] = React.useState(() => {
    normalizarHash()
    return caminhoAtual()
  })
  React.useEffect(() => {
    applyPageMeta(caminhoAtual())
    trackPageView() // page_view da carga inicial (só envia se já houver consentimento)
    const onChange = () => {
      normalizarHash()
      const next = caminhoAtual()
      setPath(next)
      applyPageMeta(next) // título correto ANTES do page_view
      trackPageView()
      // Rola pro topo APÓS o novo conteúdo montar — senão páginas altas abrem no meio/fim.
      requestAnimationFrame(() => {
        window.scrollTo(0, 0)
        document.documentElement.scrollTop = 0
        if (document.body) document.body.scrollTop = 0
      })
    }
    const onHash = () => { if (rotaDoHash()) onChange() }
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target && e.target.closest ? e.target.closest('a[href^="#/"]') : null
      if (!a || (a.target && a.target !== '_self')) return
      e.preventDefault()
      irPara(a.getAttribute('href'))
    }
    window.addEventListener('hashchange', onHash)
    window.addEventListener('popstate', onChange)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('popstate', onChange)
      document.removeEventListener('click', onClick)
    }
  }, [])
  return [path, irPara]
}
